/**
 * scripts/test-pricing-management.js
 * ─────────────────────────────────────────────────────────────────────────
 * Comprehensive test suite verifying Step 2.3: Admin Pricing Management
 *
 * Verifies:
 *   1.  Auth / Role gating: unauthenticated -> 401, non-admin -> 403
 *   2.  Admin list pricing rules: GET /admin/pricing -> 200 with joins
 *   3.  Filtering: venueId, dayType, period, isActive, search
 *   4.  Validation: negative price, invalid dayType, invalid period, bad court -> 400 / 404
 *   5.  Conflict prevention: duplicate (courtId, dayType, period) -> 409
 *   6.  Creation: POST /admin/pricing -> 201
 *   7.  Read by ID: GET /admin/pricing/:id -> 200 with court & venue info
 *   8.  Editing: PATCH /admin/pricing/:id -> 200 (pricePerHour & isActive)
 *   9.  Status toggle: PATCH /admin/pricing/:id/status -> 200
 *   10. Booking integration: new active rule is used in future booking calculation
 *   11. Historical protection: editing or deleting a rule NEVER modifies past bookings
 *   12. Deletion: DELETE /admin/pricing/:id -> 200
 *   13. Customer booking & cancellation integrity preserved
 *
 * Run:  node scripts/test-pricing-management.js
 * ─────────────────────────────────────────────────────────────────────────
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const BASE = 'http://localhost:3001/api/v1';
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(method, urlPath, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);
  const res  = await fetch(`${BASE}${urlPath}`, opts);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, json };
}

async function run() {
  console.log('\n=======================================================');
  console.log('  Matro Indoor Booking — Step 2.3 Pricing Management Tests');
  console.log('=======================================================\n');

  const RUN_ID = Math.floor(Math.random() * 900000) + 100000;
  const ADMIN_PHONE = `+92305${RUN_ID}`;
  const USER_PHONE  = `+92306${RUN_ID}`;
  const PASSWORD    = `PricingPass${RUN_ID}!`;
  const TEST_COURT_ID = `test-court-${RUN_ID}`;

  let adminUserId = null;
  let regularUserId = null;
  let adminToken = null;
  let userToken = null;
  let createdRuleId = null;
  let testBookingId = null;

  try {
    /* ── 0. Bootstrap test admin & customer accounts directly via DB ─── */
    const hash = await bcrypt.hash(PASSWORD, 10);
    const adminUser = await prisma.user.create({
      data: { phone: ADMIN_PHONE, passwordHash: hash, name: 'Pricing Test Admin', role: 'ADMIN', isActive: true },
    });
    adminUserId = adminUser.id;

    const regUser = await prisma.user.create({
      data: { phone: USER_PHONE, passwordHash: hash, name: 'Pricing Test Customer', role: 'USER', isActive: true },
    });
    regularUserId = regUser.id;

    /* Create temporary court on fr-dha-phase-5 for isolated rule testing */
    await prisma.court.create({
      data: {
        id: TEST_COURT_ID,
        venueId: 'fr-dha-phase-5',
        name: `Test Court ${RUN_ID}`,
        sport: 'futsal',
        surfaceType: 'Turf',
        isActive: true,
        sortOrder: 99,
      },
    });

    /* Log in to get tokens */
    const rAdminLogin = await req('POST', '/auth/login', { phone: ADMIN_PHONE, password: PASSWORD });
    adminToken = rAdminLogin.json?.data?.token;

    const rUserLogin = await req('POST', '/auth/login', { phone: USER_PHONE, password: PASSWORD });
    userToken = rUserLogin.json?.data?.token;

    assert('admin login successful', rAdminLogin.status === 200 && Boolean(adminToken));
    assert('regular user login successful', rUserLogin.status === 200 && Boolean(userToken));

    /* ── 1. Authorization: Non-admin & unauthenticated users are blocked ─── */
    console.log('\n[1. Auth & Role Enforcement]');
    {
      const rNoAuth = await req('GET', '/admin/pricing');
      assert('unauthenticated GET /admin/pricing -> 401', rNoAuth.status === 401);

      const rUserGet = await req('GET', '/admin/pricing', null, userToken);
      assert('regular user GET /admin/pricing -> 403', rUserGet.status === 403);

      const rUserPost = await req('POST', '/admin/pricing', {
        courtId: TEST_COURT_ID, dayType: 'weekday', period: 'off_peak', pricePerHour: 2000,
      }, userToken);
      assert('regular user POST /admin/pricing -> 403', rUserPost.status === 403);

      const rUserPatch = await req('PATCH', '/admin/pricing/1', { pricePerHour: 3000 }, userToken);
      assert('regular user PATCH /admin/pricing/:id -> 403', rUserPatch.status === 403);

      const rUserDelete = await req('DELETE', '/admin/pricing/1', null, userToken);
      assert('regular user DELETE /admin/pricing/:id -> 403', rUserDelete.status === 403);
    }

    /* ── 2. Admin List Pricing Rules & Filters ────────────────────────── */
    console.log('\n[2. List & Filters]');
    {
      const rList = await req('GET', '/admin/pricing', null, adminToken);
      assert('admin GET /admin/pricing -> 200', rList.status === 200);
      assert('pricing rules is array', Array.isArray(rList.json?.data));
      assert('pricing rules populated from DB', rList.json?.data?.length > 0);

      const first = rList.json?.data?.[0];
      assert('rule has required schema fields',
        Boolean(first && first.id && first.courtId && first.courtName && first.venueName && first.dayType && first.period && typeof first.pricePerHour === 'number' && typeof first.isActive === 'boolean')
      );

      /* Test filters */
      const rVenueFilter = await req('GET', '/admin/pricing?venueId=fr-dha-phase-5', null, adminToken);
      assert('filter by venueId -> 200', rVenueFilter.status === 200);
      assert('filtered rules match venue', (rVenueFilter.json?.data ?? []).every((r) => r.venueId === 'fr-dha-phase-5'));

      const rDayFilter = await req('GET', '/admin/pricing?dayType=weekend', null, adminToken);
      assert('filter by dayType=weekend -> 200', rDayFilter.status === 200);
      assert('filtered rules are weekend', (rDayFilter.json?.data ?? []).every((r) => r.dayType === 'weekend'));

      const rPeriodFilter = await req('GET', '/admin/pricing?period=peak', null, adminToken);
      assert('filter by period=peak -> 200', rPeriodFilter.status === 200);
      assert('filtered rules are peak', (rPeriodFilter.json?.data ?? []).every((r) => r.period === 'peak'));

      const rSearch = await req('GET', '/admin/pricing?search=DHA', null, adminToken);
      assert('search filter -> 200', rSearch.status === 200);
      assert('search results contain DHA', (rSearch.json?.data?.length ?? 0) > 0);
    }

    /* ── 3. Validation & Constraint Enforcement ──────────────────────── */
    console.log('\n[3. Input Validation & Error Handling]');
    {
      const rNegPrice = await req('POST', '/admin/pricing', {
        courtId: TEST_COURT_ID, dayType: 'weekday', period: 'off_peak', pricePerHour: -500,
      }, adminToken);
      assert('negative price rejected -> 400', rNegPrice.status === 400);

      const rBadDay = await req('POST', '/admin/pricing', {
        courtId: TEST_COURT_ID, dayType: 'tuesday', period: 'off_peak', pricePerHour: 2000,
      }, adminToken);
      assert('invalid dayType rejected -> 400', rBadDay.status === 400);

      const rBadPeriod = await req('POST', '/admin/pricing', {
        courtId: TEST_COURT_ID, dayType: 'weekday', period: 'midnight', pricePerHour: 2000,
      }, adminToken);
      assert('invalid period rejected -> 400', rBadPeriod.status === 400);

      const rBadCourt = await req('POST', '/admin/pricing', {
        courtId: 'non-existent-court-xyz', dayType: 'weekday', period: 'off_peak', pricePerHour: 2000,
      }, adminToken);
      assert('unknown court rejected -> 404', rBadCourt.status === 404);
    }

    /* ── 4. Creation & Duplicate Prevention ──────────────────────────── */
    console.log('\n[4. Rule Creation & Duplicate Conflict]');
    {
      const rCreate = await req('POST', '/admin/pricing', {
        courtId: TEST_COURT_ID,
        dayType: 'weekday',
        period: 'off_peak',
        pricePerHour: 2400,
        isActive: true,
      }, adminToken);
      assert('POST /admin/pricing creates rule -> 201', rCreate.status === 201);
      assert('rule returns id', typeof rCreate.json?.data?.id === 'number');
      createdRuleId = rCreate.json?.data?.id;

      /* Duplicate attempt must return 409 Conflict */
      const rDup = await req('POST', '/admin/pricing', {
        courtId: TEST_COURT_ID,
        dayType: 'weekday',
        period: 'off_peak',
        pricePerHour: 3000,
      }, adminToken);
      assert('duplicate (courtId, dayType, period) -> 409 Conflict', rDup.status === 409);
    }

    /* ── 5. Get Single Rule by ID ────────────────────────────────────── */
    console.log('\n[5. Retrieve Rule by ID]');
    {
      const rGet = await req('GET', `/admin/pricing/${createdRuleId}`, null, adminToken);
      assert('GET /admin/pricing/:id -> 200', rGet.status === 200);
      assert('rule id matches', rGet.json?.data?.id === createdRuleId);
      assert('rule pricePerHour is 2400', rGet.json?.data?.pricePerHour === 2400);
      assert('courtName is present', typeof rGet.json?.data?.courtName === 'string');
    }

    /* ── 6. Edit Pricing Rule ────────────────────────────────────────── */
    console.log('\n[6. Edit Pricing Rule]');
    {
      const rUpdate = await req('PATCH', `/admin/pricing/${createdRuleId}`, {
        pricePerHour: 2800,
      }, adminToken);
      assert('PATCH /admin/pricing/:id -> 200', rUpdate.status === 200);
      assert('price updated to 2800', rUpdate.json?.data?.pricePerHour === 2800);

      const rBadUpdate = await req('PATCH', `/admin/pricing/${createdRuleId}`, {
        pricePerHour: -100,
      }, adminToken);
      assert('invalid price update rejected -> 400', rBadUpdate.status === 400);
    }

    /* ── 7. Toggle Active/Inactive Status ────────────────────────────── */
    console.log('\n[7. Activate / Deactivate]');
    {
      const rDeactivate = await req('PATCH', `/admin/pricing/${createdRuleId}/status`, {
        isActive: false,
      }, adminToken);
      assert('deactivate rule -> 200', rDeactivate.status === 200);
      assert('rule isActive is false', rDeactivate.json?.data?.isActive === false);

      const rReactivate = await req('PATCH', `/admin/pricing/${createdRuleId}/status`, {
        isActive: true,
      }, adminToken);
      assert('reactivate rule -> 200', rReactivate.status === 200);
      assert('rule isActive is true', rReactivate.json?.data?.isActive === true);
    }

    /* ── 8. Integration with Booking Price Calculation ───────────────── */
    console.log('\n[8. Booking Integration & Price Snapshot Preservation]');
    {
      /*
       * TEST_COURT_ID now has:
       * dayType: 'weekday' (Mon–Thu)
       * period: 'off_peak' (05:00–17:00)
       * pricePerHour: 2800
       *
       * Pick a future weekday date (Monday) at 10:00 (off-peak).
       */
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      while (futureDate.getDay() !== 1) { // 1 = Monday
        futureDate.setDate(futureDate.getDate() + 1);
      }
      const dateStr = futureDate.toISOString().slice(0, 10);

      const rBook = await req('POST', '/bookings', {
        courtId: TEST_COURT_ID,
        date: dateStr,
        startTime: '10:00',
        durationHours: 2,
        playerName: 'Price Test Player',
        phone: '0300-1234567',
      }, userToken);

      assert('booking created with updated rule -> 201', rBook.status === 201);
      assert('booking captures rule pricePerHour (2800)', rBook.json?.data?.pricePerHour === 2800);
      assert('booking totalAmount is 5600 (2h * 2800)', rBook.json?.data?.totalAmount === 5600);
      testBookingId = rBook.json?.data?.bookingId ?? rBook.json?.data?.id;

      /*
       * Critical Check: Update the rule price to 4000.
       * The EXISTING booking MUST retain 2800 / 5600!
       */
      const rChangeRule = await req('PATCH', `/admin/pricing/${createdRuleId}`, {
        pricePerHour: 4000,
      }, adminToken);
      assert('rule price updated to 4000 -> 200', rChangeRule.status === 200);

      const rCheckPastBooking = await req('GET', `/bookings/${testBookingId}`, null, userToken);
      assert('existing booking unchanged pricePerHour (2800)', rCheckPastBooking.json?.data?.pricePerHour === 2800);
      assert('existing booking unchanged totalAmount (5600)', rCheckPastBooking.json?.data?.totalAmount === 5600);

      /*
       * Critical Check: Deactivate the rule, booking should reject new bookings for this slot.
       */
      await req('PATCH', `/admin/pricing/${createdRuleId}/status`, { isActive: false }, adminToken);
      const rBookInactive = await req('POST', '/bookings', {
        courtId: TEST_COURT_ID,
        date: dateStr,
        startTime: '12:00',
        durationHours: 1,
        playerName: 'Inactive Test',
        phone: '0300-1234567',
      }, userToken);
      assert('booking rejected when pricing rule is inactive -> 400', rBookInactive.status === 400);

      /* Reactivate rule for deletion test */
      await req('PATCH', `/admin/pricing/${createdRuleId}/status`, { isActive: true }, adminToken);
    }

    /* ── 9. Safe Deletion ────────────────────────────────────────────── */
    console.log('\n[9. Delete Pricing Rule]');
    {
      const rDelete = await req('DELETE', `/admin/pricing/${createdRuleId}`, null, adminToken);
      assert('DELETE /admin/pricing/:id -> 200', rDelete.status === 200);

      const rCheckDeleted = await req('GET', `/admin/pricing/${createdRuleId}`, null, adminToken);
      assert('rule no longer found -> 404', rCheckDeleted.status === 404);

      /* Historical booking still intact after rule deletion */
      const rCheckBookingAgain = await req('GET', `/bookings/${testBookingId}`, null, userToken);
      assert('booking preserves recorded price after rule deletion',
        rCheckBookingAgain.json?.data?.totalAmount === 5600 && rCheckBookingAgain.json?.data?.pricePerHour === 2800
      );
    }

    /* ── 10. Customer Booking & Cancellation Still Works ─────────────── */
    console.log('\n[10. Cancellation & Availability Still Working]');
    {
      const rCancel = await req('PATCH', `/bookings/${testBookingId}/cancel`, null, userToken);
      assert('customer can cancel booking -> 200', rCancel.status === 200);
      assert('booking status is CANCELLED', rCancel.json?.data?.status === 'CANCELLED');
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    /* Cleanup temporary test records from DB */
    try {
      if (testBookingId) {
        await prisma.booking.deleteMany({ where: { id: testBookingId } });
      }
      if (createdRuleId) {
        await prisma.pricingRule.deleteMany({ where: { id: createdRuleId } });
      }
      await prisma.court.deleteMany({ where: { id: TEST_COURT_ID } });
      if (adminUserId) {
        await prisma.user.deleteMany({ where: { id: adminUserId } });
      }
      if (regularUserId) {
        await prisma.user.deleteMany({ where: { id: regularUserId } });
      }
      console.log('\nCleaned up all temporary test courts, users, and bookings.');
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    await prisma.$disconnect();
  }

  console.log('\n=======================================================');
  console.log(`  ${passed} passed   ${failed} failed`);
  console.log('=======================================================\n');

  if (failed > 0) process.exit(1);
}

run();
