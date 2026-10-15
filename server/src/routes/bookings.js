/**
 * Booking routes
 * ─────────────────────────────────────────────────────────────────────────
 * POST  /api/v1/bookings          — create a booking (requires auth)
 * GET   /api/v1/bookings/my       — list authenticated user's bookings
 * GET   /api/v1/bookings/:id      — retrieve a booking by ID (owner or admin)
 * PATCH /api/v1/bookings/:id/cancel — cancel a booking (owner or admin)
 *
 * Security contract:
 *   • Authentication is required for POST/my/cancel via requireAuth.
 *   • userId is taken from req.user.id (server-verified JWT) — never from
 *     the request body.
 *   • Price is ALWAYS calculated server-side from PricingRule.
 *   • Slot availability is rechecked inside a transaction immediately
 *     before inserting the booking row.
 *   • Booking attempts lock their court row and check overlapping active
 *     bookings in the same transaction, preventing concurrent double-booking.
 *   • GET /bookings/:id enforces ownership: a non-admin user can only
 *     retrieve their own bookings.
 * ─────────────────────────────────────────────────────────────────────────
 */
'use strict';

const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const prisma  = require('../lib/prisma');
const { findRule, addHours } = require('../lib/pricing');
const { getOperatingWindow, getBookingStartMinutes } = require('../lib/operatingHours');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  ok, created, badRequest, unauthorized, forbidden,
  notFound, conflict, serverError,
} = require('../lib/respond');

const router = Router();

function getPKTNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

/* ─── Validation rules ────────────────────────────────────────────────── */
const createBookingValidators = [
  body('courtId')
    .isString().withMessage('courtId must be a string').bail()
    .trim().notEmpty().withMessage('courtId is required'),
  body('date')
    .isString().withMessage('date must be a string').bail()
    .trim().notEmpty().withMessage('date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD')
    .bail()
    .custom((value) => {
      const [year, month, day] = value.split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      return parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day;
    }).withMessage('date must be a valid calendar date'),
  body('startTime')
    .isString().withMessage('startTime must be a string').bail()
    .trim().notEmpty().withMessage('startTime is required')
    .matches(/^\d{2}:\d{2}$/).withMessage('startTime must be HH:MM')
    .bail()
    .custom((value) => {
      const [hour, minute] = value.split(':').map(Number);
      return hour <= 23 && minute === 0;
    }).withMessage('startTime must be a valid hourly slot'),
  body('durationHours')
    .isInt({ min: 1, max: 4 }).withMessage('durationHours must be 1–4')
    .toInt(),
  body('playerName')
    .isString().withMessage('playerName must be a string').bail()
    .trim().notEmpty().withMessage('playerName is required')
    .isLength({ max: 120 }).withMessage('playerName too long'),
  body('phone')
    .isString().withMessage('phone must be a string').bail()
    .trim().notEmpty().withMessage('phone is required')
    .matches(/^[0-9+\s\-()\/.]{7,20}$/).withMessage('phone must be 7–20 digits'),
  body('notes')
    .optional().trim().isLength({ max: 500 }).withMessage('notes too long'),
];

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/v1/bookings
 ───────────────────────────────────────────────────────────────────────── */
router.post(
  '/',
  requireAuth,          /* must be authenticated — userId comes from verified token */
  createBookingValidators,
  async (req, res) => {
    /* 1. Validate request body */
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const {
      courtId,
      date,
      startTime,
      durationHours,
      playerName,
      phone,
      notes = '',
    } = req.body;

    try {
      const now = getPKTNow();
      const currentHour = `${String(Math.floor(now.minutes / 60)).padStart(2, '0')}:00`;
      if (date < now.date || (date === now.date && startTime <= currentHour)) {
        return badRequest(res, 'Booking date and time must be in the future');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isActive: true },
      });
      if (!user || !user.isActive) {
        return unauthorized(res, 'Authenticated user not found or disabled');
      }

      /* 2. Verify court exists and is active */
      const court = await prisma.court.findUnique({
        where:   { id: courtId },
        include: {
          pricingRules: true,
          venue: { select: { id: true, name: true, isActive: true, operatingHours: true } },
        },
      });

      if (!court || !court.isActive)
        return notFound(res, `Court '${courtId}' not found or inactive`);
      if (!court.venue.isActive)
        return notFound(res, `Venue for court '${courtId}' is inactive`);

      const operatingWindow = getOperatingWindow(court.venue.operatingHours);
      if (!operatingWindow) {
        return badRequest(res, `Operating hours are invalid for venue '${court.venue.id}'`);
      }
      const bookingStart = getBookingStartMinutes(startTime, operatingWindow);
      const bookingEnd = bookingStart + durationHours * 60;
      if (bookingStart < operatingWindow.open || bookingEnd > operatingWindow.close) {
        return badRequest(res, 'Selected time slot is outside venue operating hours');
      }

      /* 3. Calculate endTime; persisted times wrap at midnight. */
      const endTime = addHours(startTime, durationHours);

      /* 4. Server-side price calculation — never trust the client */
      const [y, m, d] = date.split('-').map(Number);
      const dateObj   = new Date(Date.UTC(y, m - 1, d));

      const rule = findRule(court.pricingRules, dateObj, startTime);
      if (!rule) {
        return badRequest(res, `No pricing rule found for court '${courtId}' at ${startTime} on ${date}`);
      }

      const pricePerHour = rule.pricePerHour;
      const totalAmount  = pricePerHour * durationHours;

      /* 5. Serialize booking writes for this court, then check availability
            and create the booking in the same transaction. */
      const booking = await prisma.$transaction(
        async (tx) => {
          /* MySQL permits concurrent transactions to observe the same free
             slot; lock the court row so bookings for it are checked in order. */
          await tx.$queryRaw`SELECT \`id\` FROM \`Court\` WHERE \`id\` = ${courtId} FOR UPDATE`;

          /* Compare normalized intervals so overnight bookings are handled
             correctly as well as ordinary same-day overlaps. */
          const existingBookings = await tx.booking.findMany({
            where: {
              courtId,
              date,
              status: { in: ['CONFIRMED', 'PENDING'] },
            },
            select: { startTime: true, durationHours: true },
          });

          const overlapping = existingBookings.some((existing) => {
            const existingStart = getBookingStartMinutes(existing.startTime, operatingWindow);
            const existingEnd = existingStart + existing.durationHours * 60;
            return bookingStart < existingEnd && existingStart < bookingEnd;
          });

          if (overlapping) {
            const err  = new Error(`Court '${courtId}' is already booked at this time`);
            err.code   = 'SLOT_CONFLICT';
            throw err;
          }

          return tx.booking.create({
            data: {
              courtId,
              date,
              startTime,
              endTime,
              durationHours,
              playerName:   playerName.trim(),
              phone:        phone.trim(),
              notes:        notes.trim(),
              pricePerHour,
              totalAmount,
              userId:        req.user.id,   /* from verified JWT — never from client body */
              status:        'CONFIRMED',
              paymentStatus: 'UNPAID',
            },
          });
        },
        { timeout: 15000 },
      );

      return created(res, {
        bookingId:     booking.id,
        courtId:       booking.courtId,
        venueName:     court.venue.name,
        courtName:     court.name,
        sport:         court.sport,
        date:          booking.date,
        startTime:     booking.startTime,
        endTime:       booking.endTime,
        durationHours: booking.durationHours,
        playerName:    booking.playerName,
        phone:         booking.phone,
        notes:         booking.notes,
        pricePerHour:  booking.pricePerHour,
        totalAmount:   booking.totalAmount,
        status:        booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt:     booking.createdAt,
      }, 'Booking confirmed');

    } catch (err) {
      if (err.code === 'SLOT_CONFLICT') return conflict(res, err.message);

      /* Prisma unique constraint violation (concurrent request) */
      if (err.code === 'P2002') {
        return conflict(res, `Court '${courtId}' was just booked for this slot — please choose another`);
      }

      /* A concurrent lock/deadlock or transaction timeout means the slot
         could not be safely checked; ask the client to try again. */
      if (err.code === 'P2034' || err.code === 'P2028' || err.code === 'P1008') {
        return conflict(res, `Court '${courtId}' is currently being booked — please try again in a moment`);
      }

      console.error('POST /bookings error:', err);
      return serverError(res, 'Failed to create booking');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/bookings/my
   IMPORTANT: This must be registered BEFORE GET /:id so Express doesn't
   treat "my" as a booking ID parameter.
   Returns all bookings for the authenticated user.
   Supports ?filter=upcoming|past|cancelled
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/my',
  requireAuth,
  [query('filter').optional().isIn(['upcoming', 'past', 'cancelled']).withMessage('filter must be upcoming|past|cancelled')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid query', errors.array());

    const { filter } = req.query;
    const today = getPKTNow().date;

    try {
      let where = { userId: req.user.id };

      if (filter === 'upcoming') {
        where = {
          ...where,
          status: { in: ['CONFIRMED', 'PENDING'] },
          date:   { gte: today },
        };
      } else if (filter === 'past') {
        where = {
          ...where,
          OR: [
            { status: { in: ['COMPLETED', 'NO_SHOW'] } },
            { status: { in: ['CONFIRMED', 'PENDING'] }, date: { lt: today } },
          ],
        };
      } else if (filter === 'cancelled') {
        where = { ...where, status: 'CANCELLED' };
      }

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          court: {
            include: { venue: { select: { id: true, name: true, city: true } } },
          },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      });

      const formatted = bookings.map((b) => ({
        bookingId:     b.id,
        courtId:       b.courtId,
        courtName:     b.court?.name ?? '(court deleted)',
        sport:         b.court?.sport ?? null,
        venueId:       b.court?.venueId ?? null,
        venueName:     b.court?.venue?.name ?? '(venue deleted)',
        venueCity:     b.court?.venue?.city ?? null,
        date:          b.date,
        startTime:     b.startTime,
        endTime:       b.endTime,
        durationHours: b.durationHours,
        playerName:    b.playerName,
        phone:         b.phone,
        notes:         b.notes,
        pricePerHour:  b.pricePerHour,
        totalAmount:   b.totalAmount,
        status:        b.status,
        paymentStatus: b.paymentStatus,
        createdAt:     b.createdAt,
        updatedAt:     b.updatedAt,
      }));

      return ok(res, formatted);
    } catch (err) {
      console.error('GET /bookings/my error:', err);
      return serverError(res, 'Failed to retrieve bookings');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/bookings/:id
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/:id',
  optionalAuth,   /* populate req.user if token present; guests get 403 for others' bookings */
  [param('id').trim().notEmpty().withMessage('Booking ID is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid booking ID', errors.array());

    const { id } = req.params;

    try {
      const booking = await prisma.booking.findUnique({
        where:   { id },
        include: {
          court: {
            include: { venue: { select: { id: true, name: true } } },
          },
        },
      });

      if (!booking) return notFound(res, `Booking '${id}' not found`);

      const isAdmin = req.user?.role === 'ADMIN';
      const isOwner = req.user && booking.userId !== null && booking.userId === req.user.id;

      if (!isAdmin && !isOwner) {
        return forbidden(res, 'You do not have permission to view this booking');
      }

      return ok(res, {
        bookingId:     booking.id,
        courtId:       booking.courtId,
        courtName:     booking.court?.name ?? '(court deleted)',
        sport:         booking.court?.sport ?? null,
        venueId:       booking.court?.venueId ?? null,
        venueName:     booking.court?.venue?.name ?? '(venue deleted)',
        date:          booking.date,
        startTime:     booking.startTime,
        endTime:       booking.endTime,
        durationHours: booking.durationHours,
        playerName:    booking.playerName,
        phone:         booking.phone,
        notes:         booking.notes,
        pricePerHour:  booking.pricePerHour,
        totalAmount:   booking.totalAmount,
        status:        booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt:     booking.createdAt,
      });
    } catch (err) {
      console.error(`GET /bookings/${id} error:`, err);
      return serverError(res, 'Failed to retrieve booking');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /api/v1/bookings/:id/cancel
   Cancel a booking. Users can cancel own bookings; admins can cancel any.
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/:id/cancel',
  requireAuth,
  [param('id').trim().notEmpty().withMessage('Booking ID is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid booking ID', errors.array());

    const { id }    = req.params;
    const isAdmin   = req.user.role === 'ADMIN';

    try {
      const booking = await prisma.booking.findUnique({
        where:   { id },
        include: { court: { include: { venue: { select: { id: true, name: true } } } } },
      });

      if (!booking) return notFound(res, `Booking '${id}' not found`);

      /* Ownership check */
      const isOwner = booking.userId !== null && booking.userId === req.user.id;
      if (!isAdmin && !isOwner) {
        return forbidden(res, 'You do not have permission to cancel this booking');
      }

      /* Business rules */
      if (booking.status === 'CANCELLED') {
        return badRequest(res, 'Booking is already cancelled');
      }
      if (booking.status === 'COMPLETED') {
        return badRequest(res, 'Cannot cancel a completed booking');
      }

      /* Apply the status transition atomically so concurrent retries cannot
         both report a successful cancellation. */
      const result = await prisma.booking.updateMany({
        where: {
          id,
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      });

      if (result.count === 0) {
        const current = await prisma.booking.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current) return notFound(res, `Booking '${id}' not found`);
        if (current.status === 'CANCELLED') {
          return badRequest(res, 'Booking is already cancelled');
        }
        if (current.status === 'COMPLETED') {
          return badRequest(res, 'Cannot cancel a completed booking');
        }
        return badRequest(res, 'Booking could not be cancelled');
      }

      const updated = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, status: true, updatedAt: true, date: true, startTime: true },
      });
      if (!updated) return notFound(res, `Booking '${id}' not found`);

      return ok(res, {
        bookingId:     updated.id,
        status:        updated.status,
        updatedAt:     updated.updatedAt,
        venueName:     booking.court?.venue?.name ?? '(venue deleted)',
        courtName:     booking.court?.name ?? '(court deleted)',
        date:          updated.date,
        startTime:     updated.startTime,
      }, 'Booking cancelled');
    } catch (err) {
      console.error(`PATCH /bookings/${id}/cancel error:`, err);
      return serverError(res, 'Failed to cancel booking');
    }
  },
);

module.exports = router;
