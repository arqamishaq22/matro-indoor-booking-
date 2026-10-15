'use strict';
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const [venues, courts, rules, bookings] = await Promise.all([
    p.venue.count(),
    p.court.count(),
    p.pricingRule.count(),
    p.booking.count(),
  ]);
  console.log(`Venues: ${venues} | Courts: ${courts} | PricingRules: ${rules} | Bookings: ${bookings}`);

  // Spot-check: list venue names
  const names = await p.venue.findMany({ select: { id: true, name: true, city: true } });
  names.forEach((v) => console.log(`  ${v.id}  →  ${v.name} (${v.city})`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
