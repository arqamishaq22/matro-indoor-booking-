import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Container from '../common/Container';
import SectionHeading from '../common/SectionHeading';
import {
  Coffee,
  Gamepad2,
  MapPin,
  Clock,
  ArrowRight,
  ShoppingBag,
  Utensils,
  CheckCircle2,
  Monitor,
  Volume2,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   EXPERIENCE DATA
   Only claims supported by the project specification.
   - BaseCamp Cafe: food, drinks, court-side order, pickup
   - PS5 Gaming: promotional display only; booking is not in the court catalog
───────────────────────────────────────────────────────────── */
const EXPERIENCES = [
  {
    id:        'basecamp',
    badge:     'On-Site Bistro',
    badgeColor:'#d97706',
    image:     '/cafa-image.jpg',
    imageAlt:  'BaseCamp Sports Cafe at Matro Indoor Sports Complex',
    accentColor: '#d97706',
    gradientFrom: 'rgba(217,119,6,0.72)',
    gradientTo:   'rgba(9,14,23,0.92)',
    icon:      Coffee,
    title:     'BaseCamp Sports Cafe',
    subtitle:  'Fuel up before, during, or after your game',
    description:
      'The BaseCamp cafe is built into every Matro venue. Grab a cold drink, a quick bite, or a full meal — and get it delivered directly to your court or pick it up at the counter.',
    features: [
      { icon: ShoppingBag, text: 'Order direct to your court'    },
      { icon: Utensils,    text: 'Pickup counter always open'    },
      { icon: Coffee,      text: 'Hot & cold drinks available'   },
      { icon: MapPin,      text: 'Inside every Matro venue'      },
    ],
    cta:       null,   /* no booking action — promotional only */
    ctaLabel:  null,
    note:      'Available at all venues across Lahore & Sialkot',
  },
  {
    id:        'ps5',
    badge:     'Next-Gen Esports',
    badgeColor:'#06b6d4',
    image:     '/cricket-img4.webp',
    imageAlt:  'PS5 VIP Gaming Lounge soundproof pod at Matro',
    accentColor: '#06b6d4',
    gradientFrom: 'rgba(6,182,212,0.62)',
    gradientTo:   'rgba(9,14,23,0.92)',
    icon:      Gamepad2,
    title:     'PS5 VIP Gaming Lounge',
    subtitle:  'Soundproof pods · 4K 120Hz · DualSense Edge',
    description:
      'After your match, step into a soundproofed PS5 gaming pod with a 4K 120Hz display, DualSense Edge controllers, and cafe service.',
    features: [
      { icon: Monitor,  text: '4K 120Hz display per pod'    },
      { icon: Volume2,  text: 'Soundproof pod enclosure'    },
      { icon: Gamepad2, text: 'DualSense Edge controllers'  },
      { icon: Zap,      text: 'Contact the venue for availability and rates' },
    ],
    cta:       null,
    ctaLabel:  null,
    note:      'Ask your venue about gaming lounge availability',
  },
];

/* ─────────────────────────────────────────────────────────────
   EXPERIENCE CARD
───────────────────────────────────────────────────────────── */
const ExperienceCard = ({ exp, reduced, onCta }) => {
  const [hovered, setHovered] = useState(false);
  const Icon = exp.icon;

  return (
    <motion.article
      initial={reduced ? {} : { opacity: 0, y: 28 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduced ? {} : { y: -5 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()   => setHovered(false)}
      aria-label={exp.title}
      style={{
        display:         'flex',
        flexDirection:   'column',
        borderRadius:    'var(--radius-2xl)',
        overflow:        'hidden',
        backgroundColor: 'var(--bg-surface-card)',
        border:          hovered
          ? `1px solid ${exp.accentColor}55`
          : '1px solid var(--border-card)',
        boxShadow:       hovered
          ? `0 24px 48px -8px rgba(0,0,0,0.40), 0 0 32px ${exp.accentColor}18`
          : 'var(--card-shadow)',
        transition:      'border-color var(--transition-normal), box-shadow var(--transition-normal)',
      }}
    >
      {/* ── Image area ──────────────────────────────────────── */}
      <div
        style={{
          position:   'relative',
          height:     'clamp(220px, 30vw, 300px)',
          overflow:   'hidden',
          flexShrink: 0,
        }}
      >
        <img
          src={exp.image}
          alt={exp.imageAlt}
          loading="lazy"
          decoding="async"
          width={800}
          height={500}
          style={{
            width:          '100%',
            height:         '100%',
            objectFit:      'cover',
            objectPosition: 'center',
            display:        'block',
            transform:      hovered && !reduced ? 'scale(1.05)' : 'scale(1)',
            transition:     'transform 0.56s cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        {/* Gradient overlay — brand-tinted scrim */}
        <div
          aria-hidden="true"
          style={{
            position:   'absolute',
            inset:      0,
            background: `linear-gradient(
              to top,
              ${exp.gradientTo}   0%,
              ${exp.gradientFrom} 40%,
              transparent         100%
            )`,
            pointerEvents: 'none',
          }}
        />

        {/* Accent top stripe */}
        <div
          aria-hidden="true"
          style={{
            position:  'absolute',
            top:       0,
            left:      0,
            right:     0,
            height:    '3px',
            background:`linear-gradient(90deg, ${exp.accentColor} 0%, transparent 100%)`,
          }}
        />

        {/* Badge top-left */}
        <div
          style={{
            position:        'absolute',
            top:             '14px',
            left:            '14px',
            display:         'inline-flex',
            alignItems:      'center',
            gap:             '6px',
            padding:         '5px 12px',
            borderRadius:    'var(--radius-full)',
            backgroundColor: `${exp.badgeColor}e8`,
            backdropFilter:  'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color:           '#ffffff',
            fontSize:        'var(--text-xs)',
            fontWeight:      'var(--fw-bold)',
            letterSpacing:   '0.05em',
            textTransform:   'uppercase',
          }}
        >
          <Icon size={13} aria-hidden="true" />
          {exp.badge}
        </div>

        {/* Bottom: title overlay on the image */}
        <div
          style={{
            position: 'absolute',
            bottom:   '16px',
            left:     '16px',
            right:    '16px',
          }}
        >
          <h3
            style={{
              fontSize:      'clamp(1.4rem, 3vw, 1.85rem)',
              fontWeight:    'var(--fw-extrabold)',
              color:         '#ffffff',
              lineHeight:    1.15,
              margin:        0,
              letterSpacing: 'var(--tracking-tight)',
              textShadow:    '0 1px 8px rgba(0,0,0,0.45)',
            }}
          >
            {exp.title}
          </h3>
          <p
            style={{
              fontSize:   'var(--text-xs)',
              color:      'rgba(255,255,255,0.78)',
              marginTop:  '4px',
              fontWeight: 'var(--fw-semibold)',
              letterSpacing: '0.02em',
            }}
          >
            {exp.subtitle}
          </p>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          flex:          1,
          padding:       'clamp(1.4rem, 3vw, 1.85rem)',
          gap:           '1.25rem',
        }}
      >
        {/* Description */}
        <p
          style={{
            fontSize:   'var(--text-sm)',
            color:      'var(--text-secondary)',
            lineHeight: 'var(--lh-base)',
            margin:     0,
          }}
        >
          {exp.description}
        </p>

        {/* Feature list — 2-column grid */}
        <ul
          role="list"
          style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 '0.6rem',
            listStyle:           'none',
            padding:             0,
            margin:              0,
          }}
        >
          {exp.features.map(({ icon: FeatIcon, text }) => (
            <li
              key={text}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '7px',
                fontSize:   'var(--text-xs)',
                color:      'var(--text-secondary)',
                fontWeight: 'var(--fw-medium)',
              }}
            >
              <span
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  width:           '24px',
                  height:          '24px',
                  borderRadius:    'var(--radius-sm)',
                  backgroundColor: `${exp.accentColor}18`,
                  border:          `1px solid ${exp.accentColor}28`,
                  flexShrink:      0,
                }}
              >
                <FeatIcon size={12} color={exp.accentColor} aria-hidden="true" strokeWidth={2.2} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div
          style={{
            marginTop:     'auto',
            paddingTop:    '1.1rem',
            borderTop:     '1px solid var(--border-subtle)',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'space-between',
            flexWrap:      'wrap',
            gap:           '0.75rem',
          }}
        >
          {/* Note */}
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '5px',
              fontSize:   'var(--text-xs)',
              color:      'var(--text-muted)',
              fontWeight: 'var(--fw-medium)',
            }}
          >
            <CheckCircle2 size={12} color={exp.accentColor} aria-hidden="true" />
            {exp.note}
          </div>

          {/* CTA — only PS5 has one; cafe is promotional only */}
          {exp.cta && (
            <motion.button
              type="button"
              onClick={onCta}
              whileHover={reduced ? {} : { scale: 1.04 }}
              whileTap={reduced  ? {} : { scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 440, damping: 22 }}
              aria-label={exp.ctaLabel}
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             '6px',
                padding:         '0.6rem 1.15rem',
                borderRadius:    'var(--radius-md)',
                fontSize:        'var(--text-xs)',
                fontWeight:      'var(--fw-bold)',
                backgroundColor: exp.accentColor,
                color:           '#ffffff',
                border:          '1px solid transparent',
                boxShadow:       `0 4px 14px ${exp.accentColor}38`,
                cursor:          'pointer',
                whiteSpace:      'nowrap',
                transition:      'box-shadow var(--transition-fast)',
              }}
            >
              {exp.ctaLabel}
              <ArrowRight size={13} aria-hidden="true" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────────────────────────── */
const ExperienceSection = () => {
  const reduced  = useReducedMotion();

  return (
    <section
      id="experiences"
      style={{
        paddingTop:      'var(--section-padding-y)',
        paddingBottom:   'var(--section-padding-y)',
        backgroundColor: 'var(--bg-surface)',
        position:        'relative',
        overflow:        'hidden',
      }}
    >
      {/* Ambient dual-glow — one amber left, one cyan right */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          top:          '10%',
          left:         '-4%',
          width:        '300px',
          height:       '300px',
          borderRadius: '50%',
          background:   'radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)',
          filter:       'blur(70px)',
          pointerEvents:'none',
          zIndex:        0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          top:          '10%',
          right:        '-4%',
          width:        '300px',
          height:       '300px',
          borderRadius: '50%',
          background:   'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)',
          filter:       'blur(70px)',
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
            badge="Beyond the Turf"
            title="More Than Just Sports."
            highlight="Unmatched Experiences"
            subtitle="Refuel at BaseCamp Cafe or battle your squad in a soundproof PS5 gaming pod — all inside the same venue."
            align="center"
          />
        </motion.div>

        {/* Two-card split grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(1.25rem,3vw,2rem)]">
          {EXPERIENCES.map((exp) => (
            <ExperienceCard
              key={exp.id}
              exp={exp}
              reduced={reduced}
              onCta={null}
            />
          ))}
        </div>

      </Container>
    </section>
  );
};

export default ExperienceSection;
