'use strict';
const hpePolicy = require('../../config/vendors/hpe/policy.json');
const { cleanBaseSKU, isValidHpeSKU } = require('../catalog/sku.js');
const { topologyRole } = require('../boq/solution_topology.js');
const { resolveComponentByRole } = require('../taxonomy/sku_resolver.js');

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
    if (!scope?.catalogData) {
      return { role, scope, candidates: [], status: 'SCOPED_CATALOG_REQUIRED' };
    }
    const primary = resolveComponentByRole(scope.catalogData, {
      role,
      keywords: Array.isArray(scope.keywords) ? scope.keywords : [],
      specs: scope.specs || {},
      preferredSku: scope.preferredSku || null
    });
    const candidates = [];
    if (primary?.sku) {
      candidates.push({ sku: primary.sku, description: primary.description || role, source: primary.source || 'catalog_resolver' });
    }
    const targetLower = String(role || '').toLowerCase();
    for (const entry of (scope.catalogData.entries || [])) {
      const catMatch = String(entry.parentCategory || '').toLowerCase().includes(targetLower);
      for (const skuRow of (entry.skus || [])) {
        const sku = skuRow['Product #'] || skuRow.sku;
        const desc = String(skuRow.Description || skuRow.description || '');
        if (!sku || candidates.some(c => c.sku === sku)) continue;
        if (catMatch || desc.toLowerCase().includes(targetLower)) {
          candidates.push({ sku, description: desc, source: 'catalog_scan' });
        }
        if (candidates.length >= 10) break;
      }
      if (candidates.length >= 10) break;
    }
    return {
      role,
      scope: { productId: scope.productId || null },
      resolved: primary?.sku ? primary : null,
      candidates,
      status: candidates.length > 0 ? 'RESOLVED' : 'UNRESOLVED'
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
