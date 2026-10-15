/**
 * bookingService.js
 * ─────────────────────────────────────────────────────────────────────────
 * HTTP layer for all booking-related API calls.
 *
 * All venue, court, pricing, availability, and booking data comes from the API.
 *
 * Set in .env.local:
 *   VITE_API_BASE_URL=http://localhost:3001
 * ─────────────────────────────────────────────────────────────────────────
 */

import { store } from '../app/store.js';
import { forceLogout } from '../features/auth/authSlice.js';
import { apiRequest } from './apiClient.js';

const apiFetch = (path, options = {}) => apiRequest(path, {
  ...options,
  onUnauthorized: () => {
    store.dispatch(forceLogout('Your session has expired. Please log in again.'));
  },
});

/* ═══════════════════════════════════════════════════════════════════════
   getAvailability
   GET /api/v1/availability
════════════════════════════════════════════════════════════════════════ */
export async function getAvailability({ venueId, sportId, date }) {
  const params = new URLSearchParams({ venue_id: venueId, date });
  if (sportId) params.set('sport_type', sportId);
  const data = await apiFetch(`/api/v1/availability?${params}`);
  if (!data || !Array.isArray(data.courts) || !Array.isArray(data.timeSlots)) {
    throw new Error('Invalid availability response from the server');
  }
  return {
    ...data,
    _isLiveData: true,
    _isDemoData: false,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   createBooking
   POST /api/v1/bookings  (requires auth — token read from sessionStorage)
   The server computes and persists the authoritative price.
════════════════════════════════════════════════════════════════════════ */
export async function createBooking(bookingDetails) {
  const result = await apiFetch('/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify({
      courtId: bookingDetails.courtId,
      date: bookingDetails.date,
      startTime: typeof bookingDetails.timeSlot === 'object'
        ? bookingDetails.timeSlot.time
        : bookingDetails.timeSlot,
      durationHours: bookingDetails.durationHours,
      playerName: bookingDetails.playerName,
      phone: bookingDetails.phone,
      notes: bookingDetails.notes ?? '',
    }),
  });
  if (
    !result ||
    typeof (result.bookingId ?? result.id) !== 'string' ||
    !(result.bookingId ?? result.id) ||
    result.totalAmount === null ||
    result.totalAmount === undefined ||
    !Number.isFinite(Number(result.totalAmount))
  ) {
    throw new Error('Invalid booking confirmation from the server');
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════
   getMyBookings
   GET /api/v1/bookings/my
   Returns bookings for the authenticated user.
   Supports filter: 'upcoming' | 'past' | 'cancelled'
════════════════════════════════════════════════════════════════════════ */
export async function getMyBookings(filter) {
  const params = new URLSearchParams();
  if (filter) params.set('filter', filter);
  const bookings = await apiFetch(`/api/v1/bookings/my${params.toString() ? `?${params}` : ''}`);
  if (!Array.isArray(bookings)) throw new Error('Invalid bookings response from the server');
  return bookings;
}

/* ═══════════════════════════════════════════════════════════════════════
   cancelBooking
   PATCH /api/v1/bookings/:id/cancel
════════════════════════════════════════════════════════════════════════ */
export async function cancelBooking(bookingId) {
  const result = await apiFetch(`/api/v1/bookings/${bookingId}/cancel`, { method: 'PATCH' });
  if (result?.bookingId !== bookingId || result.status !== 'CANCELLED') {
    throw new Error('Invalid cancellation confirmation from the server');
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════
   getBookingById
   GET /api/v1/bookings/:id
════════════════════════════════════════════════════════════════════════ */
export async function getBookingById(bookingId) {
  return apiFetch(`/api/v1/bookings/${bookingId}`);
}

/* ═══════════════════════════════════════════════════════════════════════
   getVenues / getVenueById
════════════════════════════════════════════════════════════════════════ */
export async function getVenues(params = {}) {
  const qs = new URLSearchParams();
  if (params.city)  qs.set('city', params.city);
  if (params.sport) qs.set('sport', params.sport);
  const venues = await apiFetch(`/api/v1/venues${qs.toString() ? `?${qs}` : ''}`);
  if (!Array.isArray(venues)) throw new Error('Invalid venues response from the server');
  return venues;
}

export async function getVenueById(venueId) {
  const venue = await apiFetch(`/api/v1/venues/${encodeURIComponent(venueId)}`);
  if (!venue || typeof venue !== 'object' || !Array.isArray(venue.courts)) {
    throw new Error('Invalid venue response from the server');
  }
  return venue;
}

export async function getVenuePricing(venueId) {
  const pricing = await apiFetch(`/api/v1/venues/${encodeURIComponent(venueId)}/pricing`);
  if (!pricing || !Array.isArray(pricing.rules)) {
    throw new Error('Invalid venue pricing response from the server');
  }
  return pricing;
}

export async function getCourts(venueId, sport) {
  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  const courts = await apiFetch(`/api/v1/venues/${encodeURIComponent(venueId)}/courts${params.size ? `?${params}` : ''}`);
  if (!Array.isArray(courts)) throw new Error('Invalid courts response from the server');
  return courts;
}

export async function getSports() {
  const sports = await apiFetch('/api/v1/sports');
  if (!Array.isArray(sports)) throw new Error('Invalid sports response from the server');
  return sports;
}

/* ═══════════════════════════════════════════════════════════════════════
   Admin API helpers
════════════════════════════════════════════════════════════════════════ */
export async function getAdminStats() {
  return apiFetch('/api/v1/admin/stats');
}

export async function getAdminBookings(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, v); });
  return apiFetch(`/api/v1/admin/bookings${qs.toString() ? `?${qs}` : ''}`);
}

export async function updateBookingStatus(bookingId, { status, paymentStatus, notes }) {
  return apiFetch(`/api/v1/admin/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({
      status,
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(notes !== undefined ? { notes } : {}),
    }),
  });
}

export async function updateBookingPayment(bookingId, { paymentStatus, paymentMethod, notes }) {
  return apiFetch(`/api/v1/admin/bookings/${bookingId}/payment`, {
    method: 'PATCH',
    body:   JSON.stringify({
      paymentStatus,
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(notes !== undefined ? { notes } : {}),
    }),
  });
}

export async function getAdminUsers(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, v); });
  return apiFetch(`/api/v1/admin/users${qs.toString() ? `?${qs}` : ''}`);
}

export async function getAdminUserBookings(userId) {
  return apiFetch(`/api/v1/admin/users/${userId}/bookings`);
}

export async function updateUserStatus(userId, isActive) {
  return apiFetch(`/api/v1/admin/users/${userId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ isActive }),
  });
}

export async function getAdminVenues() {
  return apiFetch('/api/v1/admin/venues');
}

export async function updateVenueStatus(venueId, isActive) {
  return apiFetch(`/api/v1/admin/venues/${venueId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ isActive }),
  });
}

export async function updateCourtStatus(courtId, isActive) {
  return apiFetch(`/api/v1/admin/courts/${courtId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ isActive }),
  });
}

export async function updateCourtPricing(courtId, pricing) {
  return apiFetch(`/api/v1/admin/courts/${courtId}/pricing`, {
    method: 'PATCH',
    body:   JSON.stringify(pricing),
  });
}

export async function createAdminCourt(venueId, courtData) {
  return apiFetch(`/api/v1/admin/venues/${encodeURIComponent(venueId)}/courts`, {
    method: 'POST',
    body:   JSON.stringify(courtData),
  });
}

export async function updateAdminCourt(courtId, courtData) {
  return apiFetch(`/api/v1/admin/courts/${encodeURIComponent(courtId)}`, {
    method: 'PATCH',
    body:   JSON.stringify(courtData),
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   Admin Pricing Rule CRUD (per-rule)
   All endpoints require ADMIN role.
════════════════════════════════════════════════════════════════════════ */

export async function getAdminPricing(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, v); });
  const rules = await apiFetch(`/api/v1/admin/pricing${qs.toString() ? `?${qs}` : ''}`);
  if (!Array.isArray(rules)) throw new Error('Invalid pricing rules response from the server');
  return rules;
}

export async function getAdminPricingRuleById(id) {
  return apiFetch(`/api/v1/admin/pricing/${encodeURIComponent(id)}`);
}

export async function createAdminPricingRule(data) {
  return apiFetch('/api/v1/admin/pricing', {
    method: 'POST',
    body:   JSON.stringify(data),
  });
}

export async function updateAdminPricingRule(id, data) {
  return apiFetch(`/api/v1/admin/pricing/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body:   JSON.stringify(data),
  });
}

export async function updateAdminPricingRuleStatus(id, isActive) {
  return apiFetch(`/api/v1/admin/pricing/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ isActive }),
  });
}

export async function deleteAdminPricingRule(id) {
  return apiFetch(`/api/v1/admin/pricing/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function getAdminVenueById(venueId) {
  return apiFetch(`/api/v1/admin/venues/${encodeURIComponent(venueId)}`);
}

export async function createAdminVenue(venueData) {
  return apiFetch('/api/v1/admin/venues', {
    method: 'POST',
    body:   JSON.stringify(venueData),
  });
}

export async function updateAdminVenue(venueId, venueData) {
  return apiFetch(`/api/v1/admin/venues/${encodeURIComponent(venueId)}`, {
    method: 'PATCH',
    body:   JSON.stringify(venueData),
  });
}

export async function deleteAdminVenue(venueId) {
  return apiFetch(`/api/v1/admin/venues/${encodeURIComponent(venueId)}`, {
    method: 'DELETE',
  });
}

/* Legacy alias */
export const checkAvailability = getAvailability;
