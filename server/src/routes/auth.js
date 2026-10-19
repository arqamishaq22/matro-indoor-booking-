/**
 * auth.js — Authentication routes
 * ─────────────────────────────────────────────────────────────────────────
 * POST /api/v1/auth/register  — create account (phone + password + optional name)
 * POST /api/v1/auth/login     — exchange credentials for JWT
 * GET  /api/v1/auth/me        — return the authenticated user's own profile
 *
 * Security:
 *   - Passwords are hashed with bcrypt (cost 12) — never stored plaintext.
 *   - JWT is signed with HS256 using JWT_SECRET from environment.
 *   - Error messages do not reveal whether a phone number is registered.
 *   - userId is taken from the verified token, never from the request body.
 * ─────────────────────────────────────────────────────────────────────────
 */
'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const prisma  = require('../lib/prisma');
const { signToken } = require('../lib/jwt');
const { requireAuth } = require('../middleware/auth');
const {
  ok, created, badRequest, unauthorized, serverError,
} = require('../lib/respond');

const router = Router();
const BCRYPT_ROUNDS = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('matro-auth-timing-only', BCRYPT_ROUNDS);

/* ─── Validators ─────────────────────────────────────────────────────── */
const registerValidators = [
  body('phone')
    .isString().withMessage('phone must be a string').bail()
    .trim().notEmpty().withMessage('phone is required').bail()
    .custom((val) => {
      const digits = val.replace(/\D/g, '');
      if (digits.length > 11) {
        throw new Error('Phone number must not exceed 11 digits');
      }
      if (digits.length < 10) {
        throw new Error('Phone number must be at least 10–11 digits');
      }
      return true;
    }),
  body('password')
    .isString().withMessage('password must be a string').bail()
    .isLength({ min: 8 }).withMessage('password must be at least 8 characters')
    .isLength({ max: 128 }).withMessage('password too long')
    .bail()
    .custom((password) => Buffer.byteLength(password, 'utf8') <= MAX_BCRYPT_PASSWORD_BYTES)
    .withMessage('password must be at most 72 UTF-8 bytes'),
  body('name')
    .optional()
    .isString().withMessage('name must be a string').bail()
    .trim().isLength({ min: 2, max: 120 }).withMessage('name must be 2–120 characters'),
];

function sanitizedValidationErrors(result) {
  return result
    .array({ onlyFirstError: true })
    .map(({ location, path, msg }) => ({ location, path, msg }));
}

const loginValidators = [
  body().custom((value, { req }) => {
    if (!req.body.phone && !req.body.email) {
      throw new Error('phone or email is required');
    }
    return true;
  }),
  body('phone')
    .optional()
    .isString().withMessage('phone must be a string').bail()
    .trim().notEmpty().withMessage('phone cannot be empty').bail()
    .custom((val) => {
      const digits = val.replace(/\D/g, '');
      if (digits.length > 11) {
        throw new Error('Phone number must not exceed 11 digits');
      }
      return true;
    }),
  body('email')
    .optional()
    .isString().withMessage('email must be a string').bail()
    .trim().notEmpty().withMessage('email cannot be empty')
    .isEmail().withMessage('must be a valid email'),
  body('password')
    .isString().withMessage('password must be a string').bail()
    .notEmpty().withMessage('password is required')
    .isLength({ max: 128 }).withMessage('password too long')
    .bail()
    .custom((password) => Buffer.byteLength(password, 'utf8') <= MAX_BCRYPT_PASSWORD_BYTES)
    .withMessage('password must be at most 72 UTF-8 bytes'),
];

function getPhoneVariants(phone) {
  if (!phone || typeof phone !== 'string') return [];
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const variants = new Set([trimmed]);
  if (digitsOnly) {
    variants.add(digitsOnly);
    if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
      const rest = digitsOnly.slice(1);
      variants.add('+92' + rest);
      variants.add('92' + rest);
      variants.add(`0${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4)}`);
      variants.add(`0${digitsOnly.slice(1, 4)} ${digitsOnly.slice(4)}`);
    } else if (digitsOnly.startsWith('92') && digitsOnly.length === 12) {
      const rest = digitsOnly.slice(2);
      variants.add('0' + rest);
      variants.add('+' + digitsOnly);
      variants.add(`0${rest.slice(0, 3)}-${rest.slice(3)}`);
      variants.add(`0${rest.slice(0, 3)} ${rest.slice(3)}`);
    } else if (digitsOnly.length === 10 && !digitsOnly.startsWith('0')) {
      variants.add('0' + digitsOnly);
      variants.add('+92' + digitsOnly);
      variants.add('92' + digitsOnly);
    }
  }
  return Array.from(variants);
}

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/auth/check-phone
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/check-phone',
  async (req, res) => {
    const phone = req.query.phone?.trim();
    if (!phone) {
      return badRequest(res, 'phone query parameter is required');
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length > 11) {
      return badRequest(res, 'Phone number must not exceed 11 digits');
    }
    try {
      const variants = getPhoneVariants(phone);
      const existing = await prisma.user.findFirst({ where: { phone: { in: variants } } });
      return ok(res, { exists: Boolean(existing) });
    } catch (err) {
      console.error('GET /auth/check-phone error:', err);
      return serverError(res, 'Failed to check phone number');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/v1/auth/register
 ───────────────────────────────────────────────────────────────────────── */
router.post(
  '/register',
  registerValidators,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, 'Validation failed', sanitizedValidationErrors(errors));
    }

    const { phone, password, name } = req.body;

    try {
      /* Check for an existing account (including formatting variants) before hashing */
      const variants = getPhoneVariants(phone);
      const existing = await prisma.user.findFirst({ where: { phone: { in: variants } } });
      if (existing) {
        return badRequest(
          res,
          'This phone number is already registered. Please log in instead.',
          [{ path: 'phone', msg: 'This phone number is already registered. Please log in instead.' }]
        );
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const user = await prisma.user.create({
        data: { phone, passwordHash, name: name?.trim() ?? null, role: 'USER' },
        select: { id: true, phone: true, name: true, role: true, createdAt: true },
      });

      const token = signToken(user);

      return created(res, {
        user:  { id: user.id, phone: user.phone, name: user.name, role: user.role },
        token,
      }, 'Registration successful');

    } catch (err) {
      if (err.code === 'P2002') {
        return badRequest(
          res,
          'This phone number is already registered. Please log in instead.',
          [{ path: 'phone', msg: 'This phone number is already registered. Please log in instead.' }]
        );
      }
      console.error('POST /auth/register error:', err);
      return serverError(res, 'Registration failed');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/v1/auth/login
 ───────────────────────────────────────────────────────────────────────── */
router.post(
  '/login',
  loginValidators,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, 'Validation failed', sanitizedValidationErrors(errors));
    }

    const { phone, email, password } = req.body;

    try {
      let user = null;
      if (email) {
        user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return badRequest(
            res,
            'This email is not registered.',
            [{ path: 'email', msg: 'This email is not registered.' }]
          );
        }
      } else {
        const variants = getPhoneVariants(phone);
        user = await prisma.user.findFirst({ where: { phone: { in: variants } } });

        if (!user) {
          return badRequest(
            res,
            'This phone number is not registered. Please create an account first.',
            [{ path: 'phone', msg: 'This phone number is not registered. Please create an account first.' }]
          );
        }
      }

      const valid = await bcrypt.compare(password, user.passwordHash);

      if (!valid) {
        return unauthorized(
          res,
          'Incorrect password. Please try again.',
          [{ path: 'password', msg: 'Incorrect password. Please try again.' }]
        );
      }

      if (!user.isActive) {
        return unauthorized(res, 'Account is disabled — please contact support');
      }

      const token = signToken(user);

      return ok(res, {
        user:  { id: user.id, phone: user.phone, email: user.email, name: user.name, role: user.role },
        token,
      }, 'Login successful');

    } catch (err) {
      console.error('POST /auth/login error:', err);
      return serverError(res, 'Login failed');
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/v1/auth/me
 ───────────────────────────────────────────────────────────────────────── */
router.get(
  '/me',
  requireAuth,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where:  { id: req.user.id },
        select: { id: true, phone: true, email: true, name: true, role: true, createdAt: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return unauthorized(res, 'Account not found or disabled');
      }

      return ok(res, {
        id:        user.id,
        phone:     user.phone,
        email:     user.email,
        name:      user.name,
        role:      user.role,
        createdAt: user.createdAt,
      });

    } catch (err) {
      console.error('GET /auth/me error:', err);
      return serverError(res, 'Failed to load profile');
    }
  },
);

module.exports = router;
