/**
 * pricing.js
 * ─────────────────────────────────────────────────────────────────────────
 * STATUS:  Development/mock fixture only. Production pricing comes from the API.
 *          These prices are illustrative based on the project specification.
 *          A real implementation must drive these from the backend:
 *          GET /api/v1/pricing?venue_id=&sport=
 *
 * STRUCTURE:
 *   PricingRule {
 *     id          string   unique ID
 *     venueId     string   venue this rule applies to
 *     courtType   string   human-readable court category
 *     sport       string   sport ID from sports.js
 *     weekdayDay  number   Mon–Thu, Off-Peak (05:00–17:00) — Rs/hr
 *     weekdayNight number  Mon–Thu, Peak     (17:00–05:00) — Rs/hr
 *     weekendDay  number   Fri–Sun, Off-Peak (05:00–17:00) — Rs/hr
 *     weekendNight number  Fri–Sun, Peak     (17:00–05:00) — Rs/hr
 *   }
 *
 * TIME PERIODS (from specification):
 *   Off-Peak:  05:00 AM – 05:00 PM
 *   Peak:      05:00 PM – 05:00 AM
 *
 * DAY GROUPS (from specification):
 *   Weekday:  Monday – Thursday
 *   Weekend:  Friday – Sunday
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Time period definitions
 * These are the canonical period boundaries used across the entire system.
 */
export const PEAK_START_HOUR = 17; // 5:00 PM
export const PEAK_END_HOUR   = 5;  // 5:00 AM  (next day)

export const TIME_PERIODS = [
  {
    id:    'off-peak',
    label: 'Off-Peak',
    hours: '05:00 AM – 05:00 PM',
    description: 'Standard rate — weekday daytime hours',
  },
  {
    id:    'peak',
    label: 'Peak',
    hours: '05:00 PM – 05:00 AM',
    description: 'Premium rate — evenings, nights, and weekends',
  },
];

export const DAY_GROUPS = [
  {
    id:    'weekday',
    label: 'Mon – Thu',
    days:  [1, 2, 3, 4], // JS getDay() values
  },
  {
    id:    'weekend',
    label: 'Fri – Sun',
    days:  [5, 6, 0],
  },
];

/**
 * Returns true if a given hour (0–23) is in the peak period.
 * Peak: 17:00 (5 PM) through 04:59 (just before 5 AM).
 */
export function isPeakHour(hour) {
  return hour >= PEAK_START_HOUR || hour < PEAK_END_HOUR;
}

/**
 * Returns true if a JS Date falls on a weekend day (Fri/Sat/Sun).
 */
export function isWeekendDay(date) {
  const day = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
  return day === 0 || day === 5 || day === 6;
}

/**
 * Pricing rules per venue.
 *
 * SOURCE: project specification pricing table.
 * Only courts/venues explicitly specified are included.
 * Prices are in Pakistani Rupees (PKR).
 *
 * Format:
 *   weekdayDay    Mon–Thu, Off-Peak  (day, 5am–5pm)
 *   weekdayNight  Mon–Thu, Peak      (night, 5pm–5am)
 *   weekendDay    Fri–Sun, Off-Peak  (day, 5am–5pm)
 *   weekendNight  Fri–Sun, Peak      (night, 5pm–5am)
 */
export const pricingRules = [
  /* ─── FR DHA Phase 5 ────────────────────────────────────── */
  {
    id:           'pr-dha-cricket',
    venueId:      'fr-dha-phase-5',
    courtType:    'Box Cricket Court',
    sport:        'cricket',
    weekdayDay:   2000,
    weekdayNight: 1750,
    weekendDay:   2500,
    weekendNight: 2250,
    note:         'Shock Pad Turf · enclosed arena',
  },
  {
    id:           'pr-dha-futsal',
    venueId:      'fr-dha-phase-5',
    courtType:    'Futsal Arena',
    sport:        'futsal',
    weekdayDay:   2500,
    weekdayNight: 2250,
    weekendDay:   3000,
    weekendNight: 2750,
    note:         '4G AstroTurf · full-size 5-a-side',
  },
  {
    id:           'pr-dha-padel',
    venueId:      'fr-dha-phase-5',
    courtType:    'Padel Glass Court',
    sport:        'padel',
    weekdayDay:   4000,
    weekdayNight: 2800,
    weekendDay:   4500,
    weekendNight: 3150,
    note:         'Panoramic Glass · climate controlled',
  },

  /* ─── FR Wapda Town ─────────────────────────────────────── */
  {
    id:           'pr-wt-futsal',
    venueId:      'fr-wapda-town',
    courtType:    'Futsal Turf',
    sport:        'futsal',
    weekdayDay:   2000,
    weekdayNight: 1800,
    weekendDay:   2500,
    weekendNight: 2200,
    note:         'AstroTurf · all-weather enclosure',
  },
  {
    id:           'pr-wt-cricket',
    venueId:      'fr-wapda-town',
    courtType:    'Cricket Cage',
    sport:        'cricket',
    weekdayDay:   1800,
    weekdayNight: 1600,
    weekendDay:   2200,
    weekendNight: 2000,
    note:         'Shock Pad Box Turf',
  },
  {
    id:           'pr-wt-badminton',
    venueId:      'fr-wapda-town',
    courtType:    'Badminton Hall',
    sport:        'badminton',
    weekdayDay:   1200,
    weekdayNight: 1000,
    weekendDay:   1500,
    weekendNight: 1300,
    note:         'Non-Slip Court Mats',
  },

  /* ─── FR Valencia ───────────────────────────────────────── */
  {
    id:           'pr-val-padel',
    venueId:      'fr-valencia',
    courtType:    'Padel Arena',
    sport:        'padel',
    weekdayDay:   4000,
    weekdayNight: 2800,
    weekendDay:   4500,
    weekendNight: 3150,
    note:         'Panoramic Glass',
  },
  {
    id:           'pr-val-pickleball',
    venueId:      'fr-valencia',
    courtType:    'Pickleball Court',
    sport:        'pickleball',
    weekdayDay:   2000,
    weekdayNight: 1500,
    weekendDay:   2500,
    weekendNight: 2000,
    note:         'Cushioned Acrylic surface',
  },
  {
    id:           'pr-val-cricket',
    venueId:      'fr-valencia',
    courtType:    'Box Cricket Court',
    sport:        'cricket',
    weekdayDay:   2200,
    weekdayNight: 2000,
    weekendDay:   2700,
    weekendNight: 2500,
    note:         'Pro Turf',
  },

  /* ─── Cross Courts ──────────────────────────────────────── */
  {
    id:           'pr-cc-padel',
    venueId:      'cross-courts',
    courtType:    'Glass Padel Court',
    sport:        'padel',
    weekdayDay:   4500,
    weekdayNight: 3200,
    weekendDay:   5000,
    weekendNight: 3700,
    note:         'Panoramic Glass · premium club',
  },
  {
    id:           'pr-cc-pickleball',
    venueId:      'cross-courts',
    courtType:    'Competition Pickleball Court',
    sport:        'pickleball',
    weekdayDay:   2500,
    weekdayNight: 2000,
    weekendDay:   3000,
    weekendNight: 2500,
    note:         'Competition Acrylic',
  },
  {
    id:           'pr-cc-badminton',
    venueId:      'cross-courts',
    courtType:    'Badminton Court',
    sport:        'badminton',
    weekdayDay:   1500,
    weekdayNight: 1200,
    weekendDay:   1800,
    weekendNight: 1500,
    note:         'Spring Wood Base',
  },

  /* ─── FR Sports Arena Sialkot ───────────────────────────── */
  {
    id:           'pr-skt-cricket',
    venueId:      'fr-sports-arena-sialkot',
    courtType:    'Cricket Pitch',
    sport:        'cricket',
    weekdayDay:   1800,
    weekdayNight: 1600,
    weekendDay:   2200,
    weekendNight: 2000,
    note:         'Shock Pad Turf · indoor arena',
  },
  {
    id:           'pr-skt-futsal',
    venueId:      'fr-sports-arena-sialkot',
    courtType:    'Futsal Arena',
    sport:        'futsal',
    weekdayDay:   2200,
    weekdayNight: 2000,
    weekendDay:   2700,
    weekendNight: 2500,
    note:         '4G AstroTurf',
  },
  {
    id:           'pr-skt-padel',
    venueId:      'fr-sports-arena-sialkot',
    courtType:    'Glass Padel Court',
    sport:        'padel',
    weekdayDay:   3500,
    weekdayNight: 2500,
    weekendDay:   4000,
    weekendNight: 3000,
    note:         'Panoramic Glass',
  },
  {
    id:           'pr-skt-badminton',
    venueId:      'fr-sports-arena-sialkot',
    courtType:    'Badminton Hall',
    sport:        'badminton',
    weekdayDay:   1200,
    weekdayNight: 1000,
    weekendDay:   1500,
    weekendNight: 1300,
    note:         'Non-Slip Mats',
  },
];

/**
 * Get all pricing rules for a specific venue.
 */
export function getPricingForVenue(venueId) {
  return pricingRules.filter((r) => r.venueId === venueId);
}

/**
 * Calculate the price for a specific booking.
 * @param {string}  venueId
 * @param {string}  sport
 * @param {Date}    date
 * @param {number}  startHour   0–23
 * @param {number}  durationHrs 1–4
 * @returns {number|null} total price in PKR, or null if no rule found
 */
export function calculatePrice(venueId, sport, date, startHour, durationHrs = 1) {
  const rule = pricingRules.find(
    (r) => r.venueId === venueId && r.sport === sport,
  );
  if (!rule) return null;

  const peak    = isPeakHour(startHour);
  const weekend = isWeekendDay(date);

  let ratePerHour;
  if (!weekend && !peak) ratePerHour = rule.weekdayDay;
  else if (!weekend && peak) ratePerHour = rule.weekdayNight;
  else if (weekend && !peak) ratePerHour = rule.weekendDay;
  else ratePerHour = rule.weekendNight;

  return ratePerHour * durationHrs;
}

export default pricingRules;
