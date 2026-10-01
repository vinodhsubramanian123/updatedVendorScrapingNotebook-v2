'use strict';
/**
 * tests/e2e/test_live_clic.js — Direct CDP Live CLIC Check Tester
 *
 * Connects directly to Chrome remote debugging port 9222 via WebSocket,
 * finds the authenticated HPE OCA page target, executes CLIC check inspection,
 * and asserts that the candidate configuration is buildable with zero CLIC errors.
 *
 * Adheres to:
 * - INV-0 / INV-129: Zero False-Green & Non-Empty Matrix Guarantee
 * - Strict target verification: Requires genuine OCA configurator tab (no arbitrary page fallback)
 */

const assert = require('node:assert/strict');
const { getOCATarget, connectWS, triggerClicCheck } = require('../../scripts/lib/scraper/cdp.js');

async function main() {
  console.log(`================================================================`);
  console.log(`🚀 DIRECT CDP LIVE CLIC CHECK TESTER (Port 9222)`);
  console.log(`================================================================\n`);

  try {
    let target = null;
    try {
      target = await getOCATarget();
    } catch (targetErr) {
      console.warn(`Target discovery: ${targetErr.message}`);
    }

    if (!target) {
      console.error(`❌ Live CLIC test requires an active authenticated HPE OCA target on port 9222.`);
      console.error(`   Please ensure Chrome is launched with: --remote-debugging-port=9222`);
      if (process.env.ALLOW_E2E_SKIP === 'true') {
        console.log(`⚠️ [TEST_STATUS: SKIPPED] ALLOW_E2E_SKIP enabled: skipping live browser check without active OCA target.`);
        process.exit(0);
      }
      process.exit(1);
    }

    console.log(`✅ Connected to Authenticated OCA Target: ${target.title} (${target.url})`);
    const ws = await connectWS(target.webSocketDebuggerUrl);

    console.log(`\n🔍 Triggering CLIC Check Inspection via WebSocket...`);
    const clicResult = await triggerClicCheck(ws, 'root');

    console.log(`\n📋 CLIC Inspection Result:`);
    console.log(`  • Errors Found     : ${clicResult.hasErrors ? 'YES' : 'NO'}`);
    console.log(`  • Error Text       : ${clicResult.errorText || 'None'}`);
    console.log(`  • Root Cause       : ${clicResult.rootCause || 'None'}`);
    console.log(`  • Recommended SKUs : ${clicResult.recommendedSkus ? clicResult.recommendedSkus.join(', ') : 'None'}`);

    ws.close();

    // R-09: Assert that CLIC inspection executed and contains zero unbuildable errors
    assert.ok(clicResult, 'CLIC inspection result must be an object');
    assert.strictEqual(
      clicResult.hasErrors,
      false,
      `CLIC check failed with unbuildable errors: ${clicResult.errorText || clicResult.rootCause || 'Unknown CLIC violation'}`
    );

    console.log(`\n================================================================`);
    console.log(`🎉 [TEST_STATUS: PASSED] LIVE CDP CLIC VALIDATION CONFIRMED (Zero Unbuildable Errors)`);
    console.log(`================================================================\n`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Live CDP CLIC Validation failed: ${err.message}`);
    if (process.env.ALLOW_E2E_SKIP === 'true' && (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED'))) {
      console.log(`⚠️ [TEST_STATUS: SKIPPED] ALLOW_E2E_SKIP enabled: ignoring connection failure on offline environment.`);
      process.exit(0);
    }
    process.exit(1);
  }
}

main();
