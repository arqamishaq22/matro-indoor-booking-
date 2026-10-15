/**
 * Automated Verification Script for Admin Dashboard Fixes
 * Tests all required scenarios:
 *  1. An unpaid booking.
 *  2. A successfully paid booking (offline recording & duplicate prevention).
 *  3. A confirmed booking whose scheduled time has not ended (completion blocked).
 *  4. A booking whose scheduled time has ended (completion succeeds, payment independent).
 *  5. A cancelled booking (invalid transitions & payment blocked).
 *  6. An eligible No Show action (past start time, repeated click prevented).
 *  7. An attempt to mark a future booking as No Show (blocked with 400).
 *  8. Unauthorized requests to update payment or booking status (401/403).
 * 10. Existing customer booking functionality (create, /my, get, cancel, slot release).
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
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

async function api(method, path, body = null, token = null) {
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
  console.log('\n=============================================================');
  console.log('  Matro Indoor Booking — Admin Dashboard Verification Tests');
  console.log('=============================================================\n');

  const runId = Math.floor(Math.random() * 900000 + 100000);
  const adminPhone = `+92300${runId}`;
  const userPhone = `+92311${runId}`;
  const otherUserPhone = `+92322${runId}`;
  const password = 'TestPassword123!';

  const createdUserIds = [];
  const createdBookingIds = [];

  try {
    const passwordHash = await bcrypt.hash(password, 8);

    const adminUser = await prisma.user.create({
      data: {
        phone: adminPhone,
        name: 'Verification Admin',
        role: 'ADMIN',
        passwordHash,
        isActive: true,
      },
    });
    createdUserIds.push(adminUser.id);

    const normalUser = await prisma.user.create({
      data: {
        phone: userPhone,
        name: 'Normal Customer',
        role: 'USER',
        passwordHash,
        isActive: true,
      },
    });
    createdUserIds.push(normalUser.id);

    const otherUser = await prisma.user.create({
      data: {
        phone: otherUserPhone,
        name: 'Other Customer',
        role: 'USER',
        passwordHash,
        isActive: true,
      },
    });
    createdUserIds.push(otherUser.id);

    const adminToken = signToken(adminUser);
    const userToken = signToken(normalUser);
    const otherUserToken = signToken(otherUser);

    // Dates for testing
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const pastDate = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: An unpaid booking
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[Test 1: Unpaid Booking Creation and Listing]');
    let b1Id;
    {
      const r = await api('POST', '/bookings', {
        courtId: 'dha-c1',
        date: futureDate,
        startTime: '10:00',
        durationHours: 1,
        playerName: 'Unpaid Customer',
        phone: userPhone,
        notes: 'Test 1 Booking',
      }, userToken);

      assert('Booking created -> 201', r.status === 201);
      assert('Default status is CONFIRMED', r.json?.data?.status === 'CONFIRMED');
      assert('Default paymentStatus is UNPAID', r.json?.data?.paymentStatus === 'UNPAID');
      b1Id = r.json?.data?.bookingId;
      if (b1Id) createdBookingIds.push(b1Id);

      const rList = await api('GET', `/admin/bookings?search=${encodeURIComponent(userPhone)}`, null, adminToken);
      assert('Admin bookings listing -> 200', rList.status === 200);
      const found = rList.json?.data?.bookings?.find((b) => b.bookingId === b1Id);
      assert('Admin dashboard reads latest payment status (UNPAID)', found?.paymentStatus === 'UNPAID');
      assert('Admin dashboard reads correct booking status (CONFIRMED)', found?.status === 'CONFIRMED');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: A successfully paid booking (offline payment recording)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[Test 2: Offline Payment Recording & Duplicate Prevention]');
    {
      const rPay = await api('PATCH', `/admin/bookings/${b1Id}/payment`, {
        paymentStatus: 'PAID',
        paymentMethod: 'Cash (At Venue Counter)',
        notes: 'Cash received at reception desk, receipt #RC-401',
      }, adminToken);

      assert('Admin records offline payment -> 200', rPay.status === 200);
      assert('Booking paymentStatus is now PAID', rPay.json?.data?.paymentStatus === 'PAID');
      assert('Booking status remains CONFIRMED (independent)', rPay.json?.data?.status === 'CONFIRMED');
      assert('Audit trail in notes contains admin identifier', rPay.json?.data?.notes?.includes(adminUser.phone));
      assert('Audit trail in notes contains payment method', rPay.json?.data?.notes?.includes('Cash (At Venue Counter)'));

      // Duplicate payment update prevention
      const rDup = await api('PATCH', `/admin/bookings/${b1Id}/payment`, {
        paymentStatus: 'PAID',
        paymentMethod: 'Cash',
      }, adminToken);
      assert('Duplicate payment update rejected -> 400', rDup.status === 400);
      assert('Error mentions payment status is already PAID', rDup.json?.message?.includes('already'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Confirmed booking whose scheduled time has not ended
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[Test 3: Future Booking Cannot Be Marked Completed]');
    let bFutureId;
    {
      const r = await api('POST', '/bookings', {
        courtId: 'dha-c1',
        date: futureDate,
        startTime: '14:00',
        durationHours: 2,
        playerName: 'Future Player',
        phone: userPhone,
      }, userToken);

      assert('Future booking created -> 201', r.status === 201);
      bFutureId = r.json?.data?.bookingId;
      if (bFutureId) createdBookingIds.push(bFutureId);

      const rComplete = await api('PATCH', `/admin/bookings/${bFutureId}/status`, {
        status: 'COMPLETED',
      }, adminToken);

      assert('Attempt to mark future booking as COMPLETED rejected -> 400', rComplete.status === 400);
      assert('Rejection message mentions scheduled end time', rComplete.json?.message?.includes('scheduled end time'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Booking whose scheduled time has ended (Completion eligible)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[Test 4: Past Booking Eligible for Completion & Independence]');
    let bPastId;
    {
      // Create past booking directly in DB to simulate concluded slot
      const bPast = await prisma.booking.create({
        data: {
          courtId: 'dha-c1',
          date: pastDate,
          startTime: '18:00',
          endTime: '19:00',
          durationHours: 1,
          playerName: 'Past Player',
          phone: userPhone,
          pricePerHour: 3500,
          totalAmount: 3500,
          status: 'CONFIRMED',
          paymentStatus: 'UNPAID', // Remains unpaid
          userId: normalUser.id,
        },
      });
      bPastId = bPast.id;
      createdBookingIds.push(bPastId);

      const rComplete = await api('PATCH', `/admin/bookings/${bPastId}/status`, {
        status: 'COMPLETED',
        notes: 'Customer attended session',
      }, adminToken);

      assert('Past booking marked COMPLETED -> 200', rComplete.status === 200);
      assert('Booking status is COMPLETED', rComplete.json?.data?.status === 'COMPLETED');
      assert('Payment status remains UNPAID (independent)', rComplete.json?.data?.paymentStatus === 'UNPAID');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Cancelled booking (transitions and payment rules)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[Test 5: Cancelled Booking Invariants]');
    let bCancelId;
    {
      const r = await api('POST', '/bookings', {
        courtId: 'dha-c1',
        date: futureDate,
        startTime: '18:00',
        durationHours: 1,
        playerName: 'Cancel Player',
        phone: userPhone,
      }, userToken);
      bCancelId = r.json?.data?.bookingId;
      if (bCancelId) createdBookingIds.push(bCancelId);

      const rCancel = await api('PATCH', `/bookings/${bCancelId}/cancel`, null, userToken);
      assert('Customer cancels booking -> 200', rCancel.status === 200);
      assert('Status is CANCELLED', rCancel.json?.data?.status === 'CANCELLED');

      // Attempt to mark cancelled booking as COMPLETED -> 400
      const rComp = await api('PATCH', `/admin/bookings/${bCancelId}/status`, { status: 'COMPLETED' }, adminToken);
      assert('Cannot complete cancelled booking -> 400', rComp.status === 400);

      // Attempt to mark cancelled booking as NO_SHOW -> 400
      const rNoShow = await api('PATCH', `/admin/bookings/${bCancelId}/status`, { status: 'NO_SHOW' }, adminToken);
      assert('Cannot mark cancelled booking as NO_SHOW -> 400', rNoShow.status === 400);

      // Attempt to record payment for cancelled booking -> 400
      const rPayCancelled = await api('PATCH', `/admin/bookings/${bCancelId}/payment`, { paymentStatus: 'PAID' }, adminToken);
      assert('Cannot record payment for cancelled booking -> 400', rPayCancelled.status === 400);

      // Repeated cancel -> 400
      const rCancelAgain = await api('PATCH', `/bookings/${bCancelId}/cancel`, null, userToken);
      assert('Cannot cancel already cancelled booking -> 400', rCancelAgain.status === 400);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Eligible No Show Action
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[Test 6: Eligible No-Show Action]');
    let bNoShowEligibleId;
    {
      // Create past booking that was not cancelled
      const bPast = await prisma.booking.create({
        data: {
          courtId: 'dha-c1',
          date: pastDate,
          startTime: '10:00',
          endTime: '11:00',
          durationHours: 1,
          playerName: 'NoShow Customer',
          phone: userPhone,
          pricePerHour: 3500,
          totalAmount: 3500,
          status: 'CONFIRMED',
          paymentStatus: 'UNPAID',
          userId: normalUser.id,
        },
      });
      bNoShowEligibleId = bPast.id;
      createdBookingIds.push(bNoShowEligibleId);

      const rNoShow = await api('PATCH', `/admin/bookings/${bNoShowEligibleId}/status`, {
        status: 'NO_SHOW',
        notes: 'Customer never showed up at court',
      }, adminToken);

      assert('Eligible No Show marked -> 200', rNoShow.status === 200);
      assert('Status is NO_SHOW', rNoShow.json?.data?.status === 'NO_SHOW');
      assert('Payment status remains UNPAID', rNoShow.json?.data?.paymentStatus === 'UNPAID');
      assert('Audit log contains No-Show record', rNoShow.json?.data?.notes?.includes('No-Show recorded'));

      // Repeated click -> 400
      const rRepeat = await api('PATCH', `/admin/bookings/${bNoShowEligibleId}/status`, {
        status: 'NO_SHOW',
      }, adminToken);
      assert('Repeated No-Show click rejected -> 400', rRepeat.status === 400);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 7: Attempt to mark a future booking as No Show
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[Test 7: Future Booking No-Show Prevention]');
    {
      const rNoShowFuture = await api('PATCH', `/admin/bookings/${bFutureId}/status`, {
        status: 'NO_SHOW',
      }, adminToken);

      assert('Marking future booking as NO_SHOW rejected -> 400', rNoShowFuture.status === 400);
      assert('Error mentions scheduled start time', rNoShowFuture.json?.message?.includes('scheduled start time'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 8: Unauthorized request to update payment or booking status
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[Test 8: Authorization Enforcement]');
    {
      // Regular user attempts admin status update -> 403
      const rUserStatus = await api('PATCH', `/admin/bookings/${b1Id}/status`, { status: 'CONFIRMED' }, userToken);
      assert('Regular user PATCH /admin/bookings/:id/status -> 403', rUserStatus.status === 403);

      // Regular user attempts admin payment update -> 403
      const rUserPay = await api('PATCH', `/admin/bookings/${b1Id}/payment`, { paymentStatus: 'PAID' }, userToken);
      assert('Regular user PATCH /admin/bookings/:id/payment -> 403', rUserPay.status === 403);

      // Anonymous attempts -> 401
      const rAnonStatus = await api('PATCH', `/admin/bookings/${b1Id}/status`, { status: 'CONFIRMED' });
      assert('Anonymous PATCH /admin/bookings/:id/status -> 401', rAnonStatus.status === 401);

      const rAnonPay = await api('PATCH', `/admin/bookings/${b1Id}/payment`, { paymentStatus: 'PAID' });
      assert('Anonymous PATCH /admin/bookings/:id/payment -> 401', rAnonPay.status === 401);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 10: Existing Customer Booking Functionality
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[Test 10: Existing Customer Booking Functionality Regression]');
    {
      // Create new customer booking
      const rCreate = await api('POST', '/bookings', {
        courtId: 'dha-c2',
        date: futureDate,
        startTime: '16:00',
        durationHours: 1,
        playerName: 'Regression Player',
        phone: userPhone,
      }, userToken);
      assert('Customer creates booking -> 201', rCreate.status === 201);
      const regBookingId = rCreate.json?.data?.bookingId;
      if (regBookingId) createdBookingIds.push(regBookingId);

      // Customer views their own bookings via /bookings/my
      const rMy = await api('GET', '/bookings/my', null, userToken);
      assert('Customer GET /bookings/my -> 200', rMy.status === 200);
      assert('Own booking is present in /bookings/my', rMy.json?.data?.some((b) => b.bookingId === regBookingId));

      // Customer views booking by ID
      const rGet = await api('GET', `/bookings/${regBookingId}`, null, userToken);
      assert('Customer GET /bookings/:id -> 200', rGet.status === 200);
      assert('Retrieved bookingId matches', rGet.json?.data?.bookingId === regBookingId);

      // Other user blocked from viewing customer booking -> 403
      const rOtherGet = await api('GET', `/bookings/${regBookingId}`, null, otherUserToken);
      assert('Other customer GET /bookings/:id -> 403', rOtherGet.status === 403);

      // Customer cancels booking
      const rCancel = await api('PATCH', `/bookings/${regBookingId}/cancel`, null, userToken);
      assert('Customer cancels booking -> 200', rCancel.status === 200);

      // Rebooking the released slot succeeds
      const rRebook = await api('POST', '/bookings', {
        courtId: 'dha-c2',
        date: futureDate,
        startTime: '16:00',
        durationHours: 1,
        playerName: 'Other Rebooker',
        phone: otherUserPhone,
      }, otherUserToken);
      assert('Cancelled slot can be re-booked -> 201', rRebook.status === 201);
      if (rRebook.json?.data?.bookingId) createdBookingIds.push(rRebook.json.data.bookingId);
    }

  } finally {
    // Cleanup created test records
    console.log('\n[Cleaning up test data…]');
    if (createdBookingIds.length) {
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  }

  console.log('\n=============================================================');
  console.log(`  Tests completed: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
