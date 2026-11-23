'use strict';

const fs = require('fs');
const path = require('path');
const { classifyLifecycleState } = require('./sku.js');

const DEFAULT_POLICY_PATH = path.resolve(__dirname, '../../config/sku_zero_price_policies.json');

const SKU_OR_BADGE_TOKEN_RE = /[A-Z0-9]{4,8}-[A-Z0-9]{2,4}(?:#[A-Z0-9]{2,4})?|\[(?:90|OB|OS|DS|EOL|CS)\]/i;
const DATE_TOKEN_RE = /\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/;
const PRICE_DELTA_TOKEN_RE = /(?:->|=>|\(\s*[+-]\s*\$?\d|\bwas\s+\$|\bdelta\b)/i;
const STRICT_CURRENCY_RE = /^(?:USD\s*)?\$?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,4})?(?:\s*USD)?$/i;
const UNPRICED_TEXT_RE = /^(?:|n\/?a|none|null|unpublished|not\s+published(?:\s+by\s+oca)?|tbd|call|contact|standard|-+|—)$/i;
const ETA_TEXT_DATE_RE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i;

let cachedPolicies = null;
let cachedPolicyMtimeMs = -1;

/**
 * Load zero-price policy configuration with mtime cache invalidation.
 * @param {string} [policyPath]
 * @returns {object}
 */
function loadZeroPricePolicies(policyPath = DEFAULT_POLICY_PATH) {
  try {
    const stat = fs.statSync(policyPath);
    if (cachedPolicies && stat.mtimeMs === cachedPolicyMtimeMs && policyPath === DEFAULT_POLICY_PATH) {
      return cachedPolicies;
    }
    const parsed = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
    if (policyPath === DEFAULT_POLICY_PATH) {
      cachedPolicies = parsed;
      cachedPolicyMtimeMs = stat.mtimeMs;
    }
    return parsed;
  } catch {
    return {
      confirmedZeroParentContracts: [],
      confirmedZeroTriggerSkus: [],
      confirmedZeroSkuSuffixes: [],
      confirmedZeroSkuSubstrings: [],
      strictFioDescriptionPatterns: [],
      confirmedZeroDescriptionPatterns: []
    };
  }
}

function _compilePatternList(patterns) {
  const list = Array.isArray(patterns) ? patterns : [];
  return list.map((p) => {
    try {
      return new RegExp(p, 'i');
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Determine whether a $0 SKU is policy-confirmed free (parent contract or FIO/tracking).
 * @param {string} sku
 * @param {string} description
 * @param {object} [row]
 * @param {{ strictOnly?: boolean, policyPath?: string }} [options]
 * @returns {{ matched: boolean, kind: string|null, reason: string|null }}
 */
function classifyConfirmedZeroByPolicy(sku, description, row = null, options = {}) {
  const policies = loadZeroPricePolicies(options.policyPath);
  const rawSku = String(sku || row?.sku || row?.['Product #'] || '').toUpperCase().trim();
  const baseNormalized = rawSku.split(/\s+/)[0].replace(/[^A-Z0-9]/g, '');
  const contracts = new Set((policies.confirmedZeroParentContracts || []).map((s) => String(s).toUpperCase()));
  if (contracts.has(baseNormalized) || contracts.has(rawSku)) {
    return { matched: true, kind: 'CONFIRMED_ZERO_CONTRACT', reason: 'PARENT_CONTRACT_POLICY' };
  }

  const triggers = new Set((policies.confirmedZeroTriggerSkus || []).map((s) => String(s).toUpperCase()));
  if (triggers.has(rawSku)) {
    return { matched: true, kind: 'CONFIRMED_ZERO_FIO', reason: 'TRIGGER_SKU_POLICY' };
  }

  if ((policies.confirmedZeroSkuSuffixes || []).some((sfx) => rawSku.endsWith(String(sfx).toUpperCase()))) {
    return { matched: true, kind: 'CONFIRMED_ZERO_FIO', reason: 'SKU_SUFFIX_POLICY' };
  }
  if ((policies.confirmedZeroSkuSubstrings || []).some((sub) => rawSku.includes(String(sub).toUpperCase()))) {
    return { matched: true, kind: 'CONFIRMED_ZERO_FIO', reason: 'SKU_SUBSTRING_POLICY' };
  }

  const desc = String(description || row?.Description || row?.description || row?.rawText || '').trim();
  if (row?.isFio) {
    return { matched: true, kind: 'CONFIRMED_ZERO_FIO', reason: 'ROW_IS_FIO_FLAG' };
  }
  const descPatterns = options.strictOnly
    ? policies.strictFioDescriptionPatterns
    : policies.confirmedZeroDescriptionPatterns;
  if (_compilePatternList(descPatterns).some((re) => re.test(desc))) {
    return { matched: true, kind: 'CONFIRMED_ZERO_FIO', reason: 'DESCRIPTION_POLICY' };
  }
  return { matched: false, kind: null, reason: null };
}

/**
 * Boolean helper matching legacy isConfirmedFreeSku signature.
 * @param {string} sku
 * @param {string} description
 * @param {object} [row]
 * @returns {boolean}
 */
function isConfirmedZeroByPolicy(sku, description, row = null) {
  return classifyConfirmedZeroByPolicy(sku, description, row).matched;
}

/**
 * Detect unseparated integer date corruptions like 10232017 (10/23/2017) or 20241023.
 * @param {number} value
 * @returns {boolean}
 */
function isSuspectedDateParseInteger(value) {
  if (!Number.isInteger(value) || value < 1012000 || value > 20991231) return false;
  const s = String(value);
  if (s.length < 7 || s.length > 8) return false;
  if (/^(?:0?[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(20\d\d)$/.test(s)) return true;
  if (/^(20\d\d)(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/.test(s)) return true;
  return false;
}

function _isSkuPrefixPriceLeak(row, num) {
  if (!row || typeof row !== 'object') return false;
  const sku = String(row.sku || row['Product #'] || '').trim();
  const match = sku.match(/^(\d{4,6})-[A-Z0-9]/i);
  if (!match) return false;
  const prefixNum = Number(match[1]);
  const desc = String(row.Description || row.description || '').trim();
  return prefixNum >= 1000 && Math.abs(num - prefixNum) < 0.001 && !desc.includes(String(prefixNum));
}

function _failPrice(reason, raw, status = 'PARSE_FAILED') {
  return {
    priceUsd: null,
    priceState: 'PARSE_FAILED',
    priceStatus: status,
    reason,
    zeroConfirmed: false,
    raw
  };
}

function _inspectRawPriceString(str) {
  if (UNPRICED_TEXT_RE.test(str)) {
    return { earlyResult: { priceUsd: null, priceState: 'UNPRICED', priceStatus: 'UNPRICED', reason: 'EMPTY_OR_UNPUBLISHED', zeroConfirmed: false, raw: str } };
  }
  if (DATE_TOKEN_RE.test(str) || ETA_TEXT_DATE_RE.test(str)) {
    return { earlyResult: _failPrice('DATE_IN_PRICE_FIELD', str) };
  }
  if (PRICE_DELTA_TOKEN_RE.test(str)) {
    return { earlyResult: _failPrice('PRICE_DELTA_TOKEN', str) };
  }
  if (SKU_OR_BADGE_TOKEN_RE.test(str)) {
    return { earlyResult: _failPrice('SHIFTED_COLUMN_REJECTED', str, 'SHIFTED_COLUMN_REJECTED') };
  }
  if (/^-/.test(str) || /^\(\s*\$?\d/.test(str)) {
    return { earlyResult: _failPrice('NEGATIVE_VALUE', str) };
  }
  if ((str.match(/\$/g) || []).length > 1 || /\d\s*[-–—]\s*\$?\d/.test(str)) {
    return { earlyResult: _failPrice('MULTIPLE_OR_RANGE_VALUES', str) };
  }
  if (!STRICT_CURRENCY_RE.test(str)) {
    return { earlyResult: _failPrice('NON_NUMERIC_OR_MALFORMED', str) };
  }
  return { earlyResult: null };
}

function _buildNumericPriceResult(num, rawInput, options = {}) {
  if (!Number.isFinite(num) || num < 0) {
    return _failPrice('NEGATIVE_OR_NON_FINITE', rawInput);
  }
  if (options.rejectSuspectedDateInteger !== false && isSuspectedDateParseInteger(num)) {
    return _failPrice('SUSPECTED_DATE_PARSE_INTEGER', rawInput);
  }
  if (_isSkuPrefixPriceLeak(options.row, num)) {
    return _failPrice('SKU_PREFIX_COLUMN_SHIFT', rawInput, 'SHIFTED_COLUMN_REJECTED');
  }
  if (num === 0) {
    const sku = options.sku || options.row?.sku || options.row?.['Product #'] || '';
    const desc = options.description || options.row?.Description || options.row?.description || '';
    const policy = classifyConfirmedZeroByPolicy(sku, desc, options.row, options);
    if (policy.matched) {
      return {
        priceUsd: 0,
        priceState: 'CONFIRMED_ZERO',
        priceStatus: policy.kind === 'CONFIRMED_ZERO_CONTRACT' ? 'CONFIRMED_ZERO_CONTRACT' : 'CONFIRMED_ZERO_FIO',
        reason: policy.reason,
        zeroConfirmed: true,
        raw: rawInput
      };
    }
    return {
      priceUsd: 0,
      priceState: 'ZERO_UNCONFIRMED',
      priceStatus: 'ZERO_UNCONFIRMED',
      reason: 'UNCONFIRMED_ZERO_PRICE',
      zeroConfirmed: false,
      raw: rawInput
    };
  }
  return {
    priceUsd: Math.round(num * 100) / 100,
    priceState: 'PRICED',
    priceStatus: 'PRICED',
    reason: null,
    zeroConfirmed: false,
    raw: rawInput
  };
}

/**
 * Strictly parse currency values, distinguishing unpriced, confirmed zero,
 * unconfirmed zero, shifted columns, dates, and malformed deltas.
 * @param {*} rawInput
 * @param {object} [options]
 * @returns {object}
 */
function parseStrictPrice(rawInput, options = {}) {
  if (rawInput === null || rawInput === undefined) {
    return { priceUsd: null, priceState: 'UNPRICED', priceStatus: 'UNPRICED', reason: 'NULL_VALUE', zeroConfirmed: false, raw: rawInput };
  }
  if (typeof rawInput === 'number') {
    return _buildNumericPriceResult(rawInput, rawInput, options);
  }
  const str = String(rawInput).trim();
  const inspection = _inspectRawPriceString(str);
  if (inspection.earlyResult) return inspection.earlyResult;
  const normalized = str.replace(/^(?:USD\s*)/i, '').replace(/(?:\s*USD)$/i, '').replace(/[$,\s]/g, '');
  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    return _failPrice('NUMBER_COERCION_FAILED', rawInput);
  }
  return _buildNumericPriceResult(num, rawInput, options);
}

/**
 * Reconcile price evidence across multiple sources, flagging conflicts instead of silently guessing.
 * @param {Array<{ source: string, raw: *, row?: object, sku?: string, description?: string }>} candidates
 * @param {{ toleranceUsd?: number }} [options]
 * @returns {object}
 */
function reconcileConflictingPrices(candidates = [], options = {}) {
  const tolerance = Number.isFinite(options.toleranceUsd) ? options.toleranceUsd : 1.0;
  const parsed = candidates.map((c) => ({
    source: c.source || 'unknown',
    result: parseStrictPrice(c.raw, { row: c.row, sku: c.sku, description: c.description })
  }));
  const parseFailures = parsed.filter((p) => p.result.priceState === 'PARSE_FAILED');
  const valued = parsed.filter((p) => p.result.priceUsd !== null);

  if (valued.length === 0) {
    return {
      priceUsd: null,
      priceState: parseFailures.length > 0 ? 'PARSE_FAILED' : 'UNPRICED',
      priceStatus: parseFailures.length > 0 ? 'PARSE_FAILED' : 'UNPRICED',
      conflicts: [],
      parseFailures
    };
  }

  const positive = valued.filter((p) => p.result.priceUsd > 0);
  const confirmedZero = valued.filter((p) => p.result.priceUsd === 0 && p.result.zeroConfirmed);
  if (positive.length > 0 && confirmedZero.length > 0) {
    return {
      priceUsd: null,
      priceState: 'CONFLICTING_EVIDENCE',
      priceStatus: 'CONFLICTING_EVIDENCE',
      conflicts: valued.map((v) => ({ source: v.source, priceUsd: v.result.priceUsd, priceState: v.result.priceState })),
      parseFailures
    };
  }

  const pool = positive.length > 0 ? positive : valued;
  const minPrice = Math.min(...pool.map((p) => p.result.priceUsd));
  const maxPrice = Math.max(...pool.map((p) => p.result.priceUsd));
  if (maxPrice - minPrice > tolerance) {
    return {
      priceUsd: null,
      priceState: 'CONFLICTING_EVIDENCE',
      priceStatus: 'CONFLICTING_EVIDENCE',
      conflicts: pool.map((v) => ({ source: v.source, priceUsd: v.result.priceUsd, priceState: v.result.priceState })),
      parseFailures
    };
  }

  const winner = pool[0];
  return {
    priceUsd: winner.result.priceUsd,
    priceState: winner.result.priceState,
    priceStatus: winner.result.priceStatus,
    source: winner.source,
    conflicts: [],
    parseFailures
  };
}

function _mapLeadTimeSpeedTier(days, rawType) {
  if (rawType === 'ETA_DATE' && days === null) return 'ETA Scheduled';
  if (days === null || !Number.isFinite(days)) return 'Unpublished';
  if (days <= 7) return 'Fast-Ship Certified (<=7d)';
  if (days <= 30) return 'Standard Delivery (8-30d)';
  if (days <= 45) return 'Extended Schedule (31-45d)';
  return 'Constrained / Long Lead Time (>45d)';
}

function _extractIsoEtaDate(str) {
  const iso = str.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }
  const slash = str.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
  }
  const dmyNamed = str.match(/\b(\d{1,2})[\s-]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s-]+(\d{4})\b/i);
  if (dmyNamed) {
    const dt = new Date(dmyNamed[0].replace(/-/g, ' '));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 10);
    }
  }
  const named = str.match(ETA_TEXT_DATE_RE);
  if (named) {
    const dt = new Date(named[0]);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 10);
    }
  }
  return null;
}

function _resolveUnitMultiplier(normalized) {
  if (/\b(?:months?|mos?)\b/i.test(normalized)) return { unit: 'MONTHS', multiplier: 30 };
  if (/\b(?:weeks?|wks?|wk)\b|\d+\s*w\b/i.test(normalized)) return { unit: 'WEEKS', multiplier: 7 };
  if (/\b(?:hours?|hrs?|hr)\b/i.test(normalized)) return { unit: 'HOURS', multiplier: 1 / 24 };
  if (/\b(?:business|working)\s*days?\b/i.test(normalized)) return { unit: 'BUSINESS_DAYS', multiplier: 1 };
  if (/\bdays?\b|\d+\s*d\b/i.test(normalized)) return { unit: 'DAYS', multiplier: 1 };
  return { unit: null, multiplier: 1 };
}

function _parseLeadTimeText(rawStr) {
  const normalized = rawStr.replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-').replace(/\s+/g, ' ').trim();
  const etaDate = _extractIsoEtaDate(normalized);
  if (etaDate || /^(?:eta|est\.?\s*ship|expected)\b/i.test(normalized)) {
    return {
      raw: rawStr,
      days: null,
      minDays: null,
      maxDays: null,
      unit: 'DATE',
      rawType: 'ETA_DATE',
      etaDate,
      speedTier: 'ETA Scheduled',
      isPublished: Boolean(etaDate)
    };
  }
  if (/^(?:in\s+stock|immediate|same\s+day)$/i.test(normalized)) {
    return { raw: rawStr, days: null, minDays: null, maxDays: null, unit: null, rawType: 'IN_STOCK', etaDate: null, speedTier: 'Unpublished', isPublished: false };
  }

  const { unit, multiplier } = _resolveUnitMultiplier(normalized);
  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const low = Number(rangeMatch[1]);
    const high = Number(rangeMatch[2]);
    const minDays = Math.max(1, Math.round(Math.min(low, high) * multiplier));
    const maxDays = Math.max(1, Math.round(Math.max(low, high) * multiplier));
    const days = Math.max(1, Math.round(((low + high) / 2) * multiplier));
    return {
      raw: rawStr,
      days,
      minDays,
      maxDays,
      unit: unit || 'DAYS',
      rawType: 'RANGE',
      etaDate: null,
      speedTier: _mapLeadTimeSpeedTier(days, 'RANGE'),
      isPublished: true
    };
  }

  const singleMatch = normalized.match(/^(?:~|approx\.?|about|within|up\s+to)?\s*(\d+(?:\.\d+)?)\s*(?:months?|mos?|weeks?|wks?|wk|w|business\s*days?|working\s*days?|days?|d|hours?|hrs?|hr)?\b/i);
  if (singleMatch && (unit || /^\d+$/.test(normalized))) {
    const val = Number(singleMatch[1]);
    const days = Math.max(1, Math.ceil(val * multiplier));
    if (days <= 730) {
      return {
        raw: rawStr,
        days,
        minDays: days,
        maxDays: days,
        unit: unit || 'DAYS',
        rawType: 'SCALAR',
        etaDate: null,
        speedTier: _mapLeadTimeSpeedTier(days, 'SCALAR'),
        isPublished: true
      };
    }
  }
  return { raw: rawStr, days: null, minDays: null, maxDays: null, unit: null, rawType: 'UNPARSEABLE', etaDate: null, speedTier: 'Unpublished', isPublished: false };
}

/**
 * Parse lead-time strings (days, weeks, months, hours, en-dash ranges, ETA dates)
 * without ever stripping week multipliers or converting dates into day counts.
 * @param {string|number|null} rawInput
 * @param {number|null} [explicitDays]
 * @param {string|null} [speedTierHint]
 * @returns {object}
 */
function parseLeadTimeOrEta(rawInput, explicitDays = null, speedTierHint = null) {
  const rawStr = rawInput === null || rawInput === undefined ? '' : String(rawInput).trim();
  const isUnpublishedText = !rawStr || UNPRICED_TEXT_RE.test(rawStr) || /^(?:build|built|made)\s+to\s+order$/i.test(rawStr);

  if (!isUnpublishedText) {
    const parsedFromText = _parseLeadTimeText(rawStr);
    if (parsedFromText.isPublished || ['ETA_DATE', 'IN_STOCK'].includes(parsedFromText.rawType)) {
      if (speedTierHint && parsedFromText.speedTier === 'Unpublished') {
        parsedFromText.speedTier = speedTierHint;
      }
      return parsedFromText;
    }
  }

  if (explicitDays !== null && explicitDays !== undefined && explicitDays !== '') {
    const numeric = Number(explicitDays);
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 730 && isUnpublishedText) {
      const days = Math.round(numeric);
      return {
        raw: rawStr || `${days} days`,
        days,
        minDays: days,
        maxDays: days,
        unit: 'DAYS',
        rawType: 'EXPLICIT_DAYS',
        etaDate: null,
        speedTier: speedTierHint || _mapLeadTimeSpeedTier(days, 'EXPLICIT_DAYS'),
        isPublished: true
      };
    }
  }

  return {
    raw: rawStr || 'Unpublished',
    days: null,
    minDays: null,
    maxDays: null,
    unit: null,
    rawType: isUnpublishedText ? 'UNPUBLISHED' : 'UNPARSEABLE',
    etaDate: null,
    speedTier: 'Unpublished',
    isPublished: false
  };
}

/**
 * Normalize raw portal/catalog lifecycle text to one canonical enum.
 * @param {string} rawStatus
 * @returns {{ lifecycleCanonical: string, lifecycleBadge: string|null, warningFlag: boolean, isObsoleteOrDiscontinued: boolean }}
 */
function normalizeLifecycleCanonical(rawStatus) {
  const s = String(rawStatus || '').trim();
  const lower = s.toLowerCase();
  if (/^\[?90\]?$|\b90[\s_-]*day(?:\b|_)|near\s*eol|end\s*of\s*sale\s*warning/i.test(lower)) {
    return { lifecycleCanonical: '90-Day Warning', lifecycleBadge: '90', warningFlag: true, isObsoleteOrDiscontinued: false };
  }
  if (/\b(?:obsolete|discontinued|eol|end\s*of\s*life|retired|not\s*orderable|out[\s_-]+of[\s_-]+stock)\b|^\[?(?:ob|os)\]?$/i.test(lower)) {
    return { lifecycleCanonical: 'Obsolete', lifecycleBadge: 'OB', warningFlag: true, isObsoleteOrDiscontinued: true };
  }
  if (/direct[\s_-]*ship|drop[\s_-]*ship|^\[?ds\]?$/i.test(lower)) {
    return { lifecycleCanonical: 'Direct Ship', lifecycleBadge: 'DS', warningFlag: true, isObsoleteOrDiscontinued: false };
  }
  if (/^\[?cs\]?$|\b(?:constrained[\s_-]*supply|supply[\s_-]*(?:restricted|constrained))\b/i.test(lower)) {
    return { lifecycleCanonical: 'Constrained Supply', lifecycleBadge: 'CS', warningFlag: true, isObsoleteOrDiscontinued: false, isConstrainedSupply: true };
  }
  const lifecycleCanonical = /^active$|^production$/i.test(lower) ? 'Active' : 'Unknown';
  return { lifecycleCanonical, lifecycleBadge: null, warningFlag: false, isObsoleteOrDiscontinued: false };
}

function _observedOrderability(skuRow, visibility, lifecycle, capturedAt) {
  if (skuRow.isSelectable === false) return 'NOT_SELECTABLE';
  if (visibility === 'SELECTOR_HIDDEN' || visibility === 'DOM_HIDDEN') return 'PORTAL_CONDITIONAL';
  if (lifecycle === 'Obsolete') return 'OBSOLETE';
  if (lifecycle === 'Constrained Supply') return 'CONSTRAINED_SUPPLY';
  if (lifecycle === '90-Day Warning') return '90_DAY_WARNING';
  if (lifecycle === 'Direct Ship') return 'DIRECT_SHIP';
  const scope = skuRow.scopeProvenance;
  const observedAt = Date.parse(capturedAt || scope?.observedAt || '');
  const age = Date.now() - observedAt;
  if (skuRow.isSelectable === true && /^orderable$/i.test(String(skuRow.Availability || '')) &&
      scope?.baseSku && scope?.ownerProduct && scope?.selectorState && age >= 0 && age <= 72 * 60 * 60 * 1000) return 'ORDERABLE';
  return skuRow.isSelectable === true ? 'SELECTABLE_OBSERVED' : 'UNKNOWN';
}

/**
 * Separate observed portal visibility, compatibility gates, and ordering availability.
 * @param {{ skuRow?: object, conditionalEntry?: object|null, ruleEntry?: object|null }} params
 * @returns {object}
 */
function buildAvailabilityContract({ skuRow = {}, conditionalEntry = null, ruleEntry = null, capturedAt = null } = {}) {
  const observations = [].concat(conditionalEntry || []);
  const isConditional = observations.length > 0 || skuRow.visibilityState === 'PORTAL_CONDITIONAL' || skuRow.portalConditional;
  const observedVisibility = skuRow.visibility || skuRow.visibilityState;
  const visibility = observedVisibility === 'DOM_HIDDEN' ? 'DOM_HIDDEN'
    : isConditional ? 'SELECTOR_HIDDEN'
      : observedVisibility || (skuRow.isSelectable === true ? 'VISIBLE' : 'UNOBSERVED');
  const rawStatus = skuRow.lifecycleStatus || skuRow['Lifecycle Status'] || skuRow['CLIC Status'] || '';
  const state = classifyLifecycleState(rawStatus, skuRow['Diff Status'] || skuRow.diffStatus,
    skuRow['Product #'] || skuRow.sku, skuRow.Description || skuRow.description, skuRow.vendorSupplyStatus);
  const lifecycle = normalizeLifecycleCanonical(state.isNonActive ? state.canonicalStatus : rawStatus);
  const supply = normalizeLifecycleCanonical(skuRow.vendorSupplyStatus);
  const observedLifecycle = !lifecycle.isObsoleteOrDiscontinued && supply.isConstrainedSupply ? supply : lifecycle;
  const conditions = observations.map(item => item.condition || item.trigger || item.selectorTriggerSku || item.ruleContext).filter(Boolean);
  const conditionSummary = [...new Set([skuRow['Hard Constraints'], skuRow.selectorTriggerSku, ruleEntry?.summary, ...conditions].filter(Boolean))].join('; ') || null;

  return {
    visibility,
    availability: _observedOrderability(skuRow, visibility, observedLifecycle.lifecycleCanonical, capturedAt),
    selectability: typeof skuRow.isSelectable === 'boolean' ? skuRow.isSelectable : null,
    compatibility: isConditional || conditionSummary || ruleEntry?.conditions?.length ? 'CONDITIONAL' : 'UNKNOWN',
    lifecycleCanonical: observedLifecycle.lifecycleCanonical,
    conditionSummary
  };
}

function _isSoftwareSubscriptionRow(sku, cat, desc, role) {
  const hasExplicitSoftwareToken = /\b(?:e-[lr]tu|saas|ml\s*dev\s*env|virtual\s*workstation|cloudera)\b/i.test(desc);
  if (hasExplicitSoftwareToken) return true;
  if (/\b(?:software|license|subscription|ilo\s*advanced|compute\s*ops|greenlake|oneview|oem\s*software|red\s*hat|suse|vmware|microsoft\s*windows)\b/i.test(`${cat} ${role}`)) {
    return true;
  }
  return /aae$/i.test(sku) && /\b(?:software|sw|license|subscription|sub|saas|e-[lr]tu|\d+\s*y(?:r|ear)?s?|yr|year)\b/i.test(desc);
}

function _isSupportServiceRow(sku, desc, combinedMeta) {
  const hasExplicitServicePhrase = /\b(?:tech\s*care|foundation\s*care|pointnext|prosupport|smartnet|hi-care|premier\s*support|support\s*services?|installation\s*service|startup\s*service|deployment\s*service|integrat(?:ion)?\s*svc|education\s*svc|learning\s*credits)\b/i.test(combinedMeta);
  if (hasExplicitServicePhrase) return true;
  const hasPhysicalPartNoun = /\b(?:kit|bracket|cable|rail|adapter|heatsink|fan|dimm|ssd|hdd|drive|transceiver|riser)\b/i.test(desc);
  if (/\bsvc\b/i.test(desc) && !hasPhysicalPartNoun) return true;
  return /^(?:h[a-z0-9]\d|u[0-9a-z])/i.test(sku)
    && /\b(?:service|support|svc|installation|startup|deployment|warranty|education)\b/i.test(combinedMeta)
    && !hasPhysicalPartNoun;
}

/**
 * Separate base systems, owned components, support services, software, internal FIO rows, and options.
 * @param {object} skuRow
 * @param {object} [context]
 * @returns {string}
 */
function classifyRowType(skuRow = {}, context = {}) {
  if (context.rowType) return context.rowType;
  const sku = String(skuRow.sku || skuRow['Product #'] || '').toUpperCase().trim();
  const cat = String(skuRow.category || skuRow.parentCategory || skuRow['Parent Category'] || skuRow.subCategory || skuRow['Subcategory'] || '').toLowerCase();
  const desc = String(skuRow.Description || skuRow.description || '').toLowerCase();
  const role = String(skuRow['Component Role'] || skuRow.componentRole || '').toLowerCase();

  if (context.isBase || /\b(?:base\s*chassis|configure-to-order|server\s*chassis)\b/i.test(cat) || (/\bcto\b/i.test(desc) && /server|frame|library|array/.test(desc))) {
    return 'BASE_SYSTEM';
  }
  if (context.isOwnedComponentParent || skuRow.ownerComponentParent) {
    return 'OWNED_COMPONENT_PARENT';
  }
  if (_isSoftwareSubscriptionRow(sku, cat, desc, role)) {
    return 'SOFTWARE_SUBSCRIPTION';
  }
  if (_isSupportServiceRow(sku, desc, `${cat} ${desc} ${role}`)) {
    return 'SUPPORT_SERVICE';
  }
  const zeroPolicy = classifyConfirmedZeroByPolicy(sku, desc, skuRow);
  if (zeroPolicy.kind === 'CONFIRMED_ZERO_CONTRACT') {
    return 'SUPPORT_SERVICE';
  }
  if (zeroPolicy.matched || /\b(?:fio|factory\s*integrated|tracking|enablement|internal\s*placeholder)\b/i.test(desc)) {
    return 'INTERNAL_CONFIGURATION';
  }
  return 'HARDWARE_OPTION';
}

module.exports = {
  loadZeroPricePolicies,
  classifyConfirmedZeroByPolicy,
  isConfirmedZeroByPolicy,
  isSuspectedDateParseInteger,
  parseStrictPrice,
  reconcileConflictingPrices,
  parseLeadTimeOrEta,
  normalizeLifecycleCanonical,
  buildAvailabilityContract,
  classifyRowType
};
