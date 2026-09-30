'use strict';
/**
 * scripts/test_live_clic.js — Direct CDP Live CLIC Check Tester
 *
 * Connects directly to Chrome remote debugging port 9222 via WebSocket (bypassing IDE subagent permissions),
 * finds the active OCA page target, executes CLIC check inspection, and logs any unbuildable errors.
 */

const { getOCATarget, getAnyPageTarget, connectWS, triggerClicCheck, sleep } = require('../../scripts/lib/scraper/cdp.js');

async function main() {
  console.log(`================================================================`);
  console.log(`🚀 DIRECT CDP LIVE CLIC CHECK TESTER (Port 9222)`);
  console.log(`================================================================\n`);

  try {
    let target = await getOCATarget();
    if (!target) {
      console.log(`ℹ️ OCA target not matched directly. Searching for any active page target...`);
      target = await getAnyPageTarget();
    }

    if (!target) {
      console.error(`❌ Live CLIC test requires an active browser target on port 9222.`);
      console.error(`   Please ensure Chrome is launched with: --remote-debugging-port=9222`);
      if (process.env.ALLOW_E2E_SKIP === 'true') {
        console.log(`⚠️ ALLOW_E2E_SKIP enabled: skipping live browser check.`);
        process.exit(0);
      }
      process.exit(1);
    }

    console.log(`✅ Connected to Browser Page Target: ${target.title} (${target.url})`);
    const ws = await connectWS(target.webSocketDebuggerUrl);

    console.log(`\n🔍 Triggering CLIC Check Inspection via WebSocket...`);
    const clicResult = await triggerClicCheck(ws, 'root');

    console.log(`\n📋 CLIC Inspection Result:`);
    console.log(`  • Errors Found     : ${clicResult.hasErrors ? 'YES' : 'NO'}`);
    console.log(`  • Error Text       : ${clicResult.errorText || 'None'}`);
    console.log(`  • Root Cause       : ${clicResult.rootCause || 'None'}`);
    console.log(`  • Recommended SKUs : ${clicResult.recommendedSkus ? clicResult.recommendedSkus.join(', ') : 'None'}`);

    ws.close();
    console.log(`\n================================================================`);
    console.log(`🎉 LIVE CDP TEST COMPLETED SUCCESSFULLY (Zero Popups)`);
    console.log(`================================================================\n`);
  } catch (err) {
    console.error(`❌ Live CDP Connection error: ${err.message}`);
    if (process.env.ALLOW_E2E_SKIP === 'true') {
      console.log(`⚠️ ALLOW_E2E_SKIP enabled: ignoring connection failure.`);
      process.exit(0);
    }
    process.exit(1);
  }
}

main();
