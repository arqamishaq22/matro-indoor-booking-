/**
 * LoginPage.jsx  —  /login
 * Phone + password login. On success stores JWT in sessionStorage via authSlice.
 * Redirects to the page the user came from (or home).
 *
 * Booking flow return:
 *   When the user arrives here with location.state.pendingBooking === true
 *   (set by BookingModal or AvailabilityPreview's auth gate), after a
 *   successful login we redirect them back to `from` (usually '/') AND
 *   re-open the BookingModal so they land exactly where they left off.
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, useReducedMotion } from 'motion/react';
import { Phone, Lock, ArrowRight, Eye, EyeOff, AlertCircle, LoaderCircle } from 'lucide-react';
import {
  login,
  clearAuthError,
  selectAuthLoading,
  selectAuthError,
  selectIsLoggedIn,
} from '../features/auth/authSlice';
import { checkPhone } from '../services/authService';
import { setBookingModalOpen } from '../features/booking/bookingSlice';
import Navbar    from '../components/layout/Navbar';
import Footer    from '../components/layout/Footer';
import Container from '../components/common/Container';

const inputBase = (hasError) => ({
  width:           '100%',
  padding:         '0.7rem 0.9rem',
  borderRadius:    'var(--radius-md)',
  backgroundColor: 'var(--bg-surface-elevated)',
  border:          `1.5px solid ${hasError ? 'var(--brand-danger)' : 'var(--border-subtle)'}`,
  color:           'var(--text-primary)',
  fontSize:        'var(--text-sm)',
  fontFamily:      'inherit',
  outline:         'none',
  transition:      'border-color var(--transition-fast)',
  boxSizing:       'border-box',
});

const LoginPage = () => {
  const dispatch  = useDispatch();
  const location  = useLocation();
  const navigate  = useNavigate();
  const reduced   = useReducedMotion();

  const loading    = useSelector(selectAuthLoading);
  const apiError   = useSelector(selectAuthError);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /* Where to go after login; pendingBooking flag from auth gate */
  const from           = location.state?.from ?? '/';
  const pendingBooking = location.state?.pendingBooking === true;

  /* Clear API error when user starts typing */
  useEffect(() => { if (apiError) dispatch(clearAuthError()); }, [phone, password]); // eslint-disable-line react-hooks/exhaustive-deps

  /* After login succeeds, navigate and optionally re-open modal */
  useEffect(() => {
    if (!isLoggedIn) return;
    if (pendingBooking) {
      /* Re-open the BookingModal so the user lands right back in the flow */
      dispatch(setBookingModalOpen(true));
    }
    navigate(from, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const validate = () => {
    const e = {};
    const phoneClean = phone.trim();
    if (!phoneClean) {
      e.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(phoneClean)) {
      e.phone = 'Enter a valid phone number (7–20 digits)';
    }

    if (!password) {
      e.password = 'Password is required';
    } else if (new TextEncoder().encode(password).length > 72) {
      e.password = 'Password must be at most 72 bytes when encoded';
    }
    return e;
  };

  const handlePhoneBlur = async (e) => {
    e.target.style.borderColor = fieldErrors.phone ? 'var(--brand-danger)' : 'var(--border-subtle)';
    const phoneClean = phone.trim();
    if (!phoneClean) return;
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(phoneClean)) {
      setFieldErrors((p) => ({ ...p, phone: 'Enter a valid phone number (7–20 digits)' }));
      return;
    }
    try {
      const res = await checkPhone(phoneClean);
      if (res && res.exists === false) {
        setFieldErrors((p) => ({
          ...p,
          phone: 'This phone number is not registered. Please create an account first.',
        }));
      }
    } catch {
      // Ignore network errors
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});

    try {
      const check = await checkPhone(phone.trim());
      if (check && check.exists === false) {
        setFieldErrors({
          phone: 'This phone number is not registered. Please create an account first.',
        });
        return;
      }
    } catch {
      // Proceed to login
    }

    const res = await dispatch(login({ phone: phone.trim(), password }));
    if (login.rejected.match(res)) {
      const payload = res.payload;
      const errMsg = typeof payload === 'object' ? payload?.message : payload;
      const phoneErr = payload?.errors?.find((er) => er.path === 'phone')?.msg;
      const pwdErr = payload?.errors?.find((er) => er.path === 'password')?.msg;

      const newErrs = {};
      if (phoneErr) {
        newErrs.phone = phoneErr;
      } else if (
        errMsg?.toLowerCase().includes('phone') ||
        errMsg?.toLowerCase().includes('not registered')
      ) {
        newErrs.phone = errMsg;
      }

      if (pwdErr) {
        newErrs.password = pwdErr;
      } else if (
        errMsg?.toLowerCase().includes('password') ||
        errMsg?.toLowerCase().includes('incorrect')
      ) {
        newErrs.password = errMsg;
      }

      if (Object.keys(newErrs).length > 0) {
        setFieldErrors(newErrs);
      }
    }
  };

  /* Already logged in — redirect without flashing the form */
  if (isLoggedIn) return <Navigate to={from} replace />;

  return (
    <>
      <Navbar />
      <main id="main-content" style={{ minHeight:'calc(100dvh - var(--nav-height))', display:'flex', alignItems:'center', backgroundColor:'var(--bg-main)', padding:'1rem 0' }}>
        <Container>
          <motion.div
            className="auth-card"
            initial={reduced ? {} : { opacity:0, y:20 }}
            animate={reduced ? {} : { opacity:1, y:0  }}
            transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}
            style={{ maxWidth:'440px', margin:'3rem auto', padding:'clamp(1.5rem,4vw,2.25rem)', borderRadius:'var(--radius-2xl)', backgroundColor:'var(--bg-surface-card)', border:'1px solid var(--border-card)', boxShadow:'var(--shadow-lg)' }}
          >
            <h1 style={{ margin:'0 0 0.35rem', fontSize:'var(--text-2xl)', fontWeight:'var(--fw-extrabold)', color:'var(--text-primary)' }}>
              Welcome back
            </h1>
            <p style={{ margin:'0 0 1.75rem', fontSize:'var(--text-sm)', color:'var(--text-muted)' }}>
              Log in to your Matro account to book courts.
            </p>

            {/* Pending booking notice */}
            {pendingBooking && (
              <div
                role="note"
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'0.7rem 1rem', marginBottom:'1.25rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--color-primary-soft)', border:'1px solid var(--color-primary-border)', fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', color:'var(--brand-primary)' }}
              >
                <span>🎯</span>
                <span>Log in to complete your court booking. You'll return to the booking form automatically.</span>
              </div>
            )}

            {/* API error banner */}
            {apiError && (
              <div role="alert" style={{ display:'flex', alignItems:'center', gap:'8px', padding:'0.75rem 1rem', marginBottom:'1.25rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--color-danger-soft)', border:'1px solid rgba(220,38,38,0.28)', fontSize:'var(--text-xs)', color:'var(--brand-danger)', fontWeight:'var(--fw-semibold)' }}>
                <AlertCircle size={14} aria-hidden="true" style={{ flexShrink:0 }} />
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-busy={loading} style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
              {/* Phone */}
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label htmlFor="login-phone" style={{ fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', color: fieldErrors.phone ? 'var(--brand-danger)' : 'var(--text-secondary)', letterSpacing:'0.03em' }}>
                  Phone number *
                </label>
                <div style={{ position:'relative' }}>
                  <Phone size={15} color="var(--text-faint)" aria-hidden="true" style={{ position:'absolute', left:'0.9rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  <input
                    id="login-phone" className="auth-input" type="tel" value={phone} autoComplete="tel" required aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'login-phone-error' : undefined}
                    placeholder="e.g. 0300-1234567"
                    onChange={(e) => { setPhone(e.target.value); setFieldErrors(p => ({...p, phone:undefined})); }}
                    style={{ ...inputBase(!!fieldErrors.phone), paddingLeft:'2.6rem' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand-primary)')}
                    onBlur={handlePhoneBlur}
                  />
                </div>
                {fieldErrors.phone && <span id="login-phone-error" role="alert" style={{ fontSize:'0.75rem', color:'var(--brand-danger)' }}>{fieldErrors.phone}</span>}
              </div>

              {/* Password */}
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label htmlFor="login-password" style={{ fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', color: fieldErrors.password ? 'var(--brand-danger)' : 'var(--text-secondary)', letterSpacing:'0.03em' }}>
                  Password *
                </label>
                <div style={{ position:'relative' }}>
                  <Lock size={15} color="var(--text-faint)" aria-hidden="true" style={{ position:'absolute', left:'0.9rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  <input
                    id="login-password" className="auth-input" type={showPwd ? 'text' : 'password'} value={password} autoComplete="current-password" required aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    placeholder="Your password"
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({...p, password:undefined})); }}
                    style={{ ...inputBase(!!fieldErrors.password), paddingLeft:'2.6rem', paddingRight:'2.6rem' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand-primary)')}
                    onBlur={(e)  => (e.target.style.borderColor = fieldErrors.password ? 'var(--brand-danger)' : 'var(--border-subtle)')}
                  />
                  <button type="button" aria-label={showPwd ? 'Hide password' : 'Show password'} onClick={() => setShowPwd(v => !v)}
                    style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:0 }}>
                    {showPwd ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {fieldErrors.password && <span id="login-password-error" role="alert" style={{ fontSize:'0.75rem', color:'var(--brand-danger)' }}>{fieldErrors.password}</span>}
              </div>

              {/* Submit */}
              <motion.button className="auth-submit" type="submit" disabled={loading}
                whileHover={!reduced && !loading ? { scale:1.02 } : {}}
                whileTap={!reduced   && !loading ? { scale:0.97 } : {}}
                transition={{ type:'spring', stiffness:440, damping:22 }}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'0.75rem 1.5rem', borderRadius:'var(--radius-md)', background: loading ? 'var(--bg-surface-elevated)' : 'var(--gradient-cta)', color: loading ? 'var(--text-muted)' : '#fff', fontWeight:'var(--fw-bold)', fontSize:'var(--text-sm)', border:'none', cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : 'var(--shadow-brand)' }}
                aria-busy={loading}
              >
                {loading ? <><LoaderCircle className="auth-loading-icon" size={16} aria-hidden="true" /><span>Logging in…</span></> : <><span>Log in</span><ArrowRight size={15} aria-hidden="true" /></>}
              </motion.button>
            </form>

            <p style={{ marginTop:'1.5rem', textAlign:'center', fontSize:'var(--text-sm)', color:'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" state={{ from, pendingBooking }} style={{ color:'var(--brand-primary)', fontWeight:'var(--fw-semibold)', textDecoration:'none' }}>
                Create one
              </Link>
            </p>
          </motion.div>
        </Container>
      </main>
      <Footer />
    </>
  );
};

export default LoginPage;
