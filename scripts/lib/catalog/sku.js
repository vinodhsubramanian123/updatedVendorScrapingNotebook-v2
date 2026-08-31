'use strict';
/**
 * scripts/lib/sku.js — Centralized HPE SKU Normalization & Validation Utility
 *
 * Provides authoritative regexes and methods for extracting, validating,
 * and categorizing HPE hardware SKUs, option suffixes, and service SKUs.
 */

// Universal HPE SKU Regex
// Matches:
// 1. Hyphenated hardware SKUs: P73282-B21, 867796-B21, P07646-B21
// 2. 6-character hardware SKUs: C0H28A, Q2R32A, BC002A, N9X06A, TC480A, R2E09A
// 3. Software / E-LTU SKUs: E5Y35AAE, E5Y43AAE, BD505A
// 4. Service / Support SKUs: H7J34A3, HA114A1, HU4A6E, U4391E, R4H12A, S2S05A, HU4B2A3, HU4B2A30C4V
const HPE_SKU_REGEX = /^([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}(?:AAE)?|[HURS][A-Z0-9]{4,11})$/i;

// Match SKU within text with optional CTO/BTO/FIO suffix
const HPE_SKU_EXTRACT_REGEX = /\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}(?:CTO|BTO|FIO)?|[A-Z0-9]{6}(?:CTO|BTO|FIO)?|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11}(?:CTO|BTO|FIO)?)\b/i;

const COMMON_WORDS_FILTER = /^(SERVER|SERVERS|CHASSIS|PROCESSOR|SYSTEM|MODULE|OPTION|OPTIONS|MEMORY|HEATSINK|RISER|CABLE|POWER|SUPPLY|SUPPLIES|KIT|BOARD|FRAME|DRIVE|BLADE|RACK|PROLIANT|COMPUTE|SELECT|SELECTED|SWITCH|CANCEL|CONFIG|STATUS|ENABLE|REMOVE|REMOVED|REMOVAL|REPLACED|ACTION|UPDATE|UPDATED|UPGRADE|UPGRADES|MANUAL|EXPAND|RETURN|MANAGE|SUPPORT|SERVICE|SERVICES|STORAGE|REGISTERED|SMART|SPEED|INTENSIVE|SINGLE|DUAL|TRIPLE|QUAD|HYBRID|MODULAR|CORE|CORES|RECOVERY|SIMPLIFIED|ROWCOUNT|RECOMMENDED|TIER|SCORE|CONTEXT|RULES|RULE|REFER|SECURITY|SHIPPING|SPACE|SCALE|RESULTS|RELATED|RENEW|RENEWAL|STAND|RANCHER|SPANISH|RESELLER|STANDARD|RESPONSE|SETTINGS|SETTING|RUNNING|REQUIRED|SELLING|SECTION|SHARE|SEQUENCE|UPFRONT|USERS|HARDWARE|HELPS|SOFTWARE|SCHEDMD|SLURM|SOCKETS|ULTIMATE|RIGHT|USING|REVIEWED|HOWEVER|STACKING|RETIMER|SLOTS|REQUIRES|SPADE|SMALL|HALOGEN|SLOTB|SLOTA|PSNOW-RED|MULTI-MODE|SINGLE-MODE|LITHIUM-ION|SFP28|QSFP28|QSFP56|SFP56|SN1610Q|SN1700Q|SN1600E|SN1200E|MR416I|MR216I|SR932I|SR416I|MR416I-P|MR416I-O|SR932I-P)$/i;

/**
 * Validate whether a string is a valid HPE SKU.
 * @param {string} skuStr
 * @returns {boolean}
 */
function isValidHpeSKU(skuStr) {
  if (!skuStr) return false;
  let clean = cleanBaseSKU(skuStr).trim();

  // Strip leading DOM target element prefix 't' if followed by valid SKU pattern (e.g. tP69726-B21 -> P69726-B21)
  if (/^t[A-Z0-9]{5,7}(-[A-Z0-9]+)?$/i.test(clean)) {
    clean = clean.substring(1);
  }

  // MANDATORY: Valid HPE SKUs MUST contain at least one digit (eliminates plain English words)
  if (!/\d/.test(clean)) return false;
  // MANDATORY: Valid HPE SKUs MUST NOT be pure digits (eliminates integers like 12345, quantities, or line numbers)
  if (/^\d+$/.test(clean)) return false;

  // Filter out internal DOM pattern IDs, core count labels, and common words
  if (/pat0|00300|core|recovery|simplified|rowcount|context/i.test(clean)) return false;
  if (COMMON_WORDS_FILTER.test(clean)) return false;
  if (!HPE_SKU_REGEX.test(clean)) return false;

  // Filter out spec strings (DDR5-6400, DDR4-3200, CAS-52, SFP-10G) and non-HPE vendor prefixes
  if (/^(DDR[345]|CAS|CAT|SFP|QSFP|RJ45|PCIE|USB)-/i.test(clean)) return false;
  if (/^(N9K|C9[0-9]{3}|WS-C|AFF|FAS|CAB|EX[0-9]{4}|MX[0-9]{3}|POWEREDGE)-/i.test(clean)) return false;
  if (/^X[0-9]{5}[A-Z]-[A-Z0-9]+$/i.test(clean)) return false;
  if (/^(N9K|AFF|FAS|CAB-C)/i.test(clean)) return false;

  // Filter out memory/speed dimension strings (e.g. 1x64GB, 2x32GB)
  if (/^\d+x\d+/i.test(clean)) return false;

  // For hyphenated hardware SKUs, enforce HPE prefix (5-7 chars) and standard suffix (e.g. B21, F21, 001, AA1)
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length !== 2) return false;
    const [pfx, sfx] = parts;
    // Reject foreign switch models like 93180YC or C93180
    if (/^[0-9]+[A-Z]{2,}$/i.test(pfx)) return false;
    // Standard HPE hyphenated hardware suffixes: -B21, -F21, -K21, -H21, -B22, -B23, -B19, -0D1, -001, -AA1, -AB1, -291, -371, -D63, -KD3, -B##, -###, -[A-Z]##
    if (!/^(B2[1-9]|F2[1-9]|K2[1-9]|H2[1-9]|B19|0D1|001|AA1|AB1|291|371|D63|KD3|B[0-9]{2}|[0-9]{3}|[A-Z][0-9]{2})$/i.test(sfx)) return false;
  }

  // For bare 6-character matches (no hyphen), enforce standard HPE 6-char hardware SKU structure or Service SKU
  if (!clean.includes('-') && clean.length === 6) {
    if (!/\d/.test(clean) || !/[A-Z]/i.test(clean)) return false;
    // Model shorthands like MR416i end in lowercase i or p
    if (/^[A-Z]{2,3}\d+[ip]$/i.test(clean)) return false;
    // Standard HPE 6-character hardware SKUs end with a letter (e.g. C0H28A, Q2R32A, R6F55A) or are Service SKUs starting with H/U/R/S/E
    if (!/^[A-Z0-9]{5}[A-Z]$/i.test(clean) && !/^[HURS][A-Z0-9]{5}$/i.test(clean)) return false;
  }

  return true;
}

/**
 * Strip CTO / BTO / FIO suffix from SKU string.
 * @param {string} skuStr e.g. "P73282-B21CTO" -> "P73282-B21"
 * @returns {string}
 */
function cleanBaseSKU(skuStr) {
  if (!skuStr) return '';
  let str = String(skuStr).trim();
  // Strip bracketed badges like [OB], [DS], [90], [EOL] at start or end
  str = str.replace(/\s*\[(?:OB|DS|90|EOL|NA|N\/A)\]\s*$/i, '').trim();
  str = str.replace(/^\s*\[(?:OB|DS|90|EOL|NA|N\/A)\]\s*/i, '').trim();
  // Strip leading lifecycle / status badges (e.g. "OB\n P49631-B21", "DS P49632-B21", "90\n P49639-B21", "EOL P49654-B21")
  str = str.replace(/^(?:OB|DS|90|EOL|NA|N\/A|BTO|CTO|FIO)\s+/i, '').trim();
  // Strip leading DOM target element prefix 't' or 'T' if followed by valid SKU pattern starting with P, Q, R, or digit (e.g. tP69726-B21 or TP73111-B21 -> P69726-B21)
  if (/^[tT][PQR0-9][A-Z0-9]{4,6}(-[A-Z0-9]+)?$/i.test(str)) {
    str = str.substring(1);
  }
  // Strip trailing option codes after spaces or CTO/BTO/FIO suffix (e.g. "P73282-B21  B19" -> "P73282-B21", "P73831-B21  0D1" -> "P73831-B21", "P73831-B21#0D1" -> "P73831-B21")
  str = str.replace(/(?:\s+|#)(?:0D1|OD1|B19|B21|#0D1|#B19|#B21)\b/i, '').trim();
  str = str.replace(/(CTO|BTO|FIO)$/i, '');
  // Strip leading option badges/prefixes and punctuation (e.g. "[P73282-B21]", "P49147-B21.")
  return str.replace(/^[\[\(\{"'`<]+|[\]\)\}"'`,;.:!?\/>]+$/g, '').trim();
}

/**
 * Determine Option Type based on SKU suffix.
 * @param {string} skuStr
 * @returns {'CTO' | 'BTO' | 'FIO' | 'Standard' | 'Service'}
 */
function classifyOptionType(skuStr) {
  const str = String(skuStr || '').trim().toUpperCase();
  if (str.endsWith('CTO')) return 'CTO';
  if (str.endsWith('BTO')) return 'BTO';
  if (str.endsWith('FIO') || /\s+0D1\b/i.test(str)) return 'FIO';
  if (isServiceSku(str)) return 'Service';
  return 'Standard';
}

/**
 * Identify if SKU is a Service or Support SKU
 * @param {string} skuStr 
 * @returns {boolean}
 */
function isServiceSku(skuStr) {
  if (!skuStr) return false;
  const clean = cleanBaseSKU(skuStr).trim();
  // Service SKUs typically start with H, U, R, S or end with AAE (software E-LTU)
  return /^[HURS][A-Z0-9]{4,11}$/i.test(clean) || /^[A-Z0-9]{5,8}AAE$/i.test(clean);
}

module.exports = {
  HPE_SKU_REGEX,
  HPE_SKU_EXTRACT_REGEX,
  isValidHpeSKU,
  cleanBaseSKU,
  classifyOptionType,
  isServiceSku
};
