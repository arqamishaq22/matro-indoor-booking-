/**
 * EmptyState — shown when a list/collection has no items.
 */
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const EmptyState = ({
  icon:   Icon,
  title   = 'Nothing here yet',
  message = '',
  action,          /* optional ReactNode for a CTA button */
  compact = false,
}) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={reduced ? {} : { opacity: 1, y: 0  }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
      {Icon && (
        <div
          style={{
            width:           compact ? '48px' : '64px',
            height:          compact ? '48px' : '64px',
            borderRadius:    '50%',
            backgroundColor: 'var(--bg-surface-elevated)',
            border:          '1px solid var(--border-subtle)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}
        >
          <Icon size={compact ? 22 : 28} color="var(--text-faint)" aria-hidden="true" />
        </div>
      )}

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
        {message && (
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
        )}
      </div>

      {action}
    </motion.div>
  );
};

export default EmptyState;
