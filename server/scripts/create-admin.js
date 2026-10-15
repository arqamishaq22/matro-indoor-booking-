/**
 * scripts/create-admin.js
 * ─────────────────────────────────────────────────────────────────────────
 * Development utility to create or update an ADMIN user with phone & password.
 *
 * Usage:
 *   node scripts/create-admin.js --phone "03001234567" --password "Admin@123" --name "Super Admin"
 *   node scripts/create-admin.js --phone "03001234567" --email "admin@matro.pk" --password "Admin@123"
 *
 * If the user already exists (by phone or email), their password and role are updated to ADMIN.
 * ─────────────────────────────────────────────────────────────────────────
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/* ── Normalize phone & variants ────────────────────────────────────────── */
function getPhoneVariants(raw) {
  if (!raw) return [];
  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const variants = new Set([trimmed, digitsOnly]);

  if (digitsOnly.length >= 10) {
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

/* ── Parse CLI args ────────────────────────────────────────────────────── */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phone'    && args[i + 1]) { result.phone    = args[++i]; }
    if (args[i] === '--email'    && args[i + 1]) { result.email    = args[++i]; }
    if (args[i] === '--password' && args[i + 1]) { result.password = args[++i]; }
    if (args[i] === '--name'     && args[i + 1]) { result.name     = args[++i]; }
  }
  return result;
}

/* ── Validation ─────────────────────────────────────────────────────────── */
function validate({ phone, email, password }) {
  if (!phone && !email) {
    console.error('❌  Either --phone or --email is required');
    console.log('   Example: node scripts/create-admin.js --phone "03001234567" --password "Admin@123"');
    process.exit(1);
  }
  if (!password) {
    console.error('❌  --password is required');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('❌  --password must be at least 6 characters');
    process.exit(1);
  }
}

/* ── Main ───────────────────────────────────────────────────────────────── */
async function main() {
  const { phone, email, password, name } = parseArgs();
  validate({ phone, email, password });

  console.log('\n🔐  Matro — Admin User Setup');
  console.log('─────────────────────────────');

  const phoneVariants = phone ? getPhoneVariants(phone) : [];

  // Find existing user by phone variants or email
  let existing = null;
  if (phoneVariants.length > 0) {
    existing = await prisma.user.findFirst({
      where: { phone: { in: phoneVariants } }
    });
  }
  if (!existing && email) {
    existing = await prisma.user.findUnique({
      where: { email }
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(phone ? { phone: phone.trim() } : {}),
        ...(email ? { email: email.trim() } : {}),
        ...(name  ? { name: name.trim() } : {}),
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
      select: { id: true, phone: true, email: true, name: true, role: true, isActive: true },
    });

    console.log(`✅  Updated existing user to ADMIN:`);
    console.log(`     id:       ${updated.id}`);
    console.log(`     phone:    ${updated.phone ?? '(none)'}`);
    console.log(`     email:    ${updated.email ?? '(none)'}`);
    console.log(`     name:     ${updated.name ?? '(none)'}`);
    console.log(`     role:     ${updated.role}`);
  } else {
    const user = await prisma.user.create({
      data: {
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        name: name ? name.trim() : 'Administrator',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
      select: { id: true, phone: true, email: true, name: true, role: true, isActive: true },
    });

    console.log(`✅  Admin user created successfully:`);
    console.log(`     id:       ${user.id}`);
    console.log(`     phone:    ${user.phone ?? '(none)'}`);
    console.log(`     email:    ${user.email ?? '(none)'}`);
    console.log(`     name:     ${user.name ?? '(none)'}`);
    console.log(`     role:     ${user.role}`);
  }

  console.log('\n  You can now log in at /admin/login or via API with these credentials.');
  console.log('  Role "ADMIN" unlocks all admin dashboard features and /api/v1/admin/* routes.\n');
}

main()
  .catch((e) => {
    console.error('❌  create-admin failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
