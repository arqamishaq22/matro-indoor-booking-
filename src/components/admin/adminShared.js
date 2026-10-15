/**
 * adminShared.js — shared constants & helpers for admin pages.
 * Keeps formatting, form definitions, and booking transition rules DRY
 * across Overview / Bookings / Venues / Pricing / Users pages.
 */

export const pkr = (n) => `Rs. ${Number(n ?? 0).toLocaleString('en-PK')}`;

export const fmtDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

export const BOOKING_TRANSITIONS = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'NO_SHOW', 'COMPLETED'],
  CANCELLED: [],
  NO_SHOW:   [],
  COMPLETED: [],
};

export const PAYMENT_TRANSITIONS = {
  UNPAID:   ['PAID', 'WAIVED'],
  PAID:     ['REFUNDED'],
  REFUNDED: [],
  WAIVED:   ['UNPAID', 'PAID'],
};

/* ─── Venue form fields (mirrors POST /admin/venues validation) ──────── */
export const VENUE_FORM_FIELDS = [
  { key: 'id',             label: 'Venue ID (slug)',      type: 'text',  required: true,  addOnly: true,  placeholder: 'e.g. fr-dha-phase-5', pattern: /^[a-z0-9-]+$/, patternMsg: 'Lowercase letters, digits, and hyphens only' },
  { key: 'name',           label: 'Full Name',            type: 'text',  required: true,  maxLength: 100  },
  { key: 'shortName',      label: 'Short Name',           type: 'text',  required: true,  maxLength: 60   },
  { key: 'city',           label: 'City',                 type: 'text',  required: true,  addOnly: true,  maxLength: 60   },
  { key: 'address',        label: 'Address',              type: 'text',  required: true,  maxLength: 255  },
  { key: 'location',       label: 'Location / Area',      type: 'text',  required: true,  maxLength: 120  },
  { key: 'operatingHours', label: 'Operating Hours',      type: 'text',  required: true,  maxLength: 80,  placeholder: 'e.g. 06:00 AM – 02:00 AM' },
  { key: 'startingPrice',  label: 'Starting Price (Rs)',  type: 'number', required: true,  min: 0          },
  { key: 'badge',          label: 'Badge (optional)',     type: 'text',  required: false, maxLength: 60   },
  { key: 'imageUrl',       label: 'Image URL (optional)', type: 'text',  required: false                  },
];

export const validateVenueForm = (form, mode) => {
  const errs = {};
  VENUE_FORM_FIELDS.forEach(({ key, required, addOnly, pattern, patternMsg, maxLength, min, type }) => {
    if (addOnly && mode !== 'add') return;
    const val = (form[key] ?? '').toString().trim();
    if (required && !val) { errs[key] = 'This field is required.'; return; }
    if (val && maxLength && val.length > maxLength) errs[key] = `Max ${maxLength} characters.`;
    if (val && pattern && !pattern.test(val)) errs[key] = patternMsg;
    if (type === 'number' && val && (isNaN(Number(val)) || Number(val) < (min ?? 0))) errs[key] = `Must be a number ≥ ${min ?? 0}.`;
  });
  /* imageUrl must be a valid HTTP(S) URL when provided */
  const imageVal = (form.imageUrl ?? '').toString().trim();
  if (imageVal) {
    try {
      const url = new URL(imageVal);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
    } catch {
      errs.imageUrl = 'Enter a valid http(s) URL.';
    }
  }
  return errs;
};

/* ─── Court form fields (mirrors POST /admin/venues/:id/courts) ─────── */
export const COURT_SPORTS = ['cricket', 'futsal', 'padel', 'pickleball', 'badminton', 'gaming'];

export const COURT_FORM_FIELDS = [
  { key: 'id',          label: 'Court ID (slug)', type: 'text',   required: true,  addOnly: true, placeholder: 'e.g. dha-c1', pattern: /^[a-z0-9-]+$/, patternMsg: 'Lowercase letters, digits, and hyphens only' },
  { key: 'name',        label: 'Court Name',      type: 'text',   required: true,  maxLength: 100 },
  { key: 'sport',       label: 'Sport',           type: 'select', required: true,  addOnly: true, options: COURT_SPORTS },
  { key: 'surfaceType', label: 'Surface Type',    type: 'text',   required: false, maxLength: 80, placeholder: 'e.g. Shock Pad Turf' },
  { key: 'sortOrder',   label: 'Sort Order',      type: 'number', required: false, min: 0, placeholder: '0' },
];

export const validateCourtForm = (form, mode) => {
  const errs = {};
  COURT_FORM_FIELDS.forEach(({ key, required, addOnly, pattern, patternMsg, maxLength, min, type }) => {
    if (addOnly && mode !== 'add') return;
    const val = (form[key] ?? '').toString().trim();
    if (required && !val) { errs[key] = 'This field is required.'; return; }
    if (val && maxLength && val.length > maxLength) errs[key] = `Max ${maxLength} characters.`;
    if (val && pattern && !pattern.test(val)) errs[key] = patternMsg;
    if (type === 'number' && val && (isNaN(Number(val)) || Number(val) < (min ?? 0))) errs[key] = `Must be a number ≥ ${min ?? 0}.`;
  });
  return errs;
};

/* ─── Pricing rule definitions ──────────────────────────────────────── */
export const PRICE_FIELDS = [
  { key: 'weekdayOffPeak', label: 'Weekday · Off-peak', dayType: 'weekday', period: 'off_peak' },
  { key: 'weekdayPeak',    label: 'Weekday · Peak',     dayType: 'weekday', period: 'peak'     },
  { key: 'weekendOffPeak', label: 'Weekend · Off-peak', dayType: 'weekend', period: 'off_peak' },
  { key: 'weekendPeak',    label: 'Weekend · Peak',     dayType: 'weekend', period: 'peak'     },
];

export const readCourtPricing = (rules = []) => Object.fromEntries(
  PRICE_FIELDS.map(({ key, dayType, period }) => {
    const rule = rules.find((item) => item.dayType === dayType && item.period === period);
    return [key, rule?.pricePerHour ?? 0];
  }),
);
