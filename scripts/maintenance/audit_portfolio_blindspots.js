'use strict';
/**
 * scripts/maintenance/audit_portfolio_blindspots.js
 *
 * CLI entrypoint for auditing collected, skipped, and classified catalog
 * blind spots across all scraped products.
 */

const path = require('path');
const { auditPortfolioBlindspots } = require('../lib/catalog/portfolio_blindspots.js');

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const save = args.includes('--save');
  const prodIdx = args.indexOf('--product');
  const product = prodIdx !== -1 ? args[prodIdx + 1] : null;
  const savePath = save
    ? path.join(process.cwd(), 'outputs', 'history', 'portfolio_blindspots_report.json')
    : null;

  const report = auditPortfolioBlindspots({ product, savePath });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n🔍 Portfolio Blind-Spot Audit (${report.productsScanned} products)`);
  console.log(`   Total Findings: ${report.summary.totalFindings} (HIGH=${report.summary.highSeverity}, MEDIUM=${report.summary.mediumSeverity}, LOW=${report.summary.lowSeverity})`);
  for (const prod of report.byProduct) {
    if (prod.findingsCount === 0) continue;
    console.log(`\n📦 ${prod.product} (${prod.findingsCount} findings)`);
    for (const f of prod.findings) {
      console.log(`   [${f.severity}] ${f.code}: ${f.message}`);
    }
  }
  if (savePath) {
    console.log(`\n💾 Saved report to ${savePath}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
