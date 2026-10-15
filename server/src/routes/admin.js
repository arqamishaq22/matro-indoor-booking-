/**
 * Admin routes — /api/v1/admin
 * ─────────────────────────────────────────────────────────────────────────
 * All routes require authentication (requireAuth) AND admin role (requireAdmin).
 * Never accessible to regular users.
 *
 * GET  /admin/stats                    — overview stats
 * GET  /admin/bookings                 — all bookings (paginated, filterable)
 * PATCH /admin/bookings/:id/status     — change booking status
 * GET  /admin/users                    — all users
 * PATCH /admin/users/:id/status        — activate/deactivate user
 * GET  /admin/users/:id/bookings       — booking history for a user
 * GET  /admin/venues                   — all venues (incl. inactive)
 * POST /admin/venues                   — create venue
 * PATCH /admin/venues/:id              — update venue
 * PATCH /admin/venues/:id/status       — activate/deactivate venue
 * POST /admin/venues/:venueId/courts   — create court
 * PATCH /admin/courts/:id              — update court
 * PATCH /admin/courts/:id/status       — activate/deactivate court
 * PATCH /admin/courts/:id/pricing      — update pricing rules for a court (bulk, legacy)
 * GET  /admin/pricing                  — list all pricing rules (filterable)
 * POST /admin/pricing                  — create a single pricing rule
 * GET  /admin/pricing/:id              — get a single pricing rule
 * PATCH /admin/pricing/:id             — update pricePerHour / isActive
 * PATCH /admin/pricing/:id/status      — activate/deactivate a pricing rule
 * DELETE /admin/pricing/:id            — delete a pricing rule
 * ─────────────────────────────────────────────────────────────────────────
 */
'use strict';

const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  ok, created, badRequest, notFound, serverError, forbidden, conflict,
} = require('../lib/respond');

const router = Router();

/* All admin routes require auth + admin role */
router.use(requireAuth, requireAdmin);

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/stats
 ───────────────────────────────────────────────────────────────────────── */
router.get('/stats', async (_req, res) => {
  try {
    // Booking dates are stored in Pakistan local time (PKT, UTC+5).
    const today = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [
      totalBookings,
      todayBookings,
      upcomingBookings,
      cancelledBookings,
      totalUsers,
      activeVenues,
      revenueAgg,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { date: today } }),
      prisma.booking.count({
        where: {
          date:   { gte: today },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.user.count(),
      prisma.venue.count({ where: { isActive: true } }),
      prisma.booking.aggregate({
        where:   { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        _sum:    { totalAmount: true },
      }),
    ]);

    return ok(res, {
      totalBookings,
      todayBookings,
      upcomingBookings,
      cancelledBookings,
      totalUsers,
      activeVenues,
      estimatedRevenue: revenueAgg._sum.totalAmount ?? 0,
    });
  } catch (err) {
    console.error('GET /admin/stats error:', err);
    return serverError(res, 'Failed to load stats');
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/bookings
   Paginated list of all bookings with optional filters.
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/bookings',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString(),
    query('venueId').optional().isString(),
    query('sport').optional().isString(),
    query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query('search').optional().isString().isLength({ max: 120 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid query', errors.array());

    const page  = req.query.page  ?? 1;
    const limit = req.query.limit ?? 20;
    const skip  = (page - 1) * limit;
    const { status, venueId, sport, date, search } = req.query;

    const where = {};
    if (status)  where.status   = status;
    if (date)    where.date     = date;
    if (search)  where.OR = [
      { id:         { contains: search } },
      { playerName: { contains: search } },
      { phone:      { contains: search } },
    ];

    /* venueId / sport filter requires court join */
    if (venueId || sport) {
      where.court = {};
      if (venueId) where.court.venueId = venueId;
      if (sport)   where.court.sport   = sport;
    }

    try {
      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            court: {
              include: { venue: { select: { id: true, name: true, city: true } } },
            },
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
          orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
          skip,
          take: limit,
        }),
        prisma.booking.count({ where }),
      ]);

      const formatted = bookings.map((b) => ({
        bookingId:     b.id,
        courtId:       b.courtId,
        courtName:     b.court?.name ?? '(court deleted)',
        sport:         b.court?.sport ?? null,
        venueId:       b.court?.venueId ?? null,
        venueName:     b.court?.venue?.name ?? '(venue deleted)',
        venueCity:     b.court?.venue?.city ?? null,
        userId:        b.userId,
        userName:      b.user?.name ?? null,
        userPhone:     b.user?.phone ?? b.phone,
        userEmail:     b.user?.email ?? null,
        date:          b.date,
        startTime:     b.startTime,
        endTime:       b.endTime,
        durationHours: b.durationHours,
        playerName:    b.playerName,
        phone:         b.phone,
        notes:         b.notes,
        pricePerHour:  b.pricePerHour,
        totalAmount:   b.totalAmount,
        status:        b.status,
        paymentStatus: b.paymentStatus,
        createdAt:     b.createdAt,
        updatedAt:     b.updatedAt,
      }));

      return ok(res, { bookings: formatted, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err) {
      console.error('GET /admin/bookings error:', err);
      return serverError(res, 'Failed to load bookings');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/bookings/:id/status
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/bookings/:id/status',
  [
    param('id').trim().notEmpty(),
    body('status').isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'])
      .withMessage('Invalid status'),
    body('paymentStatus').optional()
      .isIn(['UNPAID', 'PAID', 'REFUNDED', 'WAIVED']).withMessage('Invalid paymentStatus'),
    body('notes').optional().isString().trim().isLength({ max: 500 }).withMessage('Notes too long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id }                    = req.params;
    const { status, paymentStatus, notes } = req.body;

    try {
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return notFound(res, `Booking '${id}' not found`);

      if (status === booking.status) {
        return badRequest(res, `Booking is already ${booking.status}`);
      }

      const allowedTransitions = {
        PENDING:   ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['CANCELLED', 'NO_SHOW', 'COMPLETED'],
      };
      if (!(allowedTransitions[booking.status] ?? []).includes(status)) {
        return badRequest(res, `Cannot change booking status from ${booking.status} to ${status}`);
      }

      // Timing checks based on Pakistan local time (PKT, UTC+5)
      const startPKT = new Date(`${booking.date}T${booking.startTime}:00+05:00`).getTime();
      const endPKT = startPKT + (booking.durationHours || 1) * 60 * 60 * 1000;
      const now = Date.now();

      if (status === 'NO_SHOW' && now < startPKT) {
        return badRequest(res, `Cannot mark booking as No Show before scheduled start time (${booking.startTime} PKT)`);
      }
      if (status === 'COMPLETED' && now < endPKT) {
        return badRequest(res, `Cannot mark booking as completed before scheduled end time (${booking.endTime} PKT)`);
      }

      const adminIdentifier = req.user?.email || req.user?.phone || `Admin #${req.user?.id ?? 'auth'}`;
      const nowPKTStr = new Date(Date.now() + 5 * 3600000).toISOString().replace('T', ' ').slice(0, 19) + ' PKT';

      // Booking status and Payment status are independent.
      // Confirming a booking NEVER automatically marks it as PAID.
      let targetPaymentStatus = booking.paymentStatus;
      let auditLog = '';

      if (paymentStatus) {
        if (paymentStatus === booking.paymentStatus) {
          return badRequest(res, `Payment status is already ${paymentStatus}`);
        }
        if (paymentStatus === 'PAID') {
          if (status === 'CANCELLED' || booking.status === 'CANCELLED') {
            return badRequest(res, 'Cannot mark a cancelled booking as paid');
          }
          targetPaymentStatus = 'PAID';
          auditLog = `[Payment Update by ${adminIdentifier} on ${nowPKTStr}]: Status set to PAID.`;
        } else if (paymentStatus === 'REFUNDED') {
          if (booking.paymentStatus !== 'PAID') {
            return badRequest(res, 'Only paid bookings can be refunded');
          }
          targetPaymentStatus = 'REFUNDED';
          auditLog = `[Payment Update by ${adminIdentifier} on ${nowPKTStr}]: Status set to REFUNDED.`;
        } else {
          targetPaymentStatus = paymentStatus;
          auditLog = `[Payment Update by ${adminIdentifier} on ${nowPKTStr}]: Status set to ${paymentStatus}.`;
        }
      }

      let statusAudit = '';
      if (status === 'NO_SHOW') {
        statusAudit = `[No-Show recorded by ${adminIdentifier} on ${nowPKTStr}]`;
      } else if (status === 'CANCELLED') {
        statusAudit = `[Cancelled by ${adminIdentifier} on ${nowPKTStr}]`;
      } else if (status === 'COMPLETED') {
        statusAudit = `[Completed marked by ${adminIdentifier} on ${nowPKTStr}]`;
      } else if (status === 'CONFIRMED') {
        statusAudit = `[Approved by ${adminIdentifier} on ${nowPKTStr}]`;
      }

      let finalNotes = booking.notes || '';
      const extraNotes = notes !== undefined && notes !== null ? String(notes).trim() : '';
      const auditEntries = [statusAudit, extraNotes, auditLog].filter(Boolean).join(' - ');
      if (auditEntries) {
        finalNotes = finalNotes ? `${finalNotes}\n${auditEntries}` : auditEntries;
      }

      const data = {
        status,
        paymentStatus: targetPaymentStatus,
        notes: finalNotes,
        updatedAt: new Date(),
      };

      let updated;
      try {
        updated = await prisma.booking.update({
          where: { id, status: booking.status },
          data,
        });
      } catch (err) {
        if (err.code === 'P2025') {
          return badRequest(res, 'Booking status changed; refresh and try again');
        }
        throw err;
      }

      return ok(res, {
        bookingId:     updated.id,
        status:        updated.status,
        paymentStatus: updated.paymentStatus,
        notes:         updated.notes,
      });
    } catch (err) {
      console.error(`PATCH /admin/bookings/${id}/status error:`, err);
      return serverError(res, 'Failed to update booking status');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/bookings/:id/payment
   Dedicated offline/verified payment update endpoint with admin audit trail.
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/bookings/:id/payment',
  [
    param('id').trim().notEmpty(),
    body('paymentStatus').isIn(['UNPAID', 'PAID', 'REFUNDED', 'WAIVED'])
      .withMessage('Invalid paymentStatus'),
    body('paymentMethod').optional().isString().trim().isLength({ max: 50 })
      .withMessage('paymentMethod too long'),
    body('notes').optional().isString().trim().isLength({ max: 500 })
      .withMessage('Notes too long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id } = req.params;
    const { paymentStatus, paymentMethod, notes } = req.body;

    try {
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return notFound(res, `Booking '${id}' not found`);

      if (paymentStatus === booking.paymentStatus) {
        return badRequest(res, `Payment status is already ${paymentStatus}`);
      }

      if (paymentStatus === 'PAID') {
        if (booking.status === 'CANCELLED') {
          return badRequest(res, 'Cannot record payment for a cancelled booking');
        }
      } else if (paymentStatus === 'REFUNDED') {
        if (booking.paymentStatus !== 'PAID') {
          return badRequest(res, 'Only paid bookings can be refunded');
        }
      }

      const adminIdentifier = req.user?.email || req.user?.phone || `Admin #${req.user?.id ?? 'auth'}`;
      const nowPKTStr = new Date(Date.now() + 5 * 3600000).toISOString().replace('T', ' ').slice(0, 19) + ' PKT';
      const methodStr = paymentMethod ? ` via ${paymentMethod}` : '';
      const noteStr = notes ? ` - ${notes.trim()}` : '';
      const auditEntry = `[Offline Payment Recorded by ${adminIdentifier} on ${nowPKTStr}]: Status changed from ${booking.paymentStatus} to ${paymentStatus}${methodStr}${noteStr}`;
      const finalNotes = booking.notes ? `${booking.notes}\n${auditEntry}` : auditEntry;

      let updated;
      try {
        updated = await prisma.booking.update({
          where: { id, paymentStatus: booking.paymentStatus },
          data: {
            paymentStatus,
            notes: finalNotes,
            updatedAt: new Date(),
          },
        });
      } catch (err) {
        if (err.code === 'P2025') {
          return badRequest(res, 'Payment status was modified concurrently; please refresh and try again');
        }
        throw err;
      }

      return ok(res, {
        bookingId:     updated.id,
        status:        updated.status,
        paymentStatus: updated.paymentStatus,
        notes:         updated.notes,
        totalAmount:   updated.totalAmount,
      }, 'Payment status updated successfully');
    } catch (err) {
      console.error(`PATCH /admin/bookings/${id}/payment error:`, err);
      return serverError(res, 'Failed to update payment status');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/users
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().isLength({ max: 120 }),
    query('role').optional().isIn(['USER', 'ADMIN']),
    query('status').optional().isIn(['active', 'inactive']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid query', errors.array());

    const page  = req.query.page  ?? 1;
    const limit = req.query.limit ?? 20;
    const skip  = (page - 1) * limit;
    const { search, role, status } = req.query;

    const where = {};
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name:  { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    try {
      const [users, total, totalAll, totalAdmins, totalActive] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true, phone: true, email: true, name: true, role: true,
            isActive: true, createdAt: true,
            _count: { select: { bookings: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
        prisma.user.count(),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { isActive: true } }),
      ]);

      return ok(res, {
        users, total, page, limit, pages: Math.ceil(total / limit),
        stats: { totalAll, totalAdmins, totalActive },
      });
    } catch (err) {
      console.error('GET /admin/users error:', err);
      return serverError(res, 'Failed to load users');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/users/:id/status
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/users/:id/status',
  [
    param('id').isInt().withMessage('User ID must be an integer').toInt(),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id }       = req.params;
    const { isActive } = req.body;

    /* Prevent admin from deactivating themselves */
    if (Number(id) === req.user.id && !isActive) {
      return forbidden(res, 'Cannot deactivate your own account');
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: Number(id) } });
      if (!user) return notFound(res, `User '${id}' not found`);

      const updated = await prisma.user.update({
        where:  { id: Number(id) },
        data:   { isActive },
        select: { id: true, phone: true, name: true, role: true, isActive: true },
      });
      return ok(res, updated);
    } catch (err) {
      console.error(`PATCH /admin/users/${id}/status error:`, err);
      return serverError(res, 'Failed to update user status');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/users/:id/bookings
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/users/:id/bookings',
  [param('id').isInt().toInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid user ID', errors.array());

    const userId = Number(req.params.id);

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true },
      });
      if (!user) return notFound(res, `User '${userId}' not found`);

      const bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
          court: { include: { venue: { select: { id: true, name: true } } } },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      });

      const formatted = bookings.map((b) => ({
        bookingId:     b.id,
        courtName:     b.court?.name ?? '(court deleted)',
        sport:         b.court?.sport ?? null,
        venueName:     b.court?.venue?.name ?? '(venue deleted)',
        date:          b.date,
        startTime:     b.startTime,
        endTime:       b.endTime,
        durationHours: b.durationHours,
        totalAmount:   b.totalAmount,
        status:        b.status,
        paymentStatus: b.paymentStatus,
        createdAt:     b.createdAt,
      }));

      return ok(res, { user, bookings: formatted });
    } catch (err) {
      console.error(`GET /admin/users/${req.params.id}/bookings error:`, err);
      return serverError(res, 'Failed to load user bookings');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/venues  — all venues including inactive
 ───────────────────────────────────────────────────────────────────────── */
router.get('/venues', async (_req, res) => {
  // NOTE: this catch-all must stay BEFORE /venues/:id to avoid shadowing
  try {
    const venues = await prisma.venue.findMany({
      include: {
        courts: {
          include:  { pricingRules: true },
          orderBy:  { sortOrder: 'asc' },
        },
        _count: { select: { courts: true } },
      },
      orderBy: { name: 'asc' },
    });
    return ok(res, venues);
  } catch (err) {
    console.error('GET /admin/venues error:', err);
    return serverError(res, 'Failed to load venues');
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/venues/:id  — single venue with courts and pricing rules
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/venues/:id',
  [param('id').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid venue ID', errors.array());

    const { id } = req.params;
    try {
      const venue = await prisma.venue.findUnique({
        where: { id },
        include: {
          courts: {
            include:  { pricingRules: true },
            orderBy:  { sortOrder: 'asc' },
          },
          _count: { select: { courts: true } },
        },
      });
      if (!venue) return notFound(res, `Venue '${id}' not found`);
      return ok(res, venue);
    } catch (err) {
      console.error(`GET /admin/venues/${id} error:`, err);
      return serverError(res, 'Failed to load venue');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   DELETE /admin/venues/:id  — safe deletion (blocks if active bookings exist)
 ───────────────────────────────────────────────────────────────────────── */
router.delete(
  '/venues/:id',
  [param('id').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid venue ID', errors.array());

    const { id } = req.params;
    try {
      const venue = await prisma.venue.findUnique({ where: { id } });
      if (!venue) return notFound(res, `Venue '${id}' not found`);

      const activeBookingCount = await prisma.booking.count({
        where: {
          court:  { venueId: id },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });

      if (activeBookingCount > 0) {
        return badRequest(
          res,
          `Cannot delete venue: ${activeBookingCount} active booking(s) exist. ` +
          'Deactivate the venue instead to stop new bookings.',
        );
      }

      // Cascade: Court.onDelete = Cascade from Venue deletes courts (and their pricing rules).
      // Booking.onDelete = SetNull from Court sets courtId = null on historical bookings,
      // preserving their records without orphaned references.
      await prisma.venue.delete({ where: { id } });
      return ok(res, { id }, 'Venue deleted');
    } catch (err) {
      console.error(`DELETE /admin/venues/${id} error:`, err);
      return serverError(res, 'Failed to delete venue');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/venues
 ───────────────────────────────────────────────────────────────────────── */
router.post(
  '/venues',
  [
    body('id').trim().notEmpty().matches(/^[a-z0-9-]+$/).withMessage('id must be lowercase slug'),
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('shortName').trim().notEmpty().isLength({ max: 60 }),
    body('city').trim().notEmpty().isLength({ max: 60 }),
    body('address').trim().notEmpty().isLength({ max: 255 }),
    body('location').trim().notEmpty().isLength({ max: 120 }),
    body('operatingHours').trim().notEmpty().isLength({ max: 80 }),
    body('startingPrice').isInt({ min: 0 }),
    body('imageUrl').optional().isURL({ protocols: ['http', 'https'] }).withMessage('imageUrl must be a valid http(s) URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id, name, shortName, city, address, location, operatingHours, startingPrice, badge, imageUrl } = req.body;

    try {
      const existing = await prisma.venue.findUnique({ where: { id } });
      if (existing) return badRequest(res, `Venue with id '${id}' already exists`);

      const venue = await prisma.venue.create({
        data: { id, name, shortName, city, address, location, operatingHours, startingPrice, badge: badge ?? null, imageUrl: imageUrl ?? null },
      });
      return created(res, venue, 'Venue created');
    } catch (err) {
      console.error('POST /admin/venues error:', err);
      return serverError(res, 'Failed to create venue');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/venues/:id
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/venues/:id',
  [
    param('id').trim().notEmpty(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('shortName').optional().trim().isLength({ min: 1, max: 60 }),
    body('location').optional().trim().isLength({ min: 1, max: 120 }),
    body('address').optional().trim().isLength({ max: 255 }),
    body('operatingHours').optional().trim().isLength({ max: 80 }),
    body('startingPrice').optional().isInt({ min: 0 }),
    body('badge').optional().isString(),
    body('imageUrl').optional().isURL({ protocols: ['http', 'https'] }).withMessage('imageUrl must be a valid http(s) URL'),
    body('rating').optional().isFloat({ min: 0, max: 5 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id } = req.params;
    const allowed = ['name', 'shortName', 'address', 'location', 'operatingHours',
                     'startingPrice', 'badge', 'imageUrl', 'rating', 'reviewsCount'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    try {
      const venue = await prisma.venue.findUnique({ where: { id } });
      if (!venue) return notFound(res, `Venue '${id}' not found`);

      const updated = await prisma.venue.update({ where: { id }, data });
      return ok(res, updated, 'Venue updated');
    } catch (err) {
      console.error(`PATCH /admin/venues/${id} error:`, err);
      return serverError(res, 'Failed to update venue');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/venues/:id/status
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/venues/:id/status',
  [param('id').trim().notEmpty(), body('isActive').isBoolean()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id }       = req.params;
    const { isActive } = req.body;

    try {
      const venue = await prisma.venue.findUnique({ where: { id } });
      if (!venue) return notFound(res, `Venue '${id}' not found`);

      const updated = await prisma.venue.update({ where: { id }, data: { isActive } });
      return ok(res, { id: updated.id, name: updated.name, isActive: updated.isActive });
    } catch (err) {
      console.error(`PATCH /admin/venues/${id}/status error:`, err);
      return serverError(res, 'Failed to update venue status');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/venues/:venueId/courts
 ───────────────────────────────────────────────────────────────────────── */
router.post(
  '/venues/:venueId/courts',
  [
    param('venueId').trim().notEmpty(),
    body('id').trim().notEmpty().matches(/^[a-z0-9-]+$/).withMessage('id must be lowercase slug'),
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('sport').trim().notEmpty().isIn(['cricket','futsal','padel','pickleball','badminton','gaming']),
    body('surfaceType').optional().isString().isLength({ max: 80 }),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { venueId }                             = req.params;
    const { id, name, sport, surfaceType, sortOrder } = req.body;

    try {
      const venue = await prisma.venue.findUnique({ where: { id: venueId } });
      if (!venue) return notFound(res, `Venue '${venueId}' not found`);

      const existing = await prisma.court.findUnique({ where: { id } });
      if (existing) return badRequest(res, `Court with id '${id}' already exists`);

      const court = await prisma.court.create({
        data: { id, venueId, name, sport, surfaceType: surfaceType ?? null, sortOrder: sortOrder ?? 0 },
      });
      return created(res, court, 'Court created');
    } catch (err) {
      console.error(`POST /admin/venues/${venueId}/courts error:`, err);
      return serverError(res, 'Failed to create court');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/courts/:id
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/courts/:id',
  [
    param('id').trim().notEmpty(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('surfaceType').optional().isString().isLength({ max: 80 }),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id }   = req.params;
    const allowed  = ['name', 'surfaceType', 'sortOrder'];
    const data     = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    try {
      const court = await prisma.court.findUnique({ where: { id } });
      if (!court) return notFound(res, `Court '${id}' not found`);

      const updated = await prisma.court.update({ where: { id }, data });
      return ok(res, updated, 'Court updated');
    } catch (err) {
      console.error(`PATCH /admin/courts/${id} error:`, err);
      return serverError(res, 'Failed to update court');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/courts/:id/status
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/courts/:id/status',
  [param('id').trim().notEmpty(), body('isActive').isBoolean()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id }       = req.params;
    const { isActive } = req.body;

    try {
      const court = await prisma.court.findUnique({ where: { id } });
      if (!court) return notFound(res, `Court '${id}' not found`);

      const updated = await prisma.court.update({ where: { id }, data: { isActive } });
      return ok(res, { id: updated.id, name: updated.name, isActive: updated.isActive });
    } catch (err) {
      console.error(`PATCH /admin/courts/${id}/status error:`, err);
      return serverError(res, 'Failed to update court status');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/courts/:id/pricing
   Update all 4 pricing rules for a court.
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/courts/:id/pricing',
  [
    param('id').trim().notEmpty(),
    body('weekdayOffPeak').isInt({ min: 0 }),
    body('weekdayPeak').isInt({ min: 0 }),
    body('weekendOffPeak').isInt({ min: 0 }),
    body('weekendPeak').isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { id }                                                   = req.params;
    const { weekdayOffPeak, weekdayPeak, weekendOffPeak, weekendPeak } = req.body;

    const rules = [
      { dayType: 'weekday', period: 'off_peak', pricePerHour: weekdayOffPeak },
      { dayType: 'weekday', period: 'peak',     pricePerHour: weekdayPeak    },
      { dayType: 'weekend', period: 'off_peak', pricePerHour: weekendOffPeak },
      { dayType: 'weekend', period: 'peak',     pricePerHour: weekendPeak    },
    ];

    try {
      const court = await prisma.court.findUnique({ where: { id } });
      if (!court) return notFound(res, `Court '${id}' not found`);

      const updates = await Promise.all(
        rules.map((r) =>
          prisma.pricingRule.upsert({
            where:  { courtId_dayType_period: { courtId: id, dayType: r.dayType, period: r.period } },
            update: { pricePerHour: r.pricePerHour },
            create: { courtId: id, dayType: r.dayType, period: r.period, pricePerHour: r.pricePerHour },
          }),
        ),
      );

      return ok(res, updates, 'Pricing updated');
    } catch (err) {
      console.error(`PATCH /admin/courts/${id}/pricing error:`, err);
      return serverError(res, 'Failed to update pricing');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/pricing
   List all pricing rules joined with court + venue.
   Filters: venueId, dayType, period, isActive, search (venue/court name).
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/pricing',
  [
    query('venueId').optional().isString().isLength({ max: 120 }),
    query('dayType').optional().isIn(['weekday', 'weekend']),
    query('period').optional().isIn(['off_peak', 'peak']),
    query('isActive').optional().isBoolean().toBoolean(),
    query('search').optional().isString().isLength({ max: 120 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid query', errors.array());

    const { venueId, dayType, period, isActive, search } = req.query;

    const where = {};
    if (dayType)  where.dayType  = dayType;
    if (period)   where.period   = period;
    if (isActive !== undefined) where.isActive = isActive;

    const courtWhere = {};
    if (venueId) courtWhere.venueId = venueId;
    if (search) {
      const q = { contains: search };
      courtWhere.OR = [
        { name: q },
        { venue: { name: q } },
      ];
    }
    if (Object.keys(courtWhere).length) where.court = courtWhere;

    try {
      const rules = await prisma.pricingRule.findMany({
        where,
        include: {
          court: {
            select: {
              id: true, name: true, sport: true, surfaceType: true, isActive: true, venueId: true,
              venue: { select: { id: true, name: true, city: true } },
            },
          },
        },
        orderBy: [{ court: { venue: { name: 'asc' } } }, { court: { sortOrder: 'asc' } }, { dayType: 'asc' }, { period: 'asc' }],
      });

      const formatted = rules.map((r) => ({
        id:           r.id,
        courtId:      r.courtId,
        courtName:    r.court?.name ?? '(court deleted)',
        sport:        r.court?.sport ?? null,
        surfaceType:  r.court?.surfaceType ?? null,
        courtActive:  r.court?.isActive ?? false,
        venueId:      r.court?.venueId ?? r.court?.venue?.id ?? null,
        venueName:    r.court?.venue?.name ?? '(venue deleted)',
        venueCity:    r.court?.venue?.city ?? null,
        dayType:      r.dayType,
        period:       r.period,
        pricePerHour: r.pricePerHour,
        isActive:     r.isActive,
      }));

      return ok(res, formatted);
    } catch (err) {
      console.error('GET /admin/pricing error:', err);
      return serverError(res, 'Failed to load pricing rules');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/pricing
   Create a single pricing rule.
 ───────────────────────────────────────────────────────────────────────── */
router.post(
  '/pricing',
  [
    body('courtId').trim().notEmpty().withMessage('courtId is required'),
    body('dayType').isIn(['weekday', 'weekend']).withMessage('dayType must be weekday or weekend'),
    body('period').isIn(['off_peak', 'peak']).withMessage('period must be off_peak or peak'),
    body('pricePerHour')
      .isInt({ min: 0 }).withMessage('pricePerHour must be a non-negative integer')
      .toInt(),
    body('isActive').optional().isBoolean().toBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const { courtId, dayType, period, pricePerHour, isActive = true } = req.body;

    try {
      const court = await prisma.court.findUnique({
        where: { id: courtId },
        select: { id: true, name: true },
      });
      if (!court) return notFound(res, `Court '${courtId}' not found`);

      const rule = await prisma.pricingRule.create({
        data: { courtId, dayType, period, pricePerHour, isActive },
      });

      return created(res, rule, 'Pricing rule created');
    } catch (err) {
      /* Prisma unique constraint violation on (courtId, dayType, period) */
      if (err.code === 'P2002') {
        return conflict(res, 'A pricing rule for this court, day type, and period already exists');
      }
      console.error('POST /admin/pricing error:', err);
      return serverError(res, 'Failed to create pricing rule');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/pricing/:id
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/pricing/:id',
  [param('id').isInt().withMessage('Pricing rule ID must be an integer').toInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid pricing rule ID', errors.array());

    const id = Number(req.params.id);

    try {
      const rule = await prisma.pricingRule.findUnique({
        where: { id },
        include: {
          court: {
            select: {
              id: true, name: true, sport: true, venueId: true,
              venue: { select: { id: true, name: true, city: true } },
            },
          },
        },
      });
      if (!rule) return notFound(res, `Pricing rule '${id}' not found`);

      return ok(res, {
        id:           rule.id,
        courtId:      rule.courtId,
        courtName:    rule.court?.name ?? '(court deleted)',
        sport:        rule.court?.sport ?? null,
        venueId:      rule.court?.venueId ?? rule.court?.venue?.id ?? null,
        venueName:    rule.court?.venue?.name ?? '(venue deleted)',
        venueCity:    rule.court?.venue?.city ?? null,
        dayType:      rule.dayType,
        period:       rule.period,
        pricePerHour: rule.pricePerHour,
        isActive:     rule.isActive,
      });
    } catch (err) {
      console.error(`GET /admin/pricing/${id} error:`, err);
      return serverError(res, 'Failed to load pricing rule');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/pricing/:id
   Update pricePerHour and/or isActive only.
   courtId, dayType, period are immutable (delete + create to change them).
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/pricing/:id',
  [
    param('id').isInt().withMessage('Pricing rule ID must be an integer').toInt(),
    body('pricePerHour').optional()
      .isInt({ min: 0 }).withMessage('pricePerHour must be a non-negative integer')
      .toInt(),
    body('isActive').optional().isBoolean().toBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const id = Number(req.params.id);
    const allowed = ['pricePerHour', 'isActive'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (Object.keys(data).length === 0) {
      return badRequest(res, 'No valid fields to update. Only pricePerHour and isActive are allowed.');
    }

    try {
      const rule = await prisma.pricingRule.findUnique({ where: { id } });
      if (!rule) return notFound(res, `Pricing rule '${id}' not found`);

      const updated = await prisma.pricingRule.update({ where: { id }, data });
      return ok(res, updated, 'Pricing rule updated');
    } catch (err) {
      console.error(`PATCH /admin/pricing/${id} error:`, err);
      return serverError(res, 'Failed to update pricing rule');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/pricing/:id/status
   Activate / deactivate a pricing rule.
 ───────────────────────────────────────────────────────────────────────── */
router.patch(
  '/pricing/:id/status',
  [
    param('id').isInt().withMessage('Pricing rule ID must be an integer').toInt(),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    const id = Number(req.params.id);
    const { isActive } = req.body;

    try {
      const rule = await prisma.pricingRule.findUnique({ where: { id } });
      if (!rule) return notFound(res, `Pricing rule '${id}' not found`);

      const updated = await prisma.pricingRule.update({
        where: { id },
        data:  { isActive },
        select: { id: true, isActive: true },
      });
      return ok(res, updated);
    } catch (err) {
      console.error(`PATCH /admin/pricing/${id}/status error:`, err);
      return serverError(res, 'Failed to update pricing rule status');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   DELETE /admin/pricing/:id
   Delete a pricing rule. Safe because Booking stores a price snapshot
   (no FK to PricingRule), so historical booking amounts are preserved.
 ───────────────────────────────────────────────────────────────────────── */
router.delete(
  '/pricing/:id',
  [param('id').isInt().withMessage('Pricing rule ID must be an integer').toInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Invalid pricing rule ID', errors.array());

    const id = Number(req.params.id);

    try {
      const rule = await prisma.pricingRule.findUnique({ where: { id } });
      if (!rule) return notFound(res, `Pricing rule '${id}' not found`);

      await prisma.pricingRule.delete({ where: { id } });
      return ok(res, { id }, 'Pricing rule deleted');
    } catch (err) {
      console.error(`DELETE /admin/pricing/${id} error:`, err);
      return serverError(res, 'Failed to delete pricing rule');
    }
  },
);

module.exports = router;
