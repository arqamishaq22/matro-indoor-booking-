# Phase 2 Implementation Plan
## Matro Indoor Booking — Admin Panel: Bookings, Venues, Pricing & Users

> **Ground truth from codebase inspection**
> - All admin UI lives in one file: `src/pages/AdminDashboard.jsx`. No new pages or routes.
> - All admin API calls go through `src/services/bookingService.js` using the `apiFetch` wrapper.
> - Backend: `server/src/routes/admin.js` — already has POST/PATCH venue endpoints; missing GET /:id and DELETE /:id.
> - Auth state shape: `state.auth.user = { id, phone, name, role }` (selector: `selectAuthUser`).
> - Booking statuses: PENDING | CONFIRMED | CANCELLED | NO_SHOW | COMPLETED (string column, not enum).
> - Payment statuses: UNPAID | PAID | REFUNDED | WAIVED.
> - `paymentStatus` IS returned by `GET /admin/bookings` (field `paymentStatus` in formatted response).
> - `User` has an `email` field in Prisma schema but the `GET /admin/users` response does NOT select it — it must be added.
> - Logged-in admin ID: `useSelector(selectAuthUser)?.id` (integer).
> - No schema migration is needed; all required fields already exist.

---

## Item 1 — Backend: Add `GET /admin/venues/:id` endpoint

**What:** Add a single-venue fetch route that returns the venue with its courts and their pricing rules.
This is needed by the frontend Edit Venue form to pre-fill data without relying on the full list.

**File:** `server/src/routes/admin.js`

**Where to insert:** Immediately after the existing `GET /admin/venues` route (around line 270 in the current file).

**Implementation:**
```js
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
```

**Verify:** Start the server (`npm run dev` in `server/`) and hit `GET /api/v1/admin/venues/<existing-id>` with a valid admin JWT — expect 200 with the venue object including courts.

---

## Item 2 — Backend: Add `DELETE /admin/venues/:id` endpoint

**What:** Delete a venue only when it has no active (PENDING or CONFIRMED) bookings. If active bookings exist, return 400 with a message suggesting deactivation. The Prisma schema has `onDelete: Cascade` on Court → Venue, and PricingRule → Court, so deleting a venue cascades courts and pricing rules automatically. Bookings reference Court but have no cascade delete; the guard check prevents orphaned booking issues.

**File:** `server/src/routes/admin.js`

**Where to insert:** After the new `GET /admin/venues/:id` route from Item 1.

**Implementation:**
```js
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

      // Check for active bookings across all courts of this venue
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

      await prisma.venue.delete({ where: { id } });
      return ok(res, { id }, 'Venue deleted');
    } catch (err) {
      console.error(`DELETE /admin/venues/${id} error:`, err);
      return serverError(res, 'Failed to delete venue');
    }
  },
);
```

**Verify:** With the server running, attempt `DELETE /api/v1/admin/venues/<id-with-active-bookings>` — expect 400. Attempt with a venue that has no PENDING/CONFIRMED bookings — expect 200.

---

## Item 3 — Backend: Expose `email` field in `GET /admin/users` response

**What:** The `User` model has an `email` field. The current `GET /admin/users` `select` omits it. Add `email: true` to the select object so the frontend can display it.

**File:** `server/src/routes/admin.js`

**Where:** In the `GET /admin/users` route, find the `prisma.user.findMany` call. Change:
```js
select: {
  id: true, phone: true, name: true, role: true,
  isActive: true, createdAt: true,
  _count: { select: { bookings: true } },
},
```
to:
```js
select: {
  id: true, phone: true, email: true, name: true, role: true,
  isActive: true, createdAt: true,
  _count: { select: { bookings: true } },
},
```

**Verify:** `GET /api/v1/admin/users` response objects now include `email` (may be null for phone-only users).

---

## Item 4 — Service layer: Add `createAdminVenue`, `updateAdminVenue`, `deleteAdminVenue`, `getAdminVenueById`

**What:** Four new service functions following the exact `apiFetch` pattern used by all existing admin helpers.

**File:** `src/services/bookingService.js`

**Where to insert:** After the existing `updateCourtPricing` function, before the `/* Legacy alias */` comment.

**Implementation — append these four functions:**
```js
export async function getAdminVenueById(venueId) {
  return apiFetch(`/api/v1/admin/venues/${encodeURIComponent(venueId)}`);
}

export async function createAdminVenue(venueData) {
  return apiFetch('/api/v1/admin/venues', {
    method: 'POST',
    body:   JSON.stringify(venueData),
  });
}

export async function updateAdminVenue(venueId, venueData) {
  return apiFetch(`/api/v1/admin/venues/${encodeURIComponent(venueId)}`, {
    method: 'PATCH',
    body:   JSON.stringify(venueData),
  });
}

export async function deleteAdminVenue(venueId) {
  return apiFetch(`/api/v1/admin/venues/${encodeURIComponent(venueId)}`, {
    method: 'DELETE',
  });
}
```

**Verify:** Import and call `getAdminVenueById` from the browser console while logged in as admin — expect the venue object back. (Full UI verification happens in Items 6–7.)

---

## Item 5 — Frontend: BookingsPanel enhancements

**What:** Four targeted changes to `BookingsPanel` inside `AdminDashboard.jsx`:

### 5a — Replace status dropdown with Approve / Reject buttons

Remove the `<select>` in the actions column. Replace with two explicit icon-buttons:
- **Approve** button: shown only when `b.status === 'PENDING'`. On click → opens confirmation dialog (see 5b) then calls `handleStatusChange(b.bookingId, 'CONFIRMED')`.
- **Reject** button: shown only when `b.status === 'PENDING'`. On click → opens confirmation dialog then calls `handleStatusChange(b.bookingId, 'CANCELLED')`.

Button styles — match existing icon-button style used by the Eye button in the same row:
```jsx
// Approve — green tint
style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--color-success) 40%, transparent)', background: 'var(--color-success-soft)', color: 'var(--color-success)', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}

// Reject — red tint
style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--brand-danger) 40%, transparent)', background: 'var(--color-danger-soft)', color: 'var(--brand-danger)', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
```

Use `<Check size={13} />` icon for Approve and `<XCircle size={13} />` for Reject (both already imported).

Disable both buttons when `updating === b.bookingId`.

### 5b — Confirmation dialog using DetailDialog pattern

Add state: `const [confirmDialog, setConfirmDialog] = useState(null);`
Shape: `{ bookingId, newStatus, message }` — non-null means dialog is open.

Replace `window.confirm` in `handleStatusChange` with:
```js
const handleStatusChange = async (bookingId, newStatus) => {
  const booking = data.bookings.find((item) => item.bookingId === bookingId);
  if (!booking || !(BOOKING_TRANSITIONS[booking.status] ?? []).includes(newStatus)) return;
  // Open confirmation dialog instead of window.confirm
  setConfirmDialog({
    bookingId,
    newStatus,
    message: newStatus === 'CANCELLED'
      ? `Cancel booking ${bookingId.slice(0, 12)}…? This cannot be undone.`
      : `Confirm booking ${bookingId.slice(0, 12)}…?`,
  });
};

const executeStatusChange = async (bookingId, newStatus) => {
  setConfirmDialog(null);
  setUpdating(bookingId);
  try {
    await updateBookingStatus(bookingId, { status: newStatus });
    dispatch(showToast({ message: `Booking ${newStatus === 'CONFIRMED' ? 'approved' : 'cancelled'} successfully`, type: 'success' }));
    await load();
  } catch (e) {
    dispatch(showToast({ message: e.message, type: 'error' }));
  } finally { setUpdating(null); }
};
```

Render the confirmation dialog at the bottom of `BookingsPanel` JSX (alongside the existing `selectedBooking` `DetailDialog`):
```jsx
{confirmDialog && (
  <DetailDialog title="Confirm action" onClose={() => setConfirmDialog(null)}>
    <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
      {confirmDialog.message}
    </p>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
      <button type="button" onClick={() => setConfirmDialog(null)}
        style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        Cancel
      </button>
      <button type="button"
        onClick={() => executeStatusChange(confirmDialog.bookingId, confirmDialog.newStatus)}
        style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 0, background: confirmDialog.newStatus === 'CONFIRMED' ? 'var(--gradient-cta)' : 'var(--brand-danger)', color: '#fff', cursor: 'pointer', fontWeight: 'var(--fw-semibold)' }}>
        {confirmDialog.newStatus === 'CONFIRMED' ? 'Approve' : 'Reject'}
      </button>
    </div>
  </DetailDialog>
)}
```

### 5c — Add `paymentStatus` column to the bookings table

Add `<Th>Payment</Th>` header after the existing `<Th>Status</Th>` header.
Add `<Td><StatusBadge status={b.paymentStatus} size="sm" /></Td>` in the corresponding row position.
Update the `colSpan` on the empty-state row from `8` to `9`.

### 5d — Debounce the search input (300 ms)

Add a debounce ref at the top of `BookingsPanel`:
```js
const searchDebounceRef = useRef(null);
```

Change the search `onChange` handler from directly setting state to:
```jsx
onChange={(e) => {
  const val = e.target.value;
  clearTimeout(searchDebounceRef.current);
  searchDebounceRef.current = setTimeout(() => {
    setSearch(val);
    setPage(1);
  }, 300);
}}
```

Make the input a controlled uncontrolled hybrid: use a separate local state for the input's display value so the input doesn't lag:
```js
const [searchInput, setSearchInput] = useState('');
// ...
onChange={(e) => {
  setSearchInput(e.target.value);
  clearTimeout(searchDebounceRef.current);
  searchDebounceRef.current = setTimeout(() => {
    setSearch(e.target.value);
    setPage(1);
  }, 300);
}}
value={searchInput}
```

### 5e — Empty state with message

The table already has an inline empty-state row. Ensure it shows a helpful message when `data.bookings.length === 0` and no filters are active vs when filters are active:
```jsx
{data.bookings.length === 0 && (
  <tr>
    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
      {search || status || date || sport
        ? 'No bookings match the current filters.'
        : 'No bookings found.'}
    </td>
  </tr>
)}
```

**File:** `src/pages/AdminDashboard.jsx`

**Verify:** Run the Vite dev server (`npm run dev`). Navigate to Admin → Bookings. Confirm:
- PENDING rows show Approve/Reject buttons; non-PENDING rows show neither.
- Clicking either button opens the DetailDialog-style confirmation.
- Confirming calls the API and refreshes the list.
- Payment status badge appears in the new column.
- Typing in search has a 300 ms delay before the API call fires (check Network tab).
- Clearing all filters with no bookings shows "No bookings found."

---

## Item 6 — Frontend: VenuesPanel — Add Venue modal with form

**What:** Add "Add Venue" button and form modal to `VenuesPanel`. The form covers all POST-required fields plus optional fields from the Prisma `Venue` model.

**File:** `src/pages/AdminDashboard.jsx`

### New imports needed at top of file (add to existing import from `bookingService`):
```js
import {
  // ...existing imports...
  createAdminVenue, updateAdminVenue, deleteAdminVenue,
} from '../services/bookingService';
```
Also add `Plus`, `Trash2` from lucide-react (add to existing lucide import line).

### State additions to `VenuesPanel`:
```js
const [venueModal, setVenueModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', venue: {...} }
const [venueForm, setVenueForm] = useState({});
const [formSaving, setFormSaving] = useState(false);
const [formErrors, setFormErrors] = useState({});
const [deleteConfirm, setDeleteConfirm] = useState(null); // null | venue object
const [deleting, setDeleting] = useState(false);
```

### Form field definitions (mirrors POST /admin/venues validation exactly):
```js
const VENUE_FORM_FIELDS = [
  { key: 'id',             label: 'Venue ID (slug)',     type: 'text',   required: true,  addOnly: true,  placeholder: 'e.g. fr-dha-phase-5',  pattern: /^[a-z0-9-]+$/, patternMsg: 'Lowercase letters, digits, and hyphens only' },
  { key: 'name',           label: 'Full Name',           type: 'text',   required: true,  maxLength: 100  },
  { key: 'shortName',      label: 'Short Name',          type: 'text',   required: true,  maxLength: 60   },
  { key: 'city',           label: 'City',                type: 'text',   required: true,  maxLength: 60   },
  { key: 'address',        label: 'Address',             type: 'text',   required: true,  maxLength: 255  },
  { key: 'location',       label: 'Location / Area',     type: 'text',   required: true,  maxLength: 120  },
  { key: 'operatingHours', label: 'Operating Hours',     type: 'text',   required: true,  maxLength: 80,  placeholder: 'e.g. 06:00 AM – 02:00 AM' },
  { key: 'startingPrice',  label: 'Starting Price (Rs)', type: 'number', required: true,  min: 0          },
  { key: 'badge',          label: 'Badge (optional)',    type: 'text',   required: false, maxLength: 60   },
  { key: 'imageUrl',       label: 'Image URL (optional)',type: 'url',    required: false                  },
];
```

### Open modal helpers:
```js
const openAddVenue = () => {
  setVenueForm({});
  setFormErrors({});
  setVenueModal({ mode: 'add' });
};

const openEditVenue = (venue) => {
  setVenueForm({
    name: venue.name, shortName: venue.shortName, city: venue.city,
    address: venue.address, location: venue.location,
    operatingHours: venue.operatingHours,
    startingPrice: venue.startingPrice,
    badge: venue.badge ?? '',
    imageUrl: venue.imageUrl ?? '',
  });
  setFormErrors({});
  setVenueModal({ mode: 'edit', venue });
};
```

### Client-side validation:
```js
const validateVenueForm = (form, mode) => {
  const errs = {};
  VENUE_FORM_FIELDS.forEach(({ key, required, addOnly, pattern, patternMsg, maxLength, min, type }) => {
    if (addOnly && mode !== 'add') return;
    const val = (form[key] ?? '').toString().trim();
    if (required && !val) { errs[key] = 'This field is required.'; return; }
    if (val && maxLength && val.length > maxLength) errs[key] = `Max ${maxLength} characters.`;
    if (val && pattern && !pattern.test(val)) errs[key] = patternMsg;
    if (type === 'number' && val && (isNaN(Number(val)) || Number(val) < (min ?? 0))) errs[key] = `Must be a number ≥ ${min ?? 0}.`;
  });
  return errs;
};
```

### Save handler:
```js
const saveVenue = async (e) => {
  e.preventDefault();
  const mode = venueModal.mode;
  const errs = validateVenueForm(venueForm, mode);
  if (Object.keys(errs).length) { setFormErrors(errs); return; }
  setFormSaving(true);
  try {
    const payload = { ...venueForm, startingPrice: Number(venueForm.startingPrice) };
    if (!payload.badge)    delete payload.badge;
    if (!payload.imageUrl) delete payload.imageUrl;

    if (mode === 'add') {
      await createAdminVenue(payload);
      dispatch(showToast({ message: 'Venue created successfully', type: 'success' }));
    } else {
      const { id } = venueModal.venue;
      // id field not sent on edit
      const { id: _omit, city: _c, ...editPayload } = payload;
      await updateAdminVenue(id, editPayload);
      dispatch(showToast({ message: 'Venue updated successfully', type: 'success' }));
    }
    setVenueModal(null);
    await load();
  } catch (err) {
    dispatch(showToast({ message: err.message, type: 'error' }));
  } finally {
    setFormSaving(false);
  }
};
```
Note: `city` is included on add but the PATCH endpoint does not expose it in the `allowed` array — so omit `city` from edit payload. The `allowed` array in the existing PATCH handler is: `name, shortName, address, location, operatingHours, startingPrice, badge, imageUrl, rating, reviewsCount`.

### Form JSX — rendered inside `<DetailDialog title={venueModal?.mode === 'add' ? 'Add Venue' : 'Edit Venue'} onClose={() => setVenueModal(null)}>`:
```jsx
<form onSubmit={saveVenue} noValidate>
  {VENUE_FORM_FIELDS
    .filter(({ addOnly }) => !addOnly || venueModal?.mode === 'add')
    .map(({ key, label, type, placeholder, required }) => (
      <div key={key} style={{ marginBottom: '0.9rem' }}>
        <label htmlFor={`venue-${key}`} style={{ display: 'block', marginBottom: '0.3rem', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-muted)' }}>
          {label}{required && <span aria-hidden="true" style={{ color: 'var(--brand-danger)' }}> *</span>}
        </label>
        <input
          id={`venue-${key}`}
          type={type === 'url' ? 'text' : type}
          placeholder={placeholder ?? ''}
          value={venueForm[key] ?? ''}
          onChange={(ev) => setVenueForm((prev) => ({ ...prev, [key]: ev.target.value }))}
          style={{
            width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${formErrors[key] ? 'var(--brand-danger)' : 'var(--border-subtle)'}`,
            backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
          aria-describedby={formErrors[key] ? `venue-${key}-err` : undefined}
          aria-invalid={!!formErrors[key]}
        />
        {formErrors[key] && (
          <span id={`venue-${key}-err`} role="alert" style={{ color: 'var(--brand-danger)', fontSize: 'var(--text-xs)' }}>
            {formErrors[key]}
          </span>
        )}
      </div>
    ))}
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
    <button type="button" onClick={() => setVenueModal(null)} disabled={formSaving}
      style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
      Cancel
    </button>
    <button type="submit" disabled={formSaving}
      style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--gradient-cta)', color: '#fff', fontWeight: 'var(--fw-semibold)', cursor: formSaving ? 'wait' : 'pointer' }}>
      {formSaving ? 'Saving…' : (venueModal?.mode === 'add' ? 'Create Venue' : 'Save Changes')}
    </button>
  </div>
</form>
```

### Wire "Add Venue" button in `SectionHead`:
```jsx
<SectionHead title="Venues & Courts" action={
  <button type="button" onClick={openAddVenue}
    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--gradient-cta)', color: '#fff', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
    <Plus size={15} aria-hidden="true" /> Add Venue
  </button>
} />
```

### Wire "Edit" button per venue:
Add an Edit button to the venue header row (next to the existing `ToggleBtn`):
```jsx
<button type="button" onClick={() => openEditVenue(venue)} aria-label={`Edit ${venue.name}`}
  style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
  <Pencil size={13} aria-hidden="true" /> Edit
</button>
```

### Render venue modal:
```jsx
{venueModal && (
  <DetailDialog title={venueModal.mode === 'add' ? 'Add Venue' : `Edit: ${venueModal.venue?.name}`} onClose={() => !formSaving && setVenueModal(null)}>
    {/* form JSX from above */}
  </DetailDialog>
)}
```

**Verify:** `npm run dev` → Admin → Venues → click "Add Venue" → fill form → submit → new venue appears in list. Click "Edit" → form pre-fills → change a field → save → list updates. Check Network tab for `POST /api/v1/admin/venues` and `PATCH /api/v1/admin/venues/:id`.

---

## Item 7 — Frontend: VenuesPanel — Delete venue with safety check

**What:** Add a Delete button per venue that calls `deleteAdminVenue`. If the backend returns 400 (active bookings), show an error toast. Otherwise confirm deletion and reload the list.

**File:** `src/pages/AdminDashboard.jsx`

### Delete confirmation dialog state (already added in Item 6): `deleteConfirm`.

### Open delete confirmation:
```js
const confirmDeleteVenue = (venue) => {
  setDeleteConfirm(venue);
};
```

### Execute delete:
```js
const executeDeleteVenue = async () => {
  if (!deleteConfirm) return;
  setDeleting(true);
  try {
    await deleteAdminVenue(deleteConfirm.id);
    dispatch(showToast({ message: `Venue "${deleteConfirm.name}" deleted`, type: 'success' }));
    setDeleteConfirm(null);
    await load();
  } catch (err) {
    // Backend returns descriptive message when active bookings exist
    dispatch(showToast({ message: err.message, type: 'error' }));
    setDeleteConfirm(null);
  } finally {
    setDeleting(false);
  }
};
```

### Delete button per venue header (add after the Edit button):
```jsx
<button type="button" onClick={() => confirmDeleteVenue(venue)} aria-label={`Delete ${venue.name}`}
  style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--brand-danger) 40%, transparent)', background: 'var(--color-danger-soft)', color: 'var(--brand-danger)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
  <Trash2 size={13} aria-hidden="true" /> Delete
</button>
```

### Delete confirmation dialog JSX (add alongside venue modal render):
```jsx
{deleteConfirm && (
  <DetailDialog title="Delete Venue" onClose={() => !deleting && setDeleteConfirm(null)}>
    <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
      Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
    </p>
    <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
      This will also delete all courts and pricing rules for this venue.
      Venues with active (Pending or Confirmed) bookings cannot be deleted — deactivate them instead.
    </p>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
      <button type="button" onClick={() => setDeleteConfirm(null)} disabled={deleting}
        style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        Cancel
      </button>
      <button type="button" onClick={executeDeleteVenue} disabled={deleting}
        style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--brand-danger)', color: '#fff', fontWeight: 'var(--fw-semibold)', cursor: deleting ? 'wait' : 'pointer' }}>
        {deleting ? 'Deleting…' : 'Delete Venue'}
      </button>
    </div>
  </DetailDialog>
)}
```

**Verify:** Click Delete on a venue that has PENDING/CONFIRMED bookings — expect error toast with the active-bookings message. Click Delete on a venue with no active bookings, confirm — venue removed from list.

---

## Item 8 — Frontend: VenuesPanel — replace `window.confirm` with DetailDialog

**What:** The existing `toggleVenue` and `toggleCourt` functions use `window.confirm`. Replace them with the same `DetailDialog` confirmation pattern used elsewhere.

**File:** `src/pages/AdminDashboard.jsx`

### Add state to `VenuesPanel`:
```js
const [toggleConfirm, setToggleConfirm] = useState(null);
// shape: { type: 'venue'|'court', id, currentActive, name }
```

### Replace the two `window.confirm` calls in `toggleVenue` and `toggleCourt`:
```js
const toggleVenue = async (venueId, current, name) => {
  if (current) { setToggleConfirm({ type: 'venue', id: venueId, currentActive: current, name }); return; }
  // Activating — no confirmation needed
  setToggling(venueId);
  try {
    await updateVenueStatus(venueId, true);
    dispatch(showToast({ message: 'Venue activated', type: 'success' }));
    await load();
  } catch (e) { dispatch(showToast({ message: e.message, type: 'error' })); }
  finally { setToggling(null); }
};

const toggleCourt = async (courtId, current, name) => {
  if (current) { setToggleConfirm({ type: 'court', id: courtId, currentActive: current, name }); return; }
  setToggling(courtId);
  try {
    await updateCourtStatus(courtId, true);
    dispatch(showToast({ message: 'Court activated', type: 'success' }));
    await load();
  } catch (e) { dispatch(showToast({ message: e.message, type: 'error' })); }
  finally { setToggling(null); }
};

const executeToggle = async () => {
  if (!toggleConfirm) return;
  const { type, id, name } = toggleConfirm;
  setToggling(id);
  setToggleConfirm(null);
  try {
    if (type === 'venue') { await updateVenueStatus(id, false); dispatch(showToast({ message: `Venue "${name}" deactivated`, type: 'success' })); }
    else                  { await updateCourtStatus(id, false); dispatch(showToast({ message: `Court "${name}" deactivated`, type: 'success' })); }
    await load();
  } catch (e) { dispatch(showToast({ message: e.message, type: 'error' })); }
  finally { setToggling(null); }
};
```

Update the `ToggleBtn` call sites to pass the venue/court name:
```jsx
// For venue:
onToggle={() => toggleVenue(venue.id, venue.isActive, venue.name)}
// For court:
onToggle={() => toggleCourt(court.id, court.isActive, court.name)}
```

### Deactivation confirmation dialog JSX:
```jsx
{toggleConfirm && (
  <DetailDialog title={`Deactivate ${toggleConfirm.type === 'venue' ? 'Venue' : 'Court'}`} onClose={() => setToggleConfirm(null)}>
    <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
      Deactivate <strong>{toggleConfirm.name}</strong>? It will no longer be available for new bookings.
    </p>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
      <button type="button" onClick={() => setToggleConfirm(null)}
        style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        Cancel
      </button>
      <button type="button" onClick={executeToggle}
        style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--brand-danger)', color: '#fff', fontWeight: 'var(--fw-semibold)', cursor: 'pointer' }}>
        Deactivate
      </button>
    </div>
  </DetailDialog>
)}
```

**Verify:** Clicking the toggle on an active venue/court opens the DetailDialog. Confirming sends the PATCH request and the status badge updates.

---

## Item 9 — Frontend: PricingPanel enhancements

**What:** Two additions to `PricingPanel`:
1. Search/filter input that filters the visible court pricing editors by venue name or court name (client-side — no extra API call since the full list is already loaded).
2. An informational warning banner explaining that editing pricing does not affect existing bookings.

**File:** `src/pages/AdminDashboard.jsx`

### State addition to `PricingPanel`:
```js
const [pricingSearch, setPricingSearch] = useState('');
```

### Warning banner — add after the existing description `<p>`:
```jsx
<div role="note" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent-soft)', border: '1px solid color-mix(in srgb, var(--brand-accent) 30%, transparent)', marginBottom: '1rem', fontSize: 'var(--text-xs)', color: 'var(--brand-accent)' }}>
  <TrendingUp size={14} style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
  <span>Editing pricing rules does not change the amount of existing bookings. Only new bookings will use updated prices.</span>
</div>
```
(`TrendingUp` is already imported.)

### Search input — add after the warning banner:
```jsx
<div style={{ position: 'relative', maxWidth: '320px', marginBottom: '1rem' }}>
  <Search size={14} color="var(--text-faint)" aria-hidden="true" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
  <input
    type="search" placeholder="Filter by venue or court name…" value={pricingSearch}
    onChange={(e) => setPricingSearch(e.target.value)}
    aria-label="Filter pricing rules"
    style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
    onFocus={(e) => (e.target.style.borderColor = 'var(--brand-primary)')}
    onBlur={(e)  => (e.target.style.borderColor = 'var(--border-subtle)')}
  />
</div>
```

### Filter the court list — change the existing flatMap render:
```jsx
{venues
  .flatMap((venue) =>
    (venue.courts ?? [])
      .filter((court) => {
        if (!pricingSearch.trim()) return true;
        const q = pricingSearch.toLowerCase();
        return venue.name.toLowerCase().includes(q) || court.name.toLowerCase().includes(q);
      })
      .map((court) => (
        <PricingEditor key={court.id} venue={venue} court={court} onSaved={load} />
      ))
  )
}
```

**Verify:** Type a venue name in the filter — only matching courts visible. Clear → all courts visible. Warning banner is always displayed above the filter.

---

## Item 10 — Frontend: UsersPanel enhancements

**What:** Four improvements to `UsersPanel`:

### 10a — Add email column

The `GET /admin/users` response now includes `email` (after Item 3). Add it to the table.

Add `<Th>Email</Th>` after the existing `<Th>Phone</Th>` header.
Add `<Td><span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{u.email ?? '—'}</span></Td>` in the row.
Update the empty-state `colSpan` from `7` to `8`.
Also add to the `DetailDialog`: `<DetailLine label="Email" value={userDetails.email} />`.

### 10b — Prevent admin from deactivating themselves

The backend already guards this (returns 403). Add a matching frontend guard so the ToggleBtn is disabled for the logged-in admin.

Add at the top of `UsersPanel`:
```js
const currentAdmin = useSelector(selectAuthUser);
```
(Import `useSelector` from `react-redux` — already imported at the top of the file. Import `selectAuthUser` from `'../features/auth/authSlice'`.)

In the `ToggleBtn` render, add `disabled` when the user is the current admin:
```jsx
const isSelf = u.id === currentAdmin?.id;
// ...
<ToggleBtn
  active={u.isActive}
  loading={toggling === u.id}
  onToggle={() => !isSelf && toggleUser(u.id, u.isActive)}
/>
// Optionally show a tooltip:
// wrap in a <span title={isSelf ? "You cannot deactivate your own account" : undefined}>
```

Alternatively, replace `ToggleBtn` with a disabled version when `isSelf`:
```jsx
{isSelf
  ? <span title="Cannot deactivate your own account" style={{ color: 'var(--text-faint)', fontSize: 'var(--text-xs)' }}>You</span>
  : <ToggleBtn active={u.isActive} loading={toggling === u.id} onToggle={() => toggleUser(u.id, u.isActive)} />
}
```

### 10c — Replace `window.confirm` in `toggleUser` with DetailDialog

Add state to `UsersPanel`:
```js
const [deactivateConfirm, setDeactivateConfirm] = useState(null); // null | user object
```

Replace the existing `toggleUser` function:
```js
const toggleUser = (userId, current) => {
  const user = data.users.find((u) => u.id === userId);
  if (current && user) {
    // Deactivating — show confirmation
    setDeactivateConfirm(user);
    return;
  }
  // Activating — no confirmation needed
  doToggleUser(userId, false);
};

const doToggleUser = async (userId, current) => {
  setToggling(userId);
  try {
    await updateUserStatus(userId, !current);
    dispatch(showToast({ message: `User ${!current ? 'activated' : 'deactivated'}`, type: 'success' }));
    await load();
  } catch (e) { dispatch(showToast({ message: e.message, type: 'error' })); }
  finally { setToggling(null); }
};

const executeDeactivate = async () => {
  if (!deactivateConfirm) return;
  const user = deactivateConfirm;
  setDeactivateConfirm(null);
  doToggleUser(user.id, true);
};
```

Deactivation confirmation dialog JSX (add alongside existing `userDetails` DetailDialog):
```jsx
{deactivateConfirm && (
  <DetailDialog title="Deactivate User Account" onClose={() => setDeactivateConfirm(null)}>
    <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
      Deactivate <strong>{deactivateConfirm.name ?? deactivateConfirm.phone}</strong>? They will not be able to log in until reactivated.
    </p>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
      <button type="button" onClick={() => setDeactivateConfirm(null)}
        style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        Cancel
      </button>
      <button type="button" onClick={executeDeactivate}
        style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--brand-danger)', color: '#fff', fontWeight: 'var(--fw-semibold)', cursor: 'pointer' }}>
        Deactivate
      </button>
    </div>
  </DetailDialog>
)}
```

### 10d — Update `selectAuthUser` import

At the top of `AdminDashboard.jsx`, the file currently imports from `react-redux` (`useDispatch`) and from `'../features/booking/bookingSlice'` (`showToast`). Add:
```js
import { useSelector } from 'react-redux';
import { selectAuthUser } from '../features/auth/authSlice';
```

**Verify:** Admin → Users:
- Email column visible (null shown as `—` for phone-only users).
- The row for the currently logged-in admin shows "You" instead of the toggle button.
- Clicking the toggle on another active user opens the DetailDialog confirmation.
- Confirming calls `PATCH /api/v1/admin/users/:id/status`.
- Attempting to deactivate self (if somehow triggered) is blocked by the backend 403 and surfaced as an error toast.

---

## Summary of all files modified

| File | Changes |
|---|---|
| `server/src/routes/admin.js` | + `GET /admin/venues/:id`, `DELETE /admin/venues/:id`; updated `GET /admin/users` select to include `email` |
| `src/services/bookingService.js` | + `getAdminVenueById`, `createAdminVenue`, `updateAdminVenue`, `deleteAdminVenue` |
| `src/pages/AdminDashboard.jsx` | BookingsPanel: Approve/Reject buttons, confirmation dialog, paymentStatus column, debounced search, improved empty state. VenuesPanel: Add/Edit/Delete venue modals, confirmation dialogs replacing window.confirm. PricingPanel: search filter + warning banner. UsersPanel: email column, self-deactivation guard, confirmation dialog replacing window.confirm, `selectAuthUser` import. |

## Dependencies / ordering

- Items 1–3 (backend) and Item 4 (service layer) must be done before their corresponding UI items.
- Items 5–10 (frontend) are independent of each other and can be done in any order once Items 1–4 are complete.
- No schema migration is needed. No new npm packages are required.
- No changes to routes, App.jsx, or any user-facing page.
