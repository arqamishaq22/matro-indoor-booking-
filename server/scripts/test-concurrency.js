/**
 * scripts/test-concurrency.js
 * ─────────────────────────────────────────────────────────────────────────
 * Concurrency test: Task 5
 * Submits N overlapping booking requests from two different users for the
 * same court/date/time slot and asserts that exactly 1 succeeds (201) while
 * the rest are rejected (409).
 *
 * Uses an isolated future date so it never interferes with other bookings.
 * Uses a temporary authenticated account and cleans up its test bookings.
 *
 * Run:  node scripts/test-concurrency.js   (server must be running on :3001)
 * ─────────────────────────────────────────────────────────────────────────
 */
'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const BASE    = 'http://localhost:3001/api/v1';
const CONCURRENCY = 10;   // simultaneous requests
const RUN_ID = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const TEST_PHONES = [0, 1].map((suffix) => `+92300${RUN_ID.slice(-9)}${suffix}`);
const TEST_PASSWORD = 'ConcurrencyTest123!';

/* Far-future date unlikely to collide with anything */
function concurrencyDate() {
  const d = new Date();
  d.setDate(d.getDate() + 365);
  return d.toISOString().slice(0, 10);
}

const CONC_DATE   = concurrencyDate();
const COURT_ID    = 'cc-b1';   // Cross Courts Badminton 1 — isolated
const START_TIME  = '11:00';
const DURATION    = 1;

async function postBooking(i, token) {
  const res = await fetch(`${BASE}/bookings`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      courtId:       COURT_ID,
      date:          CONC_DATE,
      startTime:     START_TIME,
      durationHours: DURATION,
      playerName:    `ConcurrencyTest-${i}`,
      phone:         `0300-${String(i).padStart(7, '0')}`,
      notes:         `Concurrency test slot ${i}`,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { index: i, status: res.status, bookingId: json?.data?.bookingId ?? null };
}

async function run() {
  console.log('\n=================================================');
  console.log(`  Concurrency test -- ${CONCURRENCY} requests from 2 users`);
  console.log(`  Court: ${COURT_ID}  Date: ${CONC_DATE}  Time: ${START_TIME}`);
  console.log('=================================================\n');

  let tokens = [];
  let results = [];
  let bookingPersisted = false;
  const prisma = new PrismaClient();
  try {
    tokens = await Promise.all(TEST_PHONES.map(async (phone) => {
      const registration = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          password: TEST_PASSWORD,
          name: 'Concurrency Test',
        }),
      });
      const registrationJson = await registration.json().catch(() => ({}));
      const token = registrationJson?.data?.token;
      if (!registration.ok || !token) {
        throw new Error(`Test user registration failed (HTTP ${registration.status})`);
      }
      return token;
    }));

    /* Fire all authenticated requests simultaneously. */
    const promises = Array.from(
      { length: CONCURRENCY },
      (_, i) => postBooking(i, tokens[i % tokens.length]),
    );
    results = await Promise.all(promises);

    /* Analyse results */
    const successes = results.filter(r => r.status === 201);
    const conflicts = results.filter(r => r.status === 409);
    const others    = results.filter(r => r.status !== 201 && r.status !== 409);

    console.log('Results:');
    results.forEach(r => {
      const tag = r.status === 201 ? 'CREATED' : r.status === 409 ? 'CONFLICT' : `HTTP_${r.status}`;
      console.log(`  [${r.index}] ${tag}${r.bookingId ? ` bookingId=${r.bookingId}` : ''}`);
    });

    console.log('');
    const exactlyOne    = successes.length === 1;
    const restRejected  = conflicts.length === CONCURRENCY - 1;
    const noUnexpected  = others.length === 0;

    console.log(`  Successes (201):  ${successes.length}  -- expected: 1   ${exactlyOne ? 'PASS' : 'FAIL'}`);
    console.log(`  Conflicts (409):  ${conflicts.length}  -- expected: ${CONCURRENCY - 1}  ${restRejected ? 'PASS' : 'FAIL'}`);
    console.log(`  Unexpected:       ${others.length}   -- expected: 0   ${noUnexpected ? 'PASS' : 'FAIL'}`);

    /* Verify the winner was actually persisted using the owner token. */
    if (successes.length === 1) {
      const winner = successes[0];
      const winnerId = winner.bookingId;
      const getRes = await fetch(`${BASE}/bookings/${winnerId}`, {
        headers: { Authorization: `Bearer ${tokens[winner.index % tokens.length]}` },
      });
      const getJson = await getRes.json().catch(() => ({}));
      bookingPersisted = getRes.status === 200 && getJson?.data?.bookingId === winnerId;
      console.log(`  Booking persisted in DB:           ${bookingPersisted ? 'PASS' : 'FAIL'}`);
    }

    const allPassed = exactlyOne && restRejected && noUnexpected && bookingPersisted;
    console.log(`\n=================================================`);
    console.log(`  Concurrency test: ${allPassed ? 'PASS' : 'FAIL'}`);
    console.log('=================================================\n');
    if (!allPassed) process.exitCode = 1;
  } finally {
    for (const phone of TEST_PHONES) {
      const testUser = await prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      }).catch(() => null);
      if (testUser) {
        await prisma.booking.deleteMany({ where: { userId: testUser.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
      }
    }
    await prisma.$disconnect();
  }
}

run().catch(e => {
  process.stderr.write(`Concurrency test error: ${e.message}\n${e.stack}\n`);
  process.exit(1);
});
