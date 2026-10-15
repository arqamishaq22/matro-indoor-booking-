/**
 * jwt.js — sign and verify JWT access tokens
 *
 * Tokens carry: { sub: user.id, phone: user.phone, role: user.role }
 * Sub-claim is the User.id (integer) — never the phone number.
 *
 * Secret must be set in server/.env as JWT_SECRET.
 * Default expiry: 7 days, configurable via JWT_EXPIRES_IN.
 */
'use strict';

const jwt = require('jsonwebtoken');

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (
    !s ||
    s.trim().length < 32 ||
    s === 'change-me-to-a-long-random-string-min-32-chars'
  ) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 bytes');
  }
  return s;
}

function assertJwtConfig() {
  getSecret();
}

/**
 * Issue a signed access token for a user row.
 * @param {{ id: number, phone: string, role: string }} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, phone: user.phone, role: user.role },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d', algorithm: 'HS256' },
  );
}

/**
 * Verify a token and return the decoded payload.
 * Throws if invalid or expired.
 * @param {string} token
 * @returns {{ sub: number, phone: string, role: string, iat: number, exp: number }}
 */
function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken, assertJwtConfig };
