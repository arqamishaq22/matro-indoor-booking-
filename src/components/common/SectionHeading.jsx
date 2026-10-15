import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const SectionHeading = ({
  badge = '',
  title = '',
  highlight = '',
  subtitle = '',
  align = 'center',
  headingLevel = 2,
  action = null,
  className = '',
  style = {}
}) => {
  const isCenter = align === 'center';
  const reduced  = useReducedMotion();
  const Heading = headingLevel === 1 ? motion.h1 : motion.h2;

  const viewportCfg = { once: true, margin: '-80px' };
  const easeOut = [0.16, 1, 0.3, 1];

  const staggerItem = (delay) => reduced ? {} : {
    initial: { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: viewportCfg,
    transition: { duration: 0.4, ease: easeOut, delay },
  };

  return (
    <div
      className={`section-heading ${className}`}
      style={{
        display:        'flex',
        /* Center: column always. Left: row on desktop, column on mobile via CSS below. */
        flexDirection:  isCenter ? 'column' : 'row',
        justifyContent: isCenter ? 'center' : 'space-between',
        alignItems:     isCenter ? 'center' : 'flex-end',
        textAlign:      isCenter ? 'center' : 'left',
        marginBottom:   'clamp(1.75rem, 4vw, 2.75rem)',
        flexWrap:       'wrap',
        gap:            '1rem',
        minWidth:       0,
        ...style
      }}
    >
      {/* Text block — always takes available width, never overflows */}
      <div
        style={{
          maxWidth: isCenter ? '720px' : '100%',
          width:    '100%',
          minWidth: 0,
          flex:     '1 1 0',
        }}
      >
        {badge && (
          <motion.div
            {...staggerItem(0)}
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              gap:             '6px',
              padding:         '4px 14px',
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--badge-bg)',
              border:          '1px solid var(--badge-border)',
              color:           'var(--brand-primary)',
              fontSize:        'var(--text-xs)',
              fontWeight:      'var(--fw-bold)',
              textTransform:   'uppercase',
              letterSpacing:   '0.08em',
              marginBottom:    '0.85rem',
              /* Never let the badge push container width */
              maxWidth:        '100%',
              whiteSpace:      'nowrap',
              overflow:        'hidden',
              textOverflow:    'ellipsis',
            }}
          >
            <span
              style={{
                width:           '6px',
                height:          '6px',
                borderRadius:    '50%',
                backgroundColor: 'var(--brand-primary)',
                boxShadow:       '0 0 8px var(--brand-primary)',
                flexShrink:      0,
              }}
              aria-hidden="true"
            />
            {badge}
          </motion.div>
        )}

        {title && (
          <Heading
            {...staggerItem(0.07)}
            style={{
              fontSize:      'clamp(1.6rem, 3.5vw, 2.75rem)',
              fontWeight:    'var(--fw-extrabold)',
              letterSpacing: 'var(--tracking-tight)',
              lineHeight:    1.15,
              marginBottom:  subtitle ? '0.75rem' : 0,
              /* Prevent very long words from overflowing at 320px */
              overflowWrap:  'break-word',
              wordBreak:     'break-word',
            }}
          >
            {title}{' '}
            {highlight && (
              /* Use the current design-system class (renamed from gradient-text-emerald) */
              <span className="gradient-text">
                {highlight}
              </span>
            )}
          </Heading>
        )}

        {subtitle && (
          <motion.p
            {...staggerItem(0.14)}
            style={{
              color:      'var(--text-secondary)',
              fontSize:   'clamp(0.92rem, 1.5vw, 1.05rem)',
              lineHeight: 'var(--lh-base)',
              margin:     isCenter ? '0 auto' : 0,
              maxWidth:   isCenter ? '60ch' : 'none',
              /* Don't let long subtitles overflow their container */
              overflowWrap: 'break-word',
            }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Action slot (nav buttons) — flex-shrink:0 so buttons don't squash,
          but the whole slot wraps below the text on narrow screens */}
      {action && !isCenter && (
        <div
          style={{
            flexShrink: 0,
            /* On very small screens the action row wraps below the text naturally
               because we use flexWrap:wrap on the parent */
          }}
        >
          {action}
        </div>
      )}
    </div>
  );
};

export default SectionHeading;
