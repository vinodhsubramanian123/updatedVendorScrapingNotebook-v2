'use strict';
// CP4 interface only. Does not construct adapters, load vendor data or access IO.
const { VendorAdapterDescriptorSchema } = require('../system/schemas.js');

const VENDOR_ADAPTER_METHODS = Object.freeze({
  IDENTIFIER: 'normalizeIdentifier',
  CLASSIFICATION: 'classifyComponent',
  ROLE_RESOLUTION: 'resolveRole',
  SUPPORT_POLICY: 'resolveSupportPolicy',
  GLOSSARY: 'getGlossary',
  PORTAL_EXTRACTION: 'extractCatalog',
  PORTAL_ACCEPTANCE: 'validateManifest'
});

/**
 * Vendor data belongs in scripts/config/vendors/<vendor>/; implementations reuse
 * scraper/catalog/rules libraries. CP13 supplies compatible implementations.
 * Every method takes an explicit scope (vendor/product/generation/domain/owner).
 * normalizeIdentifier(raw, scope): retain raw ID; return normalized ID or null.
 * classifyComponent(item, scope): return role/domain or unresolved, with evidence.
 * resolveRole(role, scope): return scoped candidates + evidence, never a fallback
 * SKU from another vendor/product. Unknown is an explicit unresolved result.
 * resolveSupportPolicy(requirement, scope): preserve explicit terms/tier; apply a
 * vendor default only when unspecified; do not embed HPE's policy here.
 * getGlossary(scope): vendor grammar/category/portal terms, not generic aliases.
 * extractCatalog(context): scoped capture/provenance; normalize != live support.
 * validateManifest(manifest, context): exact dated acceptance receipt or pending;
 * local validation, document grounding and vendor acceptance remain separate.
 * Shape validation below verifies declarations/method presence only. It cannot
 * certify method results, scope isolation, live support or conformance.
 */
function validateVendorAdapter(adapter) {
  const parsed = VendorAdapterDescriptorSchema.safeParse(adapter?.descriptor);
  if (!parsed.success) return { valid: false, issues: parsed.error.issues.map(issue => issue.message) };
  const capabilities = parsed.data.capabilities;
  const issues = [];
  if (new Set(capabilities).size !== capabilities.length) issues.push('Duplicate adapter capability');
  for (const capability of capabilities) {
    const method = VENDOR_ADAPTER_METHODS[capability];
    if (typeof adapter[method] !== 'function') issues.push(`${capability} requires ${method}()`);
  }
  return { valid: issues.length === 0, issues };
}

module.exports = { VENDOR_ADAPTER_METHODS, validateVendorAdapter };
