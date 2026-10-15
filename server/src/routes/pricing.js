/**
 * Pricing routes
 * ─────────────────────────────────────────────────────────────────────────
 * GET /api/v1/venues/:venueId/pricing
 *   Returns all pricing rules for a venue grouped by court and sport.
 *   Response is built from database PricingRule rows.
 */
'use strict';

const { Router } = require('express');
const { param, validationResult } = require('express-validator');
const prisma  = require('../lib/prisma');
const { ok, notFound, badRequest } = require('../lib/respond');

const router = Router({ mergeParams: true });

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/venues/:venueId/pricing
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/',
  [param('venueId').trim().notEmpty().withMessage('venueId is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid venue ID', errors.array());

    const { venueId } = req.params;

    try {
      const venue = await prisma.venue.findUnique({
        where:  { id: venueId },
        select: { id: true, name: true, isActive: true },
      });
      if (!venue) return notFound(res, `Venue '${venueId}' not found`);

      const courts = await prisma.court.findMany({
        where:   { venueId, isActive: true },
        include: { pricingRules: true },
        orderBy: { sortOrder: 'asc' },
      });

      /* Return a UI-friendly pricing matrix from the database rules. */
      const rules = courts.map((court) => {
        const get = (dayType, period) => {
          const r = court.pricingRules.find(
            (pr) => pr.dayType === dayType && pr.period === period,
          );
          return r?.pricePerHour ?? null;
        };

        return {
          courtId:      court.id,
          courtName:    court.name,
          sport:        court.sport,
          surfaceType:  court.surfaceType,
          weekdayDay:   get('weekday', 'off_peak'),
          weekdayNight: get('weekday', 'peak'),
          weekendDay:   get('weekend', 'off_peak'),
          weekendNight: get('weekend', 'peak'),
        };
      });

      return ok(res, { venueId, venueName: venue.name, rules });
    } catch (err) {
      console.error(`GET /venues/${venueId}/pricing error:`, err);
      return res.status(500).json({ success: false, message: 'Failed to load pricing' });
    }
  },
);

module.exports = router;
