/**
 * Skeleton — content placeholder with shimmer animation.
 * Respects prefers-reduced-motion.
 */
import React from 'react';

const Skeleton = ({
  height  = '1rem',
  width   = '100%',
  radius  = 'var(--radius-sm)',
  style   = {},
}) => (
  <div
    aria-hidden="true"
    style={{
      height,
      width,
      borderRadius:    radius,
      backgroundColor: 'var(--bg-surface-elevated)',
      background:      'linear-gradient(90deg, var(--bg-surface-elevated) 25%, var(--border-subtle) 50%, var(--bg-surface-elevated) 75%)',
      backgroundSize:  '200% 100%',
      animation:       'matro-shimmer 1.6s ease-in-out infinite',
      ...style,
    }}
  />
);

export const SkeletonText = ({ lines = 3, lastWidth = '60%' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height="0.9rem" width={i === lines - 1 ? lastWidth : '100%'} />
    ))}
  </div>
);

export const SkeletonCard = ({ style = {} }) => (
  <div
    aria-hidden="true"
    style={{
      borderRadius:    'var(--radius-xl)',
      backgroundColor: 'var(--bg-surface-card)',
      border:          '1px solid var(--border-card)',
      overflow:        'hidden',
      ...style,
    }}
  >
    <Skeleton height="180px" radius="0" />
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <Skeleton height="1.2rem" width="70%" />
      <Skeleton height="0.85rem" width="50%" />
      <Skeleton height="0.85rem" width="85%" />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <Skeleton height="1.6rem" width="80px" radius="var(--radius-full)" />
        <Skeleton height="1.6rem" width="80px" radius="var(--radius-full)" />
      </div>
    </div>
    <style>{`
      @keyframes matro-shimmer {
        from { background-position: 200% 0; }
        to   { background-position: -200% 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        [aria-hidden="true"] { animation: none !important; }
      }
    `}</style>
  </div>
);

/**
 * SkeletonBookingCard — placeholder shaped like a BookingCard.
 * Used in UserDashboard while bookings are loading.
 */
export const SkeletonBookingCard = ({ style = {} }) => (
  <div
    aria-hidden="true"
    style={{
      borderRadius:    'var(--radius-xl)',
      backgroundColor: 'var(--bg-surface-card)',
      border:          '1px solid var(--border-card)',
      overflow:        'hidden',
      ...style,
    }}
  >
    {/* Sport colour stripe */}
    <Skeleton height="3px" radius="0" />

    <div style={{ padding: 'clamp(1rem, 2.5vw, 1.25rem)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* Sport label + venue */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
          <Skeleton height="0.7rem"  width="40px" radius="var(--radius-full)" />
          <Skeleton height="1.05rem" width="65%"  />
          <Skeleton height="0.75rem" width="50%"  />
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
          <Skeleton height="1.4rem" width="72px" radius="var(--radius-full)" />
          <Skeleton height="1.4rem" width="55px" radius="var(--radius-full)" />
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
        <Skeleton height="0.8rem" width="85%" />
        <Skeleton height="0.8rem" width="75%" />
        <Skeleton height="0.8rem" width="55%" />
        <Skeleton height="0.8rem" width="65%" />
      </div>

      {/* Booking ID + action buttons */}
      <Skeleton height="0.65rem" width="55%" />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
        <Skeleton height="1.7rem" width="80px"  radius="var(--radius-md)" />
        <Skeleton height="1.7rem" width="72px"  radius="var(--radius-md)" />
      </div>
    </div>
  </div>
);

/* Inline shimmer keyframes — injected once via a shared style block */
export const ShimmerKeyframes = () => (
  <style>{`
    @keyframes matro-shimmer {
      from { background-position: 200% 0; }
      to   { background-position: -200% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      [style*="matro-shimmer"] { animation: none !important; }
    }
  `}</style>
);

export default Skeleton;
