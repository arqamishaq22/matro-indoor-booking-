import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/* Swiper v14 */
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { getVenues } from '../../services/bookingService';
import VenueCard from './VenueCard';
import SectionHeading from '../common/SectionHeading';
import Container from '../common/Container';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   NAV BUTTON — same pattern as SportsSlider for visual consistency
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
      }}
    >
      <Icon size={20} aria-hidden="true" />
    </motion.button>
  );
};

/* ─────────────────────────────────────────────────────────────
   VENUES SLIDER
───────────────────────────────────────────────────────────── */
const VenueSlider = () => {
  const reduced    = useReducedMotion();
  const prevRef    = useRef(null);
  const nextRef    = useRef(null);
  const swiperRef  = useRef(null);

  const [activeCity, setActiveCity] = useState('all');
  const [venuesData, setVenuesData] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getVenues()
      .then((data) => setVenuesData((Array.isArray(data) ? data : []).map((venue) => ({
        ...venue,
        image: venue.image ?? venue.imageUrl,
        amenities: venue.amenities ?? [],
        sports: venue.sports ?? [...new Set((venue.courts ?? []).map((court) => court.sport))],
        availableCourts: venue.availableCourts ?? venue.courts?.length ?? 0,
      }))))
      .catch((err) => setError(err.message || 'Failed to load venues.'));
  }, []);

  const cityFilters = useMemo(() => [
    { id: 'all', label: 'All Cities' },
    ...[...new Set(venuesData.map((venue) => venue.city).filter(Boolean))]
      .sort()
      .map((city) => ({ id: city, label: city })),
  ], [venuesData]);

  const visibleVenues =
    activeCity === 'all'
      ? venuesData
      : venuesData.filter((v) => v.city === activeCity);

  const handleCityChange = (cityId) => {
    setActiveCity(cityId);
    setTimeout(() => {
      if (swiperRef.current) {
        swiperRef.current.slideTo(0, 0);
        swiperRef.current.update();
      }
    }, 40);
  };

  return (
    <section
      id="venues"
      style={{
        paddingTop:      'var(--section-padding-y)',
        paddingBottom:   'var(--section-padding-y)',
        backgroundColor: 'var(--bg-surface)',
        position:        'relative',
        overflow:        'hidden',
      }}
    >
      {/* Ambient left glow */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          top:          '15%',
          left:         '-6%',
          width:        '400px',
          height:       '400px',
          borderRadius: '50%',
          background:   'radial-gradient(circle, var(--color-secondary-soft) 0%, transparent 70%)',
          filter:       'blur(80px)',
          pointerEvents:'none',
          zIndex:        0,
          opacity:       0.55,
        }}
      />

      <Container style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Section heading + nav buttons ─────────────────── */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionHeading
            badge="Featured Sports Hubs"
            title="State-of-the-Art"
            highlight="Indoor Arenas"
            subtitle="Modern, air-conditioned sports complexes across Lahore and Sialkot — pro turf, panoramic glass courts, and BaseCamp cafes."
            align="left"
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <NavBtn dir="prev" btnRef={prevRef} ariaLabel="Previous venue" />
                <NavBtn dir="next" btnRef={nextRef} ariaLabel="Next venue"     />
              </div>
            }
          />
        </motion.div>

        {/* ── City filter pills ──────────────────────────────── */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
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
          aria-label="Filter venues by city"
        >
          {cityFilters.map((city) => {
            const active = activeCity === city.id;
            /* Count badge per filter */
            const count =
              city.id === 'all'
                ? venuesData.length
                : venuesData.filter((v) => v.city === city.id).length;

            return (
              <button
                key={city.id}
                type="button"
                onClick={() => handleCityChange(city.id)}
                aria-pressed={active}
                style={{
                  display:         'inline-flex',
                  alignItems:      'center',
                  gap:             '6px',
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
                <MapPin
                  size={13}
                  aria-hidden="true"
                  color={active ? '#ffffff' : 'var(--brand-accent)'}
                />
                {city.label}
                <span
                  style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    justifyContent:  'center',
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
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Swiper ─────────────────────────────────────────── */}
        {error && <p role="alert">{error}</p>}
        <Swiper
          modules={[Navigation, Pagination, Keyboard, A11y]}

          /* Custom nav buttons */
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onBeforeInit={(swiper) => {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}

          /* Pagination */
          pagination={{ clickable: true, dynamicBullets: true }}

          /* Keyboard */
          keyboard={{ enabled: true, onlyInViewport: true }}

          /* A11y */
          a11y={{
            prevSlideMessage: 'Previous venue',
            nextSlideMessage: 'Next venue',
          }}

          /* Behaviour */
          spaceBetween={22}
          grabCursor={true}
          watchOverflow={true}

          /* Responsive breakpoints — 1 / 2 / 3 */
          slidesPerView={1}
          breakpoints={{
            540:  { slidesPerView: 1.25, spaceBetween: 20 },
            768:  { slidesPerView: 2,    spaceBetween: 22 },
            1024: { slidesPerView: 2.5,  spaceBetween: 24 },
            1280: { slidesPerView: 3,    spaceBetween: 24 },
          }}

          style={{ paddingBottom: '3rem' }}
        >
          {visibleVenues.map((venue) => (
            <SwiperSlide key={venue.id} style={{ height: 'auto' }}>
              <VenueCard venue={venue} linkTo={`/venues/${venue.id}`} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Empty state */}
        {visibleVenues.length === 0 && (
          <div
            style={{
              textAlign:  'center',
              padding:    '3rem 1rem',
              fontSize:   'var(--text-sm)',
              color:      'var(--text-muted)',
            }}
          >
            No venues found in this city yet.
          </div>
        )}

      </Container>

      {/* ── Scoped Swiper overrides ─────────────────────────── */}
      <style>{`
        #venues .swiper-pagination-bullet {
          background-color: var(--border-hover);
          opacity: 1;
          transition: background-color var(--transition-fast), transform var(--transition-fast);
        }
        #venues .swiper-pagination-bullet-active {
          background-color: var(--brand-primary);
          transform: scale(1.35);
        }
        #venues .swiper-button-disabled {
          opacity: 0.3 !important;
          cursor: not-allowed !important;
          pointer-events: none;
        }
        #venues .swiper-slide {
          height: auto;
        }
        /* Hide default Swiper arrows — we use custom buttons */
        #venues .swiper-button-next,
        #venues .swiper-button-prev {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default VenueSlider;
