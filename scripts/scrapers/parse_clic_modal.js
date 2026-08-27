'use strict';
/**
 * scripts/parse_clic_modal.js — Extract Advice Text & Log Unbuildable CLIC Error Delta
 *
 * Connects to active Chrome session, targets the Advice Text container in the CLIC modal,
 * parses Rule#, Product#, Error Message, Root Cause, Action Required, and logs KnowledgeDelta.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');
const { getOCATarget, getAnyPageTarget, connectWS, sendCommand } = require('../lib/scraper/cdp.js');
const { processPortalFeedback } = require('../lib/feedback/feedback_loop.js');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');

/**
 * Parse an exported CLIC Advice Excel file (e.g. CLIC_Advice_TempUCID.xlsx)
 * @param {string} excelPath Path to CLIC advice workbook
 * @param {string} targetCatalogDir Target catalog directory
 */
function parseClicAdviceExcel(excelPath, targetCatalogDir = 'outputs/ProLiant/Gen11/DL380_Gen11') {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`CLIC Advice Excel file not found: ${excelPath}`);
  }

  const wb = xlsx.readFile(excelPath);
  const adviceSheet = wb.Sheets['Advice_Text'] || wb.Sheets['Advice Text'] || wb.Sheets[wb.SheetNames[0]];
  if (!adviceSheet) {
    throw new Error(`Could not find Advice_Text sheet in ${excelPath}`);
  }

  const rows = xlsx.utils.sheet_to_json(adviceSheet);
  console.log(`📑 Ingesting ${rows.length} CLIC advice items from: ${excelPath}`);

  const results = [];
  const seenRules = new Set();

  for (const r of rows) {
    const ruleNum = String(r['Rule#'] || r['Rule #'] || r['Rule'] || '').trim();
    const productNum = String(r['Product#'] || r['Product #'] || r['Product'] || '').trim();
    const adviceText = String(r['Advice Text'] || r['AdviceText'] || r['Message'] || '').trim();
    const desc = String(r['Description'] || '').trim();

    if (!adviceText || adviceText.length < 5) continue;

    const dedupKey = `${ruleNum}_${productNum}_${adviceText.substring(0, 40)}`;
    if (seenRules.has(dedupKey)) continue;
    seenRules.add(dedupKey);

    const feedbackPayload = `[CLIC RULE ${ruleNum || 'PORTAL'}] Product ${productNum}: ${adviceText}`;
    try {
      const delta = processPortalFeedback(feedbackPayload, targetCatalogDir);
      results.push({
        ruleNum,
        productNum,
        description: desc,
        adviceText,
        deltaId: delta.deltaId,
        ruleUpdate: delta.ruleUpdate
      });
      console.log(`  ✅ Logged Rule ${ruleNum.padEnd(10)} | SKU: ${productNum.padEnd(12)} -> Delta: ${delta.deltaId}`);
    } catch (err) {
      console.warn(`  ⚠️ Failed to log feedback for rule ${ruleNum}:`, err.message);
    }
  }

  return results;
}

async function parseLiveCdpModal(targetCatalogDir = 'outputs/ProLiant/Gen12/DL380_Gen12_SFF') {
  console.log(`🔍 Connecting to live browser on port 9222...`);
  let target = await getOCATarget();
  if (!target) target = await getAnyPageTarget();

  if (!target) {
    console.error(`❌ No active browser target found on port 9222.`);
    process.exit(1);
  }

  const ws = await connectWS(target.webSocketDebuggerUrl);

  const adviceRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const adviceBox = document.querySelector('.advice-text, [class*="AdviceText"], [class*="advice"], #adviceTextContainer, .ui-dialog-content');
      const tableRows = Array.from(document.querySelectorAll('table tr')).map(r => r.innerText.trim());
      const fullText = document.body ? document.body.innerText : '';
      return {
        fullTextSnippet: fullText.substring(0, 1500),
        tableRowsSnippet: tableRows.filter(t => t.includes('Unbuildable') || t.includes('Rule#')).join('\n')
      };
    })()`,
    returnByValue: true
  });

  const adviceData = (adviceRes && adviceRes.result) ? adviceRes.result.value : {};
  console.log(`📋 Live Advice Scraped:`, adviceData.tableRowsSnippet || adviceData.fullTextSnippet);

  ws.close();
}

async function main() {
  console.log(`================================================================`);
  console.log(`🔍 CLIC ADVICE INGESTION & UNBUILDABLE ROOT CAUSE LOGGER`);
  console.log(`================================================================\n`);

  const args = process.argv.slice(2);
  const excelFile = args.find(a => a.endsWith('.xlsx') || a.endsWith('.xls') || a.endsWith('.csv'));

  if (excelFile) {
    const targetDir = args.find(a => a.startsWith('outputs/')) || 'outputs/ProLiant/Gen11/DL380_Gen11';
    const deltas = parseClicAdviceExcel(excelFile, targetDir);
    console.log(`\n🎉 Processed ${deltas.length} CLIC knowledge rules successfully.`);
  } else {
    await parseLiveCdpModal();
  }

  console.log(`\n================================================================`);
  console.log(`🎉 CLIC ADVICE PROCESSING COMPLETE`);
  console.log(`================================================================\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error parsing CLIC modal:', err);
    process.exit(1);
  });
}

module.exports = {
  parseClicAdviceExcel,
  parseLiveCdpModal
};
