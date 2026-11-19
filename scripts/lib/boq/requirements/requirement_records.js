'use strict';

/**
 * scripts/lib/boq/requirements/requirement_records.js
 *
 * Immutable versioned RequirementRecord extractor (schemaVersion: '1.0'):
 * - Deterministic inputRevisionSha256 & stable REQ-<8hex>-<seq> IDs
 * - Full provenance ({ file, sheet, cell, row, col, lineNumber, page, span })
 * - Preserves EVERY raw clause including UNINTERPRETED clauses (never dropped)
 * - Detects contradictory requirements into ambiguities[] and clarificationQuestions[]
 */

const crypto = require('crypto');
const { detectHeaderColumnMap, parseSkuLines } = require('../boq_parser.js');
const {
  HARDNESS_LEVELS,
  COMPARATORS,
  extractBudgetConstraint,
  parseTypedClauseValue
} = require('./typed_values.js');

const SCHEMA_VERSION = '1.0';
const BOM_CONSTRAINT_OVERRIDE_RE = /\b(?:budget|capex|do\s+not\s+substitute|no\s+substitutions?|must\s+keep|exclude|excluding|without\s+installation|no\s+installation|usable|raid\s*-?\s*\d+|spare|shared|deadline|prefer(?:red)?|must\s+(?:be|have|support)|minimum|maximum|at\s+least|at\s+most)\b|[≥≤]|>=|<=/i;
const BOM_FOOTER_RE = /^(?:subtotal|grand\s+total|total\s+estimate|page\s+\d+)/i;

function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

function canonicalStringify(value) {
  return JSON.stringify(value, (_key, entry) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      return Object.fromEntries(Object.keys(entry).sort().map(k => [k, entry[k]]));
    }
    return entry;
  });
}

function toExcelCellRef(rowIndex0, colIndex0) {
  let n = colIndex0 + 1;
  let colStr = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    colStr = String.fromCharCode(65 + rem) + colStr;
    n = Math.floor((n - 1) / 26);
  }
  return `${colStr}${rowIndex0 + 1}`;
}

function extractWorkbookCoverNotes(rows = [], sheetName = 'Sheet1', headerRow = -1, filePath = null) {
  if (!Array.isArray(rows) || headerRow <= 0) return [];
  const notes = [];
  for (let r = 0; r < headerRow; r++) {
    const row = Array.isArray(rows[r]) ? rows[r] : [];
    for (let c = 0; c < row.length; c++) {
      const text = String(row[c] ?? '').trim();
      if (!text) continue;
      notes.push({
        file: filePath || null,
        sheet: sheetName,
        row: r + 1,
        col: c + 1,
        cell: toExcelCellRef(r, c),
        text
      });
    }
  }
  return notes;
}

function _pickDefined(val, fallback = null) {
  return val === undefined ? fallback : val;
}

function _buildGroupedCoverEntry(group, defaultFile) {
  group.sort((a, b) => (a.col || 0) - (b.col || 0));
  const first = group[0];
  const last = group[group.length - 1];
  const joined = group.map(g => String(g.text).trim()).filter(Boolean).join(' ');
  const isSpan = group.length > 1 && Boolean(first.cell) && Boolean(last.cell) && first.cell !== last.cell;
  return {
    text: joined,
    provenance: {
      file: first.file || defaultFile || null,
      sheet: first.sheet || null,
      cell: isSpan ? `${first.cell}:${last.cell}` : (first.cell || null),
      row: _pickDefined(first.row),
      col: _pickDefined(first.col),
      lineNumber: _pickDefined(first.lineNumber),
      page: _pickDefined(first.page)
    }
  };
}

function _groupCoverNoteRows(coverNoteRecords = [], defaultFile = null) {
  const bySheetRow = new Map();
  for (const rec of coverNoteRecords) {
    if (!rec || !String(rec.text || '').trim()) continue;
    const key = `${rec.sheet || ''}::${rec.row ?? ''}`;
    if (!bySheetRow.has(key)) bySheetRow.set(key, []);
    bySheetRow.get(key).push(rec);
  }
  return [...bySheetRow.values()].map(group => _buildGroupedCoverEntry(group, defaultFile));
}

function _detectLineDelimiter(line) {
  if (line.includes('\t')) return '\t';
  if (line.includes(',')) return ',';
  if (line.includes('|')) return '|';
  return null;
}

const EXPLICIT_BOM_OVERRIDE_RE = /\b(?:do\s+not\s+substitute|no\s+substitutions?|must\s+keep|keep\s+exact|exact\s+part|exact\s+sku)\b/i;

function _detectBomLineSkip(line, state) {
  const delimiter = _detectLineDelimiter(line);
  if (delimiter) {
    const headerMap = detectHeaderColumnMap(line, delimiter);
    if (headerMap) {
      state.headerLine = line;
      state.inBomTable = true;
      return true;
    }
  }
  if (state.inBomTable && BOM_FOOTER_RE.test(line)) return true;
  if (state.inBomTable && delimiter) {
    const parsed = parseSkuLines([state.headerLine, line]);
    if (parsed.items.length > 0) {
      const purpose = String(parsed.items[0].purpose || '').trim();
      const hasOverride = EXPLICIT_BOM_OVERRIDE_RE.test(line) || (purpose && BOM_CONSTRAINT_OVERRIDE_RE.test(purpose));
      if (!hasOverride) return true;
    }
  }
  if (!BOM_CONSTRAINT_OVERRIDE_RE.test(line) && !parseTypedClauseValue(line).interpreted) {
    return parseSkuLines([line]).items.length > 0;
  }
  return false;
}

function _makeProvenance(overrides = {}) {
  return {
    file: overrides.file || null,
    sheet: overrides.sheet || null,
    cell: overrides.cell || null,
    row: overrides.row ?? null,
    col: overrides.col ?? null,
    lineNumber: overrides.lineNumber ?? null,
    page: overrides.page ?? null
  };
}

function _normalizeArrayInput(items) {
  return items.map((item, idx) => {
    if (typeof item === 'string') {
      return { text: item, provenance: _makeProvenance({ lineNumber: idx + 1 }) };
    }
    const obj = item || {};
    return {
      text: String(obj.text || obj.line || ''),
      provenance: _makeProvenance({
        file: obj.file,
        sheet: obj.sheet,
        cell: obj.cell,
        row: obj.row,
        col: obj.col,
        lineNumber: obj.lineNumber ?? idx + 1,
        page: obj.page
      })
    };
  }).filter(e => e.text.trim());
}

function _appendUnresolvedRequirements(unresList, defaultFile, page, seenTexts, outEntries) {
  for (const unres of (unresList || [])) {
    const text = String(unres?.line || unres?.text || '').trim();
    if (!text || seenTexts.has(text)) continue;
    seenTexts.add(text);
    outEntries.push({
      text,
      provenance: _makeProvenance({ file: defaultFile, lineNumber: unres?.lineNumber, page })
    });
  }
}

function _normalizeObjectInput(obj) {
  const defaultFile = obj.file || obj.filePath || null;
  const coverEntries = _groupCoverNoteRows(obj.coverNoteRecords || [], defaultFile);
  const rawLines = obj.rawLines || (typeof obj.text === 'string' ? obj.text.split(/\r?\n/) : []);
  const lineState = { inBomTable: false, headerLine: '' };
  const rawEntries = [];
  const seenTexts = new Set(coverEntries.map(e => e.text.trim()));

  rawLines.forEach((rawLine, idx) => {
    const text = String(rawLine || '').trim();
    if (!text || _detectBomLineSkip(text, lineState)) return;
    seenTexts.add(text);
    rawEntries.push({
      text,
      provenance: _makeProvenance({ file: defaultFile, lineNumber: idx + 1, page: obj.page })
    });
  });

  _appendUnresolvedRequirements(obj.unresolvedRequirements, defaultFile, obj.page, seenTexts, rawEntries);
  return [...coverEntries, ...rawEntries];
}

function _normalizeInputEntries(input) {
  if (typeof input === 'string') {
    return _normalizeArrayInput(input.split(/\r?\n/));
  }
  if (Array.isArray(input)) {
    return _normalizeArrayInput(input);
  }
  return _normalizeObjectInput(input && typeof input === 'object' ? input : {});
}

function _splitEntryIntoClauses(entry) {
  const raw = String(entry.text || '');
  const clauses = [];
  let cursor = 0;
  for (const part of raw.split(';')) {
    const start = raw.indexOf(part, cursor);
    const trimmed = part.trim();
    if (trimmed) {
      const leadOffset = part.indexOf(trimmed);
      clauses.push({
        rawText: trimmed,
        provenance: {
          ...entry.provenance,
          span: { start: start + leadOffset, end: start + leadOffset + trimmed.length }
        }
      });
    }
    cursor = start + part.length + 1;
  }
  return clauses;
}

function buildRequirementRevisionDigest(clausesOrRecords) {
  const canonical = (clausesOrRecords || []).map(item => ({
    rawText: item.rawText || '',
    provenance: item.provenance || {}
  }));
  return crypto.createHash('sha256').update(canonicalStringify(canonical)).digest('hex');
}

function _scopeBucketForMetric(metric, scope) {
  if (metric === 'nodeCount' || metric === 'budgetUsd') return 'CLUSTER_OR_GLOBAL';
  return scope || 'UNSPECIFIED';
}

function _extremeBound(items, comparator, pickHighest) {
  let chosen = null;
  for (const item of items) {
    if (item.metric.comparator !== comparator) continue;
    if (!chosen) chosen = item;
    else if (pickHighest && item.metric.value > chosen.metric.value) chosen = item;
    else if (!pickHighest && item.metric.value < chosen.metric.value) chosen = item;
  }
  return chosen;
}

function _checkBoundConflict(records) {
  const exacts = records.filter(r => r.metric.comparator === COMPARATORS.EXACT);
  const distinctExacts = new Map();
  for (const ex of exacts) distinctExacts.set(String(ex.metric.value), ex);
  if (distinctExacts.size > 1) {
    return { type: 'CONTRADICTORY_EXACT_VALUES', items: [...distinctExacts.values()] };
  }

  const maxMin = _extremeBound(records, COMPARATORS.MIN, true);
  const minMax = _extremeBound(records, COMPARATORS.MAX, false);
  if (maxMin && minMax && maxMin.metric.value > minMax.metric.value) {
    return { type: 'CONTRADICTORY_RANGE_BOUNDS', items: [maxMin, minMax] };
  }
  if (exacts.length > 0 && maxMin && exacts[0].metric.value < maxMin.metric.value) {
    return { type: 'EXACT_BELOW_MIN', items: [exacts[0], maxMin] };
  }
  if (exacts.length > 0 && minMax && exacts[0].metric.value > minMax.metric.value) {
    return { type: 'EXACT_ABOVE_MAX', items: [exacts[0], minMax] };
  }
  return null;
}

function _buildAmbiguityAndQuestion(conflict, metric, scope, revHex8, index) {
  const reqIds = [...new Set(conflict.items.map(i => i.record.id))];
  const values = conflict.items.map(i => i.metric.value);
  const snippets = conflict.items.map(i => `${i.metric.value} ("${i.record.rawText}")`);
  const ambiguityId = `AMB-${revHex8}-${String(index + 1).padStart(3, '0')}`;
  const questionId = `CLR-${revHex8}-${String(index + 1).padStart(3, '0')}`;

  return {
    reqIds,
    ambiguity: {
      ambiguityId,
      type: conflict.type,
      metric,
      domain: conflict.items[0].metric.domain,
      scope,
      conflictingValues: values,
      requirementIds: reqIds,
      provenances: conflict.items.map(i => i.record.provenance),
      message: `Conflicting ${metric} constraints: ${snippets.join(' vs ')}.`
    },
    question: {
      questionId,
      ambiguityId,
      source: 'AMBIGUITY',
      severity: 'BLOCKING',
      requirementIds: reqIds,
      options: values.map(v => String(v)),
      question: `Clarify authoritative ${metric} requirement: input specifies ${snippets.join(' vs ')}.`
    }
  };
}

function _detectSkuLockExclusionAmbiguities(records, revHex8, startIndex) {
  const locks = new Map();
  const exclusions = new Map();
  for (const rec of records) {
    if (rec.hardness === HARDNESS_LEVELS.PREFERENCE) continue;
    for (const m of rec.extractedMetrics) {
      if (m.metric === 'lockedSku') locks.set(m.value, { record: rec, metric: m });
      if (m.metric === 'excludedSku') exclusions.set(m.value, { record: rec, metric: m });
    }
  }
  const results = [];
  let idx = startIndex;
  for (const [sku, lockEntry] of locks.entries()) {
    const exclEntry = exclusions.get(sku);
    if (!exclEntry) continue;
    const conflict = { type: 'CONTRADICTORY_SKU_LOCK_EXCLUSION', items: [lockEntry, exclEntry] };
    results.push(_buildAmbiguityAndQuestion(conflict, 'skuPolicy', 'UNSPECIFIED', revHex8, idx++));
  }
  return results;
}

function _bucketRequirementMetrics(records) {
  const grouped = new Map();
  const skip = new Set(['lockedSku', 'excludedSku', 'excludedCategory']);
  for (const rec of records) {
    if (rec.hardness === HARDNESS_LEVELS.PREFERENCE || rec.parseStatus !== 'PARSED') continue;
    for (const metric of rec.extractedMetrics) {
      if (skip.has(metric.metric)) continue;
      const bucket = _scopeBucketForMetric(metric.metric, metric.scope);
      const key = `${metric.metric}::${bucket}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ record: rec, metric });
    }
  }
  return grouped;
}

function _evaluateBucketConflict(bucketEntries) {
  if (bucketEntries.length < 2) return null;
  if (bucketEntries.every(e => typeof e.metric.value === 'number')) {
    return _checkBoundConflict(bucketEntries);
  }
  const distinct = new Map(bucketEntries.map(e => [String(e.metric.value).toLowerCase(), e]));
  return distinct.size > 1 ? { type: 'CONTRADICTORY_CATEGORICAL_VALUES', items: [...distinct.values()] } : null;
}

function _detectAmbiguities(records, revHex8) {
  const grouped = _bucketRequirementMetrics(records);
  const ambiguities = [];
  const clarificationQuestions = [];
  const recordAmbiguityMap = new Map();

  const register = entry => {
    ambiguities.push(entry.ambiguity);
    clarificationQuestions.push(entry.question);
    for (const id of entry.reqIds) {
      if (!recordAmbiguityMap.has(id)) recordAmbiguityMap.set(id, []);
      recordAmbiguityMap.get(id).push(entry.ambiguity.ambiguityId);
    }
  };

  for (const [key, bucketEntries] of grouped.entries()) {
    const conflict = _evaluateBucketConflict(bucketEntries);
    if (!conflict) continue;
    const [metric, scope] = key.split('::');
    register(_buildAmbiguityAndQuestion(conflict, metric, scope, revHex8, ambiguities.length));
  }
  for (const skuEntry of _detectSkuLockExclusionAmbiguities(records, revHex8, ambiguities.length)) {
    register(skuEntry);
  }
  return { ambiguities, clarificationQuestions, recordAmbiguityMap };
}

function _buildRecordFromClause(clause, idx, revHex8) {
  const parsed = parseTypedClauseValue(clause.rawText);
  return {
    schemaVersion: SCHEMA_VERSION,
    id: `REQ-${revHex8}-${String(idx + 1).padStart(3, '0')}`,
    sequence: idx + 1,
    rawText: clause.rawText,
    provenance: clause.provenance,
    parseStatus: parsed.parseStatus,
    interpreted: parsed.interpreted,
    hardness: parsed.hardness,
    promoteToPhysicalRule: parsed.promoteToPhysicalRule,
    isHardBlocking: parsed.isHardBlocking,
    scope: parsed.scope,
    scopes: parsed.scopes,
    isSpare: parsed.isSpare,
    isShared: parsed.isShared,
    isGlobal: parsed.isGlobal,
    noSubstitute: parsed.noSubstitute,
    physicalImpossibility: parsed.physicalImpossibility,
    typedValue: parsed.interpreted ? {
      domain: parsed.domain,
      metric: parsed.metric,
      comparator: parsed.comparator,
      value: parsed.value,
      unit: parsed.unit
    } : null,
    extractedMetrics: parsed.extractedMetrics,
    isAmbiguous: false,
    ambiguityIds: []
  };
}

function extractRequirementRecords(input) {
  const entries = _normalizeInputEntries(input);
  const rawClauses = entries.flatMap(_splitEntryIntoClauses);
  const inputRevisionSha256 = buildRequirementRevisionDigest(rawClauses);
  const revHex8 = inputRevisionSha256.slice(0, 8);

  const mutableRecords = rawClauses.map((clause, idx) => _buildRecordFromClause(clause, idx, revHex8));
  const { ambiguities, clarificationQuestions, recordAmbiguityMap } = _detectAmbiguities(mutableRecords, revHex8);

  for (const rec of mutableRecords) {
    const ambIds = recordAmbiguityMap.get(rec.id) || [];
    if (ambIds.length > 0) {
      rec.isAmbiguous = true;
      rec.ambiguityIds = ambIds;
    }
  }

  const uninterpretedClauses = mutableRecords.filter(r => r.parseStatus === 'UNINTERPRETED');
  uninterpretedClauses.forEach((rec, uIdx) => {
    if (rec.hardness === HARDNESS_LEVELS.PREFERENCE) return;
    clarificationQuestions.push({
      questionId: `CLR-${revHex8}-U${String(uIdx + 1).padStart(2, '0')}`,
      ambiguityId: null,
      source: 'UNINTERPRETED_CLAUSE',
      severity: 'BLOCKING',
      requirementIds: [rec.id],
      options: [],
      question: `Clarify verifiable technical acceptance criteria for uninterpreted requirement (${rec.id}): "${rec.rawText}".`
    });
  });

  const normalizedClauses = mutableRecords.map(rec => ({
    id: rec.id,
    rawText: rec.rawText,
    parseStatus: rec.parseStatus,
    hardness: rec.hardness,
    scope: rec.scope,
    typedValue: rec.typedValue,
    extractedMetrics: rec.extractedMetrics,
    isAmbiguous: rec.isAmbiguous
  }));

  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    inputRevisionSha256,
    totalClauses: mutableRecords.length,
    parsedCount: mutableRecords.length - uninterpretedClauses.length,
    uninterpretedCount: uninterpretedClauses.length,
    ambiguityCount: ambiguities.length,
    records: mutableRecords,
    uninterpretedClauses,
    ambiguities,
    clarificationQuestions,
    normalizedClauses
  });
}

module.exports = {
  SCHEMA_VERSION,
  extractRequirementRecords,
  extractBudgetConstraint,
  extractWorkbookCoverNotes,
  buildRequirementRevisionDigest
};
