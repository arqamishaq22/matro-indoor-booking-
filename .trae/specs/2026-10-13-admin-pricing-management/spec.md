# Spec: Admin Pricing Management

## Problem
The Matro Indoor Booking admin panel currently has a basic Pricing page that only
supports inline bulk-editing of the four (dayType × period) price slots per court via
`PATCH /admin/courts/:id/pricing`. It does not provide per-rule create / read / update /
deactivate / delete operations, searchable/filterable listing, or a dedicated pricing
rule management workflow. The underlying `PricingRule` model (courtId, dayType, period,
pricePerHour, unique on [courtId, dayType, period]) already supports this; the admin
surface and per-rule API surface are missing.

## Users
- **Admin / venue staff** — manages hourly pricing rules per court.
- **Customer (indirect)** — new bookings pick up active pricing rules; existing bookings
  keep their price snapshot.

## Goals
1. Give admins a dedicated Pricing Management page that lists every pricing rule with
   venue, court, day type, period, price per hour, and active status.
2. Allow admins to create, edit, activate/deactivate, and delete individual pricing rules
   through authenticated admin APIs.
3. Reuse the existing `PricingRule` model, `findRule` pricing lookup, and booking price
   snapshot mechanism — do not build a parallel pricing system.
4. Guarantee that editing/deactivating/deleting a pricing rule never changes the recorded
   amount of an existing booking.

## Non-goals
- Do not redesign the public website, dashboard, bookings, venues, or users pages.
- Do not change the booking creation/cancellation flow except to skip inactive pricing
  rules when computing a new booking's price.
- Do not introduce new pricing precedence, effective-date, or custom time-range fields.
- Do not implement Users Management.

## Current system facts (from inspection)
- `PricingRule { id Int, courtId String, dayType String, period String, pricePerHour Int }`
  with `@@unique([courtId, dayType, period])`. No `isActive` field today.
- Allowed `dayType`: `weekday` (Mon–Thu), `weekend` (Fri–Sun).
- Allowed `period`: `off_peak` (05:00–17:00), `peak` (17:00–05:00).
- Booking price is computed server-side in `POST /bookings` via `findRule()` in
  `server/src/lib/pricing.js`, then stored as `pricePerHour` + `totalAmount` snapshot on
  the `Booking` row. `Booking` has no FK to `PricingRule`.
- Existing admin endpoint `PATCH /admin/courts/:id/pricing` bulk-upserts all four rules
  for a court. It will be kept for backward compatibility but not used by the new UI.
- Public `GET /venues/:venueId/pricing` builds a UI matrix from DB rules.

## Functional requirements
### FR-1 Listing
- `GET /api/v1/admin/pricing` returns all pricing rules joined with court + venue,
  supporting optional query filters: `venueId`, `dayType`, `period`, `isActive`, and
  `search` (matches venue name or court name).
- Frontend renders a responsive table/cards with: Rule ID, Venue, Court, Sport, Day Type,
  Period, Price/Hour (PKR), Status (Active/Inactive), and Actions.

### FR-2 Create
- `POST /api/v1/admin/pricing` creates one rule from `{ courtId, dayType, period, pricePerHour }`.
- Validates court exists; dayType ∈ {weekday, weekend}; period ∈ {off_peak, peak};
  pricePerHour is a finite non-negative integer.
- Returns 409 if a rule with the same (courtId, dayType, period) already exists.
- New rules default `isActive = true`.

### FR-3 Read single
- `GET /api/v1/admin/pricing/:id` returns one rule (404 if missing).

### FR-4 Update
- `PATCH /api/v1/admin/pricing/:id` updates `pricePerHour` and/or `isActive`.
- `courtId`, `dayType`, `period` are immutable via this endpoint to avoid unique-key
  collisions; changing those requires delete + create.

### FR-5 Activate / Deactivate
- `PATCH /api/v1/admin/pricing/:id/status` with `{ isActive }` toggles the rule.
- Inactive rules are ignored by `findRule()` when computing new booking prices.

### FR-6 Delete
- `DELETE /api/v1/admin/pricing/:id` removes the rule.
- Safe because `Booking` stores a price snapshot and has no FK to `PricingRule`.

### FR-7 Booking price protection
- `findRule()` is updated to only consider rules where `isActive === true`.
- No change to booking snapshot fields or cancellation logic.

### FR-8 Frontend UX
- Pricing page with search, filters, add/edit/delete/toggle actions.
- Add & Edit use a dialog form (venue → dependent court select, dayType, period,
  pricePerHour). Form prevents duplicate (court, dayType, period) combinations by
  surfacing the backend 409.
- Confirmation dialogs for delete and deactivate.
- Loading skeletons, empty state, error state with retry, disabled buttons during
  requests, toast notifications.

## Non-functional requirements
- All new admin endpoints require `requireAuth` + `requireAdmin`.
- Server-side validation only (never trust client).
- Consistent JSON responses via `lib/respond.js`.
- Prisma `P2002` (unique violation) handled as 409.
- Follow existing CSS variables and admin component conventions.
- Responsive (desktop / tablet / mobile).

## Constraints & dependencies
- Must add `isActive Boolean @default(true)` to `PricingRule` (schema migration).
- Must update `findRule` to skip inactive rules.
- Existing `PATCH /admin/courts/:id/pricing` remains unchanged (backward compatible).
- No changes to `Booking` model or booking routes beyond the `findRule` filter.

## Assumptions
- The unique constraint `[courtId, dayType, period]` is the right guard against duplicate
  rules; no extra overlapping logic is needed.
- `pricePerHour` is an integer PKR amount (matches existing model).

## Open questions
None blocking.

## Acceptance Criteria
- **AC-1 (rule):** `GET /admin/pricing` returns a list of pricing rules including venue
  name, court name, dayType, period, pricePerHour, and isActive.
- **AC-2 (rule):** `POST /admin/pricing` creates a rule and rejects duplicate
  (courtId, dayType, period) with HTTP 409.
- **AC-3 (rule):** `PATCH /admin/pricing/:id` updates pricePerHour/isActive and leaves
  courtId/dayType/period unchanged.
- **AC-4 (rule):** `PATCH /admin/pricing/:id/status` toggles isActive.
- **AC-5 (rule):** `DELETE /admin/pricing/:id` removes the rule without affecting any
  existing booking's stored price.
- **AC-6 (rule):** An inactive pricing rule is not returned by `findRule()` for new
  bookings; an active rule is.
- **AC-7 (rule):** Existing bookings retain their original `pricePerHour`/`totalAmount`
  after any pricing rule edit/deactivate/delete.
- **AC-8 (rule):** Non-admin requests to new pricing endpoints return 401/403.
- **AC-9 (rubric):** Pricing page is responsive and reuses existing admin components
  (DetailDialog, tableHelpers, adminShared, toast). Pass threshold: 2/3.
- **AC-10 (rule):** Frontend production build (`npm run build`) succeeds.
