/**
 * AvailabilityPreview.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Availability grid — shows courts × time slots for the venue + sport + date
 * currently selected in Redux.
 *
 * DATA FLOW:
 *   Redux (selectedVenue / selectedSport / selectedDate)
 *       → getAvailability() in bookingService.js  (live API)
 *       → VenueSchedule { courts[], timeSlots[] }
 *
 * BOOKING FLOW:
 *   • Live availability and pricing from the backend
 *   • availabilityRefreshToken from Redux — re-fetches grid after a booking
 *   • Slot click auth gate: redirects to /login if not logged in, then
 *     returns to home#availability after login
 *   • Date guard: past dates show a warning and slots are non-bookable
 *   • Past date warning shown inline in the context bar
 *
 * SLOT STATES:
 *   available    bookable — green
 *   limited      bookable — amber / peak
 *   booked       not bookable — grey
 *   reserved     not bookable — blue-grey
 *   maintenance  not bookable — orange-grey
 * ─────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  setSelectedVenue,
  setSelectedSport,
  setSelectedDate,
  setSelectedCourt,
  setSelectedTimeSlot,
  setBookingModalOpen,
  selectSelectedVenue,
  selectSelectedDate,
  selectSelectedSport,
  selectIsBookingPanelOpen,
  selectAvailabilityRefreshToken,
} from '../../features/booking/bookingSlice';
import { selectIsLoggedIn } from '../../features/auth/authSlice';
import { getAvailability, getVenues } from '../../services/bookingService';
import Container      from '../common/Container';
import SectionHeading from '../common/SectionHeading';
import {
  Clock,
  Lock,
  CheckCircle2,
  Zap,
  CalendarDays,
  MapPin,
  ArrowRight,
  Wrench,
  BookMarked,
  AlertCircle,
  Search,
  Wifi,
  LogIn,
} from 'lucide-react';

/* ─── Date helpers ───────────────────────────────────────────────────────── */
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDateLabel(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });
}
const PERIOD_META = {
  morning: { label: 'Morning', color: 'var(--brand-secondary)' },
  afternoon: { label: 'Afternoon', color: 'var(--brand-accent)' },
  evening: { label: 'Evening', color: 'var(--brand-primary)' },
  night: { label: 'Late Night', color: 'var(--text-muted)' },
};
const SLOT_STATUS_META = {
  available: { label: 'Available', ariaLabel: 'Available', bookable: true },
  limited: { label: 'Limited', ariaLabel: 'Limited — filling fast', bookable: true },
  booked: { label: 'Booked', ariaLabel: 'Booked — not available', bookable: false },
  reserved: { label: 'Reserved', ariaLabel: 'Reserved — held', bookable: false },
  maintenance: { label: 'Maintenance', ariaLabel: 'Closed for maintenance', bookable: false },
};
const isBookableStatus = (status) => SLOT_STATUS_META[status]?.bookable ?? false;

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS CONFIG — visual tokens per slot state
═══════════════════════════════════════════════════════════════════════════ */
const STATUS_CONFIG = {
  available: {
    bg:     'var(--slot-available-bg)',
    border: 'var(--slot-available-border)',
    text:   'var(--slot-available-text)',
    icon:   CheckCircle2,
  },
  limited: {
    bg:     'var(--slot-peak-bg)',
    border: 'var(--slot-peak-border)',
    text:   'var(--slot-peak-text)',
    icon:   Zap,
  },
  booked: {
    bg:     'var(--slot-booked-bg)',
    border: 'var(--slot-booked-border)',
    text:   'var(--slot-booked-text)',
    icon:   Lock,
  },
  reserved: {
    bg:     'var(--color-secondary-soft)',
    border: 'color-mix(in srgb, var(--brand-secondary) 28%, transparent)',
    text:   'var(--brand-secondary)',
    icon:   BookMarked,
  },
  maintenance: {
    bg:     'var(--color-accent-soft)',
    border: 'color-mix(in srgb, var(--brand-accent) 28%, transparent)',
    text:   'var(--brand-accent)',
    icon:   Wrench,
  },
};

/* ─── Legend item ─────────────────────────────────────────────────────────── */
const LegendItem = ({ statusKey }) => {
  const cfg  = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.booked;
  const meta = SLOT_STATUS_META[statusKey];
  const Icon = cfg.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: 'var(--radius-xs)', backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, flexShrink: 0 }}
      >
        <Icon size={11} color={cfg.text} strokeWidth={2.5} aria-hidden="true" />
      </span>
      {meta?.label ?? statusKey}
    </div>
  );
};

/* ─── Slot cell ───────────────────────────────────────────────────────────── */
const SlotCell = ({ status, isPeak, timeLabel, priceLabel, reduced, onClick, isSelected, isPastDate }) => {
  const [hovered, setHovered] = useState(false);
  const cfg      = STATUS_CONFIG[status] ?? STATUS_CONFIG.booked;
  const Icon     = cfg.icon;
  const bookable = isBookableStatus(status) && !isPastDate;
  const meta     = SLOT_STATUS_META[status];

  return (
    <motion.button
      type="button"
      onClick={bookable ? onClick : undefined}
      aria-label={`${meta?.ariaLabel ?? status}${isPeak ? ', peak pricing' : ''}${priceLabel ? `, ${priceLabel}/hr` : ''} — ${timeLabel.replace(' – ', ' to ')}`}
      aria-disabled={!bookable}
      aria-pressed={isSelected || undefined}
      onMouseEnter={() => bookable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={bookable && !reduced ? { scale: 1.06 } : {}}
      whileTap={bookable   && !reduced ? { scale: 0.94 } : {}}
      transition={{ type: 'spring', stiffness: 480, damping: 22 }}
      style={{
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '2px',
        padding:         '6px 4px',
        borderRadius:    'var(--radius-sm)',
        backgroundColor: isSelected ? 'var(--brand-primary)' : cfg.bg,
        border:          isSelected
          ? '2px solid var(--brand-primary)'
          : hovered && bookable
            ? `1.5px solid ${cfg.text}`
            : `1px solid ${cfg.border}`,
        color:           isSelected ? '#fff' : cfg.text,
        cursor:          bookable ? 'pointer' : 'not-allowed',
        width:           '100%',
        height:          '100%',
        minHeight:       '58px',
        opacity:         isPastDate ? 0.45 : 1,
        transition:      'border-color var(--transition-fast), background-color var(--transition-fast)',
        boxShadow:       isSelected ? 'var(--shadow-brand)' : hovered && bookable ? `0 0 10px ${cfg.bg}` : 'none',
        position:        'relative',
      }}
    >
      <Icon size={12} aria-hidden="true" strokeWidth={2.2} />
      <span style={{ fontSize: '0.58rem', fontWeight: 'var(--fw-bold)', letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' }}>
        {isSelected ? 'Selected' : (meta?.label ?? status)}
      </span>
      {priceLabel && bookable && !isSelected && (
        <span style={{ fontSize: '0.55rem', color: isSelected ? 'rgba(255,255,255,0.8)' : cfg.text, opacity: 0.85, lineHeight: 1 }}>
          {priceLabel}
        </span>
      )}
      {isPeak && !isSelected && (
        <span
          aria-hidden="true"
          style={{ position: 'absolute', top: '-5px', right: '-4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--brand-accent)', border: '1.5px solid var(--bg-surface-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px' }}
        >
          ⚡
        </span>
      )}
    </motion.button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const AvailabilityPreview = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const reduced   = useReducedMotion();

  /* Redux selections */
  const reduxVenue  = useSelector(selectSelectedVenue);
  const reduxDate   = useSelector(selectSelectedDate);
  const reduxSport  = useSelector(selectSelectedSport);
  const isPanelOpen = useSelector(selectIsBookingPanelOpen);
  const isLoggedIn  = useSelector(selectIsLoggedIn);
  /* Increment triggers a re-fetch after a successful booking */
  const refreshToken = useSelector(selectAvailabilityRefreshToken);

  /* ── Load schedule via service ─────────────────────────────────────────── */
  const [schedule,   setSchedule]   = useState(null);
  const [venues,     setVenues]     = useState([]);
  const [loading,    setLoading]    = useState(true);

  /* Effective values — fall back when nothing selected */
  const effectiveVenueId = reduxVenue || venues[0]?.id || '';
  const effectiveDate    = reduxDate  || getTodayStr();
  const effectiveSport   = reduxSport || '';

  /* Date guard */
  const today      = getTodayStr();
  const isPastDate = effectiveDate < today;
  const [error,      setError]      = useState(null);
  const [isLiveData, setIsLiveData] = useState(false);
  const loadRef = useRef(0);

  useEffect(() => {
    getVenues()
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setVenues(items);
        if (!items.length) {
          setError('No active venues are currently available.');
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load venues.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!effectiveVenueId) {
      return;
    }
    const token = ++loadRef.current;
    setLoading(true);
    setError(null);

    getAvailability({
      venueId: effectiveVenueId,
      sportId: effectiveSport,
      date:    effectiveDate,
    })
      .then((result) => {
        if (token !== loadRef.current) return;
        setSchedule(result);
        setIsLiveData(result._isLiveData === true);
        setLoading(false);
      })
      .catch((err) => {
        if (token !== loadRef.current) return;
        setError(err?.message ?? 'Failed to load availability.');
        setLoading(false);
      });
  }, [effectiveVenueId, effectiveSport, effectiveDate, refreshToken, venues.length]);
  // refreshToken in the dep array means a successful booking triggers a re-fetch

  /* ── Derived venue info ────────────────────────────────────────────────── */
  const venueObj = useMemo(() => venues.find((v) => v.id === effectiveVenueId), [venues, effectiveVenueId]);

  /* ── Sport filter pills ────────────────────────────────────────────────── */
  const [sportFilter, setSportFilter] = useState('all');
  useEffect(() => { setSportFilter('all'); }, [effectiveVenueId, effectiveSport]);

  const allCourts    = schedule?.courts ?? [];
  const sportOptions = useMemo(
    () => ['all', ...Array.from(new Set(allCourts.map((c) => c.sport)))],
    [allCourts],
  );
  const visibleCourts = sportFilter === 'all'
    ? allCourts
    : allCourts.filter((c) => c.sport === sportFilter);

  const timeSlots = schedule?.timeSlots ?? [];

  /* ── Slot count summary ────────────────────────────────────────────────── */
  const counts = useMemo(() => {
    const c = { available: 0, limited: 0, booked: 0, reserved: 0, maintenance: 0 };
    allCourts.forEach((court) => {
      timeSlots.forEach((ts) => {
        const s = court.slots[ts.time];
        // The API returns each slot as { status, pricePerHour }.
        const statusStr = typeof s === 'object' ? s.status : s;
        if (c[statusStr] !== undefined) c[statusStr]++;
      });
    });
    return c;
  }, [allCourts, timeSlots]);

  /* ── Selected cell (resets on schedule reload) ─────────────────────────── */
  const [selectedCell, setSelectedCell] = useState(null);
  useEffect(() => { setSelectedCell(null); }, [effectiveVenueId, effectiveSport, effectiveDate, refreshToken]);

  /* ── Slot click ────────────────────────────────────────────────────────── */
  const handleSlotClick = useCallback((court, ts) => {
    const rawStatus = court.slots[ts.time];
    const statusStr = typeof rawStatus === 'object' ? rawStatus.status : rawStatus;
    const status    = statusStr ?? 'available';
    if (!isBookableStatus(status)) return;
    if (isPastDate) return;

    if (!reduxVenue) dispatch(setSelectedVenue(effectiveVenueId));
    if (!reduxDate)  dispatch(setSelectedDate(effectiveDate));

    dispatch(setSelectedSport(court.sport));
    dispatch(setSelectedCourt({ id: court.id, name: court.name, sport: court.sport }));
    const slotData = court.slots[ts.time];
    dispatch(setSelectedTimeSlot({
      time: ts.time,
      label: ts.label,
      isPeak: ts.isPeak,
      pricePerHour: typeof slotData === 'object' ? slotData.pricePerHour : null,
    }));

    /* Preserve this selection so the booking modal can reopen after login. */
    if (!isLoggedIn) {
      navigate('/login', {
        state: {
          from:           window.location.pathname,
          pendingBooking: true,
        },
      });
      return;
    }

    setSelectedCell({ courtId: court.id, time: ts.time });
    dispatch(setBookingModalOpen(true));
  }, [isPastDate, isLoggedIn, reduxVenue, reduxDate, effectiveVenueId, effectiveDate, dispatch, navigate]);

  /* ── Scroll up to QuickBooking ──────────────────────────────────────────── */
  const handleScrollToBooking = useCallback(() => {
    const el  = document.getElementById('home');
    const nav = document.querySelector('header');
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight ?? 72) - 8, behavior: reduced ? 'auto' : 'smooth' });
  }, [reduced]);

  /* ── Row variants ────────────────────────────────────────────────────────── */
  const rowVariants = {
    hidden: { opacity: 0, x: -16 },
    show: (i) => ({
      opacity: 1, x: 0,
      transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 },
    }),
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────────────────────── */
  return (
    <section
      id="availability"
      aria-label="Court availability"
      style={{ paddingTop: 'var(--section-padding-y)', paddingBottom: 'var(--section-padding-y)', backgroundColor: 'var(--bg-main)', position: 'relative', overflow: 'hidden' }}
    >
      {/* Ambient glow */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', width: 'min(700px,100vw)', height: '320px', borderRadius: '50%', background: 'var(--gradient-hero-glow)', filter: 'blur(72px)', pointerEvents: 'none', zIndex: 0, opacity: 0.55 }} />

      <Container style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Heading ─────────────────────────────────────────── */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionHeading
            badge="Court Radar"
            title="Real-Time Court"
            highlight="Availability"
            subtitle={
              reduxVenue
                ? `Showing courts at ${venueObj?.name ?? reduxVenue}${reduxSport ? ` for ${reduxSport}` : ''} — click any bookable slot to continue.`
                : 'Select a sport and venue above, then click any available slot to begin booking.'
            }
            align="center"
          />
        </motion.div>

        {/* ── Live / Demo data badge ─────────────────────────── */}
        {!loading && schedule && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 10 }}
            whileInView={reduced ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.32, ease: 'easeOut', delay: 0.08 }}
            role="note"
            aria-label={isLiveData ? 'Live availability data' : 'Demo mode notice'}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '8px',
              padding:         '0.65rem 1.1rem',
              marginBottom:    '1.5rem',
              borderRadius:    'var(--radius-md)',
              backgroundColor: isLiveData
                ? 'rgba(16,185,129,0.08)'
                : 'rgba(217,119,6,0.08)',
              border:          isLiveData
                ? '1px solid rgba(16,185,129,0.28)'
                : '1px solid rgba(217,119,6,0.24)',
              fontSize:        'var(--text-xs)',
              color:           isLiveData ? 'var(--brand-primary)' : 'var(--brand-accent)',
              fontWeight:      'var(--fw-medium)',
            }}
          >
            {isLiveData
              ? <Wifi size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
              : <AlertCircle size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
            }
            <span>
              {isLiveData
                ? <><strong style={{ fontWeight: 'var(--fw-bold)' }}>Live availability.</strong>{' '}Slot statuses reflect real-time bookings from the database.</>
                : <><strong style={{ fontWeight: 'var(--fw-bold)' }}>Demo availability — not live data.</strong>{' '}Slot statuses are static illustrations. Connect the backend for live data.</>
              }
            </span>
          </motion.div>
        )}

        {/* ── Venue / date / context bar ───────────────────────── */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.4rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-surface-card)', border: `1px solid ${isPastDate ? 'rgba(220,38,38,0.3)' : 'var(--border-card)'}`, boxShadow: 'var(--shadow-sm)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="var(--brand-secondary)" aria-hidden="true" />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>
                {venueObj?.name ?? effectiveVenueId}
              </span>
              {venueObj && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  · {venueObj.city}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDays size={14} color={isPastDate ? 'var(--brand-danger)' : 'var(--brand-accent)'} aria-hidden="true" />
              <span style={{ fontSize: 'var(--text-sm)', color: isPastDate ? 'var(--brand-danger)' : 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>
                {formatDateLabel(effectiveDate)}
                {isPastDate && (
                  <span style={{ marginLeft: '6px', fontSize: '0.65rem', fontWeight: 'var(--fw-bold)', color: 'var(--brand-danger)' }}>
                    (past date — slots not bookable)
                  </span>
                )}
              </span>
            </div>
            {effectiveSport && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 9px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-primary-soft)', border: '1px solid var(--color-primary-border)', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--brand-primary)' }}>
                {effectiveSport}
              </div>
            )}
          </div>

          {/* Summary counts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { key: 'available',   color: 'var(--slot-available-text)' },
              { key: 'limited',     color: 'var(--slot-peak-text)'      },
              { key: 'booked',      color: 'var(--slot-booked-text)'    },
              { key: 'reserved',    color: 'var(--palette-slate-400)'   },
              { key: 'maintenance', color: '#ea580c'                    },
            ].filter(({ key }) => counts[key] > 0).map(({ key, color }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15 }}>
                <span style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', fontWeight: 'var(--fw-extrabold)', color }}>
                  {counts[key]}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {SLOT_STATUS_META[key]?.label ?? key}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Not-logged-in info bar (only when venue is selected) ─────── */}
        {!isLoggedIn && reduxVenue && !loading && !error && allCourts.length > 0 && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            role="note"
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '10px',
              padding:         '0.75rem 1.1rem',
              marginBottom:    '1.25rem',
              borderRadius:    'var(--radius-md)',
              backgroundColor: 'var(--color-primary-soft)',
              border:          '1px solid var(--color-primary-border)',
              fontSize:        'var(--text-xs)',
              fontWeight:      'var(--fw-semibold)',
              color:           'var(--brand-primary)',
            }}
          >
            <LogIn size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              You need to be logged in to book a slot. Clicking a slot will take you to the login page.
            </span>
          </motion.div>
        )}

        {/* ── Sport filter pills ─────────────────────────────────── */}
        {!loading && !error && sportOptions.length > 2 && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            whileInView={reduced ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.28, ease: 'easeOut', delay: 0.12 }}
            role="group"
            aria-label="Filter courts by sport"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '0.25rem', marginBottom: '1.25rem' }}
            className="hide-scrollbar"
          >
            {sportOptions.map((sport) => {
              const active = sportFilter === sport;
              return (
                <button
                  key={sport}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSportFilter(sport)}
                  className="filter-pill"
                  style={active ? { backgroundColor: 'var(--brand-primary)', color: '#fff', borderColor: 'var(--brand-primary)' } : {}}
                >
                  {sport === 'all' ? 'All Courts' : sport}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ── No venue selected prompt ─────────────────────────── */}
        {!reduxVenue && !loading && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.36 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--bg-surface-card)', border: '1px solid var(--border-card)', marginBottom: '1.5rem' }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--color-primary-soft)', border: '1px solid var(--color-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={24} color="#059669" aria-hidden="true" />
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 0.4rem' }}>
                Select a venue to see availability
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0, maxWidth: '42ch' }}>
                Use the Quick Booking form above — choose your sport, venue, and date, then click <strong>Check Availability</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleScrollToBooking}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--gradient-cta)', color: '#fff', border: 'none', boxShadow: 'var(--shadow-brand)', cursor: 'pointer' }}
            >
              Go to Quick Booking
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────── */}
        {loading && (
          <div aria-live="polite" aria-label="Loading availability" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: '66px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', animation: 'pulse 1.6s ease-in-out infinite', animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        )}

        {/* ── Error state ──────────────────────────────────────── */}
        {!loading && error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-danger-soft)', border: '1px solid rgba(220,38,38,0.28)', fontSize: 'var(--text-sm)', color: 'var(--brand-danger)', marginBottom: '1.5rem' }}>
            <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                // increment the local token to retry
                setSchedule(null);
                setError(null);
                setLoading(true);
                const token = ++loadRef.current;
                getAvailability({ venueId: effectiveVenueId, sportId: effectiveSport, date: effectiveDate })
                  .then((r) => { if (token !== loadRef.current) return; setSchedule(r); setIsLiveData(r._isLiveData === true); setLoading(false); })
                  .catch((e) => { if (token !== loadRef.current) return; setError(e?.message ?? 'Failed to load availability.'); setLoading(false); });
              }}
              style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--brand-danger)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Availability matrix ──────────────────────────────── */}
        {!loading && !error && visibleCourts.length > 0 && timeSlots.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${effectiveVenueId}-${effectiveSport}-${sportFilter}-${refreshToken}`}
              initial={reduced ? {} : { opacity: 0 }}
              animate={reduced ? {} : { opacity: 1 }}
              exit={reduced    ? {} : { opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflowX: 'auto', marginBottom: '1.5rem' }}
              className="hide-scrollbar"
            >
              <div style={{ minWidth: `${160 + timeSlots.length * 72}px` }}>

                {/* Time header */}
                <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${timeSlots.length}, minmax(64px,1fr))`, gap: '5px', marginBottom: '4px', alignItems: 'end' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingBottom: '4px' }}>
                    Court / Arena
                  </div>
                  {timeSlots.map((ts) => {
                    const periodMeta = PERIOD_META[ts.period];
                    const [startH, endH] = ts.label.split(' – ');
                    return (
                      <div key={ts.time} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingBottom: '4px' }}>
                        <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: periodMeta?.color ?? 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 'var(--fw-bold)', color: ts.isPeak ? 'var(--brand-accent)' : 'var(--text-muted)', lineHeight: 1.2, textAlign: 'center' }}>
                          {startH}
                        </span>
                        <span style={{ fontSize: '0.56rem', color: 'var(--text-faint)', lineHeight: 1, textAlign: 'center' }}>
                          {endH}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Court rows */}
                <AnimatePresence mode="popLayout">
                  {visibleCourts.map((court, rowIdx) => (
                    <motion.div
                      key={court.id}
                      custom={rowIdx}
                      variants={reduced ? {} : rowVariants}
                      initial="hidden"
                      whileInView="show"
                      exit={reduced ? {} : { opacity: 0, x: 16, transition: { duration: 0.18 } }}
                      viewport={{ once: true, margin: '-20px' }}
                      style={{ display: 'grid', gridTemplateColumns: `160px repeat(${timeSlots.length}, minmax(64px,1fr))`, gap: '5px', marginBottom: '5px', alignItems: 'center' }}
                    >
                      {/* Court label */}
                      <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {court.name}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                          {court.sport}
                        </div>
                      </div>

                      {/* Slot cells */}
                      {timeSlots.map((ts) => {
                        // The API returns each slot as { status, pricePerHour }.
                        const rawSlot    = court.slots[ts.time];
                        const rawStatus  = typeof rawSlot === 'object' ? rawSlot?.status : rawSlot;
                        const status     = rawStatus ?? 'available';
                        const isSelected = selectedCell?.courtId === court.id && selectedCell?.time === ts.time;
                        const priceValue = typeof rawSlot === 'object' ? rawSlot.pricePerHour : null;
                        const price      = priceValue != null ? `Rs. ${Number(priceValue).toLocaleString('en-PK')}` : null;

                        return (
                          <SlotCell
                            key={ts.time}
                            status={status}
                            isPeak={ts.isPeak}
                            timeLabel={ts.label}
                            priceLabel={price}
                            reduced={reduced}
                            isSelected={isSelected}
                            isPastDate={isPastDate}
                            onClick={() => handleSlotClick(court, ts)}
                          />
                        );
                      })}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Empty — sport not offered at this venue ───────────── */}
        {!loading && !error && visibleCourts.length === 0 && allCourts.length > 0 && (
          <div
            role="status"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--bg-surface-card)', border: '1px solid var(--border-card)', marginBottom: '1.5rem' }}
          >
            <AlertCircle size={28} color="var(--text-faint)" aria-hidden="true" />
            <div>
              <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 0.4rem' }}>
                No courts match this filter
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
                Try a different sport filter or clear your selection in Quick Booking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSportFilter('all')}
              style={{ padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--gradient-cta)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Show All Courts
            </button>
          </div>
        )}

        {/* ── Empty — venue has no courts ──────────────────────── */}
        {!loading && !error && allCourts.length === 0 && reduxVenue && (
          <div
            role="status"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--bg-surface-card)', border: '1px solid var(--border-card)', marginBottom: '1.5rem' }}
          >
            <AlertCircle size={28} color="var(--text-faint)" aria-hidden="true" />
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: 0 }}>
              No availability data for this venue
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
              Availability for {venueObj?.name ?? reduxVenue} will appear once a backend is connected.
            </p>
          </div>
        )}

        {/* ── Legend ───────────────────────────────────────────── */}
        {!loading && !error && allCourts.length > 0 && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            whileInView={reduced ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.28, ease: 'easeOut', delay: 0.06 }}
            role="list"
            aria-label="Slot status legend"
            style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem 1.5rem', padding: '0.9rem 1.25rem', marginBottom: '1.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0 }}>
              Legend:
            </span>
            {['available', 'limited', 'booked', 'reserved', 'maintenance'].map((k) => (
              <div key={k} role="listitem"><LegendItem statusKey={k} /></div>
            ))}
            <div role="listitem" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>
              <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--brand-accent)', flexShrink: 0 }} />
              <span><strong style={{ color: 'var(--brand-accent)' }}>⚡ Peak hours</strong> (17:00–05:00) — premium rate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              {Object.entries(PERIOD_META).map(([key, meta]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <span aria-hidden="true" style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: meta.color }} />
                  {meta.label}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── CTA footer ───────────────────────────────────────── */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 14 }}
          whileInView={reduced ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--bg-surface-card)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-md)' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.3rem' }}>
              <Clock size={14} color="var(--brand-primary)" aria-hidden="true" />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--brand-primary)' }}>
                {reduxVenue ? 'Ready to book?' : 'Get started'}
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0, maxWidth: '52ch' }}>
              {reduxVenue
                ? 'Click any green or amber slot above to open the booking form.'
                : 'Use Quick Booking above to select a sport, venue, and date — then come back here to pick your slot.'}
            </p>
          </div>
          <motion.button
            type="button"
            onClick={handleScrollToBooking}
            whileHover={reduced ? {} : { scale: 1.03 }}
            whileTap={reduced  ? {} : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 440, damping: 22 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--gradient-cta)', color: '#ffffff', border: '1px solid transparent', boxShadow: 'var(--shadow-brand)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {reduxVenue ? 'Change Selection' : 'Quick Booking'}
            <ArrowRight size={15} aria-hidden="true" />
          </motion.button>
        </motion.div>

      </Container>
    </section>
  );
};

export default AvailabilityPreview;
