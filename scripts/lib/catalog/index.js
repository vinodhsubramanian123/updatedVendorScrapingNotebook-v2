'use strict';
/**
 * scripts/lib/catalog/index.js — Modular Catalog Subsystem Domain Barrel
 *
 * Exposes cohesive sub-modules for discovery, formatting, diffing, rules, and versioning.
 */

module.exports = {
  discovery: require('./discovery.js'),
  format: require('./format.js'),
  diff: require('./diff.js'),
  rules: require('./rules.js'),
  versioning: require('./versioning.js'),
  checksum: require('./checksum.js'),
  productMeta: require('./product_meta.js'),
  sku: require('./sku.js'),
  validator: require('../system/data_validator.js'),
  syncRegistry: require('./sync_registry.js'),
  registry: require('./registry.js'),
  diagnostics: require('./classification_diagnostics.js'),
  genericTemplates: require('./generic_domain_templates.js')
};

