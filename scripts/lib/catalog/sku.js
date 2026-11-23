'use strict';
/**
 * scripts/lib/sku.js — Centralized HPE SKU Normalization & Validation Utility
 *
 * Provides authoritative regexes and methods for extracting, validating,
 * and categorizing HPE hardware SKUs, option suffixes, and service SKUs.
 */

const fs = require('fs');

// Universal HPE SKU Regex
// Matches:
// 1. Hyphenated hardware SKUs: P73282-B21, 867796-B21, P07646-B21
// 2. 6-character hardware SKUs: C0H28A, Q2R32A, BC002A, N9X06A, TC480A, R2E09A
// 3. Software / E-LTU SKUs: E5Y35AAE, E5Y43AAE, BD505A
// 4. Service / Support SKUs: H7J34A3, HA114A1, HU4A6E, U4391E, R4H12A, S2S05A, HU4B2A3, HU4B2A30C4V
const HPE_SKU_REGEX = /^([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}(?:AAE)?|[HURS][A-Z0-9]{4,11}|[HU][A-Z0-9]{4,11}#[A-Z0-9]{3}|[A-Z0-9]{5}[A-Z]#[A-Z0-9]{3})$/i;

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

  // Filter out internal DOM pattern IDs, selector controls, core count labels, and common words
  if (/^(?:cntr\d+|da\d+|dl\d+smtch|slot\w+)/i.test(clean) || /pat0|00300|core|recovery|simplified|rowcount|context/i.test(clean)) return false;
  if (COMMON_WORDS_FILTER.test(clean)) return false;
  // Filter out server model family names (e.g. DL360, DL380, DL380a, DL145, DL580, ML350, SY480) which are not part numbers
  if (/^(?:DL|ML|SY|GX|BL|XL|RL|SL|SN|CN)\d{2,4}[A-Z]?$/i.test(clean)) return false;
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
  let str = String(skuStr).replace(/[\r\n\t]+/g, ' ').trim();
  // Strip bracketed badges like [OB], [DS], [90], [EOL] at start or end
  str = str.replace(/\s*\[(?:OB|OS|DS|90|EOL|NA|N\/A|CS)\]\s*$/i, '').trim();
  str = str.replace(/^\s*\[(?:OB|OS|DS|90|EOL|NA|N\/A|CS)\]\s*/i, '').trim();
  // Strip leading lifecycle / status badges (e.g. "OB\n P49631-B21", "DS P49632-B21", "90\n P49639-B21", "EOL P49654-B21")
  str = str.replace(/^(?:OB|OS|DS|90|EOL|NA|N\/A|CS|BTO|CTO|FIO)\s+/i, '').trim();
  // Strip trailing PVT / Private badge
  str = str.replace(/\s+PVT$/i, '').trim();
  // Strip leading DOM target element prefix 't' or 'T' if followed by valid SKU pattern starting with P, Q, R, or digit (e.g. tP69726-B21 or TP73111-B21 -> P69726-B21)
  if (/^[tT][PQR0-9][A-Z0-9]{4,6}(-[A-Z0-9]+)?$/i.test(str)) {
    str = str.substring(1);
  }
  // Strip trailing option codes after spaces or CTO/BTO/FIO suffix (e.g. "P73282-B21  B19" -> "P73282-B21", "P73831-B21  0D1" -> "P73831-B21", "HU4B2A3 Z1R" -> "HU4B2A3")
  // Preserve distinct service and localization option suffixes like #Z1R or R7R97A#AC3 while stripping factory FIO tags (#0D1/#OD1/#B19/#B21).
  str = str.replace(/(?:\s+|#)(?:0D1|OD1|B19|B21|#0D1|#B19|#B21|[A-Z0-9]{3,4})\b/i, (m, offset, full) => {
    if (m.startsWith('#') && !/^#(?:0D1|OD1|B19|B21)$/i.test(m) &&
        (/^[HU][A-Z0-9]{4,11}#[A-Z0-9]{3}$/i.test(full) || /^[A-Z0-9]{5}[A-Z]#[A-Z0-9]{3}$/i.test(full))) {
      return m;
    }
    const prefix = full.substring(0, offset).trim();
    if (/^[A-Z0-9]{3,8}-[A-Z0-9]{3,4}$/i.test(prefix) || /^[HURS][A-Z0-9]{4,8}$/i.test(prefix)) {
      return '';
    }
    return m;
  }).trim();
  str = str.replace(/(CTO|BTO|FIO)$/i, '');
  // Strip leading option badges/prefixes and punctuation (e.g. "[P73282-B21]", "P49147-B21.")
  return str.replace(/^[[({"'`<]+|[\])}"'`,;.:!?/>]+$/g, '').trim();
}

/**
 * Identify whether a SKU or description represents a pre-configured HPE Smart Choice /
 * Regional BTO server bundle (e.g. P71674-425 EMEA, -005 US/AMS, -295 JP, -375 APJ, -AA5 CN).
 * Distinct from legacy 6-digit numeric cable/accessory SKUs (e.g. 834972-B25).
 * @param {string} skuStr
 * @param {string} [description='']
 * @returns {boolean}
 */
function isSmartChoiceOrBtoSku(skuStr, description = '') {
  const raw = String(skuStr || '').replace(/[\r\n\t]+/g, ' ').trim();
  const clean = cleanBaseSKU(raw);
  const desc = String(description || '').trim();
  if (!clean && !desc) return false;
  if (/\bBTO$/i.test(raw) && !/\bBTO\/CTO$/i.test(raw)) return true;
  if (/^[PQRS][0-9A-Z]{5}-(?:005|035|045|055|205|295|375|425|AA5|[0-9]{2}5)$/i.test(clean)) {
    return true;
  }
  if (/\b(?:smart\s*choice|smart\s*buy|pre-?configured\s+bto)\b/i.test(desc)) {
    return true;
  }
  return false;
}

const SMART_CHOICE_REGION_LABELS = {
  '005': 'US / Americas (-005)',
  '035': 'UK (-035)',
  '045': 'Germany (-045)',
  '055': 'France (-055)',
  '205': 'Canada (-205)',
  '295': 'Japan (-295)',
  '375': 'Asia Pacific (-375)',
  '425': 'EMEA (-425)',
  'AA5': 'China (-AA5)'
};

/**
 * Classify commercial fulfillment modality (Smart Choice BTO vs. CTO vs. FIO vs. Standard).
 * References CLIC Rule 81016667 (FIO without CTO base chassis) and Warning 81400509 (no-CTO-if-Smart-Buy),
 * plus HPE ProLiant Compute Smart Choice Supplemental QuickSpecs (a50009219enw).
 * @param {string} skuStr
 * @param {string} [description='']
 * @returns {{ sku: string, isSmartChoiceBto: boolean, fulfillmentMode: string, regionSuffix: string|null, regionLabel: string|null, clicRuleIds: string[], referenceDocId: string, guidance: string|null }}
 */
function classifyCommercialFulfillmentMode(skuStr, description = '') {
  const clean = cleanBaseSKU(skuStr);
  const isSmartChoice = isSmartChoiceOrBtoSku(skuStr, description);
  const suffixMatch = clean.match(/-([0-9A-Z]{2}5)$/i);
  const regionSuffix = suffixMatch ? suffixMatch[1].toUpperCase() : null;
  const regionLabel = regionSuffix ? (SMART_CHOICE_REGION_LABELS[regionSuffix] || `Regional BTO (-${regionSuffix})`) : null;

  if (isSmartChoice) {
    return {
      sku: clean,
      isSmartChoiceBto: true,
      fulfillmentMode: 'SMART_CHOICE_BTO',
      regionSuffix,
      regionLabel,
      clicRuleIds: ['81016667', '81400509'],
      referenceDocId: 'a50009219enw',
      guidance: `SKU ${clean} is a pre-configured HPE Smart Choice / Regional BTO server bundle${regionLabel ? ` (${regionLabel})` : ''}. Do NOT inject an unverified CTO base chassis shell into OCA Customize to force-validate it (CLIC Rule 81016667: FIO options require a -B21 CTO base chassis; CLIC Warning 81400509: no-CTO-if-Smart-Buy). Order ${clean} as a standalone pre-configured Smart Choice BTO SKU with field-installable (BTO-compatible) options only (verify factory contents via HPE Smart Choice Supplemental QuickSpecs a50009219enw or iQuote Universal), OR pivot to a Configure-To-Order (-B21) base chassis for custom FIO configurations.`
    };
  }

  const optType = classifyOptionType(skuStr, description);
  return {
    sku: clean,
    isSmartChoiceBto: false,
    fulfillmentMode: optType.toUpperCase(),
    regionSuffix: null,
    regionLabel: null,
    clicRuleIds: [],
    referenceDocId: 'a50009219enw',
    guidance: null
  };
}

/**
 * Determine Option Type based on SKU suffix or Smart Choice BTO pattern.
 * @param {string} skuStr
 * @param {string} [description='']
 * @returns {'CTO' | 'BTO' | 'FIO' | 'Standard' | 'Service' | 'BTO/CTO'}
 */
function classifyOptionType(skuStr, description = '') {
  const str = String(skuStr || '').replace(/[\r\n\t]+/g, ' ').trim().toUpperCase();
  if (str === 'BTO/CTO' || str.endsWith('BTO/CTO')) return 'BTO/CTO';
  if (str.endsWith('CTO')) return 'CTO';
  if (str.endsWith('BTO') || isSmartChoiceOrBtoSku(skuStr, description)) return 'BTO';
  if (str.endsWith('FIO') || /\s+0D1\b/i.test(str)) return 'FIO';
  if (isServiceSku(str)) return 'Service';
  return 'Standard';
}

/**
 * Identify whether a BOM line item is a companion OCA modifier / tracking row
 * (e.g. "P74571-B21  0D1" with description "Factory Integrated", or "P73282-B21  B19" regional code).
 * Such rows share the base SKU of their parent hardware item and MUST NOT be double-counted
 * as physical components during aspect evaluation (INV-209).
 * @param {string} skuStr
 * @param {string} [description='']
 * @returns {boolean}
 */
function isOcaModifierTrackingRow(skuStr, description = '') {
  const raw = String(skuStr || '').replace(/[\r\n\t]+/g, ' ').trim();
  const desc = String(description || '').trim().toLowerCase();
  if (/(?:\s+|#)(?:0D1|OD1|B19|#0D1|#B19)\b/i.test(raw)) return true;
  if (desc === 'factory integrated') return true;
  return false;
}

/**
 * Identify if SKU is a Service or Support SKU
 * @param {string} skuStr 
 * @returns {boolean}
 */
function isServiceSku(skuStr) {
  if (!skuStr) return false;
  const clean = cleanBaseSKU(skuStr).trim();
  // Service SKUs typically start with H (Care Packs: HA114A1, HU4B2A3, H7J34A3),
  // U (legacy Care Packs: U4391E), or end with AAE (software E-LTU: R7A11AAE, E5Y35AAE).
  // Standard 6-char hardware SKUs like S3U30C (H200 GPU), S2L70C (L40S GPU), R2E09A (FC HBA) are physical hardware.
  return /^[HU][A-Z0-9]{4,11}(?:#[A-Z0-9]{3})?$/i.test(clean) || /^[A-Z0-9]{5,8}AAE$/i.test(clean);
}

/**
 * Normalize HPE catalog/row lifecycle status & badges into canonical lifecycle flags.
 * Handles catalog formats ("Obsolete (OB)", "End of Life (EOL)", "Direct Ship (DS)",
 * "EOL Warning (90-Day)", "DISCONTINUED", "REMOVED", "ACTIVE") and compact codes.
 *
 * @param {string} [lifecycleStatus='']
 * @param {string} [diffStatus='']
 * @param {string} [rawSku='']
 * @param {string} [rawDesc='']
 * @returns {{ canonicalStatus: string, isObsolete: boolean, isDiscontinued: boolean, isHardEol: boolean, is90DayWarning: boolean, isDirectShip: boolean, isBlockedForProduction: boolean, isClearanceOrRestricted: boolean, isNonActive: boolean }}
 */
function _resolveCanonicalLifecycle(isDiscontinued, isObsolete, isHardEol, is90DayWarning, isDirectShip, isConstrainedSupply) {
  if (isDiscontinued) return 'DISCONTINUED';
  if (isObsolete) return 'OBSOLETE';
  if (isHardEol) return 'EOL';
  if (isConstrainedSupply) return 'CONSTRAINED_SUPPLY';
  if (is90DayWarning) return '90_DAY_WARNING';
  if (isDirectShip) return 'DIRECT_SHIP';
  return 'ACTIVE';
}

function classifyLifecycleState(lifecycleStatus = '', diffStatus = '', rawSku = '', rawDesc = '', vendorSupplyStatus = '') {
  const status = String(lifecycleStatus || '').trim().toUpperCase();
  const diff = String(diffStatus || '').trim().toUpperCase();
  const text = `${String(rawSku || '').trim().toUpperCase()} ${String(rawDesc || '').trim().toUpperCase()}`;

  const is90DayWarning = /\b90[-_\s]?DAY(?:\b|_)|\[90\]|^90(?:$|\s)/i.test(status) || /\[90\]|(?:^|\s)90\s|90[-\s]?DAY/i.test(text);
  const isObsolete = /\b(?:OB|OS|OBSOLETE)\b|\bOUT[\s_-]+OF[\s_-]+STOCK\b/i.test(status) || /\[(?:OB|OS)\]/i.test(text) ||
    /^(?:OB|OS)\s+/i.test(String(rawSku || '').trim()) || /^\s*OB\s+/i.test(rawDesc || '');
  const isDiscontinued = status.includes('DISCONTINUED') || diff === 'REMOVED';
  const isHardEol = !is90DayWarning && (
    /\bEOL\b|\(EOL\)|END[-\s]OF[-\s]LIFE/i.test(status) || /\[EOL\]|(?:^|\s)EOL\s+/i.test(text)
  );
  const isDirectShip = /\bDS\b|\(DS\)|DIRECT[\s_-]*SHIP/i.test(status) || /\[DS\]|(?:^|\s)DS\s+/i.test(text);
  const isConstrainedSupply = vendorSupplyStatus === 'CONSTRAINED_SUPPLY' || /\bCS\b|CONSTRAINED[\s_-]*SUPPLY|SUPPLY[\s_-]*(?:RESTRICTED|CONSTRAINED)/i.test(status) || /\[CS\]|(?:^|\s)CS\s+/i.test(text);

  const isBlockedForProduction = isObsolete || isDiscontinued || isHardEol;
  const isClearanceOrRestricted = is90DayWarning || isDirectShip || isConstrainedSupply;
  const isNonActive = isBlockedForProduction || isClearanceOrRestricted;

  return {
    canonicalStatus: _resolveCanonicalLifecycle(isDiscontinued, isObsolete, isHardEol, is90DayWarning, isDirectShip, isConstrainedSupply),
    isObsolete,
    isDiscontinued,
    isHardEol,
    is90DayWarning,
    isDirectShip,
    isConstrainedSupply,
    isBlockedForProduction,
    isClearanceOrRestricted,
    isNonActive
  };
}

function _isNonActiveLifecycle(lifecycleStatus = '', diffStatus = '', rawSku = '', rawDesc = '') {
  return classifyLifecycleState(lifecycleStatus, diffStatus, rawSku, rawDesc).isBlockedForProduction;
}

function _indexCatalogEntries(entries, index) {
  for (const entry of (entries || [])) {
    const parentCategory = entry.parentCategory || '';
    const subCategory = entry.subCategory || '';
    if (!Array.isArray(entry.skus)) continue;
    for (const s of entry.skus) {
      const raw = s['Product #'] || s.sku || s['SKU'];
      const clean = cleanBaseSKU(raw);
      if (clean && !index.has(clean)) {
        const lifecycleStatus = s['Lifecycle Status'] || s.lifecycleStatus || s.Status || '';
        const diffStatus = s['Diff Status'] || s.diffStatus || '';
        index.set(clean, {
          entry,
          skuData: s,
          parentCategory,
          subCategory,
          lifecycleStatus,
          diffStatus,
          lifecycleState: classifyLifecycleState(lifecycleStatus, diffStatus, raw, s.Description || s.description, s.vendorSupplyStatus)
        });
      }
    }
  }
}

/**
 * Attach companion *_Services.json entries as a non-enumerable _servicesEntries
 * property without mutating catalogData.entries or metadata counts (INV-186).
 * @param {object} catalogData
 * @param {string} catalogJsonPath
 * @returns {object}
 */
function attachCompanionServices(catalogData, catalogJsonPath) {
  if (!catalogData || typeof catalogData !== 'object' || !catalogJsonPath || catalogData._servicesEntries) {
    return catalogData;
  }
  const servicesPath = String(catalogJsonPath).replace(/_Catalog\.json$/i, '_Services.json');
  if (servicesPath === String(catalogJsonPath) || !fs.existsSync(servicesPath)) {
    return catalogData;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
    Object.defineProperty(catalogData, '_servicesEntries', {
      value: Array.isArray(parsed?.entries) ? parsed.entries : [],
      enumerable: false,
      configurable: true
    });
  } catch { /* ignore unreadable companion services file */ }
  return catalogData;
}

/**
 * Normalize WebLogic OCA negative maxQty sentinels (-1/-2/-3) to null.
 * @param {number|null|undefined} maxQty
 * @returns {number|null|undefined}
 */
function normalizeMaxQtySentinel(maxQty) {
  return (typeof maxQty === 'number' && maxQty < 0) ? null : maxQty;
}

/**
 * Build or retrieve a memoized Map index for O(1) catalog SKU lookups.
 * @param {object} catalogData - Catalog JSON data object
 * @returns {Map<string, { entry: object, skuData: object, parentCategory: string, subCategory: string, lifecycleStatus: string, diffStatus: string, lifecycleState: object }>}
 */
function buildCatalogSkuIndex(catalogData) {
  if (!catalogData || !Array.isArray(catalogData.entries)) return new Map();
  if (catalogData._skuIndex instanceof Map) return catalogData._skuIndex;

  const index = new Map();
  _indexCatalogEntries(catalogData.entries, index);
  if (Array.isArray(catalogData._servicesEntries)) {
    _indexCatalogEntries(catalogData._servicesEntries, index);
  }

  catalogData._skuIndex = index;
  return index;
}

/**
 * Classify a SKU across the 3-tier epistemic validation hierarchy (INV-0).
 *
 * Tier 0 — Syntactic Validity: Does the string match HPE SKU format patterns?
 * Tier 2 — Catalog Presence: Is the SKU present in the scoped product catalog?
 * Tier 2+ — Lifecycle Status: What is the SKU's ordering lifecycle state?
 *
 * This function MUST NOT be used to prove live orderability (Tier 3).
 * Live orderability requires a CLIC/OCA portal acceptance receipt.
 *
 * @param {string} sku - The raw SKU string to classify
 * @param {object|null} [catalogData=null] - Scoped catalog data (optional)
 * @returns {{ sku: string, cleanSku: string, isSyntacticallyValid: boolean, isCatalogVerified: boolean, lifecycleStatus: string, category: string, optionType: string, isService: boolean }}
 */
function classifySkuValidation(sku, catalogData = null, description = '') {
  const cleanSku = cleanBaseSKU(sku);
  const isSyntacticallyValid = isValidHpeSKU(cleanSku);
  const optionType = classifyOptionType(sku, description);
  const isService = isServiceSku(cleanSku);
  const commercialFulfillment = classifyCommercialFulfillmentMode(sku, description);

  // Default classification: syntax-only (Tier 0)
  const result = {
    sku: String(sku || ''),
    cleanSku,
    isSyntacticallyValid,
    isCatalogVerified: false,
    lifecycleStatus: 'CATALOG_NOT_SUPPLIED',
    category: commercialFulfillment.isSmartChoiceBto ? 'SMART_CHOICE_BTO_CHASSIS' : 'UNKNOWN',
    optionType,
    isService,
    isSmartChoiceBto: commercialFulfillment.isSmartChoiceBto,
    commercialFulfillment
  };

  // If syntax is invalid, no further tiers can pass
  if (!isSyntacticallyValid) {
    result.lifecycleStatus = 'INVALID_SYNTAX';
    return result;
  }

  // If no catalog data provided, we can only confirm syntax — epistemic honesty (INV-0)
  if (!catalogData) {
    if (commercialFulfillment.isSmartChoiceBto) {
      result.lifecycleStatus = 'SMART_CHOICE_BTO_PRECONFIGURED';
    }
    return result;
  }

  // Tier 2: Catalog presence check via scoped catalog index
  const catalogIndex = buildCatalogSkuIndex(catalogData);
  const catalogEntry = catalogIndex.get(cleanSku);

  if (!catalogEntry) {
    result.lifecycleStatus = commercialFulfillment.isSmartChoiceBto
      ? 'SMART_CHOICE_BTO_NOT_IN_CTO_CATALOG'
      : 'NOT_IN_CATALOG';
    return result;
  }

  // SKU exists in scoped catalog
  result.isCatalogVerified = true;
  result.lifecycleStatus = catalogEntry.lifecycleStatus || 'ACTIVE';
  result.category = catalogEntry.parentCategory || catalogEntry.subCategory || 'HARDWARE';

  return result;
}

function getUniqueSkuCount(entries) {
  const set = new Set();
  (entries || []).forEach(e => (e.skus || []).forEach(s => {
    const pn = String(s.sku || s['Product #'] || '').trim();
    if (pn) set.add(pn);
  }));
  return set.size;
}

function isTaaGtaCatalogOption(sku, description) {
  return /\b(?:TAA|GTA)\b|#GTA/i.test(`${sku || ''} ${description || ''}`);
}

module.exports = {
  HPE_SKU_REGEX,
  HPE_SKU_EXTRACT_REGEX,
  isValidHpeSKU,
  cleanBaseSKU,
  isSmartChoiceOrBtoSku,
  classifyCommercialFulfillmentMode,
  classifyOptionType,
  isOcaModifierTrackingRow,
  isServiceSku,
  isTaaGtaCatalogOption,
  classifyLifecycleState,
  isNonActiveLifecycle: _isNonActiveLifecycle,
  attachCompanionServices,
  normalizeMaxQtySentinel,
  buildCatalogSkuIndex,
  classifySkuValidation,
  getUniqueSkuCount
};

