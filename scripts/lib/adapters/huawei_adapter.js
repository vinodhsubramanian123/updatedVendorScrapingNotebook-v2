'use strict';
const huaweiPolicy = require('../../config/vendors/huawei/policy.json');
const { extractCanonicalAttributes } = require('../catalog/attribute_vectors.js');

const descriptor = Object.freeze({
  vendorId: 'HUAWEI',
  contractVersion: 1,
  domains: ['server', 'storage', 'networking'],
  capabilities: ['IDENTIFIER', 'CLASSIFICATION', 'ROLE_RESOLUTION', 'SUPPORT_POLICY', 'GLOSSARY'],
  implementationStatus: 'IMPLEMENTED',
  evidenceLimits: [
    'Huawei SCT exports and datasheets provide specification evidence, not live partner portal receipt.',
    'Live portal scraping requires authenticated Huawei SCT/UniSTAR portal access.'
  ]
});

class HuaweiVendorAdapter {
  constructor() {
    this.descriptor = descriptor;
    this.policy = huaweiPolicy;
  }

  normalizeIdentifier(rawSku) {
    if (!rawSku) return null;
    const trimmed = String(rawSku).trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  classifyComponent(item) {
    const desc = String(item?.description || item?.name || '');
    const lower = desc.toLowerCase();
    const attrs = extractCanonicalAttributes({ ...item, vendor: 'Huawei' });
    let domain = 'unresolved';
    if (/\b(?:fusionserver|taishan|kunlun|2288h|2488h|1288h|5288|ibmc|fusiondirector|ascend)\b/i.test(lower)) {
      domain = 'server';
    } else if (/\b(?:oceanstor|dorado|pacific)\b/i.test(lower)) {
      domain = 'storage';
    } else if (/\b(?:cloudengine|ce\d{4}|imaster\s*nce|sns\d+)\b/i.test(lower)) {
      domain = 'networking';
    } else if (['Processor', 'Memory', 'Power Supply', 'Cooling / Thermal', 'GPU / Accelerator', 'Chassis'].includes(attrs.category)) {
      domain = 'server';
    } else if (['Drive', 'Storage Controller', 'Boot Device'].includes(attrs.category)) {
      domain = 'storage';
    } else if (attrs.category === 'Networking / FC / Optics') {
      domain = 'networking';
    }

    return {
      role: attrs.role || attrs.category,
      category: attrs.category,
      domain,
      attributes: attrs.attributes,
      evidence: 'Huawei canonical attribute & taxonomy classifier'
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
  HuaweiVendorAdapter,
  createHuaweiAdapter: () => new HuaweiVendorAdapter()
};
