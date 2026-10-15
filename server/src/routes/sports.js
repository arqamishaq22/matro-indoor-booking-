'use strict';

const { Router } = require('express');
const prisma = require('../lib/prisma');
const { ok, serverError } = require('../lib/respond');

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const courts = await prisma.court.findMany({
      where: {
        isActive: true,
        venue: { is: { isActive: true } },
      },
      select: {
        sport: true,
        venueId: true,
        pricingRules: { select: { pricePerHour: true } },
      },
      orderBy: { sport: 'asc' },
    });

    const sportsById = new Map();
    for (const court of courts) {
      const sport = sportsById.get(court.sport) ?? {
        id: court.sport,
        name: court.sport.replace(/(^|-)\w/g, (part) => part.replace('-', '').toUpperCase()),
        courtCount: 0,
        venueIds: new Set(),
        prices: [],
      };
      sport.courtCount++;
      sport.venueIds.add(court.venueId);
      sport.prices.push(...court.pricingRules.map((rule) => rule.pricePerHour));
      sportsById.set(court.sport, sport);
    }

    const sports = [...sportsById.values()].map(({ venueIds, prices, ...sport }) => ({
      ...sport,
      venueCount: venueIds.size,
      startingPrice: prices.length ? Math.min(...prices) : null,
    }));

    return ok(res, sports);
  } catch (err) {
    console.error('GET /sports error:', err);
    return serverError(res, 'Failed to load sports');
  }
});

module.exports = router;
