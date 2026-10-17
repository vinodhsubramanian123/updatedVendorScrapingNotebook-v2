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

/**
 * Infer vendor from product name or explicit parameter
 * @param {string} productQuery E.g. "DL380 Gen12", "PowerEdge R760", "UCS B200"
 * @param {string} [explicitVendor] E.g. "HPE", "Dell", "Cisco"
 * @returns {string} Normalized vendor ("HPE", "Dell", "Cisco", "Lenovo")
 */
function inferVendor(productQuery = '', explicitVendor = '') {
  if (explicitVendor && typeof explicitVendor === 'string') {
    const v = explicitVendor.trim().toUpperCase();
    if (v === 'DELL') return 'Dell';
    if (v === 'CISCO') return 'Cisco';
    if (v === 'LENOVO') return 'Lenovo';
    if (['HPE', 'HP', 'HEWLETT PACKARD ENTERPRISE'].includes(v)) return 'HPE';
    throw new Error(`UNSUPPORTED_VENDOR: ${explicitVendor}`);
  }

  const pq = productQuery.toLowerCase();
  if (pq.includes('poweredge') || pq.includes('powerstore') || pq.includes('powerswitch') || pq.includes('dell') || /\br\d{3}\b/.test(pq)) {
    return 'Dell';
  }
  if (pq.includes('ucs') || pq.includes('cisco') || pq.includes('catalyst') || pq.includes('nexus')) {
    return 'Cisco';
  }
  if (pq.includes('thinksystem') || pq.includes('thinkagile') || pq.includes('lenovo')) {
    return 'Lenovo';
  }

  if (/\bhpe\b|proliant|\b(?:dl|ml|rl)\s*\d{3}|synergy|alletra|storeever|\bsn\d{4}/i.test(productQuery)) return 'HPE';
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

/**
 * Retrieve credentials and portal configuration for target vendor.
 * Prioritizes environment variables with sensible fallback defaults.
 *
 * @param {string} [vendor] Vendor name ('HPE', 'Dell', 'Cisco', 'Lenovo')
 * @returns {object} { vendor, portalUrl, username, password, hasCredentials }
 */
function getVendorCredentials(vendor = 'HPE') {
  const norm = inferVendor('', vendor);
  switch (norm) {
    case 'Dell':
      return {
        vendor: 'Dell',
        portalUrl: process.env.DELL_PORTAL_URL || 'https://www.dell.com/premier',
        username: process.env.DELL_PORTAL_USER || '',
        password: process.env.DELL_PORTAL_PASS || '',
        hasCredentials: Boolean(process.env.DELL_PORTAL_USER)
      };
    case 'Cisco':
      return {
        vendor: 'Cisco',
        portalUrl: process.env.CISCO_PORTAL_URL || 'https://apps.cisco.com/Commerce/',
        username: process.env.CISCO_PORTAL_USER || '',
        password: process.env.CISCO_PORTAL_PASS || '',
        hasCredentials: Boolean(process.env.CISCO_PORTAL_USER)
      };
    case 'Lenovo':
      return {
        vendor: 'Lenovo',
        portalUrl: process.env.LENOVO_PORTAL_URL || 'https://dcsc.lenovo.com/',
        username: process.env.LENOVO_PORTAL_USER || '',
        password: process.env.LENOVO_PORTAL_PASS || '',
        hasCredentials: Boolean(process.env.LENOVO_PORTAL_USER)
      };
    case 'HPE':
    default:
      return {
        vendor: 'HPE',
        portalUrl: process.env.HPE_PORTAL_URL || 'https://partner.hpe.com/web/prp',
        username: process.env.HPE_PORTAL_USER || 'hpeconfig@swiftline-uae.com',
        password: process.env.HPE_PORTAL_PASS || '',
        hasCredentials: Boolean(process.env.HPE_PORTAL_USER || 'hpeconfig@swiftline-uae.com')
      };
  }
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
    launchSelector: '#quick-links-807 a, a[href*="eServiceId=187402"]',
    handoffMechanism: 'SAML_POST_NEW_TAB',
    allowInPlaceReload: false,
    forbiddenDirectNavigatePatterns: [
      'oca.ext.hpe.com',
      'oca.hpe.com',
      'OCAInternalLogin',
      'eServiceId=187402'
    ],
    recoveryProtocol: 'CLOSE_CONFIG_TAB_RETURN_TO_TAB1_CLICK_QUICK_LINK'
  }),
  Dell: Object.freeze({
    vendor: 'Dell',
    configuratorName: 'Dell Premier / Online Solutions Configurator (OSC)',
    supportedPillars: ['Server', 'Storage', 'Networking'],
    anchorTabUrl: 'https://www.dell.com/premier',
    launchSelector: 'a[href*="configurator"], a[href*="osc"]',
    handoffMechanism: 'SPA_REST_SESSION',
    allowInPlaceReload: true,
    forbiddenDirectNavigatePatterns: [],
    recoveryProtocol: 'REAUTHENTICATE_PREMIER_PORTAL'
  }),
  Cisco: Object.freeze({
    vendor: 'Cisco',
    configuratorName: 'Cisco Commerce Workspace (CCW)',
    supportedPillars: ['Server', 'Storage', 'Networking'],
    anchorTabUrl: 'https://apps.cisco.com/Commerce/',
    launchSelector: 'a[href*="estimate"], a[href*="config"]',
    handoffMechanism: 'OAUTH_SSO_REDIRECT',
    allowInPlaceReload: true,
    forbiddenDirectNavigatePatterns: [],
    recoveryProtocol: 'REAUTHENTICATE_CCW_PORTAL'
  }),
  Lenovo: Object.freeze({
    vendor: 'Lenovo',
    configuratorName: 'Lenovo Data Center Solution Configurator (DCSC)',
    supportedPillars: ['Server', 'Storage', 'Networking'],
    anchorTabUrl: 'https://dcsc.lenovo.com/',
    launchSelector: 'a[href*="configure"]',
    handoffMechanism: 'PUBLIC_OR_PARTNER_SPA',
    allowInPlaceReload: true,
    forbiddenDirectNavigatePatterns: [],
    recoveryProtocol: 'NAVIGATE_DCSC_HOME'
  })
});

function getVendorPortalPolicy(vendor = 'HPE') {
  const norm = inferVendor('', vendor);
  return VENDOR_PORTAL_POLICIES[norm] || VENDOR_PORTAL_POLICIES.HPE;
}

module.exports = {
  VENDOR_PORTAL_POLICIES,
  getVendorPortalPolicy,
  inferVendor,
  getVendorCredentials,
  routeDiscoverCandidates,
  routeNavigateChassis
};
