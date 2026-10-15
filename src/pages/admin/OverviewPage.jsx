/**
 * OverviewPage.jsx — /admin
 * Dashboard statistics overview (total bookings, today, upcoming, cancelled,
 * total users, active venues, estimated revenue).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Calendar, Activity, XCircle, Users, MapPin, DollarSign, RefreshCw } from 'lucide-react';
import { getAdminStats } from '../../services/bookingService';
import ErrorState from '../../components/common/ErrorState';
import Skeleton from '../../components/common/Skeleton';
import { SectionHead, StatCard } from '../../components/admin/tableHelpers';
import { pkr } from '../../components/admin/adminShared';

const OverviewPage = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setStats(await getAdminStats()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHead
        title="Dashboard Overview"
        action={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh dashboard statistics"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--fw-medium)',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {loading ? (
        <div aria-label="Loading dashboard statistics" aria-busy="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} height="132px" radius="var(--radius-xl)" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard icon={BookOpen}     label="Total Bookings"    value={stats.totalBookings}    color="var(--brand-primary)" />
          <StatCard icon={Calendar}     label="Today's Bookings"  value={stats.todayBookings}    color="#8b5cf6" />
          <StatCard icon={Activity}     label="Upcoming"          value={stats.upcomingBookings} color="#22c55e" />
          <StatCard icon={XCircle}      label="Cancelled"         value={stats.cancelledBookings} color="var(--brand-danger)" />
          <StatCard icon={Users}        label="Total Users"       value={stats.totalUsers}       color="#f59e0b" />
          <StatCard icon={MapPin}       label="Active Venues"     value={stats.activeVenues}     color="#06b6d4" />
          <StatCard icon={DollarSign}   label="Est. Revenue"      value={pkr(stats.estimatedRevenue)} color="#22c55e" />
        </div>
      )}
    </div>
  );
};

export default OverviewPage;
