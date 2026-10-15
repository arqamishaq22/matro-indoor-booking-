/**
 * demoAvailability.js
 * ─────────────────────────────────────────────────────────────────────────
 * STATUS:  Development/mock fixture only. Production availability is served by the API.
 *          Slot statuses are static illustrative values — they do not
 *          reflect real court availability.
 *
 * The shapes below are retained for local UI experiments and are not imported
 * by production components.
 *
 * ─── API CONTRACT (when backend is ready) ────────────────────────────────
 *
 * TimeSlot {
 *   time:    string   e.g. "09:00"
 *   label:   string   e.g. "09:00 – 10:00"
 *   period:  'morning' | 'afternoon' | 'evening' | 'night'
 *   isPeak:  boolean  true = 17:00–05:00 premium pricing period
 * }
 *
 * SlotStatus = 'available' | 'booked' | 'limited' | 'reserved' | 'maintenance'
 *
 * CourtRow {
 *   id:     string
 *   name:   string
 *   sport:  string   — matches sport IDs in venues.js / sports.js
 *   slots:  Record<TimeSlot.time, SlotStatus>
 * }
 *
 * VenueSchedule {
 *   venueId:   string
 *   venueName: string
 *   date:      string  ISO "YYYY-MM-DD"
 *   courts:    CourtRow[]
 *   timeSlots: TimeSlot[]
 *   _isDemoData: true
 * }
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ─── Time columns — same for every venue ────────────────────────────── */
export const DEMO_TIME_SLOTS = [
  { time: '07:00', label: '07:00 – 08:00', period: 'morning',   isPeak: false },
  { time: '09:00', label: '09:00 – 10:00', period: 'morning',   isPeak: false },
  { time: '11:00', label: '11:00 – 12:00', period: 'morning',   isPeak: false },
  { time: '13:00', label: '13:00 – 14:00', period: 'afternoon', isPeak: false },
  { time: '15:00', label: '15:00 – 16:00', period: 'afternoon', isPeak: false },
  { time: '17:00', label: '17:00 – 18:00', period: 'evening',   isPeak: true  },
  { time: '18:00', label: '18:00 – 19:00', period: 'evening',   isPeak: true  },
  { time: '19:00', label: '19:00 – 20:00', period: 'evening',   isPeak: true  },
  { time: '20:00', label: '20:00 – 21:00', period: 'evening',   isPeak: true  },
  { time: '21:00', label: '21:00 – 22:00', period: 'evening',   isPeak: true  },
  { time: '23:00', label: '23:00 – 00:00', period: 'night',     isPeak: false },
  { time: '01:00', label: '01:00 – 02:00', period: 'night',     isPeak: false },
];

/* ─── Period display metadata ─────────────────────────────────────────── */
export const PERIOD_META = {
  morning:   { label: 'Morning',    color: 'var(--brand-secondary)' },
  afternoon: { label: 'Afternoon',  color: 'var(--brand-accent)'    },
  evening:   { label: 'Evening',    color: 'var(--brand-primary)'   },
  night:     { label: 'Late Night', color: 'var(--text-muted)'      },
};

/* ─── Slot status labels + visual config ─────────────────────────────── */
export const SLOT_STATUS_META = {
  available:   { label: 'Available',   ariaLabel: 'Available',              bookable: true  },
  limited:     { label: 'Limited',     ariaLabel: 'Limited — filling fast', bookable: true  },
  booked:      { label: 'Booked',      ariaLabel: 'Booked — not available', bookable: false },
  reserved:    { label: 'Reserved',    ariaLabel: 'Reserved — held',        bookable: false },
  maintenance: { label: 'Maintenance', ariaLabel: 'Closed for maintenance', bookable: false },
};

/* ─── Helper ──────────────────────────────────────────────────────────── */
/** Returns true for slot statuses a user can click to book */
export function isBookableStatus(status) {
  return SLOT_STATUS_META[status]?.bookable ?? false;
}

/* ═══════════════════════════════════════════════════════════════════════
   DEMO SCHEDULES — one entry per venue
   Court IDs and sport strings match venues.js exactly.
   Sport strings match the 'sport' field on each court in venues.js
   (cricket | futsal | padel | pickleball | badminton).
═══════════════════════════════════════════════════════════════════════ */

/* ── FR DHA Phase 5 ─────────────────────────────────────────────────── */
const DHA_SCHEDULE = [
  {
    id:    'dha-c1',
    name:  'Box Cricket — Court 1',
    sport: 'cricket',
    slots: {
      '07:00': 'booked',     '09:00': 'available', '11:00': 'available',
      '13:00': 'available',  '15:00': 'limited',   '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'booked',    '20:00': 'limited',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'dha-c2',
    name:  'Box Cricket — Court 2',
    sport: 'cricket',
    slots: {
      '07:00': 'available',  '09:00': 'booked',    '11:00': 'available',
      '13:00': 'limited',    '15:00': 'available', '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'limited',   '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'dha-f1',
    name:  'Futsal Arena A',
    sport: 'futsal',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'booked',
      '13:00': 'available',  '15:00': 'maintenance','17:00': 'limited',
      '18:00': 'booked',     '19:00': 'booked',    '20:00': 'booked',
      '21:00': 'limited',    '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'dha-p1',
    name:  'Padel Glass Court 1',
    sport: 'padel',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'available',
      '13:00': 'booked',     '15:00': 'available', '17:00': 'booked',
      '18:00': 'limited',    '19:00': 'booked',    '20:00': 'available',
      '21:00': 'booked',     '23:00': 'limited',   '01:00': 'available',
    },
  },
  {
    id:    'dha-p2',
    name:  'Padel Glass Court 2',
    sport: 'padel',
    slots: {
      '07:00': 'limited',    '09:00': 'available', '11:00': 'booked',
      '13:00': 'available',  '15:00': 'reserved',  '17:00': 'available',
      '18:00': 'booked',     '19:00': 'limited',   '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'dha-p3',
    name:  'Padel Glass Court 3',
    sport: 'padel',
    slots: {
      '07:00': 'available',  '09:00': 'limited',   '11:00': 'available',
      '13:00': 'available',  '15:00': 'available', '17:00': 'limited',
      '18:00': 'available',  '19:00': 'booked',    '20:00': 'limited',
      '21:00': 'booked',     '23:00': 'available', '01:00': 'available',
    },
  },
];

/* ── FR Wapda Town ──────────────────────────────────────────────────── */
const WAPDA_SCHEDULE = [
  {
    id:    'wt-f1',
    name:  'Futsal Turf 1',
    sport: 'futsal',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'available',
      '13:00': 'booked',     '15:00': 'limited',   '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'booked',    '20:00': 'limited',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'wt-f2',
    name:  'Futsal Turf 2',
    sport: 'futsal',
    slots: {
      '07:00': 'booked',     '09:00': 'available', '11:00': 'limited',
      '13:00': 'available',  '15:00': 'available', '17:00': 'limited',
      '18:00': 'booked',     '19:00': 'limited',   '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'maintenance',
    },
  },
  {
    id:    'wt-c1',
    name:  'Cricket Cage 1',
    sport: 'cricket',
    slots: {
      '07:00': 'available',  '09:00': 'booked',    '11:00': 'available',
      '13:00': 'available',  '15:00': 'booked',    '17:00': 'booked',
      '18:00': 'reserved',   '19:00': 'booked',    '20:00': 'booked',
      '21:00': 'limited',    '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'wt-b1',
    name:  'Badminton Hall 1',
    sport: 'badminton',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'booked',
      '13:00': 'available',  '15:00': 'limited',   '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'available', '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'wt-b2',
    name:  'Badminton Hall 2',
    sport: 'badminton',
    slots: {
      '07:00': 'limited',    '09:00': 'available', '11:00': 'available',
      '13:00': 'booked',     '15:00': 'available', '17:00': 'booked',
      '18:00': 'limited',    '19:00': 'booked',    '20:00': 'available',
      '21:00': 'booked',     '23:00': 'available', '01:00': 'available',
    },
  },
];

/* ── FR Valencia ────────────────────────────────────────────────────── */
const VALENCIA_SCHEDULE = [
  {
    id:    'val-p1',
    name:  'Padel Arena 1',
    sport: 'padel',
    slots: {
      '07:00': 'available',  '09:00': 'limited',   '11:00': 'booked',
      '13:00': 'available',  '15:00': 'available', '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'limited',   '20:00': 'booked',
      '21:00': 'available',  '23:00': 'limited',   '01:00': 'available',
    },
  },
  {
    id:    'val-p2',
    name:  'Padel Arena 2',
    sport: 'padel',
    slots: {
      '07:00': 'booked',     '09:00': 'available', '11:00': 'available',
      '13:00': 'limited',    '15:00': 'booked',    '17:00': 'limited',
      '18:00': 'booked',     '19:00': 'booked',    '20:00': 'available',
      '21:00': 'booked',     '23:00': 'available', '01:00': 'maintenance',
    },
  },
  {
    id:    'val-pk1',
    name:  'Pickleball Court 1',
    sport: 'pickleball',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'limited',
      '13:00': 'booked',     '15:00': 'available', '17:00': 'booked',
      '18:00': 'limited',    '19:00': 'booked',    '20:00': 'available',
      '21:00': 'limited',    '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'val-c1',
    name:  'Box Cricket Court',
    sport: 'cricket',
    slots: {
      '07:00': 'available',  '09:00': 'booked',    '11:00': 'available',
      '13:00': 'available',  '15:00': 'reserved',  '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'booked',    '20:00': 'limited',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
];

/* ── Cross Courts ───────────────────────────────────────────────────── */
const CROSS_COURTS_SCHEDULE = [
  {
    id:    'cc-p1',
    name:  'Center Glass Court (Padel)',
    sport: 'padel',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'booked',
      '13:00': 'limited',    '15:00': 'available', '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'booked',    '20:00': 'limited',
      '21:00': 'booked',     '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'cc-p2',
    name:  'Padel Court 2',
    sport: 'padel',
    slots: {
      '07:00': 'limited',    '09:00': 'booked',    '11:00': 'available',
      '13:00': 'available',  '15:00': 'limited',   '17:00': 'booked',
      '18:00': 'limited',    '19:00': 'booked',    '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'cc-pk1',
    name:  'Pickleball Court Alpha',
    sport: 'pickleball',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'available',
      '13:00': 'booked',     '15:00': 'available', '17:00': 'limited',
      '18:00': 'booked',     '19:00': 'booked',    '20:00': 'limited',
      '21:00': 'booked',     '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'cc-pk2',
    name:  'Pickleball Court Beta',
    sport: 'pickleball',
    slots: {
      '07:00': 'booked',     '09:00': 'available', '11:00': 'limited',
      '13:00': 'available',  '15:00': 'booked',    '17:00': 'booked',
      '18:00': 'available',  '19:00': 'limited',   '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'cc-b1',
    name:  'Badminton Court 1',
    sport: 'badminton',
    slots: {
      '07:00': 'available',  '09:00': 'booked',    '11:00': 'available',
      '13:00': 'available',  '15:00': 'booked',    '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'available', '20:00': 'booked',
      '21:00': 'limited',    '23:00': 'available', '01:00': 'maintenance',
    },
  },
  {
    id:    'cc-b2',
    name:  'Badminton Court 2',
    sport: 'badminton',
    slots: {
      '07:00': 'limited',    '09:00': 'available', '11:00': 'booked',
      '13:00': 'limited',    '15:00': 'available', '17:00': 'booked',
      '18:00': 'limited',    '19:00': 'booked',    '20:00': 'available',
      '21:00': 'booked',     '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'cc-b3',
    name:  'Badminton Court 3',
    sport: 'badminton',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'available',
      '13:00': 'booked',     '15:00': 'limited',   '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'limited',   '20:00': 'booked',
      '21:00': 'available',  '23:00': 'reserved',  '01:00': 'available',
    },
  },
];

/* ── FR Sports Arena Sialkot ────────────────────────────────────────── */
const SIALKOT_SCHEDULE = [
  {
    id:    'skt-c1',
    name:  'Sialkot Cricket Pitch 1',
    sport: 'cricket',
    slots: {
      '07:00': 'available',  '09:00': 'limited',   '11:00': 'booked',
      '13:00': 'available',  '15:00': 'available', '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'limited',   '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'skt-c2',
    name:  'Sialkot Cricket Pitch 2',
    sport: 'cricket',
    slots: {
      '07:00': 'booked',     '09:00': 'available', '11:00': 'available',
      '13:00': 'limited',    '15:00': 'booked',    '17:00': 'limited',
      '18:00': 'booked',     '19:00': 'booked',    '20:00': 'available',
      '21:00': 'limited',    '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'skt-f1',
    name:  'Sialkot Futsal Arena',
    sport: 'futsal',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'limited',
      '13:00': 'booked',     '15:00': 'available', '17:00': 'booked',
      '18:00': 'limited',    '19:00': 'booked',    '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'skt-p1',
    name:  'Sialkot Glass Padel',
    sport: 'padel',
    slots: {
      '07:00': 'available',  '09:00': 'available', '11:00': 'booked',
      '13:00': 'available',  '15:00': 'limited',   '17:00': 'booked',
      '18:00': 'booked',     '19:00': 'available', '20:00': 'booked',
      '21:00': 'limited',    '23:00': 'available', '01:00': 'maintenance',
    },
  },
  {
    id:    'skt-b1',
    name:  'Badminton Hall 1',
    sport: 'badminton',
    slots: {
      '07:00': 'available',  '09:00': 'booked',    '11:00': 'available',
      '13:00': 'available',  '15:00': 'booked',    '17:00': 'booked',
      '18:00': 'available',  '19:00': 'booked',    '20:00': 'limited',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
  {
    id:    'skt-b2',
    name:  'Badminton Hall 2',
    sport: 'badminton',
    slots: {
      '07:00': 'limited',    '09:00': 'available', '11:00': 'booked',
      '13:00': 'available',  '15:00': 'available', '17:00': 'limited',
      '18:00': 'booked',     '19:00': 'limited',   '20:00': 'booked',
      '21:00': 'available',  '23:00': 'available', '01:00': 'available',
    },
  },
];

/* ─── Index: venueId → schedule ──────────────────────────────────────── */
export const DEMO_SCHEDULES = {
  'fr-dha-phase-5':         DHA_SCHEDULE,
  'fr-wapda-town':          WAPDA_SCHEDULE,
  'fr-valencia':            VALENCIA_SCHEDULE,
  'cross-courts':           CROSS_COURTS_SCHEDULE,
  'fr-sports-arena-sialkot': SIALKOT_SCHEDULE,
};

/* ─── Legacy exports — keep for backward-compat with existing imports ── */
/** @deprecated Use DEMO_SCHEDULES['fr-dha-phase-5'] */
export const DEMO_SCHEDULE   = DHA_SCHEDULE;
export const DEMO_VENUE_ID   = 'fr-dha-phase-5';
export const DEMO_VENUE_NAME = 'Matro DHA Phase 5';
