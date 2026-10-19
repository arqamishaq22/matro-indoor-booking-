import React, { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, useReducedMotion } from 'motion/react';
import { Phone, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import {
  login,
  clearAuthError,
  selectAuthLoading,
  selectAuthError,
  selectIsLoggedIn,
  selectUserRole,
} from '../features/auth/authSlice';
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

const AdminLogin = () => {
  const dispatch  = useDispatch();
  const location  = useLocation();
  const navigate  = useNavigate();
  const reduced   = useReducedMotion();

  const loading    = useSelector(selectAuthLoading);
  const apiError   = useSelector(selectAuthError);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const role       = useSelector(selectUserRole);

  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from ?? '/admin';

  useEffect(() => { if (apiError) dispatch(clearAuthError()); }, [phone, password]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoggedIn) return;
    if (role === 'ADMIN') {
      navigate(from, { replace: true });
    } else {
      setFieldErrors({ phone: 'Unauthorized: Admin access required.' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, role]);

  const validate = () => {
    const e = {};
    const phoneClean = phone.trim();
    const phoneDigits = phoneClean.replace(/\D/g, '');
    if (!phoneClean) {
      e.phone = 'Phone number is required';
    } else if (phoneDigits.length > 11) {
      e.phone = 'Phone number must not contain more than 11 digits';
    } else if (phoneDigits.length < 11 || !/^0\d{10}$/.test(phoneDigits)) {
      e.phone = 'Enter a valid 11-digit phone number (e.g. 03001234567)';
    }

    if (!password) {
      e.password = 'Password is required';
    }
    return e;
  };

  const handlePhoneBlur = (e) => {
    e.target.style.borderColor = fieldErrors.phone ? 'var(--brand-danger)' : 'var(--border-subtle)';
    const phoneClean = phone.trim();
    if (!phoneClean) return;
    const phoneDigits = phoneClean.replace(/\D/g, '');
    if (phoneDigits.length > 11) {
      setFieldErrors((p) => ({ ...p, phone: 'Phone number must not contain more than 11 digits' }));
      return;
    }
    if (phoneDigits.length < 11 || !/^0\d{10}$/.test(phoneDigits)) {
      setFieldErrors((p) => ({ ...p, phone: 'Enter a valid 11-digit phone number (e.g. 03001234567)' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});

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
      } else {
         setFieldErrors({ phone: errMsg || 'Login failed.' });
      }
    }
  };

  if (isLoggedIn && role === 'ADMIN') return <Navigate to={from} replace />;
  if (isLoggedIn && role !== 'ADMIN') {
    return (
      <>
        <Navbar />
        <main id="main-content" style={{ minHeight:'calc(100dvh - var(--nav-height))', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center' }}>
            <AlertCircle size={48} color="var(--brand-danger)" style={{ margin:'0 auto 1rem' }} />
            <h1 style={{ fontSize:'var(--text-2xl)', fontWeight:'var(--fw-bold)' }}>Unauthorized</h1>
            <p style={{ marginTop:'0.5rem', color:'var(--text-muted)' }}>You do not have administrator access.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

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
              Admin Portal
            </h1>
            <p style={{ margin:'0 0 1.75rem', fontSize:'var(--text-sm)', color:'var(--text-muted)' }}>
              Log in to manage the Matro platform.
            </p>

            {apiError && (
              <div role="alert" style={{ display:'flex', alignItems:'center', gap:'8px', padding:'0.75rem 1rem', marginBottom:'1.25rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--color-danger-soft)', border:'1px solid rgba(220,38,38,0.28)', fontSize:'var(--text-xs)', color:'var(--brand-danger)', fontWeight:'var(--fw-semibold)' }}>
                <AlertCircle size={14} aria-hidden="true" style={{ flexShrink:0 }} />
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-busy={loading} style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label htmlFor="admin-phone" style={{ fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', color: fieldErrors.phone ? 'var(--brand-danger)' : 'var(--text-secondary)', letterSpacing:'0.03em' }}>
                  Admin Phone *
                </label>
                <div style={{ position:'relative' }}>
                  <Phone size={15} color="var(--text-faint)" aria-hidden="true" style={{ position:'absolute', left:'0.9rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  <input
                    id="admin-phone" className="auth-input" type="tel" value={phone} autoComplete="tel" required maxLength={11} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'admin-phone-error' : undefined}
                    placeholder="e.g. 03001234567"
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('92') && val.length > 11) {
                        val = '0' + val.slice(2);
                      }
                      val = val.slice(0, 11);
                      setPhone(val);
                      setFieldErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    style={{ ...inputBase(!!fieldErrors.phone), paddingLeft:'2.6rem' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand-primary)')}
                    onBlur={handlePhoneBlur}
                  />
                </div>
                {fieldErrors.phone && <span id="admin-phone-error" role="alert" style={{ fontSize:'0.75rem', color:'var(--brand-danger)' }}>{fieldErrors.phone}</span>}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label htmlFor="admin-password" style={{ fontSize:'var(--text-xs)', fontWeight:'var(--fw-semibold)', color: fieldErrors.password ? 'var(--brand-danger)' : 'var(--text-secondary)', letterSpacing:'0.03em' }}>
                  Password *
                </label>
                <div style={{ position:'relative' }}>
                  <Lock size={15} color="var(--text-faint)" aria-hidden="true" style={{ position:'absolute', left:'0.9rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  <input
                    id="admin-password" className="auth-input" type={showPwd ? 'text' : 'password'} value={password} autoComplete="current-password" required aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'admin-password-error' : undefined}
                    placeholder="••••••••"
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
                {fieldErrors.password && <span id="admin-password-error" role="alert" style={{ fontSize:'0.75rem', color:'var(--brand-danger)' }}>{fieldErrors.password}</span>}
              </div>

              <motion.button className="auth-submit" type="submit" disabled={loading}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:'0.75rem', marginTop:'0.5rem', borderRadius:'var(--radius-md)', backgroundColor:'var(--brand-primary)', color:'var(--color-primary-text)', fontSize:'var(--text-sm)', fontWeight:'var(--fw-bold)', border:'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition:'background-color var(--transition-fast)' }}
              >
                {loading ? 'Logging in...' : 'Log in to Dashboard'}
              </motion.button>
            </form>
          </motion.div>
        </Container>
      </main>
      <Footer />
    </>
  );
};

export default AdminLogin;
