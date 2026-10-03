'use strict';
/**
 * scripts/lib/boq/vendor_quote_reconciler.js
 *
 * Semantic alias / direct-path shim for vendor_bom_verifier.js.
 * Preserves backward compatibility and provides semantic naming per PLAN.md (Finding F11).
 * Supports both library exports and CLI forwarding.
 */

const vendorBomVerifier = require('./vendor_bom_verifier.js');

if (require.main === module) {
  vendorBomVerifier.runCli();
}

module.exports = {
  ...vendorBomVerifier
};
