# Tasks: Admin Pricing Management

## Task 1: Schema migration — add `isActive` to PricingRule
- **Priority:** high
- **Status:** pending
- **Files:** `server/prisma/schema.prisma`, new migration under `server/prisma/migrations/`
- **Work:**
  - Add `isActive Boolean @default(true)` to the `PricingRule` model.
  - Generate a Prisma migration (e.g. `20261013000000_add_isactive_to_pricing_rule`).
  - Run `npx prisma migrate dev` to apply.
- **Acceptance Criteria:** AC-6 (partial — column exists)
- **Test Requirements:**
  - TR-1 (rule): `PricingRule.isActive` column exists and defaults to `true`.

## Task 2: Backend — per-rule pricing API endpoints
- **Priority:** high
- **Status:** pending
- **Files:** `server/src/routes/admin.js`, `server/src/lib/pricing.js`
- **Work:**
  - Add to `admin.js`: `GET /pricing`, `POST /pricing`, `GET /pricing/:id`,
    `PATCH /pricing/:id`, `PATCH /pricing/:id/status`, `DELETE /pricing/:id`.
  - Use `requireAuth, requireAdmin` (already applied at router level).
  - Validate: court exists, dayType ∈ {weekday,weekend}, period ∈ {off_peak,peak},
    pricePerHour finite non-negative int.
  - Handle Prisma `P2002` as 409 conflict on create.
  - On `PATCH /pricing/:id`, only allow `pricePerHour` and `isActive`.
  - Update `findRule()` in `lib/pricing.js` to filter `isActive === true`.
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- **Test Requirements:**
  - TR-2 (rule): `GET /admin/pricing` returns rules with venue/court names and supports filters.
  - TR-3 (rule): `POST /admin/pricing` creates a rule; duplicate returns 409.
  - TR-4 (rule): `PATCH /admin/pricing/:id` updates price/isActive only.
  - TR-5 (rule): `PATCH /admin/pricing/:id/status` toggles isActive.
  - TR-6 (rule): `DELETE /admin/pricing/:id` removes the rule.
  - TR-7 (rule): `findRule` ignores inactive rules.
  - TR-8 (rule): Unauthenticated/non-admin requests get 401/403.

## Task 3: Frontend services — pricing API helpers
- **Priority:** high
- **Status:** pending
- **Files:** `src/services/bookingService.js`
- **Work:**
  - Add: `getAdminPricing(params)`, `getAdminPricingRuleById(id)`,
    `createAdminPricingRule(data)`, `updateAdminPricingRule(id, data)`,
    `updateAdminPricingRuleStatus(id, isActive)`, `deleteAdminPricingRule(id)`.
- **Acceptance Criteria:** AC-1 (frontend side)
- **Test Requirements:**
  - TR-9 (rule): All six service functions exist and hit the correct admin paths.

## Task 4: Frontend — rewrite PricingPage with table, filters, add/edit/delete/toggle
- **Priority:** high
- **Status:** pending
- **Files:** `src/pages/admin/PricingPage.jsx`, possibly `src/components/admin/adminShared.js`
- **Work:**
  - Render pricing rules in a responsive table/cards.
  - Search by venue/court name; filters: venue, dayType, period, status.
  - "Add Pricing Rule" button → `DetailDialog` form (venue select → court select,
    dayType, period, pricePerHour).
  - Edit action → same dialog pre-filled; only pricePerHour editable (court/dayType/period
    immutable).
  - Toggle activate/deactivate with confirmation; delete with confirmation.
  - Loading skeletons (`ListSkeleton`), empty state, `ErrorState` with retry, disabled
    buttons during requests, `showToast` for success/error.
  - Reuse `DetailDialog`, `tableHelpers`, `adminShared`, `ErrorState`, `StatusBadge`.
- **Acceptance Criteria:** AC-1, AC-9
- **Test Requirements:**
  - TR-10 (rule): Pricing page loads rules from the API.
  - TR-11 (rule): Add form validates required fields and rejects invalid prices.
  - TR-12 (rule): Edit updates a single rule; delete removes it; toggle changes status.
  - TR-13 (rubric): Page is responsive and visually consistent with other admin pages.
    Pass threshold: 2/3.

## Task 5: Verification — build, backend checks, booking price protection
- **Priority:** high
- **Status:** pending
- **Files:** none (verification only)
- **Work:**
  - Run frontend `npm run build`; fix any errors.
  - Run backend syntax check (`node --check` on changed files) and start server.
  - Manually verify: list/create/edit/delete/toggle pricing rules; confirm an inactive
    rule is not used by a new booking; confirm existing booking amounts are unchanged.
- **Acceptance Criteria:** AC-10, AC-7
- **Test Requirements:**
  - TR-14 (rule): `npm run build` exits 0.
  - TR-15 (rule): Backend server starts and new endpoints respond.
  - TR-16 (rule): Existing booking totalAmount is unchanged after editing/deleting its
    source pricing rule.
