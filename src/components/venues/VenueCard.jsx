import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useDispatch } from 'react-redux';
import { setSelectedVenue } from '../../features/booking/bookingSlice';
import {
  MapPin,
  Star,
  Clock,
  Layers,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   SPORT LABEL MAP  (id → display label)
   Keeps the card self-contained without importing sports data
───────────────────────────────────────────────────────────── */
const SPORT_LABELS = {
  cricket:    { label: 'Cricket',    color: '#3b82f6' },
  futsal:     { label: 'Futsal',     color: '#10b981' },
  padel:      { label: 'Padel',      color: '#8b5cf6' },
  pickleball: { label: 'Pickleball', color: '#f59e0b' },
  badminton:  { label: 'Badminton',  color: '#ec4899' },
  'ps5-gaming':{ label: 'PS5 VIP',  color: '#06b6d4' },
};

/* ─────────────────────────────────────────────────────────────
   SCROLL HELPER  — offsets for sticky navbar
   Accepts `reduced` param from the component to respect prefers-reduced-motion
───────────────────────────────────────────────────────────── */
const scrollToId = (id, reduced = false) => {
  const el  = document.getElementById(id);
  const nav = document.querySelector('header');
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight ?? 72) - 8;
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
};

/* ═════════════════════════════════════════════════════════════
   VENUE CARD
   Props
   ──────
   venue    {object}  venue record returned by the API  (required)
   linkTo   {string}  react-router path for "View Details" link
                      e.g. "/venues/fr-dha-phase-5"
   onSelect {function} optional callback(venue) when CTA clicked
   compact  {boolean}  tighter layout for venue grid pages
═════════════════════════════════════════════════════════════ */
const VenueCard = ({ venue, linkTo, onSelect, compact = false }) => {
  const dispatch = useDispatch();
  const reduced  = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  /* ── CTA handler ─────────────────────────────────────────── */
  const handleCheckAvailability = () => {
    /* 1. Preselect this venue in Redux (QuickBooking reads from store) */
    dispatch(setSelectedVenue(venue.id));

    /* 2. Delegate to parent if provided (for future venue detail pages) */
    if (onSelect) {
      onSelect(venue);
      return;
    }

    /* 3. Default: scroll to QuickBooking panel at top of page */
    scrollToId('home', reduced);
  };

  /* ── Derived values ──────────────────────────────────────── */
  const sports = venue.sports ?? [...new Set((venue.courts ?? []).map((court) => court.sport))];
  const amenities = venue.amenities ?? [];
  const visibleSports   = sports.slice(0, 4);
  const extraSports     = sports.length - visibleSports.length;
  const visibleAmenities = amenities.slice(0, 3);
  const extraAmenities  = amenities.length - visibleAmenities.length;
  const startingPrice = venue.startingPrice;
  const priceLabel = startingPrice != null ? `Starting from Rs. ${Number(startingPrice).toLocaleString()} per ${venue.unit ?? 'hour'}` : 'See current pricing';

  return (
    <motion.article
      className="venue-card"
      /* Entrance — staggered by parent Swiper slide index */
      initial={reduced ? {} : { opacity: 0, y: 20 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
      /* Hover lift */
      whileHover={reduced ? {} : { y: -5 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()   => setHovered(false)}
      aria-label={`${venue.name} — ${venue.city}. ${priceLabel}.`}
      style={{
        display:         'flex',
        flexDirection:   'column',
        height:          '100%',
        borderRadius:    'var(--radius-xl)',
        overflow:        'hidden',
        backgroundColor: 'var(--bg-surface-card)',
        border:          hovered
          ? '1px solid rgba(16,185,129,0.45)'
          : '1px solid var(--border-card)',
        boxShadow:       hovered
          ? '0 22px 42px -8px rgba(0,0,0,0.40), 0 0 30px rgba(16,185,129,0.12)'
          : 'var(--card-shadow)',
        transition:      'border-color var(--transition-normal), box-shadow var(--transition-normal)',
        cursor:          'pointer',
      }}
    >

      {/* ══════════════════════════════════════════════════════
          IMAGE AREA
      ══════════════════════════════════════════════════════ */}
      <div
        style={{
          position:   'relative',
          height:     compact ? '180px' : '220px',
          overflow:   'hidden',
          flexShrink: 0,
        }}
      >
        <img
          src={venue.image ?? venue.imageUrl}
          alt={`${venue.name} indoor sports facility`}
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
            transform:      hovered && !reduced ? 'scale(1.06)' : 'scale(1)',
            transition:     'transform 0.54s cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        {/* Scrim */}
        <div
          aria-hidden="true"
          style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(to top, rgba(9,14,23,0.90) 0%, rgba(9,14,23,0.14) 55%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Top-left: venue badge ── */}
        <div
          style={{
            position:       'absolute',
            top:            '13px',
            left:           '13px',
            right:          '13px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            gap:            '8px',
          }}
        >
          <span
            style={{
              padding:         '4px 11px',
              borderRadius:    'var(--radius-sm)',
              fontSize:        'var(--text-xs)',
              fontWeight:      'var(--fw-bold)',
              textTransform:   'uppercase',
              letterSpacing:   '0.05em',
              backgroundColor: 'var(--brand-primary)',
              color:           '#ffffff',
              boxShadow:       '0 2px 10px rgba(16,185,129,0.35)',
              whiteSpace:      'nowrap',
            }}
          >
            {venue.badge}
          </span>

          {/* Rating chip */}
          <span
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '3px',
              padding:         '4px 9px',
              borderRadius:    'var(--radius-sm)',
              backgroundColor: 'rgba(0,0,0,0.70)',
              backdropFilter:  'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize:        'var(--text-xs)',
              fontWeight:      'var(--fw-bold)',
              color:           '#fbbf24',
              whiteSpace:      'nowrap',
            }}
          >
            <Star size={12} fill="#fbbf24" strokeWidth={0} aria-hidden="true" />
            <span aria-label={`Rating ${venue.rating}`}>{venue.rating}</span>
            <span
              style={{
                color:      'var(--text-muted)',
                fontSize:   '0.68rem',
                fontWeight: 'var(--fw-medium)',
              }}
            >
              ({venue.reviewsCount})
            </span>
          </span>
        </div>

        {/* ── Bottom-left: court count chip ── */}
        <div
          style={{
            position:        'absolute',
            bottom:          '13px',
            left:            '13px',
            display:         'flex',
            alignItems:      'center',
            gap:             '5px',
            padding:         '4px 10px',
            borderRadius:    'var(--radius-full)',
            backgroundColor: 'rgba(9,14,23,0.78)',
            backdropFilter:  'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border:          '1px solid rgba(255,255,255,0.10)',
            fontSize:        'var(--text-xs)',
            fontWeight:      'var(--fw-bold)',
            color:           '#34d399',
          }}
        >
          <Layers size={12} aria-hidden="true" />
          <span>{venue.availableCourts} Courts &amp; Arenas</span>
        </div>

        {/* ── Bottom-right: city pill ── */}
        <div
          style={{
            position:        'absolute',
            bottom:          '13px',
            right:           '13px',
            display:         'flex',
            alignItems:      'center',
            gap:             '4px',
            padding:         '4px 9px',
            borderRadius:    'var(--radius-full)',
            backgroundColor: 'rgba(9,14,23,0.78)',
            backdropFilter:  'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border:          '1px solid rgba(255,255,255,0.10)',
            fontSize:        'var(--text-xs)',
            fontWeight:      'var(--fw-semibold)',
            color:           '#cbd5e1',
          }}
        >
          <MapPin size={11} color="#38bdf8" aria-hidden="true" />
          {venue.city}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          BODY
      ══════════════════════════════════════════════════════ */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          flex:          1,
          padding:       compact ? '1rem 1.1rem 1.1rem' : '1.2rem 1.3rem 1.3rem',
          gap:           '0.7rem',
        }}
      >

        {/* Venue name */}
        <div>
          <h3
            style={{
              fontSize:      'clamp(1.05rem, 2vw, 1.2rem)',
              fontWeight:    'var(--fw-extrabold)',
              color:         'var(--text-primary)',
              lineHeight:    1.2,
              margin:        0,
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            {venue.name}
          </h3>

          {/* Location */}
          <div
            style={{
              display:    'flex',
              alignItems: 'flex-start',
              gap:        '5px',
              marginTop:  '0.35rem',
              fontSize:   'var(--text-xs)',
              color:      'var(--text-secondary)',
            }}
          >
            <MapPin
              size={12}
              color="var(--brand-secondary)"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: '1px' }}
            />
            <span>{venue.location}</span>
          </div>
        </div>

        {/* Operating hours */}
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '5px',
            fontSize:   'var(--text-xs)',
            fontWeight: 'var(--fw-semibold)',
            color:      'var(--text-muted)',
          }}
        >
          <Clock size={12} color="var(--brand-accent)" aria-hidden="true" />
          <span>{venue.operatingHours}</span>
        </div>

        {/* Sports available */}
        <div>
          <div
            style={{
              fontSize:      'var(--text-xs)',
              fontWeight:    'var(--fw-bold)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color:         'var(--text-muted)',
              marginBottom:  '0.4rem',
            }}
          >
            Sports Offered
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {visibleSports.map((sportId) => {
              const meta = SPORT_LABELS[sportId] ?? { label: sportId, color: 'var(--brand-primary)' };
              return (
                <span
                  key={sportId}
                  style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    gap:             '4px',
                    padding:         '3px 8px',
                    borderRadius:    'var(--radius-xs)',
                    fontSize:        '0.7rem',
                    fontWeight:      'var(--fw-bold)',
                    backgroundColor: `${meta.color}16`,
                    border:          `1px solid ${meta.color}40`,
                    color:           meta.color,
                    whiteSpace:      'nowrap',
                  }}
                >
                  <span
                    style={{
                      width:           '5px',
                      height:          '5px',
                      borderRadius:    '50%',
                      backgroundColor: meta.color,
                      flexShrink:      0,
                    }}
                    aria-hidden="true"
                  />
                  {meta.label}
                </span>
              );
            })}
            {extraSports > 0 && (
              <span
                style={{
                  padding:         '3px 8px',
                  borderRadius:    'var(--radius-xs)',
                  fontSize:        '0.7rem',
                  fontWeight:      'var(--fw-bold)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border:          '1px solid var(--border-subtle)',
                  color:           'var(--text-muted)',
                }}
              >
                +{extraSports}
              </span>
            )}
          </div>
        </div>

        {/* Amenity chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {visibleAmenities.map((amenity) => (
            <span
              key={amenity}
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             '3px',
                padding:         '3px 8px',
                borderRadius:    'var(--radius-xs)',
                fontSize:        '0.68rem',
                fontWeight:      'var(--fw-medium)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border:          '1px solid var(--border-subtle)',
                color:           'var(--text-secondary)',
                whiteSpace:      'nowrap',
              }}
            >
              <CheckCircle2 size={10} color="var(--brand-primary)" aria-hidden="true" />
              {amenity}
            </span>
          ))}
          {extraAmenities > 0 && (
            <span
              style={{
                padding:      '3px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize:     '0.68rem',
                fontWeight:   'var(--fw-semibold)',
                color:        'var(--brand-primary)',
                backgroundColor: 'var(--color-primary-soft)',
                border:       '1px solid var(--color-primary-border)',
              }}
            >
              +{extraAmenities} more
            </span>
          )}
        </div>

        {/* ── Pricing + CTA footer ─────────────────────────────── */}
        <div
          style={{
            marginTop:      'auto',
            paddingTop:     '0.9rem',
            borderTop:      '1px solid var(--border-subtle)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            gap:            '0.75rem',
          }}
        >
          {/* Price */}
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                fontSize:   'var(--text-xs)',
                color:      'var(--text-muted)',
                lineHeight: 1.2,
              }}
            >
              Starting at
            </div>
            <div
              style={{
                display:    'flex',
                alignItems: 'baseline',
                gap:        '2px',
              }}
            >
              <span
                style={{
                  fontSize:   'clamp(1.05rem, 2vw, 1.2rem)',
                  fontWeight: 'var(--fw-extrabold)',
                  color:      'var(--text-primary)',
                  lineHeight: 1.1,
                }}
              >
                {startingPrice != null ? `Rs. ${Number(startingPrice).toLocaleString()}` : 'See rates'}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color:    'var(--text-muted)',
                }}
              >
                /{venue.unit ?? 'hour'}
              </span>
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* View Details route link — shown when linkTo is provided */}
            {linkTo && (
              <Link
                to={linkTo}
                aria-label={`View details for ${venue.name}`}
                style={{
                  display:         'inline-flex',
                  alignItems:      'center',
                  gap:             '4px',
                  padding:         '0.6rem 0.85rem',
                  borderRadius:    'var(--radius-md)',
                  fontSize:        'var(--text-sm)',
                  fontWeight:      'var(--fw-semibold)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color:           'var(--text-secondary)',
                  border:          '1px solid var(--border-subtle)',
                  textDecoration:  'none',
                  whiteSpace:      'nowrap',
                  transition:      'border-color var(--transition-fast), color var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-primary)';
                  e.currentTarget.style.color       = 'var(--brand-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color       = 'var(--text-secondary)';
                }}
              >
                <ExternalLink size={13} aria-hidden="true" />
                Details
              </Link>
            )}

            {/* Check Availability CTA */}
            <motion.button
              type="button"
              onClick={handleCheckAvailability}
              whileHover={reduced ? {} : { scale: 1.04 }}
              whileTap={reduced  ? {} : { scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 440, damping: 22 }}
              aria-label={`Check availability at ${venue.name}`}
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             '6px',
                padding:         '0.6rem 1.1rem',
                borderRadius:    'var(--radius-md)',
                fontSize:        'var(--text-sm)',
                fontWeight:      'var(--fw-bold)',
                backgroundColor: 'var(--brand-primary)',
                color:           '#ffffff',
                border:          '1px solid transparent',
                boxShadow:       hovered
                  ? '0 6px 20px rgba(16,185,129,0.45)'
                  : '0 4px 14px var(--brand-primary-glow)',
                cursor:          'pointer',
                whiteSpace:      'nowrap',
                transition:      'box-shadow var(--transition-fast)',
              }}
            >
              Book
              <ArrowRight size={14} aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default VenueCard;
