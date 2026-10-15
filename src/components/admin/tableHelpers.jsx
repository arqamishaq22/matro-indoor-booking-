/**
 * tableHelpers.jsx — shared admin UI primitives.
 * SectionHead, TableWrap/Th/Td, Pagination, ToggleBtn, ListSkeleton, StatCard, DetailLine.
 */
import React from 'react';
import { ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import Skeleton from '../common/Skeleton';

/* ─── Section heading ────────────────────────────────────────────────── */
export const SectionHead = ({ title, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
    <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>{title}</h2>
    {action}
  </div>
);

/* ─── Table wrapper ──────────────────────────────────────────────────── */
export const TableWrap = ({ children }) => (
  <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-card)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
    <div style={{ overflowX: 'auto' }} className="hide-scrollbar">
      <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        {children}
      </table>
    </div>
  </div>
);

export const Th = ({ children, align = 'left' }) => (
  <th style={{ padding: '0.75rem 1rem', textAlign: align, fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }} scope="col">{children}</th>
);

export const Td = ({ children, align = 'left' }) => (
  <td style={{ padding: '0.75rem 1rem', textAlign: align, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'middle' }}>{children}</td>
);

/* ─── Pagination ─────────────────────────────────────────────────────── */
export const Pagination = ({ page, pages, onPrev, onNext }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
    <span>Page {page} of {pages}</span>
    <button type="button" onClick={onPrev} disabled={page <= 1} aria-label="Previous page" style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-card)', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? 'var(--text-faint)' : 'var(--text-primary)' }}>
      <ChevronLeft size={16} aria-hidden="true" />
    </button>
    <button type="button" onClick={onNext} disabled={page >= pages} aria-label="Next page" style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-card)', cursor: page >= pages ? 'not-allowed' : 'pointer', color: page >= pages ? 'var(--text-faint)' : 'var(--text-primary)' }}>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  </div>
);

/* ─── Toggle button ──────────────────────────────────────────────────── */
export const ToggleBtn = ({ active, onToggle, loading }) => (
  <button type="button" onClick={onToggle} disabled={loading}
    aria-label={active ? 'Deactivate' : 'Activate'}
    style={{ background: 'none', border: 'none', cursor: loading ? 'wait' : 'pointer', color: active ? 'var(--color-success)' : 'var(--text-faint)', display: 'flex', alignItems: 'center' }}
  >
    {active ? <ToggleRight size={22} aria-hidden="true" /> : <ToggleLeft size={22} aria-hidden="true" />}
  </button>
);

/* ─── List skeleton ──────────────────────────────────────────────────── */
export const ListSkeleton = ({ rows = 4 }) => (
  <div aria-label="Loading" aria-busy="true" style={{ display: 'grid', gap: '0.75rem' }}>
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} height="3.25rem" radius="var(--radius-md)" />
    ))}
  </div>
);

/* ─── Stat card ──────────────────────────────────────────────────────── */
export const StatCard = ({ icon: Icon, label, value, sub, color = 'var(--brand-primary)' }) => (
  <div style={{ padding: 'clamp(1rem,2.5vw,1.5rem)', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--bg-surface-card)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} aria-hidden="true" />
      </div>
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
    <div style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: '4px' }}>{sub}</div>}
  </div>
);

/* ─── Detail line (for dialogs) ──────────────────────────────────────── */
export const DetailLine = ({ label, value }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 0.65fr) 1fr', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--text-sm)' }}>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{value ?? '—'}</span>
  </div>
);
