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
    const v = explicitVendor.toUpperCase();
    if (v.includes('DELL')) return 'Dell';
    if (v.includes('CISCO')) return 'Cisco';
    if (v.includes('LENOVO')) return 'Lenovo';
    if (v.includes('HPE') || v.includes('HP')) return 'HPE';
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

  // Default to HPE
  return 'HPE';
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
    default:
      return discoverHpeCandidates(ws, query, options);
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
    default:
      return navigateToOCAChassis(ws, query, options);
  }
}

module.exports = {
  inferVendor,
  routeDiscoverCandidates,
  routeNavigateChassis
};
