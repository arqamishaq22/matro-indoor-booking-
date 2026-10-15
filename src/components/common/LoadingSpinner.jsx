/**
 * LoadingSpinner — accessible animated spinner.
 */
import React from 'react';
import { useReducedMotion } from 'motion/react';

const LoadingSpinner = ({ size = 32, label = 'Loading…', color = 'var(--brand-primary)' }) => {
  const reduced = useReducedMotion();

  return (
    <div role="status" aria-label={label} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ animation: reduced ? 'none' : 'matro-spin 0.8s linear infinite' }}
      >
        <circle cx="12" cy="12" r="10" stroke="var(--border-subtle)" strokeWidth="3" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>
        {label}
      </span>
      <style>{`
        @keyframes matro-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .matro-spinner { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
