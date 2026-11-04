/**
 * Local calendar helpers.
 * Avoid UTC conversions that can shift study tasks onto another day.
 * Invalid calendar dates (e.g. 2026-02-31) are rejected, not normalised.
 */

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function isValidLocalDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

function isValidLocalDateTimeString(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return false;
  if (!isValidLocalDateString(match[1])) return false;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4] == null ? '0' : match[4]);
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;
  return true;
}

/** @param {Date} [date] */
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @param {Date} [date] */
function getLocalDateTimeString(date = new Date()) {
  const datePart = getLocalDateString(date);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${datePart}T${hh}:${mm}:${ss}`;
}

/**
 * Add day offsets to a local YYYY-MM-DD string without UTC shifting.
 * @param {string} baseDateStr
 * @param {number} days
 */
function addDaysToLocalDate(baseDateStr, days) {
  const parsed = parseLocalDateTime(baseDateStr);
  if (!parsed) return null;
  return getLocalDateString(shiftLocalDate(parsed, days));
}

/**
 * Build a local dueAt from a date string and hour/minute.
 * @param {string} dateStr YYYY-MM-DD
 * @param {number} hour
 * @param {number} minute
 */
function buildLocalDueAt(dateStr, hour, minute) {
  if (!isValidLocalDateString(dateStr)) return null;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${dateStr}T${hh}:${mm}:00`;
}

/**
 * Parse local YYYY-MM-DD or YYYY-MM-DDTHH:mm[:ss] into a Date.
 * Returns null for impossible calendar dates or times.
 * @param {string|null|undefined} value
 * @returns {Date|null}
 */
function parseLocalDateTime(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!isValidLocalDateString(value)) return null;
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  if (!isValidLocalDateTimeString(value)) return null;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  const [, ys, ms, ds, hs, mins, ss] = match;
  return new Date(
    Number(ys),
    Number(ms) - 1,
    Number(ds),
    Number(hs),
    Number(mins),
    Number(ss || 0),
    0,
  );
}

/** @param {string|null|undefined} dueAt */
function isPastDueAt(dueAt, now = new Date()) {
  const parsed = parseLocalDateTime(dueAt);
  if (!parsed) return false;
  return parsed.getTime() < now.getTime();
}

/** @param {string} dateStr */
function formatDisplayDate(dateStr) {
  const parsed = parseLocalDateTime(dateStr);
  if (!parsed) return dateStr || '—';
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** @param {string} dueAt */
function formatDisplayDateTime(dueAt) {
  const parsed = parseLocalDateTime(dueAt);
  if (!parsed) return dueAt || '—';
  return parsed.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Friendly greeting based on local hour. */
function getGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Shift a Date by whole days using local calendar arithmetic.
 * @param {Date} date
 * @param {number} delta
 */
function shiftLocalDate(date, delta) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
  return next;
}

function msUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    1,
    0,
  );
  return Math.max(1000, next.getTime() - now.getTime());
}

module.exports = {
  isLeapYear,
  daysInMonth,
  isValidLocalDateString,
  isValidLocalDateTimeString,
  getLocalDateString,
  getLocalDateTimeString,
  addDaysToLocalDate,
  buildLocalDueAt,
  parseLocalDateTime,
  isPastDueAt,
  formatDisplayDate,
  formatDisplayDateTime,
  getGreeting,
  shiftLocalDate,
  msUntilNextLocalMidnight,
};
