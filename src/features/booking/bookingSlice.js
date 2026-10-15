/**
 * bookingSlice.js
 * ─────────────────────────────────────────────────────────────────────────
 * Redux slice for the booking UI flow.
 *
 * Responsibility:
 *   • User selections: sport, venue, date, court, time slot, duration
 *   • UI state: panel open/closed, modal step, active filters
 *   • Toast notifications
 *   • Last confirmed booking reference returned by the API
 *
 * NOT responsible for:
 *   • Availability data       → fetched from the API by AvailabilityPreview
 *   • Booking creation        → handled by src/services/bookingService.js
 * ─────────────────────────────────────────────────────────────────────────
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  /* ── User selections ─────────────────────────────── */
  selectedSport: '',
  selectedVenue: '',
  selectedDate: '',
  selectedCourt: '',
  selectedTimeSlot: null,
  durationHours: 1,

  /* ── Booking panel / modal UI state ─────────────── */
  isBookingPanelOpen: false,
  isBookingModalOpen: false,
  modalStep: 1,

  /* ── Filters ─────────────────────────────────────── */
  activeSportFilter: 'all',

  /* ── Last confirmed booking returned by the API ─────── */
  lastConfirmedBooking: null,

  /* ── Confirmed booking from API (set after successful POST /bookings) ─ */
  confirmedBooking: null,

  /* ── Submission guard — true while a booking POST is in-flight ─ */
  // Prevents double-click duplicate submissions.
  isSubmittingBooking: false,

  /* ── Availability refresh token ─────────────────────────────── */
  // Incremented after every successful booking so AvailabilityPreview
  // re-fetches live slot data from the backend.
  availabilityRefreshToken: 0,

  /* ── Toast notification ──────────────────────────── */
  toast: {
    show:    false,
    message: '',
    type:    'success',
  },
};

export const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    /* ── Selections ───────────────────────────────────── */
    setSelectedSport: (state, action) => {
      state.selectedSport = action.payload;
    },
    setSelectedVenue: (state, action) => {
      state.selectedVenue = action.payload;
    },
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    setSelectedCourt: (state, action) => {
      state.selectedCourt = action.payload;
    },
    setSelectedTimeSlot: (state, action) => {
      state.selectedTimeSlot = action.payload;
    },
    setDurationHours: (state, action) => {
      state.durationHours = action.payload;
    },

    /* ── Booking panel ────────────────────────────────── */
    openBookingPanel: (state) => {
      state.isBookingPanelOpen = true;
    },
    closeBookingPanel: (state) => {
      state.isBookingPanelOpen = false;
    },

    /* ── Modal ────────────────────────────────────────── */
    setBookingModalOpen: (state, action) => {
      state.isBookingModalOpen = action.payload;
      if (!action.payload) {
        state.modalStep = 1;
      }
    },
    setModalStep: (state, action) => {
      state.modalStep = action.payload;
    },

    /* ── Filters ──────────────────────────────────────── */
    setActiveSportFilter: (state, action) => {
      state.activeSportFilter = action.payload;
    },

    /* ── Reset helpers ────────────────────────────────── */
    resetBooking: (state) => {
      state.selectedSport = '';
      state.selectedVenue = '';
      state.selectedDate = '';
      state.selectedCourt = '';
      state.selectedTimeSlot = null;
      state.durationHours = 1;
      state.isBookingPanelOpen = false;
      state.isBookingModalOpen = false;
      state.modalStep = 1;
    },
    resetBookingPanel: (state) => {
      state.selectedTimeSlot = null;
      state.durationHours = 1;
      state.isBookingModalOpen = false;
      state.modalStep = 1;
    },

    /* ── Confirmed booking (set by BookingModal after API success) ───── */
    setConfirmedBooking: (state, action) => {
      state.confirmedBooking = action.payload;
      /* Keep lastConfirmedBooking in sync for backward compat */
      state.lastConfirmedBooking = action.payload;
    },

    /* ── Submission guard ─────────────────────────────────────────────── */
    setSubmittingBooking: (state, action) => {
      state.isSubmittingBooking = Boolean(action.payload);
    },

    /* ── Availability refresh ─────────────────────────────────────────── */
    triggerAvailabilityRefresh: (state) => {
      state.availabilityRefreshToken += 1;
    },

    /* ── Toast ────────────────────────────────────────── */
    showToast: (state, action) => {
      state.toast = {
        show: true,
        message: action.payload.message ?? '',
        type: action.payload.type ?? 'info',
      };
    },
    hideToast: (state) => {
      state.toast.show = false;
    },
  },
});

/* ── Action creators ──────────────────────────────────── */
export const {
  setSelectedSport,
  setSelectedVenue,
  setSelectedDate,
  setSelectedCourt,
  setSelectedTimeSlot,
  setDurationHours,
  openBookingPanel,
  closeBookingPanel,
  setBookingModalOpen,
  setModalStep,
  setActiveSportFilter,
  resetBooking,
  resetBookingPanel,
  setConfirmedBooking,
  setSubmittingBooking,
  triggerAvailabilityRefresh,
  showToast,
  hideToast,
} = bookingSlice.actions;

/* ── Selectors ────────────────────────────────────────── */
export const selectBooking = (state) => state.booking;
export const selectSelectedSport = (state) => state.booking.selectedSport;
export const selectSelectedVenue = (state) => state.booking.selectedVenue;
export const selectSelectedDate = (state) => state.booking.selectedDate;
export const selectIsBookingPanelOpen = (state) => state.booking.isBookingPanelOpen;
export const selectIsBookingModalOpen = (state) => state.booking.isBookingModalOpen;
export const selectModalStep = (state) => state.booking.modalStep;
export const selectLastConfirmedBooking = (state) => state.booking.lastConfirmedBooking;
export const selectSelectedCourt = (state) => state.booking.selectedCourt;
export const selectSelectedTimeSlot = (state) => state.booking.selectedTimeSlot;
export const selectDurationHours = (state) => state.booking.durationHours;
export const selectIsBookingValid = (state) =>
  Boolean(
    state.booking.selectedSport &&
    state.booking.selectedVenue &&
    state.booking.selectedDate,
  );
export const selectBookingSummary = (state) => ({
  sport: state.booking.selectedSport,
  venue: state.booking.selectedVenue,
  date: state.booking.selectedDate,
  isOpen: state.booking.isBookingPanelOpen,
});
export const selectIsSubmittingBooking      = (state) => state.booking.isSubmittingBooking;
export const selectAvailabilityRefreshToken = (state) => state.booking.availabilityRefreshToken;

export default bookingSlice.reducer;
