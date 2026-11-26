'use strict';
const ciscoPolicy = require('../../config/vendors/cisco/policy.json');
const { extractCanonicalAttributes } = require('../catalog/attribute_vectors.js');

const descriptor = Object.freeze({
  vendorId: 'CISCO',
  contractVersion: 1,
  domains: ['server', 'networking', 'storage'],
  capabilities: ['IDENTIFIER', 'CLASSIFICATION', 'ROLE_RESOLUTION', 'SUPPORT_POLICY', 'GLOSSARY'],
  implementationStatus: 'IMPLEMENTED',
  evidenceLimits: ciscoPolicy.evidenceLimits
});

class CiscoVendorAdapter {
  constructor() {
    this.descriptor = descriptor;
    this.policy = ciscoPolicy;
  }

  normalizeIdentifier(rawSku) {
    if (!rawSku) return null;
    const trimmed = String(rawSku).trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  classifyComponent(item) {
    const desc = String(item?.description || item?.name || '').toLowerCase();
    const attrs = extractCanonicalAttributes({ ...item, vendor: 'Cisco' });
    let domain = 'unresolved';
    let role = attrs.role || attrs.category;
    if (/\b(?:ucs[cx]?[- ]?[cbmx]?\d+|vic\b|cimc|intersight)\b/i.test(desc)) {
      domain = 'server';
      if (/\bucs\s*[cbx]\d+/i.test(desc)) role = 'server';
    } else if (/\b(?:nexus|mds\s*\d+|catalyst|sfp-?\d+g|qsfp|fc\s*switch)\b/i.test(desc)) {
      domain = 'networking';
    } else if (['Processor', 'Memory', 'Power Supply', 'Cooling / Thermal', 'GPU / Accelerator', 'Chassis'].includes(attrs.category)) {
      domain = 'server';
    } else if (['Drive', 'Storage Controller', 'Boot Device'].includes(attrs.category)) {
      domain = 'storage';
    } else if (attrs.category === 'Networking / FC / Optics') {
      domain = 'networking';
    }
    return {
      role,
      category: attrs.category,
      domain,
      attributes: attrs.attributes,
      evidence: 'Cisco UCS/Nexus canonical attribute & taxonomy classifier'
    };
  }

  resolveRole(role, scope = {}) {
    if (!scope?.catalogData) {
      return { role, scope, candidates: [], status: 'SCOPED_CATALOG_REQUIRED' };
    }
    const targetLower = String(role || '').toLowerCase();
    const candidates = [];
    for (const entry of (scope.catalogData.entries || [])) {
      for (const skuRow of (entry.skus || [])) {
        const desc = String(skuRow.Description || skuRow.description || '').toLowerCase();
        if (desc.includes(targetLower) || String(entry.parentCategory || '').toLowerCase().includes(targetLower)) {
          candidates.push({ sku: skuRow['Product #'] || skuRow.sku, description: skuRow.Description || skuRow.description });
        }
      }
    }
    return { role, scope, candidates: candidates.slice(0, 10), status: candidates.length ? 'RESOLVED' : 'UNRESOLVED' };
  }

  resolveSupportPolicy(requirement) {
    return {
      tier: requirement?.tier || this.policy.defaultSupportPolicy.tier,
      durationYears: requirement?.durationYears || this.policy.defaultSupportPolicy.durationYears,
      description: this.policy.defaultSupportPolicy.description
    };
  }

  getGlossary() {
    return this.policy.terminology;
  }
}

module.exports = {
  descriptor,
  CiscoVendorAdapter,
  createCiscoAdapter: () => new CiscoVendorAdapter()
};
