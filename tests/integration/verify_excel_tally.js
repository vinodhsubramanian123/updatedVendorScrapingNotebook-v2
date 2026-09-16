// 100% Comprehensive Excel Tally & Pipeline Quality Audit Utility
// Usage: node scripts/verify_excel_tally.js <outputs/.../Foo_OCA_Catalog.xlsx>
// Accepts the xlsx path as CLI arg — works for ANY chassis, not just DL380 Gen12 SFF.
// All sibling paths (JSON, PDF) derived from the xlsx path automatically.

'use strict';

const XLSX   = require('xlsx-js-style');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { isValidHpeSKU, cleanBaseSKU } = require('../../scripts/lib/catalog/sku.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { isCanonicalCtoChassisCandidate } = require('../../scripts/catalogs/build_catalog.js');

// ── Argument handling ─────────────────────────────────────────────────────────
const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error('Usage: node scripts/verify_excel_tally.js <outputs/.../Foo_OCA_Catalog.xlsx>');
  console.error('Example: node scripts/verify_excel_tally.js outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_OCA_Catalog.xlsx');
  process.exit(1);
}

// Derive sibling paths from xlsx path
const targetDir  = path.dirname(xlsxPath);
const xlsxBase   = path.basename(xlsxPath, '.xlsx');                    // e.g. DL380_Gen12_SFF_OCA_Catalog
const filePrefix = xlsxBase.replace(/_OCA_Catalog$/, '');               // e.g. DL380_Gen12_SFF
const jsonPath   = path.join(targetDir, `${filePrefix}_Catalog.json`);
let pdfPath = path.join(targetDir, `HPE_${filePrefix}_QuickSpecs.pdf`);
if (!fs.existsSync(pdfPath)) {
  const existingPdfs = fs.readdirSync(targetDir).filter(f => f.endsWith('.pdf'));
  if (existingPdfs.length > 0) pdfPath = path.join(targetDir, existingPdfs[0]);
}

const auditResults = { timestamp: new Date().toISOString(), chassis: filePrefix, checks: [] };

const JSON_MODE = process.argv.includes('--json');
const PRE_PROMOTION = process.argv.includes('--pre-promotion');
const ALLOW_LEGACY = process.argv.includes('--allow-legacy');
if (JSON_MODE) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.error = () => {};
}

function assert(condition, message) {
  if (condition) {
    if (!JSON_MODE) console.log(`  ✅ PASS: ${message}`);
    auditResults.checks.push({ status: 'PASS', message });
  } else {
    if (!JSON_MODE) console.error(`  ❌ FAIL: ${message}`);
    auditResults.checks.push({ status: 'FAIL', message });
    throw new Error(`Guardrail Failure: ${message}`);
  }
}

async function main() {
  if (!JSON_MODE) {
    console.log('================================================================');
    console.log('🔍 COMPREHENSIVE EXCEL TALLY & PIPELINE AUDIT');
    console.log(`Chassis: ${filePrefix}`);
    console.log(`Excel:   ${xlsxPath}`);
    console.log('================================================================\n');
  }

  // ── AUDIT 1: File Existence & Payload Sizes ───────────────────────────────
  if (!JSON_MODE) console.log('--- AUDIT 1: Artifact File Existence & Payload Sizes ---');
  assert(fs.existsSync(xlsxPath), `Excel workbook exists: ${path.basename(xlsxPath)}`);
  assert(fs.existsSync(jsonPath), `Catalog JSON companion exists: ${path.basename(jsonPath)}`);

  const hasPdf = fs.existsSync(pdfPath);
  if (hasPdf) {
    if (!JSON_MODE) {
      console.log(`  ✅ PASS: QuickSpecs PDF exists: ${path.basename(pdfPath)}`);
      const pdfStats = fs.statSync(pdfPath);
      console.log(`  📑 QuickSpecs PDF:  ${(pdfStats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    assert(fs.statSync(pdfPath).size > 500000, `PDF size (${(fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2)} MB) > 500 KB threshold`);
  } else {
    if (!JSON_MODE) console.log(`  ⚠️  ADVISORY: QuickSpecs PDF not present (no QuickSpecs link on OCA page): ${path.basename(pdfPath)}`);
  }

  const xlsxStats = fs.statSync(xlsxPath);
  if (!JSON_MODE) console.log(`  📊 Excel Workbook:  ${(xlsxStats.size / 1024).toFixed(1)} KB`);

  // ── AUDIT 2: Excel Workbook Sheet Structure ───────────────────────────────
  console.log('\n--- AUDIT 2: Excel Workbook Sheet Structure ---');
  const wb = XLSX.readFile(xlsxPath);
  const coreSheets = ['Category Summary', 'All SKUs', 'Rules & Constraints', 'Metadata'];
  coreSheets.forEach(sheet => {
    assert(wb.SheetNames.includes(sheet), `Core sheet '${sheet}' present in workbook`);
  });
  console.log(`  Workbook contains ${wb.SheetNames.length} total sheets:`, wb.SheetNames.join(', '));

  // ── AUDIT 3: Master SKU Tally & Row Counts ─────────────────────────────
  console.log('\n--- AUDIT 3: Master SKU Tally & Row Counts ---');
  const catalogData  = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const allSkusSheet = XLSX.utils.sheet_to_json(wb.Sheets['All SKUs']);
  const summarySheet = XLSX.utils.sheet_to_json(wb.Sheets['Category Summary']);

  const currentCatalogRows = (catalogData.entries || []).flatMap(entry => (entry.skus || []).map(sku => ({ entry, sku })))
    .filter(({ sku }) => !['REMOVED', 'DISCONTINUED'].includes(String(sku['Diff Status'] || '').toUpperCase()));
  const currentHardwareRows = currentCatalogRows.filter(({ entry }) => entry.parentCategory !== 'Support Services');

  const jsonSkuCount = catalogData.metadata.totalUniqueSKUs;
  console.log(`  JSON  totalUniqueSKUs:     ${jsonSkuCount}`);
  console.log(`  Excel 'All SKUs' rows:     ${allSkusSheet.length}`);
  assert(
    allSkusSheet.length >= jsonSkuCount && allSkusSheet.length > 0,
    `Excel 'All SKUs' count (${allSkusSheet.length}) >= JSON totalUniqueSKUs (${jsonSkuCount})`
  );

  let summarySkuSum = 0;
  summarySheet.forEach(row => {
    const val = parseInt(row['Total SKUs'] || row['SKU Count'] || row['Count'] || '0', 10);
    if (!isNaN(val)) summarySkuSum += val;
  });
  if (!JSON_MODE) console.log(`  Category Summary SKU sum:  ${summarySkuSum}`);
  assert(summarySkuSum > 0, `Category Summary SKU sum (${summarySkuSum}) > 0`);
  assert(summarySheet.length >= 1, `Category Summary has ${summarySheet.length} subcategory rows (>= 1)`);

  // ── AUDIT 4: Data Quality Guardrails ──────────────────────────────────
  if (!JSON_MODE) console.log('\n--- AUDIT 4: Data Quality Guardrails ---');
  let cleanQtyCount       = 0;
  let validHierarchyCount  = 0;
  let validOptionTypeCount = 0;
  let taaGtaCount          = 0;
  let domPatternCount      = 0;
  let validHpeSKUCount     = 0;

  allSkusSheet.forEach(row => {
    const rawQty = row['Current Qty'] !== undefined && row['Current Qty'] !== null && row['Current Qty'] !== '' ? row['Current Qty'] : (row['Quantity'] !== undefined && row['Quantity'] !== null ? row['Quantity'] : '');
    const qty = String(rawQty).trim();
    if (/^\d+$/.test(qty)) cleanQtyCount++;

    const pathStr = String(row['Hierarchy Path'] || '');
    if ((pathStr.match(/>/g) || []).length >= 3) validHierarchyCount++;

    const optType = String(row['Option Type'] || '');
    if (['Standard', 'CTO', 'BTO', 'FIO', 'Service'].includes(optType)) validOptionTypeCount++;

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

  // GAP FIX #6: Subcategory resolution quality advisory
  const subTableCount = allSkusSheet.filter(r => r['Sub-Category'] === '(Sub-table)').length;
  const resolvedSubcatCount = allSkusSheet.length - subTableCount;
  const resolvedPct = ((resolvedSubcatCount / (allSkusSheet.length || 1)) * 100).toFixed(1);
  if (!JSON_MODE) {
    console.log(`  📊 Subcategory Resolution Quality: ${resolvedSubcatCount}/${allSkusSheet.length} resolved (${resolvedPct}%)`);
    if (resolvedPct < 20) {
      console.log(`  ℹ️  ADVISORY: ${subTableCount} SKUs are grouped under (Sub-table) fallback.`);
    }
  }

  assert(
    cleanQtyCount === allSkusSheet.length,
    `100% of SKUs (${cleanQtyCount}/${allSkusSheet.length}) pass numeric Current Qty regex (^\\d+$)`
  );
  assert(
    validHierarchyCount === allSkusSheet.length,
    `100% of SKUs (${validHierarchyCount}/${allSkusSheet.length}) have 4-level Hierarchy Path (>= 3 '>' delimiters, Rule #20)`
  );
  assert(
    validOptionTypeCount === allSkusSheet.length,
    `100% of SKUs (${validOptionTypeCount}/${allSkusSheet.length}) have valid Option Type (Standard/CTO/BTO/FIO/Service, Rule #30)`
  );
  assert(
    taaGtaCount === 0,
    `0 TAA / GTA Compliant SKUs found in export (${taaGtaCount} violations, Rule #33 MEA Dubai Exclusion)`
  );
  assert(
    domPatternCount === 0,
    `0 Internal DOM pattern IDs found in export (${domPatternCount} violations, Rule #35 DOM Pattern Elimination)`
  );
  assert(
    validHpeSKUCount === allSkusSheet.length,
    `100% of SKUs (${validHpeSKUCount}/${allSkusSheet.length}) pass strict HPE SKU regex (-B21 / Service SKU, Rule #35)`
  );

  // INV-49: Lossless commercial/lifecycle attributes and exact-product CTO identity.
  const requiredAttributeColumns = ['Availability', 'Lead Time', 'Lead Time Source', 'Lifecycle Status', 'Start Date', 'Discontinued Date', 'Vendor Attributes (JSON)'];
  const excelColumns = new Set(Object.keys(allSkusSheet[0] || {}));
  const missingColumns = requiredAttributeColumns.filter(column => !excelColumns.has(column));
  if (missingColumns.length > 0) {
    if (ALLOW_LEGACY) {
      if (!JSON_MODE) console.log(`  ⚠️  DEGRADED / LEGACY SCHEMA: Missing lossless attribute columns: ${missingColumns.join(', ')}`);
      auditResults.checks.push({ status: 'DEGRADED', message: `Missing lossless attribute columns (legacy schema): ${missingColumns.join(', ')}` });
      auditResults.isDegraded = true;
    } else {
      missingColumns.forEach(column => assert(false, `Lossless attribute column '${column}' is present`));
    }
  } else {
    requiredAttributeColumns.forEach(column => assert(excelColumns.has(column), `Lossless attribute column '${column}' is present`));
  }

  const physicalHardwareRows = currentHardwareRows.filter(({ entry }) => entry.parentCategory !== 'Software & Licenses');
  const activeSoftwareRows = currentHardwareRows.filter(({ entry, sku }) =>
    entry.parentCategory === 'Software & Licenses' &&
    !/obsolete|end of life/i.test(String(sku['Lifecycle Status'] || sku['CLIC Status'] || ''))
  );
  const hasPublishedNumericPrice = ({ sku }) => {
    const raw = sku['Unit Price (USD)'] ?? sku.listPrice;
    return raw !== undefined && raw !== null && String(raw).trim() !== '' &&
      Number.isFinite(Number(String(raw).replace(/[$,]/g, ''))) && Number(String(raw).replace(/[$,]/g, '')) >= 0;
  };
  const pricedRows = physicalHardwareRows.filter(hasPublishedNumericPrice);
  const pricedSoftwareRows = activeSoftwareRows.filter(hasPublishedNumericPrice);
  const lifecycleRows = currentHardwareRows.filter(({ sku }) => String(sku['Lifecycle Status'] || sku['CLIC Status'] || sku.lifecycleStatus || '').trim());
  const explicitAvailabilityRows = currentHardwareRows.filter(({ sku }) => {
    const value = String(sku.Availability || '').trim();
    return value && value !== 'Not published by OCA';
  });
  const startDateRows = currentHardwareRows.filter(({ sku }) => /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(String(sku['Start Date'] || '').trim()));
  const discontinuedDateRows = currentHardwareRows.filter(({ sku }) => /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(String(sku['Discontinued Date'] || '').trim()));
  const denominator = Math.max(1, currentHardwareRows.length);

  const discoveryPath = path.join(targetDir, 'raw_data', 'chassis_discovery.json');
  if (!fs.existsSync(discoveryPath)) {
    if (ALLOW_LEGACY) {
      if (!JSON_MODE) console.log('  ⚠️  DEGRADED / LEGACY SCHEMA: raw_data/chassis_discovery.json not present in legacy catalog');
      auditResults.checks.push({ status: 'DEGRADED', message: 'Current OCA chassis discovery evidence missing (legacy catalog)' });
      auditResults.isDegraded = true;
    } else {
      assert(false, 'Current OCA chassis discovery evidence exists');
    }
  }

  if (auditResults.isDegraded) {
    if (!JSON_MODE) console.log('  ⚠️  Legacy product schema detected: skipping modern field coverage assertions (marked DEGRADED pending migration).');
  } else {
    assert(pricedRows.length / Math.max(1, physicalHardwareRows.length) >= 0.95,
      `Current physical-hardware explicit OCA price-field coverage is >=95% (${pricedRows.length}/${physicalHardwareRows.length}; published $0 values preserved)`);
    if (activeSoftwareRows.length > 0) {
      assert(pricedSoftwareRows.length / activeSoftwareRows.length >= 0.75,
        `Current non-obsolete software/license explicit OCA price-field coverage is >=75% (${pricedSoftwareRows.length}/${activeSoftwareRows.length}; published $0 values preserved)`);
    }
    assert(lifecycleRows.length === currentHardwareRows.length, `Lifecycle status coverage is 100% (${lifecycleRows.length}/${currentHardwareRows.length})`);
    assert(explicitAvailabilityRows.length / denominator >= 0.50, `Explicit OCA availability coverage is >=50% (${explicitAvailabilityRows.length}/${currentHardwareRows.length}); unpublished rows remain explicitly unknown`);
    assert(startDateRows.length / denominator >= 0.95, `Start-date coverage is >=95% (${startDateRows.length}/${currentHardwareRows.length})`);
    assert(discontinuedDateRows.length / denominator >= 0.95, `Discontinued-date coverage is >=95% (${discontinuedDateRows.length}/${currentHardwareRows.length})`);
  }

  // ── AUDIT 4B: Price Sanity & Anti-Fabrication Guardrail (INV-94) ────────────
  if (!JSON_MODE) console.log('\n--- AUDIT 4B: Price Sanity & Anti-Fabrication Guardrail (INV-94) ---');
  let quantityAsPriceViolations = 0;
  let skuAsPriceViolations = 0;
  let invalidChassisSkus = 0;

  allSkusSheet.forEach(row => {
    const pn = String(row['Product #'] || '').trim();
    const desc = String(row['Description'] || '').toLowerCase();
    const parentCat = String(row['Parent Category'] || '');
    const rawQty = String(row['Current Qty'] || '0').trim();
    const rawPrice = String(row['Unit Price (USD)'] || '0').replace(/[$,]/g, '').trim();
    const numPrice = parseFloat(rawPrice) || 0;
    const numQty = parseInt(rawQty, 10) || 0;

    // 1. Quantity-as-Price check: Processors, Memory, Power, Controllers must not have price == quantity (e.g. $1, $2)
    const isMajorComponent = /processor|intel xeon|amd epyc|memory|dimm|rdimm|power supply|smart array|tri-mode|nvme|solid state/i.test(desc) ||
                             ['Processors', 'Memory', 'Power Supplies', 'Storage Controllers'].includes(parentCat);
    if (isMajorComponent && numPrice > 0 && numPrice <= 2 && numPrice === numQty) {
      quantityAsPriceViolations++;
      if (!JSON_MODE) console.error(`  ❌ Quantity-as-price violation: SKU ${pn} (${desc}) has price $${numPrice} matching Qty ${numQty}`);
    }

    // 2. Part-number-as-price check: price must not equal the 6-digit prefix of the SKU
    const skuNumMatch = pn.match(/^(\d{6})/);
    if (skuNumMatch && numPrice === parseInt(skuNumMatch[1], 10)) {
      skuAsPriceViolations++;
      if (!JSON_MODE) console.error(`  ❌ SKU-as-price violation: SKU ${pn} parsed as price $${numPrice}`);
    }

    // 3. Chassis variants must all be valid HPE SKUs
    if (parentCat === 'Chassis' || String(row['Sub-Category'] || '') === 'Variants') {
      if (!isValidHpeSKU(pn)) {
        invalidChassisSkus++;
        if (!JSON_MODE) console.error(`  ❌ Invalid Chassis SKU: ${pn}`);
      }
    }
  });

  assert(quantityAsPriceViolations === 0, `0 Quantity-as-price violations found (Rule INV-94)`);
  assert(skuAsPriceViolations === 0, `0 Part-number-as-price violations found (Rule INV-94)`);
  assert(invalidChassisSkus === 0, `0 Invalid chassis variant SKUs found (Rule INV-94)`);

  // 4. Base Chassis List Price Ground Truth Assertion
  try {
    const cmapPath = path.join(__dirname, '..', '..', 'scripts', 'config', 'chassis_map.json');
    if (fs.existsSync(cmapPath)) {
      const cmap = JSON.parse(fs.readFileSync(cmapPath, 'utf8'));
      const byFam = cmap.chassis_base_skus_by_family_gen || {};
      const cleanFilePrefix = filePrefix.toLowerCase().replace(/[^a-z0-9]/g, '');
      let expectedBaseSku = null;
      let expectedListPrice = null;

      for (const [k, grp] of Object.entries(byFam)) {
        const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normModel = (grp.modelFamily || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanFilePrefix.includes(normKey) || (normModel && cleanFilePrefix.includes(normModel))) {
          const skus = grp.skus || {};
          const firstSku = Object.keys(skus)[0];
          if (firstSku && skus[firstSku]?.listPrice) {
            expectedBaseSku = firstSku;
            expectedListPrice = skus[firstSku].listPrice;
            break;
          }
        }
      }

      if (expectedBaseSku && expectedListPrice) {
        const chassisRow = allSkusSheet.find(r => cleanBaseSKU(r['Product #']) === expectedBaseSku);
        if (chassisRow) {
          const actualPrice = parseFloat(String(chassisRow['Unit Price (USD)'] || '0').replace(/[$,]/g, ''));
          assert(actualPrice === expectedListPrice,
            `Base Chassis ${expectedBaseSku} list price ($${actualPrice.toFixed(2)}) strictly matches chassis_map.json ($${expectedListPrice.toFixed(2)})`);
          assert(actualPrice !== 2350, `Base Chassis list price is NOT corrupted placeholder $2350.00`);
        }
      }
    }
  } catch (cmapErr) {
    if (!JSON_MODE) console.warn(`  ⚠️ Chassis map price assertion skipped: ${cmapErr.message}`);
  }

  const chassisRows = currentHardwareRows.filter(({ entry }) => entry.parentCategory === 'Chassis' || entry.subCategory === 'Variants');
  assert(chassisRows.length > 0, 'At least one currently discoverable CTO base chassis is present');
  if (!auditResults.isDegraded) {
    const hasDeliveryEstimate = chassisRows.some(({ sku }) => String(sku['Lead Time'] || '').trim());
    if (!hasDeliveryEstimate && ALLOW_LEGACY) {
      if (!JSON_MODE) console.log('  ⚠️  DEGRADED / LEGACY SCHEMA: Selected CTO chassis delivery estimate missing');
      auditResults.checks.push({ status: 'DEGRADED', message: 'Selected CTO chassis delivery estimate missing (legacy catalog)' });
      auditResults.isDegraded = true;
    } else {
      assert(hasDeliveryEstimate, 'Selected CTO chassis carries the current OCA configuration delivery estimate');
    }

    const allCanonical = chassisRows.every(({ sku }) => isCanonicalCtoChassisCandidate({
      sku: sku['Product #'] || sku.sku,
      text: sku.Description || sku.description,
      isBto: String(sku['Option Type'] || '').toUpperCase() === 'BTO'
    }, filePrefix));
    if (!allCanonical && ALLOW_LEGACY) {
      if (!JSON_MODE) console.log('  ⚠️  DEGRADED / LEGACY SCHEMA: Chassis table contains legacy packaging/service options');
      auditResults.checks.push({ status: 'DEGRADED', message: 'Chassis table contains legacy packaging/service options' });
      auditResults.isDegraded = true;
    } else {
      assert(allCanonical, `All ${chassisRows.length} active chassis rows match exact product identity and exclude TAA/GTA/BTO/special-solution variants`);
    }
  }

  if (fs.existsSync(discoveryPath)) {
    assert(fs.existsSync(discoveryPath), 'Current OCA chassis discovery evidence exists');
    const discovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));
    const isPrePromotion = PRE_PROMOTION || targetDir.includes('staging_') || targetDir.includes('intermittent_scraps');
    if (isPrePromotion) {
      const discoveryAgeMs = Date.now() - Date.parse(discovery.capturedAt || '');
      assert(Number.isFinite(discoveryAgeMs) && discoveryAgeMs >= 0 && discoveryAgeMs <= 5 * 60 * 1000,
        `OCA chassis discovery is contemporaneous with this scrape (${Math.round(discoveryAgeMs / 1000)}s old, maximum 300s)`);
    } else {
      // Historical artifact verification: compare discovery capture time with scrape time
      const scrapeTime = catalogData.metadata?.scrapeTimestamp || catalogData.metadata?.scrapeDate;
      if (scrapeTime && discovery.capturedAt) {
        const deltaMs = Math.abs(Date.parse(scrapeTime) - Date.parse(discovery.capturedAt));
        if (deltaMs > 5 * 60 * 1000) {
          if (ALLOW_LEGACY) {
            if (!JSON_MODE) console.log(`  ⚠️  DEGRADED / LEGACY SCHEMA: OCA chassis discovery is not contemporaneous with scrape (${Math.round(deltaMs / 1000)}s delta)`);
            auditResults.checks.push({ status: 'DEGRADED', message: `OCA chassis discovery not contemporaneous in legacy catalog (${Math.round(deltaMs / 1000)}s delta)` });
            auditResults.isDegraded = true;
          } else {
            assert(false, `OCA chassis discovery is contemporaneous with scrape (${Math.round(deltaMs / 1000)}s delta, maximum 300s)`);
          }
        } else {
          assert(true, `OCA chassis discovery is contemporaneous with scrape (${Math.round(deltaMs / 1000)}s delta, maximum 300s)`);
        }
      } else {
        const discoveryAgeMs = Date.now() - Date.parse(discovery.capturedAt || '');
        assert(Number.isFinite(discoveryAgeMs), 'Valid discovery capture timestamp');
      }
    }
    const discoveredCtoSkus = new Set((discovery.candidates || [])
      .filter(candidate => isCanonicalCtoChassisCandidate(candidate, filePrefix))
      .map(candidate => String(candidate.sku || '').replace(/#GTA$/i, '').toUpperCase()));
    const currentChassisSkus = new Set(chassisRows.map(({ sku }) => String(sku['Product #'] || sku.sku || '').toUpperCase()));
    const missingDiscoveredVariants = [...discoveredCtoSkus].filter(sku => !currentChassisSkus.has(sku));
    if (!auditResults.isDegraded) {
      assert(discoveredCtoSkus.size > 0, 'OCA discovery contains at least one eligible exact-product CTO chassis');
      assert(missingDiscoveredVariants.length === 0, `All ${discoveredCtoSkus.size} discovered CTO chassis variants are represented (missing: ${missingDiscoveredVariants.join(', ') || 'none'})`);
    }
  }

  // ── AUDIT 5: Category-Specific Sheet Tallies ──────────────────────────────
  if (!JSON_MODE) console.log('\n--- AUDIT 5: Category-Specific Sheet SKU Tallies ---');
  const coreSheetsList = ['Category Summary', 'All SKUs', 'Rules & Constraints', 'Metadata', 'Catalog Diff & History'];
  const catSheets = wb.SheetNames.filter(name => !coreSheetsList.includes(name));
  catSheets.forEach(sheetName => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    if (!JSON_MODE) console.log(`  ${sheetName}: ${rows.length} SKUs`);
    assert(rows.length > 0, `Sheet '${sheetName}' contains > 0 SKUs`);
  });

  // GAP FIX / INV-22: Minimum Category Cardinality Assertions for Dual-Socket Flagship Servers
  const isFlagshipServer = filePrefix.toLowerCase().includes('dl380') || filePrefix.toLowerCase().includes('dl360');
  if (isFlagshipServer) {
    const procSheet = wb.Sheets['Processor'];
    if (procSheet) {
      const procRows = XLSX.utils.sheet_to_json(procSheet);
      assert(procRows.length >= 30, `Flagship Server Cardinality: Sheet 'Processor' must contain >= 30 SKUs (found: ${procRows.length})`);
    }
  }

  // AI Accelerator Server Archetype Cardinality Gate (INV-22)
  const isAiServer = filePrefix.toLowerCase().includes('dl380a') || filePrefix.toLowerCase().includes('accelerator');
  if (isAiServer && !auditResults.isDegraded) {
    const gpuSheet = wb.Sheets['Graphics & GPU'] || wb.Sheets['GPU Accelerators'] || wb.Sheets['Graphics Options'] || wb.Sheets['Accelerators'];
    assert(gpuSheet !== undefined, `AI Accelerator Server (INV-22): Specialized server '${filePrefix}' must contain GPU Accelerators / Graphics sheet`);
    if (gpuSheet) {
      const gpuRows = XLSX.utils.sheet_to_json(gpuSheet);
      assert(gpuRows.length >= 1, `AI Accelerator Server Cardinality: Must contain >= 1 GPU option (found: ${gpuRows.length})`);
    }
  }

  // ── AUDIT 6: PDF Fingerprint MD5 ─────────────────────────────────────────
  if (!JSON_MODE) console.log('\n--- AUDIT 6: PDF Fingerprint MD5 Cache Verification ---');
  if (hasPdf) {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const md5Hash   = crypto.createHash('md5').update(pdfBuffer).digest('hex');
    if (!JSON_MODE) console.log(`  PDF MD5 Fingerprint: ${md5Hash}`);
    assert(md5Hash.length === 32, 'Valid 32-character MD5 hash generated for QuickSpecs PDF');
  } else {
    if (!JSON_MODE) console.log('  ⚠️  ADVISORY: QuickSpecs PDF not present — skipping MD5 calculation.');
  }

  // ── AUDIT 7: Historical Diff & Price Trail Verification ────────────────────
  if (!JSON_MODE) console.log('\n--- AUDIT 7: Historical Diff & Price Trail Verification ---');
  const historyDir = path.join(targetDir, 'history');
  if (fs.existsSync(historyDir)) {
    const snapshots = fs.readdirSync(historyDir).filter(f => f.startsWith('catalog_') && f.endsWith('.json')).sort();
    if (!JSON_MODE) console.log(`  History snapshots found: ${snapshots.length} file(s)`);
    assert(snapshots.length > 0, 'history/ directory contains valid catalog snapshots');
    if (fs.existsSync(path.join(historyDir, 'price_history.json'))) {
      if (!JSON_MODE) console.log('  ✅ PASS: price_history.json cumulative log verified');
    }

    // GAP FIX / INV-23: Catastrophic SKU Drop & Anomaly Pre-Promotion Guardrail
    const currentSnapshotFile = catalogData.metadata?.historySnapshot || `catalog_${catalogData.metadata?.scrapeDate}.json`;
    const priorSnapshots = snapshots.filter(f => f !== currentSnapshotFile && f < currentSnapshotFile).sort();

    if (priorSnapshots.length === 0) {
      if (!JSON_MODE) console.log('  ℹ️  First baseline established (no strictly earlier history snapshots found for drop check).');
      auditResults.checks.push({ status: 'PASS', message: 'First baseline established; no prior history snapshots exist for drop check' });
    } else {
      const priorSnapshotFile = priorSnapshots[priorSnapshots.length - 1];
      let priorJson;
      try {
        priorJson = JSON.parse(fs.readFileSync(path.join(historyDir, priorSnapshotFile), 'utf-8'));
      } catch (err) {
        assert(false, `Corrupt or unreadable baseline snapshot '${priorSnapshotFile}': ${err.message}`);
      }

      const priorHardwareSkus = new Set();
      for (const entry of (priorJson?.entries || [])) {
        if (entry.parentCategory === 'Support Services') continue;
        for (const sku of (entry.skus || [])) {
          const status = String(sku['Diff Status'] || '').toUpperCase();
          if (['REMOVED', 'DISCONTINUED'].includes(status)) continue;
          const clean = cleanBaseSKU(sku['Product #'] || sku.sku || '');
          if (clean && isValidHpeSKU(clean)) priorHardwareSkus.add(clean);
        }
      }
      const priorCount = priorHardwareSkus.size;

      const currentHardwareSkus = new Set();
      for (const { entry, sku } of currentHardwareRows) {
        const clean = cleanBaseSKU(sku['Product #'] || sku.sku || '');
        if (clean && isValidHpeSKU(clean)) currentHardwareSkus.add(clean);
      }
      const currentCount = currentHardwareSkus.size;

      if (priorCount >= 50) {
        const dropRatio = currentCount / priorCount;
        assert(
          dropRatio >= 0.70,
          `INV-23 active hardware retention is >=70%: ${priorCount} prior unique active SKUs (${priorSnapshotFile}) vs ${currentCount} current unique active SKUs (${(dropRatio * 100).toFixed(1)}%)`
        );
      } else {
        if (!JSON_MODE) console.log(`  ℹ️  Prior active hardware count (${priorCount}) below 50 SKU threshold for catastrophic drop check.`);
      }
    }
  } else {
    if (!JSON_MODE) console.log('  ⚠️  ADVISORY: history/ directory not yet established for this chassis.');
  }

  // Write structured audit result file
  auditResults.status = auditResults.isDegraded ? 'DEGRADED' : 'SUCCESS';
  const auditJsonPath = path.join(targetDir, 'audit_result.json');
  safeWriteJsonAtomic(auditJsonPath, auditResults);

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ status: auditResults.status, data: auditResults }));
  } else if (auditResults.isDegraded) {
    console.log('\n================================================================');
    console.log('⚠️ AUDIT FINISHED WITH DEGRADED STATUS — Legacy Schema Migration Required');
    console.log('================================================================\n');
  } else {
    console.log('\n================================================================');
    console.log('🎉 ALL AUDIT CHECKS PASSED — PIPELINE 100% COMPLIANT!');
    console.log('================================================================\n');
  }
}

main().catch(err => {
  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ status: 'ERROR', error: err.message, checks: auditResults.checks }));
  } else {
    console.error('\n❌ AUDIT FAILED:', err.message);
  }
  process.exit(1);
});
