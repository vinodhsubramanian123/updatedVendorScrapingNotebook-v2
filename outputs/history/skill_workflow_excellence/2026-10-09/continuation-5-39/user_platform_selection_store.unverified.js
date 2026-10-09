'use strict';
// Query-bound user preferences are not hardware rules or vendor acceptance.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { acquireWorkflowLease } = require('../system/workflow_lease.js');
const TYPE = 'USER_PLATFORM_SELECTION';
function normalizeQuery(query) {
  return typeof query === 'string' ? query.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
}
function queryHash(query) { return crypto.createHash('sha256').update(normalizeQuery(query)).digest('hex'); }
function candidateSet(candidates) {
  return [...new Set((Array.isArray(candidates) ? candidates : []).filter(c => typeof c === 'string' && c.trim() === c && c.length))].sort();
}
function storePath(catalogDir) { return path.join(catalogDir, 'history', 'user_platform_selections.json'); }
function readStore(catalogDir) {
  const file = storePath(catalogDir);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data.type !== TYPE || data.schemaVersion !== 1 || !Array.isArray(data.records)) throw new Error('Invalid user platform selection store');
  return data.records;
}
function validRecord(record) {
  return record && record.type === TYPE && record.evidenceSource === 'USER_CHOICE' &&
    record.governanceStatus === 'LOCAL_USER_PREFERENCE' && normalizeQuery(record.normalizedQuery) === record.normalizedQuery &&
    Boolean(record.normalizedQuery) && record.queryHash === queryHash(record.normalizedQuery) &&
    typeof record.selectedPlatform === 'string' && Array.isArray(record.candidatePlatforms) &&
    JSON.stringify(candidateSet(record.candidatePlatforms)) === JSON.stringify(record.candidatePlatforms) &&
    record.candidatePlatforms.includes(record.selectedPlatform) && Number.isFinite(Date.parse(record.recordedAt)) &&
    typeof record.id === 'string' && record.id.startsWith('UPS-');
}
function recordPlatformSelection(query, selectedPlatform, candidates, catalogDir, options = {}) {
  const normalizedQuery = normalizeQuery(query);
  const candidatePlatforms = candidateSet(candidates);
  if (!normalizedQuery || !candidatePlatforms.includes(selectedPlatform) || candidatePlatforms.length < 2) throw new Error('Selection must identify one actual ambiguous candidate');
  if (!catalogDir || !fs.statSync(catalogDir).isDirectory()) throw new Error('Selected platform catalog directory is required');
  const release = acquireWorkflowLease('user-platform-selections', path.join(catalogDir, 'history', 'locks'));
  try {
    const records = readStore(catalogDir);
    const record = {
      id: `UPS-${crypto.randomUUID()}`, type: TYPE, schemaVersion: 1,
      normalizedQuery, queryHash: queryHash(query), selectedPlatform, candidatePlatforms,
      recordedAt: new Date().toISOString(), evidenceSource: 'USER_CHOICE',
      governanceStatus: 'LOCAL_USER_PREFERENCE',
      reasoning: typeof options.reasoning === 'string' ? options.reasoning : null,
      reviewer: typeof options.reviewer === 'string' ? options.reviewer : null
    };
    records.push(record);
    safeWriteJsonAtomic(storePath(catalogDir), { schemaVersion: 1, type: TYPE, records });
    return record;
  } finally { release(); }
}
function retrievePlatformSelection(query, candidates, catalogs, context = {}) {
  const hash = queryHash(query);
  const candidatePlatforms = candidateSet(candidates);
  const matches = [];
  for (const catalog of catalogs.filter(c => candidatePlatforms.includes(c.id))) {
    for (const record of readStore(catalog.catalogDir)) {
      if (validRecord(record) && record.queryHash === hash && record.selectedPlatform === catalog.id) matches.push(record);
    }
  }
  const retrievedIds = matches.map(r => r.id);
  const explicit = context.chassisName || context.model || context.targetPlatform;
  if (explicit) return { retrievedIds, selected: null, reason: 'EXPLICIT_CONTEXT' };
  const eligible = matches.filter(r => JSON.stringify(r.candidatePlatforms) === JSON.stringify(candidatePlatforms));
  eligible.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
  if (eligible.length > 1 && eligible[0].recordedAt === eligible[1].recordedAt && eligible[0].selectedPlatform !== eligible[1].selectedPlatform) return { retrievedIds, selected: null, reason: 'CONFLICTING_PREFERENCES' };
  return { retrievedIds, selected: eligible[0] || null, reason: eligible.length ? 'QUERY_BOUND_USER_CHOICE' : 'NO_MATCHING_PREFERENCE' };
}
module.exports = { normalizeQuery, queryHash, candidateSet, storePath, recordPlatformSelection, retrievePlatformSelection };
