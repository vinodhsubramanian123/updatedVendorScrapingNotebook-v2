'use strict';
/**
 * scripts/bootstrap_gen12.js — Fresh-clone Gen12 catalog bootstrap & sanity check
 * Usage: npm run bootstrap:gen12
 *
 * Verifies certified DL380 Gen12 SFF artifacts exist on disk and runs
 * offline validation suites (excel tally, aspect math, BOQ benchmarks).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { safeWriteJsonAtomic } = require('./lib/fs_compat');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GEN12_DIR = path.join(PROJECT_ROOT, 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF');
const CHASSIS = 'DL380_Gen12_SFF';
const MIN_SKU_COUNT = 200;

const REQUIRED_FILES = [
  'DL380_Gen12_SFF_Catalog.json',
  'DL380_Gen12_SFF_Catalog_Rules.json',
  'DL380_Gen12_SFF_Services.json',
  'DL380_Gen12_SFF_OCA_Catalog.xlsx',
  'CERTIFIED.json',
];

const REQUIRED_HISTORY = [
  'history/price_history.json',
  'history/discontinued_skus.json',
  'history/attribute_history.json',
  'history/catalog_deltas.json',
];

function runStep(label, cmd) {
  console.log(`\n--- ${label} ---`);
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });
}

function main() {
  console.log('================================================================');
  console.log('📦 DL380 Gen12 SFF — Bootstrap & Artifact Verification');
  console.log('================================================================\n');

  const missing = [];
  for (const f of [...REQUIRED_FILES, ...REQUIRED_HISTORY]) {
    const filePath = path.join(GEN12_DIR, f);
    if (!fs.existsSync(filePath)) missing.push(f);
    else console.log(`  ✅ Found: ${f}`);
  }

  if (missing.length > 0) {
    console.error('\n❌ BOOTSTRAP FAILED — Missing certified artifacts:');
    missing.forEach(f => console.error(`   • ${f}`));
    console.error('\nRun a full Gen12 scrape + promote, or pull certified outputs from git.');
    process.exit(1);
  }

  const catalogPath = path.join(GEN12_DIR, 'DL380_Gen12_SFF_Catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const skuCount = catalog.metadata?.totalUniqueSKUs || 0;

  if (skuCount < MIN_SKU_COUNT) {
    console.error(`❌ Catalog SKU count (${skuCount}) below Gen12 certified threshold (${MIN_SKU_COUNT}+)`);
    process.exit(1);
  }
  console.log(`\n  📊 Catalog: ${skuCount} unique SKUs`);

  const xlsxPath = path.join(GEN12_DIR, 'DL380_Gen12_SFF_OCA_Catalog.xlsx');
  runStep('Excel Tally Audit', `node scripts/verify_excel_tally.js "${xlsxPath}"`);
  runStep('Aspect Math Suite (34 assertions)', 'node scripts/test_all_aspects.js');
  runStep('BOQ Evaluation Benchmarks (5 scenarios)', 'node scripts/test_boq_eval_benchmarks.js');

  const report = {
    chassis: CHASSIS,
    bootstrappedAt: new Date().toISOString(),
    totalUniqueSKUs: skuCount,
    status: 'PASS',
    steps: ['artifact_check', 'verify_excel_tally', 'test_all_aspects', 'test_boq_eval_benchmarks'],
  };
  safeWriteJsonAtomic(path.join(GEN12_DIR, 'bootstrap_report.json'), report);

  console.log('\n================================================================');
  console.log('🎉 GEN12 BOOTSTRAP COMPLETE — Ready for evaluation');
  console.log('================================================================\n');
}

main();
