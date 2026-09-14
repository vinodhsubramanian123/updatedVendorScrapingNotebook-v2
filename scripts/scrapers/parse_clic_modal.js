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
  const advisories = [];
  const seenRules = new Set();

  for (const r of rows) {
    const ruleNum = String(r['Rule#'] || r['Rule #'] || r['Rule'] || '').trim();
    const productNum = String(r['Product#'] || r['Product #'] || r['Product'] || '').trim();
    const adviceText = String(r['Advice Text'] || r['AdviceText'] || r['Message'] || '').trim();
    const desc = String(r['Description'] || '').trim();
    const severity = String(r['Severity'] || r['Type'] || r['Level'] || '').trim().toLowerCase();

    if (!adviceText || adviceText.length < 5) continue;

    const dedupKey = `${ruleNum}_${productNum}_${adviceText.substring(0, 40)}`;
    if (seenRules.has(dedupKey)) continue;
    seenRules.add(dedupKey);

    const isWarning = severity.includes('warning') || severity.includes('advisory') ||
      (!severity && /^warning\b/i.test(adviceText)) || (!severity && adviceText.toLowerCase().includes('recommend'));
    const isUnbuildable = severity.includes('unbuildable') || severity.includes('error') ||
      adviceText.toLowerCase().includes('unbuildable') || adviceText.toLowerCase().includes('is not buildable') ||
      adviceText.toLowerCase().includes('must include') || adviceText.toLowerCase().includes('requires') ||
      adviceText.toLowerCase().includes('cannot be selected') || adviceText.toLowerCase().includes('not allowed');

    if (isWarning && !isUnbuildable) {
      advisories.push({
        ruleNum,
        productNum,
        description: desc,
        adviceText,
        severity: 'WARNING'
      });
      console.log(`  ℹ️ Advisory Warning (Ignored for buildability): Rule ${ruleNum.padEnd(10)} | SKU: ${productNum}`);
      continue;
    }

    // Unbuildable Error: detect multi-path resolution choices
    const resolutionPaths = [];
    if (/\b(?:or|alternatively|instead)\b/i.test(adviceText)) {
      const parts = adviceText.split(/\b(?:or|alternatively|instead)\b/i);
      parts.forEach((p, idx) => {
        if (p.trim().length > 3) {
          resolutionPaths.push({
            pathId: `Path_${String.fromCharCode(65 + idx)}`,
            suggestion: p.trim()
          });
        }
      });
    }

    const feedbackPayload = `[CLIC RULE ${ruleNum || 'PORTAL'}] Product ${productNum}: ${adviceText}`;
    try {
      const delta = processPortalFeedback(feedbackPayload, targetCatalogDir);
      results.push({
        ruleNum,
        productNum,
        description: desc,
        adviceText,
        severity: 'ERROR',
        resolutionPaths,
        deltaId: delta.deltaId,
        ruleUpdate: delta.ruleUpdate
      });
      console.log(`  ✅ Logged Unbuildable Rule ${ruleNum.padEnd(10)} | SKU: ${productNum.padEnd(12)} -> Delta: ${delta.deltaId}`);
    } catch (err) {
      console.warn(`  ⚠️ Failed to log feedback for rule ${ruleNum}:`, err.message);
    }
  }

  results.unbuildableErrors = results;
  results.advisories = advisories;
  results.totalIngested = results.length + advisories.length;

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
