'use strict';

const OPERATING_HOURS_PATTERN =
  /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function parseClock(hour, minute, meridiem) {
  const h = Number(hour);
  const m = Number(minute);
  if (h < 1 || h > 12 || m > 59) return null;
  return ((h % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0)) * 60 + m;
}

function getOperatingWindow(operatingHours) {
  if (typeof operatingHours !== 'string') return null;

  const match = OPERATING_HOURS_PATTERN.exec(operatingHours);
  if (!match) return null;

  const open = parseClock(match[1], match[2], match[3]);
  let close = parseClock(match[4], match[5], match[6]);
  if (open === null || close === null) return null;
  if (close <= open) close += 24 * 60;
  return { open, close };
}

function getBookingStartMinutes(time, operatingWindow) {
  const [hour, minute] = time.split(':').map(Number);
  let start = hour * 60 + minute;
  if (operatingWindow.close > 24 * 60 && start < operatingWindow.open) {
    start += 24 * 60;
  }
  return start;
}

module.exports = { getOperatingWindow, getBookingStartMinutes };
