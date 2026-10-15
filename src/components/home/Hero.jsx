import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  Zap,
  ShieldCheck,
  Clock,
  ChevronRight,
} from 'lucide-react';
import Container from '../common/Container';
import Button from '../common/Button';
import QuickBooking from '../booking/QuickBooking';
import { getAvailability, getSports, getVenues } from '../../services/bookingService';

const SPORT_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

/* ─────────────────────────────────────────────────────────────────
   TRUST SIGNALS  — grounded in the project spec
───────────────────────────────────────────────────────────────── */
const TRUST_ITEMS = [
  { icon: MapPin,        label: 'Loading venues…',   sub: 'Lahore & Sialkot'   },
  { icon: Clock,         label: 'Loading hours…',    sub: 'Venue-specific hours' },
  { icon: ShieldCheck,   label: 'Instant Court Lock', sub: 'Real-time booking'  },
  { icon: CalendarCheck, label: 'Loading sports…',   sub: 'All under one roof' },
];

/* ─────────────────────────────────────────────────────────────────
   MOTION VARIANTS
───────────────────────────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 22 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.52, ease: [0.16, 1, 0.3, 1], delay },
});

const fadeIn = (delay = 0) => ({
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  transition: { duration: 0.45, ease: 'easeOut', delay },
});

const slideRight = (delay = 0) => ({
  initial:    { opacity: 0, x: 32 },
  animate:    { opacity: 1, x: 0  },
  transition: { duration: 0.56, ease: [0.16, 1, 0.3, 1], delay },
});

/* ─────────────────────────────────────────────────────────────────
   HERO COMPONENT
───────────────────────────────────────────────────────────────── */
const Hero = () => {
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const [catalog, setCatalog] = useState({ sports: [], venueCount: null, venueHours: null, error: '' });
  const [availabilityPreview, setAvailabilityPreview] = useState({
    status: 'loading',
    venue: null,
    court: null,
    timeSlots: [],
    error: '',
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSports(), getVenues()])
      .then(([sports, venues]) => {
        const hours = [...new Set(venues.map((venue) => venue.operatingHours).filter(Boolean))];
        const venueHours = hours.length === 1 ? hours[0] : hours.length ? 'Venue-specific hours' : null;
        if (!cancelled) setCatalog({ sports, venueCount: venues.length, venueHours, error: '' });
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalog((current) => ({ ...current, error: err.message || 'Unable to load sports and venues.' }));
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPreview = async () => {
      try {
        const venues = await getVenues();
        const selection = venues
          .flatMap((venue) => (venue.courts ?? []).map((court) => ({ venue, court })))
          .find(({ court }) => court.sport === 'padel')
          ?? venues.flatMap((venue) => (venue.courts ?? []).map((court) => ({ venue, court })))[0];

        if (!selection) throw new Error('No active courts are available.');

        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const schedule = await getAvailability({
          venueId: selection.venue.id,
          sportId: selection.court.sport,
          date,
        });

        if (!cancelled) {
          setAvailabilityPreview({
            status: 'success',
            venue: selection.venue,
            court: selection.court,
            timeSlots: schedule.timeSlots.slice(0, 8),
            schedule,
            error: '',
          });
        }
      } catch (err) {
        if (!cancelled) {
          setAvailabilityPreview({
            status: 'error',
            venue: null,
            court: null,
            timeSlots: [],
            error: err.message || 'Unable to load live availability.',
          });
        }
      }
    };
    loadPreview();
    return () => { cancelled = true; };
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navH = document.querySelector('header')?.offsetHeight ?? 72;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - navH - 8,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  /* Helpers to conditionally apply Motion props */
  const mp = (variants) =>
    reduced
      ? {}
      : { initial: variants.initial, animate: variants.animate, transition: variants.transition };

  return (
    <section
      id="home"
      ref={sectionRef}
      style={{
        position:   'relative',
        overflow:   'hidden',
        paddingTop: 'clamp(3rem, 6vw, 5rem)',
        paddingBottom: 0,
      }}
    >
      {/* ── Ambient background glow ─────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          top:          '-18%',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        'min(860px, 120vw)',
          height:       '580px',
          borderRadius: '50%',
          background:   'var(--gradient-hero-glow)',
          filter:       'blur(72px)',
          pointerEvents:'none',
          zIndex:        0,
          opacity:       0.85,
        }}
      />

      <Container style={{ position: 'relative', zIndex: 1 }}>

        {/* ══════════════════════════════════════════════════════════
            TOP ANNOUNCEMENT PILL
        ══════════════════════════════════════════════════════════ */}
        <motion.div
          {...mp(fadeUp(0))}
          style={{
            display:        'flex',
            justifyContent: 'center',
            marginBottom:   'clamp(1.25rem, 3vw, 2rem)',
            /* Prevent pill from forcing page-width on 320px */
            overflow:       'hidden',
          }}
        >
          <div
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              flexWrap:        'wrap',
              gap:             '6px',
              padding:         '6px 14px 6px 7px',
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border:          '1px solid var(--border-card)',
              boxShadow:       'var(--shadow-sm)',
              fontSize:        'var(--text-xs)',
              fontWeight:      'var(--fw-medium)',
              color:           'var(--text-secondary)',
              /* Hard cap so it never stretches wider than its container */
              maxWidth:        '100%',
            }}
          >
            <span
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             '5px',
                backgroundColor: 'var(--color-primary-soft)',
                border:          '1px solid var(--color-primary-border)',
                color:           'var(--brand-primary)',
                fontWeight:      'var(--fw-bold)',
                fontSize:        'var(--text-xs)',
                padding:         '3px 10px',
                borderRadius:    'var(--radius-full)',
                whiteSpace:      'nowrap',
                flexShrink:      0,
              }}
            >
              <Zap size={12} aria-hidden="true" />
              NEW ARENAS
            </span>
            <span style={{ minWidth: 0, overflowWrap: 'break-word' }}>
              Explore premium padel and futsal courts at Matro venues
            </span>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            TWO-COLUMN HERO GRID
            Mobile: stacked (image first via order-first on hero-right)
            Tablet (md): 2 equal columns
            Desktop (lg): left slightly wider (55/45)
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr] gap-[clamp(2.5rem,5vw,3.5rem)] lg:gap-[clamp(3rem,5vw,5rem)] items-start md:items-center">

          {/* ── LEFT: Copy + CTAs ────────────────────────────────── */}
          <div className="hero-left order-1 md:order-none">

            {/* Sport pills */}
            <motion.div
              {...mp(fadeUp(0.06))}
              style={{
                display:   'flex',
                flexWrap:  'wrap',
                gap:       '0.45rem',
                marginBottom: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              }}
            >
              {catalog.sports.map((sport, i) => {
                const color = SPORT_COLORS[i % SPORT_COLORS.length];
                return (
                <motion.span
                  key={sport.id}
                  {...(reduced ? {} : {
                    initial:    { opacity: 0, scale: 0.88 },
                    animate:    { opacity: 1, scale: 1 },
                    transition: { duration: 0.3, delay: 0.08 + i * 0.055, ease: [0.16, 1, 0.3, 1] },
                  })}
                  style={{
                    display:      'inline-flex',
                    alignItems:   'center',
                    gap:          '5px',
                    padding:      '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize:     '0.72rem',
                    fontWeight:   'var(--fw-bold)',
                    letterSpacing:'0.02em',
                    color,
                    backgroundColor: `${color}14`,
                    border:       `1px solid ${color}30`,
                    whiteSpace:   'nowrap',
                  }}
                >
                  <span
                    style={{
                      width:        '5px',
                      height:       '5px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      flexShrink:   0,
                    }}
                    aria-hidden="true"
                  />
                  {sport.name}
                </motion.span>
              ); })}
              {!catalog.sports.length && !catalog.error && (
                <span role="status" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading sports…</span>
              )}
              {catalog.error && <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-danger)' }}>{catalog.error}</span>}
            </motion.div>

            {/* H1 Heading */}
            <motion.h1
              {...mp(fadeUp(0.1))}
              style={{
                fontSize:      'clamp(2.2rem, 4.8vw, 4rem)',
                fontWeight:    'var(--fw-extrabold)',
                lineHeight:    1.07,
                letterSpacing: 'var(--tracking-tighter)',
                marginBottom:  'clamp(1rem, 2vw, 1.5rem)',
                color:         'var(--text-primary)',
              }}
            >
              Book Premium{' '}
              <span className="gradient-text">Indoor Arenas</span>{' '}
              <br />
              Across Lahore{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 'var(--fw-bold)' }}>&amp;</span>{' '}
              Sialkot.
            </motion.h1>

            {/* Supporting copy */}
            <motion.p
              {...mp(fadeUp(0.16))}
              style={{
                fontSize:     'clamp(1rem, 1.6vw, 1.15rem)',
                color:        'var(--text-secondary)',
                lineHeight:   'var(--lh-lg)',
                marginBottom: 'clamp(1.5rem, 3vw, 2.25rem)',
                maxWidth:     '52ch',
              }}
            >
              {catalog.sports.length
                ? `${catalog.sports.map((sport) => sport.name).join(', ')} — and a PS5 VIP Gaming Lounge. `
                : ''}
              {catalog.venueCount === null
                ? 'Check real-time availability and lock your court in seconds.'
                : `${catalog.venueCount} ${catalog.venueCount === 1 ? 'venue' : 'venues'}, ${catalog.sports.length} court ${catalog.sports.length === 1 ? 'sport' : 'sports'}, one platform. Check real-time availability and lock your court in seconds.`}
            </motion.p>

            {/* CTA Row */}
            <motion.div
              {...mp(fadeUp(0.22))}
              style={{
                display:   'flex',
                flexWrap:  'wrap',
                gap:       '0.75rem',
                marginBottom: 'clamp(2rem, 4vw, 3rem)',
              }}
            >
              <motion.div
                whileHover={reduced ? {} : { scale: 1.03 }}
                whileTap={reduced  ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 440, damping: 22 }}
              >
                <Button
                  variant="glow"
                  size="lg"
                  onClick={() => scrollTo('availability')}
                  rightIcon={<ArrowRight size={17} aria-hidden="true" />}
                >
                  Check Availability
                </Button>
              </motion.div>

              <motion.div
                whileHover={reduced ? {} : { scale: 1.02 }}
                whileTap={reduced  ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 440, damping: 22 }}
              >
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => scrollTo('sports')}
                  rightIcon={<ChevronRight size={16} aria-hidden="true" />}
                >
                  Explore Sports
                </Button>
              </motion.div>
            </motion.div>

            {/* Trust signal strip */}
            <motion.div
              {...mp(fadeUp(0.28))}
              style={{
                display:   'flex',
                flexWrap:  'wrap',
                gap:       '0.5rem 1.5rem',
                paddingTop:'1.25rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {TRUST_ITEMS.map(({ icon: Icon, label, sub }, index) => {
                const liveLabel = index === 0
                  ? catalog.venueCount !== null
                    ? `${catalog.venueCount} ${catalog.venueCount === 1 ? 'Venue' : 'Venues'}`
                    : catalog.error ? 'Venues unavailable' : label
                  : index === 1
                    ? catalog.venueHours ?? (catalog.venueCount !== null || catalog.error ? 'Hours unavailable' : label)
                    : index === 3
                      ? catalog.venueCount !== null
                        ? `${catalog.sports.length} ${catalog.sports.length === 1 ? 'Sport' : 'Sports'} + Gaming`
                        : catalog.error ? 'Sports unavailable' : label
                      : label;
                return (
                <div
                  key={Icon.displayName ?? label}
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '8px',
                  }}
                >
                  <span
                    style={{
                      display:         'inline-flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      width:           '32px',
                      height:          '32px',
                      borderRadius:    'var(--radius-sm)',
                      backgroundColor: 'var(--color-primary-soft)',
                      color:           'var(--brand-primary)',
                      flexShrink:      0,
                    }}
                  >
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize:   'var(--text-sm)',
                        fontWeight: 'var(--fw-bold)',
                        color:      'var(--text-primary)',
                        lineHeight: 1.2,
                      }}
                    >
                      {liveLabel}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color:    'var(--text-muted)',
                      }}
                    >
                      {sub}
                    </div>
                  </div>
                </div>
              ); })}
            </motion.div>
          </div>

          {/* ── RIGHT: Image + decorative booking widget ─────────── */}
          <motion.div
            {...mp(slideRight(0.14))}
            className="hero-right order-first md:order-none"
          >
            {/* Main image container */}
            <motion.div
              whileHover={reduced ? {} : { y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              style={{
                position:     'relative',
                borderRadius: 'var(--radius-2xl)',
                overflow:     'hidden',
                border:       '1px solid var(--border-card)',
                boxShadow:    'var(--shadow-xl)',
                aspectRatio:  '4/5',
                backgroundColor: 'var(--bg-surface-elevated)',
              }}
            >
              <motion.img
                src="/padel-image4.jfif"
                alt="Panoramic glass padel court at Matro Indoor Sports Complex"
                whileHover={reduced ? {} : { scale: 1.04 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width:      '100%',
                  height:     '100%',
                  objectFit:  'cover',
                  objectPosition: 'center',
                  display:    'block',
                }}
              />

              {/* Bottom scrim for text readability */}
              <div className="image-scrim" aria-hidden="true" />

              {/* ── Decorative: floating availability widget ──── */}
              <motion.div
                {...(reduced ? {} : {
                  initial:    { opacity: 0, y: 16 },
                  animate:    { opacity: 1, y: 0  },
                  transition: { duration: 0.5, delay: 0.48, ease: [0.16, 1, 0.3, 1] },
                })}
                style={{
                  position:        'absolute',
                  bottom:          '1.25rem',
                  left:            '1.25rem',
                  right:           '1.25rem',
                  padding:         '1rem 1.25rem',
                  borderRadius:    'var(--radius-xl)',
                  backgroundColor: 'var(--bg-glass-heavy)',
                  backdropFilter:  'blur(18px) saturate(1.6)',
                  WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
                  border:          '1px solid var(--border-card)',
                  boxShadow:       'var(--shadow-lg)',
                }}
              >
                {/* Live indicator */}
                <div
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           '6px',
                    marginBottom:  '0.65rem',
                  }}
                >
                  {availabilityPreview.status === 'success' && <span className="live-dot" aria-hidden="true" />}
                  <span
                    style={{
                      fontSize:      'var(--text-xs)',
                      fontWeight:    'var(--fw-bold)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color:         'var(--brand-primary)',
                    }}
                  >
                    {availabilityPreview.status === 'success'
                      ? 'Live Arena Radar'
                      : availabilityPreview.status === 'loading'
                        ? 'Loading live availability…'
                        : 'Live availability unavailable'}
                  </span>
                </div>

                {/* Slot preview row */}
                <div
                  style={{
                    display:   'flex',
                    gap:       '0.4rem',
                    flexWrap:  'wrap',
                    marginBottom: '0.65rem',
                  }}
                >
                  {availabilityPreview.timeSlots.map(({ time }) => {
                    const status = availabilityPreview.schedule?.courts
                      .find((court) => court.id === availabilityPreview.court?.id)
                      ?.slots?.[time]?.status;
                    const available = status === 'available' || status === 'limited';
                    return (
                    <span
                      key={time}
                      aria-label={`${time} — ${status ?? 'unknown'}`}
                      style={{
                        padding:         '3px 7px',
                        borderRadius:    'var(--radius-xs)',
                        fontSize:        '0.68rem',
                        fontWeight:      'var(--fw-semibold)',
                        fontVariantNumeric: 'tabular-nums',
                        backgroundColor: available
                          ? 'var(--slot-available-bg)'
                          : 'var(--slot-booked-bg)',
                        border:          `1px solid ${
                          available
                            ? 'var(--slot-available-border)'
                            : 'var(--slot-booked-border)'
                        }`,
                        color:           available
                          ? 'var(--slot-available-text)'
                          : 'var(--slot-booked-text)',
                      }}
                    >
                      {time}
                    </span>
                  ); })}
                  {availabilityPreview.status === 'loading' && (
                    <span role="status" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading slots…</span>
                  )}
                  {availabilityPreview.status === 'error' && (
                    <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-danger)' }}>{availabilityPreview.error}</span>
                  )}
                </div>

                <div
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    gap:            '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontSize:   'var(--text-xs)',
                      color:      'var(--text-muted)',
                    }}
                  >
                    {availabilityPreview.status === 'success'
                      ? `${availabilityPreview.court?.name} · ${availabilityPreview.venue?.shortName ?? availabilityPreview.venue?.name}`
                      : availabilityPreview.status === 'loading'
                        ? 'Finding an active court…'
                        : 'Availability preview unavailable'}
                  </span>
                  <button
                    type="button"
                    onClick={() => scrollTo('availability')}
                    style={{
                      display:         'inline-flex',
                      alignItems:      'center',
                      gap:             '4px',
                      padding:         '4px 10px',
                      borderRadius:    'var(--radius-full)',
                      fontSize:        '0.72rem',
                      fontWeight:      'var(--fw-bold)',
                      backgroundColor: 'var(--brand-primary)',
                      color:           '#ffffff',
                      border:          'none',
                      cursor:          'pointer',
                      whiteSpace:      'nowrap',
                    }}
                  >
                    Book Slot <ArrowRight size={10} aria-hidden="true" />
                  </button>
                </div>
              </motion.div>

              {/* ── Decorative: venue badge top-right ───────────── */}
              <motion.div
                {...(reduced ? {} : {
                  initial:    { opacity: 0, x: 14 },
                  animate:    { opacity: 1, x: 0  },
                  transition: { duration: 0.44, delay: 0.56, ease: [0.16, 1, 0.3, 1] },
                })}
                aria-hidden="true"
                style={{
                  position:        'absolute',
                  top:             '1.25rem',
                  right:           '1.25rem',
                  padding:         '0.55rem 0.9rem',
                  borderRadius:    'var(--radius-lg)',
                  backgroundColor: 'var(--bg-glass-heavy)',
                  backdropFilter:  'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border:          '1px solid var(--border-card)',
                  boxShadow:       'var(--shadow-md)',
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '7px',
                }}
              >
                <MapPin size={13} color="var(--brand-secondary)" />
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 'var(--fw-bold)', lineHeight: 1.2, color: 'var(--text-primary)' }}>
                    {catalog.venueCount === null
                      ? (catalog.error ? 'Venues unavailable' : 'Loading…')
                      : `${catalog.venueCount} ${catalog.venueCount === 1 ? 'Venue' : 'Venues'}`}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                    Lahore &amp; Sialkot
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* ── Secondary image strip (two smaller images) ─────── */}
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 '0.75rem',
                marginTop:           '0.75rem',
              }}
            >
              {[
                { src: '/football-image.jfif', alt: 'Futsal arena with FIFA-standard turf' },
                { src: '/cricket-img.jpg',     alt: 'Indoor box cricket court with professional shock turf' },
              ].map(({ src, alt }, idx) => (
                /* ── OUTER: entrance fade+slide (non-interactive) */
                <motion.div
                  key={src}
                  initial={reduced ? {} : { opacity: 0, y: 14 }}
                  animate={reduced ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1], delay: 0.58 + idx * 0.08 }}
                >
                  {/* ── INNER: hover lift + tap spring (interactive only) */}
                  <motion.div
                    whileHover={reduced ? {} : { y: -3 }}
                    whileTap={reduced  ? {} : { scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    style={{
                      borderRadius:    'var(--radius-lg)',
                      overflow:        'hidden',
                      border:          '1px solid var(--border-card)',
                      boxShadow:       'var(--shadow-sm)',
                      aspectRatio:     '16/9',
                      backgroundColor: 'var(--bg-surface-elevated)',
                    }}
                  >
                    <motion.img
                      src={src}
                      alt={alt}
                      loading="lazy"
                      decoding="async"
                      width={640}
                      height={360}
                      whileHover={reduced ? {} : { scale: 1.06 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        width:          '100%',
                        height:         '100%',
                        objectFit:      'cover',
                        objectPosition: 'center',
                        display:        'block',
                      }}
                    />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            QUICK BOOKING — anchored directly below hero grid
        ══════════════════════════════════════════════════════════ */}
        <motion.div
          {...mp(fadeUp(0.3))}
          style={{
            marginTop:    'clamp(2.5rem, 5vw, 4rem)',
            paddingBottom:'clamp(3rem, 6vw, 5rem)',
          }}
        >
          <QuickBooking />
        </motion.div>

      </Container>

    </section>
  );
};

export default Hero;
