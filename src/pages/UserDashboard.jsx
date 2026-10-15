/**
 * UserDashboard.jsx  —  /dashboard
 *
 * Protected route. Shows the authenticated user's bookings with tabs for
 * Upcoming / Completed·Past / Cancelled, stats summary, and cancel flow.
 *
 * Data contract:
 *  • GET /api/v1/bookings/my?filter=upcoming|past|cancelled
 *    userId is derived server-side from the verified JWT (req.user.id).
 *    The client NEVER sends a userId — there is no way to read another
 *    user's bookings through this endpoint.
 *  • PATCH /api/v1/bookings/:id/cancel
 *    Ownership is re-verified server-side before the update is applied.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, useReducedMotion } from 'motion/react';
import {
  User, Phone, CalendarDays, BookOpen,
  CheckCircle2, XCircle, ArrowLeft, LogOut, Calendar,
  TrendingUp,
} from 'lucide-react';
import { logout, selectAuthUser } from '../features/auth/authSlice';
import { showToast, triggerAvailabilityRefresh } from '../features/booking/bookingSlice';
import { getMyBookings, cancelBooking } from '../services/bookingService';

import Navbar     from '../components/layout/Navbar';
import Footer     from '../components/layout/Footer';
import Container  from '../components/common/Container';
import BookingCard from '../components/common/BookingCard';
import ErrorState  from '../components/common/ErrorState';
import EmptyState  from '../components/common/EmptyState';
import { SkeletonBookingCard, ShimmerKeyframes } from '../components/common/Skeleton';

/* ─── Tab config ─────────────────────────────────────────────────────── */
const TABS = [
  { id: 'upcoming',  label: 'Upcoming',         icon: Calendar    },
  { id: 'past',      label: 'Completed / Past',  icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancelled',         icon: XCircle     },
];

/* ─── Stat card ──────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color = 'var(--brand-primary)' }) => (
  <div
    style={{
      padding:         'clamp(1rem, 2.5vw, 1.25rem)',
      borderRadius:    'var(--radius-xl)',
      backgroundColor: 'var(--bg-surface-card)',
      border:          '1px solid var(--border-card)',
      boxShadow:       'var(--shadow-sm)',
      display:         'flex',
      alignItems:      'center',
      gap:             '0.85rem',
    }}
  >
    <div
      style={{
        width:           '44px',
        height:          '44px',
        borderRadius:    'var(--radius-md)',
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        border:          `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
      }}
    >
      <Icon size={20} color={color} aria-hidden="true" />
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize:   'var(--text-2xl)',
          fontWeight: 'var(--fw-extrabold)',
          color:      'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize:   'var(--text-xs)',
          color:      'var(--text-muted)',
          marginTop:  '3px',
          fontWeight: 'var(--fw-medium)',
          whiteSpace: 'nowrap',
          overflow:   'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   USER DASHBOARD
════════════════════════════════════════════════════════════════════════ */
const UserDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduced  = useReducedMotion();
  const user     = useSelector(selectAuthUser);

  /* ── Tab / list state ─────────────────────────────────────────────── */
  const [activeTab,  setActiveTab]  = useState('upcoming');
  const [allBookings, setAllBookings] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  /* Set of bookingIds currently being cancelled — shows spinner per card */
  const [cancellingIds, setCancellingIds] = useState(new Set());
  const cancellingIdsRef = useRef(new Set());

  /* ── Load the authenticated user's bookings ──────────────────────── */
  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyBookings();
      setAllBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message ?? 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  /* ── Cancel a booking ─────────────────────────────────────────────── */
  const handleCancel = useCallback(async (bookingId) => {
    if (cancellingIdsRef.current.has(bookingId)) return;
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return;

    cancellingIdsRef.current.add(bookingId);
    setCancellingIds(new Set(cancellingIdsRef.current));
    try {
      await cancelBooking(bookingId);
      dispatch(showToast({ message: 'Booking cancelled successfully.', type: 'success' }));
      dispatch(triggerAvailabilityRefresh());
      await loadBookings();
    } catch (err) {
      dispatch(showToast({ message: err.message ?? 'Failed to cancel booking.', type: 'error' }));
    } finally {
      cancellingIdsRef.current.delete(bookingId);
      setCancellingIds(new Set(cancellingIdsRef.current));
    }
  }, [dispatch, loadBookings]);

  /* ── Logout ───────────────────────────────────────────────────────── */
  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  /* ── Derived stats ────────────────────────────────────────────────── */
  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    total:     allBookings.length,
    upcoming:  allBookings.filter(
      (b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.date >= today,
    ).length,
    completed: allBookings.filter(
      (b) => b.status === 'COMPLETED' || b.status === 'NO_SHOW' ||
             ((b.status === 'CONFIRMED' || b.status === 'PENDING') && b.date < today),
    ).length,
    cancelled: allBookings.filter((b) => b.status === 'CANCELLED').length,
  };
  const bookings = allBookings.filter((booking) => {
    if (activeTab === 'cancelled') return booking.status === 'CANCELLED';
    if (activeTab === 'past') {
      return booking.status === 'COMPLETED' || booking.status === 'NO_SHOW' ||
        ((booking.status === 'CONFIRMED' || booking.status === 'PENDING') && booking.date < today);
    }
    return (booking.status === 'CONFIRMED' || booking.status === 'PENDING') &&
      booking.date >= today;
  });

  /* ── Member since format ──────────────────────────────────────────── */
  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  /* ── Empty state messages per tab ─────────────────────────────────── */
  const EMPTY = {
    upcoming:  {
      title:   'No bookings found.',
      message: 'Head to the venues page to book a court.',
      action: (
        <Link
          to="/venues"
          style={{
            display:         'inline-flex',
            alignItems:      'center',
            gap:             '6px',
            padding:         '0.65rem 1.5rem',
            borderRadius:    'var(--radius-md)',
            fontSize:        'var(--text-sm)',
            fontWeight:      'var(--fw-bold)',
            background:      'var(--gradient-cta)',
            color:           '#fff',
            textDecoration:  'none',
            boxShadow:       'var(--shadow-brand)',
          }}
        >
          Browse Venues
        </Link>
      ),
    },
    past:      { title: 'No bookings found.', message: 'Your completed or past bookings will appear here.' },
    cancelled: { title: 'No bookings found.', message: 'Your cancelled bookings will appear here.' },
  };

  return (
    <>
      <Navbar />

      {/* Inject shimmer animation + cancel spinner keyframes */}
      <ShimmerKeyframes />
      <style>{`
        @keyframes matro-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <main
        id="main-content"
        style={{
          backgroundColor: 'var(--bg-main)',
          minHeight:        'calc(100dvh - var(--nav-height))',
        }}
      >
        {/* ── Page header ─────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-card)',
            borderBottom:    '1px solid var(--border-subtle)',
            padding:         'clamp(1.5rem, 4vw, 2.5rem) 0',
          }}
        >
          <Container>
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 12 }}
              animate={reduced ? {} : { opacity: 1, y: 0  }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Back link */}
              <Link
                to="/"
                style={{
                  display:        'inline-flex',
                  alignItems:     'center',
                  gap:            '5px',
                  fontSize:       'var(--text-sm)',
                  color:          'var(--text-muted)',
                  textDecoration: 'none',
                  marginBottom:   '1rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to Home
              </Link>

              {/* User info + actions row */}
              <div
                style={{
                  display:        'flex',
                  alignItems:     'flex-start',
                  justifyContent: 'space-between',
                  gap:            '1rem',
                  flexWrap:       'wrap',
                }}
              >
                {/* Avatar + identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    aria-hidden="true"
                    style={{
                      width:          '56px',
                      height:         '56px',
                      borderRadius:   '50%',
                      background:     'var(--gradient-cta)',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      flexShrink:     0,
                      boxShadow:      'var(--shadow-brand)',
                    }}
                  >
                    <User size={26} color="#fff" aria-hidden="true" />
                  </div>

                  <div>
                    <h1
                      style={{
                        margin:     0,
                        fontSize:   'var(--text-2xl)',
                        fontWeight: 'var(--fw-extrabold)',
                        color:      'var(--text-primary)',
                        wordBreak:  'break-word',
                      }}
                    >
                      {user?.name ?? 'My Account'}
                    </h1>

                    <div
                      style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '5px',
                        marginTop:  '4px',
                        fontSize:   'var(--text-xs)',
                        color:      'var(--text-muted)',
                        flexWrap:   'wrap',
                      }}
                    >
                      <Phone size={12} aria-hidden="true" />
                      <span>{user?.phone ?? '—'}</span>
                      {user?.role === 'ADMIN' && (
                        <span
                          style={{
                            padding:         '2px 8px',
                            borderRadius:    'var(--radius-full)',
                            backgroundColor: 'var(--brand-primary)',
                            color:           '#fff',
                            fontSize:        '0.65rem',
                            fontWeight:      'var(--fw-bold)',
                          }}
                        >
                          ADMIN
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '3px' }}>
                      Member since {fmtDate(user?.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      style={{
                        display:        'inline-flex',
                        alignItems:     'center',
                        gap:            '6px',
                        padding:        '0.55rem 1.1rem',
                        borderRadius:   'var(--radius-md)',
                        fontSize:       'var(--text-sm)',
                        fontWeight:     'var(--fw-bold)',
                        background:     'var(--gradient-cta)',
                        color:          '#fff',
                        textDecoration: 'none',
                        boxShadow:      'var(--shadow-brand)',
                      }}
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      display:         'inline-flex',
                      alignItems:      'center',
                      gap:             '6px',
                      padding:         '0.55rem 1.1rem',
                      borderRadius:    'var(--radius-md)',
                      fontSize:        'var(--text-sm)',
                      fontWeight:      'var(--fw-semibold)',
                      color:           'var(--brand-danger)',
                      backgroundColor: 'var(--color-danger-soft)',
                      border:          '1px solid rgba(220,38,38,0.2)',
                      cursor:          'pointer',
                    }}
                  >
                    <LogOut size={14} aria-hidden="true" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </Container>
        </div>

        {/* ── Main content ─────────────────────────────────────────── */}
        <Container
          style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem) 0 clamp(2rem, 6vw, 4rem)' }}
        >
          {/* Stats row */}
          <div
            style={{
              display:               'grid',
              gridTemplateColumns:   'repeat(auto-fill, minmax(min(100%, 170px), 1fr))',
              gap:                   '0.85rem',
              marginBottom:          '2rem',
            }}
          >
            <StatCard
              icon={BookOpen}
              label="Total Bookings"
              value={loading ? '—' : stats.total}
              color="var(--brand-primary)"
            />
            <StatCard
              icon={CalendarDays}
              label="Upcoming"
              value={loading ? '—' : stats.upcoming}
              color="#8b5cf6"
            />
            <StatCard
              icon={TrendingUp}
              label="Completed / Past"
              value={loading ? '—' : stats.completed}
              color="#22c55e"
            />
            <StatCard
              icon={XCircle}
              label="Cancelled"
              value={loading ? '—' : stats.cancelled}
              color="var(--brand-danger)"
            />
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Booking filter"
            style={{
              display:       'flex',
              gap:           '0.5rem',
              marginBottom:  '1.5rem',
              flexWrap:      'wrap',
            }}
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={active}
                  aria-controls={`tabpanel-${id}`}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    gap:             '6px',
                    padding:         '0.5rem 1.1rem',
                    borderRadius:    'var(--radius-full)',
                    fontSize:        'var(--text-sm)',
                    fontWeight:      active ? 'var(--fw-bold)' : 'var(--fw-semibold)',
                    border:          active
                      ? '1.5px solid var(--brand-primary)'
                      : '1.5px solid var(--border-subtle)',
                    backgroundColor: active ? 'var(--brand-primary)' : 'var(--bg-surface-card)',
                    color:           active ? '#fff' : 'var(--text-secondary)',
                    cursor:          'pointer',
                    boxShadow:       active ? 'var(--shadow-brand)' : 'none',
                    transition:      'all var(--transition-fast)',
                  }}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Bookings panel */}
          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {loading ? (
              /* ── Loading skeletons — shaped like BookingCards ──── */
              <div
                style={{
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
                  gap:                 '1rem',
                }}
              >
                {[1, 2, 3].map((i) => <SkeletonBookingCard key={i} />)}
              </div>

            ) : error ? (
              /* ── API error state ─────────────────────────────── */
              <ErrorState
                title="Couldn't load bookings"
                message={error}
                onRetry={loadBookings}
              />

            ) : bookings.length === 0 ? (
              /* ── Empty state ─────────────────────────────────── */
              <EmptyState
                icon={BookOpen}
                title={EMPTY[activeTab]?.title   ?? 'No bookings found.'}
                message={EMPTY[activeTab]?.message ?? ''}
                action={EMPTY[activeTab]?.action}
              />

            ) : (
              /* ── Booking cards grid ──────────────────────────── */
              <div
                style={{
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
                  gap:                 '1rem',
                }}
              >
                {bookings.map((booking) => {
                  const isCancelling = cancellingIds.has(booking.bookingId);
                  return (
                    <BookingCard
                      key={booking.bookingId}
                      booking={booking}
                      /*
                       * Pass onCancel only for the Upcoming tab.
                       * While a cancel is in flight for this card, pass
                       * undefined so the button becomes inert — the card
                       * itself renders the spinner via cancellingBookingId.
                       */
                      onCancel={
                        activeTab === 'upcoming' && !isCancelling
                          ? handleCancel
                          : undefined
                      }
                      showCancel={activeTab === 'upcoming'}
                      cancellingBookingId={isCancelling ? booking.bookingId : null}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
};

export default UserDashboard;
