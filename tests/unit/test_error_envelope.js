'use strict';
/**
 * tests/unit/test_error_envelope.js
 *
 * Tests for scripts/lib/system/error_envelope.js:
 * - ERROR_CODES constants contract
 * - createErrorEnvelope with Error instance, string, context, and custom options
 * - wrapAsync execution with success and handled error envelopes
 */

const test = require('node:test');
const assert = require('node:assert');
const {
  ERROR_CODES,
  createErrorEnvelope,
  wrapAsync
} = require('../../scripts/lib/system/error_envelope.js');

test('ERROR_CODES defines standard immutable error enum constants', () => {
  assert.strictEqual(ERROR_CODES.VALIDATION_ERROR, 'VALIDATION_ERROR');
  assert.strictEqual(ERROR_CODES.FILE_NOT_FOUND, 'FILE_NOT_FOUND');
  assert.strictEqual(ERROR_CODES.SECURITY_ERROR, 'SECURITY_ERROR');
  assert.strictEqual(ERROR_CODES.CONFLICT_ERROR, 'CONFLICT_ERROR');
  assert.strictEqual(ERROR_CODES.TIMEOUT_ERROR, 'TIMEOUT_ERROR');
  assert.strictEqual(ERROR_CODES.RATE_LIMIT_ERROR, 'RATE_LIMIT_ERROR');
  assert.strictEqual(ERROR_CODES.PARSER_ERROR, 'PARSER_ERROR');
  assert.strictEqual(ERROR_CODES.INTERNAL_ERROR, 'INTERNAL_ERROR');

  assert.throws(() => {
    ERROR_CODES.CUSTOM = 'CUSTOM';
  });
});

test('createErrorEnvelope formats Error instances and raw strings', () => {
  const errInst = new Error('Disk read failure');
  const env1 = createErrorEnvelope(errInst, {
    code: ERROR_CODES.FILE_NOT_FOUND,
    source: 'CATALOG_DISCOVERY',
    context: { path: '/tmp/test.json' }
  });

  assert.strictEqual(env1.status, 'ERROR');
  assert.strictEqual(env1.code, ERROR_CODES.FILE_NOT_FOUND);
  assert.strictEqual(env1.error, 'Disk read failure');
  assert.strictEqual(env1.source, 'CATALOG_DISCOVERY');
  assert.deepStrictEqual(env1.context, { path: '/tmp/test.json' });
  assert.ok(typeof env1.timestamp === 'string');

  const env2 = createErrorEnvelope('Simple message string');
  assert.strictEqual(env2.status, 'ERROR');
  assert.strictEqual(env2.code, ERROR_CODES.INTERNAL_ERROR);
  assert.strictEqual(env2.error, 'Simple message string');
  assert.strictEqual(env2.source, 'SYSTEM');
  assert.strictEqual(env2.context, undefined);

  const envNull = createErrorEnvelope(null);
  assert.strictEqual(envNull.error, 'Unknown error');
});

test('wrapAsync handles successful async resolutions', async () => {
  const result = await wrapAsync(async () => {
    return { count: 42, ready: true };
  });

  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(result.data, { count: 42, ready: true });
  assert.strictEqual(result.error, undefined);
});

test('wrapAsync catches rejections and returns standardized error envelopes', async () => {
  const result = await wrapAsync(async () => {
    throw new Error('Database connection timed out');
  }, {
    source: 'RAG_SEARCH',
    defaultCode: ERROR_CODES.TIMEOUT_ERROR,
    context: { query: 'DL380 Gen12 fans' }
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.data, undefined);
  assert.ok(result.error);
  assert.strictEqual(result.error.status, 'ERROR');
  assert.strictEqual(result.error.code, ERROR_CODES.TIMEOUT_ERROR);
  assert.strictEqual(result.error.error, 'Database connection timed out');
  assert.strictEqual(result.error.source, 'RAG_SEARCH');
  assert.deepStrictEqual(result.error.context, { query: 'DL380 Gen12 fans' });
});
