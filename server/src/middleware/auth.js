/**
 * auth.js — Express middleware for JWT authentication and role authorization
 *
 * requireAuth:  validates Bearer token; populates req.user; returns 401 if missing/invalid
 * requireAdmin: requires req.user.role === 'ADMIN'; returns 403 otherwise
 * optionalAuth: populates req.user if a valid token is present; does not block if absent
 *
 * req.user shape (after requireAuth):
 *   { id: number, phone: string, role: 'USER'|'ADMIN' }
 */
'use strict';

const { verifyToken } = require('../lib/jwt');
const { unauthorized, forbidden } = require('../lib/respond');

/**
 * Extract Bearer token from Authorization header.
 * Returns the token string or null.
 */
function extractToken(req) {
  const header = req.headers['authorization'] ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length ? token : null;
}

/**
 * Require a valid JWT.
 * Sets req.user = { id, phone, role }.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return unauthorized(res, 'Authentication required — please log in');

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, phone: payload.phone, role: payload.role };
    next();
  } catch (err) {
    const msg =
      err.name === 'TokenExpiredError'
        ? 'Session expired — please log in again'
        : 'Invalid authentication token';
    return unauthorized(res, msg);
  }
}

/**
 * Require ADMIN role.
 * Must come after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user) return unauthorized(res, 'Authentication required');
  if (req.user.role !== 'ADMIN') return forbidden(res, 'Admin access required');
  next();
}

/**
 * Populate req.user if a valid token is present; do not block if absent.
 * Useful on endpoints that behave differently for authenticated vs guest users.
 */
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = { id: payload.sub, phone: payload.phone, role: payload.role };
    } catch {
      /* invalid/expired token — treat as unauthenticated guest */
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
