import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import Container from '../common/Container';
import { getSports, getVenues } from '../../services/bookingService';
import {
  MapPin,
  Clock,
  ShieldCheck,
  Coffee,
  Gamepad2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   NAV LINK SECTIONS
───────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Home',        id: 'home'        },
  { label: 'Sports',      id: 'sports'      },
  { label: 'Venues',      to: '/venues'     },
  { label: 'Memberships', id: 'memberships' },
  { label: 'Experiences', id: 'experiences' },
];

/* ─────────────────────────────────────────────────────────────
   FOOTER LINK — hover + focus states without inline handlers
───────────────────────────────────────────────────────────── */
const FooterLink = ({ href, to, children, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const style = {
    display:        'inline-flex',
    alignItems:     'center',
    gap:            '5px',
    color:          hovered ? 'var(--brand-primary)' : 'var(--text-secondary)',
    fontSize:       'var(--text-sm)',
    fontWeight:     'var(--fw-medium)',
    textDecoration: 'none',
    transition:     'color var(--transition-fast)',
    borderRadius:   'var(--radius-xs)',
  };

  const content = (
    <>
      <ChevronRight size={11} aria-hidden="true" style={{ flexShrink: 0, opacity: hovered ? 0.7 : 0 }} />
      {children}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
    >
      {content}
    </a>
  );
};

/* ─────────────────────────────────────────────────────────────
   COLUMN HEADING
───────────────────────────────────────────────────────────── */
const ColHeading = ({ children }) => (
  <h3
    style={{
      fontSize:      'var(--text-xs)',
      fontWeight:    'var(--fw-bold)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color:         'var(--text-muted)',
      marginBottom:  '1.1rem',
    }}
  >
    {children}
  </h3>
);

/* ═════════════════════════════════════════════════════════════
   FOOTER
═════════════════════════════════════════════════════════════ */
const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [sports, setSports] = useState([]);
  const [venuesData, setVenuesData] = useState([]);
  const [venueHours, setVenueHours] = useState('');
  const [dataStatus, setDataStatus] = useState('loading');

  const loadFooterData = useCallback(() => {
    setDataStatus('loading');
    Promise.all([getSports(), getVenues()])
      .then(([apiSports, apiVenues]) => {
        setSports(apiSports);
        setVenuesData(apiVenues);
        const hours = [...new Set(apiVenues.map((venue) => venue.operatingHours).filter(Boolean))];
        setVenueHours(hours.length === 1 ? hours[0] : hours.length ? 'Hours vary by venue' : 'Operating hours unavailable');
        setDataStatus('success');
      })
      .catch((err) => {
        console.error('[Footer] Failed to load API data:', err);
        setDataStatus('error');
      });
  }, []);

  useEffect(() => { loadFooterData(); }, [loadFooterData]);

  const scrollToId = (id) => {
    const el  = document.getElementById(id);
    const nav = document.querySelector('header');
    if (!el) return;
    window.scrollTo({
      top:      el.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight ?? 72) - 8,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  const handleSectionLink = (event, id) => {
    event.preventDefault();
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollToSection: id } });
      return;
    }
    scrollToId(id);
  };

  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop:       '1px solid var(--border-subtle)',
        paddingTop:      'clamp(3rem, 6vw, 4.5rem)',
        paddingBottom:   'clamp(1.5rem, 3vw, 2.5rem)',
        position:        'relative',
        overflow:        'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          top:          '-10%',
          right:        '3%',
          width:        '320px',
          height:       '320px',
          borderRadius: '50%',
          background:   'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
          filter:       'blur(80px)',
          pointerEvents:'none',
          zIndex:        0,
          opacity:       0.5,
        }}
      />

      <Container style={{ position: 'relative', zIndex: 1 }}>

        {/* ── MAIN GRID ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.4fr] gap-[clamp(1.75rem,4vw,3rem)]">

          {/* ── COL 1: Brand ─────────────────────────────────── */}
          <div style={{ gridColumn: 'span 1' }}>
            {/* Logo mark */}
            <a
              href="#home"
              onClick={(event) => handleSectionLink(event, 'home')}
              aria-label="Matro Indoor Sports Complex — back to top"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '10px',
                textDecoration: 'none',
                marginBottom:   '1.1rem',
              }}
            >
              <div
                style={{
                  width:           '36px',
                  height:          '36px',
                  borderRadius:    'var(--radius-md)',
                  background:      'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  color:           '#ffffff',
                  flexShrink:      0,
                  boxShadow:       'var(--shadow-sm)',
                }}
              >
                <Sparkles size={18} aria-hidden="true" />
              </div>
              <span
                style={{
                  fontFamily:    'var(--font-heading)',
                  fontSize:      '1.35rem',
                  fontWeight:    'var(--fw-extrabold)',
                  letterSpacing: 'var(--tracking-tighter)',
                  color:         'var(--text-primary)',
                }}
              >
                MATRO<span style={{ color: 'var(--brand-primary)' }}>.</span>
              </span>
            </a>

            {/* Description */}
            <p
              style={{
                fontSize:     'var(--text-sm)',
                color:        'var(--text-secondary)',
                lineHeight:   'var(--lh-base)',
                marginBottom: '1.5rem',
                maxWidth:     '30ch',
              }}
            >
              Premier indoor sports booking across Lahore and Sialkot — Cricket, Futsal, Padel, Pickleball, Badminton, and PS5 Gaming.
            </p>

            {/* Contact info */}
            <div
              style={{
                display:       'flex',
                flexDirection: 'column',
                gap:           '0.65rem',
                marginBottom:  '1.5rem',
              }}
            >
              <div
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '8px',
                  fontSize:   'var(--text-xs)',
                  color:      'var(--text-secondary)',
                }}
              >
                <Clock size={13} color="var(--brand-primary)" aria-hidden="true" />
                {dataStatus === 'loading' ? 'Loading venue hours…' : dataStatus === 'error' ? 'Venue hours unavailable' : venueHours}
              </div>
              <div
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '8px',
                  fontSize:   'var(--text-xs)',
                  color:      'var(--text-secondary)',
                }}
              >
                <MapPin size={13} color="var(--brand-secondary)" aria-hidden="true" />
                Lahore &amp; Sialkot, Punjab
              </div>
            </div>

          </div>

          {/* ── COL 2: Navigation ────────────────────────────── */}
          <div>
            <ColHeading>Navigation</ColHeading>
            <ul role="list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {NAV_LINKS.map(({ label, id, to }) => (
                <li key={label}>
                  {to ? (
                    <FooterLink to={to}>
                      {label}
                    </FooterLink>
                  ) : (
                    <FooterLink href={`#${id}`} onClick={(event) => handleSectionLink(event, id)}>
                      {label}
                    </FooterLink>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* ── COL 3: Sports ────────────────────────────────── */}
          <div>
            <ColHeading>Sports &amp; Activities</ColHeading>
            <ul role="list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {sports.map((sport) => (
                <li key={sport.id}>
                  <FooterLink href="#sports" onClick={(event) => handleSectionLink(event, 'sports')}>
                    <span
                      aria-hidden="true"
                      style={{
                        width:           '6px',
                        height:          '6px',
                        borderRadius:    '50%',
                        backgroundColor: 'var(--brand-primary)',
                        flexShrink:      0,
                        display:         'inline-block',
                      }}
                    />
                    {sport.name}
                  </FooterLink>
                </li>
              ))}
              {dataStatus === 'loading' && <li className="footer-data-hint" role="status">Loading sports…</li>}
              {dataStatus === 'success' && sports.length === 0 && <li className="footer-data-hint">No sports listed yet.</li>}
              {dataStatus === 'error' && <li className="footer-data-hint">Sports links are temporarily unavailable.</li>}
            </ul>
          </div>

          {/* ── COL 4: Venues ────────────────────────────────── */}
          <div>
            <ColHeading>Featured Venues</ColHeading>
            <ul role="list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {venuesData.map((venue) => (
                <li key={venue.id}>
                  <Link
                    to={`/venues/${venue.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        fontSize:   'var(--text-sm)',
                        fontWeight: 'var(--fw-semibold)',
                        color:      'var(--text-primary)',
                        lineHeight: 1.3,
                        transition: 'color var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                    >
                      {venue.shortName}
                    </div>
                    <div
                      style={{
                        fontSize:  'var(--text-xs)',
                        color:     'var(--text-muted)',
                        marginTop: '1px',
                      }}
                    >
                      {venue.city}
                    </div>
                  </Link>
                </li>
              ))}
              {dataStatus === 'loading' && <li className="footer-data-hint" role="status">Loading venues…</li>}
              {dataStatus === 'success' && venuesData.length === 0 && <li className="footer-data-hint">No venues listed yet.</li>}
              {dataStatus === 'error' && <li className="footer-data-hint">Venue links are temporarily unavailable.</li>}
            </ul>
          </div>

          {/* ── COL 5: Experiences & Trust ───────────────────── */}
          <div>
            <ColHeading>Experiences</ColHeading>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {/* BaseCamp Cafe */}
              <div
                style={{
                  padding:         '0.8rem',
                  borderRadius:    'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border:          '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '6px',
                    marginBottom:'3px',
                    fontSize:   'var(--text-xs)',
                    fontWeight: 'var(--fw-bold)',
                    color:      'var(--brand-accent)',
                  }}
                >
                  <Coffee size={12} aria-hidden="true" />
                  BaseCamp Sports Cafe
                </div>
                <p
                  style={{
                    fontSize:   '0.68rem',
                    color:      'var(--text-muted)',
                    lineHeight: 1.4,
                    margin:     0,
                  }}
                >
                  Food and drinks at selected Matro venues.
                </p>
              </div>

              {/* PS5 Gaming */}
              <div
                style={{
                  padding:         '0.8rem',
                  borderRadius:    'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border:          '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '6px',
                    marginBottom:'3px',
                    fontSize:   'var(--text-xs)',
                    fontWeight: 'var(--fw-bold)',
                    color:      '#06b6d4',
                  }}
                >
                  <Gamepad2 size={12} aria-hidden="true" />
                  PS5 VIP Gaming Lounge
                </div>
                <p
                  style={{
                    fontSize:   '0.68rem',
                    color:      'var(--text-muted)',
                    lineHeight: 1.4,
                    margin:     0,
                  }}
                >
                  Ask your venue about gaming lounge availability.
                </p>
              </div>
            </div>

            {/* Trust badge */}
            <div
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '6px',
                fontSize:   '0.68rem',
                color:      'var(--text-muted)',
                fontWeight: 'var(--fw-medium)',
              }}
            >
              <ShieldCheck size={13} color="var(--brand-primary)" aria-hidden="true" />
              Professional turf &amp; court-certified venues
            </div>
          </div>
        </div>

        {dataStatus === 'error' && (
          <div className="footer-load-error" role="alert">
            <span>Some footer information could not be loaded.</span>
            <button type="button" onClick={loadFooterData}>Try again</button>
          </div>
        )}

        {/* ── BOTTOM BAR ──────────────────────────────────────── */}
        <div
          style={{
            borderTop:      '1px solid var(--border-subtle)',
            marginTop:      'clamp(2rem, 4vw, 3.5rem)',
            paddingTop:     '1.5rem',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            flexWrap:       'wrap',
            gap:            '1rem',
          }}
        >
          {/* Copyright */}
          <p
            style={{
              fontSize:   'var(--text-xs)',
              color:      'var(--text-muted)',
              margin:     0,
              fontWeight: 'var(--fw-medium)',
            }}
          >
            &copy; {new Date().getFullYear()} Matro Indoor Sports. All rights reserved.
          </p>

        </div>

      </Container>
    </footer>
  );
};

export default Footer;
