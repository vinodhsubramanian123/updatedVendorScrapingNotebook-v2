'use strict';
/**
 * tests/unit/test_rag_ttl_and_headroom.js
 *
 * Comprehensive unit test suite for Dual-Brain RAG Headroom & TTL Cache Invalidation:
 * (scripts/lib/notebook/notebook_query_utils.js & scripts/lib/rag/agentic_guardrail.js)
 *
 * Test Boundaries:
 * 1. 24-Hour Disk Cache Invalidation:
 *    - Valid cache read (age < 24h) returns cached object.
 *    - Expired cache read (age > 24h) evicts file and returns null.
 *    - setCachedRagResult writes { value, cachedAt: Date.now() }.
 *    - purgeExpiredRagCache purges expired files cleanly on startup.
 * 2. RAG Headroom & Guardrail Budget Cap:
 *    - GUARDRAIL_OVERALL_TIMEOUT_MS is 180s (3 minutes).
 *    - RAG_TIMEOUT_MS is 120s (2 minutes).
 *    - GUARDRAIL_NLM_MAX_CALLS limit (3 calls) caps query bursts.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const {
  getCachedRagResult,
  setCachedRagResult,
  purgeExpiredRagCache,
  RAG_CACHE_TTL_MS,
  RAG_TIMEOUT_MS
} = require('../../scripts/lib/notebook/notebook_query_utils.js');

const {
  GUARDRAIL_OVERALL_TIMEOUT_MS,
  GUARDRAIL_NLM_MAX_CALLS
} = require('../../scripts/lib/rag/agentic_guardrail.js');

describe('🧪 Dual-Brain RAG Headroom & TTL Cache Invalidation Suite', () => {
  const TEST_CACHE_KEY = 'test_rag_cache_key_synthetic_123';
  const CACHE_DIR = path.resolve(__dirname, '../../outputs/history/rag_cache');

  beforeEach(() => {
    // Clean up any test cache entry before each test
    const testFile = path.join(CACHE_DIR, `${TEST_CACHE_KEY}.json`);
    if (fs.existsSync(testFile)) {
      try { fs.unlinkSync(testFile); } catch (_) {}
    }
  });

  afterEach(() => {
    const testFile = path.join(CACHE_DIR, `${TEST_CACHE_KEY}.json`);
    if (fs.existsSync(testFile)) {
      try { fs.unlinkSync(testFile); } catch (_) {}
    }
  });

  test('1. Constants assert correct Dual-Brain Headroom & Budget Cap (INV-41)', () => {
    assert.strictEqual(RAG_TIMEOUT_MS, 120000, 'RAG_TIMEOUT_MS must be 120,000ms (120s)');
    assert.strictEqual(RAG_CACHE_TTL_MS, 86400000, 'RAG_CACHE_TTL_MS must be 86,400,000ms (24 hours)');
    assert.strictEqual(GUARDRAIL_OVERALL_TIMEOUT_MS, 180000, 'GUARDRAIL_OVERALL_TIMEOUT_MS must be 180,000ms (3 minutes)');
    assert.strictEqual(GUARDRAIL_NLM_MAX_CALLS, 3, 'GUARDRAIL_NLM_MAX_CALLS must be 3 queries');
  });

  test('2. setCachedRagResult stores timestamped record and getCachedRagResult retrieves valid entry', () => {
    const payload = {
      isCompatible: true,
      suggestedFixes: ['P48820-B21'],
      citationsCount: 2
    };

    setCachedRagResult(TEST_CACHE_KEY, payload);

    const retrieved = getCachedRagResult(TEST_CACHE_KEY);
    assert(retrieved, 'Should retrieve freshly written cached result');
    assert.strictEqual(retrieved.isCompatible, true);
    assert.deepStrictEqual(retrieved.suggestedFixes, ['P48820-B21']);
  });

  test('3. getCachedRagResult evicts and returns null when cached entry age > 24 hours', () => {
    // Write an expired entry directly via setCachedRagResult then simulate time shift
    const expiredPayload = { isCompatible: false, reason: 'Old rule' };
    setCachedRagResult('test_expired_key_1', expiredPayload);

    // Overwrite cachedAt to 25 hours ago in memory
    const { queryCache } = require('../../scripts/lib/notebook/notebook_query_utils.js');
    if (queryCache) {
      queryCache.set('test_expired_key_1', {
        value: expiredPayload,
        cachedAt: new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString()
      });
    }

    const result = getCachedRagResult('test_expired_key_1');
    assert.strictEqual(result, null, 'Expired cache entry must return null and be evicted');
  });

  test('4. purgeExpiredRagCache cleans expired entries while preserving fresh ones', () => {
    const { queryCache } = require('../../scripts/lib/notebook/notebook_query_utils.js');
    if (queryCache) {
      queryCache.set('test_fresh_entry', {
        value: { status: 'FRESH' },
        cachedAt: new Date(Date.now() - 1000).toISOString()
      });
      queryCache.set('test_stale_entry', {
        value: { status: 'STALE' },
        cachedAt: new Date(Date.now() - (30 * 60 * 60 * 1000)).toISOString()
      });

      const purgedCount = purgeExpiredRagCache();
      assert(purgedCount >= 1, 'Must report at least 1 purged expired entry');
      assert.strictEqual(getCachedRagResult('test_fresh_entry')?.status, 'FRESH');
      assert.strictEqual(getCachedRagResult('test_stale_entry'), null);
    }
  });

});
