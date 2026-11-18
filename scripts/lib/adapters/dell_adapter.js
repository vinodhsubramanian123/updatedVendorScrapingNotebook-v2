'use strict';
const dellPolicy = require('../../config/vendors/dell/policy.json');
const { extractCanonicalAttributes } = require('../catalog/attribute_vectors.js');

const descriptor = Object.freeze({
  vendorId: 'DELL',
  contractVersion: 1,
  domains: ['server', 'storage', 'networking'],
  capabilities: ['IDENTIFIER', 'CLASSIFICATION', 'ROLE_RESOLUTION', 'SUPPORT_POLICY', 'GLOSSARY'],
  implementationStatus: 'IMPLEMENTED',
  evidenceLimits: [
    'Dell technical guides provide specification evidence, not live partner portal receipt.',
    'Live portal scraping or automated ordering requires authenticated Dell Premier/OSC access.'
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
    const desc = String(item?.description || item?.name || '').toLowerCase();
    const attrs = extractCanonicalAttributes({ ...item, vendor: 'Dell' });
    let role = attrs.role || 'unresolved';
    let domain = 'unresolved';
    if (desc.includes('poweredge') || desc.includes('xeon') || desc.includes('epyc') || desc.includes('dimm') || desc.includes('idrac') || desc.includes('openmanage') || desc.includes('boss')) {
      role = desc.includes('poweredge') ? 'server' : (attrs.role || 'server');
      domain = 'server';
    } else if (desc.includes('powervault') || desc.includes('powerstore') || desc.includes('perc')) {
      role = 'storage';
      domain = 'storage';
    } else if (desc.includes('powerswitch')) {
      role = 'networking';
      domain = 'networking';
    } else if (attrs.category === 'Networking / FC / Optics') {
      domain = 'networking';
    } else if (['Drive', 'Storage Controller', 'Boot Device'].includes(attrs.category)) {
      domain = 'storage';
    } else if (attrs.category !== 'Other / Accessory') {
      domain = 'server';
    }
    return {
      role,
      category: attrs.category,
      domain,
      attributes: attrs.attributes,
      evidence: 'Dell canonical attribute & naming classifier'
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
  DellVendorAdapter,
  createDellAdapter: () => new DellVendorAdapter()
};
