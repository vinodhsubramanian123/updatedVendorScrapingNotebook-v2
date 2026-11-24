'use strict';
/**
 * scripts/lib/catalog/builder/table_sku_parser.js — Table Header Detection, Row Normalization & Taxonomy Synthesis
 */

const { cleanBaseSKU, classifyOptionType, isValidHpeSKU, isTaaGtaCatalogOption } = require('../sku.js');
const { synthesizeSubcategoryName, classifyComponentRole } = require('../product_meta.js');
const {
  parseStrictPrice,
  parseLeadTimeOrEta,
  normalizeLifecycleCanonical,
  classifyRowType
} = require('../field_parsers.js');
const {
  ROLE_TO_PARENT_MAP,
  isClearlyPhysicalSkuRow,
  partitionCatalogEntries
} = require('./taxonomy_and_intake.js');
const {
  expandTableSections,
  normalizeHeaderName,
  matchSubcategoryForTable,
  resolveTableTaxonomyAndRole,
  _isSkippedReportTable,
  classifySampleCellHeader,
  synthesizeHeaderFromSampleRow,
  _isInvalidHeaderCandidateRow,
  _detectTableHeadersAndRules,
  _isStructuralWrapperTable
} = require('./table_header_classifier.js');

function extractRowSkuAndLifecycle(row, obj) {
  let rawPN = obj['Product #'] || '';
  const stripLifecycleBadge = value => String(value || '').replace(/\s*\[(?:OB|DS|90|EOL|CS)\]\s*/ig, '').trim();
  if (!rawPN || !isValidHpeSKU(cleanBaseSKU(stripLifecycleBadge(rawPN)))) {
    const foundCell = row.find(c => isValidHpeSKU(cleanBaseSKU(stripLifecycleBadge(c))));
    if (foundCell) rawPN = foundCell;
  }

  let lifecycleStatus = 'Active';
  let lifecycleBadge = '';
  const badgeMatch = String(rawPN).match(/^(OB|DS|90|EOL|CS)\b/i) || String(rawPN).match(/\[(OB|DS|90|EOL|CS)\]/i);
  if (badgeMatch) {
    lifecycleBadge = badgeMatch[1].toUpperCase();
    if (lifecycleBadge === 'OB') lifecycleStatus = 'Obsolete (OB)';
    else if (lifecycleBadge === 'DS') lifecycleStatus = 'Direct Ship (DS)';
    else if (lifecycleBadge === '90') lifecycleStatus = 'EOL Warning (90-Day)';
    else if (lifecycleBadge === 'EOL') lifecycleStatus = 'End of Life (EOL)';
    else if (lifecycleBadge === 'CS') lifecycleStatus = 'Constrained Supply (CS)';
  }

  if (rawPN) rawPN = cleanBaseSKU(stripLifecycleBadge(rawPN));
  if (!rawPN || !isValidHpeSKU(rawPN)) return null;

  return { pn: rawPN.toUpperCase(), lifecycleStatus, lifecycleBadge };
}

function extractRowDescription(row, obj, pn) {
  let descText = obj['Description'] || '';
  if (!descText || descText === pn) {
    const otherCells = row.filter(c => c !== pn && c.trim().length > 5);
    if (otherCells.length > 0) descText = otherCells[0];
  }
  if (descText.includes('context":') || descText.includes('\n') || descText.includes('\\n') || descText.includes('\t')) {
    descText = descText.replace(/context":\s*/gi, '').replace(/\\n/g, '\n').replace(/\\t/g, ' ');
    const firstLine = descText.split('\n')[0].trim();
    descText = firstLine.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^["\s]+|["\s]+$/g, '');
  }
  descText = descText.replace(/(?:Product is obsolete:\s*[A-Z0-9-]+\s*)+/gi, '').trim().replace(/^(?:OB|DS|90|EOL)\s+/i, '').trim();
  if (!descText || descText.length < 5 || descText === pn) {
    descText = `HPE Hardware Option (${pn})`;
  }
  return descText;
}

function resolveRowRecommendation(obj, headers) {
  const hasRecommendedHeader = headers.some(h => /^(?:hpe\s*)?recommended$/i.test(String(h).trim()));
  let hpeRecommended = obj['HPE Recommended'] || obj['Recommended'] || '';
  const isExplicitYes = /^(?:yes|true|recommended|selected|✓|✔|√)$/i.test(String(hpeRecommended).trim());
  const isExplicitNo = /^(?:no|false|not recommended)$/i.test(String(hpeRecommended).trim());

  if (isExplicitYes) {
    hpeRecommended = 'Yes';
  } else if (hasRecommendedHeader || isExplicitNo) {
    hpeRecommended = 'No';
  } else {
    hpeRecommended = 'No';
  }
  return hpeRecommended;
}

function resolveRowPrice(_row, _headers, obj, pn) {
  const raw = obj['List Price (USD)'] ?? obj['Unit Price (USD)'] ?? obj['Price (USD)'] ?? obj.Price;
  return parseStrictPrice(raw, { row: obj, sku: pn, description: obj.Description || '' });
}

function populateLeadTimeAndSpeedTier(obj) {
  const rawLt = String(obj['Lead Time'] || obj.leadTime || '').trim();
  const parsed = parseLeadTimeOrEta(rawLt, null, null);
  obj['Lead Time'] = parsed.raw;
  obj.leadTime = parsed.raw;
  obj.leadTimeDays = parsed.days;
  obj['Lead Time Days'] = parsed.days !== null ? String(parsed.days) : '';
  obj.leadTimeUnit = parsed.unit;
  obj.etaDate = parsed.etaDate;
  obj['Lead Time Source'] = parsed.isPublished ? 'OCA row attribute' : 'Unpublished';
  obj['Speed Tier'] = (!parsed.isPublished && /unavailable|out of stock|allocation hold/i.test(obj.Availability || ''))
    ? 'Constrained / Allocation Hold'
    : parsed.speedTier;
}

function populateNumericAndPriceAttrs(obj, row, headers, pn, historyPriceMap, diagnostics = null) {
  if (obj['Qty Drive Cages']) obj.qtyDriveCages = parseInt(obj['Qty Drive Cages'], 10) || obj['Qty Drive Cages'];
  if (obj['Qty Bays']) obj.qtyBays = parseInt(obj['Qty Bays'], 10) || obj['Qty Bays'];
  if (obj['Qty PCI Slots']) obj.qtyPciSlots = parseInt(obj['Qty PCI Slots'], 10) || obj['Qty PCI Slots'];
  if (obj['Controllers']) obj.controllers = obj['Controllers'];

  const rawQty = String(obj['Current Qty'] || obj['Quantity'] || '0').replace(/\s+/g, '').trim();
  obj['Current Qty'] = /^\d+$/.test(rawQty) ? rawQty : '0';
  delete obj['Quantity'];

  const priceParsed = resolveRowPrice(row, headers, obj, pn, historyPriceMap);
  const priceStr = priceParsed.priceUsd === null ? '' : priceParsed.priceUsd.toFixed(2);
  obj['Unit Price (USD)'] = priceStr;
  obj['List Price (USD)'] = priceStr;
  obj.listPrice = priceParsed.priceUsd;
  obj.priceState = priceParsed.priceState;
  obj.priceStatus = priceParsed.priceStatus;
  if (priceParsed.priceState === 'PARSE_FAILED') {
    diagnostics?.recordAnomaly?.('unparseablePrices', { sku: pn, rawPrice: priceParsed.raw, reason: priceParsed.reason });
  }

  const rawCost = obj['Cost (USD)'] ? String(obj['Cost (USD)']).trim() : '';
  const costParsed = rawCost ? parseStrictPrice(rawCost, { row: obj, sku: pn }) : null;
  if (costParsed && costParsed.priceUsd !== null) {
    obj['Cost (USD)'] = costParsed.priceUsd.toFixed(2);
    obj.costPrice = costParsed.priceUsd;
  } else {
    obj['Cost (USD)'] = '';
    obj.costPrice = null;
  }
}

const CANONICAL_ROW_KEYS = new Set([
  'Product #', 'Description', 'Current Qty', 'Unit Price (USD)', 'List Price (USD)', 'Cost (USD)', 'Price (USD)', 'Price',
  'Price Delta (USD)', 'Extended Price (USD)', 'Price per GB (USD)',
  'Option Type', 'CLIC Status', 'Lifecycle Status', 'Start Date', 'Discontinued Date',
  'Availability', 'Lead Time', 'Lead Time Days', 'Speed Tier', 'Lead Time Source', 'HPE Recommended',
  'sku', 'lifecycleStatus', 'lifecycleBadge', 'clicStatus', 'costPrice', 'leadTimeDays',
  'vendorRecommended', 'qtyDriveCages', 'qtyBays', 'qtyPciSlots', 'controllers'
]);

function parseSingleTableRow(row, headers, offset, historyPriceMap) {
  const obj = {};
  const priceHeaders = new Set(['Unit Price (USD)', 'Cost (USD)', 'List Price (USD)']);
  for (let hi = 0; hi < headers.length; hi++) {
    const cellIdx = hi + offset;
    if (headers[hi] && cellIdx < row.length) {
      const header = normalizeHeaderName(headers[hi]);
      let val = row[cellIdx].replace(/\n/g, ' ').trim();
      if (priceHeaders.has(header)) {
        val = val.replace(/[$,]/g, '').trim();
      }
      obj[header] = val;
    }
  }

  const skuInfo = extractRowSkuAndLifecycle(row, obj);
  if (!skuInfo) return null;
  const { pn, lifecycleStatus, lifecycleBadge } = skuInfo;

  const isCsBadge = lifecycleBadge === 'CS' || row.some(value => {
    const text = String(value || '').trim();
    return /\[CS\]/i.test(text) && (cleanBaseSKU(text).toUpperCase() === pn || /^\[CS\]$/i.test(text));
  });
  const effectiveLifecycleStatus = (isCsBadge && lifecycleBadge !== 'OB') ? 'Constrained Supply (CS)' : lifecycleStatus;
  const effectiveLifecycleBadge = (isCsBadge && lifecycleBadge !== 'OB') ? 'CS' : lifecycleBadge;
  if (isCsBadge) {
    obj['Vendor Status Badge'] = 'CS';
    obj.isSupplyConstrained = true;
    obj.Availability = 'Constrained Supply (CS)';
    obj.vendorSupplyStatus = 'CONSTRAINED_SUPPLY';
    obj.supplyConstraintDetails = 'This SKU is currently unavailable based on supply constraints. Select equivalent alternative SKU.';
  }

  obj['Product #'] = pn;
  obj.sku = pn;
  obj['Option Type'] = isClearlyPhysicalSkuRow(obj) && classifyOptionType(pn) === 'Service' ? 'Standard' : classifyOptionType(pn);

  obj['CLIC Status'] = obj['CLIC Status'] || 'Unpublished';
  obj.clicStatus = obj['CLIC Status'];
  obj['Lifecycle Status'] = effectiveLifecycleStatus;
  obj.lifecycleStatus = effectiveLifecycleStatus;
  obj.lifecycleBadge = effectiveLifecycleBadge;
  obj.Availability = String(obj.Availability || '').trim() || (effectiveLifecycleStatus === 'Active' ? 'Not published by OCA' : effectiveLifecycleStatus);

  populateLeadTimeAndSpeedTier(obj);

  const dateMatches = row.filter(c => /^\d{2}\/\d{2}\/\d{4}$/.test(c.trim()));
  if (dateMatches.length >= 1 && !obj['Start Date']) obj['Start Date'] = dateMatches[0].trim();
  if (dateMatches.length >= 2 && !obj['Discontinued Date']) obj['Discontinued Date'] = dateMatches[1].trim();

  const descText = extractRowDescription(row, obj, pn);
  const hpeRecommended = resolveRowRecommendation(obj, headers);
  obj['HPE Recommended'] = hpeRecommended;
  obj.vendorRecommended = (hpeRecommended === 'Yes');

  const lcNorm = normalizeLifecycleCanonical(effectiveLifecycleStatus, false);
  obj.lifecycleCanonical = lcNorm.lifecycleCanonical;
  populateNumericAndPriceAttrs(obj, row, headers, pn, historyPriceMap);
  obj.rowType = classifyRowType(obj);

  obj.vendorAttributes = Object.fromEntries(Object.entries(obj).filter(([key, value]) =>
    !CANONICAL_ROW_KEYS.has(key) && String(value ?? '').trim()
  ));

  if (isTaaGtaCatalogOption(pn, descText)) {
    return null;
  }

  return { obj, pn, descText };
}

function _applyPrivateAndRegionalPriceState(obj, row, headerInfo, pn) {
  const unpriced = obj.listPrice === null || obj.listPrice <= 0;
  if (!unpriced) return;
  if (headerInfo.isPrivateTable || /\bPVT\b/i.test(row.join(' '))) {
    obj.isPrivateSku = true;
    obj.priceState = 'PRIVATE_UNPRICED';
    obj.priceStatus = 'PRIVATE_UNPRICED';
    return;
  }
  const rawPriceText = String(obj['Unit Price (USD)'] || obj['List Price (USD)'] || '').trim();
  if (/-A[AB]1$/i.test(pn) && /^(?:|na|n\/a)$/i.test(rawPriceText)) {
    obj.priceState = 'REGIONAL_NA_UNPRICED';
    obj.priceStatus = 'REGIONAL_NA_UNPRICED';
  }
}

function _extractSkusFromTable(table, headerInfo, historyPriceMap, allSKUMap) {
  const { headerIdx, headers, tableAvailability } = headerInfo;
  const skus = [];

  for (let ri = headerIdx + 1; ri < table.rows.length; ri++) {
    const row = table.rows[ri];
    if (row.length < 2) continue;

    let offset = 0;
    if (headers[0] === 'Product #' && row[0] === '' && row.length > headers.length) offset = 1;

    const parsed = parseSingleTableRow(row, headers, offset, historyPriceMap);
    if (!parsed) continue;

    const { obj, pn, descText } = parsed;
    _applyPrivateAndRegionalPriceState(obj, row, headerInfo, pn);
    if ((!obj.Availability || obj.Availability === 'Not published by OCA') && tableAvailability) {
      obj.Availability = tableAvailability;
    }
    const isPhantomFio = descText.toLowerCase() === 'factory integrated' ||
                         (descText.toLowerCase().includes('factory integrated') && (!obj['Unit Price (USD)'] || obj['Unit Price (USD)'] === '0.00' || obj['Unit Price (USD)'] === '0'));

    const existingSkuIndex = skus.findIndex(s => s['Product #'] === pn);
    if (existingSkuIndex !== -1) {
      if (isPhantomFio || obj['Option Type'] === 'CTO') {
        skus[existingSkuIndex]['Option Type'] = 'CTO';
        skus[existingSkuIndex].isFactoryIntegrated = true;
      }
      continue;
    }

    if (isPhantomFio && allSKUMap.has(pn)) {
      const prev = allSKUMap.get(pn);
      prev['Option Type'] = 'CTO';
      prev.isFactoryIntegrated = true;
      continue;
    }

    if (pn && pn.length >= 3 && pn.length < 30 && !pn.includes('Product #') && !pn.includes('Optional') && !pn.includes('Please make')) {
      skus.push(obj);
    }
  }

  return skus;
}

function _extractSmartChassisCombinations(table, headerIdx, smartChassisCombinations) {
  const isPatternTable = (table.rows || []).some(r => (r || []).some(c => /^(?:dl\d+pat|dl\d+smtch)/i.test(String(c || '').trim())));
  if (!isPatternTable) return;

  for (let ri = (headerIdx >= 0 ? headerIdx + 1 : 0); ri < table.rows.length; ri++) {
    const row = table.rows[ri];
    const patternId = (row || []).find(c => /^(?:dl\d+pat|dl\d+smtch)/i.test(String(c || '').trim()));
    if (!patternId) continue;
    const desc = (row || []).find(c => /drive cage|riser|controller|smart chassis/i.test(String(c || ''))) || '';
    const priceCell = (row || []).find(c => /^\d[\d,]*\.\d{2}$/.test(String(c || '').trim())) || '0.00';
    const price = parseFloat(String(priceCell).replace(/,/g, '')) || 0;

    const cageMatch = desc.match(/(\d+)\s*drive\s*cage/i);
    const qtyDriveCages = cageMatch ? parseInt(cageMatch[1], 10) : 0;
    let qtyBays = 0;
    if (/8sff/i.test(desc)) qtyBays = qtyDriveCages * 8;
    else if (/4lff|8lff|12lff/i.test(desc)) qtyBays = qtyDriveCages * 8;
    else if (/edsff/i.test(desc)) qtyBays = qtyDriveCages * 12;

    let qtyPciSlots = 3;
    if (/secondary riser/i.test(desc)) qtyPciSlots += 3;
    if (/tertiary riser/i.test(desc)) qtyPciSlots += 2;

    let controllers = 'DA';
    const cntrlMatch = desc.match(/\b(MR\d+i-[op]|SR\d+i-[op])\b/i);
    if (cntrlMatch) controllers = cntrlMatch[1].toUpperCase();

    smartChassisCombinations.push({
      patternId,
      description: desc,
      price,
      qtyDriveCages,
      qtyBays,
      qtyPciSlots,
      controllers,
      source: 'HPE OCA Top Selling Smart Chassis Combinations'
    });
  }
}

function _applyInheritedEntryMetadata(entry, parentEntry) {
  entry.parentCategory = parentEntry.parentCategory;
  entry.subCategory    = parentEntry.subCategory;
  entry.constraint     = parentEntry.constraint;
  entry.minQty         = parentEntry.minQty;
  entry.maxQty         = parentEntry.maxQty;
  entry.maxQtySemantics = parentEntry.maxQtySemantics;
}

function _mergeSubtableInheritance(tableEntries) {
  const orderedEntries = [...tableEntries].sort((a, b) => a.tableIndex - b.tableIndex);
  let lastMatchedSubcat = null;
  let mergedSubtableCount = 0;

  for (const entry of orderedEntries) {
    if (entry.subCategory !== '(Sub-table)') {
      lastMatchedSubcat = entry;
    } else if (lastMatchedSubcat) {
      _applyInheritedEntryMetadata(entry, lastMatchedSubcat);
      mergedSubtableCount++;
    }
  }
  console.log(`Merged ${mergedSubtableCount} sub-tables into preceding parent subcategories (DOM index order).`);
  return orderedEntries;
}

function _selfHealUnclassifiedEntries(orderedEntries, profile, diagnostics) {
  for (const entry of orderedEntries) {
    const isFallback = entry.parentCategory === 'Unknown' ||
      entry.subCategory === 'Unknown' ||
      entry.subCategory === '(Sub-table)' ||
      (entry.parentCategory === 'Accessories & Infrastructure' && /^(other options|\(sub-table\)|unknown)$/i.test(entry.subCategory || ''));
    if (!isFallback || !Array.isArray(entry.skus) || entry.skus.length === 0) continue;

    const parentVotes = {};
    for (const sku of entry.skus) {
      const desc = String(sku['Description'] || '');
      const role = classifyComponentRole('', desc, profile);
      let inferredParent = (role && role !== 'Option Component' && ROLE_TO_PARENT_MAP[role]) ? ROLE_TO_PARENT_MAP[role] : null;
      if (!inferredParent) {
        if (/\b(transceiver|sfp\+|qsfp|fc\s+switch|fabric\s+vision|isl\s+kit|optic|gbic)\b/i.test(desc)) inferredParent = 'Networking';
        else if (/\b(lto-\d|tape\s+drive|data\s+cartridge|cleaning\s+cartridge|nvme|ssd|hdd|sff\s+sc|lff\s+lp)\b/i.test(desc)) inferredParent = 'Storage';
        else if (/\b(power\s+supply|hot\s+plug\s+psu|power\s+cord|pdu|heatsink|fan\s+kit)\b/i.test(desc)) inferredParent = 'Power & Cooling';
        else if (/\b(license|e-ltu|ltu|subscription|compute\s+ops|ilo\s+advanced)\b/i.test(desc)) inferredParent = 'Software & Licenses';
      }
      if (inferredParent) {
        parentVotes[inferredParent] = (parentVotes[inferredParent] || 0) + 1;
      }
    }

    const bestParent = Object.entries(parentVotes).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (bestParent) {
      const sampleDesc = entry.skus.map(s => s['Description'] || '').join(' ');
      const healedSubcat = synthesizeSubcategoryName(bestParent, sampleDesc, entry.rules || []);
      entry.parentCategory = bestParent;
      if (healedSubcat && healedSubcat !== '(Sub-table)') entry.subCategory = healedSubcat;
      entry.skus.forEach(s => {
        s.parentCategory = entry.parentCategory;
        s.subCategory = entry.subCategory;
      });
      diagnostics?.recordSelfHealedTable?.(entry.tableIndex, entry.parentCategory, entry.subCategory, entry.skus.length);
    }
  }
  return orderedEntries;
}

function _partitionAndDeduplicateServices(orderedEntries) {
  const { hardwareEntries, servicesEntries } = partitionCatalogEntries(orderedEntries);

  const seenHwSkus = new Set();
  hardwareEntries.forEach(e => {
    (e.skus || []).forEach(s => {
      const pn = s['Product #'] || s.sku;
      if (pn) seenHwSkus.add(pn);
    });
  });

  const seenServiceSkus = new Set();
  const cleanServicesEntries = servicesEntries.map(e => ({
    ...e,
    skus: (e.skus || []).filter(s => {
      const pn = s['Product #'] || s.sku;
      if (!pn || seenHwSkus.has(pn) || seenServiceSkus.has(pn)) return false;
      seenServiceSkus.add(pn);
      return true;
    })
  })).filter(e => e.skus.length > 0);

  return { hardwareEntries, cleanServicesEntries };
}

function _recordTableSkusInCatalog(skus, parentCat, subCat, finalConstraint, tableRules, processedPNs, allSKUMap) {
  const hasValidPrice = (r) => {
    const p = String(r['Unit Price (USD)'] || r['Price (USD)'] || r['Price'] || '').replace(/[$,\s]/g, '');
    return !isNaN(parseFloat(p)) && parseFloat(p) > 0;
  };

  for (const sku of skus) {
    const pn = sku['Product #'];
    if (!pn) continue;

    const newSKURow = {
      parentCategory: parentCat,
      subCategory:    subCat,
      constraint:     finalConstraint,
      rules:          tableRules.join(' | '),
      ...sku
    };
    if (parentCat === 'Chassis') newSKURow['Option Type'] = 'CTO';

    if (!processedPNs.has(pn)) {
      processedPNs.add(pn);
      allSKUMap.set(pn, newSKURow);
    } else {
      const existing = allSKUMap.get(pn);
      if (existing && !hasValidPrice(existing) && hasValidPrice(newSKURow)) {
        allSKUMap.set(pn, newSKURow);
      }
    }
  }
}

function synthesizeCatalogEntries(tables, fullText, subcatList, historyPriceMap, diagnostics, profile, IS_VERBOSE) {
  console.log('\n--- Step 3: Extracting Tables & SKUs ---');

  const sourceTables = [];
  for (let rawIdx = 0; rawIdx < (tables || []).length; rawIdx++) {
    const t = tables[rawIdx];
    if (_isStructuralWrapperTable(t, rawIdx, tables)) {
      diagnostics?.recordSkippedTable?.(rawIdx, 'Structural outer wrapper table filtered');
      diagnostics?.recordRejectedRow?.({ tableIndex: rawIdx, reason: 'STRUCTURAL_WRAPPER_TABLE', rowCount: t?.rows?.length || 0, sampleCells: (t?.rows?.[0] || []).slice(0, 8) });
      continue;
    }
    sourceTables.push(t);
  }

  const expandedTables = expandTableSections(sourceTables);
  const allSKUMap    = new Map();
  const processedPNs = new Set();
  const tableEntries = [];
  const smartChassisCombinations = [];
  let skippedTables  = 0;

  for (let ti = 0; ti < expandedTables.length; ti++) {
    const table = expandedTables[ti];
    if (_isSkippedReportTable(table, ti, diagnostics)) {
      skippedTables++;
      continue;
    }

    const headerInfo = _detectTableHeadersAndRules(table, ti, diagnostics);
    if (!headerInfo) {
      skippedTables++;
      continue;
    }

    const skus = _extractSkusFromTable(table, headerInfo, historyPriceMap, allSKUMap);
    if (skus.length === 0) {
      _extractSmartChassisCombinations(table, headerInfo.headerIdx, smartChassisCombinations);
      skippedTables++;
      continue;
    }

    const { matchedSubcat, textPos } = matchSubcategoryForTable(skus, headerInfo.headers, fullText, subcatList, ti, tables.length);
    const { parentCat, subCat, finalConstraint, finalMinQty, finalMaxQty, finalMaxQtySemantics, detectedRole, matchedVia } =
      resolveTableTaxonomyAndRole(matchedSubcat, textPos, table, headerInfo.tableRules, profile, skus);

    if (parentCat === 'Chassis' || subCat.toLowerCase().includes('variants') || skus.some(s => (s['Description'] || '').toLowerCase().includes('configure-to-order'))) {
      skus.forEach(sku => { sku['Option Type'] = 'CTO'; });
    }

    tableEntries.push({
      tableIndex:      ti,
      parentCategory:  parentCat,
      subCategory:     subCat,
      constraint:      finalConstraint,
      minQty:          finalMinQty,
      maxQty:          finalMaxQty,
      maxQtySemantics: finalMaxQtySemantics,
      rules:           headerInfo.tableRules,
      headers:         headerInfo.headers,
      skuCount:        skus.length,
      skus
    });

    diagnostics.recordTableDecision({
      tableIndex: ti,
      subCategory: subCat,
      parentCategory: parentCat,
      matchedVia,
      detectedRole,
      constraint: finalConstraint,
      minQty: finalMinQty,
      maxQty: finalMaxQty,
      maxQtySemantics: finalMaxQtySemantics,
      skuCount: skus.length,
      rules: headerInfo.tableRules
    });

    _recordTableSkusInCatalog(skus, parentCat, subCat, finalConstraint, headerInfo.tableRules, processedPNs, allSKUMap);

    if (IS_VERBOSE) {
      console.log(`  Table #${ti}: ${skus.length} SKUs → Subcat: "${matchedSubcat ? matchedSubcat.name : '(Sub-table)'}" (${parentCat})`);
    }
  }

  console.log(`Processed ${tableEntries.length} valid product tables (${skippedTables} non-SKU/wrapper tables skipped).`);
  console.log(`Extracted ${processedPNs.size} unique SKUs.`);

  console.log('\n--- Step 4: Merging Sub-Tables & Subcategory Inheritance ---');
  const orderedEntries = _selfHealUnclassifiedEntries(_mergeSubtableInheritance(tableEntries), profile, diagnostics);
  const { hardwareEntries, cleanServicesEntries } = _partitionAndDeduplicateServices(orderedEntries);

  return {
    hardwareEntries,
    cleanServicesEntries,
    tableEntries,
    allSKUMap,
    processedPNs,
    smartChassisCombinations
  };
}

function extractCommercialBreakdown(tables) {
  for (const table of tables) {
    const rows = table.rows || [];
    if (rows.length === 0) continue;
    const flatText = rows.slice(0, 3).map(r => (r || []).join(' ')).join(' ');
    if (/Hardware.*Support.*Services/i.test(flatText) || (/Hardware/i.test(flatText) && /Total/i.test(flatText))) {
      const breakdown = {};
      rows.forEach(row => {
        for (let i = 0; i < row.length; i += 2) {
          const key = String(row[i] || '').trim().toLowerCase();
          const valStr = String(row[i + 1] || '').trim();
          const num = parseFloat(valStr.replace(/[^0-9.-]+/g, '')) || 0;
          if (key.includes('hardware')) breakdown.hardware = num;
          else if (key.includes('support')) breakdown.support = num;
          else if (key.includes('service')) breakdown.services = num;
          else if (key.includes('software')) breakdown.software = num;
          else if (key.includes('total')) breakdown.total = num;
        }
      });
      if (Object.keys(breakdown).length > 0) return breakdown;
    }
  }
  return null;
}

function extractDeliveryAndSupport(tables) {
  for (const table of tables) {
    const rows = table.rows || [];
    if (rows.length === 0) continue;
    const iconCell = rows.flat().find(c => /Icon ID:\s*([A-Za-z0-9_-]+)/i.test(String(c || '')));
    if (!iconCell) continue;

    const text = String(iconCell);
    const iconIdMatch = text.match(/Icon ID:\s*([A-Za-z0-9_-]+?)(?=EDT:|\s|$)/i);
    const edtMatch = text.match(/EDT:\s*([0-9\s\-+]+(?:days|weeks)?)/i);
    const configNameMatch = text.match(/Icon\s*#\d+\s*-\s*([^\n\r]+)/i);

    const delivery = {
      iconId: iconIdMatch ? iconIdMatch[1].trim() : '',
      edt: edtMatch ? edtMatch[1].trim() : '',
      configName: configNameMatch ? configNameMatch[1].trim() : '',
      attachedServices: []
    };

    const headers = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
    const reactiveIdx = headers.findIndex(h => h.includes('reactive support'));
    const installIdx = headers.findIndex(h => h.includes('install'));
    const specificIdx = headers.findIndex(h => h.includes('device specific'));

    for (let ri = 1; ri < rows.length; ri++) {
      const row = rows[ri] || [];
      const firstCell = String(row[0] || '').trim();
      if (firstCell && !firstCell.includes('Icon ID:')) {
        delivery.attachedServices.push({
          deviceTarget: firstCell,
          reactiveSupport: reactiveIdx >= 0 ? String(row[reactiveIdx] || '').trim() : '',
          installation: installIdx >= 0 ? String(row[installIdx] || '').trim() : '',
          deviceSpecific: specificIdx >= 0 ? String(row[specificIdx] || '').trim() : ''
        });
      }
    }
    return delivery;
  }
  return null;
}

function buildHierarchyColMap(headerRow) {
  const colMap = {};
  headerRow.forEach((h, ci) => {
    const norm = String(h || '').trim().toLowerCase();
    if (norm.includes('hierarchy')) colMap.hierarchy = ci;
    else if (norm === 'qty' || norm.includes('quantity')) colMap.qty = ci;
    else if (norm.includes('product #') || norm.includes('product number')) colMap.sku = ci;
    else if (norm.includes('description')) colMap.description = ci;
    else if (norm.includes('config name')) colMap.configName = ci;
    else if (norm.startsWith('start')) colMap.startDate = ci;
    else if (norm.startsWith('disc')) colMap.discDate = ci;
    else if (norm.includes('unit price') || norm.includes('unit reseller')) colMap.unitPrice = ci;
    else if (norm.includes('ext. price') || norm.includes('ext. reseller')) colMap.extPrice = ci;
  });
  return colMap;
}

function parseHierarchyRow(row, colMap) {
  const getCell = (idx, def = '') => idx !== undefined ? String(row[idx] || def).trim() : def;
  const rawSku = getCell(colMap.sku);
  if (!rawSku) return null;

  const skuParts = rawSku.split(/\s+/);
  const qtyStr = getCell(colMap.qty, '1');
  const unitPriceStr = getCell(colMap.unitPrice, '0').replace(/[^0-9.-]+/g, '');
  const extPriceStr = getCell(colMap.extPrice, '0').replace(/[^0-9.-]+/g, '');

  return {
    hierarchyLevel: getCell(colMap.hierarchy),
    sku: skuParts[0],
    optionCode: skuParts.slice(1).join(' ') || '',
    quantity: parseInt(qtyStr, 10) || 1,
    description: getCell(colMap.description),
    configName: getCell(colMap.configName),
    unitPrice: parseFloat(unitPriceStr) || 0,
    extPrice: parseFloat(extPriceStr) || 0,
    startDate: getCell(colMap.startDate),
    discDate: getCell(colMap.discDate)
  };
}

function extractBaselineHierarchy(tables) {
  for (const table of tables) {
    const rows = table.rows || [];
    if (rows.length <= 1) continue;
    const headerRow = rows[0] || [];
    const isHierarchyTable = headerRow.some(c => /hierarchy/i.test(String(c || ''))) &&
                             headerRow.some(c => /product\s*#|product\s*number/i.test(String(c || '')));
    if (!isHierarchyTable) continue;

    const colMap = buildHierarchyColMap(headerRow);
    if (colMap.sku === undefined) continue;

    const hierarchy = [];
    for (let ri = 1; ri < rows.length; ri++) {
      const parsed = parseHierarchyRow(rows[ri] || [], colMap);
      if (parsed) hierarchy.push(parsed);
    }
    if (hierarchy.length > 0) return hierarchy;
  }
  return [];
}

function extractSolutionManifest(tables) {
  if (!Array.isArray(tables) || tables.length === 0) return null;
  const commercialBreakdown = extractCommercialBreakdown(tables);
  const deliveryAndSupport = extractDeliveryAndSupport(tables);
  const baselineHierarchy = extractBaselineHierarchy(tables);

  if (!commercialBreakdown && !deliveryAndSupport && baselineHierarchy.length === 0) {
    return null;
  }
  return {
    commercialBreakdown,
    deliveryAndSupport,
    baselineHierarchy
  };
}

module.exports = {
  expandTableSections,
  normalizeHeaderName,
  parseSingleTableRow,
  matchSubcategoryForTable,
  resolveTableTaxonomyAndRole,
  synthesizeCatalogEntries,
  extractSolutionManifest,
  classifySampleCellHeader,
  synthesizeHeaderFromSampleRow,
  _isInvalidHeaderCandidateRow,
  _detectTableHeadersAndRules,
  _isStructuralWrapperTable
};
