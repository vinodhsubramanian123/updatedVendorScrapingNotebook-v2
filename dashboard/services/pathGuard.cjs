'use strict';
/**
 * dashboard/services/pathGuard.cjs — Unified Path Security Service
 *
 * Consolidates the two prior helpers (isPathSafe + resolveSafePath) into
 * a single throwing assertSafePath() so every route uses the same guard.
 * SMELL-S5 fix.
 */

const path = require('path');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');

/**
 * Resolve a user-supplied path to an absolute path that is guaranteed to sit
 * inside `baseDir`. Throws an HTTP 403 error if traversal is detected.
 *
 * This is the ONLY path-safety primitive the codebase should use.
 *
 * @param {string} userInput  Raw user-supplied path string.
 * @param {string} [baseDir]  Allowed root; defaults to OUTPUTS_DIR.
 * @returns {string}          Safe resolved absolute path.
 * @throws {Error}            Message starts with 'HTTP 403' on traversal.
 */
function assertSafePath(userInput, baseDir = OUTPUTS_DIR) {
  if (!userInput) throw new Error('HTTP 403: Path input is required');

  let cleaned = userInput;
  // Strip leading artifacts/ prefix and repeated outputs/ prefixes for convenience
  if (baseDir === OUTPUTS_DIR) {
    cleaned = userInput
      .replace(/^\/artifacts\//, '')
      .replace(/^(outputs[/\\])+/, '');
  }

  const resolved = path.resolve(baseDir, cleaned);
  if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) {
    throw new Error('HTTP 403: Path Traversal Attempt Blocked');
  }
  return resolved;
}

/**
 * Non-throwing variant — returns null on traversal instead of throwing.
 * Useful for optional path validation in catalog discovery loops.
 *
 * @param {string} userInput
 * @param {string} [baseDir]
 * @returns {string|null}
 */
function tryResolveSafePath(userInput, baseDir = OUTPUTS_DIR) {
  try { return assertSafePath(userInput, baseDir); } catch (_) { return null; }
}

module.exports = { assertSafePath, tryResolveSafePath, OUTPUTS_DIR };
