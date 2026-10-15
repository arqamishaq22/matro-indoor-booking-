/**
 * authSlice.js
 * ─────────────────────────────────────────────────────────────────────────
 * Redux slice for authentication state.
 *
 * State shape:
 *   token   string|null   JWT from /api/v1/auth/login or /register
 *   user    object|null   { id, phone, name, role }
 *   loading boolean       in-progress API call
 *   error   string|null   last auth error message
 *
 * The token is persisted to sessionStorage (not localStorage) so it is
 * cleared when the browser tab closes, reducing session-fixation risk.
 * The user profile from login/register is re-validated against /auth/me
 * whenever an existing session is restored.
 *
 * Passwords are NEVER stored in Redux state or localStorage.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authService from '../../services/authService';

/* ─── Hydrate token from sessionStorage on slice init ───────────────── */
const storedToken = sessionStorage.getItem('matro-auth-token') ?? null;

const initialState = {
  token:   storedToken,
  user:    null,       // populated by fetchMe or login/register
  loading: false,
  error:   null,
};

/* ═══════════════════════════════════════════════════════════════════════
   ASYNC THUNKS
════════════════════════════════════════════════════════════════════════ */

export const register = createAsyncThunk(
  'auth/register',
  async ({ phone, password, name }, { rejectWithValue }) => {
    try {
      return await authService.register({ phone, password, name });
    } catch (err) {
      return rejectWithValue({
        message: err.message ?? 'Registration failed',
        errors: err.errors ?? null,
      });
    }
  },
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ phone, password }, { rejectWithValue }) => {
    try {
      return await authService.login({ phone, password });
    } catch (err) {
      return rejectWithValue({
        message: err.message ?? 'Login failed',
        errors: err.errors ?? null,
      });
    }
  },
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue('No token');
      return await authService.getMe(token);
    } catch (err) {
      /*
       * BUG FIX (BUG 3): Attach the HTTP status so the rejected handler can
       * tell apart an expired/invalid token (401) from a transient network
       * error (TypeError, 503, etc.).  Only a 401 should force logout;
       * a network glitch should leave the session intact.
       */
      return rejectWithValue({ message: err.message ?? 'Failed to load profile', status: err.status ?? null });
    }
  },
);

/* ═══════════════════════════════════════════════════════════════════════
   SLICE
════════════════════════════════════════════════════════════════════════ */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.token   = null;
      state.user    = null;
      state.error   = null;
      state.loading = false;
      sessionStorage.removeItem('matro-auth-token');
    },
    /**
     * forceLogout — called by services (bookingService, etc.) when any
     * API returns 401.  Identical to logout but carries an optional message
     * so the auth error field is set and login page can surface it.
     * BUG FIX (BUG 4): enables 401 auto-logout from non-auth API calls.
     */
    forceLogout: (state, action) => {
      state.token   = null;
      state.user    = null;
      state.loading = false;
      state.error   = action.payload ?? 'Your session has expired. Please log in again.';
      sessionStorage.removeItem('matro-auth-token');
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    /* ── register ── */
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        const { token, user } = action.payload;
        state.token   = token;
        state.user    = user;
        state.loading = false;
        state.error   = null;
        sessionStorage.setItem('matro-auth-token', token);
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error   = typeof action.payload === 'object' ? action.payload?.message : (action.payload ?? 'Registration failed');
      });

    /* ── login ── */
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        const { token, user } = action.payload;
        state.token   = token;
        state.user    = user;
        state.loading = false;
        state.error   = null;
        sessionStorage.setItem('matro-auth-token', token);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error   = typeof action.payload === 'object' ? action.payload?.message : (action.payload ?? 'Login failed');
      });

    /* ── fetchMe ── */
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user    = action.payload;
        state.loading = false;
        state.error   = null;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        /*
         * BUG FIX (BUG 3): Only wipe the session when the token is
         * definitively invalid or expired (HTTP 401) or when no token
         * existed in the first place.
         * A transient network failure (status null / 5xx) must NOT log
         * the user out — it would boot them on every connectivity blip.
         */
        const status = action.payload?.status ?? null;
        const msg    = action.payload?.message ?? action.payload ?? '';
        const isNoToken = msg === 'No token';
        const isInvalid = status === 401;

        if (isNoToken || isInvalid) {
          state.token   = null;
          state.user    = null;
          sessionStorage.removeItem('matro-auth-token');
        }
        state.error = isInvalid
          ? 'Your session has expired. Please log in again.'
          : (isNoToken ? null : msg);
        /* Either way, stop the loading spinner */
        state.loading = false;
      });
  },
});

export const { logout, forceLogout, clearAuthError } = authSlice.actions;

/* ─── Selectors ──────────────────────────────────────────────────────── */
export const selectAuthToken   = (s) => s.auth.token;
export const selectAuthUser    = (s) => s.auth.user;
export const selectIsLoggedIn  = (s) => Boolean(s.auth.token);
export const selectIsAdmin     = (s) => s.auth.user?.role === 'ADMIN';
export const selectUserRole    = (s) => s.auth.user?.role;
export const selectAuthLoading = (s) => s.auth.loading;
export const selectAuthError   = (s) => s.auth.error;

export default authSlice.reducer;
