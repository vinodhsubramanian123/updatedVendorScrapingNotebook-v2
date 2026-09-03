'use strict';
/**
 * scripts/lib/system/trace_context.js — Unified Pipeline Traceability Context
 *
 * Implements AsyncLocalStorage to automatically propagate a unique TraceID
 * across the entire execution boundary (Scraper, Aspect Math, Telemetry, RAG).
 */

const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const traceStorage = new AsyncLocalStorage();

/**
 * Run a function within a new or existing Trace Context.
 * @param {string} overrideTraceId Optional forced TraceID
 * @param {Function} callback Async or sync function to execute
 */
function runWithTrace(overrideTraceId, callback) {
  const traceId = overrideTraceId || `TRC-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  return traceStorage.run(traceId, callback);
}

/**
 * Retrieve the current active TraceID.
 * @returns {string} The active TraceID or 'NO_TRACE_CONTEXT'
 */
function getTraceId() {
  return traceStorage.getStore() || 'NO_TRACE_CONTEXT';
}

module.exports = {
  runWithTrace,
  getTraceId
};
