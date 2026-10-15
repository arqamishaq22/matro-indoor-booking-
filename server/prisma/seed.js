/**
 * prisma/seed.js
 * ─────────────────────────────────────────────────────────────────────────
 * Seeds a development database with sample venues, courts, and pricing rules.
 * Runtime production data is read from and managed in the database.
 *
 * Run:  node prisma/seed.js
 *       (or via npm run db:seed from the server/ folder)
 * ─────────────────────────────────────────────────────────────────────────
 */
"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/* ─── Development seed fixtures ───────────────────────────────────────── */
const VENUES = [
  {
    id: "fr-dha-phase-5",
    name: "Matro DHA Phase 5",
    shortName: "Matro DHA Phase 5",
    city: "Lahore",
    location: "DHA Phase 5, Lahore",
    address: "Commercial Broadway, DHA Phase 5, Lahore, Punjab",
    operatingHours: "06:00 AM – 02:00 AM",
    badge: "Flagship Venue",
    imageUrl: "/padal-image.jfif",
    rating: 4.9,
    reviewsCount: 342,
    startingPrice: 2000,
    courts: [
      {
        id: "dha-c1",
        name: "Box Cricket — Court 1",
        sport: "cricket",
        surfaceType: "Shock Pad Turf",
        sortOrder: 1,
      },
      {
        id: "dha-c2",
        name: "Box Cricket — Court 2",
        sport: "cricket",
        surfaceType: "Indoor Synthetic",
        sortOrder: 2,
      },
      {
        id: "dha-f1",
        name: "Futsal Arena A",
        sport: "futsal",
        surfaceType: "4G AstroTurf",
        sortOrder: 3,
      },
      {
        id: "dha-p1",
        name: "Padel Glass Court 1",
        sport: "padel",
        surfaceType: "Panoramic Glass",
        sortOrder: 4,
      },
      {
        id: "dha-p2",
        name: "Padel Glass Court 2",
        sport: "padel",
        surfaceType: "Panoramic Glass",
        sortOrder: 5,
      },
      {
        id: "dha-p3",
        name: "Padel Glass Court 3",
        sport: "padel",
        surfaceType: "Panoramic Glass",
        sortOrder: 6,
      },
    ],
  },
  {
    id: "fr-wapda-town",
    name: "Matro Wapda Town",
    shortName: "Matro Wapda Town",
    city: "Lahore",
    location: "Wapda Town, Lahore",
    address: "Near Main Roundabout, Block D3, Wapda Town, Lahore, Punjab",
    operatingHours: "06:00 AM – 01:00 AM",
    badge: "High Energy",
    imageUrl: "/footbal.images.jfif",
    rating: 4.8,
    reviewsCount: 275,
    startingPrice: 1800,
    courts: [
      {
        id: "wt-f1",
        name: "Futsal Turf 1",
        sport: "futsal",
        surfaceType: "AstroTurf",
        sortOrder: 1,
      },
      {
        id: "wt-f2",
        name: "Futsal Turf 2",
        sport: "futsal",
        surfaceType: "AstroTurf",
        sortOrder: 2,
      },
      {
        id: "wt-c1",
        name: "Cricket Cage 1",
        sport: "cricket",
        surfaceType: "Shock Pad Box Turf",
        sortOrder: 3,
      },
      {
        id: "wt-b1",
        name: "Badminton Hall 1",
        sport: "badminton",
        surfaceType: "Non-Slip Court Mats",
        sortOrder: 4,
      },
      {
        id: "wt-b2",
        name: "Badminton Hall 2",
        sport: "badminton",
        surfaceType: "Non-Slip Court Mats",
        sortOrder: 5,
      },
    ],
  },
  {
    id: "fr-valencia",
    name: "Matro Valencia",
    shortName: "Matro Valencia",
    city: "Lahore",
    location: "Valencia Town, Lahore",
    address: "Main Commercial Boulevard, Valencia Town, Lahore, Punjab",
    operatingHours: "07:00 AM – 01:00 AM",
    badge: "Community Favourite",
    imageUrl: "/padal-image2.jfif",
    rating: 4.8,
    reviewsCount: 210,
    startingPrice: 2200,
    courts: [
      {
        id: "val-p1",
        name: "Padel Arena 1",
        sport: "padel",
        surfaceType: "Panoramic Glass",
        sortOrder: 1,
      },
      {
        id: "val-p2",
        name: "Padel Arena 2",
        sport: "padel",
        surfaceType: "Panoramic Glass",
        sortOrder: 2,
      },
      {
        id: "val-pk1",
        name: "Pickleball Court 1",
        sport: "pickleball",
        surfaceType: "Cushioned Acrylic",
        sortOrder: 3,
      },
      {
        id: "val-c1",
        name: "Box Cricket Court",
        sport: "cricket",
        surfaceType: "Pro Turf",
        sortOrder: 4,
      },
    ],
  },
  {
    id: "cross-courts",
    name: "Cross Courts",
    shortName: "Cross Courts",
    city: "Lahore",
    location: "Bedian Road, Lahore",
    address: "Main Sports Avenue, Bedian Road Interchange, Lahore, Punjab",
    operatingHours: "06:00 AM – 02:00 AM",
    badge: "Premium Club",
    imageUrl: "/padal-image4.jfif",
    rating: 4.9,
    reviewsCount: 395,
    startingPrice: 2500,
    courts: [
      {
        id: "cc-p1",
        name: "Center Glass Court (Padel)",
        sport: "padel",
        surfaceType: "Panoramic Glass",
        sortOrder: 1,
      },
      {
        id: "cc-p2",
        name: "Padel Court 2",
        sport: "padel",
        surfaceType: "Panoramic Glass",
        sortOrder: 2,
      },
      {
        id: "cc-pk1",
        name: "Pickleball Court Alpha",
        sport: "pickleball",
        surfaceType: "Competition Acrylic",
        sortOrder: 3,
      },
      {
        id: "cc-pk2",
        name: "Pickleball Court Beta",
        sport: "pickleball",
        surfaceType: "Competition Acrylic",
        sortOrder: 4,
      },
      {
        id: "cc-b1",
        name: "Badminton Court 1",
        sport: "badminton",
        surfaceType: "Spring Wood Base",
        sortOrder: 5,
      },
      {
        id: "cc-b2",
        name: "Badminton Court 2",
        sport: "badminton",
        surfaceType: "Spring Wood Base",
        sortOrder: 6,
      },
      {
        id: "cc-b3",
        name: "Badminton Court 3",
        sport: "badminton",
        surfaceType: "Spring Wood Base",
        sortOrder: 7,
      },
    ],
  },
  {
    id: "fr-sports-arena-sialkot",
    name: "Matro Sports Arena Sialkot",
    shortName: "Matro Sialkot",
    city: "Sialkot",
    location: "Kashmir Road, Sialkot",
    address: "Main Kashmir Road, Near Cantt, Sialkot, Punjab",
    operatingHours: "06:00 AM – 02:00 AM",
    badge: "Sialkot Sports Hub",
    imageUrl: "/cricket-img.jpg",
    rating: 4.9,
    reviewsCount: 312,
    startingPrice: 1800,
    courts: [
      {
        id: "skt-c1",
        name: "Sialkot Cricket Pitch 1",
        sport: "cricket",
        surfaceType: "Shock Pad Turf",
        sortOrder: 1,
      },
      {
        id: "skt-c2",
        name: "Sialkot Cricket Pitch 2",
        sport: "cricket",
        surfaceType: "Indoor Synthetic",
        sortOrder: 2,
      },
      {
        id: "skt-f1",
        name: "Sialkot Futsal Arena",
        sport: "futsal",
        surfaceType: "4G AstroTurf",
        sortOrder: 3,
      },
      {
        id: "skt-p1",
        name: "Sialkot Glass Padel",
        sport: "padel",
        surfaceType: "Panoramic Glass",
        sortOrder: 4,
      },
      {
        id: "skt-b1",
        name: "Badminton Hall 1",
        sport: "badminton",
        surfaceType: "Non-Slip Mats",
        sortOrder: 5,
      },
      {
        id: "skt-b2",
        name: "Badminton Hall 2",
        sport: "badminton",
        surfaceType: "Non-Slip Mats",
        sortOrder: 6,
      },
    ],
  },
];

/* ─── Development-only pricing fixtures ────────────────────────────────── */
/* Format per courtId: { weekdayDay, weekdayNight, weekendDay, weekendNight } */
const PRICING = {
  /* FR DHA Phase 5 */
  "dha-c1": {
    weekdayDay: 2000,
    weekdayNight: 1750,
    weekendDay: 2500,
    weekendNight: 2250,
  },
  "dha-c2": {
    weekdayDay: 2000,
    weekdayNight: 1750,
    weekendDay: 2500,
    weekendNight: 2250,
  },
  "dha-f1": {
    weekdayDay: 2500,
    weekdayNight: 2250,
    weekendDay: 3000,
    weekendNight: 2750,
  },
  "dha-p1": {
    weekdayDay: 4000,
    weekdayNight: 2800,
    weekendDay: 4500,
    weekendNight: 3150,
  },
  "dha-p2": {
    weekdayDay: 4000,
    weekdayNight: 2800,
    weekendDay: 4500,
    weekendNight: 3150,
  },
  "dha-p3": {
    weekdayDay: 4000,
    weekdayNight: 2800,
    weekendDay: 4500,
    weekendNight: 3150,
  },
  /* FR Wapda Town */
  "wt-f1": {
    weekdayDay: 2000,
    weekdayNight: 1800,
    weekendDay: 2500,
    weekendNight: 2200,
  },
  "wt-f2": {
    weekdayDay: 2000,
    weekdayNight: 1800,
    weekendDay: 2500,
    weekendNight: 2200,
  },
  "wt-c1": {
    weekdayDay: 1800,
    weekdayNight: 1600,
    weekendDay: 2200,
    weekendNight: 2000,
  },
  "wt-b1": {
    weekdayDay: 1200,
    weekdayNight: 1000,
    weekendDay: 1500,
    weekendNight: 1300,
  },
  "wt-b2": {
    weekdayDay: 1200,
    weekdayNight: 1000,
    weekendDay: 1500,
    weekendNight: 1300,
  },
  /* FR Valencia */
  "val-p1": {
    weekdayDay: 4000,
    weekdayNight: 2800,
    weekendDay: 4500,
    weekendNight: 3150,
  },
  "val-p2": {
    weekdayDay: 4000,
    weekdayNight: 2800,
    weekendDay: 4500,
    weekendNight: 3150,
  },
  "val-pk1": {
    weekdayDay: 2000,
    weekdayNight: 1500,
    weekendDay: 2500,
    weekendNight: 2000,
  },
  "val-c1": {
    weekdayDay: 2200,
    weekdayNight: 2000,
    weekendDay: 2700,
    weekendNight: 2500,
  },
  /* Cross Courts */
  "cc-p1": {
    weekdayDay: 4500,
    weekdayNight: 3200,
    weekendDay: 5000,
    weekendNight: 3700,
  },
  "cc-p2": {
    weekdayDay: 4500,
    weekdayNight: 3200,
    weekendDay: 5000,
    weekendNight: 3700,
  },
  "cc-pk1": {
    weekdayDay: 2500,
    weekdayNight: 2000,
    weekendDay: 3000,
    weekendNight: 2500,
  },
  "cc-pk2": {
    weekdayDay: 2500,
    weekdayNight: 2000,
    weekendDay: 3000,
    weekendNight: 2500,
  },
  "cc-b1": {
    weekdayDay: 1500,
    weekdayNight: 1200,
    weekendDay: 1800,
    weekendNight: 1500,
  },
  "cc-b2": {
    weekdayDay: 1500,
    weekdayNight: 1200,
    weekendDay: 1800,
    weekendNight: 1500,
  },
  "cc-b3": {
    weekdayDay: 1500,
    weekdayNight: 1200,
    weekendDay: 1800,
    weekendNight: 1500,
  },
  /* FR Sports Arena Sialkot */
  "skt-c1": {
    weekdayDay: 1800,
    weekdayNight: 1600,
    weekendDay: 2200,
    weekendNight: 2000,
  },
  "skt-c2": {
    weekdayDay: 1800,
    weekdayNight: 1600,
    weekendDay: 2200,
    weekendNight: 2000,
  },
  "skt-f1": {
    weekdayDay: 2200,
    weekdayNight: 2000,
    weekendDay: 2700,
    weekendNight: 2500,
  },
  "skt-p1": {
    weekdayDay: 3500,
    weekdayNight: 2500,
    weekendDay: 4000,
    weekendNight: 3000,
  },
  "skt-b1": {
    weekdayDay: 1200,
    weekdayNight: 1000,
    weekendDay: 1500,
    weekendNight: 1300,
  },
  "skt-b2": {
    weekdayDay: 1200,
    weekdayNight: 1000,
    weekendDay: 1500,
    weekendNight: 1300,
  },
};

/* ─── Helper: expand pricing object into 4 PricingRule rows ────────────── */
function pricingRows(courtId, p) {
  return [
    {
      courtId,
      dayType: "weekday",
      period: "off_peak",
      pricePerHour: p.weekdayDay,
    },
    {
      courtId,
      dayType: "weekday",
      period: "peak",
      pricePerHour: p.weekdayNight,
    },
    {
      courtId,
      dayType: "weekend",
      period: "off_peak",
      pricePerHour: p.weekendDay,
    },
    {
      courtId,
      dayType: "weekend",
      period: "peak",
      pricePerHour: p.weekendNight,
    },
  ];
}

/* ─── Main ──────────────────────────────────────────────────────────────── */
async function main() {
  console.log("🌱  Seeding database…");

  for (const venue of VENUES) {
    const { courts, ...venueData } = venue;

    /* Upsert venue */
    await prisma.venue.upsert({
      where: { id: venueData.id },
      update: venueData,
      create: venueData,
    });

    for (const court of courts) {
      /* Upsert court */
      await prisma.court.upsert({
        where: { id: court.id },
        update: { ...court, venueId: venue.id },
        create: { ...court, venueId: venue.id },
      });

      /* Upsert pricing rules */
      const rules = pricingRows(
        court.id,
        PRICING[court.id] ?? {
          weekdayDay: venue.startingPrice,
          weekdayNight: venue.startingPrice,
          weekendDay: venue.startingPrice,
          weekendNight: venue.startingPrice,
        },
      );

      for (const rule of rules) {
        await prisma.pricingRule.upsert({
          where: {
            courtId_dayType_period: {
              courtId: rule.courtId,
              dayType: rule.dayType,
              period: rule.period,
            },
          },
          update: { pricePerHour: rule.pricePerHour },
          create: rule,
        });
      }
    }

    console.log(`  ✓ ${venue.name} (${courts.length} courts)`);
  }

  /* ─── Admin User ──────────────────────────────────────────────────────── */
  const adminPhone = process.env.ADMIN_PHONE || "03001234567";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@matro.pk";
  const adminName = process.env.ADMIN_NAME || "System Admin";

  const bcrypt = require("bcryptjs");
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: adminPhone },
        { email: adminEmail }
      ]
    }
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: "ADMIN",
        passwordHash,
        isActive: true,
      }
    });
    console.log(`  ✓ Admin user verified/updated (Phone: ${existingAdmin.phone || 'N/A'}, Role: ADMIN)`);
  } else {
    await prisma.user.create({
      data: {
        phone: adminPhone,
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      }
    });
    console.log(`  ✓ Admin user created (Phone: ${adminPhone}, Role: ADMIN)`);
  }

  console.log("✅  Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
