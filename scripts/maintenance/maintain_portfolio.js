'use strict';
/**
 * scripts/maintain_portfolio.js — Multi-Product Portfolio Maintenance CLI
 * Usage:
 *   node scripts/maintain_portfolio.js --chassis <ChassisID>
 *   node scripts/maintain_portfolio.js --sync-only
 *   node scripts/maintain_portfolio.js --certify-only
 *   npm run maintain:portfolio
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { getCatalogPortfolioCoverage } = require('../lib/catalog/catalog_portfolio.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const chassisIdx = args.indexOf('--chassis');
const targetChassis = chassisIdx !== -1 ? args[chassisIdx + 1] : null;
const syncOnly = args.includes('--sync-only');
const certifyOnly = args.includes('--certify-only');

function runCmd(label, script, scriptArgs = []) {
  console.log(`\n▶ [${label}] Running: ${script}`);
  const start = Date.now();
  execFileSync(process.execPath, [script, ...scriptArgs], { cwd: PROJECT_ROOT, stdio: 'inherit' });
  console.log(`✅ [${label}] Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function main() {
  console.log('================================================================');
  console.log('🌐 HPE OCA PORTFOLIO INTELLIGENCE & MAINTENANCE RUNNER');
  console.log('================================================================\n');

  const catalogs = getCatalogPortfolioCoverage();
  console.log(`Portfolio coverage across ${catalogs.length} known product scopes:`);
  catalogs.forEach(catalog => console.log(`  • ${catalog.product} | ${catalog.captureStatus} | ${catalog.freshnessStatus}`));

  if (certifyOnly) {
    console.log('\n--- Running Portfolio Certification Audit ---');
    runCmd('Expected Catalog Coverage', 'scripts/maintenance/audit_product_rules_association.js', ['--require-fresh', '--require-published']);
    runCmd('Portfolio Audit (verify_all)', 'tests/integration/verify_all.js');
    runCmd('Gen12 Deep Certification Gate', 'scripts/maintenance/certify_gen12.js');
    console.log('\n🎉 Portfolio Audit Passed!');
    return;
  }

  if (targetChassis && !syncOnly) {
    runCmd(`Scrape ${targetChassis}`, 'scripts/scrapers/scrape_oca_solution.js', ['--chassis', targetChassis]);
  } else {
    runCmd('Sync Master Registry (SCRAPED_CATALOGS.md)', 'scripts/lib/catalog/sync_registry.js');
    runCmd('Sync Knowledge Payloads', 'scripts/lib/sync/knowledge_sync.js', targetChassis ? ['--chassis', targetChassis] : []);
  }

  runCmd('Expected Catalog Coverage', 'scripts/maintenance/audit_product_rules_association.js',
    [syncOnly ? '--strict' : '--require-fresh', ...(targetChassis ? ['--chassis', targetChassis] : [])]);
  runCmd('Verify All Catalogs', 'tests/integration/verify_all.js');

  console.log('\n================================================================');
  console.log('🎉 PORTFOLIO MAINTENANCE PIPELINE COMPLETE');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n❌ Portfolio maintenance failed:', err.message);
  process.exit(1);
});
