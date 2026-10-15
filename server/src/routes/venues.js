/**
 * Venue routes
 * ─────────────────────────────────────────────────────────────────────────
 * GET /api/v1/venues                           — list all active venues
 * GET /api/v1/venues?city=Lahore               — filter by city
 * GET /api/v1/venues?sport=cricket             — filter by sport
 * GET /api/v1/venues/:venueId                  — single venue
 * GET /api/v1/venues/:venueId/courts           — courts at a venue
 * GET /api/v1/venues/:venueId/courts?sport=padel
 */
'use strict';

const { Router } = require('express');
const { query, param, validationResult } = require('express-validator');
const prisma   = require('../lib/prisma');
const { ok, notFound, badRequest } = require('../lib/respond');

const router = Router();

/* ── Validation helpers ──────────────────────────────────────────────────── */
const validateVenueId = param('venueId').trim().notEmpty().withMessage('venueId is required');

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/venues
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/',
  [
    query('city').optional()
      .isString().withMessage('city must be a string').bail()
      .trim().notEmpty().withMessage('city cannot be empty'),
    query('sport').optional()
      .isString().withMessage('sport must be a string').bail()
      .trim().notEmpty().withMessage('sport cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid query parameters', errors.array());

    const { city, sport } = req.query;

    try {
      /* When filtering by sport we must join through courts */
      const venues = await prisma.venue.findMany({
        where: {
          isActive: true,
          ...(city  ? { city:   { equals: city  } } : {}),
          ...(sport ? {
            courts: { some: { sport: { equals: sport }, isActive: true } },
          } : {}),
        },
        include: {
          courts: {
            where:   { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select:  {
              id: true, name: true, sport: true, surfaceType: true, sortOrder: true,
              pricingRules: { select: { pricePerHour: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const formatted = venues.map((venue) => {
        const prices = venue.courts.flatMap((court) => court.pricingRules.map((rule) => rule.pricePerHour));
        return {
          ...venue,
          startingPrice: prices.length ? Math.min(...prices) : null,
          availableCourts: venue.courts.length,
          courts: venue.courts.map(({ pricingRules, ...court }) => court),
        };
      });

      return ok(res, formatted);
    } catch (err) {
      console.error('GET /venues error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load venues' });
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/venues/:venueId
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/:venueId',
  [validateVenueId],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid venue ID', errors.array());

    const { venueId } = req.params;

    try {
      const venue = await prisma.venue.findUnique({
        where: { id: venueId },
        include: {
          courts: {
            where:   { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              pricingRules: true,
            },
          },
        },
      });

      if (!venue) return notFound(res, `Venue '${venueId}' not found`);
      const prices = venue.courts.flatMap((court) => court.pricingRules.map((rule) => rule.pricePerHour));
      return ok(res, {
        ...venue,
        startingPrice: prices.length ? Math.min(...prices) : null,
        availableCourts: venue.courts.length,
      });
    } catch (err) {
      console.error(`GET /venues/${venueId} error:`, err);
      return res.status(500).json({ success: false, message: 'Failed to load venue' });
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/venues/:venueId/courts
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/:venueId/courts',
  [
    validateVenueId,
    query('sport').optional().trim().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid parameters', errors.array());

    const { venueId } = req.params;
    const { sport }   = req.query;

    try {
      /* Verify venue exists */
      const venueExists = await prisma.venue.findUnique({
        where:  { id: venueId },
        select: { id: true, isActive: true },
      });
      if (!venueExists) return notFound(res, `Venue '${venueId}' not found`);

      const courts = await prisma.court.findMany({
        where: {
          venueId,
          isActive: true,
          ...(sport ? { sport: { equals: sport } } : {}),
        },
        include:  { pricingRules: true },
        orderBy:  { sortOrder: 'asc' },
      });

      return ok(res, courts);
    } catch (err) {
      console.error(`GET /venues/${venueId}/courts error:`, err);
      return res.status(500).json({ success: false, message: 'Failed to load courts' });
    }
  },
);

module.exports = router;
