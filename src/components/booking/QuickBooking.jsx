import React, { useState, useId, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedSport,
  setSelectedVenue,
  setSelectedDate,
  openBookingPanel,
  closeBookingPanel,
  resetBooking,
  selectSelectedSport,
  selectSelectedVenue,
  selectSelectedDate,
  selectIsBookingPanelOpen,
  selectIsBookingValid,
} from "../../features/booking/bookingSlice";
import { getSports, getVenues } from "../../services/bookingService";
import Button from "../common/Button";
import {
  Trophy,
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  Zap,
  Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────────────────────────── */
const pad = (n) => String(n).padStart(2, "0");

const getDateStr = (daysAhead = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const friendlyDate = (str) => {
  if (!str) return "";
  try {
    const [y, m, d] = str.split("-");
    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return str;
  }
};

/* ─────────────────────────────────────────────────────────────
   MOTION VARIANTS
───────────────────────────────────────────────────────────── */
const panelVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.44, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

const fieldVariants = (i) => ({
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 },
  },
});

const shakeVariants = {
  rest: {},
  shake: {
    x: [0, -7, 7, -5, 5, -3, 3, 0],
    transition: { duration: 0.45 },
  },
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
  },
};

const errorTagVariants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: "auto",
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: { opacity: 0, height: 0, transition: { duration: 0.15 } },
};

/* ─────────────────────────────────────────────────────────────
   STYLED FIELD WRAPPER
   Handles border/shadow for default / hover / focus / error / filled
───────────────────────────────────────────────────────────── */
const FieldWrap = ({
  children,
  error,
  filled,
  label,
  htmlFor,
  icon: Icon,
  iconColor,
}) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const borderColor = error
    ? "var(--color-danger)"
    : focused
      ? "var(--border-focus)"
      : hovered
        ? "var(--border-hover)"
        : filled
          ? "var(--brand-primary)"
          : "var(--border-subtle)";

  const boxShadow = error
    ? "0 0 0 3px rgba(220,38,38,0.14)"
    : focused
      ? "var(--shadow-input-focus)"
      : "none";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      {/* Label */}
      <label
        htmlFor={htmlFor}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-bold)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: error ? "var(--brand-danger)" : "var(--text-muted)",
          marginBottom: "0.4rem",
          userSelect: "none",
          transition: "color var(--transition-fast)",
        }}
      >
        <Icon
          size={12}
          aria-hidden="true"
          color={error ? "var(--brand-danger)" : iconColor}
        />
        {label}
      </label>

      {/* Input wrapper */}
      <div
        style={{
          position: "relative",
          borderRadius: "var(--radius-md)",
          border: `1.5px solid ${borderColor}`,
          boxShadow,
          backgroundColor: filled
            ? "var(--color-primary-soft)"
            : "var(--bg-input)",
          transition: [
            "border-color var(--transition-fast)",
            "box-shadow var(--transition-fast)",
            "background-color var(--transition-fast)",
          ].join(", "),
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   INLINE ERROR MESSAGE  (animated)
───────────────────────────────────────────────────────────── */
const FieldError = ({ message, reduced }) => (
  <motion.div
    role="alert"
    variants={reduced ? {} : errorTagVariants}
    initial="hidden"
    animate="show"
    exit="exit"
    style={{
      display: "flex",
      alignItems: "center",
      gap: "5px",
      marginTop: "0.35rem",
      fontSize: "var(--text-xs)",
      color: "var(--brand-danger)",
      fontWeight: "var(--fw-semibold)",
    }}
  >
    <AlertCircle size={12} aria-hidden="true" />
    {message}
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   QUICK DATE PILL BUTTON
───────────────────────────────────────────────────────────── */
const DatePill = ({ label, active, onClick, reduced }) => (
  <motion.button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className="filter-pill"
    whileHover={reduced ? {} : { scale: 1.05 }}
    whileTap={reduced ? {} : { scale: 0.94 }}
    transition={{ type: "spring", stiffness: 480, damping: 22 }}
  >
    {label}
  </motion.button>
);

/* ─────────────────────────────────────────────────────────────
   SUMMARY CHIP  (used in confirmed state)
───────────────────────────────────────────────────────────── */
const SummaryChip = ({ icon: Icon, iconColor, eyebrow, value, sub }) => (
  <div
    style={{
      padding: "0.85rem 1rem",
      borderRadius: "var(--radius-md)",
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    }}
  >
    <span
      style={{
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-bold)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {eyebrow}
    </span>
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--fw-bold)",
        color: "var(--text-primary)",
      }}
    >
      <Icon size={14} color={iconColor} aria-hidden="true" />
      {value}
    </span>
    {sub && (
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {sub}
      </span>
    )}
  </div>
);

/* ═════════════════════════════════════════════════════════════
   QUICK BOOKING  — main export
═════════════════════════════════════════════════════════════ */
const QuickBooking = ({
  className = "",
  style: styleProp = {},
  onCheckAvailability,
}) => {
  const dispatch = useDispatch();
  const reduced = useReducedMotion();

  /* Redux state */
  const selectedSport = useSelector(selectSelectedSport);
  const selectedVenue = useSelector(selectSelectedVenue);
  const selectedDate = useSelector(selectSelectedDate);
  const isBookingPanelOpen = useSelector(selectIsBookingPanelOpen);
  const isBookingValid = useSelector(selectIsBookingValid);
  const themeMode = useSelector((state) => state.theme?.mode) || "light";
  const isDark = themeMode === "dark";

  /* ── Auto-open panel when arriving with a pre-filled selection ───────────
     Scenario: user taps "Check Availability" on /venues/:venueId, which
     pre-selects the venue in Redux then navigates home.  If all three
     fields are already valid on mount we open the panel immediately so
     the user lands in the "Selection confirmed" view.
     The ref prevents this from firing again after a manual reset/re-submit.
  ─────────────────────────────────────────────────────────────────────────── */
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (!didAutoOpen.current && isBookingValid && !isBookingPanelOpen) {
      didAutoOpen.current = true;
      dispatch(openBookingPanel());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only — isBookingValid captured via closure

  /* Local UI state */
  const [attempted, setAttempted] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [sports, setSports] = useState([]);
  const [venuesData, setVenuesData] = useState([]);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSports(), getVenues()])
      .then(([apiSports, apiVenues]) => {
        if (cancelled) return;
        setSports(
          apiSports.map((sport, index) => ({
            ...sport,
            players: `${sport.courtCount} active courts`,
            color: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"][
              index % 5
            ],
          })),
        );
        setVenuesData(
          apiVenues.map((venue) => ({
            ...venue,
            shortName: venue.shortName ?? venue.name,
            courts: venue.courts ?? [],
            sports: venue.sports ?? [
              ...new Set((venue.courts ?? []).map((court) => court.sport)),
            ],
            availableCourts: venue.courts?.length ?? 0,
          })),
        );
      })
      .catch((err) => {
        if (!cancelled)
          setDataError(err.message || "Failed to load booking options.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Stable IDs for accessibility */
  const uid = useId();
  const sportId = `${uid}-sport`;
  const venueId = `${uid}-venue`;
  const dateId = `${uid}-date`;
  const errorBannerId = `${uid}-error-banner`;

  /* Date helpers */
  const todayStr = getDateStr(0);
  const tomorrowStr = getDateStr(1);
  const weekendStr = getDateStr(2);

  /* Derived */
  const activeSport = sports.find((s) => s.id === selectedSport);
  const activeVenue = venuesData.find((v) => v.id === selectedVenue);

  /* Validation */
  const errors = {
    sport: attempted && !selectedSport,
    venue: attempted && !selectedVenue,
    date: attempted && !selectedDate,
  };
  const hasErrors = errors.sport || errors.venue || errors.date;

  /* Handlers */
  const handleSubmit = (e) => {
    e.preventDefault();
    setAttempted(true);
    if (!selectedSport || !selectedVenue || !selectedDate) {
      if (!reduced) setShakeKey((k) => k + 1);
      return;
    }
    dispatch(openBookingPanel());
    onCheckAvailability?.({
      sport: selectedSport,
      venue: selectedVenue,
      date: selectedDate,
    });
  };

  const handleReset = () => {
    dispatch(resetBooking());
    setAttempted(false);
    didAutoOpen.current = false; // allow auto-open again after a fresh selection
  };

  const handleModify = () => {
    dispatch(closeBookingPanel());
    setAttempted(false);
  };

  const scrollToAvailability = () => {
    const el = document.getElementById("availability");
    if (!el) return;
    const navH = document.querySelector("header")?.offsetHeight ?? 72;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - navH - 8,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const clearField = (field) => {
    if (field === "sport") dispatch(setSelectedSport(""));
    if (field === "venue") dispatch(setSelectedVenue(""));
    if (field === "date") dispatch(setSelectedDate(""));
    if (attempted) setAttempted(false);
  };

  /* ── Common select inner styles ── */
  const selectStyle = {
    width: "100%",
    padding: "0.72rem 2.4rem 0.72rem 0.9rem",
    fontSize: "var(--text-sm)",
    fontWeight: "var(--fw-medium)",
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-input)",
    border: "none",
    outline: "none",
    appearance: "none",
    cursor: "pointer",
    lineHeight: 1.4,
    /* Force the OS popup into light mode so options always show
       dark text (#1e293b) on a white background — see index.css */
    colorScheme: "light",
  };

  const dateInputStyle = {
    width: "100%",
    padding: "0.72rem 0.9rem",
    fontSize: "var(--text-sm)",
    fontWeight: "var(--fw-medium)",
    color: "var(--text-primary)",
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    cursor: "pointer",
    lineHeight: 1.4,
    colorScheme: isDark ? "dark" : "light",
  };

  /* ──────────────────────────────────────────────────────────
     CONFIRMED STATE
  ─────────────────────────────────────────────────────────── */
  if (isBookingPanelOpen && isBookingValid) {
    return (
      <motion.div
        key="confirmed"
        variants={reduced ? {} : successVariants}
        initial="hidden"
        animate="show"
        style={{
          borderRadius: "var(--radius-xl)",
          backgroundColor: "var(--bg-surface-card)",
          border: "2px solid var(--brand-primary)",
          boxShadow: "0 0 0 4px var(--color-primary-soft), var(--shadow-lg)",
          overflow: "hidden",
          ...styleProp,
        }}
        className={className}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            backgroundColor: "var(--color-primary-soft)",
            borderBottom: "1px solid var(--color-primary-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <motion.div
              initial={reduced ? {} : { scale: 0, rotate: -30 }}
              animate={reduced ? {} : { scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 18,
                delay: 0.08,
              }}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                backgroundColor: "rgba(16,185,129,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircle2
                size={20}
                color="var(--brand-primary)"
                aria-hidden="true"
              />
            </motion.div>
            <div>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--fw-bold)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--brand-primary)",
                }}
              >
                Selection Confirmed
              </div>
              <div
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--fw-extrabold)",
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                Scroll down to pick your court &amp; time slot
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleModify}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--fw-semibold)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-card)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Modify
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset all selections"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "0.4rem 0.9rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--fw-semibold)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-card)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={11} aria-hidden="true" /> Reset
            </button>
          </div>
        </div>

        {/* Summary chips */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.65rem",
          }}
        >
          <SummaryChip
            icon={Trophy}
            iconColor="var(--brand-primary)"
            eyebrow={activeSport?.isExperience ? "Experience" : "Sport"}
            value={activeSport?.name ?? selectedSport}
            sub={
              activeSport && activeSport.startingPrice != null
                ? `From Rs. ${Number(activeSport.startingPrice).toLocaleString()}/hr`
                : undefined
            }
          />
          <SummaryChip
            icon={MapPin}
            iconColor="var(--brand-secondary)"
            eyebrow="Venue"
            value={activeVenue?.shortName ?? selectedVenue}
            sub={activeVenue?.location}
          />
          <SummaryChip
            icon={Calendar}
            iconColor="var(--brand-accent)"
            eyebrow="Date"
            value={friendlyDate(selectedDate)}
            sub={
              selectedDate === todayStr
                ? "Today"
                : selectedDate === tomorrowStr
                  ? "Tomorrow"
                  : "Scheduled"
            }
          />
        </div>

        {/* CTA footer */}
        <div
          style={{
            padding: "0 1.5rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              margin: 0,
              maxWidth: "42ch",
            }}
          >
            All criteria verified. Scroll down to view available courts and lock
            a time slot.
          </p>
          <motion.div
            whileHover={reduced ? {} : { scale: 1.03 }}
            whileTap={reduced ? {} : { scale: 0.96 }}
            transition={{ type: "spring", stiffness: 440, damping: 22 }}
          >
            <Button
              variant="glow"
              size="md"
              onClick={scrollToAvailability}
              rightIcon={<ArrowRight size={15} aria-hidden="true" />}
            >
              View Available Slots
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  /* ──────────────────────────────────────────────────────────
     FORM STATE
  ─────────────────────────────────────────────────────────── */
  return (
    <motion.div
      key="form"
      variants={reduced ? {} : panelVariants}
      initial="hidden"
      animate="show"
      style={{
        borderRadius: "var(--radius-xl)",
        backgroundColor: "var(--bg-surface-card)",
        border: "1px solid var(--border-card)",
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
        ...styleProp,
      }}
      className={className}
    >
      {/* ── Panel header ─────────────────────────────────────── */}
      <div
        style={{
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-primary-soft)",
              color: "var(--brand-primary)",
              flexShrink: 0,
            }}
          >
            <Search size={14} aria-hidden="true" />
          </span>
          <div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--fw-bold)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Quick Arena Search
            </div>
            <div
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--fw-semibold)",
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              Choose sport, venue &amp; date — we'll show available courts
            </div>
          </div>
        </div>

        {/* Venue count badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--text-secondary)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "var(--brand-primary)",
              animation: "livePulse 2s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
          {venuesData.length} venues · {sports.length} sports
        </div>
      </div>

      {/* ── Form body ────────────────────────────────────────── */}
      <div style={{ padding: "1.5rem" }}>
        {dataError && (
          <p role="alert" style={{ color: "var(--brand-danger)" }}>
            {dataError}
          </p>
        )}

        {/* Global error banner */}
        <AnimatePresence>
          {attempted && hasErrors && (
            <motion.div
              key="error-banner"
              id={errorBannerId}
              role="alert"
              aria-live="assertive"
              initial={reduced ? {} : { opacity: 0, y: -8, height: 0 }}
              animate={reduced ? {} : { opacity: 1, y: 0, height: "auto" }}
              exit={reduced ? {} : { opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
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
                fontWeight: "var(--fw-semibold)",
                color: "var(--brand-danger)",
                overflow: "hidden",
              }}
            >
              <AlertCircle
                size={14}
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              />
              <span>
                Please select a{" "}
                {[
                  !selectedSport && "sport",
                  !selectedVenue && "venue",
                  !selectedDate && "date",
                ]
                  .filter(Boolean)
                  .join(", ")}{" "}
                to continue.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form fields */}
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-describedby={attempted && hasErrors ? errorBannerId : undefined}
        >
          {/* ── Fields row ────────────────────────────────────── */}
          <motion.div
            key={shakeKey}
            variants={reduced ? {} : shakeVariants}
            animate={attempted && hasErrors && !reduced ? "shake" : "rest"}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              alignItems: "flex-start",
              marginBottom: "1.25rem",
            }}
          >
            {/* ── SPORT ── */}
            <motion.div
              variants={reduced ? {} : fieldVariants(0)}
              initial="hidden"
              animate="show"
            >
              <FieldWrap
                htmlFor={sportId}
                label="Sport"
                icon={Trophy}
                iconColor="var(--brand-primary)"
                error={errors.sport}
                filled={!!selectedSport}
              >
                <select
                  id={sportId}
                  value={selectedSport}
                  onChange={(e) => {
                    const newSport = e.target.value;
                    dispatch(setSelectedSport(newSport));

                    /* If the currently-selected venue doesn't offer the
                       new sport, clear it so the user gets an honest
                       venue dropdown rather than a disabled-option mismatch. */
                    if (newSport && selectedVenue) {
                      const venue = venuesData.find(
                        (v) => v.id === selectedVenue,
                      );
                      if (venue && !venue.sports.includes(newSport)) {
                        dispatch(setSelectedVenue(""));
                      }
                    }

                    if (attempted) setAttempted(false);
                  }}
                  aria-invalid={errors.sport}
                  aria-required="true"
                  style={selectStyle}
                >
                  <option value="">Choose a sport…</option>
                  <optgroup label="Available court sports">
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.startingPrice != null
                          ? ` — from Rs. ${Number(s.startingPrice).toLocaleString()}/hr`
                          : ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {/* Chevron icon overlay */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: "0.7rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: selectedSport
                      ? "var(--brand-primary)"
                      : "var(--text-faint)",
                    display: "flex",
                  }}
                >
                  <ChevronDown size={15} />
                </span>
              </FieldWrap>

              <AnimatePresence>
                {errors.sport && (
                  <FieldError
                    message="Please select a sport"
                    reduced={reduced}
                  />
                )}
              </AnimatePresence>

              {/* Selected sport quick-info */}
              <AnimatePresence>
                {activeSport && (
                  <motion.div
                    key={activeSport.id}
                    initial={reduced ? {} : { opacity: 0, height: 0 }}
                    animate={reduced ? {} : { opacity: 1, height: "auto" }}
                    exit={reduced ? {} : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      marginTop: "0.45rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: `${activeSport.color ?? "#3b82f6"}14`,
                      border: `1px solid ${activeSport.color ?? "#3b82f6"}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: activeSport.color ?? "var(--brand-primary)",
                        fontWeight: "var(--fw-semibold)",
                      }}
                    >
                      {activeSport.players}
                    </span>
                    <button
                      type="button"
                      onClick={() => clearField("sport")}
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0 2px",
                      }}
                      aria-label={`Clear sport selection: ${activeSport.name}`}
                    >
                      ✕
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── VENUE ── */}
            <motion.div
              variants={reduced ? {} : fieldVariants(1)}
              initial="hidden"
              animate="show"
            >
              <FieldWrap
                htmlFor={venueId}
                label="Venue"
                icon={MapPin}
                iconColor="var(--brand-secondary)"
                error={errors.venue}
                filled={!!selectedVenue}
              >
                <select
                  id={venueId}
                  value={selectedVenue}
                  onChange={(e) => {
                    dispatch(setSelectedVenue(e.target.value));
                    if (attempted) setAttempted(false);
                  }}
                  aria-invalid={errors.venue}
                  aria-required="true"
                  style={selectStyle}
                >
                  <option value="">Choose a venue…</option>
                  {venuesData.map((v) => {
                    const offersSelectedSport =
                      !selectedSport || v.sports.includes(selectedSport);
                    return (
                      <option
                        key={v.id}
                        value={v.id}
                        disabled={!offersSelectedSport}
                      >
                        {v.shortName}
                        {offersSelectedSport ? "" : " (sport not offered)"}
                      </option>
                    );
                  })}
                </select>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: "0.7rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: selectedVenue
                      ? "var(--brand-secondary)"
                      : "var(--text-faint)",
                    display: "flex",
                  }}
                >
                  <ChevronDown size={15} />
                </span>
              </FieldWrap>

              <AnimatePresence>
                {errors.venue && (
                  <FieldError
                    message="Please select a venue"
                    reduced={reduced}
                  />
                )}
              </AnimatePresence>

              {/* Selected venue quick-info */}
              <AnimatePresence>
                {activeVenue && (
                  <motion.div
                    key={activeVenue.id}
                    initial={reduced ? {} : { opacity: 0, height: 0 }}
                    animate={reduced ? {} : { opacity: 1, height: "auto" }}
                    exit={reduced ? {} : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      marginTop: "0.45rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--color-secondary-soft)",
                      border: "1px solid rgba(2,132,199,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--brand-secondary)",
                        fontWeight: "var(--fw-semibold)",
                      }}
                    >
                      <Clock
                        size={10}
                        style={{ display: "inline", marginRight: "3px" }}
                        aria-hidden="true"
                      />
                      {activeVenue.operatingHours ?? "Open hours vary"} ·{" "}
                      {activeVenue.availableCourts} courts
                    </span>
                    <button
                      type="button"
                      onClick={() => clearField("venue")}
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0 2px",
                      }}
                      aria-label={`Clear venue selection: ${activeVenue.shortName}`}
                    >
                      ✕
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── DATE ── */}
            <motion.div
              variants={reduced ? {} : fieldVariants(2)}
              initial="hidden"
              animate="show"
            >
              <FieldWrap
                htmlFor={dateId}
                label="Date"
                icon={Calendar}
                iconColor="var(--brand-accent)"
                error={errors.date}
                filled={!!selectedDate}
              >
                <input
                  id={dateId}
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => {
                    dispatch(setSelectedDate(e.target.value));
                    if (attempted) setAttempted(false);
                  }}
                  onClick={(e) => {
                    try {
                      e.target.showPicker?.();
                    } catch {
                      // noop if showPicker throws or is already open
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      try {
                        e.target.showPicker?.();
                      } catch {}
                    }
                  }}
                  aria-invalid={errors.date}
                  aria-required="true"
                  style={dateInputStyle}
                />
              </FieldWrap>

              <AnimatePresence>
                {errors.date && (
                  <FieldError
                    message="Please select a date"
                    reduced={reduced}
                  />
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── CTA BUTTON ── */}
            <motion.div
              variants={reduced ? {} : fieldVariants(3)}
              initial="hidden"
              animate="show"
              style={{
                paddingTop:
                  "calc(var(--text-xs) + 0.4rem + 1.65rem)" /* align with inputs */,
              }}
            >
              <motion.div
                whileHover={reduced ? {} : { scale: 1.02 }}
                whileTap={reduced ? {} : { scale: 0.96 }}
                transition={{ type: "spring", stiffness: 440, damping: 22 }}
              >
                <Button
                  type="submit"
                  variant="glow"
                  size="lg"
                  fullWidth
                  leftIcon={<Search size={16} aria-hidden="true" />}
                  style={{ height: "50px" }}
                >
                  Check Availability
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ── Footer: quick date picks + trust badges ──────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            {/* Date quick-picks */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  fontWeight: "var(--fw-medium)",
                }}
              >
                Quick pick:
              </span>
              {[
                { label: "Today", val: todayStr },
                { label: "Tomorrow", val: tomorrowStr },
                { label: "Weekend", val: weekendStr },
              ].map(({ label, val }) => (
                <DatePill
                  key={val}
                  label={label}
                  active={selectedDate === val}
                  reduced={reduced}
                  onClick={() => {
                    dispatch(setSelectedDate(val));
                    if (attempted) setAttempted(false);
                  }}
                />
              ))}
              {(selectedSport || selectedVenue || selectedDate) && (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: "4px 6px",
                    fontWeight: "var(--fw-medium)",
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Trust micro-badges */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              {[
                { icon: Zap, label: "Instant Lock" },
                { icon: CheckCircle2, label: "No prepayment" },
                { icon: Clock, label: "Open 20hrs" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    fontWeight: "var(--fw-medium)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon
                    size={12}
                    color="var(--brand-primary)"
                    aria-hidden="true"
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default QuickBooking;
