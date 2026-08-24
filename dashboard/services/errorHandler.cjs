'use strict';
/**
 * dashboard/services/errorHandler.cjs — Express Route Error Handler & Wrapper
 *
 * Provides asyncHandler decorator to eliminate uncaught promise rejection boilerplate
 * and formats standard JSON error envelopes with proper HTTP status codes.
 */

const { ERROR_CODES, createErrorEnvelope } = require('../../scripts/lib/system/error_envelope.js');

/**
 * Wraps an Express route handler to catch rejected promises and forward to next(err).
 *
 * @param {Function} fn - Async Express route handler (req, res, next) => Promise<any>
 * @returns {Function} Express route handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Sends a structured JSON error response with appropriate HTTP status code.
 *
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string|Error} error - Error message or Error object
 * @param {object} [options]
 */
function sendErrorResponse(res, status, error, options = {}) {
  let code = options.code;
  if (!code) {
    if (status === 400) code = ERROR_CODES.VALIDATION_ERROR;
    else if (status === 403) code = ERROR_CODES.SECURITY_ERROR;
    else if (status === 404) code = ERROR_CODES.FILE_NOT_FOUND;
    else if (status === 409) code = ERROR_CODES.CONFLICT_ERROR;
    else code = ERROR_CODES.INTERNAL_ERROR;
  }

  const envelope = createErrorEnvelope(error, {
    code,
    source: options.source || 'API_BRIDGE',
    context: options.context
  });

  return res.status(status).json(envelope);
}

module.exports = {
  asyncHandler,
  sendErrorResponse,
  ERROR_CODES
};
