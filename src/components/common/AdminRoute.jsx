/**
 * AdminRoute — requires authenticated ADMIN role.
 * Non-admin authenticated users see a 403 screen, not a redirect.
 * Unauthenticated users are sent to /login.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  selectIsLoggedIn,
  selectIsAdmin,
  selectAuthLoading,
} from '../../features/auth/authSlice';
import LoadingSpinner from './LoadingSpinner';
import { ShieldOff } from 'lucide-react';

const AdminRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isAdmin    = useSelector(selectIsAdmin);
  const loading    = useSelector(selectAuthLoading);
  const location   = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <LoadingSpinner size={40} label="Loading…" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    /*
     * BUG FIX: Previously rendered <Navigate to="/" replace /> *inside* the
     * JSX alongside the Access Denied UI. Because <Navigate> executes during
     * render, the redirect fired immediately and the Access Denied screen was
     * never visible. Fix: render the screen OR redirect — not both.
     * We show the denial screen so the user understands why they were blocked.
     */
    return (
      <div
        style={{
          minHeight:       '100dvh',
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          gap:             '1rem',
          backgroundColor: 'var(--bg-main)',
          padding:         '2rem',
          textAlign:       'center',
        }}
      >
        <div
          style={{
            width:           '72px',
            height:          '72px',
            borderRadius:    '50%',
            backgroundColor: 'var(--color-danger-soft)',
            border:          '1px solid var(--brand-danger)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <ShieldOff size={32} color="var(--brand-danger)" aria-hidden="true" />
        </div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-primary)', margin: 0 }}>
          Access Denied
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '38ch', margin: 0 }}>
          This area is restricted to admin users. If you believe this is an error, please contact support.
        </p>
        <a
          href="/"
          style={{
            marginTop:       '0.5rem',
            padding:         '0.55rem 1.25rem',
            borderRadius:    'var(--radius-md)',
            fontSize:        'var(--text-sm)',
            fontWeight:      'var(--fw-semibold)',
            background:      'var(--gradient-cta)',
            color:           '#fff',
            textDecoration:  'none',
            boxShadow:       'var(--shadow-brand)',
          }}
        >
          Go to Home
        </a>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
