/**
 * BookingCard — displays a single booking summary.
 * Used in UserDashboard and AdminDashboard.
 */
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CalendarDays, Clock, MapPin, Hash,
  Layers, DollarSign, ChevronDown, ChevronUp, XCircle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const pkr = (n) => (n != null ? `Rs. ${Number(n).toLocaleString('en-PK')}` : '—');

const Row = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
    <Icon size={13} color="var(--text-faint)" aria-hidden="true" style={{ flexShrink: 0 }} />
    <span style={{ fontWeight: 'var(--fw-medium)', color: 'var(--text-muted)', flexShrink: 0 }}>{label}:</span>
    <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--fw-semibold)', wordBreak: 'break-all' }}>{value}</span>
  </div>
);

const BookingCard = ({
  booking,
  onCancel,
  showCancel = true,
  compact = false,
  /** Pass the bookingId while its cancel request is in-flight to show a spinner */
  cancellingBookingId = null,
}) => {
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();

  const {
    bookingId, courtName, sport, venueName, venueCity,
    date, startTime, endTime, durationHours,
    totalAmount, pricePerHour, status, paymentStatus,
    playerName, phone, notes,
  } = booking;

  /* Format date */
  const fmtDate = (d) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isCancelling = cancellingBookingId === bookingId;
  const canCancel    = showCancel && (status === 'CONFIRMED' || status === 'PENDING') && (onCancel || isCancelling);

  /* Sport color dot */
  const SPORT_COLORS = {
    cricket: '#3b82f6', futsal: '#10b981', padel: '#8b5cf6',
    pickleball: '#f59e0b', badminton: '#ec4899', gaming: '#6366f1',
  };
  const sportColor = SPORT_COLORS[sport] ?? 'var(--brand-primary)';

  return (
    <motion.div
      className="matro-card"
      layout={!reduced}
      style={{
        borderRadius:    'var(--radius-xl)',
        backgroundColor: 'var(--bg-surface-card)',
        border:          '1px solid var(--border-card)',
        boxShadow:       'var(--shadow-sm)',
        overflow:        'hidden',
        transition:      'box-shadow var(--transition-fast)',
      }}
      whileHover={!reduced ? { boxShadow: 'var(--shadow-md)' } : {}}
    >
      {/* Sport colour stripe */}
      <div style={{ height: '3px', background: sportColor }} aria-hidden="true" />

      <div style={{ padding: compact ? '1rem' : 'clamp(1rem, 2.5vw, 1.25rem)' }}>
        {/* Top row: venue + statuses */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: sportColor, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{sport}</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {courtName}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {venueName}{venueCity ? ` · ${venueCity}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '5px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <StatusBadge status={status} />
            <StatusBadge status={paymentStatus} />
          </div>
        </div>

        {/* Key details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Row icon={CalendarDays} label="Date"     value={fmtDate(date)} />
          <Row icon={Clock}        label="Time"     value={`${startTime} – ${endTime}`} />
          <Row icon={Layers}       label="Duration" value={`${durationHours}h`} />
          <Row icon={DollarSign}   label="Total"    value={pkr(totalAmount)} />
        </div>

        {/* Booking ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: compact ? 0 : '0.75rem' }}>
          <Hash size={12} color="var(--text-faint)" aria-hidden="true" />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>{bookingId}</span>
        </div>

        {/* Expanded details */}
        {expanded && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, height: 0 }}
            animate={reduced ? {} : { opacity: 1, height: 'auto' }}
            exit={reduced    ? {} : { opacity: 0, height: 0 }}
            style={{
              borderTop:  '1px solid var(--border-subtle)',
              marginTop:  '0.75rem',
              paddingTop: '0.75rem',
              display:    'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}
          >
            <Row icon={MapPin}      label="Venue"       value={`${venueName}${venueCity ? `, ${venueCity}` : ''}`} />
            <Row icon={DollarSign}  label="Price/hr"    value={pkr(pricePerHour)} />
            {playerName && <Row icon={MapPin} label="Player" value={playerName} />}
            {phone      && <Row icon={MapPin} label="Phone"  value={phone} />}
            {notes      && <Row icon={MapPin} label="Notes"  value={notes} />}
          </motion.div>
        )}

        {/* Actions */}
        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             '4px',
                padding:         '0.35rem 0.85rem',
                borderRadius:    'var(--radius-md)',
                fontSize:        'var(--text-xs)',
                fontWeight:      'var(--fw-semibold)',
                color:           'var(--brand-primary)',
                backgroundColor: 'var(--color-primary-soft)',
                border:          'none',
                cursor:          'pointer',
              }}
            >
              {expanded ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
              {expanded ? 'Hide Details' : 'View Details'}
            </button>

            {canCancel && (
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => !isCancelling && onCancel && onCancel(bookingId)}
                aria-busy={isCancelling}
                aria-label={isCancelling ? 'Cancelling booking…' : 'Cancel booking'}
                style={{
                  display:         'inline-flex',
                  alignItems:      'center',
                  gap:             '4px',
                  padding:         '0.35rem 0.85rem',
                  borderRadius:    'var(--radius-md)',
                  fontSize:        'var(--text-xs)',
                  fontWeight:      'var(--fw-semibold)',
                  color:           'var(--brand-danger)',
                  backgroundColor: 'var(--color-danger-soft)',
                  border:          '1px solid rgba(220,38,38,0.2)',
                  cursor:          isCancelling ? 'not-allowed' : 'pointer',
                  opacity:         isCancelling ? 0.65 : 1,
                  transition:      'opacity var(--transition-fast)',
                }}
              >
                {isCancelling ? (
                  <>
                    <svg
                      aria-hidden="true"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      style={{ animation: 'matro-spin 0.8s linear infinite', flexShrink: 0 }}
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Cancelling…
                  </>
                ) : (
                  <>
                    <XCircle size={13} aria-hidden="true" />
                    Cancel
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inject cancel-spinner keyframe once per card mount */}
      <style>{`
        @keyframes matro-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default BookingCard;
