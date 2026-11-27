#!/usr/bin/env node
'use strict';
/**
 * scripts/maintenance/onboard_product.js
 *
 * Zero-code Product Onboarding CLI: infers physical capability bounds from an
 * extracted Catalog JSON, validates against ProductCapabilityManifestSchema,
 * and writes scripts/config/products/<productId>.json cleanly (supports --dry-run).
 */

const fs = require('fs');
const path = require('path');
const { ProductCapabilityManifestSchema } = require('../lib/system/schemas.js');
const { invalidateManifestCache } = require('../lib/rules/product_manifest_loader.js');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');

function parseCliArgs(argv) {
  const args = { dryRun: false, registerNotebook: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--register-notebook') args.registerNotebook = true;
    else if (token === '--product-id' && argv[i + 1]) args.productId = argv[++i];
    else if (token === '--vendor' && argv[i + 1]) args.vendor = argv[++i];
    else if (token === '--domain' && argv[i + 1]) args.domain = argv[++i];
    else if (token === '--family' && argv[i + 1]) args.family = argv[++i];
    else if (token === '--generation' && argv[i + 1]) args.generation = argv[++i];
    else if (token === '--form-factor' && argv[i + 1]) args.formFactor = argv[++i];
    else if (token === '--catalog-path' && argv[i + 1]) args.catalogPath = argv[++i];
    else if (token === '--output-dir' && argv[i + 1]) args.outputDir = argv[++i];
  }
  return args;
}

function _applyChassisDescriptionHints(desc, sku, state) {
  if (sku) state.skuAliases.push(sku);
  if (desc.includes('1u') || /(?:^|[^a-z0-9])dl(?:145|325|360|365)(?![a-z0-9])/i.test(desc)) state.formFactor = '1U Rack';
  else if (desc.includes('4u') || desc.includes('dl380a')) state.formFactor = '4U Rack';
  if (desc.includes('1p') || desc.includes('dl145') || desc.includes('dl325') || desc.includes('dl345')) {
    state.maxSockets = 1;
    state.ocpSlots = 1;
  }
  if (desc.includes('dl580') || desc.includes('4p')) {
    state.maxSockets = 4;
    state.maxPsuBays = 4;
    state.basePcieSlots = 8;
  }
  if (desc.includes('gen11')) state.generation = 'Gen11';
}

function _isChassisHintEntry(parent, desc) {
  return parent.includes('base') || parent.includes('chassis') || desc.includes('cto server');
}

function _scanCatalogChassisHints(entries, initialState) {
  for (const entry of entries) {
    const parent = String(entry.parentCategory || '').toLowerCase();
    for (const skuRow of (entry.skus || [])) {
      const desc = String(skuRow.Description || skuRow.description || '').toLowerCase();
      if (_isChassisHintEntry(parent, desc)) {
        _applyChassisDescriptionHints(desc, skuRow['Product #'] || skuRow.sku, initialState);
      }
    }
  }
  return initialState;
}

function _inferDomainFromCatalog(opts, meta, pidLower) {
  if (opts.domain) return opts.domain;
  if (meta.domain) return meta.domain;
  const combined = [pidLower, meta.family, meta.generation].filter(Boolean).join(' ').toLowerCase();
  const pillar = String(meta.pillar || '').toUpperCase();
  if (pillar === 'SERVER') return 'server';
  if (pillar === 'NETWORKING') return 'networking';
  if (pillar === 'COMPOSITE') return 'composable';
  if (pillar === 'STORAGE') return /\b(tape|msl\d*|storeever|lto)\b/i.test(combined) ? 'archive' : 'storage';
  if (/\b(tape|msl\d*|storeever|lto)\b/i.test(combined)) return 'archive';
  if (/\b(alletra|nimble|msa|storeonce)\b/i.test(combined)) return 'storage';
  if (/\b(sn\d+[a-z]*|brocade|switch|interconnect|frame_link|f32)\b/i.test(combined)) return 'networking';
  if (/synergy.*frame/i.test(combined)) return 'composable';
  return 'server';
}

function _inferDefaultFormFactor(domain, opts, meta, state) {
  if (opts.formFactor) return opts.formFactor;
  if (meta.formFactor) return meta.formFactor;
  if (domain === 'server') return state.formFactor;
  const pidLower = String(opts.productId || '').toLowerCase();
  if (domain === 'composable') return pidLower.includes('synergy') ? '10U Blade Frame' : 'Modular Frame';
  if (domain === 'networking') return pidLower.includes('module') ? 'Interconnect Module' : '1U Rack';
  if (domain === 'storage') return pidLower.includes('alletra_mp') ? '2U+ Multi-Node' : '2U Storage';
  if (domain === 'archive') return /\bmsl/i.test(pidLower) ? '3U Tape Library' : 'Rack Tape Library';
  return state.formFactor;
}

function inferManifestFromCatalog(catalogData, opts) {
  const meta = catalogData?.metadata || {};
  const entries = Array.isArray(catalogData?.entries) ? catalogData.entries : [];
  const pidLower = String(opts.productId || '').toLowerCase();
  const domain = _inferDomainFromCatalog(opts, meta, pidLower);
  const state = {
    maxSockets: 2,
    ocpSlots: 2,
    basePcieSlots: 3,
    maxPsuBays: 2,
    generation: opts.generation || meta.generation || (domain === 'server' ? 'Gen12' : undefined),
    formFactor: opts.formFactor || meta.formFactor || '2U Rack',
    skuAliases: []
  };
  _applyChassisDescriptionHints(pidLower, null, state);
  _scanCatalogChassisHints(entries, state);
  const formFactor = _inferDefaultFormFactor(domain, opts, meta, state);

  const baseManifest = {
    schemaVersion: '1.0.0',
    productId: opts.productId,
    vendor: opts.vendor || meta.vendor || 'HPE',
    domain,
    family: opts.family || meta.family || (domain === 'server' ? 'ProLiant Compute' : 'HPE Enterprise'),
    ...(state.generation ? { generation: state.generation } : {}),
    formFactor,
    skuAliases: [...new Set([opts.productId, opts.productId.replace(/_/g, ' '), ...state.skuAliases])]
  };
  if (domain !== 'server') return baseManifest;

  const channelsPerSocket = pidLower.includes('dl145')
    ? 6
    : (/(?:^|[^a-z0-9])dl(?:325|345|365|385)(?![a-z0-9])/.test(pidLower) ? 12 : 8);
  return {
    ...baseManifest,
    maxSockets: state.maxSockets,
    ocpSlots: state.ocpSlots,
    basePcieSlots: state.basePcieSlots,
    maxPsuBays: state.maxPsuBays,
    memoryArchitecture: {
      generation: 'DDR5',
      channelsPerSocket,
      dimmsPerChannel: 2,
      maxDimmsPerSocket: 16,
      maxDimmsPerChassis: state.maxSockets * 16,
      validBalancedCountsPerSocket: [1, 2, 4, 6, 8, 12, 16]
    }
  };
}

function readOnboardingCatalog(args) {
  if (!args.catalogPath && args.dryRun) return {};
  if (!args.catalogPath) throw new Error('A scraped catalog is required for onboarding');
  const catalog = JSON.parse(fs.readFileSync(path.resolve(args.catalogPath), 'utf8'));
  if (!catalog.entries?.some(entry => entry.skus?.some(row => row['Product #'] || row.sku))) {
    throw new Error('The catalog has no product SKU rows');
  }
  const model = catalog.metadata?.model;
  if (model && model.toLowerCase().replace(/\s+/g, '_') !== args.productId.toLowerCase().replace(/\s+/g, '_')) {
    throw new Error('Catalog model does not match the requested product');
  }
  return catalog;
}

function onboardingManifest(existing, catalog, args) {
  if (!existing) return inferManifestFromCatalog(catalog, args);
  if (existing.productId !== args.productId) throw new Error('Existing manifest product ID mismatch');
  const manifest = { ...existing };
  for (const field of ['vendor', 'domain', 'family', 'generation', 'formFactor']) {
    if (args[field]) manifest[field] = args[field];
  }
  if (!Array.isArray(manifest.skuAliases) || manifest.skuAliases.length === 0) {
    const scanned = _scanCatalogChassisHints(Array.isArray(catalog?.entries) ? catalog.entries : [], { skuAliases: [] });
    manifest.skuAliases = [...new Set([args.productId, args.productId.replace(/_/g, ' '), ...scanned.skuAliases])];
  }
  return manifest;
}

function runOnboarding(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  if (!args.productId) {
    throw new Error('Missing required --product-id argument.');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/.test(args.productId)) throw new Error('Invalid product ID');
  const outDir = path.resolve(args.outputDir || path.join(__dirname, '..', 'config', 'products'));
  const outPath = path.join(outDir, args.productId + '.json');
  const catalogData = readOnboardingCatalog(args);
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : null;
  const manifest = onboardingManifest(existing, catalogData, args);
  const validation = ProductCapabilityManifestSchema.safeParse(manifest);
  if (!validation.success) {
    throw new Error(`Manifest failed ProductCapabilityManifestSchema: ${JSON.stringify(validation.error.issues)}`);
  }

  if (!args.dryRun && JSON.stringify(existing) !== JSON.stringify(manifest)) {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    safeWriteJsonAtomic(outPath, manifest, { rejectInvalid: false });
    invalidateManifestCache();
  }
  return {
    dryRun: args.dryRun,
    outputPath: outPath,
    manifest: validation.data
  };
}

if (require.main === module) {
  try {
    const res = runOnboarding();
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(`onboard:product failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  parseCliArgs,
  inferManifestFromCatalog,
  runOnboarding
};
