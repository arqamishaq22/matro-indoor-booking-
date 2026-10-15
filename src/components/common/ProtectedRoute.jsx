/**
 * ProtectedRoute — redirects unauthenticated users to /login,
 * preserving the intended destination in location state.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn, selectAuthLoading } from '../../features/auth/authSlice';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const loading    = useSelector(selectAuthLoading);
  const location   = useLocation();

  /* Still restoring session from token — show spinner, not redirect */
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

  return children;
};

export default ProtectedRoute;
