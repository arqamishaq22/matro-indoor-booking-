/**
 * Matro Indoor Sports Booking — Express API server
 * ─────────────────────────────────────────────────────────────────────────
 * Start:       node src/index.js       (production)
 *              npm run dev             (development with nodemon)
 * Last updated: 2026-10-13
 *
 * Environment: copy server/.env.example → server/.env and fill in values
 * ─────────────────────────────────────────────────────────────────────────
 */
'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const prisma = require('./lib/prisma');
const { assertJwtConfig } = require('./lib/jwt');

/* ─── Route handlers ──────────────────────────────────────────────────── */
const venueRouter = require('./routes/venues');
const sportsRouter = require('./routes/sports');
const pricingRouter = require('./routes/pricing');
const availabilityRouter = require('./routes/availability');
const bookingRouter = require('./routes/bookings');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT ?? 3001;

/* ─── Allowed origins ─────────────────────────────────────────────────── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);

/* ═══════════════════════════════════════════════════════════════════════
   MIDDLEWARE
════════════════════════════════════════════════════════════════════════ */

/* Security headers */
app.use(helmet());

/* CORS — allow configured frontend origins and all vercel.app domains */
app.use(cors({
  origin: (origin, cb) => {
    /* Allow requests with no origin (e.g. curl, Postman) */
    if (!origin) return cb(null, true);

    /* Allow any .vercel.app domain, localhost, or configured allowedOrigins */
    if (
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      allowedOrigins.includes(origin)
    ) {
      return cb(null, true);
    }

    cb(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

/* Request logging */
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/* JSON body parsing — 50 kb limit */
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

/* ═══════════════════════════════════════════════════════════════════════
   ROUTES
════════════════════════════════════════════════════════════════════════ */
const V1 = '/api/v1';

app.use(`${V1}/auth`, authRouter);
app.use(`${V1}/sports`, sportsRouter);
app.use(`${V1}/venues`, venueRouter);
app.use(`${V1}/venues/:venueId/pricing`, pricingRouter);
app.use(`${V1}/availability`, availabilityRouter);
app.use(`${V1}/bookings`, bookingRouter);
app.use(`${V1}/admin`, adminRouter);

/* ── Health check ──────────────────────────────────────────────────── */
app.get(`${V1}/health`, async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

/* ── 404 fallthrough ───────────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

/* ── Global error handler ──────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status ?? 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   STARTUP
════════════════════════════════════════════════════════════════════════ */
async function start() {
  try {
    assertJwtConfig();
    await prisma.$connect();
    console.log('✅  Database connected');

    app.listen(PORT, () => {
      console.log(`🚀  Matro API listening on http://localhost:${PORT}`);
      console.log(`    Health: http://localhost:${PORT}${V1}/health`);
      console.log(`    Env:    ${process.env.NODE_ENV ?? 'development'}`);
    });
  } catch (err) {
    console.error('❌  Failed to start server:', err);
    process.exit(1);
  }
}

/* Run listener if executed directly (e.g. locally or on Render/Railway) */
if (!process.env.VERCEL) {
  start();
}

/* Graceful shutdown */
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — closing connections…');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
