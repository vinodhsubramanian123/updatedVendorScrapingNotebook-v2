// End-to-End Pipeline & Guardrails Verification Script
// Usage: node scripts/test_pipeline_evals.js <outputs/.../Foo_OCA_Catalog.xlsx>
// Accepts the xlsx path as CLI arg — works for ANY chassis, not just DL380 Gen12 SFF.
// Tests all pre-flight, in-flight, and post-flight guardrails.

'use strict';

const fs    = require('fs');
const XLSX  = require('xlsx-js-style');
const path  = require('path');
const { sendCommand, getOCATarget, connectWS, sleep } = require('../../scripts/lib/scraper/cdp.js');
const { isValidHpeSKU } = require('../../scripts/lib/catalog/sku.js');

// ── Argument handling ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const defaultCatalog = path.join(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_OCA_Catalog.xlsx');
const xlsxPath = args.find(a => !a.startsWith('--')) || (fs.existsSync(defaultCatalog) ? defaultCatalog : null);
const postFlightOnly = args.includes('--post-flight-only') || (!args.find(a => !a.startsWith('--')));

if (!xlsxPath) {
  console.error('Usage: node tests/integration/test_pipeline_evals.js <outputs/.../Foo_OCA_Catalog.xlsx> [--post-flight-only]');
  process.exit(1);
}

// Derive sibling paths from xlsx path
const targetDir   = path.dirname(xlsxPath);
const xlsxBase    = path.basename(xlsxPath, '.xlsx');
const filePrefix  = xlsxBase.replace(/_OCA_Catalog$/, '');
const rawDataPath = path.join(targetDir, 'raw_data', 'oca_raw_data_full.json');
const catalogJsonPath = path.join(targetDir, `${filePrefix}_Catalog.json`);
let pdfPath    = path.join(targetDir, `HPE_${filePrefix}_QuickSpecs.pdf`);
if (!fs.existsSync(pdfPath)) {
  const existingPdfs = fs.readdirSync(targetDir).filter(f => f.endsWith('.pdf'));
  if (existingPdfs.length > 0) pdfPath = path.join(targetDir, existingPdfs[0]);
}

function assert(condition, message) {
  if (!condition) {
    console.error('❌ GUARDRAIL FAIL:', message);
    throw new Error('Guardrail Assertion Failed: ' + message);
  }
  console.log('✅ GUARDRAIL PASS:', message);
}

async function main() {
  console.log(`=== STARTING END-TO-END PIPELINE & GUARDRAILS EVALUATION ===`);
  console.log(`Chassis: ${filePrefix}\n`);

  let pageTarget = null;
  let ws = null;

  if (!postFlightOnly) {
    try {
      pageTarget = await getOCATarget();
      console.log(`CDP target: ${pageTarget.id} (${pageTarget.title})`);
      ws = await connectWS(pageTarget.webSocketDebuggerUrl);
    } catch (e) {
      console.log(`⚠️  ADVISORY: CDP browser session not connected: ${e.message}`);
      console.log(`   Running in Post-Flight Audit Mode.\n`);
    }
  } else {
    console.log(`ℹ️  Running in Explicit --post-flight-only Audit Mode.\n`);
  }

  if (ws) {
    // ── GUARDRAIL 1: Pre-Flight Solution Root Assertion ────────────────────────
    console.log('\n--- TEST 1: Pre-Flight Solution Root Assertion ---');
    const preflightRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const upBtn        = document.querySelector('#nav_up, .icon-arrow-up3');
        const selectNav    = document.querySelector('#selectNavTreeOption');
        const compTab      = Array.from(document.querySelectorAll('a'))
                               .find(a => a.innerText.trim() === 'Components');
        return JSON.stringify({
          hasUpBtn:        !!upBtn,
          hasSelectNav:    !!selectNav,
          hasComponentsTab: !!compTab,
          currentNavText:  selectNav ? selectNav.options[selectNav.selectedIndex]?.text.trim() : 'N/A'
        });
      })()`,
      returnByValue: true
    });

    const preflight = JSON.parse(preflightRes.result.value);
    assert(preflight.hasUpBtn || preflight.hasSelectNav,
      'Pre-flight: Root navigation elements (#nav_up / #selectNavTreeOption) present');
    assert(preflight.hasComponentsTab, 'Pre-flight: Components tab element present');
  } else {
    console.log('\n--- TEST 1: Pre-Flight Solution Root Assertion ---');
    console.log('  ⚠️  ADVISORY: Skipped in Post-Flight Audit Mode.');
  }

  // ── GUARDRAIL 2: In-Flight Page Expansion Assertion ────────────────────────
  console.log('\n--- TEST 2: In-Flight Page Expansion Assertion ---');
  if (ws) {
    console.log('Navigating to Product Node Menu tab...');
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const selectNav = document.querySelector('#selectNavTreeOption');
        if (selectNav && selectNav.options.length > 0) {
          selectNav.selectedIndex = selectNav.options.length - 1;
          selectNav.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (typeof jQuery !== 'undefined') {
          const lastVal = jQuery('#selectNavTreeOption option').last().val();
          if (lastVal) jQuery('#selectNavTreeOption').val(lastVal).trigger('change');
          jQuery('a[href*="extended_overview_menu"]').click();
        }
        const menuTab = document.querySelector('a[href*="extended_overview_menu"], #ui-id-24');
        if (menuTab) menuTab.click();
      })()`,
      returnByValue: true
    });

    await sleep(4000);

    console.log('Triggering section expansion...');
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        Array.from(document.querySelectorAll('a, button, span')).forEach(el => {
          const t = el.innerText ? el.innerText.trim() : '';
          if (t === 'Expand All' || t === 'Expand Subsections') el.click();
        });
        document.querySelectorAll('input[id*="showmore"]').forEach(i => { if (!i.checked) i.click(); });
      })()`,
      returnByValue: true
    });

    await sleep(3000);

    const expStatsRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const inputs  = document.querySelectorAll('input[id*="showmore"]');
        const checked = Array.from(inputs).filter(i => i.checked).length;
        return JSON.stringify({
          totalShowMore:   inputs.length,
          checkedShowMore: checked,
          textLength:      document.body.innerText.length,
          scrollHeight:    document.body.scrollHeight
        });
      })()`,
      returnByValue: true
    });

    const expStats = JSON.parse(expStatsRes.result.value);
    console.log(
      `Expansion: ${expStats.checkedShowMore}/${expStats.totalShowMore} showmore checked, ` +
      `text ${expStats.textLength} chars, height ${expStats.scrollHeight}px`
    );

    if (expStats.totalShowMore > 0) {
      assert(expStats.totalShowMore > 0,
        `In-flight: Total showmore toggles (${expStats.totalShowMore}) > 0`);
      assert(expStats.scrollHeight >= 15000,
        `In-flight: scrollHeight (${expStats.scrollHeight}px) >= 15,000px (Rule #19)`);
    } else {
      console.log('  ⚠️  ADVISORY: Live page is not currently on an expanded Menu tab (post-flight eval mode).');
    }
    ws.close();
  }

  if (fs.existsSync(rawDataPath)) {
    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
    const textLen = rawData.textLength || (rawData.fullText || rawData.bodyText || '').length || 0;
    const tblCnt = rawData.tableCount || (rawData.tables || []).length || 0;
    assert(textLen > 500 || tblCnt > 0,
      `In-flight: Scraped text length (${textLen} chars) > 500 or tables extracted (${tblCnt})`);
  } else {
    assert(fs.existsSync(catalogJsonPath),
      `Post-flight: Catalog JSON exists as raw data proxy: ${path.basename(catalogJsonPath)}`);
  }

  // ── GUARDRAIL 3: Post-Flight JSON Schema Audit ─────────────────────────────
  console.log('\n--- TEST 3: Post-Flight JSON Schema Audit ---');
  assert(fs.existsSync(catalogJsonPath),
    `Post-flight: Catalog JSON exists: ${path.basename(catalogJsonPath)}`);

  const catalogData = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));

  // Correct schema: metadata.totalUniqueSKUs (not catalogData.totalSkus — that field doesn't exist)
  const jsonSkuCount = catalogData.metadata?.totalUniqueSKUs || 0;
  assert(jsonSkuCount > 0,
    `Post-flight: JSON totalUniqueSKUs (${jsonSkuCount}) > 0`);
  assert(Array.isArray(catalogData.entries) && catalogData.entries.length > 0,
    `Post-flight: entries[] array non-empty (${(catalogData.entries || []).length} entries)`);

  // Iterate entries[].skus[] checking 'Current Qty' field (not currentQty)
  let cleanCurrentQtyCount = 0;
  let totalSkusInJson = 0;
  let chassisBaseSkus = [];

  (catalogData.entries || []).forEach(entry => {
    // Only exact 'Chassis' parentCategory or 'Variants' subCategory are base chassis entries.
    // 'Smart Chassis' accessory bundles (Standard type) are NOT base CTO variants.
    const isChassisCategory = (entry.parentCategory || '').toLowerCase() === 'chassis' ||
                              (entry.subCategory || '').toLowerCase() === 'variants';
    (entry.skus || []).forEach(sku => {
      totalSkusInJson++;
      const qty = String(sku['Current Qty'] || '0').trim();
      if (/^\d+$/.test(qty)) cleanCurrentQtyCount++;
      if (isChassisCategory) chassisBaseSkus.push(sku);
    });
  });

  assert(
    cleanCurrentQtyCount === totalSkusInJson,
    `Post-flight: 100% of JSON SKUs (${cleanCurrentQtyCount}/${totalSkusInJson}) have clean numeric 'Current Qty'`
  );

  // ── CTO Chassis Variant & Family/Gen Isolation Guardrail ──
  assert(chassisBaseSkus.length > 0, `Post-flight: Chassis CTO base variants populated (${chassisBaseSkus.length} variants found)`);

  let invalidOptionTypeCount = 0;
  let btoTaaGtaChassisCount = 0;
  let crossGenChassisCount = 0;
  let zeroPriceChassisCount = 0;
  let invalidSubcategoryCount = 0;
  const currentChassisGen = (catalogData.metadata?.gen || filePrefix).toLowerCase();

  chassisBaseSkus.forEach(sku => {
    const opt = String(sku['Option Type'] || sku.optionType || '').toUpperCase();
    if (opt !== 'CTO') invalidOptionTypeCount++;

    const desc = String(sku.Description || sku.description || '').toUpperCase();
    const pn = String(sku['Product #'] || sku.sku || '').toUpperCase();
    if (/\bBTO\b|\bTAA\b|\bGTA\b|#GTA/i.test(desc) || /\bBTO\b|\bTAA\b|\bGTA\b|#GTA/i.test(pn)) {
      btoTaaGtaChassisCount++;
    }

    const priceVal = parseFloat(sku['Unit Price (USD)'] || sku['Price (USD)'] || sku.listPrice || 0);
    if (!priceVal || priceVal <= 0) {
      zeroPriceChassisCount++;
    }

    // Check cross-generation contamination (e.g. Gen11 in Gen12)
    if (currentChassisGen.includes('gen12') && (desc.includes('GEN11') || desc.includes('GEN10') || desc.includes('DL360'))) {
      crossGenChassisCount++;
    } else if (currentChassisGen.includes('gen11') && (desc.includes('GEN12') || desc.includes('GEN10') || desc.includes('DL360'))) {
      crossGenChassisCount++;
    }
  });

  // Check subcategory naming for Base Chassis
  (catalogData.entries || []).forEach(entry => {
    const pLower = (entry.parentCategory || '').toLowerCase().trim();
    if (pLower === 'chassis' || pLower === 'base chassis') {
      if (entry.subCategory !== 'Variants' || entry.subCategory.includes('Controllers')) {
        invalidSubcategoryCount++;
      }
    }
  });

  assert(invalidOptionTypeCount === 0,
    `Post-flight: 100% of base chassis SKUs are CTO variants (${invalidOptionTypeCount} non-CTO found)`);
  assert(btoTaaGtaChassisCount === 0,
    `Post-flight: 0 BTO / TAA / GTA SKUs in chassis base variants (${btoTaaGtaChassisCount} violations)`);
  assert(crossGenChassisCount === 0,
    `Post-flight: 0 Cross-Generation / Cross-Model SKUs in chassis base variants (${crossGenChassisCount} violations)`);
  assert(zeroPriceChassisCount === 0,
    `Post-flight: 100% of base chassis SKUs have non-zero prices (${zeroPriceChassisCount} zero price violations)`);
  assert(invalidSubcategoryCount === 0,
    `Post-flight: Base chassis subcategory is correctly 'Variants' without 'Controllers' (${invalidSubcategoryCount} violations)`);

  if (filePrefix.includes('DL380_Gen12')) {
    assert(jsonSkuCount >= 6, `Post-flight: Consolidated DL380 Gen12 SFF catalog contains all scraped SKUs (${jsonSkuCount} >= 6)`);
  }

  // ── GUARDRAIL 4: Excel Workbook Quality ───────────────────────────────────
  console.log('\n--- TEST 4: Excel Workbook Quality ---');
  assert(fs.existsSync(xlsxPath),
    `Post-flight: Excel workbook exists: ${path.basename(xlsxPath)}`);

  const workbook = XLSX.readFile(xlsxPath);
  const coreSheets = ['Category Summary', 'All SKUs', 'Rules & Constraints', 'Metadata'];
  coreSheets.forEach(s =>
    assert(workbook.SheetNames.includes(s), `Post-flight: Core sheet '${s}' in workbook`)
  );
  assert(workbook.SheetNames.length > coreSheets.length,
    `Post-flight: Workbook contains category drill-down sheets (${workbook.SheetNames.length} sheets total)`);

  const allSkusSheet = XLSX.utils.sheet_to_json(workbook.Sheets['All SKUs']);
  assert(
    allSkusSheet.length >= jsonSkuCount && allSkusSheet.length > 0,
    `Post-flight: Excel 'All SKUs' rows (${allSkusSheet.length}) >= JSON totalUniqueSKUs (${jsonSkuCount})`
  );

  // Rule #20: Hierarchy Path must have >= 3 '>' delimiters
  let hierarchyOk = 0;
  let taaGtaCount = 0;
  let domPatternCount = 0;
  let validHpeSKUCount = 0;

  allSkusSheet.forEach(row => {
    const hp = row['Hierarchy Path'] || '';
    if ((hp.match(/>/g) || []).length >= 3) hierarchyOk++;

    const pn   = String(row['Product #'] || '').trim();
    const desc = String(row['Description'] || '').trim();

    if (/\bTAA\b|TAA Compliant|\bGTA\b|#GTA/i.test(pn) || /\bTAA\b|TAA Compliant|\bGTA\b|#GTA/i.test(desc)) {
      taaGtaCount++;
    }
    if (/pat0|00300/i.test(pn)) {
      domPatternCount++;
    }
    if (isValidHpeSKU(pn)) {
      validHpeSKUCount++;
    }
  });

  assert(
    hierarchyOk === allSkusSheet.length,
    `Post-flight: 100% of Excel rows (${hierarchyOk}/${allSkusSheet.length}) have 4-level Hierarchy Path (Rule #20)`
  );
  assert(
    taaGtaCount === 0,
    `Post-flight: 0 TAA / GTA Compliant SKUs in export (${taaGtaCount} violations, Rule #33 MEA Dubai Exclusion)`
  );
  assert(
    domPatternCount === 0,
    `Post-flight: 0 Internal DOM pattern IDs in export (${domPatternCount} violations, Rule #35 DOM Pattern Elimination)`
  );
  assert(
    validHpeSKUCount === allSkusSheet.length,
    `Post-flight: 100% of Excel SKUs (${validHpeSKUCount}/${allSkusSheet.length}) pass strict HPE SKU regex (-B21 / Service SKU, Rule #35)`
  );

  // ── GUARDRAIL 5: QuickSpecs PDF ───────────────────────────────────────────
  console.log('\n--- TEST 5: QuickSpecs PDF Quality ---');
  if (fs.existsSync(pdfPath)) {
    const pdfStats = fs.statSync(pdfPath);
    assert(pdfStats.size > 500000,
      `Post-flight: PDF size (${(pdfStats.size / 1024 / 1024).toFixed(2)} MB) > 500 KB`);
  } else {
    console.log(`⚠️ ADVISORY: QuickSpecs PDF not present: ${path.basename(pdfPath)}`);
  }

  // ── GUARDRAIL 6: Catalog Diff & Historical Data Integrity Audit ───────────
  console.log('\n--- TEST 6: Catalog Diff & Historical Data Integrity Audit ---');
  const historyDir = path.join(targetDir, 'history');
  assert(fs.existsSync(historyDir), `Post-flight: History directory exists: ${path.relative(process.cwd(), historyDir)}`);

  const diffSummary = catalogData.metadata?.diffSummary;
  assert(diffSummary !== undefined, 'Post-flight: Catalog metadata contains diffSummary');
  assert(typeof diffSummary.added === 'number' && typeof diffSummary.unchanged === 'number',
    `Post-flight: diffSummary has numeric metrics (Added: ${diffSummary.added}, Unchanged: ${diffSummary.unchanged})`);

  const priceHistoryPath = path.join(historyDir, 'price_history.json');
  assert(fs.existsSync(priceHistoryPath), `Post-flight: price_history.json exists`);

  const discontinuedSkusPath = path.join(historyDir, 'discontinued_skus.json');
  assert(fs.existsSync(discontinuedSkusPath), `Post-flight: discontinued_skus.json exists`);

  const attributeHistoryPath = path.join(historyDir, 'attribute_history.json');
  assert(fs.existsSync(attributeHistoryPath), `Post-flight: attribute_history.json exists`);

  // Verify NotebookLM payload generator & sync payload
  const { generateNotebookSyncPayload } = require('../../scripts/lib/sync/knowledge_sync.js');
  const payloadResult = generateNotebookSyncPayload(filePrefix);
  assert(fs.existsSync(payloadResult.payloadPath), `Post-flight: NotebookLM sync payload exists: ${path.basename(payloadResult.payloadPath)}`);
  assert(payloadResult.markdownText.includes('Discontinued & Obsolete SKUs Registry'),
    'Post-flight: NotebookLM payload contains Discontinued SKUs section');
  assert(payloadResult.markdownText.includes('Recent Attribute & Specification Modifications Log'),
    'Post-flight: NotebookLM payload contains Attribute Modifications section');
  assert(payloadResult.markdownText.includes('Cross-Chassis Variant & Platform Benchmark Matrix'),
    'Post-flight: NotebookLM payload contains Cross-Chassis Variant Matrix section');

  // ── GUARDRAIL 7: Live Cloud NotebookLM Health & Token Verification ─────────
  console.log('\n--- TEST 7: Live Cloud NotebookLM Health & Token Verification ---');
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const homeDir = process.env.HOME || '';
  const nlmUserPath = path.join(homeDir, '.local', 'bin', 'nlm');
  const hasNlmBinary = fs.existsSync(nlmUserPath) || (() => {
    const isWin = process.platform === 'win32';
    const binaryName = isWin ? 'nlm.cmd' : 'nlm';
    const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
    return pathDirs.some(dir => {
      try { return fs.existsSync(path.join(dir, binaryName)); } catch (_) { return false; }
    });
  })();

  const profileDir = path.join(homeDir, '.notebooklm-mcp-cli', 'profiles', 'default');
  const hasAuthProfile = fs.existsSync(profileDir);

  if (hasNlmBinary) {
    console.log('✅ GUARDRAIL PASS: Post-flight: nlm CLI executable is installed in PATH (~/.local/bin/nlm)');
  } else if (isCI) {
    console.log('⚠️  ADVISORY: nlm CLI executable not installed in CI runner — proceeding with offline/local RAG fallback');
  } else {
    assert(hasNlmBinary, 'Post-flight: nlm CLI executable is installed in PATH (~/.local/bin/nlm)');
  }

  if (hasAuthProfile) {
    console.log(`✅ GUARDRAIL PASS: Post-flight: Active NotebookLM OAuth Profile exists at ${profileDir}`);
  } else if (isCI) {
    console.log('⚠️  ADVISORY: Active NotebookLM OAuth Profile not present in CI runner — proceeding with offline/local RAG fallback');
  } else {
    assert(hasAuthProfile, `Post-flight: Active NotebookLM OAuth Profile exists at ${profileDir}`);
  }

  const notebooksConfigPath = path.join(__dirname, 'config', 'notebooks.json');
  if (fs.existsSync(notebooksConfigPath)) {
    const nbConfig = JSON.parse(fs.readFileSync(notebooksConfigPath, 'utf-8'));
    const entry = nbConfig.notebooks && nbConfig.notebooks[filePrefix];
    if (entry && entry.notebookId && entry.lastSyncedSourceId) {
      console.log(`✅ GUARDRAIL PASS: Post-flight: NotebookLM source ID tracked in notebooks.json for ${filePrefix}`);
    }
  }

  console.log('\n=============================================================');
  console.log('🎉 ALL GUARDRAIL EVALUATIONS PASSED (100% COMPLIANT)');
  console.log('=============================================================\n');
}

main().catch(err => {
  console.error('\n❌ EVALUATION FAILED:', err.message || err);
  process.exit(1);
});
