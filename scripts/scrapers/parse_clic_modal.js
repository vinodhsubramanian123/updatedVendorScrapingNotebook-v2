'use strict';
/**
 * scripts/parse_clic_modal.js — Extract Advice Text & Log Unbuildable CLIC Error Delta
 *
 * Connects to active Chrome session, targets the Advice Text container in the CLIC modal,
 * parses Rule#, Product#, Error Message, Root Cause, Action Required, and logs KnowledgeDelta.
 */

const fs = require('fs');
const xlsx = require('xlsx-js-style');
const { getOCATarget, getAnyPageTarget, connectWS, sendCommand } = require('../lib/scraper/cdp.js');
const { processPortalFeedback } = require('../lib/feedback/feedback_loop.js');

function classifyClicRowSeverity(severity = '', adviceText = '') {
  const sev = String(severity || '').trim().toLowerCase();
  const text = String(adviceText || '').trim();
  const lowerAdvice = text.toLowerCase();

  const isProcessControl =
    sev === 'p+' ||
    sev.includes('process control') ||
    sev.includes('process-control') ||
    lowerAdvice.includes('process control') ||
    lowerAdvice.includes('base warranty service icon');

  const unbuildableMarkers = ['unbuildable', 'is not buildable', 'must include', 'requires', 'cannot be selected', 'not allowed'];
  const isUnbuildable = !isProcessControl && (
    sev === 'u' ||
    sev.includes('unbuildable') ||
    ((!sev || sev === 'u') && unbuildableMarkers.some(m => lowerAdvice.includes(m)))
  );

  const isError = !isProcessControl && !isUnbuildable && (
    sev === 'e' ||
    sev.includes('error')
  );

  const isWarning = !isProcessControl && !isUnbuildable && !isError && (
    sev === 'w' ||
    sev.includes('warning') ||
    sev.includes('advisory') ||
    (!sev && (/^warning\b/i.test(text) || lowerAdvice.includes('recommend')))
  );

  const isPhysicalDeploymentWarning = isWarning &&
    /\b(?:c13|c19|c20|jumper|pdu|power\s+cord|high-line|licensing\s+symmetry|redundant\s+vc|bay\s*\d+)\b/i.test(text);

  const severityTier = isUnbuildable
    ? 'UNBUILDABLE'
    : isProcessControl
      ? 'PROCESS_CONTROL'
      : isError
        ? 'ERROR'
        : isWarning
          ? 'WARNING'
          : 'INFO';

  return {
    severityTier,
    isUnbuildable,
    isProcessControl,
    isError,
    isWarning,
    isPhysicalDeploymentWarning
  };
}

function _auditInformationSheet(wb, actualCounts) {
  const infoSheet = wb.Sheets['Information'] || wb.Sheets['Info'];
  if (!infoSheet) {
    return { present: false, warningCountDiscrepancy: false, reportedWarnings: null, actualWarnings: actualCounts.warnings };
  }
  const rows = xlsx.utils.sheet_to_json(infoSheet, { header: 1, defval: '' });
  let reportedWarnings = null;
  let reportedUnbuildable = null;
  let reportedErrors = null;
  let reportedProcessControl = null;

  for (const row of rows) {
    const joined = (Array.isArray(row) ? row : []).map(c => String(c ?? '').trim()).join(' ');
    const warnMatch = joined.match(/\bwarnings?\b\s*[:=-]?\s*(\d+)/i);
    if (warnMatch && reportedWarnings === null) reportedWarnings = parseInt(warnMatch[1], 10);
    const unbMatch = joined.match(/\bunbuildables?\b\s*[:=-]?\s*(\d+)/i);
    if (unbMatch && reportedUnbuildable === null) reportedUnbuildable = parseInt(unbMatch[1], 10);
    const errMatch = joined.match(/\berrors?\b\s*[:=-]?\s*(\d+)/i);
    if (errMatch && reportedErrors === null) reportedErrors = parseInt(errMatch[1], 10);
    const pcMatch = joined.match(/\b(?:process\s*control|p\+)\b\s*[:=-]?\s*(\d+)/i);
    if (pcMatch && reportedProcessControl === null) reportedProcessControl = parseInt(pcMatch[1], 10);
  }

  const warningCountDiscrepancy = reportedWarnings !== null && reportedWarnings < actualCounts.warnings;
  return {
    present: true,
    reportedWarnings,
    actualWarnings: actualCounts.warnings,
    reportedUnbuildable,
    actualUnbuildable: actualCounts.unbuildable,
    reportedErrors,
    actualErrors: actualCounts.errors,
    reportedProcessControl,
    actualProcessControl: actualCounts.processControl,
    warningCountDiscrepancy,
    note: warningCountDiscrepancy
      ? `Information sheet reported ${reportedWarnings} Warning(s), but Advice_Text contains ${actualCounts.warnings} Warning row(s). Always inspect Advice_Text directly.`
      : null
  };
}

function _auditClicBomSheet(wb) {
  const bomSheet = wb.Sheets['BOM'] || wb.Sheets['Bom'];
  if (!bomSheet) {
    return { present: false, rowCount: 0, hasServiceRows: false, omitsIconLevelServices: false, note: null };
  }
  const rows = xlsx.utils.sheet_to_json(bomSheet, { defval: '' });
  const hasServiceRows = rows.some(r => {
    const lineText = Object.values(r).map(v => String(v || '')).join(' ');
    return /\b(?:HU4B[A-Z0-9]+|HA114[A-Z0-9]+|H7J3[A-Z0-9]+|tech\s*care|support\s*service|foundation\s*care)\b/i.test(lineText);
  });
  const omitsIconLevelServices = rows.length > 0 && !hasServiceRows;
  return {
    present: true,
    rowCount: rows.length,
    hasServiceRows,
    omitsIconLevelServices,
    note: omitsIconLevelServices
      ? 'CLIC Advice BOM sheet reflects the hardware container only and omits icon-level support/service lines configured outside the hardware container.'
      : null
  };
}

function extractResolutionPaths(adviceText) {
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
  return resolutionPaths;
}

function _extractClicRowFields(r) {
  return {
    ruleNum: String(r['Rule#'] || r['Rule #'] || r['Rule'] || '').trim(),
    productNum: String(r['Product#'] || r['Product #'] || r['Product'] || '').trim(),
    adviceText: String(r['Advice Text'] || r['AdviceText'] || r['Message'] || '').trim(),
    desc: String(r['Description'] || '').trim(),
    severity: String(r['Severity'] || r['Type'] || r['Level'] || '').trim().toLowerCase()
  };
}

function _processClicAdviceRow(rowFields, targetCatalogDir, buckets) {
  const { ruleNum, productNum, adviceText, desc, severity } = rowFields;
  const classification = classifyClicRowSeverity(severity, adviceText);

  if (classification.isWarning) {
    const warnEntry = {
      ruleNum,
      productNum,
      description: desc,
      adviceText,
      severity: 'WARNING',
      severityTier: classification.severityTier,
      isPhysicalDeploymentWarning: classification.isPhysicalDeploymentWarning
    };
    buckets.advisories.push(warnEntry);
    if (classification.isPhysicalDeploymentWarning) {
      buckets.physicalDeploymentWarnings.push(warnEntry);
    }
    console.log(`  ℹ️ Advisory Warning (Ignored for buildability): Rule ${ruleNum.padEnd(10)} | SKU: ${productNum}`);
    return;
  }

  if (classification.isProcessControl) {
    buckets.processControlBlockers.push({
      ruleNum,
      productNum,
      description: desc,
      adviceText,
      severity: 'PROCESS_CONTROL',
      severityTier: classification.severityTier
    });
    console.log(`  🚦 Process Control (P+) Release Blocker: Rule ${ruleNum.padEnd(10)} | SKU: ${productNum}`);
    return;
  }

  if (classification.isError && !classification.isUnbuildable) {
    buckets.nonUnbuildableErrors.push({
      ruleNum,
      productNum,
      description: desc,
      adviceText,
      severity: 'ERROR',
      severityTier: classification.severityTier
    });
    console.log(`  ⚠️ Non-Unbuildable Error: Rule ${ruleNum.padEnd(10)} | SKU: ${productNum}`);
    return;
  }

  const resolutionPaths = extractResolutionPaths(adviceText);
  const feedbackPayload = `[CLIC RULE ${ruleNum || 'PORTAL'}] Product ${productNum}: ${adviceText}`;
  try {
    const delta = processPortalFeedback(feedbackPayload, targetCatalogDir);
    buckets.results.push({
      ruleNum,
      productNum,
      description: desc,
      adviceText,
      severity: 'UNBUILDABLE',
      severityTier: classification.severityTier,
      resolutionPaths,
      deltaId: delta.deltaId,
      ruleUpdate: delta.ruleUpdate
    });
    console.log(`  ✅ Logged Unbuildable Rule ${ruleNum.padEnd(10)} | SKU: ${productNum.padEnd(12)} -> Delta: ${delta.deltaId}`);
  } catch (err) {
    console.warn(`  ⚠️ Failed to log feedback for rule ${ruleNum}:`, err.message);
  }
}

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
  const adviceSheet = wb.Sheets['Advice_Text'] || wb.Sheets['Advice Text'] || wb.Sheets['Advice'] || wb.Sheets[wb.SheetNames[0]];
  if (!adviceSheet) {
    throw new Error(`Could not find Advice_Text sheet in ${excelPath}`);
  }

  const rows = xlsx.utils.sheet_to_json(adviceSheet);
  console.log(`📑 Ingesting ${rows.length} CLIC advice items from: ${excelPath}`);

  const buckets = {
    results: [],
    advisories: [],
    physicalDeploymentWarnings: [],
    processControlBlockers: [],
    nonUnbuildableErrors: []
  };
  const seenRules = new Set();

  for (const r of rows) {
    const rowFields = _extractClicRowFields(r);
    if (!rowFields.adviceText || rowFields.adviceText.length < 5) continue;

    const dedupKey = `${rowFields.ruleNum}_${rowFields.productNum}_${rowFields.adviceText.substring(0, 40)}`;
    if (seenRules.has(dedupKey)) continue;
    seenRules.add(dedupKey);

    _processClicAdviceRow(rowFields, targetCatalogDir, buckets);
  }

  const { results, advisories, physicalDeploymentWarnings, processControlBlockers, nonUnbuildableErrors } = buckets;
  const informationSheetSummary = _auditInformationSheet(wb, {
    warnings: advisories.length,
    unbuildable: results.length,
    errors: nonUnbuildableErrors.length,
    processControl: processControlBlockers.length
  });
  const bomSheetSummary = _auditClicBomSheet(wb);

  results.unbuildableErrors = results;
  results.processControlBlockers = processControlBlockers;
  results.nonUnbuildableErrors = nonUnbuildableErrors;
  results.advisories = advisories;
  results.warnings = advisories;
  results.physicalDeploymentWarnings = physicalDeploymentWarnings;
  results.informationSheetSummary = informationSheetSummary;
  results.bomSheetSummary = bomSheetSummary;
  results.totalIngested = results.length + advisories.length + processControlBlockers.length + nonUnbuildableErrors.length;

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
  classifyClicRowSeverity,
  extractResolutionPaths,
  parseClicAdviceExcel,
  parseLiveCdpModal
};
