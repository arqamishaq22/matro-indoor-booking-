/**
 * VenuesPage.jsx  —  /venues
 * ─────────────────────────────────────────────────────────────────────────
 * Venue Discovery page.
 *
 * Features:
 *   • City filter  — All / Lahore / Sialkot
 *   • Sport filter — All / Cricket / Futsal / Padel / Pickleball / Badminton
 *   • Responsive venue card grid (1 → 2 → 3 columns)
 *   • Empty state with "Clear Filters" CTA
 *   • Accessible filter controls (aria-pressed, role="group")
 *   • Respects useReducedMotion
 *
 * Data: live venue and court records loaded from the API.
 * ─────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  MapPin,
  SlidersHorizontal,
  X,
  ArrowLeft,
  Search,
} from 'lucide-react';

import { getVenues } from '../services/bookingService';
import Container      from '../components/common/Container';
import SectionHeading from '../components/common/SectionHeading';
import VenueCard      from '../components/venues/VenueCard';
import Navbar         from '../components/layout/Navbar';
import Footer         from '../components/layout/Footer';
import { SkeletonCard, ShimmerKeyframes } from '../components/common/Skeleton';
import ErrorState     from '../components/common/ErrorState';

/* ─── Sport filter options ──────────────────────────────────────────────── */
/* ─── Filter pill ───────────────────────────────────────────────────────── */
const FilterPill = ({ label, active, onClick }) => {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      whileHover={!reduced ? { scale: 1.04 } : {}}
      whileTap={!reduced  ? { scale: 0.96 } : {}}
      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        gap:             '5px',
        padding:         '0.45rem 1.05rem',
        borderRadius:    'var(--radius-full)',
        fontSize:        'var(--text-sm)',
        fontWeight:      active ? 'var(--fw-bold)' : 'var(--fw-semibold)',
        cursor:          'pointer',
        whiteSpace:      'nowrap',
        border:          active
          ? '1.5px solid var(--brand-primary)'
          : '1.5px solid var(--border-subtle)',
        backgroundColor: active
          ? 'var(--brand-primary)'
          : 'var(--bg-surface-card)',
        color:           active ? '#ffffff' : 'var(--text-secondary)',
        boxShadow:       active ? 'var(--shadow-brand)' : 'none',
        transition:      [
          'background-color var(--transition-fast)',
          'border-color var(--transition-fast)',
          'color var(--transition-fast)',
          'box-shadow var(--transition-fast)',
        ].join(', '),
      }}
    >
      {label}
    </motion.button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   VENUES PAGE
═══════════════════════════════════════════════════════════════════════════ */
const VenuesPage = () => {
  const reduced = useReducedMotion();

  const [cityFilter,  setCityFilter]  = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [venues,      setVenues]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVenues();
      /* API returns courts as array of { id, name, sport, … }
         Static venues have a `sports` array — normalise if needed */
      const normalized = (Array.isArray(data) ? data : []).map((v) => ({
        ...v,
        /* Build sports array from courts if not present */
        sports: v.sports ?? [...new Set((v.courts ?? []).map((c) => c.sport))],
      }));
      setVenues(normalized);
    } catch (err) {
      setError(err.message || 'Failed to load venues. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVenues(); }, [loadVenues]);

  const cityFilters = useMemo(() => [
    { id: 'all', label: 'All Cities' },
    ...[...new Set(venues.map((venue) => venue.city).filter(Boolean))]
      .sort()
      .map((city) => ({ id: city, label: city })),
  ], [venues]);
  const sportFilters = useMemo(() => [
    { id: 'all', label: 'All Sports' },
    ...[...new Set(venues.flatMap((venue) => venue.sports ?? []))]
      .sort()
      .map((sport) => ({ id: sport, label: sport.replace(/(^|-)\w/g, (part) => part.replace('-', '').toUpperCase()) })),
  ], [venues]);

  /* ── Derived: filtered list ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return venues.filter((v) => {
      const cityMatch  = cityFilter  === 'all' || v.city === cityFilter;
      const sportMatch = sportFilter === 'all' || v.sports.includes(sportFilter);
      return cityMatch && sportMatch;
    });
  }, [venues, cityFilter, sportFilter]);

  const hasActiveFilter = cityFilter !== 'all' || sportFilter !== 'all';

  const clearFilters = useCallback(() => {
    setCityFilter('all');
    setSportFilter('all');
  }, []);

  /* ── Card entrance variants ─────────────────────────────────────────── */
  const cardVariants = {
    hidden:  { opacity: 0, y: 24 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.42,
        ease:     [0.16, 1, 0.3, 1],
        delay:    Math.min(i * 0.07, 0.35),
      },
    }),
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18 } },
  };

  return (
    <>
      <Navbar />

      <main id="main-content">

        {/* ── Page hero band ──────────────────────────────────────────── */}
        <div
          style={{
            position:        'relative',
            overflow:        'hidden',
            backgroundColor: 'var(--bg-main)',
            paddingTop:      'clamp(3rem, 6vw, 5rem)',
            paddingBottom:   'clamp(2rem, 4vw, 3rem)',
          }}
        >
          {/* Ambient glow */}
          <div
            aria-hidden="true"
            style={{
              position:      'absolute',
              top:           '-10%',
              left:          '50%',
              transform:     'translateX(-50%)',
              width:         'min(800px, 120vw)',
              height:        '380px',
              borderRadius:  '50%',
              background:    'var(--gradient-hero-glow)',
              filter:        'blur(80px)',
              pointerEvents: 'none',
              opacity:       0.6,
            }}
          />

          <Container style={{ position: 'relative', zIndex: 1 }}>
            {/* Back link */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, x: -12 }}
              animate={reduced ? {} : { opacity: 1, x: 0  }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
            >
              <Link
                to="/"
                style={{
                  display:    'inline-flex',
                  alignItems: 'center',
                  gap:        '6px',
                  fontSize:   'var(--text-sm)',
                  fontWeight: 'var(--fw-semibold)',
                  color:      'var(--text-muted)',
                  textDecoration: 'none',
                  marginBottom:   '1.5rem',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Back to Home
              </Link>
            </motion.div>

            <SectionHeading
              headingLevel={1}
              badge="All Venues"
              title="Discover Your"
              highlight="Next Arena"
              subtitle="Browse all Matro venues across Lahore and Sialkot. Filter by city or sport to find the perfect court."
              align="left"
              action={
                /* Active-filter chip */
                hasActiveFilter ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    aria-label="Clear all active filters"
                    style={{
                      display:         'inline-flex',
                      alignItems:      'center',
                      gap:             '6px',
                      padding:         '0.45rem 1rem',
                      borderRadius:    'var(--radius-full)',
                      fontSize:        'var(--text-xs)',
                      fontWeight:      'var(--fw-bold)',
                      backgroundColor: 'var(--color-danger-soft)',
                      border:          '1.5px solid var(--brand-danger)',
                      color:           'var(--brand-danger)',
                      cursor:          'pointer',
                      whiteSpace:      'nowrap',
                    }}
                  >
                    <X size={13} aria-hidden="true" />
                    Clear Filters
                  </button>
                ) : null
              }
            />
          </Container>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div
          style={{
            position:        'sticky',
            top:             'var(--nav-height)',
            zIndex:          'var(--z-sticky)',
            backgroundColor: 'var(--bg-surface-card)',
            borderBottom:    '1px solid var(--border-subtle)',
            boxShadow:       'var(--shadow-sm)',
          }}
        >
          <Container>
            <div
              style={{
                display:        'flex',
                flexDirection:  'column',
                gap:            '0.75rem',
                paddingTop:     '1rem',
                paddingBottom:  '1rem',
              }}
            >
              {/* City filters */}
              <div
                role="group"
                aria-label="Filter venues by city"
                style={{
                  display:  'flex',
                  flexWrap: 'wrap',
                  gap:      '8px',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           '5px',
                    fontSize:      'var(--text-xs)',
                    fontWeight:    'var(--fw-bold)',
                    color:         'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    flexShrink:    0,
                  }}
                >
                  <MapPin size={12} aria-hidden="true" />
                  City
                </span>
                {cityFilters.map((f) => (
                  <FilterPill
                    key={f.id}
                    label={f.label}
                    active={cityFilter === f.id}
                    onClick={() => setCityFilter(f.id)}
                  />
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />

              {/* Sport filters */}
              <div
                role="group"
                aria-label="Filter venues by sport"
                style={{
                  display:    'flex',
                  flexWrap:   'wrap',
                  gap:        '8px',
                  alignItems: 'center',
                  overflowX:  'auto',
                }}
                className="hide-scrollbar"
              >
                <span
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           '5px',
                    fontSize:      'var(--text-xs)',
                    fontWeight:    'var(--fw-bold)',
                    color:         'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    flexShrink:    0,
                  }}
                >
                  <SlidersHorizontal size={12} aria-hidden="true" />
                  Sport
                </span>
                {sportFilters.map((f) => (
                  <FilterPill
                    key={f.id}
                    label={f.label}
                    active={sportFilter === f.id}
                    onClick={() => setSportFilter(f.id)}
                  />
                ))}
              </div>
            </div>
          </Container>
        </div>

        {/* ── Results area ────────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: 'var(--bg-main)',
            paddingTop:      'clamp(2rem, 4vw, 3rem)',
            paddingBottom:   'clamp(3rem, 6vw, 5rem)',
            minHeight:       '40vh',
          }}
        >
          <Container>
            <ShimmerKeyframes />

            {/* Loading skeleton */}
            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 'clamp(1rem, 2.5vw, 1.75rem)' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* API error */}
            {!loading && error && (
              <ErrorState title="Couldn't load venues" message={error} onRetry={loadVenues} />
            )}

            {/* Results */}
            {!loading && !error && (<>

            {/* Result count */}
            <motion.p
              key={`count-${cityFilter}-${sportFilter}`}
              initial={reduced ? {} : { opacity: 0 }}
              animate={reduced ? {} : { opacity: 1 }}
              transition={{ duration: 0.28 }}
              style={{
                fontSize:     'var(--text-sm)',
                color:        'var(--text-muted)',
                marginBottom: '1.5rem',
                fontWeight:   'var(--fw-semibold)',
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {filtered.length === 0
                ? 'No venues match your current filters.'
                : `Showing ${filtered.length} venue${filtered.length !== 1 ? 's' : ''}${
                    hasActiveFilter ? ' matching your filters' : ''
                  }`
              }
            </motion.p>

            {/* ── Empty state ────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={reduced ? {} : { opacity: 0, y: 20 }}
                  animate={reduced ? {} : { opacity: 1, y: 0  }}
                  exit={reduced    ? {} : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    display:         'flex',
                    flexDirection:   'column',
                    alignItems:      'center',
                    justifyContent:  'center',
                    gap:             '1.25rem',
                    padding:         'clamp(3rem, 8vw, 6rem) 1rem',
                    textAlign:       'center',
                    borderRadius:    'var(--radius-2xl)',
                    backgroundColor: 'var(--bg-surface-card)',
                    border:          '1px solid var(--border-card)',
                  }}
                >
                  <div
                    style={{
                      width:           '64px',
                      height:          '64px',
                      borderRadius:    '50%',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border:          '1px solid var(--border-subtle)',
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                    }}
                  >
                    <Search size={28} color="var(--text-faint)" aria-hidden="true" />
                  </div>

                  <div>
                    <h2
                      style={{
                        fontSize:   'var(--text-xl)',
                        fontWeight: 'var(--fw-bold)',
                        color:      'var(--text-primary)',
                        margin:     '0 0 0.4rem',
                      }}
                    >
                      No venues found
                    </h2>
                    <p
                      style={{
                        fontSize: 'var(--text-sm)',
                        color:    'var(--text-muted)',
                        margin:   0,
                        maxWidth: '40ch',
                      }}
                    >
                      No venues match{' '}
                      {cityFilter !== 'all' && (
                        <strong style={{ color: 'var(--text-secondary)' }}>{cityFilter}</strong>
                      )}
                      {cityFilter !== 'all' && sportFilter !== 'all' && ' + '}
                      {sportFilter !== 'all' && (
                        <strong style={{ color: 'var(--text-secondary)' }}>
                          {sportFilters.find((f) => f.id === sportFilter)?.label}
                        </strong>
                      )}
                      . Try a different combination.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearFilters}
                    style={{
                      display:         'inline-flex',
                      alignItems:      'center',
                      gap:             '6px',
                      padding:         '0.65rem 1.5rem',
                      borderRadius:    'var(--radius-md)',
                      fontSize:        'var(--text-sm)',
                      fontWeight:      'var(--fw-bold)',
                      background:      'var(--gradient-cta)',
                      color:           '#ffffff',
                      border:          'none',
                      boxShadow:       'var(--shadow-brand)',
                      cursor:          'pointer',
                    }}
                  >
                    <X size={14} aria-hidden="true" />
                    Clear Filters
                  </button>
                </motion.div>
              ) : (
                /* ── Venue grid ────────────────────────────────────────── */
                <motion.div
                  key="grid"
                  initial={reduced ? {} : { opacity: 0 }}
                  animate={reduced ? {} : { opacity: 1 }}
                  exit={reduced    ? {} : { opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    display:               'grid',
                    gridTemplateColumns:   'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                    gap:                   'clamp(1rem, 2.5vw, 1.75rem)',
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {filtered.map((venue, i) => (
                      <motion.div
                        key={venue.id}
                        custom={i}
                        variants={reduced ? {} : cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                      >
                        {/* VenueCard gets a `to` prop for routing to detail page */}
                        <VenueCard venue={venue} linkTo={`/venues/${venue.id}`} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
            </>)}
          </Container>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default VenuesPage;
