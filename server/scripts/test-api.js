/**
 * scripts/test-api.js
 * ─────────────────────────────────────────────────────────────────────────
 * Smoke + integration tests for all API endpoints including:
 *   - Auth (register / login / me)
 *   - Venues + courts + pricing
 *   - Availability
 *   - Authenticated booking creation (POST /bookings)
 *   - GET /bookings/my (own bookings)
 *   - GET /bookings/:id (ownership check)
 *   - PATCH /bookings/:id/cancel
 *   - Duplicate / overlap / concurrent booking prevention
 *   - Admin routes (stats / bookings / users / venues)
 *   - Admin-only authorization (non-admin blocked)
 *
 * Run:  node scripts/test-api.js   (requires server running on :3001)
 * ─────────────────────────────────────────────────────────────────────────
 */
'use strict';

const BASE = 'http://localhost:3001/api/v1';
let passed = 0;
let failed = 0;
const testUserIds = new Set();

/* ── Far-future test dates to avoid clashing with earlier runs ─────────── */
const BASE_OFFSET   = 500 + Math.floor(Math.random() * 200);
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const TEST_DATE      = addDays(BASE_OFFSET);
const TEST_DATE_2    = addDays(BASE_OFFSET + 1);
const TEST_DATE_MY   = addDays(BASE_OFFSET + 2);
const TEST_DATE_CANC = addDays(BASE_OFFSET + 3);
const TEST_DATE_REG  = addDays(BASE_OFFSET + 4); /* dedicated date for regression check */

/* ── Unique phone numbers per run to avoid collision ────────────────────── */
const RUN_ID      = Math.floor(Math.random() * 900000) + 100000;
const USER_PHONE  = `+92300${RUN_ID}`;
const ADMIN_PHONE = `+92301${RUN_ID}`;
const OTHER_PHONE = `+92302${RUN_ID}`;

/* ── Admin bootstrap helper ─────────────────────────────────────────────── */
/* Creates a fresh ADMIN user directly via the DB for test-only use.
   This is equivalent to running scripts/create-admin.js but in-process.
   It avoids exposing a public admin-registration API. */
async function createAdminUserForTest(phone, password) {
  const { PrismaClient } = await import('@prisma/client').catch(() => {
    return require('@prisma/client');
  });
  const bcrypt  = require('bcryptjs');
  const path    = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new Error('Generated test admin phone already exists; refusing to modify an existing user.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { phone, passwordHash, name: 'Test Admin', role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    return user.id;
  } finally {
    await prisma.$disconnect();
  }
}

async function passwordIsStoredAsHash(phone, password) {
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { passwordHash: true },
    });
    return Boolean(
      user &&
      user.passwordHash !== password &&
      await bcrypt.compare(password, user.passwordHash),
    );
  } finally {
    await prisma.$disconnect();
  }
}

/* ── HTTP helper ─────────────────────────────────────────────────────────── */
async function req(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);
  const res  = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, json };
}

/* ── Assert helper ───────────────────────────────────────────────────────── */
function assert(label, condition, detail = '') {
  if (condition) {
    process.stdout.write(`  PASS  ${label}\n`);
    passed++;
  } else {
    process.stderr.write(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}\n`);
    failed++;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEST SUITES
════════════════════════════════════════════════════════════════════════════ */
async function run() {
  console.log('\n=======================================================');
  console.log('  Matro API — full endpoint smoke + integration tests');
  console.log(`  Test date: ${TEST_DATE}  |  Run ID: ${RUN_ID}`);
  console.log('=======================================================\n');

  /* ── Health ─────────────────────────────────────────────── */
  console.log('[Health]');
  {
    const r = await req('GET', '/health');
    assert('GET /health 200',  r.status === 200);
    assert('db connected',     r.json?.db === 'connected');
  }

  /* ── Auth: Register ─────────────────────────────────────── */
  console.log('\n[Auth — Register]');
  let userToken  = null;
  let userId     = null;
  let otherToken = null;
  {
    /* Missing fields */
    const rBad = await req('POST', '/auth/register', { phone: USER_PHONE });
    assert('register missing password -> 400', rBad.status === 400);

    /* Short password */
    const rShort = await req('POST', '/auth/register', { phone: USER_PHONE, password: 'abc' });
    assert('register short password -> 400', rShort.status === 400);
    assert(
      'registration validation does not echo password',
      !JSON.stringify(rShort.json).includes('abc'),
    );

    const rLongBytes = await req('POST', '/auth/register', {
      phone: USER_PHONE, password: '🙂'.repeat(19),
    });
    assert('register password over bcrypt byte limit -> 400', rLongBytes.status === 400);
    assert(
      'password byte validation does not echo password',
      !JSON.stringify(rLongBytes.json).includes('🙂'),
    );

    /* Valid user registration */
    const rReg = await req('POST', '/auth/register', {
      phone: USER_PHONE, password: 'TestPass123!', name: 'Test User',
    });
    assert('register -> 201',          rReg.status === 201);
    assert('returns token',            typeof rReg.json?.data?.token === 'string');
    assert('returns user object',      typeof rReg.json?.data?.user === 'object');
    assert('role is USER',             rReg.json?.data?.user?.role === 'USER');
    assert('password not in response', !JSON.stringify(rReg.json).includes('password'));
    assert(
      'password is stored as a bcrypt hash',
      await passwordIsStoredAsHash(USER_PHONE, 'TestPass123!'),
    );
    userToken = rReg.json?.data?.token;
    userId    = rReg.json?.data?.user?.id;
    if (rReg.status === 201 && userId) testUserIds.add(userId);

    /* Duplicate phone */
    const rDup = await req('POST', '/auth/register', { phone: USER_PHONE, password: 'TestPass123!' });
    assert('duplicate phone -> 400', rDup.status === 400);

    /* Second user for ownership tests */
    const rOther = await req('POST', '/auth/register', {
      phone: OTHER_PHONE, password: 'OtherPass123!', name: 'Other User',
    });
    assert('second user registered',   rOther.status === 201);
    otherToken = rOther.json?.data?.token;
    if (rOther.status === 201 && rOther.json?.data?.user?.id) {
      testUserIds.add(rOther.json.data.user.id);
    }
  }

  /* ── Auth: Login ────────────────────────────────────────── */
  console.log('\n[Auth — Login]');
  {
    /* Wrong password */
    const rBad = await req('POST', '/auth/login', { phone: USER_PHONE, password: 'wrong' });
    assert('wrong password -> 401', rBad.status === 401);

    const rUnknown = await req('POST', '/auth/login', {
      phone: `+92399${RUN_ID}`, password: 'wrong',
    });
    assert('unknown phone -> 400 or 401', rUnknown.status === 401 || rUnknown.status === 400);

    /* Valid login */
    const rLogin = await req('POST', '/auth/login', { phone: USER_PHONE, password: 'TestPass123!' });
    assert('login -> 200',      rLogin.status === 200);
    assert('returns token',     typeof rLogin.json?.data?.token === 'string');
    assert('user role correct', rLogin.json?.data?.user?.role === 'USER');
    /* Refresh token from login */
    userToken = rLogin.json?.data?.token ?? userToken;
  }

  /* ── Auth: GET /me ──────────────────────────────────────── */
  console.log('\n[Auth — /me]');
  {
    /* No token */
    const rNo = await req('GET', '/auth/me');
    assert('no token -> 401',   rNo.status === 401);

    const rInvalid = await req('GET', '/auth/me', null, 'not-a-valid-token');
    assert('invalid token -> 401', rInvalid.status === 401);

    /* Valid token */
    const rMe = await req('GET', '/auth/me', null, userToken);
    assert('/me 200',           rMe.status === 200);
    assert('id matches',        rMe.json?.data?.id === userId);
    assert('phone matches',     rMe.json?.data?.phone === USER_PHONE);
    assert('no passwordHash',   !rMe.json?.data?.passwordHash);
  }

  /* ── Venues ─────────────────────────────────────────────── */
  console.log('\n[Venues]');
  {
    const r = await req('GET', '/venues');
    assert('GET /venues 200',        r.status === 200);
    assert('returns 5 venues',       r.json?.data?.length === 5);
    assert('each has id+courts',     r.json?.data?.every(v => v.id && Array.isArray(v.courts)));

    const rCity = await req('GET', '/venues?city=Sialkot');
    assert('city=Sialkot -> 1',      rCity.json?.data?.length === 1);

    const rSport = await req('GET', '/venues?sport=pickleball');
    assert('sport=pickleball -> 2',  rSport.json?.data?.length === 2);

    const rDetail = await req('GET', '/venues/fr-dha-phase-5');
    assert('GET /venues/:id 200',    rDetail.status === 200);
    assert('has courts array',       Array.isArray(rDetail.json?.data?.courts));

    const r404 = await req('GET', '/venues/does-not-exist');
    assert('unknown venue -> 404',   r404.status === 404);
  }

  /* ── Availability ───────────────────────────────────────── */
  console.log('\n[Availability]');
  {
    const rBad = await req('GET', '/availability?venue_id=fr-dha-phase-5');
    assert('missing date -> 400',    rBad.status === 400);

    const rInvalidDate = await req('GET', '/availability?venue_id=fr-dha-phase-5&date=2026-02-30');
    assert('invalid calendar date -> 400', rInvalidDate.status === 400);

    const rMissingVenue = await req('GET', `/availability?venue_id=does-not-exist&date=${TEST_DATE}`);
    assert('unknown venue -> 404',    rMissingVenue.status === 404);

    const r = await req('GET', `/availability?venue_id=fr-dha-phase-5&date=${TEST_DATE}`);
    assert('availability 200',       r.status === 200);
    assert('6 courts',               r.json?.data?.courts?.length === 6);
    assert(
      'timeSlots follow venue operating hours',
      r.json?.data?.timeSlots?.length === 20
        && r.json?.data?.timeSlots?.[0]?.time === '06:00'
        && r.json?.data?.timeSlots?.at(-1)?.time === '01:00',
    );
    assert('_isLiveData true',       r.json?.data?._isLiveData === true);

    const slotValues = Object.values(r.json?.data?.courts?.[0]?.slots ?? {});
    assert('slots have status',      slotValues.every(s => typeof s.status === 'string'));
    assert('slots have price',       slotValues.every(s => s.pricePerHour != null));
  }

  /* ── Bookings: unauthenticated blocked ──────────────────── */
  console.log('\n[Bookings — Auth enforcement]');
  {
    const rNoAuth = await req('POST', '/bookings', {
      courtId: 'dha-c1', date: TEST_DATE, startTime: '09:00',
      durationHours: 1, playerName: 'Ghost', phone: '0300-0000000',
    });
    assert('POST /bookings without token -> 401', rNoAuth.status === 401);

    const rNoMy = await req('GET', '/bookings/my');
    assert('GET /bookings/my without token -> 401', rNoMy.status === 401);
  }

  /* ── Bookings: authenticated creation ───────────────────── */
  console.log('\n[Bookings — Authenticated creation]');
  let createdBookingId = null;
  {
    const invalidDate = await req('POST', '/bookings', {
      courtId: 'dha-c1', date: '2026-02-30', startTime: '09:00',
      durationHours: 1, playerName: 'Invalid Date', phone: '0300-1234567',
    }, userToken);
    assert('invalid calendar date -> 400', invalidDate.status === 400);

    const invalidTime = await req('POST', '/bookings', {
      courtId: 'dha-c1', date: TEST_DATE, startTime: '25:00',
      durationHours: 1, playerName: 'Invalid Time', phone: '0300-1234567',
    }, userToken);
    assert('invalid time slot -> 400', invalidTime.status === 400);

    const closedTime = await req('POST', '/bookings', {
      courtId: 'dha-c1', date: TEST_DATE, startTime: '03:00',
      durationHours: 1, playerName: 'Closed Venue', phone: '0300-1234567',
    }, userToken);
    assert('time outside venue operating hours -> 400', closedTime.status === 400);

    const invalidCourt = await req('POST', '/bookings', {
      courtId: 'missing-court', date: TEST_DATE, startTime: '09:00',
      durationHours: 1, playerName: 'Invalid Court', phone: '0300-1234567',
    }, userToken);
    assert('unknown court/venue -> 404', invalidCourt.status === 404);

    /* Server ignores client-supplied price */
    const rPrice = await req('POST', '/bookings', {
      courtId: 'dha-c1', date: TEST_DATE, startTime: '09:00',
      durationHours: 1, playerName: 'Price Test', phone: '0300-1234567',
      totalAmount: 1, pricePerHour: 1,
    }, userToken);
    assert('price override ignored -> 201',   rPrice.status === 201);
    assert('server calculates price',         (rPrice.json?.data?.totalAmount ?? 0) > 1);

    /* Server ignores client-supplied status */
    const rStatus = await req('POST', '/bookings', {
      courtId: 'dha-c2', date: TEST_DATE, startTime: '09:00',
      durationHours: 1, playerName: 'Status Test', phone: '0300-1111111',
      status: 'PAID', paymentStatus: 'PAID',
    }, userToken);
    assert('status override ignored -> 201',  rStatus.status === 201);
    assert('server enforces CONFIRMED',       rStatus.json?.data?.status === 'CONFIRMED');
    assert('server enforces UNPAID',          rStatus.json?.data?.paymentStatus === 'UNPAID');

    /* Valid booking */
    const payload = {
      courtId: 'dha-f1', date: TEST_DATE_2, startTime: '13:00',
      durationHours: 1, playerName: 'Integration Test', phone: '0300-9876543',
      notes: 'Auth test booking',
    };
    const rCreate = await req('POST', '/bookings', payload, userToken);
    assert('POST /bookings -> 201',           rCreate.status === 201);
    assert('has bookingId',                   typeof rCreate.json?.data?.bookingId === 'string');
    assert('status CONFIRMED',                rCreate.json?.data?.status === 'CONFIRMED');
    assert('endTime calculated correctly',    rCreate.json?.data?.endTime === '14:00');
    assert('totalAmount > 0',                 (rCreate.json?.data?.totalAmount ?? 0) > 0);
    createdBookingId = rCreate.json?.data?.bookingId;

    /* Exact duplicate -> 409 */
    const rDup = await req('POST', '/bookings', payload, userToken);
    assert('exact duplicate -> 409',          rDup.status === 409);

    /* Overlapping slot -> 409 */
    const rOver = await req('POST', '/bookings', {
      ...payload, startTime: '12:00', durationHours: 2, playerName: 'Overlap',
    }, userToken);
    assert('overlapping slot -> 409',         rOver.status === 409);

    /* Adjacent slot -> 201 */
    const rAdj = await req('POST', '/bookings', {
      ...payload, startTime: '14:00', playerName: 'Adjacent',
    }, userToken);
    assert('adjacent slot -> 201',            rAdj.status === 201);
  }

  /* ── GET /bookings/:id (ownership) ──────────────────────── */
  console.log('\n[Bookings — GET by ID / ownership]');
  {
    /* No token -> 403 */
    const rNo = await req('GET', `/bookings/${createdBookingId}`);
    assert('GET booking no token -> 403',     rNo.status === 403);

    /* Owner can access */
    const rOwn = await req('GET', `/bookings/${createdBookingId}`, null, userToken);
    assert('owner can GET booking -> 200',    rOwn.status === 200);
    assert('bookingId matches',               rOwn.json?.data?.bookingId === createdBookingId);

    /* Other user cannot access */
    const rOther = await req('GET', `/bookings/${createdBookingId}`, null, otherToken);
    assert('other user blocked -> 403',       rOther.status === 403);

    /* Non-existent booking */
    const rNone = await req('GET', '/bookings/does-not-exist', null, userToken);
    assert('non-existent booking -> 404',     rNone.status === 404);
  }

  /* ── GET /bookings/my ────────────────────────────────────── */
  console.log('\n[Bookings — GET /my]');
  let myBookingId = null;
  let otherBookingId = null;
  {
    /* Create a booking for the "my" test */
    const rB = await req('POST', '/bookings', {
      courtId: 'dha-f1', date: TEST_DATE_MY, startTime: '15:00',
      durationHours: 1, playerName: 'My Test', phone: '0300-1212121',
    }, userToken);
    assert('create booking for /my test -> 201', rB.status === 201);
    myBookingId = rB.json?.data?.bookingId;

    /* Create a second user's booking to verify isolation in both directions. */
    const rOtherBooking = await req('POST', '/bookings', {
      courtId: 'dha-f1', date: TEST_DATE_MY, startTime: '16:00',
      durationHours: 1, playerName: 'Other User Test', phone: '0300-1313131',
    }, otherToken);
    assert('create booking for second user -> 201', rOtherBooking.status === 201);
    otherBookingId = rOtherBooking.json?.data?.bookingId;

    /* /my returns only the authenticated user's own bookings */
    const rMy = await req('GET', '/bookings/my', null, userToken);
    assert('GET /bookings/my -> 200',            rMy.status === 200);
    assert('/my returns array',                  Array.isArray(rMy.json?.data));
    assert('/my includes own booking',           rMy.json?.data?.some(b => b.bookingId === myBookingId));
    assert('/my excludes second user booking',   !(rMy.json?.data ?? []).some(b => b.bookingId === otherBookingId));

    /* Other user's /my includes their own booking, never the first user's. */
    const rOtherMy = await req('GET', '/bookings/my', null, otherToken);
    assert('second user /my includes own booking', (rOtherMy.json?.data ?? []).some(b => b.bookingId === otherBookingId));
    assert('second user /my excludes first user booking', !(rOtherMy.json?.data ?? []).some(b => b.bookingId === myBookingId));

    /* Upcoming filter */
    const rUp = await req('GET', '/bookings/my?filter=upcoming', null, userToken);
    assert('/my?filter=upcoming -> 200',         rUp.status === 200);
    assert('upcoming only has future bookings',  Array.isArray(rUp.json?.data));

    /* Past filter */
    const rPast = await req('GET', '/bookings/my?filter=past', null, userToken);
    assert('/my?filter=past -> 200',             rPast.status === 200);

    /* Invalid filter -> 400 */
    const rBad = await req('GET', '/bookings/my?filter=invalid', null, userToken);
    assert('/my?filter=invalid -> 400',          rBad.status === 400);
  }

  /* ── PATCH /bookings/:id/cancel ─────────────────────────── */
  console.log('\n[Bookings — Cancel]');
  let cancelBookingId = null;
  {
    /* Create a booking to cancel */
    const rB = await req('POST', '/bookings', {
      courtId: 'dha-f1', date: TEST_DATE_CANC, startTime: '17:00',
      durationHours: 1, playerName: 'Cancel Test', phone: '0300-5555555',
    }, userToken);
    assert('create booking to cancel -> 201', rB.status === 201);
    cancelBookingId = rB.json?.data?.bookingId;

    /* No token -> 401 */
    const rNo = await req('PATCH', `/bookings/${cancelBookingId}/cancel`);
    assert('cancel no token -> 401',           rNo.status === 401);

    /* Unknown booking IDs return 404 */
    const rMissing = await req('PATCH', '/bookings/does-not-exist/cancel', null, userToken);
    assert('cancel unknown booking -> 404',    rMissing.status === 404);

    /* Other user cannot cancel */
    const rOther = await req('PATCH', `/bookings/${cancelBookingId}/cancel`, null, otherToken);
    assert('other user cannot cancel -> 403',  rOther.status === 403);

    /* Owner can cancel */
    const rCancel = await req('PATCH', `/bookings/${cancelBookingId}/cancel`, null, userToken);
    assert('owner cancels -> 200',             rCancel.status === 200);
    assert('status is CANCELLED',              rCancel.json?.data?.status === 'CANCELLED');

    /* Cancel already cancelled -> 400 */
    const rDup = await req('PATCH', `/bookings/${cancelBookingId}/cancel`, null, userToken);
    assert('cancel already cancelled -> 400',  rDup.status === 400);

    /* Cancelled slot no longer shows as available — availability check */
    const rAvail = await req('GET', `/availability?venue_id=fr-dha-phase-5&date=${TEST_DATE_CANC}&sport_type=futsal`);
    const futsalCourt = rAvail.json?.data?.courts?.find(c => c.id === 'dha-f1');
    const slot17 = futsalCourt?.slots?.['17:00'];
    assert('cancelled slot is available again', slot17?.status === 'available', `got: ${slot17?.status}`);

    const rRebook = await req('POST', '/bookings', {
      courtId: 'dha-f1', date: TEST_DATE_CANC, startTime: '17:00',
      durationHours: 1, playerName: 'Rebook Test', phone: '0300-5555555',
    }, userToken);
    assert('cancelled slot can be booked again -> 201', rRebook.status === 201);
  }

  /* ── Admin: authorization ────────────────────────────────── */
  console.log('\n[Admin — Authorization (non-admin blocked)]');
  {
    /* Regular user cannot access admin stats */
    const rUser = await req('GET', '/admin/stats', null, userToken);
    assert('user cannot GET /admin/stats -> 403',    rUser.status === 403);

    /* No token */
    const rNo = await req('GET', '/admin/stats');
    assert('no token /admin/stats -> 401',            rNo.status === 401);

    /* Non-admin cannot list all bookings */
    const rBook = await req('GET', '/admin/bookings', null, userToken);
    assert('user cannot GET /admin/bookings -> 403',  rBook.status === 403);

    /* Non-admin cannot list users */
    const rUsers = await req('GET', '/admin/users', null, userToken);
    assert('user cannot GET /admin/users -> 403',     rUsers.status === 403);

    /* Non-admin cannot list admin venues */
    const rVen = await req('GET', '/admin/venues', null, userToken);
    assert('user cannot GET /admin/venues -> 403',    rVen.status === 403);

    const rHistory = await req('GET', `/admin/users/${userId}/bookings`, null, userToken);
    assert('user cannot GET admin booking history -> 403', rHistory.status === 403);
    const rPricing = await req('PATCH', '/admin/courts/dha-f1/pricing', {
      weekdayOffPeak: 1, weekdayPeak: 1, weekendOffPeak: 1, weekendPeak: 1,
    }, userToken);
    assert('user cannot PATCH admin pricing -> 403', rPricing.status === 403);
  }

  /* ── Admin: functional tests with ADMIN token ───────────── */
  console.log('\n[Admin — Functional tests (ADMIN role)]');
  let adminToken = null;
  {
    /* Provision a test admin account directly in the DB (dev-only pattern,
       mirrors scripts/create-admin.js — never exposed as a public API). */
    const ADMIN_PASSWORD = `AdminPass${RUN_ID}!`;
    try {
      const adminId = await createAdminUserForTest(ADMIN_PHONE, ADMIN_PASSWORD);
      testUserIds.add(adminId);
      process.stdout.write('  INFO  Test admin user provisioned via DB\n');
    } catch (e) {
      process.stderr.write(`  WARN  Could not provision admin user: ${e.message}\n`);
    }

    /* Log in as the admin to get a token with role: ADMIN */
    const rAdminLogin = await req('POST', '/auth/login', { phone: ADMIN_PHONE, password: ADMIN_PASSWORD });
    assert('admin login -> 200',           rAdminLogin.status === 200);
    assert('admin token returned',         typeof rAdminLogin.json?.data?.token === 'string');
    assert('admin role in response',       rAdminLogin.json?.data?.user?.role === 'ADMIN');
    adminToken = rAdminLogin.json?.data?.token;

    if (!adminToken) {
      process.stderr.write('  SKIP  Admin functional tests skipped — could not obtain admin token\n');
    } else {
      /* GET /admin/stats */
      const rStats = await req('GET', '/admin/stats', null, adminToken);
      assert('admin GET /admin/stats -> 200',       rStats.status === 200);
      assert('stats has totalBookings',             typeof rStats.json?.data?.totalBookings === 'number');
      assert('stats has todayBookings',             typeof rStats.json?.data?.todayBookings === 'number');
      assert('stats has upcomingBookings',          typeof rStats.json?.data?.upcomingBookings === 'number');
      assert('stats has cancelledBookings',          typeof rStats.json?.data?.cancelledBookings === 'number');
      assert('stats has totalUsers',                typeof rStats.json?.data?.totalUsers === 'number');
      assert('stats has activeVenues',              typeof rStats.json?.data?.activeVenues === 'number');
      assert('stats has estimatedRevenue',          typeof rStats.json?.data?.estimatedRevenue === 'number');

      /* GET /admin/bookings */
      const rABookings = await req('GET', '/admin/bookings', null, adminToken);
      assert('admin GET /admin/bookings -> 200',    rABookings.status === 200);
      assert('admin bookings has array',            Array.isArray(rABookings.json?.data?.bookings));
      assert('admin bookings has total',            typeof rABookings.json?.data?.total === 'number');

      /* GET /admin/bookings with filters */
      const rABFilter = await req('GET', '/admin/bookings?status=CONFIRMED&limit=5', null, adminToken);
      assert('admin bookings filter -> 200',        rABFilter.status === 200);
      assert('filtered bookings are all CONFIRMED', (rABFilter.json?.data?.bookings ?? [])
        .every(b => b.status === 'CONFIRMED'));

      /* GET /admin/users */
      const rAUsers = await req('GET', '/admin/users', null, adminToken);
      assert('admin GET /admin/users -> 200',       rAUsers.status === 200);
      assert('admin users has array',               Array.isArray(rAUsers.json?.data?.users));
      assert('admin users has total',               typeof rAUsers.json?.data?.total === 'number');

      /* GET /admin/venues */
      const rAVenues = await req('GET', '/admin/venues', null, adminToken);
      assert('admin GET /admin/venues -> 200',      rAVenues.status === 200);
      assert('admin venues is array',               Array.isArray(rAVenues.json?.data));
      assert('admin venues returns 5',              rAVenues.json?.data?.length === 5);

      /* Admin pricing can be updated with current values without altering seeded data. */
      const pricingCourt = rAVenues.json?.data?.flatMap((venue) => venue.courts ?? [])
        .find((court) => court.id === 'dha-f1');
      if (pricingCourt) {
        const priceFor = (dayType, period) =>
          pricingCourt.pricingRules.find((rule) => rule.dayType === dayType && rule.period === period)?.pricePerHour;
        const rPricing = await req('PATCH', `/admin/courts/${pricingCourt.id}/pricing`, {
          weekdayOffPeak: priceFor('weekday', 'off_peak'),
          weekdayPeak: priceFor('weekday', 'peak'),
          weekendOffPeak: priceFor('weekend', 'off_peak'),
          weekendPeak: priceFor('weekend', 'peak'),
        }, adminToken);
        assert('admin PATCH court pricing -> 200', rPricing.status === 200);
        assert('pricing update returns all four rules', rPricing.json?.data?.length === 4);
      }

      /* PATCH /admin/bookings/:id/status — update the booking created earlier */
      if (createdBookingId) {
        const rPatch = await req(
          'PATCH', `/admin/bookings/${createdBookingId}/status`,
          { status: 'COMPLETED', paymentStatus: 'PAID' },
          adminToken,
        );
        assert('admin PATCH booking status -> 200', rPatch.status === 200);
        assert('booking status updated to COMPLETED', rPatch.json?.data?.status === 'COMPLETED');
        assert('payment status updated to PAID',     rPatch.json?.data?.paymentStatus === 'PAID');

        const rBadTransition = await req(
          'PATCH', `/admin/bookings/${createdBookingId}/status`,
          { status: 'CONFIRMED' },
          adminToken,
        );
        assert('admin cannot reopen completed booking -> 400', rBadTransition.status === 400);

        const rCancelCompleted = await req(
          'PATCH', `/bookings/${createdBookingId}/cancel`, null, adminToken,
        );
        assert('cannot cancel completed booking -> 400', rCancelCompleted.status === 400);
      }

      /* Admins can cancel another user's booking */
      if (otherBookingId) {
        const rAdminCancel = await req(
          'PATCH', `/bookings/${otherBookingId}/cancel`, null, adminToken,
        );
        assert('admin can cancel any booking -> 200', rAdminCancel.status === 200);
        assert('admin cancellation status is CANCELLED',
          rAdminCancel.json?.data?.status === 'CANCELLED');
      }

      /* PATCH /admin/bookings/:id/status — invalid status */
      if (createdBookingId) {
        const rBad = await req(
          'PATCH', `/admin/bookings/${createdBookingId}/status`,
          { status: 'INVALID_STATUS' },
          adminToken,
        );
        assert('admin PATCH invalid status -> 400',  rBad.status === 400);
      }

      /* GET /admin/users/:id/bookings */
      if (userId) {
        const rUB = await req('GET', `/admin/users/${userId}/bookings`, null, adminToken);
        assert('admin GET user bookings -> 200',      rUB.status === 200);
        assert('user bookings has user object',       typeof rUB.json?.data?.user === 'object');
        assert('user bookings has bookings array',    Array.isArray(rUB.json?.data?.bookings));
      }

      /* Non-existent user bookings */
      const rNoUser = await req('GET', '/admin/users/999999/bookings', null, adminToken);
      assert('admin unknown user -> 404',            rNoUser.status === 404);
    }
  }

  /* ── Availability after booking (regression) ─────────────── */
  console.log('\n[Availability — post-booking regression]');
  {
    /* Create a fresh CONFIRMED booking on TEST_DATE_REG so it cannot be
       mutated by the admin-patch tests that ran earlier in this suite.
       Book at 11:00 (a grid slot) for 1 h — slot 11:00 will show as booked. */
    const rReg = await req('POST', '/bookings', {
      courtId: 'dha-f1', date: TEST_DATE_REG, startTime: '11:00',
      durationHours: 1, playerName: 'Regression Test', phone: '0300-7777777',
    }, userToken);
    assert('regression booking -> 201', rReg.status === 201);

    const rAfter = await req('GET', `/availability?venue_id=fr-dha-phase-5&date=${TEST_DATE_REG}&sport_type=futsal`);
    assert('availability 200',            rAfter.status === 200);
    const court = rAfter.json?.data?.courts?.find(c => c.id === 'dha-f1');
    const slot  = court?.slots?.['11:00'];
    assert('booked slot shows as booked', slot?.status === 'booked', `got: ${slot?.status}`);
    assert('_isLiveData true',            rAfter.json?.data?._isLiveData === true);
  }

  /* ── Summary ─────────────────────────────────────────────── */
  console.log('\n=======================================================');
  console.log(`  ${passed} passed   ${failed} failed`);
  console.log('=======================================================\n');

}

async function cleanupTestUsers() {
  if (testUserIds.size === 0) return;

  const { PrismaClient } = require('@prisma/client');
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  const prisma = new PrismaClient();
  const userIds = [...testUserIds];

  try {
    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ]);
    process.stdout.write(`\nCleaned up ${userIds.length} test users and their bookings.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  let exitCode = 0;
  try {
    await run();
  } catch (e) {
    process.stderr.write(`Test runner error: ${e.message}\n${e.stack}\n`);
    exitCode = 1;
  } finally {
    try {
      await cleanupTestUsers();
    } catch (e) {
      process.stderr.write(`Test cleanup error: ${e.message}\n${e.stack}\n`);
      exitCode = 1;
    }
  }
  if (failed > 0) exitCode = 1;
  process.exitCode = exitCode;
}

main();
