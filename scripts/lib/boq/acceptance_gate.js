'use strict';
/**
 * scripts/lib/boq/acceptance_gate.js
 *
 * Semantic alias / direct-path shim for bom_verifier.js (14-Point Pre-Presentation Acceptance Gate).
 * Preserves backward compatibility and provides semantic naming per INV-128 and PLAN.md (Finding F11).
 */

const bomVerifier = require('./bom_verifier.js');

module.exports = {
  ...bomVerifier
};
