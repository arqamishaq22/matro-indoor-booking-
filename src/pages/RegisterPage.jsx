/**
 * RegisterPage.jsx  —  /register
 * Phone + name + password registration. Mirrors LoginPage design.
 * On success stores JWT in sessionStorage via authSlice and redirects.
 *
 * Booking flow return:
 *   When arriving with location.state.pendingBooking === true, after
 *   successful registration we re-open the BookingModal so the user
 *   lands back in the booking flow.
 */
import React, { useState, useEffect } from "react";
import { Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, useReducedMotion } from "motion/react";
import {
  Phone,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import {
  register,
  clearAuthError,
  selectAuthLoading,
  selectAuthError,
  selectIsLoggedIn,
} from "../features/auth/authSlice";
import { checkPhone } from "../services/authService";
import { setBookingModalOpen } from "../features/booking/bookingSlice";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Container from "../components/common/Container";

const inputBase = (hasError) => ({
  width: "100%",
  padding: "0.7rem 0.9rem",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--bg-surface-elevated)",
  border: `1.5px solid ${hasError ? "var(--brand-danger)" : "var(--border-subtle)"}`,
  color: "var(--text-primary)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color var(--transition-fast)",
  boxSizing: "border-box",
});

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const color =
    score === 3
      ? "var(--color-success)"
      : score === 2
        ? "var(--brand-accent, #f59e0b)"
        : "var(--brand-danger)";

  return (
    <div style={{ marginTop: "6px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "3px",
              borderRadius: "2px",
              backgroundColor: i < score ? color : "var(--border-subtle)",
              transition: "background-color 0.2s ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {checks.map((c) => (
          <span
            key={c.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.68rem",
              color: c.ok
                ? "var(--color-success)"
                : "var(--text-faint)",
              fontWeight: "var(--fw-medium)",
            }}
          >
            <CheckCircle2 size={11} aria-hidden="true" />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const loading = useSelector(selectAuthLoading);
  const apiError = useSelector(selectAuthError);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from ?? "/";
  const pendingBooking = location.state?.pendingBooking === true;

  /*
   * BUG FIX (BUG 6): Replaced useEffect-based redirect (fires after first
   * render → flashes form) with <Navigate> in the JSX return (synchronous).
   */

  /* Clear API error when user types */
  useEffect(() => {
    if (apiError) dispatch(clearAuthError());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, phone, password, confirm]);

  /* After registration succeeds, navigate and optionally re-open modal */
  useEffect(() => {
    if (!isLoggedIn) return;
    if (pendingBooking) {
      dispatch(setBookingModalOpen(true));
    }
    navigate(from, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Full name is required";
    else if (name.trim().length < 2)
      e.name = "Name must be at least 2 characters";

    const phoneClean = phone.trim();
    const phoneDigits = phoneClean.replace(/\D/g, '');
    if (!phoneClean) e.phone = "Phone number is required";
    else if (phoneDigits.length > 11)
      e.phone = "Phone number must not contain more than 11 digits";
    else if (phoneDigits.length < 11 || !/^0\d{10}$/.test(phoneDigits))
      e.phone = "Enter a valid 11-digit phone number (e.g. 03001234567)";

    if (!password) e.password = "Password is required";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    else if (password.length > 128) e.password = "Password is too long";
    else if (new TextEncoder().encode(password).length > 72)
      e.password = "Password must be at most 72 bytes when encoded";

    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";

    return e;
  };

  const handlePhoneBlur = async (e) => {
    onBlur(e, !!fieldErrors.phone);
    const phoneClean = phone.trim();
    if (!phoneClean) return;
    const phoneDigits = phoneClean.replace(/\D/g, '');
    if (phoneDigits.length > 11) {
      setFieldErrors((p) => ({ ...p, phone: "Phone number must not contain more than 11 digits" }));
      return;
    }
    if (phoneDigits.length < 11 || !/^0\d{10}$/.test(phoneDigits)) {
      setFieldErrors((p) => ({ ...p, phone: "Enter a valid 11-digit phone number (e.g. 03001234567)" }));
      return;
    }
    try {
      const res = await checkPhone(phoneClean);
      if (res?.exists) {
        setFieldErrors((p) => ({
          ...p,
          phone: "This phone number is already registered. Please log in instead.",
        }));
      }
    } catch {
      // Proceed on network failure
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    try {
      const check = await checkPhone(phone.trim());
      if (check?.exists) {
        setFieldErrors({
          phone: "This phone number is already registered. Please log in instead.",
        });
        return;
      }
    } catch {
      // If check-phone is unreachable, proceed to register endpoint
    }

    const res = await dispatch(register({ phone: phone.trim(), password, name: name.trim() }));
    if (register.rejected.match(res)) {
      const payload = res.payload;
      const errMsg = typeof payload === "object" ? payload?.message : payload;
      const phoneErr = payload?.errors?.find((er) => er.path === "phone")?.msg;
      if (phoneErr) {
        setFieldErrors((prev) => ({ ...prev, phone: phoneErr }));
      } else if (
        errMsg?.toLowerCase().includes("phone") ||
        errMsg?.toLowerCase().includes("already registered")
      ) {
        setFieldErrors((prev) => ({ ...prev, phone: errMsg }));
      }
    }
  };

  const onFocus = (e) => (e.target.style.borderColor = "var(--brand-primary)");
  const onBlur = (e, hasErr) =>
    (e.target.style.borderColor = hasErr
      ? "var(--brand-danger)"
      : "var(--border-subtle)");

  /* Already logged in — redirect without flashing the form (BUG 6 fix) */
  if (isLoggedIn) return <Navigate to={from} replace />;

  return (
    <>
      <Navbar />
      <main
        id="main-content"
        style={{
          minHeight: "calc(100dvh - var(--nav-height))",
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--bg-main)",
          padding: "2rem 0",
        }}
      >
        <Container>
          <motion.div
            className="auth-card"
            initial={reduced ? {} : { opacity: 0, y: 20 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              maxWidth: "440px",
              margin: "0 auto",
              padding: "clamp(1.5rem, 4vw, 2.25rem)",
              borderRadius: "var(--radius-2xl)",
              backgroundColor: "var(--bg-surface-card)",
              border: "1px solid var(--border-card)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Header */}
            <h1
              style={{
                margin: "0 0 0.25rem",
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--fw-extrabold)",
                color: "var(--text-primary)",
              }}
            >
              Create your account
            </h1>
            <p
              style={{
                margin: "0 0 1.75rem",
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
              }}
            >
              Join Matro — book courts in seconds.
            </p>

            {/* Pending booking notice */}
            {pendingBooking && (
              <div
                role="note"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0.7rem 1rem",
                  marginBottom: "1.25rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-primary-soft)",
                  border: "1px solid var(--color-primary-border)",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--fw-semibold)",
                  color: "var(--brand-primary)",
                }}
              >
                <span>🎯</span>
                <span>
                  Create an account to complete your court booking. You'll
                  return to the booking form automatically.
                </span>
              </div>
            )}

            {/* API error banner */}
            {apiError && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0.75rem 1rem",
                  marginBottom: "1.25rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-danger-soft)",
                  border: "1px solid rgba(220,38,38,0.28)",
                  fontSize: "var(--text-xs)",
                  color: "var(--brand-danger)",
                  fontWeight: "var(--fw-semibold)",
                }}
              >
                <AlertCircle
                  size={14}
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                />
                {apiError}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              aria-busy={loading}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.1rem",
              }}
            >
              {/* Full Name */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                <label
                  htmlFor="reg-name"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--fw-semibold)",
                    color: fieldErrors.name
                      ? "var(--brand-danger)"
                      : "var(--text-secondary)",
                    letterSpacing: "0.03em",
                  }}
                >
                  Full Name *
                </label>
                <div style={{ position: "relative" }}>
                  <User
                    size={15}
                    color="var(--text-faint)"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "0.9rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    autoComplete="name"
                    required
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={
                      fieldErrors.name ? "reg-name-err" : undefined
                    }
                    placeholder="e.g. Ahmed Khan"
                    onChange={(e) => {
                      setName(e.target.value);
                      setFieldErrors((p) => ({ ...p, name: undefined }));
                    }}
                    style={{
                      ...inputBase(!!fieldErrors.name),
                      paddingLeft: "2.6rem",
                    }}
                    onFocus={onFocus}
                    onBlur={(e) => onBlur(e, !!fieldErrors.name)}
                  />
                </div>
                {fieldErrors.name && (
                  <span
                    id="reg-name-err"
                    role="alert"
                    style={{ fontSize: "0.7rem", color: "var(--brand-danger)" }}
                  >
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Phone */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                <label
                  htmlFor="reg-phone"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--fw-semibold)",
                    color: fieldErrors.phone
                      ? "var(--brand-danger)"
                      : "var(--text-secondary)",
                    letterSpacing: "0.03em",
                  }}
                >
                  Phone Number *
                </label>
                <div style={{ position: "relative" }}>
                  <Phone
                    size={15}
                    color="var(--text-faint)"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "0.9rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    autoComplete="tel"
                    required
                    maxLength={11}
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={
                      fieldErrors.phone ? "reg-phone-err" : undefined
                    }
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
                    style={{
                      ...inputBase(!!fieldErrors.phone),
                      paddingLeft: "2.6rem",
                    }}
                    onFocus={onFocus}
                    onBlur={handlePhoneBlur}
                  />
                </div>
                {fieldErrors.phone && (
                  <span
                    id="reg-phone-err"
                    role="alert"
                    style={{ fontSize: "0.7rem", color: "var(--brand-danger)" }}
                  >
                    {fieldErrors.phone}
                  </span>
                )}
              </div>

              {/* Password */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                <label
                  htmlFor="reg-password"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--fw-semibold)",
                    color: fieldErrors.password
                      ? "var(--brand-danger)"
                      : "var(--text-secondary)",
                    letterSpacing: "0.03em",
                  }}
                >
                  Password *
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={15}
                    color="var(--text-faint)"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "0.9rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="reg-password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    autoComplete="new-password"
                    required
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password
                        ? "reg-password-err reg-pwd-strength"
                        : "reg-pwd-strength"
                    }
                    placeholder="At least 8 characters"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                    }}
                    style={{
                      ...inputBase(!!fieldErrors.password),
                      paddingLeft: "2.6rem",
                      paddingRight: "2.6rem",
                    }}
                    onFocus={onFocus}
                    onBlur={(e) => onBlur(e, !!fieldErrors.password)}
                  />
                  <button
                    type="button"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    onClick={() => setShowPwd((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      display: "flex",
                      padding: 0,
                    }}
                  >
                    {showPwd ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span
                    id="reg-password-err"
                    role="alert"
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--brand-danger)",
                    }}
                  >
                    {fieldErrors.password}
                  </span>
                )}
                <div id="reg-pwd-strength" aria-live="polite">
                  <PasswordStrength password={password} />
                </div>
              </div>

              {/* Confirm Password */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                <label
                  htmlFor="reg-confirm"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--fw-semibold)",
                    color: fieldErrors.confirm
                      ? "var(--brand-danger)"
                      : "var(--text-secondary)",
                    letterSpacing: "0.03em",
                  }}
                >
                  Confirm Password *
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={15}
                    color="var(--text-faint)"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "0.9rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="reg-confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    autoComplete="new-password"
                    required
                    aria-invalid={!!fieldErrors.confirm}
                    aria-describedby={
                      fieldErrors.confirm ? "reg-confirm-err" : undefined
                    }
                    placeholder="Re-enter your password"
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setFieldErrors((p) => ({ ...p, confirm: undefined }));
                    }}
                    style={{
                      ...inputBase(!!fieldErrors.confirm),
                      paddingLeft: "2.6rem",
                      paddingRight: "2.6rem",
                    }}
                    onFocus={onFocus}
                    onBlur={(e) => onBlur(e, !!fieldErrors.confirm)}
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirm
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    onClick={() => setShowConfirm((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      display: "flex",
                      padding: 0,
                    }}
                  >
                    {showConfirm ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {/* Inline match indicator */}
                {confirm && !fieldErrors.confirm && confirm === password && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.7rem",
                      color: "var(--color-success)",
                      fontWeight: "var(--fw-medium)",
                    }}
                  >
                    <CheckCircle2 size={11} aria-hidden="true" />
                    Passwords match
                  </span>
                )}
                {fieldErrors.confirm && (
                  <span
                    id="reg-confirm-err"
                    role="alert"
                    style={{ fontSize: "0.7rem", color: "var(--brand-danger)" }}
                  >
                    {fieldErrors.confirm}
                  </span>
                )}
              </div>

              {/* Submit */}
              <motion.button
                className="auth-submit"
                type="submit"
                disabled={loading}
                whileHover={!reduced && !loading ? { scale: 1.02 } : {}}
                whileTap={!reduced && !loading ? { scale: 0.97 } : {}}
                transition={{ type: "spring", stiffness: 440, damping: 22 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "var(--radius-md)",
                  background: loading
                    ? "var(--bg-surface-elevated)"
                    : "var(--gradient-cta)",
                  color: loading ? "var(--text-muted)" : "#fff",
                  fontWeight: "var(--fw-bold)",
                  fontSize: "var(--text-sm)",
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: loading ? "none" : "var(--shadow-brand)",
                  marginTop: "0.25rem",
                }}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      className="auth-loading-icon"
                      size={16}
                      aria-hidden="true"
                    />
                    <span>Creating account…</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </>
                )}
              </motion.button>
            </form>

            <p
              style={{
                marginTop: "1.5rem",
                textAlign: "center",
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
              }}
            >
              Already have an account?{" "}
              <Link
                to="/login"
                state={{ from, pendingBooking }}
                style={{
                  color: "var(--brand-primary)",
                  fontWeight: "var(--fw-semibold)",
                  textDecoration: "none",
                }}
              >
                Log in
              </Link>
            </p>
          </motion.div>
        </Container>
      </main>
      <Footer />
    </>
  );
};

export default RegisterPage;
