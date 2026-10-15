/**
 * VenueDetailPage.jsx  —  /venues/:venueId
 * ─────────────────────────────────────────────────────────────────────────
 * Venue, court, and pricing data are loaded from the API.
 * ─────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useDispatch } from 'react-redux';
import { setSelectedVenue } from '../features/booking/bookingSlice';
import {
  MapPin, Clock, Star, Phone, MessageCircle, Navigation,
  ArrowLeft, Layers, CheckCircle2, CalendarDays, ChevronRight,
  Info, AlertCircle, RefreshCw,
} from 'lucide-react';
import { getVenueById, getVenuePricing } from '../services/bookingService';

import Container from '../components/common/Container';
import Navbar    from '../components/layout/Navbar';
import Footer    from '../components/layout/Footer';

const TIME_PERIODS = [
  { id: 'off-peak', label: 'Off-Peak', hours: '05:00 AM – 05:00 PM' },
  { id: 'peak', label: 'Peak', hours: '05:00 PM – 05:00 AM' },
];
const DAY_GROUPS = [{ id: 'days', label: 'Weekday: Mon–Thu · Weekend: Fri–Sun' }];

/* ─── Sport label map ───────────────────────────────────────────────────── */
const SPORT_LABELS = {
  cricket:    { label: 'Cricket',    color: '#3b82f6' },
  futsal:     { label: 'Futsal',     color: '#10b981' },
  padel:      { label: 'Padel',      color: '#8b5cf6' },
  pickleball: { label: 'Pickleball', color: '#f59e0b' },
  badminton:  { label: 'Badminton',  color: '#ec4899' },
};

const pkr = (n) => (n != null ? `Rs. ${n.toLocaleString('en-PK')}` : '—');

/* ─── Shared card wrapper ───────────────────────────────────────────────── */
const Card = ({ children, style }) => (
  <div style={{ borderRadius:'var(--radius-xl)', backgroundColor:'var(--bg-surface-card)', border:'1px solid var(--border-card)', boxShadow:'var(--shadow-sm)', padding:'clamp(1.25rem,3vw,1.75rem)', ...style }}>
    {children}
  </div>
);
const CardLabel = ({ children }) => (
  <p style={{ fontSize:'var(--text-xs)', fontWeight:'var(--fw-bold)', letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', margin:'0 0 0.9rem' }}>
    {children}
  </p>
);

/* ─── Skeleton loader ───────────────────────────────────────────────────── */
const Skeleton = ({ height = '1.2rem', width = '100%' }) => (
  <div style={{ height, width, borderRadius:'var(--radius-sm)', backgroundColor:'var(--bg-surface-elevated)', animation:'pulse 1.6s ease-in-out infinite' }} />
);

/* ─── Pricing table ─────────────────────────────────────────────────────── */
const PricingTable = ({ rules }) => {
  if (!rules?.length) return null;
  const columns = [
    { key: 'weekdayDay',   label: 'Mon–Thu\nOff-Peak', sub: '05:00–17:00' },
    { key: 'weekdayNight', label: 'Mon–Thu\nPeak',     sub: '17:00–05:00' },
    { key: 'weekendDay',   label: 'Fri–Sun\nOff-Peak', sub: '05:00–17:00' },
    { key: 'weekendNight', label: 'Fri–Sun\nPeak',     sub: '17:00–05:00' },
  ];
  const isPeakCol = (k) => k.endsWith('Night');

  return (
    <div style={{ overflowX:'auto' }} className="hide-scrollbar">
      <table style={{ width:'100%', minWidth:'540px', borderCollapse:'separate', borderSpacing:0, fontSize:'var(--text-sm)' }} aria-label="Court pricing matrix — rates per hour in PKR">
        <thead>
          <tr>
            <th scope="col" style={{ padding:'0.65rem 1rem', textAlign:'left', fontSize:'var(--text-xs)', fontWeight:'var(--fw-bold)', letterSpacing:'0.05em', textTransform:'uppercase', color:'var(--text-muted)', borderBottom:'2px solid var(--border-card)', backgroundColor:'var(--bg-surface-elevated)', whiteSpace:'nowrap' }}>
              Court / Sport
            </th>
            {columns.map((col) => (
              <th key={col.key} scope="col" style={{ padding:'0.65rem 0.9rem', textAlign:'center', fontSize:'0.7rem', fontWeight:'var(--fw-bold)', color: isPeakCol(col.key) ? 'var(--brand-accent)' : 'var(--text-secondary)', borderBottom:'2px solid var(--border-card)', borderLeft:'1px solid var(--border-subtle)', backgroundColor: isPeakCol(col.key) ? 'var(--slot-peak-bg)' : 'var(--bg-surface-elevated)', whiteSpace:'pre-line', lineHeight:1.35 }}>
                {col.label}
                <div style={{ fontSize:'0.62rem', fontWeight:'var(--fw-medium)', color:'var(--text-faint)', marginTop:'2px' }}>{col.sub}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, ri) => {
            const sport     = rule.sport ?? '';
            const courtName = rule.courtName ?? rule.courtType ?? '—';
            const meta      = SPORT_LABELS[sport] ?? { label: sport, color: 'var(--text-muted)' };
            const isLast    = ri === rules.length - 1;
            return (
              <tr key={rule.courtId ?? rule.id ?? ri} style={{ backgroundColor: ri % 2 === 0 ? 'var(--bg-surface-card)' : 'var(--bg-surface-elevated)' }}>
                <td style={{ padding:'0.75rem 1rem', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight:'var(--fw-bold)', color:'var(--text-primary)', fontSize:'var(--text-sm)' }}>{courtName}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'3px' }}>
                    <span style={{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor:meta.color, flexShrink:0 }} aria-hidden="true" />
                    <span style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', fontWeight:'var(--fw-medium)' }}>{meta.label}</span>
                    {rule.note && <span style={{ fontSize:'0.65rem', color:'var(--text-faint)', marginLeft:'4px' }}>· {rule.note}</span>}
                  </div>
                </td>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding:'0.75rem 0.9rem', textAlign:'center', fontWeight:'var(--fw-bold)', fontSize:'var(--text-sm)', color: isPeakCol(col.key) ? 'var(--brand-accent)' : 'var(--text-primary)', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)', borderLeft:'1px solid var(--border-subtle)', backgroundColor: isPeakCol(col.key) ? 'rgba(217,119,6,0.04)' : 'transparent', whiteSpace:'nowrap' }}>
                    {pkr(rule[col.key])}
                    <span style={{ display:'block', fontSize:'0.6rem', fontWeight:'var(--fw-medium)', color:'var(--text-faint)', marginTop:'1px' }}>/hr</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   VENUE DETAIL PAGE
═══════════════════════════════════════════════════════════════════════════ */
const VenueDetailPage = () => {
  const { venueId } = useParams();
  const navigate    = useNavigate();
  const dispatch    = useDispatch();
  const reduced     = useReducedMotion();

  const [venue,        setVenue]        = useState(null);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    Promise.all([getVenueById(venueId), getVenuePricing(venueId)])
      .then(([apiVenue, pricing]) => {
        const courts = apiVenue.courts ?? [];
        setVenue({
          ...apiVenue,
          image: apiVenue.imageUrl,
          sports: [...new Set(courts.map((court) => court.sport))],
          amenities: [],
          availableCourts: courts.length,
          unit: 'hr',
          courts: courts.map((court) => ({ ...court, type: court.surfaceType ?? '' })),
        });
        setPricingRules(pricing.rules ?? []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load venue details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handleCheckAvailability = () => {
    dispatch(setSelectedVenue(venueId));
    navigate('/');
    setTimeout(() => {
      const el  = document.getElementById('availability');
      const nav = document.querySelector('header');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight ?? 72) - 8, behavior: reduced ? 'auto' : 'smooth' });
    }, 180);
  };

  const handleDirections = () => {
    const query = encodeURIComponent(venue?.address ?? venueId);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener');
  };

  const phoneAvailable = Boolean(venue?.phone);
  const waAvailable    = Boolean(venue?.whatsapp);

  /* ─── Loading ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <Navbar />
        <main id="main-content">
          <div style={{ height:'clamp(260px,40vw,360px)', backgroundColor:'var(--bg-surface-elevated)', animation:'pulse 1.6s ease-in-out infinite' }} />
          <Container>
            <div style={{ paddingTop:'2rem', paddingBottom:'4rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>
              <Skeleton height="2rem" width="60%" />
              <Skeleton height="1rem" width="40%" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'1.5rem' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                  {[1,2,3].map((i) => <Skeleton key={i} height="120px" />)}
                </div>
                <Skeleton height="280px" />
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  /* ─── 404 ──────────────────────────────────────────────────────────── */
  if (!venue) {
    return (
      <>
        <Navbar />
        <main id="main-content">
          <Container>
            <div style={{ minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1.25rem', textAlign:'center', padding:'4rem 1rem' }}>
              <h1 style={{ fontSize:'var(--text-3xl)', fontWeight:'var(--fw-extrabold)', color:'var(--text-primary)', margin:0 }}>{error ? 'Venue details unavailable' : 'Venue Not Found'}</h1>
              <p style={{ color:'var(--text-muted)', margin:0 }}>{error || <>No venue with ID <code>{venueId}</code> exists.</>}</p>
              {error && <button type="button" onClick={fetchData} style={{ padding:'0.6rem 1rem', border:0, borderRadius:'var(--radius-md)', background:'var(--brand-primary)', color:'#fff', fontWeight:'var(--fw-bold)', cursor:'pointer' }}>Retry</button>}
              <Link to="/venues" style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'0.65rem 1.5rem', borderRadius:'var(--radius-md)', background:'var(--gradient-cta)', color:'#ffffff', fontWeight:'var(--fw-bold)', fontSize:'var(--text-sm)', textDecoration:'none' }}>
                <ArrowLeft size={15} aria-hidden="true" /> All Venues
              </Link>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  /* ─── Main render ──────────────────────────────────────────────────── */
  return (
    <>
      <Navbar />
      <main id="main-content">

        {/* Hero */}
        <div style={{ position:'relative', height:'clamp(260px,40vw,480px)', overflow:'hidden' }}>
          {venue.image && (
            <img src={venue.image} alt={`${venue.name} indoor sports facility`} loading="eager" decoding="async"
              style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }} />
          )}
          <div aria-hidden="true" style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(9,14,23,0.88) 0%,rgba(9,14,23,0.18) 60%,transparent 100%)' }} />

          {/* Overlay content */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0 }}>
            <Container>
              <div style={{ paddingBottom:'clamp(1.25rem,3vw,2rem)', display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'0.6rem' }}>
                    <Link to="/venues"
                      style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', color:'rgba(255,255,255,0.70)', textDecoration:'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color='#fff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color='rgba(255,255,255,0.70)')}
                    >
                      <ArrowLeft size={13} aria-hidden="true" /> All Venues
                    </Link>
                    <ChevronRight size={12} color="rgba(255,255,255,0.35)" aria-hidden="true" />
                    <span style={{ fontSize:'var(--text-xs)', color:'rgba(255,255,255,0.70)', fontWeight:'var(--fw-medium)' }}>{venue.shortName ?? venue.name}</span>
                  </div>
                  <motion.h1
                    initial={reduced ? {} : { opacity:0, y:16 }}
                    animate={reduced ? {} : { opacity:1, y:0 }}
                    transition={{ duration:0.42, ease:[0.16,1,0.3,1] }}
                    style={{ fontSize:'clamp(1.6rem,4vw,2.8rem)', fontWeight:'var(--fw-extrabold)', color:'#ffffff', margin:0, letterSpacing:'var(--tracking-tight)', lineHeight:1.15 }}
                  >
                    {venue.name}
                  </motion.h1>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'0.45rem' }}>
                    <MapPin size={13} color="#38bdf8" aria-hidden="true" />
                    <span style={{ fontSize:'var(--text-sm)', color:'rgba(255,255,255,0.80)', fontWeight:'var(--fw-medium)' }}>{venue.address}</span>
                  </div>
                </div>
                {venue.rating && (
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0.55rem 1rem', borderRadius:'var(--radius-md)', backgroundColor:'rgba(0,0,0,0.72)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.12)', flexShrink:0 }}>
                    <Star size={16} fill="#fbbf24" strokeWidth={0} aria-hidden="true" />
                    <span style={{ fontSize:'var(--text-lg)', fontWeight:'var(--fw-extrabold)', color:'#fbbf24' }}>{venue.rating}</span>
                    {venue.reviewsCount > 0 && <span style={{ fontSize:'var(--text-xs)', color:'rgba(255,255,255,0.55)' }}>({venue.reviewsCount} reviews)</span>}
                  </div>
                )}
              </div>
            </Container>
          </div>

          {venue.badge && (
            <div style={{ position:'absolute', top:'1rem', left:0 }}>
              <Container>
                <span style={{ padding:'4px 12px', borderRadius:'var(--radius-sm)', fontSize:'var(--text-xs)', fontWeight:'var(--fw-bold)', textTransform:'uppercase', letterSpacing:'0.05em', backgroundColor:'var(--brand-primary)', color:'#ffffff', boxShadow:'0 2px 10px rgba(16,185,129,0.35)' }}>
                  {venue.badge}
                </span>
              </Container>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ backgroundColor:'var(--bg-main)', paddingTop:'clamp(2rem,4vw,3rem)', paddingBottom:'clamp(3rem,6vw,5rem)' }}>
          <Container>

            {/* Error + retry */}
            {error && (
              <div role="alert" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'1rem', marginBottom:'1.25rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--color-danger-soft)', border:'1px solid rgba(220,38,38,0.28)', fontSize:'var(--text-sm)', color:'var(--brand-danger)' }}>
                <AlertCircle size={16} aria-hidden="true" style={{ flexShrink:0 }} />
                <span>{error}</span>
                <button type="button" onClick={fetchData} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'4px', fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', color:'var(--brand-danger)', background:'none', border:'none', cursor:'pointer' }}>
                  <RefreshCw size={12} aria-hidden="true" /> Retry
                </button>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,340px)', gap:'clamp(1.25rem,3vw,2rem)', alignItems:'start' }} className="venue-detail-grid">

              {/* Left column */}
              <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', minWidth:0 }}>

                {/* Overview */}
                <motion.div initial={reduced ? {} : { opacity:0, y:20 }} animate={reduced ? {} : { opacity:1, y:0 }} transition={{ duration:0.42, ease:[0.16,1,0.3,1], delay:0.08 }}>
                  <Card>
                    <CardLabel>Overview</CardLabel>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem' }}>
                      {venue.operatingHours && (
                        <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                          <div style={{ width:'36px', height:'36px', borderRadius:'var(--radius-sm)', backgroundColor:'var(--color-accent-soft)', border:'1px solid rgba(217,119,6,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <Clock size={16} color="var(--brand-accent)" aria-hidden="true" />
                          </div>
                          <div>
                            <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', fontWeight:'var(--fw-semibold)', marginBottom:'2px' }}>Operating Hours</div>
                            <div style={{ fontSize:'var(--text-sm)', fontWeight:'var(--fw-bold)', color:'var(--text-primary)' }}>{venue.operatingHours}</div>
                            <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', marginTop:'2px' }}>Open daily</div>
                          </div>
                        </div>
                      )}
                      <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'var(--radius-sm)', backgroundColor:'var(--color-primary-soft)', border:'1px solid var(--color-primary-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Layers size={16} color="var(--brand-primary)" aria-hidden="true" />
                        </div>
                        <div>
                          <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', fontWeight:'var(--fw-semibold)', marginBottom:'2px' }}>Total Courts</div>
                          <div style={{ fontSize:'var(--text-sm)', fontWeight:'var(--fw-bold)', color:'var(--text-primary)' }}>{venue.availableCourts} Courts &amp; Arenas</div>
                          <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', marginTop:'2px' }}>
                            {(venue.sports?.length ?? 0)} sport{(venue.sports?.length ?? 0) !== 1 ? 's' : ''} available
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'var(--radius-sm)', backgroundColor:'var(--color-secondary-soft)', border:'1px solid rgba(2,132,199,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <MapPin size={16} color="var(--brand-secondary)" aria-hidden="true" />
                        </div>
                        <div>
                          <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', fontWeight:'var(--fw-semibold)', marginBottom:'2px' }}>City</div>
                          <div style={{ fontSize:'var(--text-sm)', fontWeight:'var(--fw-bold)', color:'var(--text-primary)' }}>{venue.city}</div>
                          <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', marginTop:'2px' }}>Punjab, Pakistan</div>
                        </div>
                      </div>
                    </div>

                    {venue.sports?.length > 0 && (
                      <div style={{ marginTop:'1.25rem', paddingTop:'1rem', borderTop:'1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize:'var(--text-xs)', fontWeight:'var(--fw-bold)', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.6rem' }}>Sports Available</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                          {venue.sports.map((sid) => {
                            const meta = SPORT_LABELS[sid] ?? { label: sid, color: 'var(--text-muted)' };
                            return (
                              <span key={sid} style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 12px', borderRadius:'var(--radius-full)', fontSize:'var(--text-xs)', fontWeight:'var(--fw-bold)', backgroundColor:`${meta.color}16`, border:`1.5px solid ${meta.color}40`, color:meta.color }}>
                                <span style={{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor:meta.color, flexShrink:0 }} aria-hidden="true" />
                                {meta.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>

                {/* Courts */}
                {venue.courts?.length > 0 && (
                  <motion.div initial={reduced ? {} : { opacity:0, y:20 }} animate={reduced ? {} : { opacity:1, y:0 }} transition={{ duration:0.42, ease:[0.16,1,0.3,1], delay:0.14 }}>
                    <Card>
                      <CardLabel>Courts &amp; Arenas ({venue.courts.length})</CardLabel>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'0.75rem' }}>
                        {venue.courts.map((court) => {
                          const meta = SPORT_LABELS[court.sport] ?? { label: court.sport, color: 'var(--text-muted)' };
                          return (
                            <div key={court.id} style={{ display:'flex', flexDirection:'column', gap:'5px', padding:'0.85rem 1rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--bg-surface-elevated)', border:'1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize:'var(--text-sm)', fontWeight:'var(--fw-bold)', color:'var(--text-primary)', lineHeight:1.3 }}>{court.name}</div>
                              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 7px', borderRadius:'var(--radius-xs)', fontSize:'0.65rem', fontWeight:'var(--fw-bold)', backgroundColor:`${meta.color}14`, border:`1px solid ${meta.color}30`, color:meta.color, whiteSpace:'nowrap' }}>
                                  {meta.label}
                                </span>
                                <span style={{ fontSize:'0.65rem', color:'var(--text-faint)', fontWeight:'var(--fw-medium)' }}>{court.surfaceType ?? court.type}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Amenities */}
                {venue.amenities?.length > 0 && (
                  <motion.div initial={reduced ? {} : { opacity:0, y:20 }} animate={reduced ? {} : { opacity:1, y:0 }} transition={{ duration:0.42, ease:[0.16,1,0.3,1], delay:0.18 }}>
                    <Card>
                      <CardLabel>Venue Features</CardLabel>
                      <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexWrap:'wrap', gap:'0.6rem' }}>
                        {venue.amenities.map((a) => (
                          <li key={a} style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 11px', borderRadius:'var(--radius-sm)', fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', backgroundColor:'var(--bg-surface-elevated)', border:'1px solid var(--border-subtle)', color:'var(--text-secondary)' }}>
                            <CheckCircle2 size={11} color="var(--brand-primary)" aria-hidden="true" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </motion.div>
                )}

                {/* Pricing */}
                {pricingRules.length > 0 && (
                  <motion.div initial={reduced ? {} : { opacity:0, y:20 }} animate={reduced ? {} : { opacity:1, y:0 }} transition={{ duration:0.42, ease:[0.16,1,0.3,1], delay:0.22 }}>
                    <Card>
                      <CardLabel>Pricing Matrix — Rate per Hour (PKR)</CardLabel>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', marginBottom:'1rem', padding:'0.75rem 1rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--bg-surface-elevated)', border:'1px solid var(--border-subtle)', alignItems:'center' }}>
                        <Info size={13} color="var(--brand-secondary)" aria-hidden="true" style={{ flexShrink:0 }} />
                        {TIME_PERIODS.map((p) => (
                          <span key={p.id} style={{ fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', color: p.id === 'peak' ? 'var(--brand-accent)' : 'var(--text-secondary)' }}>
                            <strong>{p.label}:</strong> {p.hours}
                          </span>
                        ))}
                        {DAY_GROUPS.map((g) => (
                          <span key={g.id} style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', fontWeight:'var(--fw-medium)' }}>{g.label}</span>
                        ))}
                      </div>
                      <PricingTable rules={pricingRules} />
                      <p style={{ margin:'0.75rem 0 0', fontSize:'0.68rem', color:'var(--text-faint)', fontStyle:'italic' }}>
                        Prices from the live database. Final amount is confirmed by the server at booking.
                      </p>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Right column — sticky sidebar */}
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem', position:'sticky', top:'calc(var(--nav-height) + 1.5rem)', alignSelf:'start' }} className="venue-detail-sidebar">

                {/* Book CTA */}
                <motion.div initial={reduced ? {} : { opacity:0, x:20 }} animate={reduced ? {} : { opacity:1, x:0 }} transition={{ duration:0.44, ease:[0.16,1,0.3,1], delay:0.1 }}>
                  <Card style={{ border:'1px solid var(--color-primary-border)', boxShadow:'var(--shadow-md), 0 0 0 1px var(--color-primary-border)' }}>
                    <div style={{ marginBottom:'1rem' }}>
                      <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', fontWeight:'var(--fw-semibold)', marginBottom:'3px' }}>Starting at</div>
                      <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
                        <span style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:'var(--fw-extrabold)', color:'var(--brand-primary)', lineHeight:1 }}>
                          {pkr(venue.startingPrice)}
                        </span>
                        <span style={{ fontSize:'var(--text-sm)', color:'var(--text-muted)' }}>/ {venue.unit ?? 'hr'}</span>
                      </div>
                    </div>
                    <motion.button type="button" onClick={handleCheckAvailability}
                      whileHover={!reduced ? { scale:1.03 } : {}}
                      whileTap={!reduced ? { scale:0.97 } : {}}
                      transition={{ type:'spring', stiffness:440, damping:22 }}
                      style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'0.8rem 1.25rem', borderRadius:'var(--radius-md)', fontSize:'var(--text-sm)', fontWeight:'var(--fw-bold)', background:'var(--gradient-cta)', color:'#ffffff', border:'none', boxShadow:'var(--shadow-brand)', cursor:'pointer', marginBottom:'0.75rem' }}
                      aria-label={`Check availability at ${venue.name}`}
                    >
                      <CalendarDays size={16} aria-hidden="true" />
                      Check Availability
                    </motion.button>
                    <p style={{ margin:0, fontSize:'var(--text-xs)', color:'var(--text-muted)', textAlign:'center' }}>
                      {venue.availableCourts} courts · {venue.operatingHours ?? '—'}
                    </p>
                  </Card>
                </motion.div>

                {/* Contact */}
                <motion.div initial={reduced ? {} : { opacity:0, x:20 }} animate={reduced ? {} : { opacity:1, x:0 }} transition={{ duration:0.44, ease:[0.16,1,0.3,1], delay:0.16 }}>
                  <Card>
                    <CardLabel>Contact &amp; Directions</CardLabel>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                      <a href={phoneAvailable ? `tel:${venue.phone}` : undefined} aria-disabled={!phoneAvailable}
                        aria-label={phoneAvailable ? `Call ${venue.name}` : 'Phone number coming soon'}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0.7rem 1rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--bg-surface-elevated)', border:'1px solid var(--border-subtle)', color: phoneAvailable ? 'var(--text-primary)' : 'var(--text-faint)', textDecoration:'none', fontSize:'var(--text-sm)', fontWeight:'var(--fw-semibold)', cursor: phoneAvailable ? 'pointer' : 'default', pointerEvents: phoneAvailable ? 'auto' : 'none', transition:'border-color var(--transition-fast),background-color var(--transition-fast)' }}
                        onMouseEnter={(e) => { if (phoneAvailable) { e.currentTarget.style.borderColor='var(--brand-primary)'; e.currentTarget.style.backgroundColor='var(--color-primary-soft)'; }}}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.backgroundColor='var(--bg-surface-elevated)'; }}
                      >
                        <div style={{ width:'34px', height:'34px', borderRadius:'var(--radius-sm)', backgroundColor: phoneAvailable ? 'var(--color-primary-soft)' : 'var(--bg-surface-card)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Phone size={15} color={phoneAvailable ? 'var(--brand-primary)' : 'var(--text-faint)'} aria-hidden="true" />
                        </div>
                        <div>
                          <div>Call Venue</div>
                          {!phoneAvailable && <div style={{ fontSize:'0.65rem', color:'var(--text-faint)', marginTop:'1px' }}>+92-3466350523</div>}
                        </div>
                      </a>
                      <a href={waAvailable ? `https://wa.me/${venue.whatsapp}` : undefined}
                        target={waAvailable ? '_blank' : undefined} rel="noopener noreferrer" aria-disabled={!waAvailable}
                        aria-label={waAvailable ? `WhatsApp ${venue.name}` : 'WhatsApp coming soon'}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0.7rem 1rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--bg-surface-elevated)', border:'1px solid var(--border-subtle)', color: waAvailable ? 'var(--text-primary)' : 'var(--text-faint)', textDecoration:'none', fontSize:'var(--text-sm)', fontWeight:'var(--fw-semibold)', cursor: waAvailable ? 'pointer' : 'default', pointerEvents: waAvailable ? 'auto' : 'none', transition:'border-color var(--transition-fast),background-color var(--transition-fast)' }}
                        onMouseEnter={(e) => { if (waAvailable) { e.currentTarget.style.borderColor='#25d366'; e.currentTarget.style.backgroundColor='rgba(37,211,102,0.08)'; }}}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.backgroundColor='var(--bg-surface-elevated)'; }}
                      >
                        <div style={{ width:'34px', height:'34px', borderRadius:'var(--radius-sm)', backgroundColor: waAvailable ? 'rgba(37,211,102,0.10)' : 'var(--bg-surface-card)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <MessageCircle size={15} color={waAvailable ? '#25d366' : 'var(--text-faint)'} aria-hidden="true" />
                        </div>
                        <div>
                          <div>WhatsApp</div>
                          {!waAvailable && <div style={{ fontSize:'0.65rem', color:'var(--text-faint)', marginTop:'1px' }}>+92-3359322700</div>}
                        </div>
                      </a>
                      <button type="button" onClick={handleDirections}
                        aria-label={`Open Google Maps directions to ${venue.name}`}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0.7rem 1rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--bg-surface-elevated)', border:'1px solid var(--border-subtle)', color:'var(--text-primary)', fontSize:'var(--text-sm)', fontWeight:'var(--fw-semibold)', cursor:'pointer', textAlign:'left', width:'100%', transition:'border-color var(--transition-fast),background-color var(--transition-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor='var(--brand-secondary)'; e.currentTarget.style.backgroundColor='var(--color-secondary-soft)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.backgroundColor='var(--bg-surface-elevated)'; }}
                      >
                        <div style={{ width:'34px', height:'34px', borderRadius:'var(--radius-sm)', backgroundColor:'var(--color-secondary-soft)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Navigation size={15} color="var(--brand-secondary)" aria-hidden="true" />
                        </div>
                        <div>
                          <div>Get Directions</div>
                          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:'1px' }}>Opens Google Maps</div>
                        </div>
                      </button>
                    </div>
                    <div style={{ marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--border-subtle)', display:'flex', gap:'8px', alignItems:'flex-start' }}>
                      <MapPin size={13} color="var(--text-faint)" aria-hidden="true" style={{ flexShrink:0, marginTop:'2px' }} />
                      <address style={{ fontStyle:'normal', fontSize:'var(--text-xs)', color:'var(--text-muted)', lineHeight:1.55 }}>
                        {venue.address}
                      </address>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </div>
          </Container>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VenueDetailPage;
