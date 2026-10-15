import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { membershipTiers } from '../../data/memberships';
import Container from '../common/Container';
import SectionHeading from '../common/SectionHeading';
import {
  Check,
  X,
  Clock,
  TrendingDown,
  CalendarCheck,
  ArrowRight,
  Crown,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TIER ICON MAP  — one distinct icon per tier
───────────────────────────────────────────────────────────── */
const TIER_ICONS = {
  bronze: Clock,
  silver: Zap,
  gold:   Crown,
};

/* ─────────────────────────────────────────────────────────────
   MOTION VARIANTS
───────────────────────────────────────────────────────────── */
const gridVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0,
    transition: { duration: 0.52, ease: [0.16, 1, 0.3, 1] } },
};

/* ─────────────────────────────────────────────────────────────
   HOURS BAR  — visual off-peak / peak split
───────────────────────────────────────────────────────────── */
const HoursBar = ({ offPeak, peak, color }) => {
  const total  = offPeak + peak;
  const offPct = (offPeak / total) * 100;
  const pkPct  = (peak   / total) * 100;

  return (
    <div>
      {/* Labels */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          marginBottom:   '5px',
          fontSize:       'var(--text-xs)',
          fontWeight:     'var(--fw-semibold)',
          color:          'var(--text-muted)',
        }}
      >
        <span>{offPeak} off-peak hrs</span>
        <span>{peak} peak hrs</span>
      </div>

      {/* Bar track */}
      <div
        style={{
          display:      'flex',
          height:       '6px',
          borderRadius: 'var(--radius-full)',
          overflow:     'hidden',
          gap:          '2px',
          backgroundColor: 'var(--bg-surface)',
        }}
        role="img"
        aria-label={`${offPeak} off-peak hours and ${peak} peak hours included`}
      >
        {/* Off-peak segment */}
        <div
          style={{
            width:        `${offPct}%`,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--slot-available-border)',
          }}
        />
        {/* Peak segment */}
        <div
          style={{
            width:        `${pkPct}%`,
            borderRadius: 'var(--radius-full)',
            backgroundColor: color,
            opacity:      0.75,
          }}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          display:   'flex',
          gap:       '1rem',
          marginTop: '5px',
          fontSize:  '0.65rem',
          color:     'var(--text-faint)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--slot-available-border)', display: 'inline-block' }} aria-hidden="true" />
          Off-peak
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, opacity: 0.75, display: 'inline-block' }} aria-hidden="true" />
          Peak
        </span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MEMBERSHIP CARD
───────────────────────────────────────────────────────────── */
const MembershipCard = ({ tier, reduced }) => {
  const [hovered, setHovered] = useState(false);
  const [enquired, setEnquired] = useState(false);

  const Icon    = TIER_ICONS[tier.id] ?? Crown;
  const c       = tier.color;
  /* Gold is marked popular in the data — use a subtle indicator only */
  const isPop   = tier.popular;

  const handleEnquire = () => {
    /* No payment processing — UI-only feedback */
    setEnquired(true);
    setTimeout(() => setEnquired(false), 3500);
  };

  return (
    <motion.article
      variants={reduced ? {} : cardVariants}
      whileHover={reduced ? {} : { y: -6 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()   => setHovered(false)}
      aria-label={`${tier.name} membership — ${tier.formattedPrice} per ${tier.duration}`}
      style={{
        display:         'flex',
        flexDirection:   'column',
        position:        'relative',
        borderRadius:    'var(--radius-2xl)',
        backgroundColor: 'var(--bg-surface-card)',
        /* Gold gets a subtle accent border, others use card default */
        border:          isPop
          ? `1.5px solid ${c}88`
          : hovered
          ? `1px solid ${c}50`
          : '1px solid var(--border-card)',
        boxShadow:       hovered
          ? `0 22px 44px -8px rgba(0,0,0,0.34), 0 0 28px ${c}1a`
          : isPop
          ? `0 8px 24px -4px rgba(0,0,0,0.22), 0 0 16px ${c}14`
          : 'var(--card-shadow)',
        transition:      'border-color var(--transition-normal), box-shadow var(--transition-normal)',
        overflow:        'hidden',
      }}
    >
      {/* ── Top gradient accent bar ─────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          height:     '4px',
          background: tier.accentGradient,
          flexShrink: 0,
        }}
      />

      {/* ── Popular indicator (data-driven, not artificial) ─── */}
      {isPop && (
        <div
          style={{
            position:        'absolute',
            top:             '12px',
            right:           '14px',
            display:         'inline-flex',
            alignItems:      'center',
            gap:             '4px',
            padding:         '3px 10px',
            borderRadius:    'var(--radius-full)',
            backgroundColor: `${c}22`,
            border:          `1px solid ${c}55`,
            fontSize:        '0.65rem',
            fontWeight:      'var(--fw-bold)',
            letterSpacing:   '0.06em',
            textTransform:   'uppercase',
            color:           c,
          }}
        >
          <Crown size={10} aria-hidden="true" />
          Most Hours
        </div>
      )}

      {/* ── Card body ───────────────────────────────────────── */}
      <div
        style={{
          padding:       'clamp(1.5rem, 3vw, 2rem)',
          display:       'flex',
          flexDirection: 'column',
          flex:          1,
          gap:           '1.35rem',
        }}
      >

        {/* Tier name + icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:           '46px',
              height:          '46px',
              borderRadius:    'var(--radius-lg)',
              backgroundColor: `${c}18`,
              border:          `1px solid ${c}35`,
              flexShrink:      0,
            }}
          >
            <Icon size={22} color={c} aria-hidden="true" strokeWidth={2} />
          </div>

          <div>
            <h3
              style={{
                fontSize:      'clamp(1.2rem, 2.5vw, 1.45rem)',
                fontWeight:    'var(--fw-extrabold)',
                color:         'var(--text-primary)',
                lineHeight:    1.15,
                margin:        0,
              }}
            >
              {tier.name}
            </h3>
            <div
              style={{
                fontSize:   'var(--text-xs)',
                fontWeight: 'var(--fw-semibold)',
                color:      c,
                marginTop:  '2px',
              }}
            >
              {tier.subtitle}
            </div>
          </div>
        </div>

        {/* Price block */}
        <div
          style={{
            paddingBottom: '1.25rem',
            borderBottom:  '1px solid var(--border-subtle)',
          }}
        >
          <p
            style={{
              fontSize:   'var(--text-xs)',
              color:      'var(--text-muted)',
              marginBottom:'4px',
              lineHeight: 1.3,
            }}
          >
            {tier.tagline}
          </p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize:   'clamp(2rem, 4vw, 2.6rem)',
                fontWeight: 'var(--fw-extrabold)',
                color:      'var(--text-primary)',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Rs.&nbsp;{tier.price.toLocaleString()}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              / {tier.duration}
            </span>
          </div>

          {/* Discount callout */}
          <div
            style={{
              display:    'inline-flex',
              alignItems: 'center',
              gap:        '5px',
              marginTop:  '8px',
              padding:    '3px 10px',
              borderRadius:'var(--radius-full)',
              backgroundColor: `${c}14`,
              border:     `1px solid ${c}30`,
              fontSize:   'var(--text-xs)',
              fontWeight: 'var(--fw-bold)',
              color:      c,
            }}
          >
            <TrendingDown size={11} aria-hidden="true" />
            {tier.extraDiscount} extra discount on all court bookings
          </div>
        </div>

        {/* Hours visualisation */}
        <HoursBar
          offPeak={tier.offPeakHours}
          peak={tier.peakHours}
          color={c}
        />

        {/* Key stats row */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 '0.5rem',
          }}
        >
          {[
            { label: 'Off-Peak',  value: `${tier.offPeakHours} hrs` },
            { label: 'Peak',      value: `${tier.peakHours} hrs`    },
            { label: 'Discount',  value: tier.extraDiscount          },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                padding:         '0.6rem 0.5rem',
                borderRadius:    'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
                border:          '1px solid var(--border-subtle)',
                textAlign:       'center',
              }}
            >
              <div
                style={{
                  fontSize:   'clamp(0.95rem, 2vw, 1.1rem)',
                  fontWeight: 'var(--fw-extrabold)',
                  color:      c,
                  lineHeight: 1.1,
                }}
              >
                {value}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 'var(--fw-semibold)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Perks list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <span
            style={{
              fontSize:      'var(--text-xs)',
              fontWeight:    'var(--fw-bold)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color:         'var(--text-muted)',
            }}
          >
            What's included
          </span>

          <ul role="list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tier.perks.map((perk) => (
              <li
                key={perk}
                style={{
                  display:    'flex',
                  alignItems: 'flex-start',
                  gap:        '8px',
                  fontSize:   'var(--text-sm)',
                  color:      'var(--text-secondary)',
                  lineHeight: 'var(--lh-sm)',
                }}
              >
                <span
                  style={{
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    width:           '17px',
                    height:          '17px',
                    borderRadius:    '50%',
                    backgroundColor: `${c}20`,
                    flexShrink:      0,
                    marginTop:       '2px',
                  }}
                >
                  <Check size={10} color={c} strokeWidth={2.8} aria-hidden="true" />
                </span>
                {perk}
              </li>
            ))}

            {tier.limitations.map((lim) => (
              <li
                key={lim}
                style={{
                  display:    'flex',
                  alignItems: 'flex-start',
                  gap:        '8px',
                  fontSize:   'var(--text-sm)',
                  color:      'var(--text-faint)',
                  lineHeight: 'var(--lh-sm)',
                }}
              >
                <span
                  style={{
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    width:           '17px',
                    height:          '17px',
                    borderRadius:    '50%',
                    backgroundColor: 'var(--bg-surface)',
                    flexShrink:      0,
                    marginTop:       '2px',
                  }}
                >
                  <X size={10} color="var(--text-faint)" strokeWidth={2.5} aria-hidden="true" />
                </span>
                {lim}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 'auto' }}>
          <AnimatePresence mode="wait">
            {enquired ? (
              <motion.div
                key="enquired"
                initial={reduced ? {} : { opacity: 0, scale: 0.96 }}
                animate={reduced ? {} : { opacity: 1, scale: 1 }}
                exit={reduced   ? {} : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  gap:             '7px',
                  padding:         '0.8rem 1rem',
                  borderRadius:    'var(--radius-lg)',
                  backgroundColor: `${c}16`,
                  border:          `1px solid ${c}40`,
                  color:           c,
                  fontSize:        'var(--text-sm)',
                  fontWeight:      'var(--fw-bold)',
                  textAlign:       'center',
                }}
              >
                <Check size={16} aria-hidden="true" />
                Enquiry noted — our team will be in touch via WhatsApp.
              </motion.div>
            ) : (
              <motion.button
                key="cta"
                type="button"
                onClick={handleEnquire}
                whileHover={reduced ? {} : { scale: 1.025 }}
                whileTap={reduced  ? {} : { scale: 0.97  }}
                transition={{ type: 'spring', stiffness: 440, damping: 22 }}
                initial={reduced ? {} : { opacity: 0, scale: 0.98 }}
                animate={reduced ? {} : { opacity: 1, scale: 1 }}
                exit={reduced   ? {} : { opacity: 0, scale: 0.98 }}
                aria-label={`${tier.ctaText} — ${tier.formattedPrice} per ${tier.duration}`}
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  gap:             '8px',
                  width:           '100%',
                  padding:         '0.82rem 1.25rem',
                  borderRadius:    'var(--radius-lg)',
                  fontSize:        'var(--text-sm)',
                  fontWeight:      'var(--fw-bold)',
                  /* Gold uses gradient; Bronze/Silver use outlined style */
                  background:      isPop
                    ? tier.accentGradient
                    : 'transparent',
                  color:           isPop ? '#0f172a' : c,
                  border:          isPop
                    ? '1px solid transparent'
                    : `1.5px solid ${c}70`,
                  boxShadow:       isPop
                    ? `0 4px 18px ${c}40`
                    : 'none',
                  cursor:          'pointer',
                  transition:      'box-shadow var(--transition-fast), background var(--transition-fast)',
                  letterSpacing:   '0.01em',
                }}
              >
                {tier.ctaText}
                <ArrowRight size={15} aria-hidden="true" />
              </motion.button>
            )}
          </AnimatePresence>

          <p
            style={{
              fontSize:   '0.65rem',
              color:      'var(--text-faint)',
              textAlign:  'center',
              marginTop:  '0.5rem',
              lineHeight: 1.4,
            }}
          >
            No payment collected here — enquiry only
          </p>
        </div>
      </div>
    </motion.article>
  );
};

/* ─────────────────────────────────────────────────────────────
   COMPARISON HINT ROW  (spec-accurate summary below cards)
───────────────────────────────────────────────────────────── */
const ComparisonHint = ({ reduced }) => (
  <motion.div
    initial={reduced ? {} : { opacity: 0, y: 14 }}
    whileInView={reduced ? {} : { opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-30px' }}
    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap:                 '0.75rem',
      padding:             '1.25rem 1.5rem',
      borderRadius:        'var(--radius-xl)',
      backgroundColor:     'var(--bg-surface-card)',
      border:              '1px solid var(--border-card)',
      boxShadow:           'var(--shadow-sm)',
      marginTop:           'clamp(1.5rem, 3vw, 2.5rem)',
    }}
  >
    {[
      { label: 'Valid across all venues',   detail: 'Lahore & Sialkot'             },
      { label: 'Advance booking window',    detail: '7 / 14 / 30 days by tier'     },
      { label: 'Discount on all bookings',  detail: '5% / 10% / 15% by tier'       },
      { label: 'No payment collected here', detail: 'Enquiry only — team contacts you' },
    ].map(({ label, detail }) => (
      <div
        key={label}
        style={{
          display:    'flex',
          alignItems: 'flex-start',
          gap:        '8px',
        }}
      >
        <CalendarCheck
          size={14}
          color="var(--brand-primary)"
          aria-hidden="true"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <div>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {label}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
            {detail}
          </div>
        </div>
      </div>
    ))}
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────────────────────────── */
const MembershipSection = () => {
  const reduced = useReducedMotion();

  return (
    <section
      id="memberships"
      style={{
        paddingTop:      'var(--section-padding-y)',
        paddingBottom:   'var(--section-padding-y)',
        backgroundColor: 'var(--bg-main)',
        position:        'relative',
        overflow:        'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          top:          '-8%',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        'min(600px, 100vw)',
          height:       '300px',
          borderRadius: '50%',
          background:   'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)',
          filter:       'blur(64px)',
          pointerEvents:'none',
          zIndex:        0,
        }}
      />

      <Container style={{ position: 'relative', zIndex: 1 }}>

        {/* Section heading */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionHeading
            badge="Exclusive Athlete Passes"
            title="Elevate Your Game With"
            highlight="Matro Club"
            subtitle="Three membership tiers — each giving you a bundle of included court hours, an extra discount on all bookings, and extended advance access."
            align="center"
          />
        </motion.div>

        {/* Cards */}
        <motion.div
          className="membership-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          variants={reduced ? {} : gridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          style={{
            gap:         'clamp(1.25rem, 3vw, 1.75rem)',
            alignItems:  'stretch',
          }}
        >
          {membershipTiers.map((tier) => (
            <MembershipCard key={tier.id} tier={tier} reduced={reduced} />
          ))}
        </motion.div>

        {/* Comparison hint */}
        <ComparisonHint reduced={reduced} />

      </Container>
    </section>
  );
};

export default MembershipSection;
