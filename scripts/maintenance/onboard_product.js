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
  if (desc.includes('1u')) state.formFactor = '1U Rack';
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

function inferManifestFromCatalog(catalogData, opts) {
  const meta = catalogData?.metadata || {};
  const entries = Array.isArray(catalogData?.entries) ? catalogData.entries : [];
  const state = _scanCatalogChassisHints(entries, {
    maxSockets: 2,
    ocpSlots: 2,
    basePcieSlots: 3,
    maxPsuBays: 2,
    generation: opts.generation || meta.generation || 'Gen12',
    formFactor: opts.formFactor || meta.formFactor || '2U Rack',
    skuAliases: []
  });

  const channelsPerSocket = state.maxSockets === 1 && opts.productId.includes('DL145') ? 6 : 8;
  return {
    schemaVersion: '1.0.0',
    productId: opts.productId,
    vendor: opts.vendor || meta.vendor || 'HPE',
    domain: opts.domain || meta.domain || 'server',
    family: opts.family || meta.family || 'ProLiant Compute',
    generation: state.generation,
    formFactor: state.formFactor,
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
    },
    skuAliases: [...new Set([opts.productId, opts.productId.replace(/_/g, ' '), ...state.skuAliases])]
  };
}

function runOnboarding(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  if (!args.productId) {
    throw new Error('Missing required --product-id argument.');
  }
  const catalogData = args.catalogPath && fs.existsSync(args.catalogPath)
    ? JSON.parse(fs.readFileSync(path.resolve(args.catalogPath), 'utf8'))
    : { metadata: {}, entries: [] };

  const manifest = inferManifestFromCatalog(catalogData, args);
  const validation = ProductCapabilityManifestSchema.safeParse(manifest);
  if (!validation.success) {
    throw new Error(`Manifest failed ProductCapabilityManifestSchema: ${JSON.stringify(validation.error.issues)}`);
  }

  const outDir = path.resolve(args.outputDir || path.join(__dirname, '..', 'config', 'products'));
  const outPath = path.join(outDir, `${args.productId}.json`);
  if (!args.dryRun) {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    safeWriteJsonAtomic(outPath, validation.data, { rejectInvalid: false });
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
