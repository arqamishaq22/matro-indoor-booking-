/**
 * VenuesPage.jsx — /admin/venues
 * List, add, edit, delete, activate/deactivate venues and their courts.
 * Venue deletion is blocked by the backend when active bookings exist.
 * Court add/edit modals use the shared COURT_FORM_FIELDS definitions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Search, Plus, Pencil, Trash2, Building2, Activity, XCircle, Layers, RefreshCw } from 'lucide-react';
import { showToast } from '../../features/booking/bookingSlice';
import {
  getAdminVenues, updateVenueStatus, updateCourtStatus,
  createAdminVenue, updateAdminVenue, deleteAdminVenue,
  createAdminCourt, updateAdminCourt,
} from '../../services/bookingService';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import {
  SectionHead, TableWrap, Th, Td, ToggleBtn, ListSkeleton, StatCard,
} from '../../components/admin/tableHelpers';
import DetailDialog from '../../components/admin/DetailDialog';
import {
  VENUE_FORM_FIELDS, validateVenueForm,
  COURT_FORM_FIELDS, COURT_SPORTS, validateCourtForm,
} from '../../components/admin/adminShared';

/* ─── Inline form field renderer ─────────────────────────────────────── */
const FormField = ({ field, value, error, onChange, mode }) => {
  const { key, label, type, placeholder, required, addOnly, options } = field;
  if (addOnly && mode !== 'add') return null;

  const inputStyle = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
    border: `1.5px solid ${error ? 'var(--brand-danger)' : 'var(--border-subtle)'}`,
    backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <label htmlFor={`form-${key}`} style={{ display: 'block', marginBottom: '0.3rem', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-muted)' }}>
        {label}{required && <span aria-hidden="true" style={{ color: 'var(--brand-danger)' }}> *</span>}
      </label>
      {type === 'select' ? (
        <select
          id={`form-${key}`}
          value={value ?? ''}
          onChange={(ev) => onChange(key, ev.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
          aria-invalid={!!error}
        >
          <option value="">— Select —</option>
          {(options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
      ) : (
        <input
          id={`form-${key}`}
          type={type === 'number' ? 'number' : 'text'}
          placeholder={placeholder ?? ''}
          value={value ?? ''}
          onChange={(ev) => onChange(key, ev.target.value)}
          style={inputStyle}
          aria-describedby={error ? `form-${key}-err` : undefined}
          aria-invalid={!!error}
        />
      )}
      {error && (
        <span id={`form-${key}-err`} role="alert" style={{ color: 'var(--brand-danger)', fontSize: 'var(--text-xs)' }}>
          {error}
        </span>
      )}
    </div>
  );
};

const VenuesPage = () => {
  const dispatch = useDispatch();
  const [venues,  setVenues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [toggling, setToggling] = useState(null);

  /* Venue modal state */
  const [venueModal, setVenueModal] = useState(null);
  const [venueForm, setVenueForm] = useState({});
  const [formSaving, setFormSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  /* Court modal state */
  const [courtModal, setCourtModal] = useState(null); // { mode: 'add'|'edit', venueId?, venueName?, court? }
  const [courtForm, setCourtForm] = useState({});
  const [courtFormSaving, setCourtFormSaving] = useState(false);
  const [courtFormErrors, setCourtFormErrors] = useState({});

  /* Delete / deactivation confirmations */
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState(null);

  /* Search & filter */
  const [venueSearch, setVenueSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setVenues(await getAdminVenues()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ─── Computed stats from loaded venues ──────────────────────────── */
  const totalVenues   = venues.length;
  const activeVenues  = venues.filter((v) => v.isActive).length;
  const inactiveVenues = totalVenues - activeVenues;
  const totalCourts   = venues.reduce((sum, v) => sum + (v.courts?.length ?? 0), 0);

  /* ─── Filter ────────────────────────────────────────────────────── */
  const filteredVenues = venues.filter((venue) => {
    const q = venueSearch.toLowerCase();
    const matchSearch = !venueSearch
      || venue.name.toLowerCase().includes(q)
      || (venue.city ?? '').toLowerCase().includes(q)
      || (venue.location ?? '').toLowerCase().includes(q)
      || (venue.address ?? '').toLowerCase().includes(q);
    const matchFilter = !venueFilter || (venueFilter === 'active' ? venue.isActive : !venue.isActive);
    return matchSearch && matchFilter;
  });

  /* ─── Venue CRUD handlers ───────────────────────────────────────── */
  const openAddVenue = () => {
    setVenueForm({});
    setFormErrors({});
    setVenueModal({ mode: 'add' });
  };

  const openEditVenue = (venue) => {
    setVenueForm({
      name: venue.name, shortName: venue.shortName,
      address: venue.address, location: venue.location,
      operatingHours: venue.operatingHours,
      startingPrice: venue.startingPrice,
      badge: venue.badge ?? '',
      imageUrl: venue.imageUrl ?? '',
    });
    setFormErrors({});
    setVenueModal({ mode: 'edit', venue });
  };

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
        const venueId = venueModal.venue.id;
        const { id: _omit, city: _c, ...editPayload } = payload;
        await updateAdminVenue(venueId, editPayload);
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

  /* ─── Court CRUD handlers ───────────────────────────────────────── */
  const openAddCourt = (venue) => {
    setCourtForm({});
    setCourtFormErrors({});
    setCourtModal({ mode: 'add', venueId: venue.id, venueName: venue.name });
  };

  const openEditCourt = (court, venueName) => {
    setCourtForm({
      name: court.name,
      surfaceType: court.surfaceType ?? '',
      sortOrder: court.sortOrder ?? 0,
    });
    setCourtFormErrors({});
    setCourtModal({ mode: 'edit', court, venueName });
  };

  const saveCourt = async (e) => {
    e.preventDefault();
    const mode = courtModal.mode;
    const errs = validateCourtForm(courtForm, mode);
    if (Object.keys(errs).length) { setCourtFormErrors(errs); return; }
    setCourtFormSaving(true);
    try {
      if (mode === 'add') {
        const payload = {
          id: courtForm.id,
          name: courtForm.name,
          sport: courtForm.sport,
          ...(courtForm.surfaceType ? { surfaceType: courtForm.surfaceType } : {}),
          ...(courtForm.sortOrder !== undefined && courtForm.sortOrder !== '' ? { sortOrder: Number(courtForm.sortOrder) } : {}),
        };
        await createAdminCourt(courtModal.venueId, payload);
        dispatch(showToast({ message: 'Court created successfully', type: 'success' }));
      } else {
        const payload = {
          name: courtForm.name,
          ...(courtForm.surfaceType !== undefined ? { surfaceType: courtForm.surfaceType } : {}),
          ...(courtForm.sortOrder !== undefined && courtForm.sortOrder !== '' ? { sortOrder: Number(courtForm.sortOrder) } : {}),
        };
        await updateAdminCourt(courtModal.court.id, payload);
        dispatch(showToast({ message: 'Court updated successfully', type: 'success' }));
      }
      setCourtModal(null);
      await load();
    } catch (err) {
      dispatch(showToast({ message: err.message, type: 'error' }));
    } finally {
      setCourtFormSaving(false);
    }
  };

  /* ─── Venue delete ──────────────────────────────────────────────── */
  const confirmDeleteVenue = (venue) => {
    setDeleteConfirm(venue);
  };

  const executeDeleteVenue = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteAdminVenue(deleteConfirm.id);
      dispatch(showToast({ message: `Venue "${deleteConfirm.name}" deleted`, type: 'success' }));
      setDeleteConfirm(null);
      await load();
    } catch (err) {
      dispatch(showToast({ message: err.message, type: 'error' }));
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  /* ─── Toggle status ─────────────────────────────────────────────── */
  const toggleVenue = async (venueId, current, name) => {
    if (current) { setToggleConfirm({ type: 'venue', id: venueId, currentActive: current, name }); return; }
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

  return (
    <div>
      <SectionHead title="Venues & Courts" action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh venues"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--fw-medium)',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} aria-hidden="true" /> Refresh
          </button>
          <button type="button" onClick={openAddVenue}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--gradient-cta)', color: '#fff', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            <Plus size={15} aria-hidden="true" /> Add Venue
          </button>
        </div>
      } />

      {/* ─── Stat cards ──────────────────────────────────────────────── */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <StatCard icon={Building2} label="Total Venues"    value={totalVenues}    color="var(--brand-primary)" />
          <StatCard icon={Activity}  label="Active Venues"   value={activeVenues}   color="#22c55e" />
          <StatCard icon={XCircle}   label="Inactive Venues" value={inactiveVenues} color="var(--brand-danger)" />
          <StatCard icon={Layers}    label="Total Courts"    value={totalCourts}    color="#8b5cf6" />
        </div>
      )}

      {/* Search and filter */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} color="var(--text-faint)" aria-hidden="true" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="search" placeholder="Search by name, city, location, or address…" value={venueSearch}
            onChange={(e) => setVenueSearch(e.target.value)}
            aria-label="Search venues"
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}
          aria-label="Filter by status"
          style={{ flex: '0 0 160px', width: 'auto', minWidth: '130px', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
        >
          <option value="">All Venues</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? <ListSkeleton rows={5} />
       : error   ? <ErrorState message={error} onRetry={load} compact />
       : filteredVenues.length === 0 ? <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No venues found.</p>
       : filteredVenues.map((venue) => (
        <div key={venue.id} style={{ marginBottom: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-card)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {/* Venue header */}
          <div style={{ padding: '1rem 1.25rem', backgroundColor: venue.isActive ? 'var(--bg-surface-card)' : 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Image thumbnail */}
            {venue.imageUrl && (
              <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <img src={venue.imageUrl} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: venue.isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>{venue.name}</h3>
                <StatusBadge status={venue.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                {venue.badge && (
                  <span style={{ padding: '1px 6px', borderRadius: 'var(--radius-full)', fontSize: '0.6rem', fontWeight: 'var(--fw-bold)', backgroundColor: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)', color: 'var(--brand-primary)', border: '1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)' }}>{venue.badge}</span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {venue.city} · {venue.location} · {venue.courts?.length ?? 0} courts
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                {venue.address}
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '4px', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span>⏰ {venue.operatingHours}</span>
                <span>💰 From Rs. {Number(venue.startingPrice ?? 0).toLocaleString()}/hr</span>
                {venue.createdAt && <span>📅 Added {new Date(venue.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => openAddCourt(venue)} aria-label={`Add court to ${venue.name}`}
                style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--brand-primary) 40%, transparent)', background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)', color: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--text-xs)', cursor: 'pointer', fontWeight: 'var(--fw-semibold)' }}>
                <Plus size={13} aria-hidden="true" /> Court
              </button>
              <button type="button" onClick={() => openEditVenue(venue)} aria-label={`Edit ${venue.name}`}
                style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
                <Pencil size={13} aria-hidden="true" /> Edit
              </button>
              <button type="button" onClick={() => confirmDeleteVenue(venue)} aria-label={`Delete ${venue.name}`}
                style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--brand-danger) 40%, transparent)', background: 'var(--color-danger-soft)', color: 'var(--brand-danger)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
                <Trash2 size={13} aria-hidden="true" /> Delete
              </button>
              <ToggleBtn active={venue.isActive} loading={toggling === venue.id} onToggle={() => toggleVenue(venue.id, venue.isActive, venue.name)} />
            </div>
          </div>
          {/* Courts table */}
          <div style={{ overflowX: 'auto' }} className="hide-scrollbar">
            <table style={{ width: '100%', minWidth: '540px', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr>
                  <Th>Court</Th>
                  <Th>Sport</Th>
                  <Th>Surface</Th>
                  <Th>Order</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(venue.courts ?? []).length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>No courts yet — add one above</td></tr>
                ) : (venue.courts ?? []).map((court) => (
                  <tr key={court.id} style={{ backgroundColor: 'var(--bg-surface-card)' }}>
                    <Td><span style={{ fontWeight: 'var(--fw-semibold)' }}>{court.name}</span></Td>
                    <Td><span style={{ textTransform: 'capitalize' }}>{court.sport}</span></Td>
                    <Td><span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{court.surfaceType ?? '—'}</span></Td>
                    <Td><span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{court.sortOrder ?? 0}</span></Td>
                    <Td><StatusBadge status={court.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" /></Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button type="button" onClick={() => openEditCourt(court, venue.name)} aria-label={`Edit court ${court.name}`}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
                          <Pencil size={12} aria-hidden="true" /> Edit
                        </button>
                        <ToggleBtn active={court.isActive} loading={toggling === court.id} onToggle={() => toggleCourt(court.id, court.isActive, court.name)} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* ─── Add / Edit venue modal ──────────────────────────────────── */}
      {venueModal && (
        <DetailDialog
          title={venueModal.mode === 'add' ? 'Add Venue' : `Edit: ${venueModal.venue?.name}`}
          onClose={() => !formSaving && setVenueModal(null)}
        >
          <form onSubmit={saveVenue} noValidate>
            {VENUE_FORM_FIELDS
              .filter(({ addOnly }) => !addOnly || venueModal.mode === 'add')
              .map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={venueForm[field.key]}
                  error={formErrors[field.key]}
                  onChange={(k, v) => setVenueForm((prev) => ({ ...prev, [k]: v }))}
                  mode={venueModal.mode}
                />
              ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" onClick={() => setVenueModal(null)} disabled={formSaving}
                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={formSaving}
                style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--gradient-cta)', color: '#fff', fontWeight: 'var(--fw-semibold)', cursor: formSaving ? 'wait' : 'pointer' }}>
                {formSaving ? 'Saving…' : (venueModal.mode === 'add' ? 'Create Venue' : 'Save Changes')}
              </button>
            </div>
          </form>
        </DetailDialog>
      )}

      {/* ─── Add / Edit court modal ──────────────────────────────────── */}
      {courtModal && (
        <DetailDialog
          title={courtModal.mode === 'add' ? `Add Court — ${courtModal.venueName}` : `Edit Court: ${courtModal.court?.name}`}
          onClose={() => !courtFormSaving && setCourtModal(null)}
        >
          <form onSubmit={saveCourt} noValidate>
            {courtModal.mode === 'edit' && (
              <p style={{ margin: '0 0 1rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Venue: <strong style={{ color: 'var(--text-secondary)' }}>{courtModal.venueName}</strong> · Sport: <strong style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{courtModal.court?.sport}</strong>
              </p>
            )}
            {COURT_FORM_FIELDS
              .filter(({ addOnly }) => !addOnly || courtModal.mode === 'add')
              .map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={courtForm[field.key]}
                  error={courtFormErrors[field.key]}
                  onChange={(k, v) => setCourtForm((prev) => ({ ...prev, [k]: v }))}
                  mode={courtModal.mode}
                />
              ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" onClick={() => setCourtModal(null)} disabled={courtFormSaving}
                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={courtFormSaving}
                style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--gradient-cta)', color: '#fff', fontWeight: 'var(--fw-semibold)', cursor: courtFormSaving ? 'wait' : 'pointer' }}>
                {courtFormSaving ? 'Saving…' : (courtModal.mode === 'add' ? 'Create Court' : 'Save Changes')}
              </button>
            </div>
          </form>
        </DetailDialog>
      )}

      {/* Delete confirmation */}
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

      {/* Deactivation confirmation */}
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
    </div>
  );
};

export default VenuesPage;
