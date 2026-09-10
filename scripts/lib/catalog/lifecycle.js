'use strict';

const DEFAULT_RETIREMENT_WARNING_DAYS = 180;

function parseVendorDate(value) {
  const text = String(value || '').trim();
  if (!text || /^(?:n\/a|na|none|unknown|-)$/i.test(text)) return null;

  const numeric = text.match(/^(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const last = Number(numeric[3]);
    let year;
    let month;
    let day;
    if (first > 31) {
      year = first;
      month = second;
      day = last;
    } else {
      month = first;
      year = last < 100 ? 2000 + last : last;
      day = second;
    }
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day) {
      return parsed;
    }
    return null;
  }

  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function analyzeRetirementDate(value, options = {}) {
  const retirementDate = parseVendorDate(value);
  if (!retirementDate) return { known: false, isPast: false, isNear: false, daysRemaining: null, retirementDate: '' };

  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const warningDays = Number.isFinite(options.warningDays)
    ? Math.max(0, options.warningDays)
    : DEFAULT_RETIREMENT_WARNING_DAYS;
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysRemaining = Math.ceil((retirementDate.getTime() - todayUtc) / 86400000);
  return {
    known: true,
    isPast: daysRemaining < 0,
    isNear: daysRemaining >= 0 && daysRemaining <= warningDays,
    daysRemaining,
    retirementDate: retirementDate.toISOString().slice(0, 10)
  };
}

module.exports = { DEFAULT_RETIREMENT_WARNING_DAYS, parseVendorDate, analyzeRetirementDate };
