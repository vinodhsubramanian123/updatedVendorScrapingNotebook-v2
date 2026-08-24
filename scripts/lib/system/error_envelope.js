'use strict';
/**
 * scripts/lib/error_envelope.js — Standardized Error Envelope Utility
 *
 * Provides uniform error formatting, structured error classification,
 * contextual wrapping, and standard JSON error envelopes across
 * backend scripts, MCP tools, and server bridges.
 */

/**
 * Standard error codes used across the system
 */
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  SECURITY_ERROR: 'SECURITY_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  PARSER_ERROR: 'PARSER_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});

/**
 * Creates a normalized error payload object.
 *
 * @param {string|Error} error - Error message or Error instance
 * @param {object} [options]
 * @param {string} [options.code='INTERNAL_ERROR'] - ERROR_CODES enum value
 * @param {string} [options.source='SYSTEM'] - Module or component reporting the error
 * @param {object} [options.context] - Additional structured metadata/context
 * @returns {object} Standard error envelope
 */
function createErrorEnvelope(error, options = {}) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  const code = options.code || ERROR_CODES.INTERNAL_ERROR;
  const source = options.source || 'SYSTEM';
  const timestamp = new Date().toISOString();

  const envelope = {
    status: 'ERROR',
    code,
    error: message,
    source,
    timestamp
  };

  if (options.context && typeof options.context === 'object') {
    envelope.context = options.context;
  }

  if (error instanceof Error && error.stack && process.env.NODE_ENV === 'development') {
    envelope.stack = error.stack;
  }

  return envelope;
}

/**
 * Wraps an async function with standard error handling.
 *
 * @param {Function} fn - Async function to wrap
 * @param {object} [options]
 * @param {string} [options.source]
 * @param {string} [options.defaultCode]
 * @returns {Promise<{ ok: boolean, data?: any, error?: object }>}
 */
async function wrapAsync(fn, options = {}) {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    const envelope = createErrorEnvelope(err, {
      source: options.source,
      code: options.defaultCode || ERROR_CODES.INTERNAL_ERROR,
      context: options.context
    });
    return { ok: false, error: envelope };
  }
}

module.exports = {
  ERROR_CODES,
  createErrorEnvelope,
  wrapAsync
};
