'use strict';
/**
 * scripts/lib/catalog/builder/table_header_classifier.js — Table Header Detection,
 * Wrapper Filtering & Taxonomy Classification Helpers
 */

const { cleanBaseSKU, isValidHpeSKU } = require('../sku.js');
const { synthesizeSubcategoryName, classifyComponentRole } = require('../product_meta.js');
const {
  SUBCAT_KEYWORD_PARENT_MAP,
  ROLE_TO_PARENT_MAP,
  CATEGORY_DEFAULT_CONSTRAINTS,
  getParentCategory,
  parseConstraintMinMax
} = require('./taxonomy_and_intake.js');

const DIRECT_HEADER_MAP = Object.freeze({
  'cost': 'Cost (USD)',
  'cost (usd)': 'Cost (USD)',
  'unit cost': 'Cost (USD)',
  'purchase cost': 'Cost (USD)',
  'list price': 'Unit Price (USD)',
  'list price (usd)': 'Unit Price (USD)',
  'price': 'Unit Price (USD)',
  'price (usd)': 'Unit Price (USD)',
  'unit price': 'Unit Price (USD)',
  'unit price (usd)': 'Unit Price (USD)',
  'product description': 'Description',
  'qty': 'Current Qty',
  'quantity': 'Current Qty',
  'interface': 'Interface',
  'form factor': 'Form Factor'
});

const REGEX_HEADER_RULES = [
  [/^start(?: date)?$/, 'Start Date'],
  [/^(?:discontinued|obsolete|end)(?: date)?$/, 'Discontinued Date'],
  [/^(?:availability|available|supply status)$/, 'Availability'],
  [/^(?:(?:estimated|est\.?)\s*(?:availability\s*)?)?lead\s*time|estimated\s*delivery|delivery\s*estimate|edt$/i, 'Lead Time'],
  [/^(?:clic\s*status|validation\s*status)$/i, 'CLIC Status'],
  [/^(?:lifecycle\s*status|sku\s*status)$/i, 'Lifecycle Status'],
  [/^(?:allocation\s*status|supply\s*status|market\s*availability)$/i, 'Allocation Status'],
  [/^(?:hpe\s*)?recommended$/, 'HPE Recommended'],
  [/^price\s*delta(?:\s*\(usd\))?$/i, 'Price Delta (USD)'],
  [/^ext(?:ended)?\s*price(?:\s*\(usd\))?$/i, 'Extended Price (USD)'],
  [/^price\s*per\s*gb(?:\s*\(usd\))?$/i, 'Price per GB (USD)'],
  [/^(?:qty\s*)?drive\s*cages?$/, 'Qty Drive Cages'],
  [/^(?:qty\s*)?bays?$/, 'Qty Bays'],
  [/^(?:qty\s*)?pci(?:e)?\s*slots?$/, 'Qty PCI Slots'],
  [/^(?:cntrls|controllers?)(?::\s*da)?$/, 'Controllers'],
  [/^workload(?:\s*type)?|endurance$/, 'Workload Type']
];

function expandTableSections(sourceTables) {
  const expandedTables = [];
  for (let ti = 0; ti < sourceTables.length; ti++) {
    const table = sourceTables[ti];
    if (!table.rows || table.rows.length === 0) continue;

    const internalSections = [];
    let currentSec = null;

    for (let ri = 0; ri < table.rows.length; ri++) {
      const row = table.rows[ri];
      const rowStr = row.join(' ');
      const constraintMatch = rowStr.match(/([A-Za-z0-9\s\-_/]+)\s*\(((?:min\s+\d+\s*,\s*)?(?:max\s+\d+|required|no max|optional)(?:\s*,\s*min\s+\d+)?|min\s+\d+)\)/i);

      if (constraintMatch && constraintMatch[1].trim().length >= 3 && !constraintMatch[1].includes('Product #')) {
        if (currentSec && currentSec.rows.length > 0) internalSections.push(currentSec);
        currentSec = {
          tableIndex: expandedTables.length + internalSections.length,
          label: constraintMatch[1].trim(),
          constraintText: constraintMatch[2],
          rows: []
        };
      } else if (currentSec) {
        currentSec.rows.push(row);
      }
    }
    if (currentSec && currentSec.rows.length > 0) internalSections.push(currentSec);

    if (internalSections.length > 1) {
      expandedTables.push(...internalSections);
    } else {
      expandedTables.push(table);
    }
  }
  return expandedTables;
}

function normalizeHeaderName(header) {
  if (!header) return '';
  const nh = String(header).trim().toLowerCase();
  if (DIRECT_HEADER_MAP[nh]) return DIRECT_HEADER_MAP[nh];
  for (const [pattern, normalized] of REGEX_HEADER_RULES) {
    if (pattern.test(nh)) return normalized;
  }
  return header;
}

function matchSubcategoryForTable(skus, headers, fullText, subcatList, _ti, _totalTables) {
  let matchedSubcat = null;
  let textPos = -1;

  for (const s of skus) {
    const pn = s['Product #'];
    if (pn) {
      const pos = fullText.indexOf(pn);
      if (pos > -1) { textPos = pos; break; }
    }
  }

  if (textPos > -1) {
    for (let i = 0; i < subcatList.length; i++) {
      if (textPos >= subcatList[i].textIndex) {
        if (i === subcatList.length - 1 || textPos < subcatList[i + 1].textIndex) {
          matchedSubcat = subcatList[i];
          break;
        }
      }
    }
  }

  if (!matchedSubcat && subcatList.length > 0) {
    const headerStr = (headers || []).join(' ').toLowerCase();
    const sampleDescs = skus.slice(0, 5).map(s => (s['Description'] || '').toLowerCase()).join(' ');
    const searchText = headerStr + ' ' + sampleDescs;

    let bestScore = 0;
    let bestSubcat = null;
    for (const sc of subcatList) {
      const words = sc.name.toLowerCase().split(/[\s/\-,()]+/).filter(w => w.length >= 3);
      if (words.length === 0) continue;
      let score = 0;
      for (const w of words) {
        if (searchText.includes(w)) score++;
      }
      if (searchText.includes(sc.name.toLowerCase())) score += words.length;
      if (score > bestScore) { bestScore = score; bestSubcat = sc; }
    }
    if (bestSubcat && (bestScore >= 2 || bestScore >= Math.ceil(bestSubcat.name.split(/[\s/\-,()]+/).filter(w => w.length >= 3).length * 0.5))) {
      matchedSubcat = bestSubcat;
    }
  }

  return { matchedSubcat, textPos };
}

function resolveTableConstraintBounds(matchedSubcat, parentCat, table, subCat, tableRules) {
  const defaultConstraintObj = CATEGORY_DEFAULT_CONSTRAINTS[parentCat.toLowerCase()] || {};
  let finalConstraint = matchedSubcat?.constraint || defaultConstraintObj.constraint || '';
  const parsedFinal = finalConstraint ? parseConstraintMinMax(finalConstraint) : null;
  let finalMaxQty = matchedSubcat?.maxQty !== undefined ? matchedSubcat.maxQty : (parsedFinal?.maxQty ?? defaultConstraintObj.maxQty ?? null);
  let finalMaxQtySemantics = matchedSubcat?.maxQtySemantics || parsedFinal?.maxQtySemantics || defaultConstraintObj.maxQtySemantics || 'UNBOUNDED';
  let finalMinQty = matchedSubcat?.minQty !== undefined ? matchedSubcat.minQty : (parsedFinal?.minQty ?? defaultConstraintObj.minQty ?? 0);

  if (table.constraintText) {
    finalConstraint = table.constraintText;
    const parsedBounds = parseConstraintMinMax(finalConstraint);
    finalMinQty = parsedBounds.minQty;
    finalMaxQty = parsedBounds.maxQty;
    finalMaxQtySemantics = parsedBounds.maxQtySemantics;
  }

  if (tableRules.length === 0 && finalConstraint) {
    tableRules.push(`Selection constraint for ${subCat}: ${finalConstraint}`);
  }
  return { finalConstraint, finalMinQty, finalMaxQty, finalMaxQtySemantics };
}

function _resolveTaxonomyClassification({ matchedSubcat, parentCat, subCat, table, tableRules, profile, sampleDesc }) {
  const detectedRole = classifyComponentRole(subCat, sampleDesc, profile);
  const subCatLower = (subCat || '').toLowerCase();
  const sampleText = String(sampleDesc || '');

  if (/\b(?:lto[-\s]?[3-9]|ultrium)\b/i.test(sampleText) && !/\b(?:software|license|ltu|support|service|cable|cord)\b/i.test(sampleText)) {
    const isMedia = /\b(?:cartridge|worm|cleaning|bar\s*code|media)\b/i.test(sampleText) || subCatLower.includes('storage media');
    return {
      parentCat: isMedia ? 'Storage Media' : 'Tape Drives',
      subCat: isMedia ? (subCatLower.includes('media') ? subCat : 'Storage Media') : 'LTO Tape Drives',
      detectedRole: isMedia ? 'Storage Media' : 'Tape Drive',
      matchedParent: isMedia ? 'Storage Media' : 'Tape Drives',
      matchedVia: 'tape_domain_guard'
    };
  }

  const matchedMapEntry = SUBCAT_KEYWORD_PARENT_MAP.find(m => m.keywords.some(k => subCatLower.includes(k)));
  const matchedParent = matchedMapEntry ? matchedMapEntry.parent : null;

  if (matchedParent && matchedParent !== 'Accessories & Infrastructure') {
    return { parentCat: matchedParent, subCat, detectedRole, matchedParent, matchedVia: 'direct_taxonomy_keyword' };
  }
  if (detectedRole && detectedRole !== 'Option Component' && ROLE_TO_PARENT_MAP[detectedRole]) {
    const resolvedParent = ROLE_TO_PARENT_MAP[detectedRole];
    let resolvedSub = subCat;
    if (!table.label || subCat === '(Sub-table)' || !subCatLower.includes(resolvedParent.toLowerCase().split(' ')[0])) {
      const synthesized = synthesizeSubcategoryName(resolvedParent, sampleDesc, tableRules);
      if (synthesized && !synthesized.includes('Options')) resolvedSub = synthesized;
    }
    return { parentCat: resolvedParent, subCat: resolvedSub, detectedRole, matchedParent, matchedVia: 'role_classifier' };
  }
  if (matchedParent) {
    return { parentCat: matchedParent, subCat, detectedRole, matchedParent, matchedVia: 'direct_taxonomy_keyword' };
  }
  if (!parentCat || parentCat === 'Unknown') {
    return { parentCat: 'Accessories & Infrastructure', subCat, detectedRole, matchedParent, matchedVia: 'fallback_accessories' };
  }
  return {
    parentCat,
    subCat,
    detectedRole,
    matchedParent,
    matchedVia: matchedSubcat ? 'portal_text_position' : 'portal_parent'
  };
}

function resolveTableTaxonomyAndRole(matchedSubcat, textPos, table, tableRules, profile, skus) {
  const parentCat = table.subTab || (matchedSubcat ? matchedSubcat.parentCategory : (textPos > -1 ? getParentCategory(textPos, []) : 'Unknown'));
  let subCat    = table.label || (matchedSubcat ? matchedSubcat.name : '(Sub-table)');
  const rawSubCategory = subCat;
  const sampleDesc = skus.map(s => s['Description'] || '').join(' ');
  if (!subCat || subCat === '(Sub-table)') {
    subCat = synthesizeSubcategoryName(parentCat, sampleDesc, tableRules);
  }
  const classified = _resolveTaxonomyClassification({ matchedSubcat, parentCat, subCat, table, tableRules, profile, sampleDesc });
  const bounds = resolveTableConstraintBounds(matchedSubcat, classified.parentCat, table, classified.subCat, tableRules);
  for (const s of skus) {
    if (!s['Component Role']) s['Component Role'] = classified.detectedRole;
    if (!s.rawSubCategory && rawSubCategory && rawSubCategory !== '(Sub-table)') s.rawSubCategory = rawSubCategory;
  }
  return { ...classified, ...bounds };
}

function _isSkippedReportTable(table, ti, diagnostics) {
  if (!table.rows || table.rows.length < 2) {
    diagnostics.recordSkippedTable(ti, 'Table rows < 2 or empty');
    return true;
  }
  const firstRowsText = (table.rows.slice(0, 3).map(r => r.join(' ')).join(' ')).toLowerCase();
  if (firstRowsText.includes('node level quantity') || firstRowsText.includes('support install action')) {
    diagnostics.recordSkippedTable(ti, 'BOM summary report table header');
    return true;
  }
  const allHeaderCells = (table.rows[0] || []).map(c => String(c || '').toLowerCase().trim());
  const isHierarchyBOMTable = allHeaderCells.includes('hierarchy') ||
                              (allHeaderCells.includes('config name') && allHeaderCells.includes('unit reseller price (usd)')) ||
                              (allHeaderCells.includes('qty') && allHeaderCells.includes('product #') && allHeaderCells.includes('config name'));
  if (isHierarchyBOMTable) {
    diagnostics.recordSkippedTable(ti, 'Solution hierarchy BOM summary table');
    return true;
  }
  return false;
}

function classifySampleCellHeader(val, ci, state, headers) {
  if (!state.foundSku && isValidHpeSKU(cleanBaseSKU(val))) {
    state.foundSku = true;
    return 'Product #';
  }
  if (state.foundSku && !state.foundDesc && val.length > 8 && !/^\d+$/.test(val) && !/^\$?[\d,]+(?:\.\d{2})?$/.test(val)) {
    state.foundDesc = true;
    return 'Description';
  }
  if (/^\d{1,4}$/.test(val) && headers.includes('Description') && !headers.includes('Quantity')) {
    return 'Quantity';
  }
  if (/^[+-]\$?[\d,]+(?:\.\d{2})?$/.test(val)) {
    return 'Price Delta (USD)';
  }
  if (/^\$?[\d,]+(?:\.\d{2})?$/.test(val) || val === 'NA' || val === 'N/A') {
    if (!state.foundPrice) {
      state.foundPrice = true;
      return 'Price (USD)';
    }
    if (!headers.includes('Extended Price (USD)')) return 'Extended Price (USD)';
    if (!headers.includes('Price per GB (USD)')) return 'Price per GB (USD)';
    return `Column_${ci}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    state.dateCount++;
    if (state.dateCount === 1) return 'Start Date';
    if (state.dateCount === 2) return 'Discontinued Date';
    return `Date_${state.dateCount}`;
  }
  if (/^(?:yes|no|selected)$/i.test(val)) return 'HPE Recommended';
  return (ci === 0 && val === '') ? '' : `Column_${ci}`;
}

function synthesizeHeaderFromSampleRow(sampleRow) {
  const defaultHeaders = ['Product #', 'Description', 'Quantity', 'Price (USD)', 'Price Delta (USD)', 'Extended Price (USD)', 'HPE Recommended', 'Start', 'Discontinued'];
  if (!Array.isArray(sampleRow) || sampleRow.length === 0) {
    return defaultHeaders;
  }
  const headers = [];
  const state = { foundSku: false, foundDesc: false, foundPrice: false, dateCount: 0 };

  for (let ci = 0; ci < sampleRow.length; ci++) {
    const val = String(sampleRow[ci] || '').trim();
    headers.push(classifySampleCellHeader(val, ci, state, headers));
  }
  return headers.length >= 4 ? headers : defaultHeaders;
}

function _isInvalidHeaderCandidateRow(row) {
  if (!Array.isArray(row) || row.length > 20) return true;
  const cells = row.map(c => String(c || '').trim()).filter(Boolean);
  if (cells.length === 0) return true;
  const hasExplicitProductCol = cells.some(c => /^(?:product\s*#(?:\s*\/\s*option)?|part\s*number|sku)$/i.test(c));
  if (hasExplicitProductCol) return false;
  return cells.some(c =>
    /^\$[\d,]+(?:\.\d{2})?$/.test(c)
    || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(c)
    || isValidHpeSKU(cleanBaseSKU(c))
    || c.length > 80
  );
}

function _detectTableHeadersAndRules(table, ti, diagnostics) {
  let headerIdx  = -1;
  let headers    = [];
  const tableRules = [];
  let tableAvailability = '';

  for (let ri = 0; ri < Math.min(4, table.rows.length); ri++) {
    const row = table.rows[ri];
    if (_isInvalidHeaderCandidateRow(row)) continue;
    const hasProductHeader = row.some(c => c === 'Product #' || c === 'Product # / Option');
    const hasDescHeader    = row.some(c => c === 'Description' || c === 'Product Description');

    if (hasProductHeader || hasDescHeader) {
      headerIdx = ri;
      headers   = row.map(h => h === 'Product Description' ? 'Description' : h);
      break;
    } else {
      const text = row.join(' ').trim();
      if (!tableAvailability && /^(?:available|not available|these products are hidden due to .+constraints)$/i.test(text)) {
        tableAvailability = text;
      }
      if (text && text !== 'Available' && text.length > 5 && text.length < 300) {
        tableRules.push(text);
      }
    }
  }

  if (headerIdx === -1) {
    const skuRow = table.rows.find(r => Array.isArray(r) && r.length <= 20 && r.some(c => isValidHpeSKU(cleanBaseSKU(String(c || '').trim()))));
    if (skuRow) {
      headers = synthesizeHeaderFromSampleRow(skuRow);
      headerIdx = -1;
    } else {
      diagnostics?.recordSkippedTable?.(ti, 'No valid SKU or headers detected');
      diagnostics?.recordRejectedRow?.({ tableIndex: ti, reason: 'NO_VALID_HEADER_OR_SKU', sampleCells: (table.rows[0] || []).slice(0, 8) });
      return null;
    }
  }

  const isPrivateTable = tableRules.some(r => /private\s+product\s+is\s+not\s+valid\s+for\s+current\s+customer\s+account/i.test(r));
  return { headerIdx, headers, tableRules, tableAvailability, isPrivateTable };
}

function _isStructuralWrapperTable(table, ti, allTables) {
  if (!Array.isArray(allTables) || allTables.length <= 1 || !Array.isArray(table?.rows)) return false;
  if (ti === 0 && table.rows.length > 500) return true;
  const sample = table.rows.slice(0, 20);
  const maxWidth = Math.max(0, ...sample.map(r => (Array.isArray(r) ? r.length : 0)));
  if (maxWidth >= 25) return true;
  const maxCellLen = Math.max(0, ...sample.flat().map(c => String(c || '').length));
  return maxWidth >= 15 && maxCellLen > 500;
}

module.exports = {
  DIRECT_HEADER_MAP,
  REGEX_HEADER_RULES,
  expandTableSections,
  normalizeHeaderName,
  matchSubcategoryForTable,
  resolveTableConstraintBounds,
  _resolveTaxonomyClassification,
  resolveTableTaxonomyAndRole,
  _isSkippedReportTable,
  classifySampleCellHeader,
  synthesizeHeaderFromSampleRow,
  _isInvalidHeaderCandidateRow,
  _detectTableHeadersAndRules,
  _isStructuralWrapperTable
};
