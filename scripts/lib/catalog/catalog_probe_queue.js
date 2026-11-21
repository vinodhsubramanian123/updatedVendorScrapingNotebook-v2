'use strict';

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { safeWriteJsonAtomic, withFileLock } = require('../system/fs_compat.js');

const DEFAULT_QUEUE = path.resolve(__dirname, '../../../outputs/history/query_miss_probe_queue.json');
const OPEN = new Set(['PENDING_PROBE', 'STILL_UNRESOLVED', 'REPLAY_FAILED']);
const WAIT_BUFFER = new Int32Array(new SharedArrayBuffer(4));

function readQueue(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(value?.items)) throw new Error('Invalid catalog probe queue');
    return value;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { schemaVersion: '2.0.0', items: [] };
  }
}

function updateQueue(file, update) {
  const deadline = Date.now() + 2000;
  for (;;) {
    try {
      return withFileLock(file, () => {
        const queue = readQueue(file);
        if (!update(queue.items)) return false;
        queue.schemaVersion = '2.0.0';
        safeWriteJsonAtomic(file, queue);
        return true;
      });
    } catch (error) {
      if (!error.message.startsWith('WORKFLOW_BUSY:') || Date.now() >= deadline) throw error;
      Atomics.wait(WAIT_BUFFER, 0, 0, 25);
    }
  }
}

function _productsWithGaps(result) {
  const sources = (result.sources || []).filter(source => source.status !== 'READ' &&
    (source.status !== 'MISSING' || source.kind === 'CATALOG' ||
      (source.kind === 'SERVICES' && result.filters?.rowTypes?.includes('SUPPORT_SERVICE'))));
  const exclusions = [result.excludedConflicts, result.excludedUnpriced, result.excludedUnmeasured].flatMap(list => list || []);
  const products = [...new Set([...sources, ...exclusions].map(row => row.product).filter(Boolean))];
  return products.length ? products : (result.filters?.products || []);
}

function enqueueCatalogProbe(result, options = {}) {
  if (!result?.summary?.incompleteCatalogCoverage || result.filters?.unresolvedFilters?.length || result.filters?.unresolvedProducts?.length) return false;
  const products = _productsWithGaps(result);
  if (!products.length) return false;
  const file = options.queuePath || DEFAULT_QUEUE;
  const now = new Date().toISOString();
  try {
    return updateQueue(file, items => {
      for (const product of products) {
        const request = { ...result.filters, products: [product] };
        const id = createHash('sha256').update(JSON.stringify(request)).digest('hex');
        const previous = items.find(item => item.id === id);
        const traceIds = [...new Set([...(previous?.traceIds || []), options.traceId].filter(Boolean))].slice(-10);
        const reason = result.excludedConflicts?.some(row => row.product === product) ? 'PRICE_CONFLICT'
          : result.excludedUnpriced?.some(row => row.product === product) ? 'UNPUBLISHED_PRICE' : 'MISSING_CATALOG_EVIDENCE';
        const item = { id, products: [product], request, reason, status: 'PENDING_PROBE',
          firstSeenAt: previous?.firstSeenAt || now, lastSeenAt: now, count: (previous?.count || 0) + 1, traceIds };
        if (previous) Object.assign(previous, item);
        else items.push(item);
      }
      return true;
    });
  } catch { return false; }
}

function resolveCatalogProbes(receipt, verify, options = {}) {
  if (receipt?.status !== 'LOCAL_PROMOTED' || receipt.coverage?.qualityGate?.passed !== true ||
      !receipt.coverage.qualityGate.replaySuiteSha256) return { attempted: 0, resolved: 0 };
  const file = options.queuePath || DEFAULT_QUEUE;
  try {
    const candidates = readQueue(file).items.filter(item => item.id && item.request && OPEN.has(item.status) &&
      item.products?.length === 1 && item.products[0] === receipt.product && receipt.capturedAt >= item.lastSeenAt);
    const outcomes = new Map(candidates.map(item => [item.id, { item, check: verify(item.request) }]));
    const totals = { attempted: 0, resolved: 0 };
    if (!outcomes.size) return totals;
    updateQueue(file, items => {
      for (const current of items) {
        const outcome = outcomes.get(current.id);
        if (!outcome || !OPEN.has(current.status) || current.count !== outcome.item.count) continue;
        const check = outcome.check;
        current.status = check.passed ? 'VERIFIED_RESOLVED' : (check.invalid ? 'REPLAY_FAILED' : 'STILL_UNRESOLVED');
        current.lastAttempt = { capturedAt: receipt.capturedAt, captureRawSha256: receipt.rawSha256,
          catalogSha256: receipt.hashes?.['Catalog.json'], returnedCount: check.returnedCount ?? null,
          disposition: check.disposition };
        current.attemptCount = (current.attemptCount || 0) + 1;
        totals.attempted++;
        if (check.passed) totals.resolved++;
      }
      return totals.attempted > 0;
    });
    return totals;
  } catch {
    return { attempted: 0, resolved: 0, status: 'QUEUE_UNAVAILABLE' };
  }
}

function summarizeCatalogProbes(file = DEFAULT_QUEUE) {
  try {
    const items = readQueue(file).items.filter(item => item.id && item.request);
    const resolved = items.filter(item => item.status === 'VERIFIED_RESOLVED').length;
    const replayed = items.filter(item => item.lastAttempt).length;
    return { issues: items.length, recurring: items.filter(item => item.count > 1).length,
      open: items.length - resolved, resolved, replayed, closureRate: replayed ? resolved / replayed : null };
  } catch { return { status: 'QUEUE_UNAVAILABLE', closureRate: null }; }
}

module.exports = { enqueueCatalogProbe, resolveCatalogProbes, summarizeCatalogProbes };
