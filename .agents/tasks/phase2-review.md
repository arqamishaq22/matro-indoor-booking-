# Phase 2 Admin Panel — Bookings, Venues, Pricing, and Users Management

Phase 2 adds four management panels to the existing admin SPA: Bookings, Venues, Pricing, and Users. All four panels live in `AdminDashboard.jsx` as self-contained React components behind a tab-based sidebar. The backend adds twelve new route handlers to `server/src/routes/admin.js`, all guarded by the existing `requireAuth + requireAdmin` middleware chain. Service wrappers in `bookingService.js` wire the frontend to each new endpoint.

**Watch for:**
- `PATCH /admin/bookings/:id/status` uses `updateMany` with a current-status condition as an optimistic lock, then fetches the final state with a bare `findUnique`. The second fetch is not conditioned on this request's write, so the response may reflect a concurrent update rather than what this request did — **confirmed**.
- No build log is present anywhere in the workspace or task directory. Build evidence is required before approval — **confirmed missing**.

**Verdict**: NEEDS_CHANGES

---

## High-level view

All twelve backend endpoints inherit `requireAuth + requireAdmin` from a single `router.use()` at mount time, so there is no per-route auth gap. The booking status-transition allowlist (PENDING → CONFIRMED | CANCELLED; CONFIRMED → CANCELLED | NO_SHOW | COMPLETED) matches the Prisma schema comment and is enforced on both backend and frontend. Venue deletion checks for active bookings before proceeding, and the Prisma cascade policy (Court.onDelete = Cascade, Booking.onDelete = SetNull) means deleting a venue preserves historical booking records with `courtId = null`.

Every user-related endpoint uses explicit `select` lists that exclude `passwordHash`, including the `GET /admin/users/:id/bookings` route which scopes its user fetch to `{ id, name, phone }`. Self-deactivation is blocked at both the backend (403 when `id === req.user.id`) and the frontend (the "You" label renders instead of a toggle for the signed-in admin). Deactivation confirmations use `DetailDialog`, not `window.confirm`.

The booking status update's trailing `findUnique` is the main correctness gap: the `updateMany` guard is sound for preventing double-transitions, but the unconditioned read after it can return state written by a concurrent request, making the response misleading. Venue search is client-side (all venues loaded, filtered in memory), while bookings and users use server-side pagination and search — an inconsistency that is harmless at small scale but diverges from the established pattern.

---

<details>
<summary>Issues (3)</summary>

1. **Stale response after concurrent status update** — `PATCH /admin/bookings/:id/status` runs `updateMany` with `WHERE id = ? AND status = ?` as an optimistic lock, then calls `findUnique` without any condition. If a second admin request wins the `updateMany` race and immediately makes another transition, the `findUnique` on the losing request returns the second transition's state, not the state this request set. Replace the pattern with a single conditioned `update` (relying on Prisma to throw if the row is not found), or derive the response from `updateMany`'s own write rather than a second read.

2. **No build evidence** — no build log, CI artifact, or terminal output exists in the workspace. The review criteria require confirming a passing build before approval. The coder must supply evidence of `npm run build` passing.

3. **Client-side venue search diverges from established pattern** — the Venues panel loads all venues in a single request and filters with `.filter()` in memory. Bookings and Users both use server-side search and pagination. With a small venue count this is not a functional problem, but it creates a pattern inconsistency that future contributors are likely to copy. Worth aligning before this codebase grows.

</details>

<details>
<summary>Details</summary>

## Booking status update — optimistic lock without conditioned response

The update flow in `PATCH /admin/bookings/:id/status`:

1. `findUnique` to get current status
2. Validate transition in `allowedTransitions`
3. `updateMany` with `WHERE id = ? AND status = ?` — this is the lock
4. If `result.count === 0`, return 400
5. `findUnique` again to build the response

The `updateMany` pattern prevents both double-confirmation and invalid transitions under concurrency: only one request can win the `count > 0` check. The problem is step 5. The second `findUnique` is unconditioned — it returns whatever the row looks like at that point. If the winning request's response handler has already sent a reply and that admin immediately triggers a second transition (e.g., CONFIRMED → COMPLETED) in the sub-millisecond window between steps 3 and 5 of the first request, the first request's response body shows COMPLETED instead of CONFIRMED. The caller sees a status it did not set.

The fix is to replace `updateMany + findUnique` with a single `update`:

```js
const updated = await prisma.booking.update({
  where: { id, status: booking.status },   // Prisma will throw P2025 if status changed
  data,
});
```

If the row's status changed between the earlier `findUnique` and this `update`, Prisma throws `P2025` (record not found for update), which you catch and return as a 400.

## passwordHash exclusion — confirmed safe

Every user-related query in the new code uses an explicit `select`:

- `GET /admin/users` — selects `id, phone, email, name, role, isActive, createdAt, _count`
- `GET /admin/users/:id/bookings` — selects `id, name, phone` for the user sub-object
- `PATCH /admin/users/:id/status` — selects `id, phone, name, role, isActive`

`passwordHash` is not exposed in any admin user response.

## Venue deletion safety

`DELETE /admin/venues/:id` counts `PENDING | CONFIRMED` bookings across all courts in the venue before proceeding. If any exist, it returns 400 and directs the admin to deactivate instead. The frontend delete confirmation dialog repeats this constraint. The Prisma cascade (Court.onDelete = Cascade on Venue, Booking.onDelete = SetNull on Court) is correctly documented: deleting a venue removes courts and pricing rules but preserves booking history with `courtId = null`.

## Approve/reject button visibility

Approve and Reject buttons appear only when `b.status === 'PENDING'`. CONFIRMED bookings show Complete, No-Show, and Cancel. Terminal states show no action buttons. The frontend `BOOKING_TRANSITIONS` map and the backend `allowedTransitions` map are in sync.

## Self-deactivation protection

`PATCH /admin/users/:id/status` returns 403 when `Number(id) === req.user.id && !isActive`. The frontend renders a non-interactive "You" label for the signed-in admin's row and never calls the toggle handler. The backend guard is independent, so it holds even if the frontend check is bypassed.

## Build evidence

No build output exists in the workspace or task directory. The review instructions say to read the build output from the coder's final message, but no such message or artifact is present.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `src/pages/AdminDashboard.jsx` | Added BookingsPanel, VenuesPanel, PricingPanel (with PricingEditor), UsersPanel, and shared sub-components (DetailDialog, DetailLine, Pagination, ToggleBtn, ListSkeleton, StatCard, SectionHead, TableWrap, Th, Td); wired four new tabs in the AdminDashboard root |
| `src/services/bookingService.js` | Added fourteen admin API helper functions covering stats, bookings, users, venues, courts, and pricing |
| `server/src/routes/admin.js` | Added GET /admin/venues/:id, DELETE /admin/venues/:id, POST /admin/venues, PATCH /admin/venues/:id, PATCH /admin/venues/:id/status, POST /admin/venues/:venueId/courts, PATCH /admin/courts/:id, PATCH /admin/courts/:id/status, PATCH /admin/courts/:id/pricing — all inheriting the mount-level requireAuth + requireAdmin guard |

</details>
