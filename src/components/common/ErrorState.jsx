/**
 * ErrorState — full-bleed error display for API failures.
 */
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

const ErrorState = ({
  title   = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  compact = false,
}) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={reduced ? {} : { opacity: 1, y: 0  }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      role="alert"
      aria-live="assertive"
      style={{
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             compact ? '0.75rem' : '1.25rem',
        padding:         compact ? '2rem 1rem' : 'clamp(3rem, 8vw, 5rem) 1rem',
        textAlign:       'center',
        borderRadius:    'var(--radius-2xl)',
        backgroundColor: 'var(--bg-surface-card)',
        border:          '1px solid var(--border-card)',
      }}
    >
      <div
        style={{
          width:           compact ? '48px' : '64px',
          height:          compact ? '48px' : '64px',
          borderRadius:    '50%',
          backgroundColor: 'var(--color-danger-soft)',
          border:          '1px solid rgba(220,38,38,0.25)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}
      >
        <AlertCircle size={compact ? 22 : 28} color="var(--brand-danger)" aria-hidden="true" />
      </div>

      <div>
        <h3
          style={{
            margin:     '0 0 0.35rem',
            fontSize:   compact ? 'var(--text-base)' : 'var(--text-xl)',
            fontWeight: 'var(--fw-bold)',
            color:      'var(--text-primary)',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin:   0,
            fontSize: 'var(--text-sm)',
            color:    'var(--text-muted)',
            maxWidth: '42ch',
          }}
        >
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display:         'inline-flex',
            alignItems:      'center',
            gap:             '7px',
            padding:         '0.6rem 1.4rem',
            borderRadius:    'var(--radius-md)',
            fontSize:        'var(--text-sm)',
            fontWeight:      'var(--fw-bold)',
            background:      'var(--gradient-cta)',
            color:           '#fff',
            border:          'none',
            boxShadow:       'var(--shadow-brand)',
            cursor:          'pointer',
          }}
        >
          <RefreshCw size={14} aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </motion.div>
  );
};

export default ErrorState;
