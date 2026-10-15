/**
 * Singleton Prisma client.
 * Import this everywhere instead of `new PrismaClient()` to avoid
 * connection pool exhaustion during hot-reloads in development.
 */
'use strict';
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
