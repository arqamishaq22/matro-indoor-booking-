/**
 * UsersPage.jsx — /admin/users
 * List, search, filter, and activate/deactivate user accounts.
 * Self-deactivation is blocked on both frontend and backend.
 * No password hashes or tokens are ever exposed.
 * Stats cards show total, active, and admin user counts.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Eye, Users, ShieldCheck, Activity, UserX, RefreshCw } from 'lucide-react';
import { showToast } from '../../features/booking/bookingSlice';
import { selectAuthUser } from '../../features/auth/authSlice';
import {
  getAdminUsers, getAdminUserBookings, updateUserStatus,
} from '../../services/bookingService';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import {
  SectionHead, TableWrap, Th, Td, Pagination, ToggleBtn, ListSkeleton, DetailLine, StatCard,
} from '../../components/admin/tableHelpers';
import DetailDialog from '../../components/admin/DetailDialog';
import { fmtDate, pkr } from '../../components/admin/adminShared';

const UsersPage = () => {
  const dispatch = useDispatch();
  const currentAdmin = useSelector(selectAuthUser);
  const [data,    setData]    = useState({ users: [], total: 0, pages: 1, stats: null });
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [role,    setRole]    = useState('');
  const [status,  setStatus]  = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [toggling, setToggling] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setData(await getAdminUsers({
        page, search,
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      }));
    }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search, role, status]);

  useEffect(() => { load(); }, [load]);

  const doToggleUser = async (userId, currentActive) => {
    setToggling(userId);
    try {
      await updateUserStatus(userId, !currentActive);
      dispatch(showToast({ message: `User ${!currentActive ? 'activated' : 'deactivated'}`, type: 'success' }));
      await load();
    } catch (e) { dispatch(showToast({ message: e.message, type: 'error' })); }
    finally { setToggling(null); }
  };

  const toggleUser = (userId, current) => {
    const user = data.users.find((u) => u.id === userId);
    if (current && user) {
      setDeactivateConfirm(user);
      return;
    }
    doToggleUser(userId, false);
  };

  const executeDeactivate = async () => {
    if (!deactivateConfirm) return;
    const user = deactivateConfirm;
    setDeactivateConfirm(null);
    doToggleUser(user.id, true);
  };

  const showUserDetails = async (user) => {
    setUserDetails(user);
    setUserBookings([]);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      const result = await getAdminUserBookings(user.id);
      setUserBookings(result.bookings ?? []);
    } catch (detailError) {
      setDetailsError(detailError.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  /* Stats from the backend (piggyback on the users response) */
  const stats = data.stats;

  return (
    <div>
      <SectionHead
        title="Users"
        action={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh users list"
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

      {/* ─── Stat cards ──────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <StatCard icon={Users}       label="Total Users"   value={stats.totalAll}    color="var(--brand-primary)" />
          <StatCard icon={Activity}    label="Active Users"  value={stats.totalActive} color="#22c55e" />
          <StatCard icon={ShieldCheck} label="Admins"        value={stats.totalAdmins} color="#8b5cf6" />
          <StatCard icon={UserX}       label="Inactive"      value={stats.totalAll - stats.totalActive} color="var(--brand-danger)" />
        </div>
      )}

      {/* Search & filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={14} color="var(--text-faint)" aria-hidden="true" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="search" placeholder="Search name, phone, or email…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search users"
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
          aria-label="Filter by role"
          style={{ flex: '1 1 160px', width: 'auto', minWidth: '130px', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
        >
          <option value="">All Roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select
          value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by account status"
          style={{ flex: '1 1 160px', width: 'auto', minWidth: '130px', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? <ListSkeleton rows={6} />
       : error   ? <ErrorState message={error} onRetry={load} compact />
       : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>User ID</Th>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th align="right">Bookings</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>No users found</td></tr>
              ) : data.users.map((u) => {
                const isSelf = u.id === currentAdmin?.id;
                return (
                  <tr key={u.id} style={{ backgroundColor: 'var(--bg-surface-card)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-card)'; }}
                  >
                    <Td><span style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>#{u.id}</span></Td>
                    <Td><span style={{ fontWeight: 'var(--fw-semibold)' }}>{u.name ?? '—'}</span></Td>
                    <Td><span style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}>{u.phone}</span></Td>
                    <Td><span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{u.email ?? '—'}</span></Td>
                    <Td>
                      <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 'var(--fw-bold)', backgroundColor: u.role === 'ADMIN' ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)', color: u.role === 'ADMIN' ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                        {u.role}
                      </span>
                    </Td>
                    <Td align="right">{u._count?.bookings ?? 0}</Td>
                    <Td><span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</span></Td>
                    <Td><StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" /></Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button type="button" onClick={() => showUserDetails(u)} aria-label={`View ${u.name ?? u.phone} details`}
                          style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <Eye size={15} aria-hidden="true" />
                        </button>
                        {isSelf
                          ? <span title="Cannot deactivate your own account" style={{ color: 'var(--text-faint)', fontSize: 'var(--text-xs)', padding: '0.2rem 0.4rem' }}>You</span>
                          : <ToggleBtn active={u.isActive} loading={toggling === u.id} onToggle={() => toggleUser(u.id, u.isActive)} />
                        }
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          {data.pages > 1 && <Pagination page={page} pages={data.pages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />}
        </>
      )}
      {userDetails && (
        <DetailDialog title="User information & booking history" onClose={() => setUserDetails(null)}>
          <DetailLine label="User ID" value={`#${userDetails.id}`} />
          <DetailLine label="Name" value={userDetails.name} />
          <DetailLine label="Phone" value={userDetails.phone} />
          <DetailLine label="Email" value={userDetails.email} />
          <DetailLine label="Role" value={userDetails.role} />
          <DetailLine label="Status" value={userDetails.isActive ? 'Active' : 'Deactivated'} />
          <DetailLine label="Joined" value={new Date(userDetails.createdAt).toLocaleString()} />
          <h3 style={{ margin: '1rem 0 0.5rem', fontSize: 'var(--text-base)' }}>Booking history</h3>
          {detailsLoading ? <ListSkeleton rows={3} />
            : detailsError ? <p role="alert" style={{ color: 'var(--brand-danger)' }}>{detailsError}</p>
            : userBookings.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No bookings found for this user.</p>
            : userBookings.map((booking) => (
              <div key={booking.bookingId} style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
                  <strong>{booking.venueName} · {booking.courtName}</strong>
                  <StatusBadge status={booking.status} size="sm" />
                </div>
                <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {fmtDate(booking.date)} · {booking.startTime}–{booking.endTime} · {pkr(booking.totalAmount)}
                </div>
              </div>
            ))}
        </DetailDialog>
      )}
      {deactivateConfirm && (
        <DetailDialog title="Deactivate User Account" onClose={() => setDeactivateConfirm(null)}>
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Deactivate <strong>{deactivateConfirm.name ?? deactivateConfirm.phone}</strong>? They will not be able to log in until reactivated.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => setDeactivateConfirm(null)}
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="button" onClick={executeDeactivate}
              style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--brand-danger)', color: '#fff', fontWeight: 'var(--fw-semibold)', cursor: 'pointer' }}>
              Deactivate
            </button>
          </div>
        </DetailDialog>
      )}
    </div>
  );
};

export default UsersPage;
