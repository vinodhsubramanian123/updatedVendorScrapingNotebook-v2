'use strict';
/**
 * scripts/maintain_portfolio.js — Multi-Product Portfolio Maintenance CLI
 * Usage:
 *   node scripts/maintain_portfolio.js --chassis <ChassisID>
 *   node scripts/maintain_portfolio.js --all-baseline
 *   node scripts/maintain_portfolio.js --sync-only
 *   node scripts/maintain_portfolio.js --certify-only
 *   npm run maintain:portfolio
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { listAllCatalogs, checkCdpHealth } = require('./lib/catalog_discovery');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');

const args = process.argv.slice(2);
const chassisIdx = args.indexOf('--chassis');
const targetChassis = chassisIdx !== -1 ? args[chassisIdx + 1] : null;
const allBaseline = args.includes('--all-baseline');
const syncOnly = args.includes('--sync-only');
const certifyOnly = args.includes('--certify-only');

function runCmd(label, cmd) {
  console.log(`\n▶ [${label}] Running: ${cmd}`);
  const start = Date.now();
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  console.log(`✅ [${label}] Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function main() {
  console.log('================================================================');
  console.log('🌐 HPE OCA PORTFOLIO INTELLIGENCE & MAINTENANCE RUNNER');
  console.log('================================================================\n');

  const catalogs = listAllCatalogs(OUTPUTS_ROOT);
  console.log(`Discovered ${catalogs.length} registered product line(s) on disk:`);
  catalogs.forEach(c => console.log(`  • ${c.chassis.padEnd(28)} | SKUs: ${String(c.skuCount).padStart(4)} | Path: ${c.relativeDir}`));

  if (certifyOnly) {
    console.log('\n--- Running Portfolio Certification Audit ---');
    runCmd('Portfolio Audit (verify_all)', 'node scripts/verify_all.js');
    runCmd('Gen12 Deep Certification Gate', 'node scripts/certify_gen12.js');
    console.log('\n🎉 Portfolio Audit Passed!');
    return;
  }

  // 1. Sync Registry
  runCmd('Sync Master Registry (SCRAPED_CATALOGS.md)', 'node scripts/lib/sync_registry.js');

  // 2. Sync Knowledge Payloads
  if (targetChassis) {
    runCmd(`Sync Knowledge Payload (${targetChassis})`, `node scripts/lib/knowledge_sync.js --chassis "${targetChassis}"`);
  } else {
    runCmd('Sync Master Knowledge Registry & Payloads', 'node scripts/lib/knowledge_sync.js');
  }

  // 3. If specific chassis requested for rescrape
  if (targetChassis && !syncOnly) {
    console.log(`\nChecking CDP for chassis rescrape: ${targetChassis}`);
    const cdpHealth = await checkCdpHealth(9222);
    if (!cdpHealth.ok) {
      console.warn(`⚠️ CDP not listening on port 9222. Skipping live scrape for ${targetChassis}.`);
      console.warn(`To scrape ${targetChassis}, open Chrome on port 9222 and re-run with --chassis ${targetChassis}.`);
    } else {
      runCmd(`Scrape ${targetChassis}`, `node scripts/scrape_oca_solution.js`);
    }
  }

  // 4. Verify portfolio health
  runCmd('Verify All Catalogs', 'node scripts/verify_all.js');

  console.log('\n================================================================');
  console.log('🎉 PORTFOLIO MAINTENANCE PIPELINE COMPLETE');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n❌ Portfolio maintenance failed:', err.message);
  process.exit(1);
});
