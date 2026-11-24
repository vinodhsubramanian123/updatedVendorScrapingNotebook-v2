'use strict';
/**
 * scripts/lib/boq/gates/gate_check_builder.js — Shared Epistemic Check Constructor (INV-105)
 */

function makeCheck(id, name, severity, status, detail, evidence = {}) {
  const isPassed = status === 'PASSED' || status === 'NOT_APPLICABLE';
  return {
    id,
    name,
    severity,
    status,
    passed: isPassed,
    detail,
    evidence
  };
}

module.exports = {
  makeCheck
};
