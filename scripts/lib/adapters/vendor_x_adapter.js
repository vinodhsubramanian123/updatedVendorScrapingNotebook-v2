'use strict';
const vendorXPolicy = require('../../config/vendors/vendor_x/policy.json');

const descriptor = Object.freeze({
  vendorId: 'VENDOR_X',
  contractVersion: 1,
  domains: ['server'],
  capabilities: ['IDENTIFIER', 'CLASSIFICATION', 'ROLE_RESOLUTION', 'SUPPORT_POLICY', 'GLOSSARY'],
  implementationStatus: 'FIXTURE',
  evidenceLimits: [
    'Vendor-X is a synthetic conformance fixture for validating multi-vendor architecture abstractions.',
    'Zero live portal scraping or ordering claimed.'
  ]
});

class VendorXAdapter {
  constructor() {
    this.descriptor = descriptor;
    this.policy = vendorXPolicy;
  }

  normalizeIdentifier(rawSku) {
    if (!rawSku) return null;
    const str = String(rawSku).trim();
    return str.startsWith('VX-') ? str : `VX-${str}`;
  }

  classifyComponent(item) {
    return {
      role: 'server',
      domain: 'server',
      evidence: 'Synthetic Vendor-X component'
    };
  }

  resolveRole(role, scope = {}) {
    return { role, scope, candidates: [], status: 'SYNTHETIC_ROLE' };
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
  VendorXAdapter,
  createVendorXAdapter: () => new VendorXAdapter()
};
