import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Container from '../common/Container';
import Button from '../common/Button';
import {
  CalendarCheck,
  MessageCircle,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { getSports, getVenues } from '../../services/bookingService';

/* ─────────────────────────────────────────────────────────────
   TRUST ITEMS  — grounded only in the project specification
───────────────────────────────────────────────────────────── */
const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Instant court locking on confirmation' },
  { icon: Clock,       label: 'Venue-specific operating hours'       },
  { icon: Zap,         label: 'Live venue and sport listings'         },
];

/* ─────────────────────────────────────────────────────────────
   FINAL CTA SECTION
───────────────────────────────────────────────────────────── */
const FinalCTA = () => {
  const reduced = useReducedMotion();
  const [catalog, setCatalog] = useState({ venues: null, sports: null, hours: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSports(), getVenues()])
      .then(([sports, venues]) => {
        const hours = [...new Set(venues.map((venue) => venue.operatingHours).filter(Boolean))];
        const operatingHours = hours.length === 1
          ? `Open daily: ${hours[0]}`
          : hours.length ? 'Hours vary by venue' : 'Operating hours unavailable';
        if (!cancelled) setCatalog({ venues: venues.length, sports: sports.length, hours: operatingHours, error: '' });
      })
      .catch((error) => {
        if (!cancelled) {
          setCatalog((current) => ({ ...current, error: error.message || 'Unable to load venue and sport information.' }));
        }
      });
    return () => { cancelled = true; };
  }, []);

  const scrollToId = (id) => {
    const el  = document.getElementById(id);
    const nav = document.querySelector('header');
    if (!el) return;
    window.scrollTo({
      top:      el.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight ?? 72) - 8,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  return (
    <section
      aria-labelledby="final-cta-heading"
      style={{
        paddingTop:    'var(--section-padding-y)',
        paddingBottom: 'var(--section-padding-y)',
        backgroundColor: 'var(--bg-main)',
        position:      'relative',
        overflow:      'hidden',
      }}
    >
      <Container>
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 28, scale: 0.985 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0,  scale: 1    }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position:        'relative',
            borderRadius:    'var(--radius-2xl)',
            padding:         'clamp(2.5rem, 6vw, 4.5rem) clamp(1.5rem, 5vw, 3rem)',
            background:      'linear-gradient(135deg, rgba(16,185,129,0.13) 0%, rgba(14,165,233,0.10) 100%)',
            border:          '1px solid rgba(16,185,129,0.28)',
            boxShadow:       'var(--shadow-xl)',
            textAlign:       'center',
            overflow:        'hidden',
          }}
        >
          {/* Ambient glows — decorative only, not overlapping text */}
          <div
            aria-hidden="true"
            style={{
              position:   'absolute', top: '-80px', left: '-80px',
              width: '260px', height: '260px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
              filter: 'blur(50px)', pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', bottom: '-80px', right: '-80px',
              width: '260px', height: '260px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 70%)',
              filter: 'blur(50px)', pointerEvents: 'none',
            }}
          />

          {/* Content */}
          <div
            style={{
              position: 'relative',
              zIndex:   1,
              maxWidth: '760px',
              margin:   '0 auto',
            }}
          >
            {/* Eyebrow badge */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 10 }}
              whileInView={reduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.36, ease: 'easeOut', delay: 0.1 }}
              style={{ marginBottom: '1.25rem' }}
            >
              <span
                style={{
                  display:         'inline-flex',
                  alignItems:      'center',
                  gap:             '6px',
                  padding:         '5px 16px',
                  borderRadius:    'var(--radius-full)',
                  backgroundColor: 'var(--color-primary-soft)',
                  border:          '1px solid var(--color-primary-border)',
                  color:           'var(--brand-primary)',
                  fontSize:        'var(--text-xs)',
                  fontWeight:      'var(--fw-bold)',
                  textTransform:   'uppercase',
                  letterSpacing:   '0.08em',
                }}
              >
                <span
                  className="live-dot"
                  aria-hidden="true"
                  style={{ width: '6px', height: '6px' }}
                />
                Check live availability
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h2
              id="final-cta-heading"
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              whileInView={reduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1], delay: 0.14 }}
              style={{
                fontSize:      'clamp(2rem, 4.5vw, 3.4rem)',
                fontWeight:    'var(--fw-extrabold)',
                letterSpacing: 'var(--tracking-tighter)',
                lineHeight:    1.1,
                marginBottom:  '1.1rem',
                color:         'var(--text-primary)',
              }}
            >
              Ready to Own the Court?{' '}
              <br />
              <span className="gradient-text">Book Your Arena Today.</span>
            </motion.h2>

            {/* Supporting text */}
            <motion.p
              initial={reduced ? {} : { opacity: 0, y: 12 }}
              whileInView={reduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              style={{
                fontSize:     'clamp(1rem, 1.6vw, 1.15rem)',
                color:        'var(--text-secondary)',
                lineHeight:   'var(--lh-lg)',
                marginBottom: '2.5rem',
                maxWidth:     '54ch',
                margin:       '0 auto 2.5rem',
              }}
            >
              Pick your sport, choose a venue across Lahore or Sialkot, select a date
              — and lock your court in seconds.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 10 }}
              whileInView={reduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.26 }}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            '1rem',
                flexWrap:       'wrap',
                marginBottom:   '2.5rem',
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
                  onClick={() => scrollToId('home')}
                  leftIcon={<CalendarCheck size={18} aria-hidden="true" />}
                  rightIcon={<ArrowRight size={16} aria-hidden="true" />}
                >
                  Check Availability
                </Button>
              </motion.div>

              <motion.div
                whileHover={reduced ? {} : { scale: 1.02 }}
                whileTap={reduced  ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 440, damping: 22 }}
              >
                <a
                  href="https://wa.me/18005556287?text=Hi%20Matro%2C%20I%20would%20like%20to%20book%20a%20court"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Contact Matro on WhatsApp to book a court"
                  style={{ textDecoration: 'none' }}
                >
                  <Button
                    variant="secondary"
                    size="lg"
                    leftIcon={<MessageCircle size={18} color="#25D366" aria-hidden="true" />}
                  >
                    WhatsApp Concierge
                  </Button>
                </a>
              </motion.div>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={reduced ? {} : { opacity: 0 }}
              whileInView={reduced ? {} : { opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.34 }}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexWrap:       'wrap',
                gap:            '1.5rem',
                fontSize:       'var(--text-xs)',
                color:          'var(--text-muted)',
                fontWeight:     'var(--fw-semibold)',
              }}
            >
              {TRUST_ITEMS.map(({ icon: Icon, label }, index) => {
                const liveLabel = index === 1
                  ? catalog.hours ?? (catalog.error ? 'Hours unavailable' : label)
                  : index === 2
                    ? catalog.venues !== null && catalog.sports !== null
                      ? `${catalog.venues} venues · ${catalog.sports} sports · one platform`
                      : catalog.error ? 'Listings unavailable' : 'Loading listings…'
                    : label;
                return (
                <span
                  key={index}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                >
                  <Icon size={13} color="var(--brand-primary)" aria-hidden="true" />
                  {liveLabel}
                </span>
                );
              })}
              {catalog.error && <span role="alert">Live listings could not be loaded.</span>}
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
};

export default FinalCTA;
