/**
 * Comprehensive verification test for all 4 Admin Panel Modules:
 *  - Module 1: Bookings Management
 *  - Module 2: Venues Management
 *  - Module 3: Pricing Management
 *  - Module 4: Users Management
 *
 * Usage: node server/scripts/test-admin-modules.js
 */
'use strict';

const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');
const { signToken } = require('../src/lib/jwt');

const API_BASE = 'http://localhost:3001/api/v1';

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  PASS  ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${description}`);
    failed++;
  }
}

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {}

  return { status: res.status, json };
}

async function run() {
  console.log('\n=======================================================');
  console.log('  Matro Indoor Booking — All 4 Admin Modules Test Suite');
  console.log('=======================================================\n');

  const runId = Math.floor(Math.random() * 900000 + 100000);
  const adminPhone = `+92300${runId}`;
  const userPhone = `+92311${runId}`;
  const password = 'TestPassword123!';

  // Clean-up tracker
  const createdUserIds = [];
  const createdVenueIds = [];
  const createdCourtIds = [];
  const createdPricingRuleIds = [];
  const createdBookingIds = [];

  try {
    // 1. Setup Admin & User accounts
    const passwordHash = await bcrypt.hash(password, 8);
    const adminUser = await prisma.user.create({
      data: {
        phone: adminPhone,
        name: 'Test Admin',
        role: 'ADMIN',
        passwordHash,
        isActive: true,
      },
    });
    createdUserIds.push(adminUser.id);

    const normalUser = await prisma.user.create({
      data: {
        phone: userPhone,
        name: 'Normal User',
        role: 'USER',
        passwordHash,
        isActive: true,
      },
    });
    createdUserIds.push(normalUser.id);

    const adminToken = signToken(adminUser);
    const userToken = signToken(normalUser);

    console.log('[0. Security & Role Guards]');
    {
      const r1 = await req('GET', '/admin/stats');
      assert('unauthenticated GET /admin/stats -> 401', r1.status === 401);

      const r2 = await req('GET', '/admin/stats', null, userToken);
      assert('normal user GET /admin/stats -> 403', r2.status === 403);

      const r3 = await req('GET', '/admin/bookings', null, userToken);
      assert('normal user GET /admin/bookings -> 403', r3.status === 403);

      const r4 = await req('GET', '/admin/venues', null, userToken);
      assert('normal user GET /admin/venues -> 403', r4.status === 403);

      const r5 = await req('GET', '/admin/pricing', null, userToken);
      assert('normal user GET /admin/pricing -> 403', r5.status === 403);

      const r6 = await req('GET', '/admin/users', null, userToken);
      assert('normal user GET /admin/users -> 403', r6.status === 403);

      const r7 = await req('GET', '/admin/stats', null, adminToken);
      assert('admin GET /admin/stats -> 200', r7.status === 200);
      assert('stats has totalBookings', typeof r7.json?.data?.totalBookings === 'number');
    }

    console.log('\n[1. Module 2 — Venues & Courts Management]');
    let testVenueId = null;
    let testCourtId = null;
    {
      // Create Venue
      const newVenueData = {
        id: `test-arena-${runId}`,
        name: `Test Arena ${runId}`,
        shortName: `TA-${runId}`,
        city: 'Islamabad',
        location: 'Sector F-7',
        address: '123 Sports Way, Islamabad',
        operatingHours: '06:00 AM – 11:00 PM',
        startingPrice: 2000,
        badge: 'Premier',
      };
      const rCreate = await req('POST', '/admin/venues', newVenueData, adminToken);
      assert('POST /admin/venues -> 201', rCreate.status === 201);
      testVenueId = rCreate.json?.data?.id;
      assert('venue id generated', Boolean(testVenueId));
      if (testVenueId) createdVenueIds.push(testVenueId);

      // List Venues (should include created venue)
      const rList = await req('GET', '/admin/venues', null, adminToken);
      assert('GET /admin/venues -> 200', rList.status === 200);
      const found = rList.json?.data?.find(v => v.id === testVenueId);
      assert('newly created venue appears in listing', Boolean(found));
      assert('venue startingPrice matches', found?.startingPrice === 2000);

      // Update Venue
      const rUpdate = await req('PATCH', `/admin/venues/${testVenueId}`, {
        name: `Updated Arena ${runId}`,
        startingPrice: 2500,
      }, adminToken);
      assert('PATCH /admin/venues/:id -> 200', rUpdate.status === 200);
      assert('venue name updated', rUpdate.json?.data?.name === `Updated Arena ${runId}`);

      // Toggle Venue Status
      const rDeact = await req('PATCH', `/admin/venues/${testVenueId}/status`, { isActive: false }, adminToken);
      assert('deactivate venue -> 200', rDeact.status === 200);
      assert('venue isActive is false', rDeact.json?.data?.isActive === false);

      const rReact = await req('PATCH', `/admin/venues/${testVenueId}/status`, { isActive: true }, adminToken);
      assert('reactivate venue -> 200', rReact.status === 200);
      assert('venue isActive is true', rReact.json?.data?.isActive === true);

      // Add Court to Venue
      testCourtId = `court-test-${runId}`;
      const rCourt = await req('POST', `/admin/venues/${testVenueId}/courts`, {
        id: testCourtId,
        name: 'Court Alpha',
        sport: 'pickleball',
        surfaceType: 'Hard Court',
        sortOrder: 1,
      }, adminToken);
      assert('POST /admin/venues/:id/courts -> 201', rCourt.status === 201);
      if (testCourtId) createdCourtIds.push(testCourtId);

      // Update Court
      const rCourtUpdate = await req('PATCH', `/admin/courts/${testCourtId}`, {
        name: 'Court Alpha Elite',
        surfaceType: 'Acrylic Pro',
      }, adminToken);
      assert('PATCH /admin/courts/:id -> 200', rCourtUpdate.status === 200);
      assert('court name updated', rCourtUpdate.json?.data?.name === 'Court Alpha Elite');

      // Toggle Court Status
      const rCourtDeact = await req('PATCH', `/admin/courts/${testCourtId}/status`, { isActive: false }, adminToken);
      assert('deactivate court -> 200', rCourtDeact.status === 200);
      assert('court isActive is false', rCourtDeact.json?.data?.isActive === false);

      const rCourtReact = await req('PATCH', `/admin/courts/${testCourtId}/status`, { isActive: true }, adminToken);
      assert('reactivate court -> 200', rCourtReact.status === 200);
      assert('court isActive is true', rCourtReact.json?.data?.isActive === true);
    }

    console.log('\n[2. Module 3 — Pricing Management]');
    let testRuleId = null;
    {
      // Create Pricing Rule
      const rCreateRule = await req('POST', '/admin/pricing', {
        courtId: testCourtId,
        dayType: 'weekday',
        period: 'peak',
        pricePerHour: 3200,
      }, adminToken);
      assert('POST /admin/pricing -> 201', rCreateRule.status === 201);
      testRuleId = rCreateRule.json?.data?.id;
      assert('pricing rule id generated', Boolean(testRuleId));
      if (testRuleId) createdPricingRuleIds.push(testRuleId);

      // Conflict rejection on duplicate
      const rDup = await req('POST', '/admin/pricing', {
        courtId: testCourtId,
        dayType: 'weekday',
        period: 'peak',
        pricePerHour: 3500,
      }, adminToken);
      assert('duplicate pricing rule rejected -> 409', rDup.status === 409);

      // Filter Pricing Rules
      const rListRules = await req('GET', `/admin/pricing?venueId=${testVenueId}`, null, adminToken);
      assert('GET /admin/pricing with filter -> 200', rListRules.status === 200);
      assert('returned rule matches court', rListRules.json?.data?.some(r => r.courtId === testCourtId));

      // Update Pricing Rule
      const rUpdateRule = await req('PATCH', `/admin/pricing/${testRuleId}`, {
        pricePerHour: 3600,
      }, adminToken);
      assert('PATCH /admin/pricing/:id -> 200', rUpdateRule.status === 200);
      assert('pricing rule price updated to 3600', rUpdateRule.json?.data?.pricePerHour === 3600);

      // Toggle Pricing Rule Status
      const rDeactRule = await req('PATCH', `/admin/pricing/${testRuleId}/status`, { isActive: false }, adminToken);
      assert('deactivate pricing rule -> 200', rDeactRule.status === 200);
      assert('pricing rule isActive is false', rDeactRule.json?.data?.isActive === false);

      const rReactRule = await req('PATCH', `/admin/pricing/${testRuleId}/status`, { isActive: true }, adminToken);
      assert('reactivate pricing rule -> 200', rReactRule.status === 200);
      assert('pricing rule isActive is true', rReactRule.json?.data?.isActive === true);
    }

    console.log('\n[3. Module 1 — Bookings Management]');
    let testBookingId = null;
    {
      // Create a booking using the userToken on a Wednesday (weekday peak: 18:00)
      const bookingDate = '2028-09-13';
      const rCreateBooking = await req('POST', '/bookings', {
        courtId: testCourtId,
        date: bookingDate,
        startTime: '18:00',
        durationHours: 2,
        playerName: 'Tournament Player',
        phone: userPhone,
      }, userToken);
      if (rCreateBooking.status !== 201) console.error('CREATE BOOKING ERR:', rCreateBooking.status, rCreateBooking.json);
      assert('POST /bookings creates test booking -> 201', rCreateBooking.status === 201);
      testBookingId = rCreateBooking.json?.data?.bookingId;
      assert('bookingId generated', Boolean(testBookingId));
      if (testBookingId) createdBookingIds.push(testBookingId);

      // Admin list bookings
      const rListBookings = await req('GET', `/admin/bookings?search=${encodeURIComponent(userPhone)}`, null, adminToken);
      assert('GET /admin/bookings with search -> 200', rListBookings.status === 200);
      const bookingFound = rListBookings.json?.data?.bookings?.find(b => b.bookingId === testBookingId);
      assert('booking appears in admin listing', Boolean(bookingFound));
      assert('booking totalAmount is 7200 (2h * 3600)', bookingFound?.totalAmount === 7200);

      // Venue deletion safety check: cannot delete venue while active bookings exist (status=CONFIRMED)
      const rDelVenueAttempt = await req('DELETE', `/admin/venues/${testVenueId}`, null, adminToken);
      assert('cannot delete venue with active bookings -> 400', rDelVenueAttempt.status === 400);

      // Update Booking Status to COMPLETED + PAID
      const rStatusUpdate = await req('PATCH', `/admin/bookings/${testBookingId}/status`, {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        notes: 'Verified payment in cash',
      }, adminToken);
      if (rStatusUpdate.json?.data?.notes !== 'Verified payment in cash') {
        console.error('STATUS UPDATE DATA:', rStatusUpdate.json?.data);
      }
      assert('admin update booking status -> 200', rStatusUpdate.status === 200);
      assert('booking status updated to COMPLETED', rStatusUpdate.json?.data?.status === 'COMPLETED');
      assert('payment status updated to PAID', rStatusUpdate.json?.data?.paymentStatus === 'PAID');
      assert('booking notes updated', rStatusUpdate.json?.data?.notes === 'Verified payment in cash');
    }

    console.log('\n[4. Module 4 — Users Management]');
    {
      // List Users
      const rUsers = await req('GET', '/admin/users?page=1&limit=20', null, adminToken);
      assert('GET /admin/users -> 200', rUsers.status === 200);
      assert('users list has total count', typeof rUsers.json?.data?.total === 'number');
      assert('users list never exposes passwordHash', !rUsers.json?.data?.users?.some(u => 'passwordHash' in u));

      // Filter by Role
      const rAdmins = await req('GET', '/admin/users?role=ADMIN', null, adminToken);
      assert('GET /admin/users?role=ADMIN -> 200', rAdmins.status === 200);
      const adminUsersList = rAdmins.json?.data?.users ?? [];
      if (!adminUsersList.every(u => u.role === 'ADMIN')) {
        console.error('RADMINS USERS:', adminUsersList.map(u => ({ id: u.id, role: u.role })));
      }
      assert('filtered users are all ADMIN', adminUsersList.length > 0 && adminUsersList.every(u => u.role === 'ADMIN'));

      // Filter by Status
      const rActive = await req('GET', '/admin/users?status=active', null, adminToken);
      assert('GET /admin/users?status=active -> 200', rActive.status === 200);
      const activeUsersList = rActive.json?.data?.users ?? [];
      assert('filtered users are all active', activeUsersList.length > 0 && activeUsersList.every(u => u.isActive === true));

      // Search by Phone / Name
      const rSearch = await req('GET', `/admin/users?search=${encodeURIComponent(userPhone)}`, null, adminToken);
      assert('GET /admin/users?search=... -> 200', rSearch.status === 200);
      if (!rSearch.json?.data?.users?.some(u => u.id === normalUser.id)) {
        console.error('SEARCH RESULT:', userPhone, rSearch.json?.data?.users);
      }
      assert('search result finds target user', rSearch.json?.data?.users?.some(u => u.id === normalUser.id));

      // Get User Bookings
      const rUserBookings = await req('GET', `/admin/users/${normalUser.id}/bookings`, null, adminToken);
      assert('GET /admin/users/:id/bookings -> 200', rUserBookings.status === 200);
      assert('user bookings returns history array', Array.isArray(rUserBookings.json?.data?.bookings));
      assert('history includes created booking', rUserBookings.json?.data?.bookings?.some(b => b.bookingId === testBookingId));

      // Deactivate User
      const rDeactUser = await req('PATCH', `/admin/users/${normalUser.id}/status`, { isActive: false }, adminToken);
      assert('PATCH /admin/users/:id/status deactivates user -> 200', rDeactUser.status === 200);
      assert('user isActive is false', rDeactUser.json?.data?.isActive === false);

      // Verify deactivated user cannot log in
      const rDeactLogin = await req('POST', '/auth/login', { phone: userPhone, password });
      assert('deactivated user login blocked -> 401', rDeactLogin.status === 401);

      // Reactivate User
      const rReactUser = await req('PATCH', `/admin/users/${normalUser.id}/status`, { isActive: true }, adminToken);
      assert('reactivate user -> 200', rReactUser.status === 200);
      assert('user isActive is true', rReactUser.json?.data?.isActive === true);

      // Self-deactivation forbidden
      const rSelfDeact = await req('PATCH', `/admin/users/${adminUser.id}/status`, { isActive: false }, adminToken);
      assert('admin self-deactivation blocked -> 403', rSelfDeact.status === 403);
    }

  } finally {
    // Clean up created test entities
    try {
      if (createdBookingIds.length > 0) {
        await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      }
      if (createdPricingRuleIds.length > 0) {
        await prisma.pricingRule.deleteMany({ where: { id: { in: createdPricingRuleIds } } });
      }
      if (createdCourtIds.length > 0) {
        await prisma.court.deleteMany({ where: { id: { in: createdCourtIds } } });
      }
      if (createdVenueIds.length > 0) {
        await prisma.venue.deleteMany({ where: { id: { in: createdVenueIds } } });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
  }

  console.log('\n=======================================================');
  console.log(`  ${passed} passed   ${failed} failed`);
  console.log('=======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
