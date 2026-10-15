/**
 * StatusBadge — coloured pill for booking status and payment status.
 */
import React from 'react';

const STATUS_MAP = {
  /* Booking status */
  CONFIRMED:  { label: 'Confirmed',  bg: 'var(--color-success-soft)',   color: 'var(--color-success)',   border: 'color-mix(in srgb, var(--color-success) 30%, transparent)' },
  PENDING:    { label: 'Pending',    bg: 'var(--color-accent-soft)',    color: 'var(--brand-accent)',    border: 'color-mix(in srgb, var(--brand-accent) 30%, transparent)' },
  CANCELLED:  { label: 'Cancelled',  bg: 'var(--color-danger-soft)',    color: 'var(--brand-danger)',    border: 'color-mix(in srgb, var(--brand-danger) 30%, transparent)' },
  COMPLETED:  { label: 'Completed',  bg: 'var(--color-secondary-soft)', color: 'var(--brand-secondary)', border: 'color-mix(in srgb, var(--brand-secondary) 30%, transparent)' },
  NO_SHOW:    { label: 'No Show',    bg: 'var(--bg-hover)',              color: 'var(--text-muted)',      border: 'var(--border-card)' },
  /* Payment status */
  UNPAID:     { label: 'Unpaid',     bg: 'var(--color-accent-soft)',    color: 'var(--brand-accent)',    border: 'color-mix(in srgb, var(--brand-accent) 30%, transparent)' },
  PAID:       { label: 'Paid',       bg: 'var(--color-success-soft)',   color: 'var(--color-success)',   border: 'color-mix(in srgb, var(--color-success) 30%, transparent)' },
  REFUNDED:   { label: 'Refunded',   bg: 'var(--color-secondary-soft)', color: 'var(--brand-secondary)', border: 'color-mix(in srgb, var(--brand-secondary) 30%, transparent)' },
  WAIVED:     { label: 'Waived',     bg: 'var(--bg-hover)',              color: 'var(--text-muted)',      border: 'var(--border-card)' },
  /* Venue / court active state */
  ACTIVE:     { label: 'Active',     bg: 'var(--color-success-soft)',   color: 'var(--color-success)',   border: 'color-mix(in srgb, var(--color-success) 30%, transparent)' },
  INACTIVE:   { label: 'Inactive',   bg: 'var(--bg-hover)',              color: 'var(--text-muted)',      border: 'var(--border-card)' },
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const cfg = STATUS_MAP[status] ?? {
    label:  status ?? 'Unknown',
    bg:     'var(--bg-surface-elevated)',
    color:  'var(--text-muted)',
    border: 'var(--border-subtle)',
  };

  const pad  = size === 'sm' ? '0.22rem 0.65rem' : '0.35rem 0.9rem';
  const fs   = size === 'sm' ? '0.68rem'          : 'var(--text-xs)';

  return (
    <span
      aria-label={`Status: ${cfg.label}`}
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        padding:         pad,
        borderRadius:    'var(--radius-full)',
        backgroundColor: cfg.bg,
        border:          `1px solid ${cfg.border}`,
        color:           cfg.color,
        fontSize:        fs,
        fontWeight:      'var(--fw-bold)',
        letterSpacing:   '0.03em',
        whiteSpace:      'nowrap',
        lineHeight:      1.3,
      }}
    >
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
