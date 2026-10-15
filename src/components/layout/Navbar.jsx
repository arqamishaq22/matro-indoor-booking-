import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Calendar, ChevronRight, Activity, ArrowRight, Zap,
  User, LogOut, LayoutDashboard, Shield, BookOpen,
} from 'lucide-react';
import {
  logout,
  selectIsLoggedIn,
  selectAuthUser,
  selectIsAdmin,
} from '../../features/auth/authSlice';
import Container  from '../common/Container';
import Button     from '../common/Button';
import ThemeToggle from '../common/ThemeToggle';
import { getVenues } from '../../services/bookingService';

/* ─── Motion variants ─────────────────────────────────────────────────── */
const drawerVariants = {
  closed: { opacity: 0, y: -8,  transition: { duration: 0.2,  ease: [0.4, 0, 1, 1]    } },
  open:   { opacity: 1, y: 0,   transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1]  } },
};
const drawerItemVariants = {
  closed: { opacity: 0, x: -12 },
  open: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.045 + 0.06, duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  }),
};
const backdropVariants = {
  closed: { opacity: 0, transition: { duration: 0.18 } },
  open:   { opacity: 1, transition: { duration: 0.22 } },
};

/* ─── Link style helpers ─────────────────────────────────────────────── */
const linkStyle = (isActive) => ({
  position:        'relative',
  padding:         '6px 12px',
  borderRadius:    'var(--radius-sm)',
  fontSize:        'var(--text-sm)',
  fontWeight:      isActive ? 'var(--fw-bold)' : 'var(--fw-semibold)',
  color:           isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
  textDecoration:  'none',
  transition:      'color var(--transition-fast), background-color var(--transition-fast)',
  backgroundColor: isActive ? 'var(--color-primary-soft)' : 'transparent',
  whiteSpace:      'nowrap',
  display:         'flex',
  alignItems:      'center',
  gap:             '5px',
});
const hoverOn  = (e, isActive) => { if (!isActive) { e.currentTarget.style.color = 'var(--brand-primary)'; e.currentTarget.style.backgroundColor = 'var(--color-primary-soft)'; } };
const hoverOff = (e, isActive) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; } };

const ActivePip = () => (
  <span aria-hidden="true" style={{ position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)', width: '18px', height: '2.5px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--brand-primary)' }} />
);

/* ─── Mobile drawer item ─────────────────────────────────────────────── */
const MobileItem = ({ to, href, onClick, label, isActive, icon: Icon, i, closeMenu }) => {
  const navigate = useNavigate();
  const itemStyle = {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '0.85rem 1rem',
    borderRadius:    'var(--radius-md)',
    backgroundColor: isActive ? 'var(--color-primary-soft)' : 'var(--bg-surface-elevated)',
    border:          `1px solid ${isActive ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
    color:           isActive ? 'var(--brand-primary)' : 'var(--text-primary)',
    fontSize:        'var(--text-sm)',
    fontWeight:      isActive ? 'var(--fw-bold)' : 'var(--fw-semibold)',
    textDecoration:  'none',
    transition:      'all var(--transition-fast)',
    cursor:          'pointer',
  };
  const hoverOnM  = (e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.color = 'var(--brand-primary)'; e.currentTarget.style.backgroundColor = 'var(--color-primary-soft)'; } };
  const hoverOffM = (e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'; } };

  const inner = (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {Icon && <Icon size={15} aria-hidden="true" />}
        {label}
      </span>
      <ChevronRight size={15} aria-hidden="true" color={isActive ? 'var(--brand-primary)' : 'var(--text-muted)'} />
    </>
  );

  return (
    <motion.li custom={i} variants={drawerItemVariants} initial="closed" animate="open">
      {onClick ? (
        <button type="button" onClick={() => { closeMenu(); onClick(); }} style={{ ...itemStyle, width: '100%', background: itemStyle.backgroundColor, border: `1px solid ${itemStyle.border?.includes('primary') ? 'var(--brand-primary)' : 'var(--border-subtle)'}` }} onMouseEnter={hoverOnM} onMouseLeave={hoverOffM}>
          {inner}
        </button>
      ) : to ? (
        <Link to={to} onClick={closeMenu} aria-current={isActive ? 'page' : undefined} style={itemStyle} onMouseEnter={hoverOnM} onMouseLeave={hoverOffM}>
          {inner}
        </Link>
      ) : (
        <a href={href} onClick={(e) => { e.preventDefault(); closeMenu(); navigate('/'); }} style={itemStyle} onMouseEnter={hoverOnM} onMouseLeave={hoverOffM}>
          {inner}
        </a>
      )}
    </motion.li>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════════════════════════ */
const Navbar = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const reduced    = useReducedMotion();

  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user       = useSelector(selectAuthUser);
  const isAdmin    = useSelector(selectIsAdmin);

  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [venueStatus, setVenueStatus] = useState('loading');

  const headerRef       = useRef(null);
  const mobileToggleRef = useRef(null);
  const drawerRef       = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getVenues()
      .then((venues) => {
        if (!cancelled) {
          setVenueStatus(`${venues.length} available ${venues.length === 1 ? 'venue' : 'venues'} · Lahore & Sialkot · Browse and book online`);
        }
      })
      .catch((err) => {
        console.error('[Navbar] Failed to load venue status:', err);
        if (!cancelled) setVenueStatus('Live venue status unavailable.');
      });
    return () => { cancelled = true; };
  }, []);

  /* Scroll compact mode */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Active section via IntersectionObserver (home page only) */
  const ANCHOR_IDS = ['home', 'sports', 'memberships', 'experiences', 'availability'];
  useEffect(() => {
    if (location.pathname !== '/') return;
    const observers = [];
    ANCHOR_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const io = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
      );
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach((io) => io.disconnect());
  }, [location.pathname]);

  /* Escape closes drawer */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && mobileOpen) { setMobileOpen(false); mobileToggleRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  /* Focus trap inside mobile drawer */
  useEffect(() => {
    if (!mobileOpen || !drawerRef.current) return;
    const focusables = drawerRef.current.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusables.length) focusables[0].focus();
    const trap = (e) => {
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const items = Array.from(drawerRef.current.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!items.length) return;
      if (e.shiftKey) { if (document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); } }
      else            { if (document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); } }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [mobileOpen]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* Smooth scroll to anchor */
  const scrollToSection = useCallback((id, close = false) => {
    if (close) setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollToSection: id } });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const navH = headerRef.current?.offsetHeight ?? 72;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH - 8, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [location.pathname, navigate, reduced]);

  const scrollToAvailability = useCallback((e) => { if (e) e.preventDefault(); scrollToSection('availability', true); }, [scrollToSection]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/');
  }, [dispatch, navigate]);

  const isRoute = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const logoSize = scrolled ? 36 : 44;
  const navPadY  = scrolled ? '0.55rem' : '0.9rem';

  /* ── Build nav link arrays based on auth state ──────────────────── */
  const publicLinks = [
    { name: 'Home',    type: 'anchor', id: 'home'   },
    { name: 'Venues',  type: 'route',  to: '/venues' },
    { name: 'Sports',  type: 'anchor', id: 'sports'  },
  ];

  const authLinks = isLoggedIn ? [
    { name: 'My Bookings', type: 'route',  to: '/dashboard', icon: BookOpen   },
    ...(isAdmin ? [{ name: 'Admin', type: 'route', to: '/admin', icon: Shield }] : []),
  ] : [];

  const desktopLinks = [...publicLinks, ...authLinks];

  /* Mobile items */
  const mobileItems = [
    { label: 'Home',   type: 'anchor', id: 'home'   },
    { label: 'Venues', type: 'route',  to: '/venues' },
    { label: 'Sports', type: 'anchor', id: 'sports'  },
    ...(isLoggedIn ? [
      { label: 'My Bookings', type: 'route',  to: '/dashboard', icon: BookOpen },
      ...(isAdmin ? [{ label: 'Admin Dashboard', type: 'route', to: '/admin', icon: Shield }] : []),
    ] : []),
  ];

  return (
    <>
      {/* ════════════════════════
          STICKY HEADER
      ════════════════════════ */}
      <motion.header
        ref={headerRef}
        initial={{ y: reduced ? 0 : -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:            'sticky',
          top:                 0,
          zIndex:              1000,
          width:               '100%',
          backgroundColor:     scrolled ? 'var(--nav-backdrop)' : 'transparent',
          backdropFilter:      scrolled ? 'blur(14px) saturate(1.4)' : 'none',
          WebkitBackdropFilter:scrolled ? 'blur(14px) saturate(1.4)' : 'none',
          borderBottom:        scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
          boxShadow:           scrolled ? 'var(--shadow-sm)' : 'none',
          transition:          'background-color var(--transition-normal), border-color var(--transition-normal), box-shadow var(--transition-normal)',
        }}
      >
        {/* Micro-banner (home page, not scrolled) */}
        <div
          aria-hidden={scrolled || location.pathname !== '/'}
          style={{
            maxHeight:  (scrolled || location.pathname !== '/') ? '0' : '52px',
            opacity:    (scrolled || location.pathname !== '/') ? 0 : 1,
            overflow:   'hidden',
            transition: 'max-height 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.22s ease',
            borderBottom: scrolled ? 'none' : '1px solid var(--border-subtle)',
            background: 'var(--color-primary-soft)',
          }}
        >
          <Container>
            <div style={{ padding: '7px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--brand-primary)', fontWeight: 'var(--fw-bold)', whiteSpace: 'nowrap' }}>
                <Activity size={12} aria-hidden="true" />
                AVAILABLE VENUES:
              </span>
              <span role={venueStatus === 'loading' ? 'status' : venueStatus.includes('unavailable') ? 'alert' : undefined}>
                {venueStatus === 'loading' ? 'Loading venue status…' : venueStatus}
              </span>
              <a href="#availability" onClick={scrollToAvailability} tabIndex={scrolled || location.pathname !== '/' ? -1 : 0} style={{ color: 'var(--brand-primary)', fontWeight: 'var(--fw-bold)', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                Check Slots →
              </a>
            </div>
          </Container>
        </div>

        {/* Main nav row */}
        <div style={{ padding: `${navPadY} 0`, transition: 'padding var(--transition-normal)' }}>
          <Container>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>

              {/* Logo */}
              <Link
                to="/"
                aria-label="Matro Indoor Sports Complex — home"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}
              >
                <div style={{ width: `${logoSize}px`, height: `${logoSize}px`, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)', backgroundColor: 'var(--bg-surface-elevated)', flexShrink: 0, transition: 'width var(--transition-normal), height var(--transition-normal)' }}>
                  <img src="/logo-image.jfif" alt="" aria-hidden="true" width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: scrolled ? '1.25rem' : '1.42rem', fontWeight: 'var(--fw-extrabold)', letterSpacing: 'var(--tracking-tighter)', color: 'var(--text-primary)', transition: 'font-size var(--transition-normal)' }}>
                    MATRO<span style={{ color: 'var(--brand-primary)' }}>.</span>
                  </span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 'var(--fw-bold)', letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '3px' }}>
                    INDOOR SPORTS HUBS
                  </span>
                </div>
              </Link>

              {/* Desktop nav */}
              <nav aria-label="Main navigation" className="matro-desktop-nav hidden lg:flex items-center gap-1">
                {desktopLinks.map((link) => {
                  const isActive = link.type === 'route'
                    ? isRoute(link.to)
                    : (location.pathname === '/' && activeSection === link.id);

                  if (link.type === 'route') {
                    return (
                      <Link
                        key={link.name}
                        to={link.to}
                        aria-current={isActive ? 'page' : undefined}
                        style={linkStyle(isActive)}
                        onMouseEnter={(e) => hoverOn(e, isActive)}
                        onMouseLeave={(e) => hoverOff(e, isActive)}
                      >
                        {link.icon && <link.icon size={13} aria-hidden="true" />}
                        {link.name}
                        {isActive && <ActivePip />}
                      </Link>
                    );
                  }

                  return (
                    <a
                      key={link.name}
                      href={`#${link.id}`}
                      onClick={(e) => { e.preventDefault(); scrollToSection(link.id); }}
                      aria-current={isActive ? 'page' : undefined}
                      style={linkStyle(isActive)}
                      onMouseEnter={(e) => hoverOn(e, isActive)}
                      onMouseLeave={(e) => hoverOff(e, isActive)}
                    >
                      {link.name}
                      {isActive && <ActivePip />}
                    </a>
                  );
                })}
              </nav>

              {/* Right actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                <ThemeToggle />

                {/* Desktop auth buttons */}
                <div className="matro-desktop-cta hidden lg:flex items-center gap-2">
                  {isLoggedIn ? (
                    <>
                      {/* User greeting + profile link */}
                      <Link
                        to="/dashboard"
                        style={{
                          display:         'flex',
                          alignItems:      'center',
                          gap:             '7px',
                          padding:         '0.4rem 0.9rem',
                          borderRadius:    'var(--radius-md)',
                          fontSize:        'var(--text-sm)',
                          fontWeight:      'var(--fw-semibold)',
                          color:           'var(--text-primary)',
                          textDecoration:  'none',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          border:          '1px solid var(--border-subtle)',
                          transition:      'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.color = 'var(--brand-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      >
                        <User size={14} aria-hidden="true" />
                        {user?.name ? user.name.split(' ')[0] : 'Account'}
                      </Link>

                      {/* Logout */}
                      <motion.button
                        type="button"
                        onClick={handleLogout}
                        whileHover={!reduced ? { scale: 1.03 } : {}}
                        whileTap={!reduced  ? { scale: 0.96 } : {}}
                        transition={{ type: 'spring', stiffness: 440, damping: 24 }}
                        aria-label="Log out"
                        style={{
                          display:         'flex',
                          alignItems:      'center',
                          gap:             '5px',
                          padding:         '0.4rem 0.9rem',
                          borderRadius:    'var(--radius-md)',
                          fontSize:        'var(--text-sm)',
                          fontWeight:      'var(--fw-semibold)',
                          color:           'var(--text-muted)',
                          backgroundColor: 'transparent',
                          border:          '1px solid var(--border-subtle)',
                          cursor:          'pointer',
                          transition:      'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-danger)'; e.currentTarget.style.borderColor = 'var(--brand-danger)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                      >
                        <LogOut size={13} aria-hidden="true" />
                        Logout
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        style={{
                          display:         'flex',
                          alignItems:      'center',
                          padding:         '0.42rem 1rem',
                          borderRadius:    'var(--radius-md)',
                          fontSize:        'var(--text-sm)',
                          fontWeight:      'var(--fw-semibold)',
                          color:           'var(--text-primary)',
                          textDecoration:  'none',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          border:          '1px solid var(--border-subtle)',
                          whiteSpace:      'nowrap',
                          transition:      'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.color = 'var(--brand-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      >
                        Log in
                      </Link>
                      <motion.div
                        whileHover={!reduced ? { scale: 1.03 } : {}}
                        whileTap={!reduced  ? { scale: 0.96 } : {}}
                        transition={{ type: 'spring', stiffness: 440, damping: 24 }}
                      >
                        <Button
                          variant="primary"
                          size="md"
                          as={Link}
                          to="/register"
                          style={{ borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}
                        >
                          Sign up free
                        </Button>
                      </motion.div>
                    </>
                  )}
                </div>

                {/* Mobile hamburger */}
                <motion.button
                  ref={mobileToggleRef}
                  type="button"
                  className="matro-mobile-toggle lg:hidden flex items-center justify-center"
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-nav-drawer"
                  whileTap={!reduced ? { scale: 0.9 } : {}}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-card)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-xs)', flexShrink: 0 }}
                >
                  <HamburgerIcon open={mobileOpen} reduced={reduced} />
                </motion.button>
              </div>
            </div>
          </Container>
        </div>

        {/* ── MOBILE DRAWER ─────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              ref={drawerRef}
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
              variants={drawerVariants}
              initial="closed"
              animate="open"
              exit="closed"
              style={{ overflow: 'hidden', backgroundColor: 'var(--bg-surface-card)', borderBottom: '1px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}
            >
              <Container>
                <div style={{ padding: '1.25rem 0 1.5rem' }}>
                  <ul role="list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
                    {mobileItems.map((item, i) => (
                      <MobileItem
                        key={item.label}
                        i={i}
                        label={item.label}
                        to={item.to}
                        href={item.id ? `#${item.id}` : undefined}
                        onClick={item.id ? () => scrollToSection(item.id) : undefined}
                        isActive={item.to ? isRoute(item.to) : (location.pathname === '/' && activeSection === item.id)}
                        icon={item.icon}
                        closeMenu={() => setMobileOpen(false)}
                      />
                    ))}
                  </ul>

                  {/* Mobile auth actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {isLoggedIn ? (
                      <>
                        <div
                          style={{
                            padding:         '0.75rem 1rem',
                            borderRadius:    'var(--radius-md)',
                            backgroundColor: 'var(--color-primary-soft)',
                            border:          '1px solid var(--brand-primary)',
                            display:         'flex',
                            alignItems:      'center',
                            gap:             '8px',
                            fontSize:        'var(--text-sm)',
                            fontWeight:      'var(--fw-semibold)',
                            color:           'var(--brand-primary)',
                          }}
                        >
                          <User size={15} aria-hidden="true" />
                          <span>{user?.name ?? 'My Account'}</span>
                          {isAdmin && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 'var(--fw-bold)', backgroundColor: 'var(--brand-primary)', color: '#fff', padding: '2px 7px', borderRadius: 'var(--radius-full)' }}>ADMIN</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setMobileOpen(false); handleLogout(); }}
                          style={{
                            display:         'flex',
                            alignItems:      'center',
                            justifyContent:  'center',
                            gap:             '7px',
                            padding:         '0.75rem',
                            borderRadius:    'var(--radius-md)',
                            fontSize:        'var(--text-sm)',
                            fontWeight:      'var(--fw-bold)',
                            color:           'var(--brand-danger)',
                            backgroundColor: 'var(--color-danger-soft)',
                            border:          '1px solid rgba(220,38,38,0.25)',
                            cursor:          'pointer',
                          }}
                        >
                          <LogOut size={15} aria-hidden="true" />
                          Log out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/register"
                          onClick={() => setMobileOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--gradient-cta)', color: '#fff', textDecoration: 'none', boxShadow: 'var(--shadow-brand)' }}
                        >
                          Sign up free <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                        <Link
                          to="/login"
                          onClick={() => setMobileOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)', textDecoration: 'none', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}
                        >
                          Log in
                        </Link>
                      </>
                    )}
                  </div>

                  {/* Fact strip */}
                  <motion.div
                    custom={mobileItems.length + 2}
                    variants={drawerItemVariants}
                    initial="closed"
                    animate="open"
                    style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}
                  >
                    <Zap size={13} aria-hidden="true" color="var(--brand-primary)" />
                    <span><strong style={{ color: 'var(--brand-primary)', fontWeight: 'var(--fw-bold)' }}>5 Arenas</strong> · Lahore &amp; Sialkot · Open daily 06 AM – 02 AM</span>
                  </motion.div>
                </div>
              </Container>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            aria-hidden="true"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={() => { setMobileOpen(false); mobileToggleRef.current?.focus(); }}
            style={{ position: 'fixed', inset: 0, zIndex: 999, backgroundColor: 'var(--color-overlay)', cursor: 'default' }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

/* ─── Hamburger icon ─────────────────────────────────────────────────── */
const HamburgerIcon = ({ open, reduced }) => {
  const bar = {
    display: 'block', width: '18px', height: '2px', borderRadius: '2px',
    backgroundColor: 'currentColor', transformOrigin: 'center',
    transition: reduced ? 'none' : 'transform 0.24s cubic-bezier(0.16,1,0.3,1), opacity 0.18s ease',
  };
  return (
    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '18px' }}>
      <span style={{ ...bar, transform: open ? 'translateY(7px) rotate(45deg)'  : 'none' }} />
      <span style={{ ...bar, opacity: open ? 0 : 1, transform: open ? 'scaleX(0)' : 'scaleX(1)' }} />
      <span style={{ ...bar, transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
    </span>
  );
};

export default Navbar;
