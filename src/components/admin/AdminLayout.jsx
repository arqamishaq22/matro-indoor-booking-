/**
 * AdminLayout.jsx — shared shell for all admin pages.
 * Provides the admin header, sidebar (route-aware via NavLink), and an
 * <Outlet/> for the active page. Mobile sidebar toggles open/close.
 */
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { motion, useReducedMotion } from 'motion/react';
import {
  LayoutDashboard, BookOpen, Users, Building2, DollarSign,
  LogOut,
} from 'lucide-react';

import { ShimmerKeyframes } from '../common/Skeleton';
import ThemeToggle from '../common/ThemeToggle';

const NAV_TABS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard, path: '/admin' },
  { id: 'bookings',  label: 'Bookings',  icon: BookOpen,        path: '/admin/bookings' },
  { id: 'venues',    label: 'Venues',    icon: Building2,       path: '/admin/venues' },
  { id: 'pricing',   label: 'Pricing',   icon: DollarSign,      path: '/admin/pricing' },
  { id: 'users',     label: 'Users',     icon: Users,           path: '/admin/users' },
];

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const reduced = useReducedMotion();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/admin/login');
  };

  return (
    <main
      id="main-content"
      style={{
        backgroundColor: 'var(--bg-main)',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ShimmerKeyframes />

      {/* Admin Dashboard Header */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface-card)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.75rem 1.25rem',
          height: '60px',
          boxSizing: 'border-box',
          flexShrink: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-cta)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-brand)',
              flexShrink: 0,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <LayoutDashboard size={18} color="#fff" aria-hidden="true" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-primary)' }}>Admin Dashboard</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <ThemeToggle style={{ width: '38px', height: '38px' }} />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            style={{
              background: 'none',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--fw-bold)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--brand-danger)';
              e.currentTarget.style.borderColor = 'var(--brand-danger)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <LogOut size={15} aria-hidden="true" /> Logout
          </button>
        </div>
      </header>

      {/* Dashboard Body with full-height sidebar and scrollable main content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Full-Height Continuous Sidebar */}
        <aside
          className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: '240px',
            flexShrink: 0,
            backgroundColor: 'var(--bg-surface-card)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            height: '100%',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <nav aria-label="Admin sections" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {NAV_TABS.map(({ id, label, icon: Icon, path }) => (
              <NavLink
                key={id}
                to={path}
                end={path === '/admin'}
                onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--color-primary-soft)' : 'transparent',
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 'var(--fw-bold)' : 'var(--fw-medium)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  textDecoration: 'none',
                  fontSize: 'var(--text-sm)',
                  transition: 'all var(--transition-fast)',
                })}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Panel content: independently scrolls when table has many rows */}
        <section
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 'clamp(1rem, 2.5vw, 1.75rem)',
            boxSizing: 'border-box',
          }}
        >
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 10 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default AdminLayout;
