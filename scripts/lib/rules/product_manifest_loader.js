'use strict';
/**
 * scripts/lib/rules/product_manifest_loader.js
 *
 * Loads and caches declarative ProductCapabilityManifest JSON files from
 * scripts/config/products/*.json, validating every manifest against Zod.
 */

const fs = require('fs');
const path = require('path');
const { ProductCapabilityManifestSchema } = require('../system/schemas.js');
const logger = require('../system/pipeline_logger.js');

const DEFAULT_MANIFESTS_DIR = path.resolve(__dirname, '..', '..', 'config', 'products');
let _manifestCache = null;

function _normalizeLookupKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^HPE_(?:PROLIANT|SYNERGY|ALLETRA|STOREFABRIC|STOREEVER)_/i, '')
    .replace(/[-\s]+/g, '_');
}

function loadProductManifest(productId, manifestsDir = DEFAULT_MANIFESTS_DIR) {
  if (!productId) return null;
  const candidate = path.join(manifestsDir, `${productId}.json`);
  if (!fs.existsSync(candidate)) return null;
  const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
  const check = ProductCapabilityManifestSchema.safeParse(parsed);
  if (!check.success) {
    throw new Error(`Invalid product manifest '${candidate}': ${JSON.stringify(check.error.issues)}`);
  }
  return check.data;
}

function loadAllProductManifests(manifestsDir = DEFAULT_MANIFESTS_DIR, options = {}) {
  if (!options.forceReload && manifestsDir === DEFAULT_MANIFESTS_DIR && _manifestCache) {
    return _manifestCache;
  }
  const manifests = new Map();
  if (!fs.existsSync(manifestsDir)) return manifests;
  const files = fs.readdirSync(manifestsDir).filter(f => f.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(manifestsDir, file), 'utf8'));
      const check = ProductCapabilityManifestSchema.safeParse(parsed);
      if (!check.success) {
        logger.warn('PRODUCT_MANIFEST', `Skipping invalid manifest ${file}: ${JSON.stringify(check.error.issues)}`);
        continue;
      }
      manifests.set(check.data.productId, check.data);
    } catch (err) {
      logger.warn('PRODUCT_MANIFEST', `Failed reading product manifest ${file}: ${err.message}`);
    }
  }
  if (manifestsDir === DEFAULT_MANIFESTS_DIR) _manifestCache = manifests;
  return manifests;
}

function invalidateManifestCache() {
  _manifestCache = null;
}

function resolveManifestForKey(platformKey, manifestsDir = DEFAULT_MANIFESTS_DIR) {
  if (!platformKey) return null;
  const manifests = loadAllProductManifests(manifestsDir);
  if (manifests.has(platformKey)) return manifests.get(platformKey);
  const normTarget = _normalizeLookupKey(platformKey);
  for (const [id, manifest] of manifests.entries()) {
    if (_normalizeLookupKey(id) === normTarget) return manifest;
    const aliases = Array.isArray(manifest.skuAliases) ? manifest.skuAliases : [];
    if (aliases.some(a => _normalizeLookupKey(a) === normTarget)) return manifest;
  }
  return null;
}

module.exports = {
  DEFAULT_MANIFESTS_DIR,
  loadProductManifest,
  loadAllProductManifests,
  invalidateManifestCache,
  resolveManifestForKey
};
