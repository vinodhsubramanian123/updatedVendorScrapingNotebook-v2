'use strict';
/**
 * scripts/lib/scraper/vendor_portal_router.js — Multi-Vendor Configurator Router
 *
 * Provides a unified entry point for vendor-specific CDP navigators and scrapers.
 * Guarantees strict isolation between:
 * - HPE (WebLogic OCA / Partner Portal SSO / Tab 1 Recovery)
 * - Dell (Dell Premier / OSC / REST API Sniffing)
 * - Cisco (Cisco Commerce Workspace CCW)
 * - Lenovo (Lenovo Data Center Solution Configurator DCSC)
 */

const { navigateToOCAChassis, discoverChassisCandidates: discoverHpeCandidates } = require('./navigate_oca.js');
const { navigateToDellChassis, discoverDellChassisCandidates } = require('./navigate_dell.js');
const logger = require('../system/pipeline_logger.js');

const PILLAR_CANONICAL_MAP = Object.freeze({
  server: 'Server',
  compute: 'Server',
  proliant: 'Server',
  poweredge: 'Server',
  thinksystem: 'Server',
  ucs: 'Server',
  blade: 'Server',
  hpc: 'Server',
  ai_cluster: 'Server',
  aicluster: 'Server',
  storage: 'Storage',
  alletra: 'Storage',
  nimble: 'Storage',
  storeever: 'Storage',
  storeonce: 'Storage',
  msa: 'Storage',
  powerstore: 'Storage',
  powervault: 'Storage',
  archive: 'Storage',
  tape: 'Storage',
  networking: 'Networking',
  network: 'Networking',
  san: 'Networking',
  fc: 'Networking',
  fabric: 'Networking',
  switch: 'Networking',
  aruba: 'Networking',
  nexus: 'Networking',
  catalyst: 'Networking',
  synergy: 'Composite',
  composite: 'Composite',
  composable: 'Composite',
  converged: 'Composite'
});

/**
 * Normalize pillar or solution domain token into canonical domains:
 * 'Server' | 'Storage' | 'Networking' | 'Composite'
 * @param {string} pillar
 * @param {string|null} [fallback='Server']
 * @returns {string|null}
 */
function normalizeSolutionPillar(pillar, fallback = 'Server') {
  if (!pillar || typeof pillar !== 'string') return fallback;
  const cleaned = pillar.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!cleaned || cleaned === 'unknown' || cleaned === 'general') return fallback;
  if (PILLAR_CANONICAL_MAP[cleaned]) return PILLAR_CANONICAL_MAP[cleaned];
  if (/synergy|composite|composable|converged/.test(cleaned)) return 'Composite';
  if (/network|san|fabric|switch|ethernet|infiniband|aruba|nexus|catalyst/.test(cleaned)) return 'Networking';
  if (/storage|array|alletra|powerstore|nimble|tape|archive|msa|storeever|storeonce/.test(cleaned)) return 'Storage';
  if (/server|compute|proliant|poweredge|thinksystem|ucs|blade|hpc|cray/.test(cleaned)) return 'Server';
  return fallback;
}

const _customVendorPolicies = new Map();

function _findCustomPolicy(vendorKey = '') {
  if (!vendorKey || typeof vendorKey !== 'string') return null;
  return _customVendorPolicies.get(vendorKey.trim().toLowerCase()) || null;
}

/**
 * Default domain classification hook used by built-in and custom portal policies.
 * @param {object} [rawEntry]
 * @param {object} [context]
 * @returns {{ domainPillar: string, matchedBy: string }}
 */
function defaultClassifySolutionDomain(rawEntry = {}, context = {}) {
  const explicit = rawEntry.domainPillar || rawEntry.pillar || rawEntry.solutionDomain;
  if (explicit) {
    const norm = normalizeSolutionPillar(String(explicit), null);
    if (norm) return { domainPillar: norm, matchedBy: 'explicit_entry_pillar' };
  }
  const text = `${rawEntry.parentCategory || rawEntry.category || ''} ${rawEntry.subCategory || ''} ${rawEntry.description || rawEntry.Description || ''}`.toLowerCase();
  if (/\b(synergy\s*12000|composable\s*(?:frame|enclosure)|composite)\b/i.test(text)) {
    return { domainPillar: 'Composite', matchedBy: 'entry_keyword' };
  }
  if (/\b(switch|router|fibre\s*channel|fc\s*switch|sn\d{4}|nexus|catalyst|aruba|infiniband|interconnect|transceiver|sfp28|qsfp28|network\s*adapter|ethernet)\b/i.test(text)) {
    return { domainPillar: 'Networking', matchedBy: 'entry_keyword' };
  }
  if (/\b(alletra|nimble|storeever|storeonce|msa\s*\d+|msl\d+|powerstore|powervault|storage\s*array|storage\s*controller|drive\s*enclosure|tape\s*library|nvme|ssd|hdd|drive\s*cage)\b/i.test(text)) {
    return { domainPillar: 'Storage', matchedBy: 'entry_keyword' };
  }
  if (/\b(proliant|poweredge|thinksystem|ucs|cray|cto\s*server|processor|xeon|epyc|rdimm|ddr5|ddr4|gpu|pcie\s*riser)\b/i.test(text)) {
    return { domainPillar: 'Server', matchedBy: 'entry_keyword' };
  }
  const ctxPillar = context.pillar || context.domain || context.solutionDomain || '';
  return {
    domainPillar: normalizeSolutionPillar(ctxPillar, 'Server'),
    matchedBy: ctxPillar ? 'context_pillar' : 'default'
  };
}

function _appendUniqueNormalizedRule(structuredRules, seen, ruleObj) {
  const text = String(ruleObj.rule || '').trim();
  if (!text) return;
  const key = `${ruleObj.domainPillar}|${ruleObj.ruleType}|${text}`;
  if (seen.has(key)) return;
  seen.add(key);
  structuredRules.push({ ...ruleObj, rule: text });
}

function _collectPortalNetworkRules(networkRules, domainHint, structuredRules, seen) {
  for (const nr of Array.isArray(networkRules) ? networkRules : []) {
    const cls = defaultClassifySolutionDomain(nr, { pillar: domainHint });
    _appendUniqueNormalizedRule(structuredRules, seen, {
      ruleType: nr.ruleType || 'DYNAMIC_RULE',
      domainPillar: cls.domainPillar,
      parentCategory: nr.parentCategory || 'General',
      subCategory: nr.subCategory || '',
      rule: nr.rule || nr.ineligibilityReason || '',
      source: 'network'
    });
  }
}

function _collectPortalDomEntryRules(rawEntries, domainHint, structuredRules, seen) {
  for (const entry of Array.isArray(rawEntries) ? rawEntries : []) {
    const cls = defaultClassifySolutionDomain(entry, { pillar: domainHint });
    const candidates = Array.isArray(entry.rules) ? [...entry.rules] : [];
    if (entry.constraint) candidates.push(entry.constraint);
    for (const c of candidates) {
      const ruleText = typeof c === 'string' ? c : (c?.rule || c?.text || '');
      _appendUniqueNormalizedRule(structuredRules, seen, {
        ruleType: typeof c === 'object' && c?.ruleType ? c.ruleType : 'PORTAL_CONSTRAINT',
        domainPillar: cls.domainPillar,
        parentCategory: entry.parentCategory || entry.category || 'General',
        subCategory: entry.subCategory || '',
        rule: ruleText,
        source: 'dom_entry'
      });
    }
  }
}

function _collectPortalFullTextRules(fullText, resolvedDomain, structuredRules, seen) {
  if (typeof fullText !== 'string' || !fullText.trim()) return;
  const ruleLines = fullText.split(/\r?\n/).filter(l => /\b(?:requires|mutually exclusive|incompatible|min\s+\d+|max\s+\d+)\b/i.test(l)).slice(0, 50);
  for (const line of ruleLines) {
    _appendUniqueNormalizedRule(structuredRules, seen, {
      ruleType: /mutually exclusive|incompatible/i.test(line) ? 'MUTUAL_EXCLUSION' : 'PORTAL_CONSTRAINT',
      domainPillar: resolvedDomain,
      parentCategory: 'Page Notes',
      subCategory: '',
      rule: line.trim(),
      source: 'full_text'
    });
  }
}

/**
 * Default rule extraction hook used by built-in and custom portal policies.
 * @param {Array<object>} [rawEntries]
 * @param {string} [fullText]
 * @param {Array<object>} [networkRules]
 * @param {string|null} [domain]
 * @returns {{ domainPillar: string, structuredRules: Array<object>, totalRules: number }}
 */
function defaultExtractNormalizedRules(rawEntries = [], fullText = '', networkRules = [], domain = null) {
  const resolvedDomain = domain ? normalizeSolutionPillar(domain) : 'Server';
  const domainHint = domain || resolvedDomain;
  const structuredRules = [];
  const seen = new Set();
  _collectPortalNetworkRules(networkRules, domainHint, structuredRules, seen);
  _collectPortalDomEntryRules(rawEntries, domainHint, structuredRules, seen);
  _collectPortalFullTextRules(fullText, resolvedDomain, structuredRules, seen);
  return { domainPillar: resolvedDomain, structuredRules, totalRules: structuredRules.length };
}

/**
 * Infer vendor from product name or explicit parameter
 * @param {string} productQuery E.g. "DL380 Gen12", "PowerEdge R760", "UCS B200"
 * @param {string} [explicitVendor] E.g. "HPE", "Dell", "Cisco", or custom registered vendor
 * @returns {string} Normalized vendor ("HPE", "Dell", "Cisco", "Lenovo", or custom key)
 */
const EXPLICIT_VENDOR_ALIASES = Object.freeze({
  DELL: 'Dell',
  CISCO: 'Cisco',
  LENOVO: 'Lenovo',
  HUAWEI: 'Huawei',
  HPE: 'HPE',
  HP: 'HPE',
  'HEWLETT PACKARD ENTERPRISE': 'HPE'
});

const VENDOR_PRODUCT_MATCHERS = Object.freeze([
  { vendor: 'Dell', pattern: /poweredge|powerstore|powerswitch|\bdell\b|\br\d{3}\b/i },
  { vendor: 'Huawei', pattern: /huawei|fusionserver|taishan|kunlun|oceanstor|cloudengine/i },
  { vendor: 'Cisco', pattern: /\bucs\b|cisco|catalyst|nexus/i },
  { vendor: 'Lenovo', pattern: /thinksystem|thinkagile|lenovo/i },
  { vendor: 'HPE', pattern: /\bhpe\b|proliant|\b(?:dl|ml|rl)\s*\d{3}|synergy|alletra|storeever|\bsn\d{4}/i }
]);

function inferVendor(productQuery = '', explicitVendor = '') {
  if (explicitVendor && typeof explicitVendor === 'string') {
    const key = explicitVendor.trim().toUpperCase();
    if (EXPLICIT_VENDOR_ALIASES[key]) return EXPLICIT_VENDOR_ALIASES[key];
    const custom = _findCustomPolicy(explicitVendor);
    if (custom) return custom.vendor;
    throw new Error(`UNSUPPORTED_VENDOR: ${explicitVendor}`);
  }

  const pq = String(productQuery || '');
  const matched = VENDOR_PRODUCT_MATCHERS.find(entry => entry.pattern.test(pq));
  if (matched) return matched.vendor;

  const lowerPq = pq.toLowerCase();
  for (const policy of _customVendorPolicies.values()) {
    const kws = policy.productKeywords || [];
    if (kws.some(kw => kw && lowerPq.includes(String(kw).toLowerCase()))) return policy.vendor;
  }

  throw new Error('VENDOR_IDENTITY_REQUIRED: No registered vendor identified');
}

/**
 * Discover Chassis Candidates for a given vendor and query
 * @param {WebSocket} ws CDP connection
 * @param {string} query Product query
 * @param {object} [options] Options including explicit vendor
 * @returns {Promise<Array<object>>} Discovered chassis candidate list
 */
async function routeDiscoverCandidates(ws, query, options = {}) {
  const vendor = inferVendor(query, options.vendor);
  logger.info('VENDOR_ROUTER', `Routing chassis candidate discovery to [${vendor}] for query "${query}"`);

  switch (vendor) {
    case 'Dell':
      return discoverDellChassisCandidates(ws, query, options);
    case 'HPE':
      return discoverHpeCandidates(ws, query, options);
    default:
      throw new Error(`VENDOR_ADAPTER_NOT_IMPLEMENTED: ${vendor}`);
  }
}

/**
 * Navigate to chassis configuration page for target vendor
 * @param {WebSocket} ws CDP connection
 * @param {string} query Product query
 * @param {object} [options]
 * @returns {Promise<object>} Navigation summary
 */
async function routeNavigateChassis(ws, query, options = {}) {
  const vendor = inferVendor(query, options.vendor);
  logger.info('VENDOR_ROUTER', `Routing portal navigation to [${vendor}] for query "${query}"`);

  switch (vendor) {
    case 'Dell':
      return navigateToDellChassis(ws, query, options);
    case 'HPE':
      return navigateToOCAChassis(query, options);
    default:
      throw new Error(`VENDOR_ADAPTER_NOT_IMPLEMENTED: ${vendor}`);
  }
}

function _getCustomVendorCredentials(norm, customPolicy) {
  const envPrefix = norm.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const creds = customPolicy.credentials || {};
  const userVar = creds.usernameEnvVar || `${envPrefix}_PORTAL_USER`;
  const passVar = creds.passwordEnvVar || `${envPrefix}_PORTAL_PASS`;
  const urlVar = creds.urlEnvVar || `${envPrefix}_PORTAL_URL`;
  const username = process.env[userVar] || creds.username || '';
  return {
    vendor: customPolicy.vendor,
    portalUrl: process.env[urlVar] || customPolicy.portalUrl || customPolicy.anchorTabUrl || '',
    username,
    password: process.env[passVar] || creds.password || '',
    hasCredentials: Boolean(username)
  };
}

const BUILTIN_CREDENTIAL_SPECS = {
  HPE: { urlEnv: 'HPE_PORTAL_URL', userEnv: 'HPE_PORTAL_USER', passEnv: 'HPE_PORTAL_PASS', defaultUrl: 'https://partner.hpe.com/web/prp' },
  Dell: { urlEnv: 'DELL_PORTAL_URL', userEnv: 'DELL_PORTAL_USER', passEnv: 'DELL_PORTAL_PASS', defaultUrl: 'https://www.dell.com/premier' },
  Cisco: { urlEnv: 'CISCO_PORTAL_URL', userEnv: 'CISCO_PORTAL_USER', passEnv: 'CISCO_PORTAL_PASS', defaultUrl: 'https://apps.cisco.com/Commerce/' },
  Lenovo: { urlEnv: 'LENOVO_PORTAL_URL', userEnv: 'LENOVO_PORTAL_USER', passEnv: 'LENOVO_PORTAL_PASS', defaultUrl: 'https://dcsc.lenovo.com/' },
  Huawei: { urlEnv: 'HUAWEI_PORTAL_URL', userEnv: 'HUAWEI_PORTAL_USER', passEnv: 'HUAWEI_PORTAL_PASS', defaultUrl: 'https://e.huawei.com/en/partner' }
};

/**
 * Retrieve credentials and portal configuration for target vendor.
 * Reads environment variables and optional explicit config overrides without hardcoded usernames.
 *
 * @param {string} [vendor] Vendor name ('HPE', 'Dell', 'Cisco', 'Lenovo', or custom)
 * @param {object} [config] Optional config overrides ({ portalUrl, username, password })
 * @returns {object} { vendor, portalUrl, username, password, hasCredentials }
 */
function getVendorCredentials(vendor = 'HPE', config = {}) {
  const norm = inferVendor('', vendor);
  const custom = _findCustomPolicy(norm);
  if (custom && custom.isCustom) return _getCustomVendorCredentials(norm, custom);

  const cfg = config && typeof config === 'object' ? config : {};
  const spec = BUILTIN_CREDENTIAL_SPECS[norm] || BUILTIN_CREDENTIAL_SPECS.HPE;
  const resolvedVendor = BUILTIN_CREDENTIAL_SPECS[norm] ? norm : 'HPE';
  const username = process.env[spec.userEnv] || cfg.username || '';
  return {
    vendor: resolvedVendor,
    portalUrl: process.env[spec.urlEnv] || cfg.portalUrl || spec.defaultUrl,
    username,
    password: process.env[spec.passEnv] || cfg.password || '',
    hasCredentials: Boolean(username)
  };
}

/**
 * Canonical Vendor Portal Session & Navigation Policies (INV-89 / Multi-Vendor Isolation)
 * Defines how each vendor configurator initiates sessions, which URLs/commands are forbidden,
 * and how stale sessions recover across Server, Storage, Networking, and Composite pillars.
 */
const VENDOR_PORTAL_POLICIES = Object.freeze({
  HPE: Object.freeze({
    vendor: 'HPE',
    configuratorName: 'One Config Advanced (OCA / WebLogic)',
    supportedPillars: ['Server', 'Storage', 'Networking', 'Composite'],
    anchorTabUrl: 'https://partner.hpe.com/group/prp',
    portalUrl: 'https://partner.hpe.com/web/prp',
    urlPatterns: ['partner.hpe.com', 'oca.ext.hpe.com', 'oca.hpe.com'],
    launchSelector: '#quick-links-807 a, a[href*="eServiceId=187402"]',
    handoffMechanism: 'SAML_POST_NEW_TAB',
    allowInPlaceReload: false,
    forbiddenDirectNavigatePatterns: [
      'oca.ext.hpe.com',
      'oca.hpe.com',
      'OCAInternalLogin',
      'eServiceId=187402'
    ],
    recoveryProtocol: 'CLOSE_CONFIG_TAB_RETURN_TO_TAB1_CLICK_QUICK_LINK',
    loginSelectors: Object.freeze({
      ssoButtonSelector: '#oktaSignInBtn',
      usernameSelector: '#username, input[name="username"]',
      passwordSelector: '#password, input[name="password"]',
      submitSelector: '#onepass-submit-btn, button[type="submit"]'
    }),
    navigationSelectors: Object.freeze({
      treeNodeSelector: '.fancytree-title, #selectNavTreeOption',
      menuTabSelector: 'a[href*="extended_overview_menu"], #ui-id-24',
      componentsTabSelector: '.tab_header',
      expandAllSelector: '.expandAll, a[title*="Expand All"]'
    }),
    tableSelectors: Object.freeze({
      tableSelector: 'table',
      rowSelector: 'tr',
      headerSelector: 'th',
      skuColumnAliases: ['Product #', 'SKU', 'Part Number', 'Part #'],
      descriptionColumnAliases: ['Description', 'Option Description', 'Name'],
      priceColumnAliases: ['Unit Price (USD)', 'List Price (USD)', 'Price (USD)', 'Price'],
      constraintColumnAliases: ['Constraint', 'Rules', 'Rule/Note']
    }),
    ruleSelectors: Object.freeze({
      unavailableRuleSelector: '.unavailable-table, .ineligible-rules, tr.disabled',
      ruleContainerSelector: '.rule-note, .constraint-text',
      constraintBadgeSelector: '.badge-constraint, .clic-advice-modal'
    }),
    networkRulePatterns: ['/oca/', 'clic', 'constraint', 'rule', 'getOptions'],
    scrapingInstructions: Object.freeze({
      mode: 'CDP_WEBLOGIC_TAB1_HANDOFF',
      requiresTab1Handoff: true,
      supportsHeadless: true,
      steps: ['Authenticate via Partner Portal SSO on Tab 1', 'Launch OCA from Quick Links', 'Expand #extended_overview_menu', 'Capture hardware/services tabs and unavailable/network rules']
    }),
    defaultDomainClassifier: defaultClassifySolutionDomain,
    defaultRuleExtractor: defaultExtractNormalizedRules
  }),
  Dell: Object.freeze({
    vendor: 'Dell',
    configuratorName: 'Dell Premier / Online Solutions Configurator (OSC)',
    supportedPillars: ['Server', 'Storage', 'Networking'],
    anchorTabUrl: 'https://www.dell.com/premier',
    portalUrl: 'https://www.dell.com/premier',
    urlPatterns: ['dell.com/premier', 'premier.dell.com', 'dsa.dell.com'],
    launchSelector: 'a[href*="configurator"], a[href*="osc"]',
    handoffMechanism: 'SPA_REST_SESSION',
    allowInPlaceReload: true,
    forbiddenDirectNavigatePatterns: [],
    recoveryProtocol: 'REAUTHENTICATE_PREMIER_PORTAL',
    loginSelectors: Object.freeze({
      usernameSelector: 'input[type="email"], #SignInModel_EmailAddress',
      passwordSelector: 'input[type="password"], #SignInModel_Password',
      submitSelector: '#btnSignIn, button[type="submit"]'
    }),
    navigationSelectors: Object.freeze({
      treeNodeSelector: '.osc-category-nav, [data-testid="config-category"]',
      menuTabSelector: '.osc-options-panel',
      expandAllSelector: '.expand-all-groups'
    }),
    tableSelectors: Object.freeze({
      tableSelector: 'table, .osc-option-list',
      rowSelector: 'tr, .osc-option-row',
      headerSelector: 'th',
      skuColumnAliases: ['Option ID', 'SKU', 'Module ID', 'Part Number'],
      descriptionColumnAliases: ['Description', 'Option Name', 'Module Name'],
      priceColumnAliases: ['List Price', 'Unit Price', 'Price'],
      constraintColumnAliases: ['Compatibility', 'Requirement', 'Notes']
    }),
    ruleSelectors: Object.freeze({
      unavailableRuleSelector: '.osc-incompatible, .validation-banner',
      ruleContainerSelector: '.osc-constraint-note'
    }),
    networkRulePatterns: ['/osc/', '/premier/', 'validation', 'rules', 'configuration'],
    scrapingInstructions: Object.freeze({
      mode: 'SPA_REST_SNIFFER',
      requiresTab1Handoff: false,
      supportsHeadless: true,
      steps: ['Authenticate to Dell Premier', 'Navigate to OSC chassis configurator', 'Intercept REST validation rules and normalize Option IDs']
    }),
    defaultDomainClassifier: defaultClassifySolutionDomain,
    defaultRuleExtractor: defaultExtractNormalizedRules
  }),
  Cisco: Object.freeze({
    vendor: 'Cisco',
    configuratorName: 'Cisco Commerce Workspace (CCW)',
    supportedPillars: ['Server', 'Storage', 'Networking'],
    anchorTabUrl: 'https://apps.cisco.com/Commerce/',
    portalUrl: 'https://apps.cisco.com/Commerce/',
    urlPatterns: ['apps.cisco.com/Commerce', 'apps.cisco.com/ccw', 'cisco.com/ccw'],
    launchSelector: 'a[href*="estimate"], a[href*="config"]',
    handoffMechanism: 'OAUTH_SSO_REDIRECT',
    allowInPlaceReload: true,
    forbiddenDirectNavigatePatterns: [],
    recoveryProtocol: 'REAUTHENTICATE_CCW_PORTAL',
    loginSelectors: Object.freeze({
      usernameSelector: '#idp-discovery-username, input[name="identifier"]',
      passwordSelector: '#okta-signin-password, input[type="password"]',
      submitSelector: '#idp-discovery-submit, input[type="submit"]'
    }),
    navigationSelectors: Object.freeze({
      treeNodeSelector: '.ccw-config-tree, .config-nav-item',
      menuTabSelector: '.ccw-options-tab'
    }),
    tableSelectors: Object.freeze({
      tableSelector: 'table, .ccw-bom-table',
      rowSelector: 'tr',
      headerSelector: 'th',
      skuColumnAliases: ['Part Number', 'PID', 'SKU'],
      descriptionColumnAliases: ['Description', 'Product Description'],
      priceColumnAliases: ['List Price', 'Extended List Price', 'Unit Price'],
      constraintColumnAliases: ['Validation', 'Message', 'Constraint']
    }),
    ruleSelectors: Object.freeze({
      unavailableRuleSelector: '.ccw-error-banner, .ccw-invalid-option',
      ruleContainerSelector: '.ccw-rule-message'
    }),
    networkRulePatterns: ['/ccw/', '/Commerce/', 'validate', 'rules'],
    scrapingInstructions: Object.freeze({
      mode: 'OAUTH_SPA_DOM',
      requiresTab1Handoff: false,
      supportsHeadless: true,
      steps: ['Complete Cisco SSO', 'Open CCW estimate/configuration', 'Capture PIDs, prices, and validation messages']
    }),
    defaultDomainClassifier: defaultClassifySolutionDomain,
    defaultRuleExtractor: defaultExtractNormalizedRules
  }),
  Lenovo: Object.freeze({
    vendor: 'Lenovo',
    configuratorName: 'Lenovo Data Center Solution Configurator (DCSC)',
    supportedPillars: ['Server', 'Storage', 'Networking'],
    anchorTabUrl: 'https://dcsc.lenovo.com/',
    portalUrl: 'https://dcsc.lenovo.com/',
    urlPatterns: ['dcsc.lenovo.com', 'lenovo.com'],
    launchSelector: 'a[href*="configure"], button[data-action*="configure"]',
    handoffMechanism: 'PUBLIC_OR_PARTNER_SPA',
    allowInPlaceReload: true,
    forbiddenDirectNavigatePatterns: [],
    recoveryProtocol: 'NAVIGATE_DCSC_HOME',
    loginSelectors: Object.freeze({
      usernameSelector: 'input[name="username"], input[type="email"]',
      passwordSelector: 'input[type="password"]',
      submitSelector: 'button[type="submit"]'
    }),
    navigationSelectors: Object.freeze({
      treeNodeSelector: '.dcsc-category-tree, .configurator-nav',
      menuTabSelector: '.dcsc-tab-content',
      expandAllSelector: '.expand-all'
    }),
    tableSelectors: Object.freeze({
      tableSelector: 'table, .dcsc-options-grid',
      rowSelector: 'tr, .dcsc-option-row',
      headerSelector: 'th',
      skuColumnAliases: ['Feature Code', 'Part Number', 'MTM', 'SKU'],
      descriptionColumnAliases: ['Description', 'Component Name', 'Title'],
      priceColumnAliases: ['List Price', 'Price (USD)', 'Unit Price'],
      constraintColumnAliases: ['Rules', 'Compatibility', 'Prerequisite']
    }),
    ruleSelectors: Object.freeze({
      unavailableRuleSelector: '.dcsc-conflict, .option-disabled',
      ruleContainerSelector: '.dcsc-rule-note'
    }),
    networkRulePatterns: ['/dcsc/', '/api/config', 'rules', 'compatibility'],
    scrapingInstructions: Object.freeze({
      mode: 'DCSC_SPA_DOM',
      requiresTab1Handoff: false,
      supportsHeadless: true,
      steps: ['Open DCSC product configurator', 'Expand hardware/storage/networking/services groups', 'Extract Feature Codes, MTM SKUs, prices, and compatibility rules']
    }),
    defaultDomainClassifier: defaultClassifySolutionDomain,
    defaultRuleExtractor: defaultExtractNormalizedRules
  }),
  Huawei: Object.freeze({
    vendor: 'Huawei',
    configuratorName: 'Huawei SCT / UniSTAR Solution Configurator',
    supportedPillars: ['Server', 'Storage', 'Networking'],
    anchorTabUrl: 'https://e.huawei.com/en/partner',
    portalUrl: 'https://e.huawei.com/en/partner',
    urlPatterns: ['e.huawei.com', 'unistar.huawei.com', 'sct.huawei.com'],
    launchSelector: 'a[href*="sct"], a[href*="unistar"], a[href*="config"]',
    handoffMechanism: 'OAUTH_SSO_REDIRECT',
    allowInPlaceReload: true,
    forbiddenDirectNavigatePatterns: [],
    recoveryProtocol: 'REAUTHENTICATE_HUAWEI_SCT',
    loginSelectors: Object.freeze({
      usernameSelector: 'input[name="username"], input[type="email"]',
      passwordSelector: 'input[type="password"]',
      submitSelector: 'button[type="submit"]'
    }),
    navigationSelectors: Object.freeze({
      treeNodeSelector: '.sct-category-tree, .config-nav-tree',
      menuTabSelector: '.sct-tab-content',
      expandAllSelector: '.expand-all'
    }),
    tableSelectors: Object.freeze({
      tableSelector: 'table, .sct-bom-table',
      rowSelector: 'tr',
      headerSelector: 'th',
      skuColumnAliases: ['BOM Code', 'Part Number', 'Model', 'SKU'],
      descriptionColumnAliases: ['Description', 'Component Description', 'Item Name'],
      priceColumnAliases: ['List Price', 'Unit Price (USD)', 'Price'],
      constraintColumnAliases: ['Dependency', 'Compatibility', 'Notes']
    }),
    ruleSelectors: Object.freeze({
      unavailableRuleSelector: '.sct-error-banner, .sct-incompatible',
      ruleContainerSelector: '.sct-rule-note'
    }),
    networkRulePatterns: ['/sct/', '/unistar/', 'validate', 'rules'],
    scrapingInstructions: Object.freeze({
      mode: 'OAUTH_SPA_DOM',
      requiresTab1Handoff: false,
      supportsHeadless: true,
      steps: ['Authenticate to Huawei Partner / UniSTAR SCT', 'Open FusionServer / OceanStor / CloudEngine BOM', 'Extract BOM Codes, descriptions, prices, and compatibility rules']
    }),
    defaultDomainClassifier: defaultClassifySolutionDomain,
    defaultRuleExtractor: defaultExtractNormalizedRules
  })
});

function _deriveUrlPatterns(policySpec) {
  if (Array.isArray(policySpec.urlPatterns) && policySpec.urlPatterns.length > 0) {
    return policySpec.urlPatterns.map(p => String(p).trim()).filter(Boolean);
  }
  const rawUrl = policySpec.portalUrl || policySpec.anchorTabUrl || '';
  if (!rawUrl) return [];
  try {
    const parsed = new URL(rawUrl);
    return [parsed.hostname];
  } catch {
    return [String(rawUrl).trim()];
  }
}

function _normalizeVendorDisplay(vendorKey) {
  const clean = String(vendorKey || '').trim();
  const upper = clean.toUpperCase();
  if (upper === 'HPE' || upper === 'HP') return 'HPE';
  if (upper === 'DELL') return 'Dell';
  if (upper === 'CISCO') return 'Cisco';
  if (upper === 'LENOVO') return 'Lenovo';
  return clean;
}

function _resolveCustomPolicyPillars(policySpec, baseBuiltin) {
  const rawPillars = Array.isArray(policySpec.supportedPillars) && policySpec.supportedPillars.length > 0
    ? policySpec.supportedPillars
    : (baseBuiltin.supportedPillars || ['Server', 'Storage', 'Networking']);
  return Array.from(new Set(rawPillars.map(p => normalizeSolutionPillar(p)).filter(Boolean)));
}

function _resolveCustomPolicyReloadFlag(policySpec, baseBuiltin) {
  if (policySpec.allowInPlaceReload !== undefined) return Boolean(policySpec.allowInPlaceReload);
  if (baseBuiltin.allowInPlaceReload !== undefined) return Boolean(baseBuiltin.allowInPlaceReload);
  return true;
}

function _buildCustomVendorSelectorsAndHooks(vendorDisplay, policySpec, baseBuiltin) {
  const normKey = vendorDisplay.toLowerCase();
  return {
    productKeywords: Array.isArray(policySpec.productKeywords) && policySpec.productKeywords.length > 0
      ? policySpec.productKeywords.map(k => String(k).toLowerCase())
      : [normKey],
    launchSelector: policySpec.launchSelector || baseBuiltin.launchSelector || 'a[href*="config"]',
    handoffMechanism: policySpec.handoffMechanism || baseBuiltin.handoffMechanism || 'CUSTOM_DOM_SESSION',
    allowInPlaceReload: _resolveCustomPolicyReloadFlag(policySpec, baseBuiltin),
    forbiddenDirectNavigatePatterns: Array.isArray(policySpec.forbiddenDirectNavigatePatterns)
      ? [...policySpec.forbiddenDirectNavigatePatterns]
      : (baseBuiltin.forbiddenDirectNavigatePatterns || []),
    recoveryProtocol: policySpec.recoveryProtocol || baseBuiltin.recoveryProtocol || 'REAUTHENTICATE_CUSTOM_PORTAL',
    loginSelectors: policySpec.loginSelectors || baseBuiltin.loginSelectors || {},
    navigationSelectors: policySpec.navigationSelectors || baseBuiltin.navigationSelectors || {},
    tableSelectors: policySpec.tableSelectors || baseBuiltin.tableSelectors || {},
    ruleSelectors: policySpec.ruleSelectors || baseBuiltin.ruleSelectors || {},
    networkRulePatterns: Array.isArray(policySpec.networkRulePatterns)
      ? [...policySpec.networkRulePatterns]
      : (baseBuiltin.networkRulePatterns || []),
    scrapingInstructions: policySpec.scrapingInstructions || baseBuiltin.scrapingInstructions || { mode: 'CUSTOM_DOM_SCRAPE', steps: [] },
    defaultDomainClassifier: typeof policySpec.defaultDomainClassifier === 'function'
      ? policySpec.defaultDomainClassifier
      : (baseBuiltin.defaultDomainClassifier || defaultClassifySolutionDomain),
    defaultRuleExtractor: typeof policySpec.defaultRuleExtractor === 'function'
      ? policySpec.defaultRuleExtractor
      : (baseBuiltin.defaultRuleExtractor || defaultExtractNormalizedRules)
  };
}

/**
 * Register a custom or extended vendor portal UI & scraping policy at runtime.
 * @param {string} vendorKey E.g. 'Supermicro', 'Arista', 'PureStorage', or override
 * @param {object} policySpec Declarative portal URLs, selectors, network patterns, and pillars
 * @returns {object} Frozen normalized policy descriptor
 */
function registerCustomVendorPortalPolicy(vendorKey, policySpec = {}) {
  if (!vendorKey || typeof vendorKey !== 'string' || !vendorKey.trim()) {
    throw new Error('CUSTOM_VENDOR_POLICY_INVALID: vendorKey must be a non-empty string');
  }
  if (!policySpec || typeof policySpec !== 'object') {
    throw new Error('CUSTOM_VENDOR_POLICY_INVALID: policySpec must be an object');
  }
  const urlPatterns = _deriveUrlPatterns(policySpec);
  const anchorTabUrl = policySpec.anchorTabUrl || policySpec.portalUrl || '';
  const portalUrl = policySpec.portalUrl || policySpec.anchorTabUrl || '';
  if (!anchorTabUrl && !portalUrl && urlPatterns.length === 0) {
    throw new Error('CUSTOM_VENDOR_POLICY_INVALID: policySpec must include portalUrl, anchorTabUrl, or urlPatterns');
  }

  const vendorDisplay = _normalizeVendorDisplay(vendorKey);
  const baseBuiltin = VENDOR_PORTAL_POLICIES[vendorDisplay] || {};
  const supportedPillars = _resolveCustomPolicyPillars(policySpec, baseBuiltin);
  const selectorsAndHooks = _buildCustomVendorSelectorsAndHooks(vendorDisplay, policySpec, baseBuiltin);

  const normalized = Object.freeze({
    ...baseBuiltin,
    ...policySpec,
    vendor: vendorDisplay,
    isCustom: !Object.hasOwn(VENDOR_PORTAL_POLICIES, vendorDisplay),
    configuratorName: policySpec.configuratorName || baseBuiltin.configuratorName || `${vendorDisplay} Portal Configurator`,
    supportedPillars,
    anchorTabUrl: anchorTabUrl || baseBuiltin.anchorTabUrl || '',
    portalUrl: portalUrl || baseBuiltin.portalUrl || '',
    urlPatterns,
    ...selectorsAndHooks
  });

  _customVendorPolicies.set(vendorDisplay.toLowerCase(), normalized);
  return normalized;
}

function unregisterCustomVendorPortalPolicy(vendorKey) {
  if (!vendorKey || typeof vendorKey !== 'string') return false;
  return _customVendorPolicies.delete(vendorKey.trim().toLowerCase());
}

function clearCustomVendorPolicies() {
  _customVendorPolicies.clear();
}

/**
 * Return snapshot of all built-in + custom registered vendor portal policies.
 * @returns {object}
 */
function getVendorPortalRegistry() {
  const registry = { ...VENDOR_PORTAL_POLICIES };
  for (const policy of _customVendorPolicies.values()) {
    registry[policy.vendor] = policy;
  }
  return registry;
}

function getVendorPortalPolicy(vendor = 'HPE') {
  const norm = inferVendor('', vendor);
  return _findCustomPolicy(norm) || VENDOR_PORTAL_POLICIES[norm] || VENDOR_PORTAL_POLICIES.HPE;
}

function _matchPolicyByPortalUrl(portalUrl = '') {
  if (!portalUrl || typeof portalUrl !== 'string') return null;
  const target = portalUrl.toLowerCase();
  const candidates = [..._customVendorPolicies.values(), ...Object.values(VENDOR_PORTAL_POLICIES)];
  for (const policy of candidates) {
    const patterns = [...(policy.urlPatterns || []), policy.anchorTabUrl, policy.portalUrl].filter(Boolean);
    if (patterns.some(pat => target.includes(String(pat).toLowerCase()))) {
      return policy;
    }
  }
  return null;
}

function _formatResolvedSessionPolicy(policy, portalUrl, normalizedPillar, registered) {
  const supported = Array.isArray(policy.supportedPillars) ? policy.supportedPillars : ['Server', 'Storage', 'Networking'];
  return {
    ...policy,
    registered,
    isRegistered: registered,
    activePortalUrl: portalUrl || policy.portalUrl || policy.anchorTabUrl || null,
    requestedPillar: normalizedPillar,
    pillarSupported: normalizedPillar ? supported.includes(normalizedPillar) : true
  };
}

/**
 * Resolve portal session policy by vendor, portalUrl, product query, and optional pillar.
 * @param {object|string} [input]
 * @returns {object}
 */
function resolvePortalSessionPolicy(input = {}) {
  const opts = typeof input === 'string'
    ? (/^https?:\/\//i.test(input.trim()) ? { portalUrl: input.trim() } : { vendor: input.trim() })
    : (input || {});
  const normalizedPillar = opts.pillar ? normalizeSolutionPillar(opts.pillar) : null;
  let matched = null;

  if (opts.vendor) {
    try { matched = getVendorPortalPolicy(opts.vendor); } catch { matched = null; }
  }
  if (!matched && opts.portalUrl) {
    matched = _matchPolicyByPortalUrl(opts.portalUrl);
  }
  if (!matched && opts.product) {
    try { matched = getVendorPortalPolicy(inferVendor(opts.product, '')); } catch { matched = null; }
  }
  if (!matched && !opts.vendor && !opts.portalUrl && !opts.product) {
    matched = getVendorPortalPolicy('HPE');
  }
  if (matched) {
    return _formatResolvedSessionPolicy(matched, opts.portalUrl, normalizedPillar, true);
  }
  if (opts.strict) {
    throw new Error(`UNREGISTERED_VENDOR_PORTAL: ${opts.vendor || opts.portalUrl || opts.product}`);
  }
  return _formatResolvedSessionPolicy({
    vendor: opts.vendor || 'Custom',
    configuratorName: null,
    supportedPillars: ['Server', 'Storage', 'Networking'],
    anchorTabUrl: opts.portalUrl || null,
    portalUrl: opts.portalUrl || null,
    allowInPlaceReload: true,
    forbiddenDirectNavigatePatterns: [],
    recoveryProtocol: 'CUSTOM_MANUAL_OR_REGISTER_POLICY',
    defaultDomainClassifier: defaultClassifySolutionDomain,
    defaultRuleExtractor: defaultExtractNormalizedRules,
    reason: 'UNREGISTERED_VENDOR_PORTAL'
  }, opts.portalUrl, normalizedPillar, false);
}

module.exports = {
  VENDOR_PORTAL_POLICIES,
  PILLAR_CANONICAL_MAP,
  normalizeSolutionPillar,
  defaultClassifySolutionDomain,
  defaultExtractNormalizedRules,
  registerCustomVendorPortalPolicy,
  unregisterCustomVendorPortalPolicy,
  clearCustomVendorPolicies,
  getVendorPortalRegistry,
  resolvePortalSessionPolicy,
  getVendorPortalPolicy,
  inferVendor,
  getVendorCredentials,
  routeDiscoverCandidates,
  routeNavigateChassis
};
