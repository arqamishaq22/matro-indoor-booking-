import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useDispatch } from 'react-redux';
import { setSelectedSport } from '../../features/booking/bookingSlice';
import { Users, ArrowRight, Check } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   SPORT IMAGE RESOLVER
   Automatically maps sport to available image in /public
───────────────────────────────────────────────────────────── */
const SPORT_IMAGES = {
  badminton:  '/tains-ball1.jfif',
  cricket:    '/cricket-img.jpg',
  futsal:     '/football-image.jfif',
  football:   '/football-image.jfif',
  padel:      '/padel-image4.jfif',
  pickleball: '/tails-ball.jfif',
  hockey:     '/hockey-img.jfif',
};

const resolveSportImage = (sport) => {
  if (sport?.image) return sport.image;
  if (sport?.imageUrl) return sport.imageUrl;
  const key = `${sport?.id ?? ''} ${sport?.name ?? ''} ${sport?.category ?? ''}`.toLowerCase();
  if (key.includes('badminton')) return '/tains-ball1.jfif';
  if (key.includes('cricket')) return '/cricket-img.jpg';
  if (key.includes('futsal') || key.includes('football') || key.includes('soccer')) return '/football-image.jfif';
  if (key.includes('padel') || key.includes('padal')) return '/padel-image4.jfif';
  if (key.includes('pickleball')) return '/tails-ball.jfif';
  if (key.includes('hockey')) return '/hockey-img.jfif';
  return SPORT_IMAGES[sport?.id] || '/cricket-img.jpg';
};

/* ─────────────────────────────────────────────────────────────
   SPORT CARD
   Props: sport (API-derived object), onBookNow (optional cb)
───────────────────────────────────────────────────────────── */
const SportCard = ({ sport, onBookNow }) => {
  const dispatch = useDispatch();
  const reduced  = useReducedMotion();

  const [hovered, setHovered] = useState(false);

  const handleSelect = () => {
    dispatch(setSelectedSport(sport.id));
    if (onBookNow) {
      onBookNow(sport);
      return;
    }
    const el  = document.getElementById('availability');
    const nav = document.querySelector('header');
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight ?? 72) - 8;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  /* Colour values derived from sport.color */
  const c          = sport.color ?? '#3b82f6';
  const cSoft      = `${c}18`;   /* ~10% opacity */
  const cBorder    = `${c}55`;   /* ~33% opacity */
  const cGlow      = `${c}28`;   /* ~16% opacity */
  const sportImage = resolveSportImage(sport);

  return (
    <motion.article
      /* ── Entrance: triggered by SwiperSlide visibility, not auto-play ── */
      initial={reduced ? {} : { opacity: 0, y: 18 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      /* ── Hover lift ── */
      whileHover={reduced ? {} : { y: -6 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()   => setHovered(false)}
      aria-label={`${sport.name}${sport.startingPrice != null ? ` — from Rs. ${sport.startingPrice.toLocaleString()} per ${sport.unit}` : ''}`}
      style={{
        display:         'flex',
        flexDirection:   'column',
        height:          '100%',
        borderRadius:    'var(--radius-xl)',
        overflow:        'hidden',
        backgroundColor: 'var(--bg-surface-card)',
        border:          hovered ? `1px solid ${cBorder}` : '1px solid var(--border-card)',
        boxShadow:       hovered
          ? `0 20px 38px -8px rgba(0,0,0,0.38), 0 0 28px ${cGlow}`
          : 'var(--card-shadow)',
        transition:      'border-color var(--transition-normal), box-shadow var(--transition-normal)',
        cursor:          'pointer',
        position:        'relative',
      }}
    >
      {/* ── Image area ────────────────────────────────────────── */}
      <div
        style={{
          position:   'relative',
          height:     '216px',
          overflow:   'hidden',
          flexShrink: 0,
        }}
      >
        {/* Subtle base color backdrop */}
        <div
          aria-hidden="true"
          style={{
            position:   'absolute',
            inset:      0,
            background: `linear-gradient(135deg, ${c}40 0%, #09101d 100%)`,
            zIndex:     0,
          }}
        />

        {/* Sport Hero Image */}
        <img
          src={sportImage}
          alt={`${sport.name} court`}
          loading="lazy"
          decoding="async"
          style={{
            position:       'absolute',
            inset:          0,
            width:          '100%',
            height:         '100%',
            objectFit:      'cover',
            objectPosition: 'center',
            display:        'block',
            transform:      hovered && !reduced ? 'scale(1.06)' : 'scale(1)',
            transition:     'transform 0.52s cubic-bezier(0.16,1,0.3,1)',
            zIndex:         1,
          }}
        />

        {/* Dark gradient overlay: fades smoothly from transparent/dark at top into strong dark at bottom */}
        <div
          aria-hidden="true"
          style={{
            position:      'absolute',
            inset:         0,
            background:    'linear-gradient(to bottom, rgba(9,14,23,0.30) 0%, rgba(9,14,23,0.60) 50%, rgba(9,14,23,0.96) 100%)',
            pointerEvents: 'none',
            zIndex:        2,
          }}
        />

        {/* Sport-colour accent line at top of image */}
        <div
          aria-hidden="true"
          style={{
            position:        'absolute',
            top:             0,
            left:            0,
            right:           0,
            height:          '3px',
            background:      sport.accentGradient ?? c,
            zIndex:          3,
          }}
        />

        {/* ── Top badge row ── */}
        <div
          style={{
            position:       'absolute',
            top:            '13px',
            left:           '13px',
            right:          '13px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            gap:            '6px',
            zIndex:         3,
          }}
        >
          {/* Category + badge */}
          <span
            style={{
              padding:        '4px 10px',
              borderRadius:   'var(--radius-sm)',
              fontSize:       'var(--text-xs)',
              fontWeight:     'var(--fw-bold)',
              textTransform:  'uppercase',
              letterSpacing:  '0.06em',
              backgroundColor:'rgba(9,14,23,0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border:         `1px solid ${cBorder}`,
              color:          '#ffffff',
              whiteSpace:     'nowrap',
            }}
          >
            {sport.badge}
          </span>

          {/* Database-backed inventory count */}
          <span
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '3px',
              padding:        '4px 8px',
              borderRadius:   'var(--radius-sm)',
              backgroundColor:'rgba(0,0,0,0.68)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize:       'var(--text-xs)',
              fontWeight:     'var(--fw-bold)',
              color:          '#ffffff',
            }}
          >
              <span>{sport.venueCount} {sport.venueCount === 1 ? 'venue' : 'venues'}</span>
          </span>
        </div>

        {/* ── Bottom image overlay: sport name + price ── */}
        <div
          style={{
            position:       'absolute',
            bottom:         '12px',
            left:           '13px',
            right:          '13px',
            display:        'flex',
            alignItems:     'flex-end',
            justifyContent: 'space-between',
            gap:            '8px',
            zIndex:         3,
          }}
        >
          <div>
            <div
              style={{
                fontSize:      'var(--text-xs)',
                fontWeight:    'var(--fw-bold)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color:         c,
                marginBottom:  '2px',
              }}
            >
              {sport.category}
            </div>
            <h3
              style={{
                fontSize:      'clamp(1.1rem, 2vw, 1.3rem)',
                fontWeight:    'var(--fw-extrabold)',
                color:         '#ffffff',
                lineHeight:    1.15,
                margin:        0,
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              {sport.name}
            </h3>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.2 }}>From</div>
            <div
              style={{
                fontSize:   'clamp(1rem, 1.8vw, 1.15rem)',
                fontWeight: 'var(--fw-extrabold)',
                color:      '#ffffff',
                lineHeight: 1.1,
              }}
            >
              {sport.startingPrice != null ? `Rs. ${sport.startingPrice.toLocaleString()}` : 'Ask for rates'}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.2 }}>
              /{sport.unit}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          flex:          1,
          padding:       '1.1rem 1.2rem 1.2rem',
        }}
      >
        {/* Tagline */}
        <p
          style={{
            fontSize:    'var(--text-sm)',
            color:       'var(--text-secondary)',
            lineHeight:  'var(--lh-sm)',
            marginBottom:'0.85rem',
            flexGrow:    0,
          }}
        >
          {sport.tagline}
        </p>

        {/* Capacity */}
        <div
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '5px',
            fontSize:    'var(--text-xs)',
            fontWeight:  'var(--fw-semibold)',
            color:       'var(--text-muted)',
            marginBottom:'0.85rem',
          }}
        >
          <Users size={13} color="var(--brand-primary)" aria-hidden="true" />
          <span>{sport.players}</span>
        </div>

        {/* Feature chips — max 3 */}
        <ul
          role="list"
          style={{
            display:     'flex',
            flexWrap:    'wrap',
            gap:         '5px',
            marginBottom:'1.1rem',
            padding:     0,
          }}
        >
          {sport.features.slice(0, 3).map((feat) => (
            <li
              key={feat}
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             '4px',
                padding:         '3px 8px',
                borderRadius:    'var(--radius-xs)',
                fontSize:        '0.7rem',
                fontWeight:      'var(--fw-semibold)',
                backgroundColor: cSoft,
                border:          `1px solid ${cBorder}`,
                color:           'var(--text-secondary)',
                whiteSpace:      'nowrap',
              }}
            >
              <Check size={10} color={c} strokeWidth={2.5} aria-hidden="true" />
              {feat}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div style={{ marginTop: 'auto' }}>
          <motion.button
            type="button"
            onClick={handleSelect}
            whileHover={reduced ? {} : { x: 3 }}
            whileTap={reduced  ? {} : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            aria-label={`Select ${sport.name} and check availability`}
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              justifyContent:  'space-between',
              width:           '100%',
              padding:         '0.65rem 1rem',
              borderRadius:    'var(--radius-md)',
              fontSize:        'var(--text-sm)',
              fontWeight:      'var(--fw-bold)',
              color:           hovered ? c : 'var(--text-primary)',
              backgroundColor: hovered ? cSoft : 'var(--bg-surface-elevated)',
              border:          `1px solid ${hovered ? cBorder : 'var(--border-card)'}`,
              cursor:          'pointer',
              transition:      'color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <span>Select &amp; Check Slots</span>
            <ArrowRight
              size={15}
              aria-hidden="true"
              style={{
                transform:  hovered && !reduced ? 'translateX(3px)' : 'none',
                transition: 'transform var(--transition-fast)',
                flexShrink: 0,
              }}
            />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};

export default SportCard;
