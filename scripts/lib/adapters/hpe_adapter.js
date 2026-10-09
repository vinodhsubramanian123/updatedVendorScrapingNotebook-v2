'use strict';
const hpePolicy = require('../../config/vendors/hpe/policy.json');
const { cleanBaseSKU, isValidHpeSKU } = require('../catalog/sku.js');
const { topologyRole } = require('../boq/solution_topology.js');

const descriptor = Object.freeze({
  vendorId: 'HPE',
  contractVersion: 1,
  domains: ['server', 'storage', 'networking', 'archive'],
  capabilities: ['IDENTIFIER', 'CLASSIFICATION', 'ROLE_RESOLUTION', 'SUPPORT_POLICY', 'GLOSSARY'],
  implementationStatus: 'IMPLEMENTED',
  evidenceLimits: [
    'QuickSpecs citations provide document evidence, not live ordering availability.',
    'Live CLIC WebLogic configurator validation is required for final vendor acceptance.'
  ]
});

class HpeVendorAdapter {
  constructor() {
    this.descriptor = descriptor;
    this.policy = hpePolicy;
  }

  normalizeIdentifier(rawSku) {
    if (!rawSku) return null;
    const cleaned = cleanBaseSKU(String(rawSku));
    return isValidHpeSKU(cleaned) ? cleaned : null;
  }

  classifyComponent(item) {
    const desc = item?.description || item?.name || '';
    const role = topologyRole(desc);
    return {
      role: role || 'UNKNOWN',
      domain: role === 'server' || role === 'compute' ? 'server' : (role === 'storage' ? 'storage' : (role === 'networking' ? 'networking' : 'unresolved')),
      evidence: 'Matched against topologyRole and platform profile heuristics'
    };
  }

  resolveRole(role, scope = {}) {
    return {
      role,
      scope,
      candidates: [],
      status: 'RESOLVED_OR_SCOPED'
    };
  }

  resolveSupportPolicy(requirement, scope = {}) {
    return {
      tier: requirement?.tier || this.policy.defaultSupportPolicy.tier,
      durationYears: requirement?.durationYears || this.policy.defaultSupportPolicy.durationYears,
      description: this.policy.defaultSupportPolicy.description
    };
  }

  getGlossary(scope = {}) {
    return this.policy.terminology;
  }
}

module.exports = {
  descriptor,
  HpeVendorAdapter,
  createHpeAdapter: () => new HpeVendorAdapter()
};
