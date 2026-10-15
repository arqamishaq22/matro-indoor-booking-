import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Radar,
  Layers,
  MapPin,
  TrendingDown,
  MessageCircle,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react';
import Container from '../common/Container';
import SectionHeading from '../common/SectionHeading';

/* ─────────────────────────────────────────────────────────────
   FEATURE DATA
   Only capabilities grounded in the project specification.
   No invented statistics, fake reviews, or unsupported claims.
───────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    id:          'real-time',
    icon:        Radar,
    color:       '#10b981',
    title:       'Real-Time Slot Availability',
    description:
      'Every court slot you see is live. Availability updates the moment a booking is placed, so you never land on a double-booked court.',
    detail:      'Instant court locking on confirmation',
  },
  {
    id:          'multi-sport',
    icon:        Layers,
    color:       '#3b82f6',
    title:       'Multi-Sport Booking',
    description:
      'One platform for Cricket, Football/Futsal, Padel Tennis, Pickleball, Badminton, and PS5 VIP Gaming — no separate apps or accounts.',
    detail:      '5 sports + gaming under one roof',
  },
  {
    id:          'multiple-venues',
    icon:        MapPin,
    color:       '#8b5cf6',
    title:       'Multiple Venues',
    description:
      'Choose from Matro DHA Phase 5, Matro Wapda Town, Matro Valencia, Cross Courts, and Matro Sports Arena Sialkot — all bookable from this single platform.',
    detail:      '5 venues across Lahore & Sialkot',
  },
  {
    id:          'dynamic-pricing',
    icon:        TrendingDown,
    color:       '#f59e0b',
    title:       'Dynamic Pricing',
    description:
      'Off-peak morning and late-night slots are priced lower than prime evening hours. Book smart and save on the same professional courts.',
    detail:      'Off-peak discounts on every court',
  },
  {
    id:          'whatsapp',
    icon:        MessageCircle,
    color:       '#22c55e',
    title:       'WhatsApp Support',
    description:
      'Need to book a corporate league, arrange a referee, or modify an existing reservation? Reach our concierge team directly on WhatsApp.',
    detail:      'Direct concierge on WhatsApp',
  },
  {
    id:          'easy-booking',
    icon:        CalendarCheck,
    color:       '#0ea5e9',
    title:       'Easy Booking Experience',
    description:
      'Select your sport, pick a venue, choose a date and time slot, then confirm — no account creation required for a quick availability check.',
    detail:      'Sport → Venue → Date → Done',
  },
];

/* ─────────────────────────────────────────────────────────────
   MOTION VARIANTS
───────────────────────────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0,
    transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] } },
};

/* ─────────────────────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────────────────────── */
const FeatureCard = ({ feature, reduced }) => {
  const [hovered, setHovered] = useState(false);
  const Icon = feature.icon;
  const c    = feature.color;

  return (
    <motion.article
      variants={reduced ? {} : cardVariants}
      whileHover={reduced ? {} : { y: -5 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()   => setHovered(false)}
      aria-label={feature.title}
      style={{
        display:         'flex',
        flexDirection:   'column',
        padding:         'clamp(1.4rem, 3vw, 1.85rem)',
        borderRadius:    'var(--radius-xl)',
        backgroundColor: 'var(--bg-surface-card)',
        border:          hovered
          ? `1px solid ${c}55`
          : '1px solid var(--border-card)',
        boxShadow:       hovered
          ? `0 18px 36px -8px rgba(0,0,0,0.32), 0 0 22px ${c}1a`
          : 'var(--card-shadow)',
        transition:      'border-color var(--transition-normal), box-shadow var(--transition-normal)',
        height:          '100%',
      }}
    >
      {/* Icon block + detail badge row */}
      <div
        style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            '0.75rem',
          marginBottom:   '1.25rem',
        }}
      >
        {/* Icon container */}
        <div
          style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            width:           '52px',
            height:          '52px',
            borderRadius:    'var(--radius-lg)',
            backgroundColor: `${c}16`,
            border:          `1px solid ${c}30`,
            flexShrink:      0,
            transition:      'background-color var(--transition-normal)',
          }}
        >
          <Icon
            size={24}
            color={c}
            aria-hidden="true"
            strokeWidth={2}
          />
        </div>

        {/* Detail pill */}
        <span
          style={{
            display:         'inline-flex',
            alignItems:      'center',
            padding:         '3px 10px',
            borderRadius:    'var(--radius-full)',
            fontSize:        '0.68rem',
            fontWeight:      'var(--fw-bold)',
            letterSpacing:   '0.03em',
            backgroundColor: `${c}14`,
            border:          `1px solid ${c}28`,
            color:           c,
            whiteSpace:      'nowrap',
            lineHeight:      1.4,
            marginTop:       '3px',
            textAlign:       'right',
          }}
        >
          {feature.detail}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize:      'clamp(1rem, 1.8vw, 1.15rem)',
          fontWeight:    'var(--fw-bold)',
          color:         'var(--text-primary)',
          lineHeight:    1.25,
          marginBottom:  '0.6rem',
          letterSpacing: 'var(--tracking-tight)',
        }}
      >
        {feature.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize:   'var(--text-sm)',
          color:      'var(--text-secondary)',
          lineHeight: 'var(--lh-base)',
          margin:     0,
          flex:       1,
        }}
      >
        {feature.description}
      </p>

      {/* Bottom accent line — grows in on hover */}
      <div
        aria-hidden="true"
        style={{
          marginTop:       '1.25rem',
          height:          '2px',
          borderRadius:    'var(--radius-full)',
          background:      `linear-gradient(90deg, ${c} 0%, ${c}00 100%)`,
          transform:       hovered && !reduced ? 'scaleX(1)' : 'scaleX(0.35)',
          transformOrigin: 'left center',
          transition:      'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
          opacity:         0.7,
        }}
      />
    </motion.article>
  );
};

/* ─────────────────────────────────────────────────────────────
   WHATSAPP BANNER
───────────────────────────────────────────────────────────── */
const WhatsAppBanner = ({ reduced }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 18 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        flexWrap:        'wrap',
        gap:             '1.5rem',
        padding:         'clamp(1.4rem, 3vw, 2rem)',
        borderRadius:    'var(--radius-xl)',
        background:      'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.05) 100%)',
        border:          '1px solid rgba(34,197,94,0.28)',
        boxShadow:       'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '240px' }}>
        {/* WhatsApp icon circle */}
        <div
          aria-hidden="true"
          style={{
            width:           '48px',
            height:          '48px',
            borderRadius:    '50%',
            backgroundColor: '#25D366',
            color:           '#ffffff',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            boxShadow:       '0 4px 14px rgba(37,211,102,0.38)',
            flexShrink:      0,
          }}
        >
          <MessageCircle size={24} strokeWidth={2} />
        </div>

        <div>
          <h4
            style={{
              fontSize:      'clamp(1rem, 2vw, 1.2rem)',
              fontWeight:    'var(--fw-extrabold)',
              color:         'var(--text-primary)',
              lineHeight:    1.2,
              marginBottom:  '0.25rem',
            }}
          >
            Corporate Event or Group Booking?
          </h4>
          <p
            style={{
              fontSize:   'var(--text-sm)',
              color:      'var(--text-secondary)',
              margin:     0,
              lineHeight: 'var(--lh-sm)',
            }}
          >
            Chat directly with our concierge for group packages, referee arrangements, and custom scheduling.
          </p>
        </div>
      </div>

      {/* CTA */}
      <motion.a
        href="https://wa.me/18005556287?text=Hi%20Matro%2C%20I%20want%20to%20enquire%20about%20group%20bookings"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Matro concierge on WhatsApp"
        whileHover={reduced ? {} : { scale: 1.04 }}
        whileTap={reduced  ? {} : { scale: 0.97 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        style={{
          display:         'inline-flex',
          alignItems:      'center',
          gap:             '8px',
          padding:         '0.75rem 1.5rem',
          borderRadius:    'var(--radius-lg)',
          backgroundColor: '#25D366',
          color:           '#ffffff',
          fontWeight:      'var(--fw-bold)',
          fontSize:        'var(--text-sm)',
          textDecoration:  'none',
          boxShadow:       hovered
            ? '0 8px 22px rgba(37,211,102,0.5)'
            : '0 4px 14px rgba(37,211,102,0.35)',
          transition:      'box-shadow var(--transition-fast)',
          whiteSpace:      'nowrap',
          flexShrink:      0,
        }}
      >
        Chat on WhatsApp
        <ArrowRight size={15} aria-hidden="true" />
      </motion.a>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────────────────────────── */
const WhyChooseUs = () => {
  const reduced = useReducedMotion();

  return (
    <section
      id="why-us"
      style={{
        paddingTop:      'var(--section-padding-y)',
        paddingBottom:   'var(--section-padding-y)',
        backgroundColor: 'var(--bg-surface)',
        position:        'relative',
        overflow:        'hidden',
      }}
    >
      {/* Subtle background accent */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          bottom:       '-5%',
          right:        '-5%',
          width:        '380px',
          height:       '380px',
          borderRadius: '50%',
          background:   'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
          filter:       'blur(80px)',
          pointerEvents:'none',
          zIndex:        0,
          opacity:       0.45,
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
            badge="The Matro Standard"
            title="Why Players & Teams"
            highlight="Choose Matro"
            subtitle="Six reasons the Matro platform makes your indoor sports experience faster, simpler, and more dependable."
            align="center"
          />
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          className="feature-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          variants={reduced ? {} : containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          style={{
            gap:          'clamp(1rem, 2.5vw, 1.5rem)',
            marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)',
          }}
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} reduced={reduced} />
          ))}
        </motion.div>

        {/* WhatsApp concierge banner */}
        <WhatsAppBanner reduced={reduced} />

      </Container>
    </section>
  );
};

export default WhyChooseUs;
