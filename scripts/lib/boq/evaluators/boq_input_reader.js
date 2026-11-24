'use strict';
/**
 * scripts/lib/boq/evaluators/boq_input_reader.js — BOQ Workbook/Text/JSON Input Parsing & Consolidation
 */

const fs = require('fs');
const xlsx = require('xlsx-js-style');
const { parseSkuLines, isNonBomSheet, isBomSheet } = require('../boq_parser.js');
const { extractWorkbookCoverNotes } = require('../requirements/requirement_records.js');

function emitProgress(step, total, label, status = 'in_progress', detail = '') {
  if (process.send) {
    process.send({ type: 'PROGRESS', step, total, label, status, detail });
  }
}

function _selectWorkbookSheetNames(workbook, targetSheet) {
  if (targetSheet) {
    if (workbook.SheetNames.includes(targetSheet)) return [targetSheet];
    throw new Error(`Requested sheet "${targetSheet}" not found in workbook.`);
  }
  const preferredSheet = workbook.SheetNames.find(name => isBomSheet(name));
  if (preferredSheet) return [preferredSheet];
  const candidateSheets = workbook.SheetNames.filter(name => !isNonBomSheet(name));
  return candidateSheets.length > 0 ? [candidateSheets[0]] : [workbook.SheetNames[0]];
}

function _readWorkbookWithCoverNotes(targetPath, targetSheet) {
  const lines = [];
  const coverNoteRecords = [];
  const workbook = xlsx.readFile(targetPath);
  const sheetNames = _selectWorkbookSheetNames(workbook, targetSheet);
  sheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headerRow = rows.findIndex(row => row.some(cell => /^(product\s*#|part\s*(?:no\.?|number|#)|sku|skus|option\s*id|item\s*#)$/i.test(String(cell).trim())) && row.some(cell => /^(qty|quantity|product\s*qty)$/i.test(String(cell).trim())));
    if (headerRow > 0) coverNoteRecords.push(...extractWorkbookCoverNotes(rows, sheetName, headerRow, targetPath));
    const csvText = xlsx.utils.sheet_to_csv(headerRow >= 0 ? xlsx.utils.aoa_to_sheet(rows.slice(headerRow)) : sheet);
    lines.push(...csvText.split(/\r?\n/));
  });
  return { lines, coverNoteRecords };
}

function _readBoqLinesFromArray(rawInput) {
  return rawInput.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const sku = item.sku || item.partNumber || item.pn || item['Product #'] || item['Part No'] || '';
      const qty = item.quantity ?? item.qty ?? 1;
      const desc = item.description ?? item.desc ?? '';
      return `${sku}\t${qty}\t${desc}`;
    }
    return String(item);
  });
}

function _readBoqLinesFromTextOrFile(targetPath, rawInput) {
  if (targetPath && fs.existsSync(targetPath)) return fs.readFileSync(targetPath, 'utf8').split(/\r?\n/);
  return String(rawInput || '').split(/\r?\n/);
}

function readBoqLines(rawInput, filePath = '', targetSheet = null) {
  const targetPath = (filePath && typeof filePath === 'string')
    ? filePath
    : (typeof rawInput === 'string' && fs.existsSync(rawInput) ? rawInput : '');

  let lines;
  if (targetPath && /\.xlsx?$/i.test(targetPath) && fs.existsSync(targetPath)) {
    lines = _readWorkbookWithCoverNotes(targetPath, targetSheet).lines;
  } else if (Array.isArray(rawInput)) {
    lines = _readBoqLinesFromArray(rawInput);
  } else {
    lines = _readBoqLinesFromTextOrFile(targetPath, rawInput);
  }
  return lines.filter(l => l.trim().length > 0);
}

function _normalizeStructuredBoqItem(item) {
  return {
    ...item,
    sku: item.sku || item.partNumber || item.pn || item['Product #'] || item['Part No'],
    ...(item['Lifecycle Status'] !== undefined ? { lifecycleStatus: item.lifecycleStatus ?? item['Lifecycle Status'] } : {}),
    quantity: item.quantity ?? item.qty ?? 1
  };
}

function _firstNonEmpty(values, fallback = null) {
  for (const v of values) if (v !== undefined && v !== null) return v;
  return fallback;
}

function _buildStructuredBoqResult(parsed) {
  const jsonItems = _firstNonEmpty([
    Array.isArray(parsed) ? parsed : null,
    Array.isArray(parsed?.items) ? parsed.items : null,
    Array.isArray(parsed?.candidateReference?.items) ? parsed.candidateReference.items : null
  ]);
  if (!Array.isArray(jsonItems) || jsonItems.length === 0) return null;
  const ref = parsed?.candidateReference || null;
  const rawMult = _firstNonEmpty([ref?.serverCount, ref?.nodeCount, parsed?.serverCount, parsed?.nodeCount], 1);
  return {
    items: jsonItems.map(_normalizeStructuredBoqItem),
    rawLines: [],
    coverNoteRecords: parsed?.coverNoteRecords || [],
    unresolvedRequirements: [],
    clusters: [],
    multiplier: Number(rawMult) || 1,
    candidateReference: ref,
    chassisDir: _firstNonEmpty([ref?.chassisDir, parsed?.chassisDir]),
    parentRunId: _firstNonEmpty([ref?.parentRunId, parsed?.parentRunId]),
    candidateDigest: _firstNonEmpty([ref?.digest, parsed?.candidateDigest])
  };
}

function _tryParseStructuredBoqJson(rawInput, filePath) {
  let content = null;
  if (typeof rawInput === 'string' && /\.json$/i.test(filePath || '')) content = rawInput;
  else if (typeof rawInput === 'string' && /\.json$/i.test(rawInput) && fs.existsSync(rawInput)) content = fs.readFileSync(rawInput, 'utf8');
  if (!content) return null;
  try {
    return _buildStructuredBoqResult(JSON.parse(content));
  } catch (_) {
    return null;
  }
}

function _resolveBoqInputPath(rawInput, filePath) {
  if (filePath && typeof filePath === 'string') return filePath;
  if (typeof rawInput === 'string' && !rawInput.includes('\n') && rawInput.length < 512 && fs.existsSync(rawInput)) return rawInput;
  return '';
}

function parseAndConsolidateBOQDetailed(rawInput, filePath = '', targetSheet = null) {
  if (Array.isArray(rawInput) && rawInput.every(item => item && typeof item === 'object')) {
    return { items: rawInput.map(_normalizeStructuredBoqItem), rawLines: [], coverNoteRecords: [], unresolvedRequirements: [], clusters: [], multiplier: 1 };
  }
  const structuredJson = _tryParseStructuredBoqJson(rawInput, filePath);
  if (structuredJson) return structuredJson;
  const targetPath = _resolveBoqInputPath(rawInput, filePath);
  if (targetPath && /\.xlsx?$/i.test(targetPath) && fs.existsSync(targetPath)) {
    const { lines, coverNoteRecords } = _readWorkbookWithCoverNotes(targetPath, targetSheet);
    const rawLines = lines.filter(l => l.trim().length > 0);
    return { ...parseSkuLines(rawLines), rawLines, coverNoteRecords };
  }
  const rawLines = readBoqLines(rawInput, filePath, targetSheet);
  return { ...parseSkuLines(rawLines), rawLines, coverNoteRecords: [] };
}

function parseAndConsolidateBOQ(rawInput, filePath = '', targetSheet = null) {
  return parseAndConsolidateBOQDetailed(rawInput, filePath, targetSheet).items;
}

module.exports = {
  emitProgress,
  _readWorkbookWithCoverNotes,
  readBoqLines,
  _resolveBoqInputPath,
  parseAndConsolidateBOQDetailed,
  parseAndConsolidateBOQ
};
