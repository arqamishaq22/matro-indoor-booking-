/**
 * BookingsPage.jsx — /admin/bookings
 * Complete Bookings Management module:
 *  - Real-time bookings listing with real database records.
 *  - Multi-parameter search & filtering (ID/player/phone, status, venue, sport, date).
 *  - Dynamic pagination, refresh, loading skeletons, empty & error states.
 *  - High-visibility Approve & Reject workflows with confirmation dialogs.
 *  - Optional rejection/cancellation reason capture stored into booking notes.
 *  - Full booking detail modal showing all supported schema fields.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
  Search, RefreshCw, Eye, Check, XCircle, Clock, Calendar,
  Building2, DollarSign, X, AlertTriangle, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import { showToast } from '../../features/booking/bookingSlice';
import {
  getAdminBookings, updateBookingStatus, updateBookingPayment, getAdminVenues, getAdminStats,
} from '../../services/bookingService';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import {
  SectionHead, TableWrap, Th, Td, Pagination, ListSkeleton, DetailLine, StatCard,
} from '../../components/admin/tableHelpers';
import DetailDialog from '../../components/admin/DetailDialog';
import { pkr, fmtDate, BOOKING_TRANSITIONS } from '../../components/admin/adminShared';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'];
const SPORT_OPTIONS = ['cricket', 'futsal', 'padel', 'pickleball', 'badminton', 'gaming'];

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
};

const BookingsPage = () => {
  const dispatch = useDispatch();

  /* Core booking state */
  const [data, setData] = useState({ bookings: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Stats & venues */
  const [stats, setStats] = useState(null);
  const [venues, setVenues] = useState([]);

  /* Filters */
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [venueId, setVenueId] = useState('');
  const [sport, setSport] = useState('');
  const [date, setDate] = useState('');

  /* Modals & actions */
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'approve'|'reject'|'complete'|'noshow'|'cancel', booking }
  const [actionReason, setActionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  /* Payment action modal */
  const [paymentModal, setPaymentModal] = useState(null); // { type: 'collect'|'refund', booking }
  const [paymentMethod, setPaymentMethod] = useState('Cash (At Venue)');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const searchDebounceRef = useRef(null);

  /* Load overall stats once */
  const loadStats = useCallback(async () => {
    try {
      const s = await getAdminStats();
      setStats(s);
    } catch {
      // Non-critical, continue
    }
  }, []);

  /* Load venues for filter dropdown */
  const loadVenues = useCallback(async () => {
    try {
      const v = await getAdminVenues();
      setVenues(v);
    } catch {
      // Non-critical, continue
    }
  }, []);

  /* Load bookings with current filters and pagination */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminBookings({
        page,
        limit,
        search,
        status,
        venueId,
        sport,
        date,
      });
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, venueId, sport, date]);

  useEffect(() => {
    loadStats();
    loadVenues();
  }, [loadStats, loadVenues]);

  useEffect(() => {
    load();
  }, [load]);

  const hasActiveFilters = Boolean(search || status || venueId || sport || date);

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setVenueId('');
    setSport('');
    setDate('');
    setPage(1);
  };

  /* Timing helpers: Pakistan Local Time (PKT, UTC+5) */
  const isEligibleForNoShow = (b) => {
    if (!b?.date || !b?.startTime) return false;
    const start = new Date(`${b.date}T${b.startTime}:00+05:00`).getTime();
    return Date.now() >= start;
  };

  const isEligibleForComplete = (b) => {
    if (!b?.date || !b?.startTime) return false;
    const start = new Date(`${b.date}T${b.startTime}:00+05:00`).getTime();
    const end = start + (b.durationHours || 1) * 60 * 60 * 1000;
    return Date.now() >= end;
  };

  /* Open action dialogs with strict time guard feedback */
  const openApprove = (booking) => {
    setActionModal({ type: 'approve', booking });
    setActionReason('');
  };

  const openReject = (booking) => {
    setActionModal({ type: 'reject', booking });
    setActionReason('');
  };

  const openComplete = (booking) => {
    if (!isEligibleForComplete(booking)) {
      dispatch(showToast({
        message: `Cannot mark booking as completed before scheduled end time (${booking.endTime} PKT)`,
        type: 'error',
      }));
      return;
    }
    setActionModal({ type: 'complete', booking });
    setActionReason('');
  };

  const openNoShow = (booking) => {
    if (!isEligibleForNoShow(booking)) {
      dispatch(showToast({
        message: `Cannot mark booking as No Show before scheduled start time (${booking.startTime} PKT)`,
        type: 'error',
      }));
      return;
    }
    setActionModal({ type: 'noshow', booking });
    setActionReason('');
  };

  const openCancel = (booking) => {
    setActionModal({ type: 'cancel', booking });
    setActionReason('');
  };

  /* Payment dialog openers */
  const openCollectPayment = (booking) => {
    setPaymentModal({ type: 'collect', booking });
    setPaymentMethod('Cash (At Venue)');
    setPaymentNote('');
  };

  const openRefundPayment = (booking) => {
    setPaymentModal({ type: 'refund', booking });
    setPaymentMethod('Refund');
    setPaymentNote('');
  };

  /* Execute payment action with admin audit trail */
  const executePayment = async (e) => {
    e?.preventDefault();
    if (!paymentModal || paymentSubmitting) return;

    const { type, booking } = paymentModal;
    const targetPaymentStatus = type === 'refund' ? 'REFUNDED' : 'PAID';

    setPaymentSubmitting(true);
    try {
      await updateBookingPayment(booking.bookingId, {
        paymentStatus: targetPaymentStatus,
        paymentMethod: type === 'refund' ? 'Refund Processed' : paymentMethod,
        notes: paymentNote.trim(),
      });

      dispatch(showToast({
        message: type === 'refund'
          ? `Refund recorded for booking #${booking.bookingId.slice(0, 8)}`
          : `Payment of ${pkr(booking.totalAmount)} recorded for #${booking.bookingId.slice(0, 8)}`,
        type: 'success',
      }));

      setPaymentModal(null);
      setPaymentNote('');
      if (selectedBooking && selectedBooking.bookingId === booking.bookingId) {
        setSelectedBooking((prev) => prev ? { ...prev, paymentStatus: targetPaymentStatus } : null);
      }
      await Promise.all([load(), loadStats()]);
    } catch (err) {
      dispatch(showToast({ message: err.message || 'Failed to update payment status', type: 'error' }));
    } finally {
      setPaymentSubmitting(false);
    }
  };

  /* Execute action with backend protection & toast feedback */
  const executeAction = async (e) => {
    e?.preventDefault();
    if (!actionModal || actionSubmitting) return;

    const { type, booking } = actionModal;
    let targetStatus = '';

    if (type === 'approve') targetStatus = 'CONFIRMED';
    else if (type === 'reject') targetStatus = 'CANCELLED';
    else if (type === 'complete') targetStatus = 'COMPLETED';
    else if (type === 'noshow') targetStatus = 'NO_SHOW';
    else if (type === 'cancel') targetStatus = 'CANCELLED';

    // Verify transition validity according to existing project rules
    const allowed = BOOKING_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      dispatch(showToast({ message: `Cannot change status from ${booking.status} to ${targetStatus}`, type: 'error' }));
      setActionModal(null);
      return;
    }

    setActionSubmitting(true);
    try {
      let finalNotes = booking.notes || '';
      if (actionReason.trim()) {
        const prefix = type === 'reject' ? '[Rejection Reason]: ' : '[Admin Note]: ';
        finalNotes = finalNotes ? `${finalNotes}\n${prefix}${actionReason.trim()}` : `${prefix}${actionReason.trim()}`;
      }

      await updateBookingStatus(booking.bookingId, {
        status: targetStatus,
        notes: finalNotes,
      });

      const labelMap = {
        CONFIRMED: 'approved',
        CANCELLED: type === 'reject' ? 'rejected' : 'cancelled',
        COMPLETED: 'marked as completed',
        NO_SHOW: 'marked as no-show',
      };

      dispatch(showToast({
        message: `Booking #${booking.bookingId.slice(0, 8)} ${labelMap[targetStatus] ?? 'updated'} successfully`,
        type: 'success',
      }));

      setActionModal(null);
      await Promise.all([load(), loadStats()]);
    } catch (err) {
      dispatch(showToast({ message: err.message || 'Failed to update booking status', type: 'error' }));
    } finally {
      setActionSubmitting(false);
    }
  };

  /* Count pending bookings in current view */
  const pendingInView = data.bookings.filter((b) => b.status === 'PENDING').length;

  return (
    <div>
      <SectionHead
        title="Bookings Management"
        action={
          <button
            type="button"
            onClick={() => { load(); loadStats(); }}
            aria-label="Refresh bookings"
            title="Refresh bookings data"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--fw-semibold)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
        Monitor real-time court reservations, approve pending requests, and manage customer booking statuses.
      </p>

      {/* Top statistics summary cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem',
      }}>
        <StatCard
          icon={Calendar}
          label="Total Bookings"
          value={stats?.totalBookings ?? data.total}
          sub="All historical reservations"
          color="var(--brand-primary)"
        />
        <StatCard
          icon={Clock}
          label="Pending Approvals"
          value={pendingInView}
          sub="Requires admin review"
          color="var(--brand-accent)"
        />
        <StatCard
          icon={CheckCircle2}
          label="Upcoming Active"
          value={stats?.upcomingBookings ?? '—'}
          sub="Confirmed upcoming slots"
          color="var(--color-success)"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={stats?.estimatedRevenue !== undefined ? pkr(stats.estimatedRevenue) : '—'}
          sub="Confirmed & completed bookings"
          color="var(--brand-secondary)"
        />
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
            placeholder="Search booking ID, player, or phone…"
            value={searchInput}
            onChange={(e) => {
              const val = e.target.value;
              setSearchInput(val);
              clearTimeout(searchDebounceRef.current);
              searchDebounceRef.current = setTimeout(() => {
                setSearch(val.trim());
                setPage(1);
              }, 300);
            }}
            aria-label="Search bookings by ID, player, or phone"
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

        {/* 4 Filters in one row under "Filter" heading */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 'var(--fw-bold)', color: 'var(--brand-primary)', letterSpacing: '0.02em' }}>
              Filter
            </span>
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
          </div>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {/* Status filter */}
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              aria-label="Filter by booking status"
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
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Venue filter */}
            <select
              value={venueId}
              onChange={(e) => { setVenueId(e.target.value); setPage(1); }}
              aria-label="Filter by venue"
              style={{
                flex: '1 1 180px',
                minWidth: '150px',
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
              <option value="">All Venues</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>

            {/* Sport filter */}
            <select
              value={sport}
              onChange={(e) => { setSport(e.target.value); setPage(1); }}
              aria-label="Filter by sport"
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
              <option value="">All Sports</option>
              {SPORT_OPTIONS.map((item) => (
                <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>
              ))}
            </select>

            {/* Date filter */}
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setPage(1); }}
              onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
              aria-label="Filter by booking date"
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
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>

      {/* Table content */}
      {loading ? (
        <ListSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} compact />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>Booking ID</Th>
                <Th>Customer / Player</Th>
                <Th>Venue & Court</Th>
                <Th>Date & Time</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th>Booked On</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: 'center',
                      padding: '3.5rem 1rem',
                      color: 'var(--text-muted)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {hasActiveFilters ? (
                      <div>
                        <div style={{ marginBottom: '0.5rem', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
                          No bookings match your current filters.
                        </div>
                        <button
                          type="button"
                          onClick={resetFilters}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.4rem 0.9rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-surface-elevated)',
                            color: 'var(--text-primary)',
                            fontSize: 'var(--text-xs)',
                            cursor: 'pointer',
                          }}
                        >
                          Clear Filters
                        </button>
                      </div>
                    ) : (
                      'No bookings found in the database.'
                    )}
                  </td>
                </tr>
              ) : (
                data.bookings.map((b) => (
                  <tr
                    key={b.bookingId}
                    style={{
                      backgroundColor: b.status === 'PENDING'
                        ? 'color-mix(in srgb, var(--brand-accent) 6%, var(--bg-surface-card))'
                        : 'var(--bg-surface-card)',
                      transition: 'background-color var(--transition-fast)',
                    }}
                  >
                    {/* Booking ID */}
                    <Td>
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(b)}
                        aria-label={`View booking #${b.bookingId}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--brand-primary)',
                          fontWeight: 'var(--fw-semibold)',
                          textAlign: 'left',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                        }}
                      >
                        #{b.bookingId.slice(0, 8)}
                      </button>
                    </Td>

                    {/* Customer */}
                    <Td>
                      <div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
                        {b.playerName}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {b.phone}
                      </div>
                      {b.userEmail && (
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                          {b.userEmail}
                        </div>
                      )}
                    </Td>

                    {/* Venue & Court */}
                    <Td>
                      <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>
                        {b.venueName}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {b.courtName} {b.sport ? `(${b.sport})` : ''}
                      </div>
                    </Td>

                    {/* Date & Time */}
                    <Td>
                      <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>
                        {fmtDate(b.date)}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {b.startTime} – {b.endTime} ({b.durationHours}h)
                      </div>
                    </Td>

                    {/* Amount */}
                    <Td align="right">
                      <div style={{ fontWeight: 'var(--fw-bold)', color: 'var(--brand-primary)', fontSize: 'var(--text-sm)' }}>
                        {pkr(b.totalAmount)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {pkr(b.pricePerHour)}/hr
                      </div>
                    </Td>

                    {/* Status */}
                    <Td>
                      <StatusBadge status={b.status} />
                    </Td>

                    {/* Payment Status with Action Trigger */}
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                        <StatusBadge status={b.paymentStatus} size="sm" />
                        {b.paymentStatus === 'UNPAID' && b.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => openCollectPayment(b)}
                            aria-label={`Record payment for booking #${b.bookingId}`}
                            title="Record offline payment"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: 'var(--brand-primary)',
                              fontSize: '11px',
                              fontWeight: 'var(--fw-semibold)',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textUnderlineOffset: '2px',
                            }}
                          >
                            Collect Payment
                          </button>
                        )}
                        {b.paymentStatus === 'PAID' && b.status === 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => openRefundPayment(b)}
                            aria-label={`Process refund for booking #${b.bookingId}`}
                            title="Process refund"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: 'var(--brand-secondary)',
                              fontSize: '11px',
                              fontWeight: 'var(--fw-semibold)',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textUnderlineOffset: '2px',
                            }}
                          >
                            Process Refund
                          </button>
                        )}
                      </div>
                    </Td>

                    {/* Creation Date */}
                    <Td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {fmtDateTime(b.createdAt)}
                      </span>
                    </Td>

                    {/* Actions */}
                    <Td align="right">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {/* View details */}
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          aria-label={`View details for booking #${b.bookingId}`}
                          title="View booking details"
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-surface-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Eye size={14} aria-hidden="true" />
                        </button>

                        {/* PENDING: High-contrast Approve and Reject buttons */}
                        {b.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openApprove(b)}
                              aria-label={`Approve booking #${b.bookingId}`}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid color-mix(in srgb, var(--color-success) 40%, transparent)',
                                background: 'var(--color-success-soft)',
                                color: 'var(--color-success)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--fw-bold)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Check size={13} aria-hidden="true" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => openReject(b)}
                              aria-label={`Reject booking #${b.bookingId}`}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid color-mix(in srgb, var(--brand-danger) 40%, transparent)',
                                background: 'var(--color-danger-soft)',
                                color: 'var(--brand-danger)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--fw-bold)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <XCircle size={13} aria-hidden="true" /> Reject
                            </button>
                          </>
                        )}

                        {/* CONFIRMED: Complete, No-Show, Cancel actions */}
                        {b.status === 'CONFIRMED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openComplete(b)}
                              aria-label={`Mark booking #${b.bookingId} complete`}
                              title={isEligibleForComplete(b) ? 'Mark Completed' : `Completion eligible after ${b.endTime} (${fmtDate(b.date)})`}
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid color-mix(in srgb, var(--brand-secondary) 40%, transparent)',
                                background: isEligibleForComplete(b) ? 'var(--color-secondary-soft)' : 'var(--bg-surface-elevated)',
                                color: isEligibleForComplete(b) ? 'var(--brand-secondary)' : 'var(--text-faint)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--fw-semibold)',
                                cursor: isEligibleForComplete(b) ? 'pointer' : 'not-allowed',
                                opacity: isEligibleForComplete(b) ? 1 : 0.6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Check size={13} aria-hidden="true" /> Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => openNoShow(b)}
                              aria-label={`Mark booking #${b.bookingId} no-show`}
                              title={isEligibleForNoShow(b) ? 'Mark No-Show' : `No-Show eligible after ${b.startTime} (${fmtDate(b.date)})`}
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-card)',
                                background: 'var(--bg-surface-elevated)',
                                color: isEligibleForNoShow(b) ? 'var(--text-muted)' : 'var(--text-faint)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--fw-medium)',
                                cursor: isEligibleForNoShow(b) ? 'pointer' : 'not-allowed',
                                opacity: isEligibleForNoShow(b) ? 1 : 0.6,
                              }}
                            >
                              No-Show
                            </button>
                            <button
                              type="button"
                              onClick={() => openCancel(b)}
                              aria-label={`Cancel booking #${b.bookingId}`}
                              title="Cancel Booking"
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid color-mix(in srgb, var(--brand-danger) 40%, transparent)',
                                background: 'var(--color-danger-soft)',
                                color: 'var(--brand-danger)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--fw-medium)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <XCircle size={13} aria-hidden="true" /> Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Showing {data.bookings.length} of {data.total} total bookings
            </span>
            {data.pages > 1 && (
              <Pagination
                page={page}
                pages={data.pages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(data.pages, p + 1))}
              />
            )}
          </div>
        </>
      )}

      {/* Booking details dialog */}
      {selectedBooking && (
        <DetailDialog title={`Booking #${selectedBooking.bookingId}`} onClose={() => setSelectedBooking(null)}>
          <DetailLine label="Booking ID" value={selectedBooking.bookingId} />
          <DetailLine label="Customer Name" value={selectedBooking.playerName} />
          <DetailLine label="Customer Phone" value={selectedBooking.phone} />
          <DetailLine label="Customer Email" value={selectedBooking.userEmail || '—'} />
          <DetailLine
            label="User Account"
            value={
              selectedBooking.userName
                ? `${selectedBooking.userName} (User ID: #${selectedBooking.userId})`
                : 'Guest Reservation'
            }
          />
          <DetailLine label="Venue" value={`${selectedBooking.venueName} (${selectedBooking.venueCity || ''})`} />
          <DetailLine label="Court" value={`${selectedBooking.courtName} (${selectedBooking.sport || ''})`} />
          <DetailLine label="Booking Date" value={fmtDate(selectedBooking.date)} />
          <DetailLine label="Time Slot" value={`${selectedBooking.startTime} – ${selectedBooking.endTime}`} />
          <DetailLine label="Duration" value={`${selectedBooking.durationHours} hour(s)`} />
          <DetailLine label="Rate / Hour" value={pkr(selectedBooking.pricePerHour)} />
          <DetailLine label="Total Amount" value={pkr(selectedBooking.totalAmount)} />
          <DetailLine label="Booking Status" value={<StatusBadge status={selectedBooking.status} />} />
          <DetailLine label="Payment Status" value={<StatusBadge status={selectedBooking.paymentStatus} size="sm" />} />
          <DetailLine label="Booked At" value={fmtDateTime(selectedBooking.createdAt)} />
          <DetailLine label="Last Updated" value={fmtDateTime(selectedBooking.updatedAt)} />
          <DetailLine
            label="Notes & History"
            value={
              <div style={{ whiteSpace: 'pre-line', fontSize: 'var(--text-xs)', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {selectedBooking.notes || 'No notes entered'}
              </div>
            }
          />
          {selectedBooking.paymentStatus === 'UNPAID' && selectedBooking.status !== 'CANCELLED' && (
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  const b = selectedBooking;
                  setSelectedBooking(null);
                  openCollectPayment(b);
                }}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--gradient-cta)',
                  color: '#fff',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--fw-bold)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <DollarSign size={14} aria-hidden="true" /> Record Offline Payment
              </button>
            </div>
          )}
        </DetailDialog>
      )}

      {/* Action Confirmation Dialog (Approve, Reject, Complete, No-Show, Cancel) */}
      {actionModal && (
        <DetailDialog
          title={
            actionModal.type === 'approve'
              ? 'Approve Booking Reservation'
              : actionModal.type === 'reject'
              ? 'Reject Booking Reservation'
              : actionModal.type === 'complete'
              ? 'Complete Booking'
              : actionModal.type === 'noshow'
              ? 'Mark Customer As No-Show'
              : 'Cancel Booking'
          }
          onClose={() => !actionSubmitting && setActionModal(null)}
        >
          <form onSubmit={executeAction}>
            {/* Booking overview snippet */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1rem',
              fontSize: 'var(--text-xs)',
              display: 'grid',
              gap: '0.45rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Booking ID:</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                  #{actionModal.booking.bookingId.slice(0, 12)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Player:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {actionModal.booking.playerName} ({actionModal.booking.phone})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Venue & Court:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {actionModal.booking.venueName} · {actionModal.booking.courtName}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Slot:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {fmtDate(actionModal.booking.date)} ({actionModal.booking.startTime}–{actionModal.booking.endTime})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Total Amount:</span>
                <strong style={{ color: 'var(--brand-primary)' }}>
                  {pkr(actionModal.booking.totalAmount)}
                </strong>
              </div>
            </div>

            {/* Prompt explanation */}
            <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
              {actionModal.type === 'approve' && (
                'Are you sure you want to approve this reservation? The customer slot will be confirmed and locked.'
              )}
              {actionModal.type === 'reject' && (
                'Are you sure you want to reject this booking? The status will be set to CANCELLED and the court slot will be released.'
              )}
              {actionModal.type === 'complete' && (
                'Confirm that this booking session has concluded? The status will transition to COMPLETED.'
              )}
              {actionModal.type === 'noshow' && (
                'Confirm that the customer did not show up for their scheduled booking? The status will transition to NO_SHOW.'
              )}
              {actionModal.type === 'cancel' && (
                'Are you sure you want to cancel this confirmed booking? The slot will be reopened.'
              )}
            </p>

            {/* Optional rejection / cancellation reason input */}
            {(actionModal.type === 'reject' || actionModal.type === 'cancel' || actionModal.type === 'noshow') && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="action-reason"
                  style={{
                    display: 'block',
                    marginBottom: '0.35rem',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--fw-semibold)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {actionModal.type === 'reject' ? 'Rejection Reason (Optional)' : 'Reason / Notes (Optional)'}
                </label>
                <textarea
                  id="action-reason"
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    actionModal.type === 'reject'
                      ? 'e.g. Court under scheduled maintenance, slot unavailable'
                      : 'e.g. Customer called to cancel'
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Dialog buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                disabled={actionSubmitting}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  cursor: actionSubmitting ? 'wait' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSubmitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: 0,
                  background: actionModal.type === 'approve' || actionModal.type === 'complete'
                    ? 'var(--gradient-cta)'
                    : actionModal.type === 'noshow'
                    ? 'var(--bg-surface-card)'
                    : 'var(--brand-danger)',
                  color: actionModal.type === 'noshow' ? 'var(--text-primary)' : '#fff',
                  fontWeight: 'var(--fw-semibold)',
                  fontSize: 'var(--text-sm)',
                  cursor: actionSubmitting ? 'wait' : 'pointer',
                  opacity: actionSubmitting ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {actionSubmitting ? (
                  'Processing…'
                ) : actionModal.type === 'approve' ? (
                  <>
                    <Check size={14} aria-hidden="true" /> Approve Booking
                  </>
                ) : actionModal.type === 'reject' ? (
                  <>
                    <XCircle size={14} aria-hidden="true" /> Reject Booking
                  </>
                ) : actionModal.type === 'complete' ? (
                  <>
                    <Check size={14} aria-hidden="true" /> Mark Completed
                  </>
                ) : actionModal.type === 'noshow' ? (
                  'Mark No-Show'
                ) : (
                  <>
                    <XCircle size={14} aria-hidden="true" /> Cancel Booking
                  </>
                )}
              </button>
            </div>
          </form>
        </DetailDialog>
      )}

      {/* Payment Action Modal (Collect Payment / Refund) */}
      {paymentModal && (
        <DetailDialog
          title={paymentModal.type === 'refund' ? 'Process Payment Refund' : 'Record Offline Payment'}
          onClose={() => !paymentSubmitting && setPaymentModal(null)}
        >
          <form onSubmit={executePayment}>
            {/* Booking overview snippet */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1rem',
              fontSize: 'var(--text-xs)',
              display: 'grid',
              gap: '0.45rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Booking ID:</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                  #{paymentModal.booking.bookingId.slice(0, 12)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Customer:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {paymentModal.booking.playerName} ({paymentModal.booking.phone})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Venue & Court:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {paymentModal.booking.venueName} · {paymentModal.booking.courtName}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Total Booking Amount:</span>
                <strong style={{ color: 'var(--brand-primary)', fontSize: 'var(--text-sm)' }}>
                  {pkr(paymentModal.booking.totalAmount)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Current Payment Status:</span>
                <StatusBadge status={paymentModal.booking.paymentStatus} size="sm" />
              </div>
            </div>

            <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
              {paymentModal.type === 'refund'
                ? 'Confirm refunding this payment? The payment status will transition to REFUNDED and an audit log will be recorded.'
                : 'Record verified payment received from the customer. The payment status will be marked as PAID and an audit record will be logged with your administrator identity.'}
            </p>

            {paymentModal.type === 'collect' && (
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="payment-method-select"
                  style={{
                    display: 'block',
                    marginBottom: '0.35rem',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--fw-semibold)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Payment Method
                </label>
                <select
                  id="payment-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Cash (At Venue)">Cash (At Venue Counter)</option>
                  <option value="Credit / Debit Card (POS)">Credit / Debit Card (POS Terminal)</option>
                  <option value="Bank Transfer">Bank Transfer / IBFT</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Other">Other Verified Method</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="payment-notes"
                style={{
                  display: 'block',
                  marginBottom: '0.35rem',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--fw-semibold)',
                  color: 'var(--text-muted)',
                }}
              >
                {paymentModal.type === 'refund' ? 'Refund Reason / Notes (Optional)' : 'Transaction Reference / Notes (Optional)'}
              </label>
              <textarea
                id="payment-notes"
                rows={2}
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder={paymentModal.type === 'refund' ? 'e.g. Booking cancelled upon customer request; full refund' : 'e.g. Receipt #1234, cash received at front desk'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                disabled={paymentSubmitting}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  cursor: paymentSubmitting ? 'wait' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentSubmitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: 0,
                  background: paymentModal.type === 'refund' ? 'var(--brand-secondary)' : 'var(--gradient-cta)',
                  color: '#fff',
                  fontWeight: 'var(--fw-semibold)',
                  fontSize: 'var(--text-sm)',
                  cursor: paymentSubmitting ? 'wait' : 'pointer',
                  opacity: paymentSubmitting ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {paymentSubmitting ? 'Processing…' : paymentModal.type === 'refund' ? 'Confirm Refund' : 'Record Paid'}
              </button>
            </div>
          </form>
        </DetailDialog>
      )}
    </div>
  );
};

export default BookingsPage;
