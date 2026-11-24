/**
 * Shared human-friendly display formatters for the dashboard UI.
 */

const ENUM_LABELS = {
  DELIVERY_BLOCKED_UNBUILDABLE: 'Delivery Blocked (Unbuildable)',
  PORTAL_VALIDATION_PENDING: 'Portal Validation Pending',
  PORTAL_VALIDATED: 'Portal Validated',
  DOUBLE_CHECK_PASSED: 'Double-Check Passed',
  VALIDATION_REQUIRED: 'Validation Required',
  PRESENTATION_READY: 'Presentation Ready',
  ACTION_REQUIRED: 'Action Required',
  MIXED_USE: 'Mixed Use',
  READ_INTENSIVE: 'Read Intensive',
  WRITE_INTENSIVE: 'Write Intensive',
  UNCHANGED: 'Unchanged',
  ADDED: 'Added',
  REMOVED: 'Removed',
  REMOVED_DISCONTINUED: 'Discontinued',
  PRICE_CHANGED: 'Price Changed',
  ATTRIBUTE_CHANGED: 'Attribute Changed',
  PRICE_AND_ATTRIBUTE_CHANGED: 'Price & Attr Changed',
  REINSTATED: 'Reinstated',
  NOT_RUN: 'Not Run',
  LOCAL_FALLBACK: 'Local Fallback',
  CLOUD_VERIFIED: 'Cloud Verified',
  OUTCOME_RETURNED: 'Outcome Returned'
};

export function humanizeEnum(value, fallback = 'Unknown') {
  if (value === null || value === undefined || value === '') return fallback;
  const str = String(value).trim();
  if (ENUM_LABELS[str]) return ENUM_LABELS[str];
  if (/^[A-Z0-9_]+$/.test(str)) {
    return str
      .toLowerCase()
      .split('_')
      .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
      .join(' ');
  }
  return str;
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return '—';
  const n = Math.max(0, Number(ms));
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)}s`;
  const mins = Math.floor(n / 60000);
  const secs = Math.round((n % 60000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function formatBoqFileName(rawName) {
  if (!rawName) return 'Inline BOQ Input';
  const base = String(rawName).split(/[/\\]/).pop() || String(rawName);
  if (/^InMemory_[0-9a-f-]+/i.test(base)) return 'Inline BOQ Input';
  if (/^boq_text_\d+_[0-9a-f]+/i.test(base)) return 'Text BOQ Input';
  return base;
}

/**
 * Largest-remainder rounding so integer percentages sum to exactly 100 when total > 0.
 */
export function allocateRoundedPercentages(counts) {
  const total = counts.reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
  if (total <= 0) return counts.map(() => 0);

  const exact = counts.map((count, index) => {
    const raw = (Math.max(0, Number(count) || 0) / total) * 100;
    const floorVal = Math.floor(raw);
    return { index, floorVal, remainder: raw - floorVal };
  });

  let remaining = 100 - exact.reduce((sum, item) => sum + item.floorVal, 0);
  const byRemainder = [...exact].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining && i < byRemainder.length; i++) {
    byRemainder[i].floorVal += 1;
  }

  const result = Array.from({ length: counts.length }, () => 0);
  exact.forEach(item => {
    result[item.index] = item.floorVal;
  });
  return result;
}
