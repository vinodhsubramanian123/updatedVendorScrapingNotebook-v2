'use strict';
/**
 * scripts/lib/notebook/multi_notebook_coordinator.js
 *
 * Bounded concurrent NotebookLM / QuickSpecs fan-out coordinator for composite
 * multi-product tenders (compute + SAN switch + Alletra storage + Synergy frame).
 */

const { loadNotebookConfig, getNotebookIdForChassis } = require('../sync/knowledge_sync.js');
const { executeNotebookQuery } = require('./notebook_query_utils.js');
const logger = require('../system/pipeline_logger.js');

const DEFAULT_MAX_CONCURRENCY = 3;

function _resolveNotebookTarget(domainSpec, nbConfig) {
  const productKey = domainSpec?.productKey || domainSpec?.chassisId || null;
  if (domainSpec?.notebookId) {
    return { productKey: productKey || domainSpec.notebookId, notebookId: domainSpec.notebookId };
  }
  if (!productKey) return { productKey: 'UNKNOWN', notebookId: null };
  const mappedId = getNotebookIdForChassis(nbConfig, productKey);
  return { productKey, notebookId: mappedId || null };
}

async function _querySingleDomain(domainSpec, nbConfig, options) {
  const { productKey, notebookId } = _resolveNotebookTarget(domainSpec, nbConfig);
  if (!notebookId) {
    return {
      productKey,
      notebookId: null,
      status: 'UNMAPPED',
      isCloudGrounded: false,
      citations: [],
      answer: `No NotebookLM notebook configured for product '${productKey}'.`
    };
  }
  const queryFn = typeof options.queryFn === 'function' ? options.queryFn : executeNotebookQuery;
  try {
    const res = await queryFn(notebookId, domainSpec.query, {
      ...options.queryOptions,
      context: { ...options.queryOptions?.context, chassis: productKey }
    });
    return {
      productKey,
      notebookId,
      status: res?.isCloudGrounded ? 'VERIFIED_GROUNDED' : (res?.source === 'LOCAL_RAG' ? 'LOCAL_FALLBACK' : 'UNGROUNDED'),
      isCloudGrounded: Boolean(res?.isCloudGrounded),
      citations: Array.isArray(res?.citations) ? res.citations : [],
      answer: res?.answer || '',
      source: res?.source || 'UNKNOWN'
    };
  } catch (err) {
    logger.warn('MULTI_NOTEBOOK', `Domain query failed for ${productKey}: ${err.message}`);
    return {
      productKey,
      notebookId,
      status: 'UNAVAILABLE',
      isCloudGrounded: false,
      citations: [],
      error: err.message,
      answer: null
    };
  }
}

/**
 * Fan out bounded queries across multiple domain notebooks and aggregate evidence.
 * @param {Array<{ productKey?: string, chassisId?: string, notebookId?: string, query: string }>} domainRequests
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function coordinateMultiNotebookQueries(domainRequests = [], options = {}) {
  const requests = Array.isArray(domainRequests) ? domainRequests : [];
  if (requests.length === 0) {
    return {
      totalDomains: 0,
      verifiedCount: 0,
      unavailableCount: 0,
      allGrounded: false,
      results: []
    };
  }

  const nbConfig = options.notebookConfig || loadNotebookConfig();
  const concurrency = Math.max(1, Math.min(5, Number(options.concurrency || DEFAULT_MAX_CONCURRENCY)));
  const results = [];

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const settled = await Promise.all(batch.map(req => _querySingleDomain(req, nbConfig, options)));
    results.push(...settled);
  }

  const verifiedCount = results.filter(r => r.isCloudGrounded).length;
  const unavailableCount = results.filter(r => r.status === 'UNAVAILABLE' || r.status === 'UNMAPPED').length;
  return {
    totalDomains: results.length,
    verifiedCount,
    unavailableCount,
    allGrounded: verifiedCount === results.length && results.length > 0,
    results
  };
}

module.exports = {
  DEFAULT_MAX_CONCURRENCY,
  coordinateMultiNotebookQueries
};
