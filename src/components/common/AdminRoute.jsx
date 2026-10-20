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
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
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
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '42ch', margin: 0, lineHeight: 1.5 }}>
          This area is restricted to administrators. You are currently logged in with a customer account.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="/admin/login"
            style={{
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
            Sign In as Admin
          </a>
          <a
            href="/"
            style={{
              padding:         '0.55rem 1.25rem',
              borderRadius:    'var(--radius-md)',
              fontSize:        'var(--text-sm)',
              fontWeight:      'var(--fw-semibold)',
              background:      'var(--bg-surface-elevated)',
              color:           'var(--text-primary)',
              border:          '1px solid var(--border-subtle)',
              textDecoration:  'none',
            }}
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
