/**
 * PricingPage.jsx — /admin/pricing
 * Per-rule pricing management: list, search, filter, add, edit,
 * activate/deactivate, and delete pricing rules.
 *
 * Editing or deleting a pricing rule NEVER changes the recorded amount of
 * an existing booking — bookings store a price snapshot at creation time.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  Search, Plus, Pencil, Trash2, RefreshCw, TrendingUp,
  DollarSign, CheckCircle2, XCircle, Building2, X, SlidersHorizontal
} from 'lucide-react';
import { showToast } from '../../features/booking/bookingSlice';
import {
  getAdminPricing, getAdminVenues,
  createAdminPricingRule, updateAdminPricingRule,
  updateAdminPricingRuleStatus, deleteAdminPricingRule,
} from '../../services/bookingService';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import {
  SectionHead, TableWrap, Th, Td, ListSkeleton, ToggleBtn, StatCard
} from '../../components/admin/tableHelpers';
import DetailDialog from '../../components/admin/DetailDialog';
import { pkr } from '../../components/admin/adminShared';

const DAY_TYPE_OPTIONS = [
  { value: 'weekday', label: 'Weekday (Mon–Thu)' },
  { value: 'weekend', label: 'Weekend (Fri–Sun)' },
];

const PERIOD_OPTIONS = [
  { value: 'off_peak', label: 'Off-peak (05:00–17:00)' },
  { value: 'peak',     label: 'Peak (17:00–05:00)' },
];

const PricingPage = () => {
  const dispatch = useDispatch();

  const [rules, setRules] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Filters */
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [dayTypeFilter, setDayTypeFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  /* Form / dialog state */
  const [formModal, setFormModal] = useState(null); // { mode: 'add'|'edit', rule? }
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [formSaving, setFormSaving] = useState(false);

  /* Confirmation dialogs */
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (venueFilter) params.venueId = venueFilter;
      if (dayTypeFilter) params.dayType = dayTypeFilter;
      if (periodFilter) params.period = periodFilter;
      if (statusFilter) params.isActive = statusFilter === 'active';
      if (search.trim()) params.search = search.trim();
      setRules(await getAdminPricing(params));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [venueFilter, dayTypeFilter, periodFilter, statusFilter, search]);

  /* Load venues once (for filter + form selects) */
  const loadVenues = useCallback(async () => {
    try {
      setVenues(await getAdminVenues());
    } catch (e) {
      dispatch(showToast({ message: `Failed to load venues: ${e.message}`, type: 'error' }));
    }
  }, [dispatch]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  useEffect(() => {
    load();
  }, [load]);

  /* Summary statistics derived from current rules */
  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.isActive).length;
    const inactive = total - active;
    const avg = total > 0
      ? Math.round(rules.reduce((acc, r) => acc + (r.pricePerHour || 0), 0) / total)
      : 0;
    return { total, active, inactive, avg };
  }, [rules]);

  const hasActiveFilters = Boolean(
    search || venueFilter || dayTypeFilter || periodFilter || statusFilter
  );

  const resetFilters = () => {
    setSearch('');
    setVenueFilter('');
    setDayTypeFilter('');
    setPeriodFilter('');
    setStatusFilter('');
  };

  /* ── Form helpers ─────────────────────────────────────────────────── */
  const openAdd = () => {
    setForm({
      venueId: '',
      courtId: '',
      dayType: '',
      period: '',
      pricePerHour: '',
      isActive: true,
    });
    setFormErrors({});
    setFormModal({ mode: 'add' });
  };

  const openEdit = (rule) => {
    setForm({
      venueId: rule.venueId ?? '',
      courtId: rule.courtId,
      dayType: rule.dayType,
      period: rule.period,
      pricePerHour: String(rule.pricePerHour),
      isActive: rule.isActive !== false,
    });
    setFormErrors({});
    setFormModal({ mode: 'edit', rule });
  };

  const validateForm = () => {
    const errs = {};
    if (formModal.mode === 'add') {
      if (!form.venueId) errs.venueId = 'Please select a venue.';
      if (!form.courtId) errs.courtId = 'Please select a court.';
      if (!form.dayType) errs.dayType = 'Please select a day type.';
      if (!form.period) errs.period = 'Please select a period.';
    }
    const price = Number(form.pricePerHour);
    if (form.pricePerHour === '' || !Number.isFinite(price)) {
      errs.pricePerHour = 'Price is required.';
    } else if (price < 0 || !Number.isInteger(price)) {
      errs.pricePerHour = 'Price must be a non-negative whole number.';
    }
    return errs;
  };

  const saveForm = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }

    setFormSaving(true);
    try {
      if (formModal.mode === 'add') {
        const payload = {
          courtId: form.courtId,
          dayType: form.dayType,
          period: form.period,
          pricePerHour: Number(form.pricePerHour),
          isActive: form.isActive !== false,
        };
        await createAdminPricingRule(payload);
        dispatch(showToast({ message: 'Pricing rule created successfully', type: 'success' }));
      } else {
        await updateAdminPricingRule(formModal.rule.id, {
          pricePerHour: Number(form.pricePerHour),
          isActive: form.isActive !== false,
        });
        dispatch(showToast({ message: 'Pricing rule updated successfully', type: 'success' }));
      }
      setFormModal(null);
      await load();
    } catch (err) {
      const msg = err.status === 409
        ? 'A pricing rule for this court, day type, and period already exists.'
        : err.message;
      dispatch(showToast({ message: msg, type: 'error' }));
      if (err.status === 409) {
        setFormErrors({ courtId: 'Combination already exists.' });
      }
    } finally {
      setFormSaving(false);
    }
  };

  /* ── Toggle activate / deactivate ─────────────────────────────────── */
  const toggleStatus = (rule) => {
    if (rule.isActive) {
      setToggleConfirm(rule);
      return;
    }
    setToggling(rule.id);
    updateAdminPricingRuleStatus(rule.id, true)
      .then(() => {
        dispatch(showToast({ message: `Pricing rule #${rule.id} activated`, type: 'success' }));
        return load();
      })
      .catch((e) => dispatch(showToast({ message: e.message, type: 'error' })))
      .finally(() => setToggling(null));
  };

  const executeToggle = async () => {
    if (!toggleConfirm) return;
    const rule = toggleConfirm;
    setToggling(rule.id);
    setToggleConfirm(null);
    try {
      await updateAdminPricingRuleStatus(rule.id, false);
      dispatch(showToast({ message: `Pricing rule #${rule.id} deactivated`, type: 'success' }));
      await load();
    } catch (e) {
      dispatch(showToast({ message: e.message, type: 'error' }));
    } finally {
      setToggling(null);
    }
  };

  /* ── Delete ───────────────────────────────────────────────────────── */
  const confirmDelete = (rule) => setDeleteConfirm(rule);

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteAdminPricingRule(deleteConfirm.id);
      dispatch(showToast({ message: `Pricing rule #${deleteConfirm.id} deleted`, type: 'success' }));
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      dispatch(showToast({ message: e.message, type: 'error' }));
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Derived data ─────────────────────────────────────────────────── */
  const courtsForVenue = (venueId) => {
    const venue = venues.find((v) => v.id === venueId);
    return venue?.courts ?? [];
  };

  const inputStyle = (key) => ({
    width: '100%',
    padding: '0.55rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    border: `1.5px solid ${formErrors[key] ? 'var(--brand-danger)' : 'var(--border-subtle)'}`,
    backgroundColor: 'var(--bg-surface-elevated)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  });

  return (
    <div>
      <SectionHead
        title="Pricing Management"
        action={
          <button
            type="button"
            onClick={openAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              border: 0,
              background: 'var(--gradient-cta)',
              color: '#fff',
              fontWeight: 'var(--fw-semibold)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-brand)',
            }}
          >
            <Plus size={16} aria-hidden="true" /> Add Pricing Rule
          </button>
        }
      />

      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
        Configure court pricing per hour across weekday/weekend and peak/off-peak operating windows.
      </p>

      {/* Stats summary cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem',
      }}>
        <StatCard
          icon={DollarSign}
          label="Total Rules"
          value={stats.total}
          sub="Configured rates"
          color="var(--brand-primary)"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Rules"
          value={stats.active}
          sub="Available for booking"
          color="var(--color-success)"
        />
        <StatCard
          icon={XCircle}
          label="Inactive Rules"
          value={stats.inactive}
          sub="Temporarily disabled"
          color="var(--brand-danger)"
        />
        <StatCard
          icon={Building2}
          label="Average Rate"
          value={stats.total > 0 ? pkr(stats.avg) : '—'}
          sub="Per hour average"
          color="var(--brand-accent)"
        />
      </div>

      {/* Snapshot protection note */}
      <div
        role="note"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '0.8rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'color-mix(in srgb, var(--brand-accent) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--brand-accent) 25%, transparent)',
          marginBottom: '1.25rem',
          fontSize: 'var(--text-xs)',
          color: 'var(--brand-accent)',
        }}
      >
        <TrendingUp size={16} style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
        <span>
          <strong>Historical Price Snapshot Protected:</strong> Modifying or deleting pricing rules affects only future bookings. Past and existing bookings preserve their originally recorded price snapshot.
        </span>
      </div>

      {/* Search & Filter section */}
      <div style={{ marginBottom: '1.25rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '0.85rem' }}>
          <Search
            size={16}
            color="var(--text-faint)"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            placeholder="Search venue or court…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search pricing rules"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem 0.6rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filters in one row under "Filter" heading */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 'var(--fw-bold)', color: 'var(--brand-primary)', letterSpacing: '0.02em' }}>
              Filter
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  aria-label="Reset all filters"
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--fw-medium)',
                    transition: 'color var(--transition-fast)',
                  }}
                >
                  <X size={13} aria-hidden="true" /> Reset Filters
                </button>
              )}
              <button
                type="button"
                onClick={load}
                aria-label="Refresh pricing rules"
                title="Refresh pricing data"
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--fw-medium)',
                }}
              >
                <RefreshCw size={13} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {/* Venue filter */}
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              aria-label="Filter by venue"
              style={{
                flex: '1 1 180px',
                minWidth: '140px',
                width: 'auto',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All venues</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>

            {/* Day type filter */}
            <select
              value={dayTypeFilter}
              onChange={(e) => setDayTypeFilter(e.target.value)}
              aria-label="Filter by day type"
              style={{
                flex: '1 1 180px',
                minWidth: '140px',
                width: 'auto',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All days</option>
              {DAY_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Period filter */}
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              aria-label="Filter by period"
              style={{
                flex: '1 1 180px',
                minWidth: '140px',
                width: 'auto',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All periods</option>
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              style={{
                flex: '1 1 180px',
                minWidth: '140px',
                width: 'auto',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table content */}
      {loading ? (
        <ListSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} compact />
      ) : rules.length === 0 ? (
        <div style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px dashed var(--border-subtle)',
        }}>
          <SlidersHorizontal size={36} color="var(--text-faint)" style={{ margin: '0 auto 0.75rem' }} aria-hidden="true" />
          <h3 style={{ margin: '0 0 0.5rem', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
            No pricing rules found
          </h3>
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            {hasActiveFilters
              ? 'No pricing records match the selected filters. Try clearing your search or filter settings.'
              : 'No pricing rules have been created yet. Click “Add Pricing Rule” above to create your first rule.'}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={openAdd}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                border: 0,
                background: 'var(--gradient-cta)',
                color: '#fff',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--fw-semibold)',
                cursor: 'pointer',
              }}
            >
              Add First Rule
            </button>
          )}
        </div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Venue</Th>
              <Th>Court</Th>
              <Th>Applicable Days</Th>
              <Th>Time Window</Th>
              <Th align="right">Price / Hour</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const isPeak = rule.period === 'peak';
              const isWeekend = rule.dayType === 'weekend';
              return (
                <tr
                  key={rule.id}
                  style={{
                    backgroundColor: rule.isActive ? 'var(--bg-surface-card)' : 'var(--bg-surface-elevated)',
                    opacity: rule.isActive ? 1 : 0.75,
                    transition: 'background-color var(--transition-fast)',
                  }}
                >
                  <Td>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-medium)' }}>
                      #{rule.id}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>
                      {rule.venueName}
                    </span>
                    {rule.venueCity && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {rule.venueCity}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
                      {rule.courtName}
                    </span>
                    {rule.sport && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {rule.sport} {rule.surfaceType ? `· ${rule.surfaceType}` : ''}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: isWeekend ? 'color-mix(in srgb, var(--brand-secondary) 15%, transparent)' : 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
                      color: isWeekend ? 'var(--brand-secondary)' : 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--fw-medium)',
                    }}>
                      {isWeekend ? 'Weekend (Fri–Sun)' : 'Weekday (Mon–Thu)'}
                    </span>
                  </Td>
                  <Td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: isPeak ? 'color-mix(in srgb, var(--brand-accent) 15%, transparent)' : 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                      color: isPeak ? 'var(--brand-accent)' : 'var(--color-success)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--fw-medium)',
                    }}>
                      {isPeak ? 'Peak (17:00–05:00)' : 'Off-peak (05:00–17:00)'}
                    </span>
                  </Td>
                  <Td align="right">
                    <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {pkr(rule.pricePerHour)}
                    </strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/hr</span>
                  </Td>
                  <Td>
                    <StatusBadge status={rule.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                  </Td>
                  <Td align="right">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(rule)}
                        aria-label={`Edit pricing rule #${rule.id}`}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-surface-elevated)',
                          color: 'var(--text-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: 'var(--text-xs)',
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={13} aria-hidden="true" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(rule)}
                        aria-label={`Delete pricing rule #${rule.id}`}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid color-mix(in srgb, var(--brand-danger) 40%, transparent)',
                          background: 'var(--color-danger-soft)',
                          color: 'var(--brand-danger)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: 'var(--text-xs)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} aria-hidden="true" /> Delete
                      </button>
                      <ToggleBtn
                        active={rule.isActive}
                        loading={toggling === rule.id}
                        onToggle={() => toggleStatus(rule)}
                      />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {/* Add / Edit Form Modal */}
      {formModal && (
        <DetailDialog
          title={formModal.mode === 'add' ? 'Add New Pricing Rule' : `Edit Pricing Rule #${formModal.rule?.id}`}
          onClose={() => !formSaving && setFormModal(null)}
        >
          <form onSubmit={saveForm} noValidate>
            {formModal.mode === 'edit' ? (
              /* Edit Mode: Display fixed rule identifiers as read-only metadata */
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1rem',
                display: 'grid',
                gap: '0.5rem',
                fontSize: 'var(--text-xs)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Venue:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formModal.rule?.venueName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Court:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {formModal.rule?.courtName} {formModal.rule?.sport ? `(${formModal.rule.sport})` : ''}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Day Schedule:</span>
                  <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {formModal.rule?.dayType === 'weekend' ? 'Weekend (Fri–Sun)' : 'Weekday (Mon–Thu)'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Time Window:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {formModal.rule?.period === 'peak' ? 'Peak (17:00–05:00)' : 'Off-peak (05:00–17:00)'}
                  </strong>
                </div>
                <div style={{
                  marginTop: '0.25rem',
                  paddingTop: '0.45rem',
                  borderTop: '1px dashed var(--border-subtle)',
                  color: 'var(--text-faint)',
                  fontSize: '11px',
                }}>
                  Scope fields (venue, court, day schedule, and period) are fixed identifiers for this rule. To change them, delete this rule and create a new one.
                </div>
              </div>
            ) : (
              /* Add Mode: Select venue, court, day schedule, and period */
              <>
                {/* Venue */}
                <div style={{ marginBottom: '0.9rem' }}>
                  <label htmlFor="pricing-venue" style={{ display: 'block', marginBottom: '0.3rem', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-muted)' }}>
                    Venue <span aria-hidden="true" style={{ color: 'var(--brand-danger)' }}>*</span>
                  </label>
                  <select
                    id="pricing-venue"
                    value={form.venueId}
                    onChange={(e) => setForm((p) => ({ ...p, venueId: e.target.value, courtId: '' }))}
                    aria-invalid={!!formErrors.venueId}
                    style={inputStyle('venueId')}
                  >
                    <option value="">Select a venue…</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.city})</option>
                    ))}
                  </select>
                  {formErrors.venueId && (
                    <span role="alert" style={{ color: 'var(--brand-danger)', fontSize: 'var(--text-xs)', marginTop: '3px', display: 'block' }}>
                      {formErrors.venueId}
                    </span>
                  )}
                </div>

                {/* Court */}
                <div style={{ marginBottom: '0.9rem' }}>
                  <label htmlFor="pricing-court" style={{ display: 'block', marginBottom: '0.3rem', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-muted)' }}>
                    Court <span aria-hidden="true" style={{ color: 'var(--brand-danger)' }}>*</span>
                  </label>
                  <select
                    id="pricing-court"
                    value={form.courtId}
                    onChange={(e) => setForm((p) => ({ ...p, courtId: e.target.value }))}
                    disabled={!form.venueId}
                    aria-invalid={!!formErrors.courtId}
                    style={{
                      ...inputStyle('courtId'),
                      cursor: !form.venueId ? 'not-allowed' : 'pointer',
                      opacity: !form.venueId ? 0.6 : 1,
                    }}
                  >
                    <option value="">{form.venueId ? 'Select a court…' : 'Select a venue first'}</option>
                    {courtsForVenue(form.venueId).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.sport}){c.isActive === false ? ' [Inactive]' : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.courtId && (
                    <span role="alert" style={{ color: 'var(--brand-danger)', fontSize: 'var(--text-xs)', marginTop: '3px', display: 'block' }}>
                      {formErrors.courtId}
                    </span>
                  )}
                </div>

                {/* Day type */}
                <div style={{ marginBottom: '0.9rem' }}>
                  <label htmlFor="pricing-daytype" style={{ display: 'block', marginBottom: '0.3rem', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-muted)' }}>
                    Day Schedule <span aria-hidden="true" style={{ color: 'var(--brand-danger)' }}>*</span>
                  </label>
                  <select
                    id="pricing-daytype"
                    value={form.dayType}
                    onChange={(e) => setForm((p) => ({ ...p, dayType: e.target.value }))}
                    aria-invalid={!!formErrors.dayType}
                    style={inputStyle('dayType')}
                  >
                    <option value="">Select day schedule…</option>
                    {DAY_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {formErrors.dayType && (
                    <span role="alert" style={{ color: 'var(--brand-danger)', fontSize: 'var(--text-xs)', marginTop: '3px', display: 'block' }}>
                      {formErrors.dayType}
                    </span>
                  )}
                </div>

                {/* Period */}
                <div style={{ marginBottom: '0.9rem' }}>
                  <label htmlFor="pricing-period" style={{ display: 'block', marginBottom: '0.3rem', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-muted)' }}>
                    Operating Window <span aria-hidden="true" style={{ color: 'var(--brand-danger)' }}>*</span>
                  </label>
                  <select
                    id="pricing-period"
                    value={form.period}
                    onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))}
                    aria-invalid={!!formErrors.period}
                    style={inputStyle('period')}
                  >
                    <option value="">Select operating window…</option>
                    {PERIOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {formErrors.period && (
                    <span role="alert" style={{ color: 'var(--brand-danger)', fontSize: 'var(--text-xs)', marginTop: '3px', display: 'block' }}>
                      {formErrors.period}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Price */}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="pricing-price" style={{ display: 'block', marginBottom: '0.3rem', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-muted)' }}>
                Price Per Hour (PKR) <span aria-hidden="true" style={{ color: 'var(--brand-danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="pricing-price"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 2500"
                  value={form.pricePerHour}
                  onChange={(e) => setForm((p) => ({ ...p, pricePerHour: e.target.value }))}
                  aria-describedby={formErrors.pricePerHour ? 'pricing-price-err' : undefined}
                  aria-invalid={!!formErrors.pricePerHour}
                  style={inputStyle('pricePerHour')}
                />
              </div>
              {formErrors.pricePerHour && (
                <span id="pricing-price-err" role="alert" style={{ color: 'var(--brand-danger)', fontSize: 'var(--text-xs)', marginTop: '3px', display: 'block' }}>
                  {formErrors.pricePerHour}
                </span>
              )}
            </div>

            {/* Active Status Checkbox */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  style={{ accentColor: 'var(--brand-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 'var(--fw-medium)' }}>Active for booking</span>
              </label>
              <span style={{ display: 'block', marginLeft: '1.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                When active, customer booking calculations will use this rate for eligible slots.
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setFormModal(null)}
                disabled={formSaving}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  cursor: formSaving ? 'wait' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: 0,
                  background: 'var(--gradient-cta)',
                  color: '#fff',
                  fontWeight: 'var(--fw-semibold)',
                  cursor: formSaving ? 'wait' : 'pointer',
                  opacity: formSaving ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {formSaving ? 'Saving…' : (formModal.mode === 'add' ? 'Create Rule' : 'Save Changes')}
              </button>
            </div>
          </form>
        </DetailDialog>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <DetailDialog title="Delete Pricing Rule" onClose={() => !deleting && setDeleteConfirm(null)}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Are you sure you want to delete pricing rule <strong>#{deleteConfirm.id}</strong> for <strong>{deleteConfirm.courtName}</strong> ({deleteConfirm.dayType} · {deleteConfirm.period})?
          </p>
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-elevated)',
            marginBottom: '1.25rem',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}>
            <strong>Historical Integrity Preserved:</strong> Existing bookings are completely unaffected — they keep their originally captured price snapshot.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeDelete}
              disabled={deleting}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: 0,
                background: 'var(--brand-danger)',
                color: '#fff',
                fontWeight: 'var(--fw-semibold)',
                cursor: deleting ? 'wait' : 'pointer',
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? 'Deleting…' : 'Delete Rule'}
            </button>
          </div>
        </DetailDialog>
      )}

      {/* Deactivate confirmation dialog */}
      {toggleConfirm && (
        <DetailDialog title="Deactivate Pricing Rule" onClose={() => setToggleConfirm(null)}>
          <p style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Deactivate pricing rule <strong>#{toggleConfirm.id}</strong> for <strong>{toggleConfirm.courtName}</strong> ({toggleConfirm.dayType} · {toggleConfirm.period})?
          </p>
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            When deactivated, future bookings for this court and time slot will not match this rule until you reactivate it.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setToggleConfirm(null)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeToggle}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: 0,
                background: 'var(--brand-danger)',
                color: '#fff',
                fontWeight: 'var(--fw-semibold)',
                cursor: 'pointer',
              }}
            >
              Deactivate
            </button>
          </div>
        </DetailDialog>
      )}
    </div>
  );
};

export default PricingPage;
