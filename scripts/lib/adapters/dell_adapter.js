'use strict';
const dellPolicy = require('../../config/vendors/dell/policy.json');

const descriptor = Object.freeze({
  vendorId: 'DELL',
  contractVersion: 1,
  domains: ['server', 'storage', 'networking'],
  capabilities: ['IDENTIFIER', 'CLASSIFICATION', 'ROLE_RESOLUTION', 'SUPPORT_POLICY', 'GLOSSARY'],
  implementationStatus: 'FIXTURE',
  evidenceLimits: [
    'Dell technical guides provide specification evidence, not live partner portal receipt.',
    'Live portal scraping or automated ordering not claimed for Dell platforms.'
  ]
});

class DellVendorAdapter {
  constructor() {
    this.descriptor = descriptor;
    this.policy = dellPolicy;
  }

  normalizeIdentifier(rawSku) {
    if (!rawSku) return null;
    const trimmed = String(rawSku).trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  classifyComponent(item) {
    const desc = (item?.description || item?.name || '').toLowerCase();
    let role = 'unresolved';
    let domain = 'unresolved';
    if (desc.includes('poweredge') || desc.includes('xeon') || desc.includes('epyc') || desc.includes('dimm')) {
      role = 'server';
      domain = 'server';
    } else if (desc.includes('powervault') || desc.includes('powerstore')) {
      role = 'storage';
      domain = 'storage';
    } else if (desc.includes('powerswitch')) {
      role = 'networking';
      domain = 'networking';
    }
    return { role, domain, evidence: 'Dell naming heuristic' };
  }

  resolveRole(role, scope = {}) {
    return { role, scope, candidates: [], status: 'DELL_FIXTURE_ROLE' };
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
  DellVendorAdapter,
  createDellAdapter: () => new DellVendorAdapter()
};
