/**
 * Availability routes
 * ─────────────────────────────────────────────────────────────────────────
 * GET /api/v1/availability
 *   Query params:
 *     venue_id    (required)  e.g. "fr-dha-phase-5"
 *     sport_type  (optional)  e.g. "cricket"
 *     date        (required)  ISO "YYYY-MM-DD"  in PKT (UTC+5)
 *
 * Response shape (matches frontend VenueSchedule contract):
 * {
 *   venueId, venueName, date,
 *   timeSlots: TimeSlot[],
 *   courts: [{
 *     id, name, sport, surfaceType,
 *     slots: { "HH:MM": { status, pricePerHour } }
 *   }],
 *   summary: { total, available, limited, booked, reserved, maintenance }
 * }
 *
 * Slot generation:
 *   We generate hourly slots for every court between the venue's opening
 *   and closing hours. Each slot is marked BOOKED when a CONFIRMED/PENDING
 *   booking overlaps it, AVAILABLE when a pricing rule exists, and
 *   MAINTENANCE when the slot has no configured price.
 *   "limited" logic (filling fast) is set when >70% of same-sport slots
 *   at that time are booked.
 */
'use strict';

const { Router } = require('express');
const { query, validationResult } = require('express-validator');
const prisma  = require('../lib/prisma');
const { findRule } = require('../lib/pricing');
const { getOperatingWindow, getBookingStartMinutes } = require('../lib/operatingHours');
const { ok, badRequest, notFound, serverError } = require('../lib/respond');

const router = Router();

const PEAK_START = 17;
const PEAK_END   = 5;

function isPeakHour(h) { return h >= PEAK_START || h < PEAK_END; }

function parseDatePKT(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(y, m - 1, d);
  return parsed;
}

function getTimeSlots(operatingWindow) {
  const slots = [];
  const firstHourlySlot = Math.ceil(operatingWindow.open / 60) * 60;
  for (let startMinute = firstHourlySlot;
       startMinute + 60 <= operatingWindow.close;
       startMinute += 60) {
    const hour = Math.floor(startMinute / 60) % 24;
    const minute = startMinute % 60;
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    slots.push({ time, startMinute });
  }
  return slots;
}

function slotOverlaps(slotStart, bookingStart, durationHours, operatingWindow) {
  const bookingStartMinute = getBookingStartMinutes(bookingStart, operatingWindow);
  const bookingEndMinute = bookingStartMinute + durationHours * 60;
  return slotStart < bookingEndMinute && bookingStartMinute < slotStart + 60;
}

/* Period metadata (mirrors frontend PERIOD_META) */
function getPeriodName(timeStr) {
  const h = parseInt(timeStr, 10);
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 23) return 'evening';
  return 'night';
}

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/availability
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/',
  [
    query('venue_id')
      .isString().withMessage('venue_id must be a string').bail()
      .trim().notEmpty().withMessage('venue_id is required'),
    query('date')
      .isString().withMessage('date must be a string').bail()
      .trim().notEmpty().withMessage('date is required')
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD')
      .bail()
      .custom((value) => {
        const [year, month, day] = value.split('-').map(Number);
        const parsed = new Date(0);
        parsed.setUTCHours(0, 0, 0, 0);
        parsed.setUTCFullYear(year, month - 1, day);
        return parsed.getUTCFullYear() === year
          && parsed.getUTCMonth() === month - 1
          && parsed.getUTCDate() === day;
      }).withMessage('date must be a valid calendar date'),
    query('sport_type')
      .optional()
      .isString().withMessage('sport_type must be a string').bail()
      .trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid parameters', errors.array());

    const { venue_id: venueId, date, sport_type: sportType } = req.query;

    try {
      /* ── 1. Load venue ───────────────────────────────────────────── */
      const venue = await prisma.venue.findUnique({
        where:  { id: venueId },
        select: { id: true, name: true, isActive: true, operatingHours: true },
      });
      if (!venue)     return notFound(res, `Venue '${venueId}' not found`);
      if (!venue.isActive) return notFound(res, `Venue '${venueId}' is not active`);

      const operatingWindow = getOperatingWindow(venue.operatingHours);
      if (!operatingWindow) {
        console.error(`GET /availability: invalid operating hours for venue '${venueId}'`);
        return serverError(res, 'Venue operating hours are not configured correctly');
      }
      const timeSlots = getTimeSlots(operatingWindow);

      /* ── 2. Load courts (optionally filtered by sport) ───────────── */
      const courts = await prisma.court.findMany({
        where: {
          venueId,
          isActive: true,
          ...(sportType ? { sport: { equals: sportType } } : {}),
        },
        include: { pricingRules: true },
        orderBy: { sortOrder: 'asc' },
      });

      if (courts.length === 0) {
        return ok(res, {
          venueId, venueName: venue.name, date,
          timeSlots: timeSlots.map(({ time }) => formatTimeSlot(time)),
          courts: [],
          summary:   { total: 0, available: 0, limited: 0, booked: 0, reserved: 0, maintenance: 0 },
        });
      }

      /* ── 3. Load all bookings for these courts on this date ──────── */
      const courtIds = courts.map((c) => c.id);
      const bookings = await prisma.booking.findMany({
        where: {
          courtId: { in: courtIds },
          date,
          status:  { in: ['CONFIRMED', 'PENDING'] },
        },
        select: { courtId: true, startTime: true, endTime: true, durationHours: true },
      });

      const dateObj = parseDatePKT(date);

      /* ── 4. Build per-court slot maps ─────────────────────────────── */
      /* Limited threshold: if >70% of courts offering the same sport are
         booked at a given hour, mark remaining ones as "limited"       */
      const sportSlotBooked = {}; // sportSlotBooked[sport][time] = bookedCount

      const courtRows = courts.map((court) => {
        const courtBookings = bookings.filter((b) => b.courtId === court.id);

        const slots = {};
        for (const timeSlot of timeSlots) {
          const { time } = timeSlot;
          /* Check if any active booking overlaps this hour slot */
          const isBooked = courtBookings.some((b) =>
            slotOverlaps(timeSlot.startMinute, b.startTime, b.durationHours, operatingWindow),
          );

          /* Look up the price for this slot */
          const rule         = findRule(court.pricingRules, dateObj, time);
          const pricePerHour = rule?.pricePerHour ?? null;
          const status = isBooked ? 'booked' : pricePerHour === null ? 'maintenance' : 'available';

          slots[time] = { status, pricePerHour };

          /* Tally for limited logic */
          if (!sportSlotBooked[court.sport]) sportSlotBooked[court.sport] = {};
          if (!sportSlotBooked[court.sport][time]) sportSlotBooked[court.sport][time] = { total: 0, booked: 0 };
          sportSlotBooked[court.sport][time].total++;
          if (isBooked) sportSlotBooked[court.sport][time].booked++;
        }

        return {
          id:          court.id,
          name:        court.name,
          sport:       court.sport,
          surfaceType: court.surfaceType,
          slots,
        };
      });

      /* ── 5. Apply "limited" status ───────────────────────────────── */
      for (const court of courtRows) {
        for (const { time } of timeSlots) {
          if (court.slots[time].status !== 'available') continue;
          const tally = sportSlotBooked[court.sport]?.[time];
          if (tally && tally.total > 1 && tally.booked / tally.total >= 0.7) {
            court.slots[time].status = 'limited';
          }
        }
      }

      /* ── 6. Build timeSlots array (matches frontend contract) ──────── */
      const formattedTimeSlots = timeSlots.map(({ time }) => formatTimeSlot(time));

      /* ── 7. Summary counts ─────────────────────────────────────────── */
      const summary = { total: 0, available: 0, limited: 0, booked: 0, reserved: 0, maintenance: 0 };
      for (const court of courtRows) {
        for (const { time } of timeSlots) {
          const { status } = court.slots[time];
          summary.total++;
          if (summary[status] !== undefined) summary[status]++;
        }
      }

      return ok(res, {
        venueId,
        venueName: venue.name,
        date,
        timeSlots: formattedTimeSlots,
        courts:    courtRows,
        summary,
        _isLiveData: true,
      });

    } catch (err) {
      console.error('GET /availability error:', err);
      return serverError(res, 'Failed to load availability');
    }
  },
);

/* ─── Helper ──────────────────────────────────────────────────────────── */
function addOneHour(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const nh = (h + 1) % 24;
  return `${String(nh).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function formatTimeSlot(time) {
  const hour = parseInt(time.split(':')[0], 10);
  return {
    time,
    label: `${time} – ${addOneHour(time)}`,
    period: getPeriodName(time),
    isPeak: isPeakHour(hour),
  };
}

module.exports = router;
