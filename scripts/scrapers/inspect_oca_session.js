'use strict';
/**
 * scripts/inspect_oca_session.js — Live Active OCA Session Inspector (Zero Popups)
 *
 * Connects directly to Chrome port 9222, finds the active OCA page target,
 * dismisses any session timeout popups, inspects current quote/chassis title,
 * triggers CLIC check if available, and outputs current session state.
 */

const { getOCATarget, getAnyPageTarget, connectWS, setupDialogAutoHandler, dismissDOMModals, sendCommand, triggerClicCheck } = require('../lib/scraper/cdp.js');

async function main() {
  console.log(`================================================================`);
  console.log(`🚀 ACTIVE OCA SESSION INSPECTOR & LIVE CLIC ENGINE`);
  console.log(`================================================================\n`);

  let target = await getOCATarget();
  if (!target) {
    target = await getAnyPageTarget();
  }

  if (!target) {
    console.log(`❌ No active browser target found on port 9222.`);
    process.exit(1);
  }

  console.log(`✅ Connected to Active Chrome Tab: ${target.title}`);
  console.log(`   URL: ${target.url}`);

  const ws = await connectWS(target.webSocketDebuggerUrl);
  await setupDialogAutoHandler(ws);

  // 1. Auto-dismiss any DOM session modals or timeout warnings
  console.log(`\n🛡️ Running automated session modal dismissal...`);
  await dismissDOMModals(ws);

  // 2. Inspect active page DOM info
  const infoRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1, .page_title, #chassis_name, .product_title');
      const visible = el => Boolean(el && el.offsetWidth > 0 && el.offsetHeight > 0);
      const isExpandBtn = el => /expand all|collapse all/i.test(el.innerText || el.title || '');
      const clicBtn = ['#clic-button', '#clic_check', '.btn-clic', '#nav_clic', '[id*="clic_check"]', '[id*="clic-button"]', 'button[title*="CLIC" i]']
        .map(s => document.querySelector(s)).find(el => visible(el) && !isExpandBtn(el))
        || Array.from(document.querySelectorAll('a, button')).find(el => visible(el) && !isExpandBtn(el) && /^(?:view\\/resolve issues|clic(?: check)?|unbuildable)$/i.test((el.innerText || el.title || '').trim()));
      const bodyText = document.body ? document.body.innerText : '';
      const configStatus = /Config Status\\s+Unbuildable/i.test(bodyText.slice(0, 1200))
        ? 'UNBUILDABLE'
        : (/Config Status\\s+Buildable/i.test(bodyText.slice(0, 1200)) ? 'BUILDABLE' : 'UNKNOWN');
      return {
        title: h1 ? h1.innerText.trim() : document.title,
        configStatus,
        hasClicBtn: !!clicBtn,
        clicBtnText: clicBtn ? (clicBtn.innerText || clicBtn.title || clicBtn.id) : null,
        bodySnippet: bodyText.substring(0, 500).replace(/\\s+/g, ' ').substring(0, 200)
      };
    })()`,
    returnByValue: true
  });

  const pageInfo = (infoRes && infoRes.result) ? infoRes.result.value : {};
  console.log(`\n📋 Page Overview:`);
  console.log(`  • Title          : ${pageInfo.title || 'Unknown'}`);
  console.log(`  • Config Status  : ${pageInfo.configStatus || 'UNKNOWN'}`);
  console.log(`  • CLIC Check Button: ${pageInfo.hasClicBtn ? `✅ Present (${pageInfo.clicBtnText})` : '❌ Not visible on current view'}`);
  console.log(`  • Body Snippet   : ${pageInfo.bodySnippet}`);

  if (pageInfo.hasClicBtn) {
    console.log(`\n⚡ Triggering CLIC Check inspection on active page...`);
    const clicRes = await triggerClicCheck(ws, 'root');
    console.log(`\n📋 CLIC Inspection Results:`);
    console.log(`  • Config Status    : ${clicRes.configStatus || 'UNKNOWN'}`);
    console.log(`  • Errors Found     : ${clicRes.hasErrors ? 'YES' : 'NO'}`);
    console.log(`  • Error Details    : ${clicRes.rootCause || clicRes.errorText || 'No unbuildable errors found'}`);
  }

  ws.close();
  console.log(`\n================================================================`);
  console.log(`🎉 SESSION INSPECTION COMPLETE (Zero Popups)`);
  console.log(`================================================================\n`);
}

main().catch(err => {
  console.error('Session inspector error:', err.message);
  process.exit(1);
});
