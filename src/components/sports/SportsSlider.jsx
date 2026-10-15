import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/* Swiper v14 — React components + required modules */
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, A11y } from 'swiper/modules';

/* Swiper core + module CSS */
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { getSports } from '../../services/bookingService';
import { sports as sportsFixtures } from '../../data/sports';
import SportCard from './SportCard';
import SectionHeading from '../common/SectionHeading';
import Container from '../common/Container';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   CATEGORY FILTER DATA
───────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'all', label: 'All Sports' },
];
const SPORT_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

/* ─────────────────────────────────────────────────────────────
   NAV BUTTON  (custom prev/next — Swiper will connect via refs)
───────────────────────────────────────────────────────────── */
const NavBtn = ({ dir, btnRef, ariaLabel }) => {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;

  return (
    <motion.button
      ref={btnRef}
      type="button"
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={reduced ? {} : { scale: 1.08 }}
      whileTap={reduced  ? {} : { scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 440, damping: 22 }}
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           '42px',
        height:          '42px',
        borderRadius:    'var(--radius-full)',
        backgroundColor: hovered ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
        border:          `1px solid ${hovered ? 'var(--brand-primary)' : 'var(--border-card)'}`,
        color:           hovered ? '#ffffff' : 'var(--text-primary)',
        cursor:          'pointer',
        flexShrink:      0,
        transition:      'background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
        /* Swiper will add .swiper-button-disabled — handled via CSS below */
      }}
    >
      <Icon size={20} aria-hidden="true" />
    </motion.button>
  );
};

/* ─────────────────────────────────────────────────────────────
   SPORTS SLIDER
───────────────────────────────────────────────────────────── */
const SportsSlider = () => {
  const reduced       = useReducedMotion();
  const prevRef       = useRef(null);
  const nextRef       = useRef(null);
  const swiperRef     = useRef(null);      /* Swiper instance */

  const [activeCategory, setActiveCategory] = useState('all');
  const [isBeginning,    setIsBeginning]    = useState(true);
  const [isEnd,          setIsEnd]          = useState(false);
  const [sports,         setSports]         = useState([]);
  const [error,          setError]          = useState('');

  useEffect(() => {
    getSports()
      .then((items) => setSports(items.map((sport, index) => {
        const fixture = sportsFixtures.find((s) => s.id === sport.id) || {};
        return {
          ...fixture,
          ...sport,
          image: sport.image || fixture.image,
          category: fixture.category || 'Court sports',
          unit: fixture.unit || 'hour',
          tagline: fixture.tagline || `Book ${sport.name} courts at Matro venues.`,
          badge: sport.badge || fixture.badge || `${sport.venueCount} ${sport.venueCount === 1 ? 'venue' : 'venues'}`,
          players: fixture.players || `${sport.courtCount} active courts`,
          features: fixture.features || [`${sport.courtCount} active courts`],
          color: sport.color || fixture.color || SPORT_COLORS[index % SPORT_COLORS.length],
          accentGradient: sport.accentGradient || fixture.accentGradient || `linear-gradient(135deg, ${SPORT_COLORS[index % SPORT_COLORS.length]} 0%, ${SPORT_COLORS[index % SPORT_COLORS.length]}cc 100%)`,
        };
      })))
      .catch((err) => setError(err.message || 'Failed to load sports.'));
  }, []);

  /* Filtered list re-computes when category tab changes */
  const visibleSports = activeCategory === 'all' ? sports : [];

  /* Re-initialise Swiper navigation after slide list changes */
  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    /* Small tick so the new slide list is in the DOM first */
    setTimeout(() => {
      if (swiperRef.current) {
        swiperRef.current.slideTo(0, 0);
        swiperRef.current.update();
        setIsBeginning(true);
        setIsEnd(swiperRef.current.isEnd);
      }
    }, 50);
  };

  return (
    <section
      id="sports"
      style={{
        paddingTop:    'var(--section-padding-y)',
        paddingBottom: 'var(--section-padding-y)',
        position:      'relative',
        overflow:      'hidden',
      }}
    >
      {/* Subtle ambient glow behind the section */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          top:          '10%',
          right:        '-8%',
          width:        '440px',
          height:       '440px',
          borderRadius: '50%',
          background:   'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
          filter:       'blur(80px)',
          pointerEvents:'none',
          zIndex:        0,
          opacity:       0.6,
        }}
      />

      <Container style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Section heading with custom nav buttons ─────────── */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionHeading
            badge="World-Class Arenas"
            title="Pick Your Sport."
            highlight="Elevate Your Game."
            subtitle="Shock turf cricket, FIFA futsal, panoramic glass padel, cushioned pickleball, and BWF-grade badminton courts — all under one roof."
            align="left"
            action={
              <div
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '8px',
                }}
              >
                <NavBtn dir="prev" btnRef={prevRef} ariaLabel="Previous sport" />
                <NavBtn dir="next" btnRef={nextRef} ariaLabel="Next sport"     />
              </div>
            }
          />
        </motion.div>

        {/* ── Category filter pills ───────────────────────────── */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '8px',
            overflowX:    'auto',
            paddingBottom:'0.25rem',
            marginBottom: '1.75rem',
          }}
          className="hide-scrollbar"
          role="group"
          aria-label="Filter sports by category"
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                aria-pressed={active}
                style={{
                  padding:         '7px 18px',
                  borderRadius:    'var(--radius-full)',
                  fontSize:        'var(--text-sm)',
                  fontWeight:      active ? 'var(--fw-bold)' : 'var(--fw-medium)',
                  whiteSpace:      'nowrap',
                  backgroundColor: active ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                  color:           active ? '#ffffff' : 'var(--text-secondary)',
                  border:          `1px solid ${active ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                  boxShadow:       active ? '0 4px 14px var(--brand-primary-glow)' : 'none',
                  cursor:          'pointer',
                  transition:      'all var(--transition-fast)',
                }}
              >
                {cat.label}
                <span
                  style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    marginLeft:      '6px',
                    minWidth:        '18px',
                    height:          '18px',
                    padding:         '0 4px',
                    borderRadius:    'var(--radius-full)',
                    fontSize:        '0.68rem',
                    fontWeight:      'var(--fw-bold)',
                    backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
                    color:           active ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {cat.id === 'all'
                    ? sports.length
                    : 0}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Swiper ─────────────────────────────────────────── */}
        {error && <p role="alert">{error}</p>}
        <Swiper
          /* Modules */
          modules={[Navigation, Pagination, Keyboard, A11y]}

          /* Navigation — wired to our custom buttons */
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          /* Re-bind after mount so refs are resolved */
          onBeforeInit={(swiper) => {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          onSlideChange={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          onReachBeginning={() => setIsBeginning(true)}
          onReachEnd={()       => setIsEnd(true)}

          /* Pagination */
          pagination={{
            clickable:       true,
            dynamicBullets:  true,
          }}

          /* Keyboard */
          keyboard={{ enabled: true, onlyInViewport: true }}

          /* A11y */
          a11y={{
            prevSlideMessage: 'Previous sport',
            nextSlideMessage: 'Next sport',
          }}

          /* Behaviour */
          spaceBetween={20}
          grabCursor={true}
          watchOverflow={true}       /* hides nav when all slides visible */

          /* Responsive breakpoints */
          slidesPerView={1}
          breakpoints={{
            480: { slidesPerView: 1.3, spaceBetween: 18 },
            640: { slidesPerView: 2,   spaceBetween: 20 },
            900: { slidesPerView: 2.5, spaceBetween: 22 },
            1100:{ slidesPerView: 3,   spaceBetween: 24 },
            1280:{ slidesPerView: 4,   spaceBetween: 24 },
          }}

          style={{ paddingBottom: '3rem' /* space for pagination dots */ }}
        >
          {visibleSports.map((sport) => (
            <SwiperSlide key={sport.id} style={{ height: 'auto' }}>
              <SportCard sport={sport} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* ── Empty state when a filter yields no results ─────── */}
        {visibleSports.length === 0 && (
          <div
            style={{
              textAlign:  'center',
              padding:    '3rem 1rem',
              color:      'var(--text-muted)',
              fontSize:   'var(--text-sm)',
            }}
          >
            No sports in this category yet.
          </div>
        )}

      </Container>

      {/* ── Swiper override styles ────────────────────────────── */}
      <style>{`
        /* Pagination bullets */
        .swiper-pagination-bullet {
          background-color: var(--border-hover);
          opacity: 1;
          transition: background-color var(--transition-fast), transform var(--transition-fast);
        }
        .swiper-pagination-bullet-active {
          background-color: var(--brand-primary);
          transform: scale(1.3);
        }

        /* Disabled nav buttons get muted styling */
        .swiper-button-disabled {
          opacity: 0.35 !important;
          cursor: not-allowed !important;
          pointer-events: none;
        }

        /* Ensure slide height fills card */
        #sports .swiper-slide {
          height: auto;
        }

        /* Remove default Swiper nav arrows (we use custom buttons) */
        #sports .swiper-button-next,
        #sports .swiper-button-prev {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default SportsSlider;
