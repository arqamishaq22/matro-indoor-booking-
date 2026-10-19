/**
 * BookingModal.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Two-step modal driven entirely by Redux:
 *
 *   Step 1 — Details form
 *            • Player name (required)
 *            • Phone number (required, basic validation)
 *            • Notes (optional)
 *            • Duration in hours (1–4, defaults to 1)
 *            • Read-only summary: venue, court, date, time, price
 *
 *   Step 2 — Success screen (only shown after a real API 201)
 *            • Booking ID, full summary
 *            • "Book Another Slot" resets modal cleanly
 *
 * Key improvements:
 *   • Double-click guard via isSubmittingBooking Redux flag
 *   • Auth gate: if not logged in, close modal → /login with booking state
 *     preserved in location.state so user returns directly to the flow
 *   • 409 conflict: "This slot has just been booked. Please select another time."
 *   • Step 2 ONLY shows on real API success — never on error
 *   • triggerAvailabilityRefresh dispatched after success → grid re-fetches
 *   • Server-side price displayed; totalAmount never sent from client
 *   • Validates: date not in past, court selected, time selected
 *
 * Accessibility
 *   • role="dialog", aria-modal, aria-labelledby, aria-describedby
 *   • Focus trap: Tab / Shift+Tab cycles within modal
 *   • Escape key closes modal (step 1 only)
 *   • useReducedMotion respected throughout
 * ─────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useRef, useState, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  setBookingModalOpen,
  resetBookingPanel,
  setDurationHours,
  selectSelectedSport,
  selectSelectedVenue,
  selectSelectedDate,
  selectSelectedCourt,
  selectSelectedTimeSlot,
  selectDurationHours,
  selectModalStep,
  setModalStep,
  setConfirmedBooking,
  setSubmittingBooking,
  triggerAvailabilityRefresh,
  showToast,
} from "../../features/booking/bookingSlice";
import {
  selectIsLoggedIn,
  selectAuthUser,
} from "../../features/auth/authSlice";
import { createBooking, getVenueById } from "../../services/bookingService";
import {
  X,
  MapPin,
  CalendarDays,
  Clock,
  User,
  Phone,
  FileText,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  LogIn,
} from "lucide-react";

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPKR(amount) {
  if (amount == null || isNaN(amount)) return "—";
  return `Rs. ${Number(amount).toLocaleString("en-PK")}`;
}

/** Returns today as YYYY-MM-DD in local time */
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── Focus trap ────────────────────────────────────────────────────────── */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;

    const first = () => el.querySelectorAll(FOCUSABLE)[0];
    const last = () => {
      const all = el.querySelectorAll(FOCUSABLE);
      return all[all.length - 1];
    };

    first()?.focus();

    const handler = (e) => {
      if (e.key !== "Tab") return;
      const focusables = el.querySelectorAll(FOCUSABLE);
      if (!focusables.length) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [ref, active]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE FIELD
═══════════════════════════════════════════════════════════════════════════ */
function Field({ label, htmlFor, required, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-semibold)",
          color: error ? "var(--brand-danger)" : "var(--text-secondary)",
          letterSpacing: "0.03em",
        }}
      >
        {label}
        {required && (
          <span
            aria-hidden="true"
            style={{ color: "var(--brand-danger)", marginLeft: "3px" }}
          >
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <span
          role="alert"
          style={{
            fontSize: "0.68rem",
            color: "var(--brand-danger)",
            fontWeight: "var(--fw-medium)",
            marginTop: "2px",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

/* ─── Input style ────────────────────────────────────────────────────────── */
const inputStyle = (hasError) => ({
  width: "100%",
  padding: "0.6rem 0.85rem",
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

/* ═══════════════════════════════════════════════════════════════════════════
   DURATION STEPPER
═══════════════════════════════════════════════════════════════════════════ */
function DurationStepper({ value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--border-subtle)",
        overflow: "hidden",
        width: "fit-content",
      }}
    >
      <button
        type="button"
        aria-label="Decrease duration"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        style={{
          padding: "0.55rem 0.85rem",
          backgroundColor: "var(--bg-surface-elevated)",
          border: "none",
          color: value <= 1 ? "var(--text-faint)" : "var(--text-primary)",
          cursor: value <= 1 ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color var(--transition-fast)",
        }}
      >
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          padding: "0.55rem 1.1rem",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-primary)",
          backgroundColor: "var(--bg-surface-elevated)",
          borderLeft: "1px solid var(--border-subtle)",
          borderRight: "1px solid var(--border-subtle)",
          minWidth: "80px",
          textAlign: "center",
        }}
      >
        {value} {value === 1 ? "hr" : "hrs"}
      </span>

      <button
        type="button"
        aria-label="Increase duration"
        onClick={() => onChange(Math.min(4, value + 1))}
        disabled={value >= 4}
        style={{
          padding: "0.55rem 0.85rem",
          backgroundColor: "var(--bg-surface-elevated)",
          border: "none",
          color: value >= 4 ? "var(--text-faint)" : "var(--text-primary)",
          cursor: value >= 4 ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color var(--transition-fast)",
        }}
      >
        <ChevronUp size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUMMARY ROW
═══════════════════════════════════════════════════════════════════════════ */
function SummaryRow({ icon: Icon, iconColor, label, value, mono }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "0.55rem 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <Icon
        size={14}
        color={iconColor ?? "var(--brand-primary)"}
        aria-hidden="true"
        style={{ flexShrink: 0, marginTop: "2px" }}
      />
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          fontWeight: "var(--fw-medium)",
          flexShrink: 0,
          width: "80px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          fontWeight: "var(--fw-semibold)",
          flex: 1,
          fontFamily: mono ? "monospace" : "inherit",
          letterSpacing: mono ? "0.05em" : "normal",
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 1 — BOOKING DETAILS FORM
═══════════════════════════════════════════════════════════════════════════ */
function StepDetails({ titleId, descId, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const sportId = useSelector(selectSelectedSport);
  const venueId = useSelector(selectSelectedVenue);
  const date = useSelector(selectSelectedDate);
  const court = useSelector(selectSelectedCourt); // { id, name, sport }
  const timeSlot = useSelector(selectSelectedTimeSlot); // { time, label, isPeak }
  const durationHours = useSelector(selectDurationHours);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const authUser = useSelector(selectAuthUser);

  /* Resolve display names */
  const [venueObj, setVenueObj] = useState(null);
  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    getVenueById(venueId)
      .then((data) => {
        if (!cancelled) setVenueObj(data);
      })
      .catch((err) => {
        if (!cancelled)
          dispatch(
            showToast({
              message: err.message || "Unable to load venue details.",
              type: "error",
            }),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [venueId, dispatch]);

  const venueName = venueObj?.name ?? venueId ?? "—";
  const sportName = sportId
    ? sportId.replace(/(^|-)\w/g, (part) => part.replace("-", "").toUpperCase())
    : "—";
  const courtName = court?.name ?? court ?? "—";
  const courtId = court?.id ?? court ?? null;
  const timeLabel = timeSlot?.label ?? timeSlot ?? "—";
  const startTime = typeof timeSlot === "object" ? timeSlot?.time : timeSlot;
  const isPeak = timeSlot?.isPeak ?? false;

  /* Price is the API-backed amount attached to the selected availability slot. */
  const pricePerHour = timeSlot?.pricePerHour ?? null;

  const totalAmount =
    pricePerHour != null && pricePerHour > 0
      ? pricePerHour * durationHours
      : null;

  /* ── Pre-flight validation ───────────────────────────────────────────── */
  const today = getTodayStr();
  const dateInPast = date && date < today;
  const missingCourt = !courtId;
  const missingTime = !startTime;
  const missingDuration = !durationHours || durationHours < 1;

  /* ── Form state ─────────────────────────────────────────────────────── */
  const [name, setName] = useState(authUser?.name ?? "");
  const [phone, setPhone] = useState(authUser?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  /* Keep name/phone in sync when authUser loads after modal opens */
  useEffect(() => {
    if (authUser?.name && !name) setName(authUser.name);
    if (authUser?.phone && !phone) setPhone(authUser.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  const validate = () => {
    const e = {};
    const phoneClean = phone.trim();
    const phoneDigits = phoneClean.replace(/\D/g, '');
    if (!name.trim()) e.name = "Player name is required.";
    if (!phoneClean) e.phone = "Phone number is required.";
    else if (phoneDigits.length > 11)
      e.phone = "Phone number must not contain more than 11 digits.";
    else if (phoneDigits.length < 11 || !/^0\d{10}$/.test(phoneDigits))
      e.phone = "Enter a valid 11-digit phone number (e.g. 03001234567).";
    return e;
  };

  /* ── handleSubmit with double-click guard ────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    /* Already in-flight → ignore */
    if (submitting) return;

    /* ── Auth gate: redirect to /login preserving booking context ─────── */
    if (!isLoggedIn) {
      dispatch(setBookingModalOpen(false));
      navigate("/login", {
        state: {
          from: window.location.pathname,
          pendingBooking: true, // flag to re-open modal after login
        },
      });
      return;
    }

    /* ── Pre-flight validations ─────────────────────────────────────────── */
    if (dateInPast) {
      setApiError("This date is in the past. Please select a future date.");
      return;
    }
    if (missingCourt) {
      setApiError(
        "No court selected. Please select a court from the availability grid.",
      );
      return;
    }
    if (missingTime) {
      setApiError(
        "No time slot selected. Please select a time from the availability grid.",
      );
      return;
    }
    if (missingDuration) {
      setApiError("Please select a valid duration (1–4 hours).");
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    /* Lock the button */
    setSubmitting(true);
    dispatch(setSubmittingBooking(true));
    setApiError("");

    try {
      const result = await createBooking({
        courtId,
        date,
        timeSlot: startTime,
        durationHours,
        playerName: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        /* Do NOT send totalAmount, pricePerHour, userId, status — server owns these */
      });

      /* Store confirmed booking for Step 2 */
      dispatch(
        setConfirmedBooking({
          bookingId: result.bookingId ?? result.id,
          playerName: name.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
          sport: sportName,
          venue: venueName,
          court: courtName,
          date,
          timeSlot,
          durationHours,
          totalAmount: result.totalAmount,
          status: result.status,
          paymentStatus: result.paymentStatus,
          _isDemoData: result._isDemoData ?? false,
        }),
      );

      /* Advance to success step */
      dispatch(setModalStep(2));

      /* Trigger live availability refresh so the grid reflects the new booking */
      dispatch(triggerAvailabilityRefresh());

      dispatch(
        showToast({
          message: `Booking confirmed! ID: ${result.bookingId ?? result.id}`,
          type: "success",
        }),
      );
    } catch (err) {
      /* 409 — slot was just taken */
      if (err?.status === 409) {
        setApiError(
          "This slot has just been booked. Please select another time.",
        );
      } else {
        const msg =
          err?.body?.message ??
          err?.message ??
          "Booking failed. Please try again.";
        setApiError(msg);
      }
      /* Step 2 is NEVER shown on error */
    } finally {
      setSubmitting(false);
      dispatch(setSubmittingBooking(false));
    }
  };

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0",
        flex: "1 1 auto",
        minHeight: 0,
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 1.5rem 1rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-primary)",
            }}
          >
            Confirm Your Booking
          </h2>
          <p
            id={descId}
            style={{
              margin: "3px 0 0",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            Step 1 of 2 — Fill in your details
          </p>
        </div>

        <button
          type="button"
          aria-label="Close booking form"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* ── Scrollable body ─────────────────────────────────── */}
      <div
        style={{
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          padding: "1.25rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        {/* Not-logged-in banner */}
        {!isLoggedIn && (
          <div
            role="note"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-primary-soft)",
              border: "1px solid var(--color-primary-border)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--fw-semibold)",
              color: "var(--brand-primary)",
            }}
          >
            <LogIn size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>
              You need to be logged in to complete this booking. Click Confirm
              to log in.
            </span>
          </div>
        )}

        {/* Date-in-past warning */}
        {dateInPast && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-danger-soft)",
              border: "1px solid rgba(220,38,38,0.28)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--fw-semibold)",
              color: "var(--brand-danger)",
            }}
          >
            <AlertCircle
              size={14}
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            />
            <span>
              The selected date is in the past. Please go back and choose a
              future date.
            </span>
          </div>
        )}

        {/* API error banner */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              key="api-error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-danger-soft)",
                border: "1px solid rgba(220,38,38,0.28)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--fw-semibold)",
                color: "var(--brand-danger)",
                overflow: "hidden",
              }}
            >
              <AlertCircle
                size={14}
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              />
              <span>{apiError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Booking summary */}
        <div
          style={{
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            padding: "0.9rem 1rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.6rem",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--fw-bold)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Booking Summary
          </p>

          <SummaryRow
            icon={MapPin}
            iconColor="var(--brand-secondary)"
            label="Venue"
            value={venueName}
          />
          <SummaryRow
            icon={CalendarDays}
            iconColor="var(--brand-accent)"
            label="Date"
            value={formatDate(date)}
          />
          <SummaryRow
            icon={Clock}
            iconColor="var(--brand-primary)"
            label="Time"
            value={timeLabel}
          />
          <SummaryRow
            icon={Clock}
            iconColor="var(--text-muted)"
            label="Court"
            value={courtName}
          />
          <SummaryRow
            icon={Clock}
            iconColor="var(--text-muted)"
            label="Sport"
            value={sportName}
          />

          {/* Price */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "0.75rem",
              paddingTop: "0.65rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                fontWeight: "var(--fw-medium)",
              }}
            >
              {isPeak && (
                <span
                  style={{
                    marginRight: "6px",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.62rem",
                    fontWeight: "var(--fw-bold)",
                    backgroundColor: "var(--slot-peak-bg)",
                    border: "1px solid var(--slot-peak-border)",
                    color: "var(--slot-peak-text)",
                  }}
                >
                  ⚡ Peak
                </span>
              )}
              {durationHours} {durationHours === 1 ? "hour" : "hours"} — Total
            </span>

            <span
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--fw-extrabold)",
                color:
                  pricePerHour === -1
                    ? "var(--text-muted)"
                    : "var(--brand-primary)",
              }}
            >
              {totalAmount != null ? formatPKR(totalAmount) : "—"}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--fw-semibold)",
              color: "var(--text-secondary)",
              letterSpacing: "0.03em",
            }}
          >
            Duration (max 4 hrs)
          </label>
          <DurationStepper
            value={durationHours}
            onChange={(v) => dispatch(setDurationHours(v))}
          />
        </div>

        {/* Player name */}
        <Field
          label="Player Name"
          htmlFor="bm-player-name"
          required
          error={errors.name}
        >
          <input
            id="bm-player-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((p) => ({ ...p, name: undefined }));
              setApiError("");
            }}
            placeholder="e.g. Ahmed Khan"
            autoComplete="name"
            aria-required="true"
            aria-invalid={!!errors.name}
            style={inputStyle(!!errors.name)}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--brand-primary)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = errors.name
                ? "var(--brand-danger)"
                : "var(--border-subtle)")
            }
          />
        </Field>

        {/* Phone */}
        <Field
          label="Phone Number"
          htmlFor="bm-phone"
          required
          error={errors.phone}
        >
          <input
            id="bm-phone"
            type="tel"
            value={phone}
            maxLength={11}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, '');
              if (val.startsWith('92') && val.length > 11) {
                val = '0' + val.slice(2);
              }
              val = val.slice(0, 11);
              setPhone(val);
              setErrors((p) => ({ ...p, phone: undefined }));
              setApiError("");
            }}
            placeholder="e.g. 03001234567"
            autoComplete="tel"
            aria-required="true"
            aria-invalid={!!errors.phone}
            style={inputStyle(!!errors.phone)}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--brand-primary)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = errors.phone
                ? "var(--brand-danger)"
                : "var(--border-subtle)")
            }
          />
        </Field>

        {/* Notes */}
        <Field label="Notes (optional)" htmlFor="bm-notes">
          <textarea
            id="bm-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requirements, equipment requests, etc."
            rows={3}
            style={{
              ...inputStyle(false),
              resize: "vertical",
              minHeight: "72px",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--brand-primary)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--border-subtle)")
            }
          />
        </Field>
      </div>

      {/* ── Footer / submit ─────────────────────────────────── */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexShrink: 0,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border-subtle)",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--fw-semibold)",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>

        <motion.button
          type="submit"
          /* The server validates the final amount at booking time. */
          disabled={submitting || dateInPast}
          whileHover={
            !reduced && !submitting && !dateInPast ? { scale: 1.03 } : {}
          }
          whileTap={
            !reduced && !submitting && !dateInPast ? { scale: 0.97 } : {}
          }
          transition={{ type: "spring", stiffness: 440, damping: 22 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "0.65rem 1.5rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid transparent",
            background:
              submitting || dateInPast
                ? "var(--bg-surface-elevated)"
                : "var(--gradient-cta)",
            color: submitting || dateInPast ? "var(--text-muted)" : "#fff",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--fw-bold)",
            boxShadow:
              submitting || dateInPast ? "none" : "var(--shadow-brand)",
            cursor:
              submitting || dateInPast
                ? submitting
                  ? "wait"
                  : "not-allowed"
                : "pointer",
            transition: "background var(--transition-fast)",
          }}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  border: "2px solid var(--text-muted)",
                  borderTopColor: "var(--brand-primary)",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Confirming…
            </>
          ) : !isLoggedIn ? (
            <>
              <LogIn size={15} aria-hidden="true" />
              Log in to Book
            </>
          ) : (
            <>
              <CheckCircle2 size={15} aria-hidden="true" />
              Confirm Booking
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 2 — SUCCESS SCREEN
   Only reached when the API call succeeds (201).
   Never shown on error.
═══════════════════════════════════════════════════════════════════════════ */
function StepSuccess({ titleId, descId, onClose, onBookAnother }) {
  const reduced = useReducedMotion();
  const booking = useSelector(
    (s) => s.booking.confirmedBooking ?? s.booking.lastConfirmedBooking,
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!booking?.bookingId) return;
    navigator.clipboard.writeText(booking.bookingId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  /* Guard: if somehow we get here without a confirmed booking, don't render */
  if (!booking) return null;

  const isDemo = booking._isDemoData === true;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 1.5rem 1rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-primary)",
            }}
          >
            {isDemo ? "Demo Booking Recorded" : "Booking Confirmed!"}
          </h2>
          <p
            id={descId}
            style={{
              margin: "3px 0 0",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            {isDemo
              ? "Demo mode — no real court reserved"
              : "Step 2 of 2 — Your court is reserved"}
          </p>
        </div>

        <button
          type="button"
          aria-label="Close booking confirmation"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div
        style={{
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        {/* Success badge */}
        <motion.div
          initial={reduced ? {} : { scale: 0.7, opacity: 0 }}
          animate={reduced ? {} : { scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 18,
            delay: 0.05,
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.65rem",
            padding: "1.5rem",
            borderRadius: "var(--radius-xl)",
            backgroundColor: "var(--bg-surface-elevated)",
            border: `1px solid ${isDemo ? "rgba(217,119,6,0.4)" : "var(--slot-available-border)"}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: isDemo
                ? "rgba(217,119,6,0.12)"
                : "var(--slot-available-bg)",
              border: `2px solid ${isDemo ? "rgba(217,119,6,0.4)" : "var(--slot-available-border)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2
              size={28}
              color={
                isDemo ? "var(--brand-accent)" : "var(--slot-available-text)"
              }
              aria-hidden="true"
            />
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              fontWeight: "var(--fw-medium)",
            }}
          >
            {isDemo ? "Demo recorded for " : "Your slot has been reserved, "}
            <strong style={{ color: "var(--text-primary)" }}>
              {booking.playerName}
            </strong>
          </p>

          {/* Booking ID copy strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border-card)",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--fw-bold)",
                color: "var(--brand-primary)",
                letterSpacing: "0.06em",
              }}
            >
              {booking.bookingId}
            </span>
            <button
              type="button"
              aria-label={copied ? "Copied!" : "Copy booking ID"}
              onClick={handleCopy}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                borderRadius: "var(--radius-xs)",
                border: "none",
                backgroundColor: copied
                  ? "var(--slot-available-bg)"
                  : "var(--bg-surface-elevated)",
                color: copied
                  ? "var(--slot-available-text)"
                  : "var(--text-muted)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background-color var(--transition-fast)",
              }}
            >
              {copied ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <Copy size={13} aria-hidden="true" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Booking details */}
        <div
          style={{
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            padding: "0.9rem 1rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.6rem",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--fw-bold)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Booking Details
          </p>

          <SummaryRow
            icon={User}
            iconColor="var(--brand-secondary)"
            label="Name"
            value={booking.playerName}
          />
          <SummaryRow
            icon={Phone}
            iconColor="var(--text-muted)"
            label="Phone"
            value={booking.phone}
          />
          <SummaryRow
            icon={MapPin}
            iconColor="var(--brand-secondary)"
            label="Venue"
            value={booking.venue}
          />
          <SummaryRow
            icon={CalendarDays}
            iconColor="var(--brand-accent)"
            label="Date"
            value={formatDate(booking.date)}
          />
          <SummaryRow
            icon={Clock}
            iconColor="var(--brand-primary)"
            label="Time"
            value={
              typeof booking.timeSlot === "object"
                ? booking.timeSlot?.label
                : booking.timeSlot
            }
          />
          <SummaryRow
            icon={Clock}
            iconColor="var(--text-muted)"
            label="Court"
            value={booking.court}
          />
          <SummaryRow
            icon={Clock}
            iconColor="var(--text-muted)"
            label="Duration"
            value={`${booking.durationHours} ${booking.durationHours === 1 ? "hr" : "hrs"}`}
          />

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.75rem",
              paddingTop: "0.65rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                fontWeight: "var(--fw-medium)",
              }}
            >
              Total Amount
            </span>
            <span
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--fw-extrabold)",
                color: "var(--brand-primary)",
              }}
            >
              {formatPKR(booking.totalAmount)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {booking.notes && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <FileText
              size={14}
              color="var(--text-muted)"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {booking.notes}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <p
          style={{
            margin: 0,
            fontSize: "0.68rem",
            color: isDemo ? "var(--brand-accent)" : "var(--text-faint)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {isDemo
            ? "⚠️ Demo booking — no real court has been reserved. Connect the backend to enable live bookings."
            : "✅ Your booking is confirmed and saved. Show this ID at the venue."}
        </p>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "0.75rem",
          justifyContent: "flex-end",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onBookAnother}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border-subtle)",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--fw-semibold)",
            cursor: "pointer",
          }}
        >
          Book Another Slot
        </button>

        {!isDemo && (
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              onClose();
              window.location.href = "/dashboard";
            }}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--brand-primary)",
              backgroundColor: "var(--color-primary-soft)",
              color: "var(--brand-primary)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--fw-bold)",
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            My Bookings
          </a>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "0.65rem 1.5rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid transparent",
            background: "var(--gradient-cta)",
            color: "#fff",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--fw-bold)",
            boxShadow: "var(--shadow-brand)",
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT MODAL WRAPPER
═══════════════════════════════════════════════════════════════════════════ */
const BookingModal = () => {
  const dispatch = useDispatch();
  const reduced = useReducedMotion();
  const isOpen = useSelector((s) => s.booking.isBookingModalOpen);
  const step = useSelector(selectModalStep);

  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (isOpen && !wasOpenRef.current)
      previousFocusRef.current = document.activeElement;
    if (!isOpen && wasOpenRef.current) {
      const previousFocus = previousFocusRef.current;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useFocusTrap(modalRef, isOpen);

  /* Escape closes modal (step 1 only) */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape" && step === 1) handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step]);

  /* Preserve the page's prior scroll behavior while the dialog is active. */
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleClose = () => {
    dispatch(setBookingModalOpen(false));
    dispatch(resetBookingPanel());
  };

  const handleBookAnother = () => {
    dispatch(setBookingModalOpen(false));
    dispatch(resetBookingPanel());
    setTimeout(() => {
      const el = document.getElementById("availability");
      if (el)
        el.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
    }, 280);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22 }}
            onClick={step === 1 ? handleClose : undefined}
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "var(--overlay-bg)",
              zIndex: "var(--z-overlay)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
            }}
          />

          {/* Panel */}
          <motion.div
            key="bm-panel"
            className="booking-modal-container"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }
            }
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 340, damping: 28 }
            }
            style={{
              position: "fixed",
              inset: 0,
              zIndex: "var(--z-modal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
              pointerEvents: "none",
            }}
          >
            <div
              className="booking-dialog-panel"
              style={{
                pointerEvents: "all",
                width: "100%",
                maxWidth: "560px",
                maxHeight: "min(90dvh, 820px)",
                borderRadius: "var(--radius-2xl)",
                backgroundColor: "var(--bg-surface-card)",
                border: "1px solid var(--border-card)",
                boxShadow: "0 32px 64px -12px rgba(0,0,0,0.55)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step-1"
                    initial={reduced ? {} : { opacity: 0, x: -20 }}
                    animate={reduced ? {} : { opacity: 1, x: 0 }}
                    exit={reduced ? {} : { opacity: 0, x: 20 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: "1 1 auto",
                      minHeight: 0,
                      height: "100%",
                      maxHeight: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <StepDetails
                      titleId={titleId}
                      descId={descId}
                      onClose={handleClose}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-2"
                    initial={reduced ? {} : { opacity: 0, x: 20 }}
                    animate={reduced ? {} : { opacity: 1, x: 0 }}
                    exit={reduced ? {} : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: "1 1 auto",
                      minHeight: 0,
                      height: "100%",
                      maxHeight: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <StepSuccess
                      titleId={titleId}
                      descId={descId}
                      onClose={handleClose}
                      onBookAnother={handleBookAnother}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BookingModal;
