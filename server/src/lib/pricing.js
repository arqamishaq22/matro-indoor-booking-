/**
 * Server-side pricing helpers.
 * Price values come only from database PricingRule records. These helpers
 * select the applicable rule using the shared time/day boundaries.
 *
 * CANONICAL RULES:
 *   Off-Peak : 05:00 – 17:00  (hour >= 5 && hour < 17)
 *   Peak     : 17:00 – 05:00  (hour >= 17 || hour < 5)
 *   Weekday  : Monday – Thursday  (JS getDay(): 1–4)
 *   Weekend  : Friday – Sunday    (JS getDay(): 5, 6, 0)
 */
'use strict';

const PEAK_START = 17;
const PEAK_END   = 5;

/**
 * Returns "peak" or "off_peak" for a given hour (0–23).
 * @param {number} hour
 * @returns {"peak"|"off_peak"}
 */
function getPeriod(hour) {
  return (hour >= PEAK_START || hour < PEAK_END) ? 'peak' : 'off_peak';
}

/**
 * Returns "weekend" or "weekday" for a given JS Date.
 * @param {Date} date
 * @returns {"weekend"|"weekday"}
 */
function getDayType(date) {
  const day = date.getDay(); // 0=Sun,1=Mon…6=Sat
  return (day === 0 || day === 5 || day === 6) ? 'weekend' : 'weekday';
}

/**
 * Parse "HH:MM" string to integer hour.
 * @param {string} timeStr  e.g. "17:00"
 * @returns {number}
 */
function parseHour(timeStr) {
  return parseInt(timeStr.split(':')[0], 10);
}

/**
 * Add `durationHours` hours to a "HH:MM" string.
 * Wraps past midnight (e.g. "23:00" + 2h = "01:00").
 * @param {string} startTime
 * @param {number} durationHours
 * @returns {string}  "HH:MM"
 */
function addHours(startTime, durationHours) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = (h * 60 + m + durationHours * 60) % (24 * 60);
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Find the applicable PricingRule for a court on a specific date + start time.
 * Only active rules (isActive === true) are considered.
 *
 * @param {import('@prisma/client').PricingRule[]} rules  All rules for the court
 * @param {Date}   date
 * @param {string} startTime  "HH:MM"
 * @returns {import('@prisma/client').PricingRule | undefined}
 */
function findRule(rules, date, startTime) {
  const dayType = getDayType(date);
  const period  = getPeriod(parseHour(startTime));
  return rules.find(
    (r) => r.isActive !== false && r.dayType === dayType && r.period === period,
  );
}

module.exports = { getPeriod, getDayType, parseHour, addHours, findRule };
