'use strict';
/**
 * scripts/maintain_gen12.js — Single-command maintenance workflow for DL380 Gen12 SFF
 * Usage:
 *   node scripts/maintain_gen12.js              (full scrape + audit + sync + certify)
 *   node scripts/maintain_gen12.js --sync-only  (sync registry + sync knowledge + certify)
 *   npm run maintain:gen12
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { checkCdpHealth } = require('./lib/catalog_discovery.js');
const { safeWriteJsonAtomic } = require('./lib/fs_compat.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GEN12_DIR = path.join(PROJECT_ROOT, 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF');
const SYNC_ONLY = process.argv.includes('--sync-only');

function runStep(label, cmd) {
  console.log(`\n================================================================`);
  console.log(`▶ STEP: ${label}`);
  console.log(`  Command: ${cmd}`);
  console.log(`================================================================`);
  const start = Date.now();
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  console.log(`✅ [${label}] Completed in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
}

async function main() {
  console.log('================================================================');
  console.log('🛡️ DL380 GEN12 SFF MAINTENANCE & RESCRAPE PIPELINE');
  console.log('================================================================');

  if (!SYNC_ONLY) {
    console.log('\n[1/6] Checking Chrome CDP Port 9222 connection...');
    const cdpHealth = await checkCdpHealth(9222);
    if (!cdpHealth.ok) {
      console.error('\n❌ CDP NOT DETECTED ON PORT 9222');
      console.error('To run a live rescrape:');
      console.error('  1. Launch Chrome with remote debugging on port 9222');
      console.error('  2. Log into partner.hpe.com and open the OCA DL380 Gen12 solution');
      console.error('  3. Re-run: npm run maintain:gen12');
      console.error('\nIf you only want to sync registries and certify on-disk data:');
      console.error('  npm run maintain:gen12 -- --sync-only');
      process.exit(1);
    }
    console.log('  🟢 CDP Connection ACTIVE on port 9222');

    // 2. Scrape with Gen12 Profile
    runStep('1. Live Scraping DL380 Gen12 with proliant_gen12.json Profile', 'node scripts/scrape_oca_solution.js');
  } else {
    console.log('\n⏩ Skipping live CDP scrape (--sync-only mode enabled)');
  }

  // 3. Sync Catalog Registry
  runStep('2. Synchronize Master Catalog Registry (SCRAPED_CATALOGS.md)', 'node scripts/lib/sync_registry.js');

  // 4. Sync Knowledge to NotebookLM Payload
  runStep('3. Synchronize Knowledge Payload for NotebookLM RAG', 'node scripts/lib/knowledge_sync.js --chassis DL380_Gen12_SFF');

  // 5. Run Full Gen12 Certification Gate
  runStep('4. Execute Complete Gen12 Certification Suite', 'node scripts/certify_gen12.js');

  // 6. Update Maintenance Timestamp in CERTIFIED.json
  const certifiedPath = path.join(GEN12_DIR, 'CERTIFIED.json');
  if (fs.existsSync(certifiedPath)) {
    try {
      const certified = JSON.parse(fs.readFileSync(certifiedPath, 'utf-8'));
      certified.lastMaintainedAt = new Date().toISOString();
      safeWriteJsonAtomic(certifiedPath, certified);
    } catch (_) { /* ignore */ }
  }

  console.log('\n================================================================');
  console.log('🎉 DL380 GEN12 SFF MAINTENANCE COMPLETE & 100% CERTIFIED');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n❌ Maintenance pipeline aborted with error:', err.message);
  process.exit(1);
});
