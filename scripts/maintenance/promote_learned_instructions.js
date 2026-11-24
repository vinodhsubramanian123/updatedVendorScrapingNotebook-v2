#!/usr/bin/env node
'use strict';
/**
 * scripts/maintenance/promote_learned_instructions.js — CLI Runner & Regression Gate Wrapper (INV-279)
 */

const { promoteLearnedInstructions: _promoteCore, _isEligibleForPromotion } = require('../lib/feedback/instruction_promoter.js');
const { runValidation } = require('./validate_skills_integrity.js');
const { evaluateAllScenarios } = require('./evaluate_solution_intelligence_quality.js');

async function defaultRegressionGate() {
  const skillsRes = runValidation({ quiet: true });
  if (!skillsRes.ok) {
    return { ok: false, error: `Skill integrity validation failed (${skillsRes.failed} skill failure(s))` };
  }
  const siRes = await evaluateAllScenarios();
  if (!siRes.overall?.releaseGate?.passed) {
    return { ok: false, error: `SI-10 quality gate regressed: ${siRes.overall?.releaseGate?.reason || 'FAILED'}` };
  }
  return { ok: true, skillsOk: true, si10Passed: true, totalCases: siRes.overall.totalCases };
}

async function promoteLearnedInstructions(options = {}) {
  const validatorFn = options.validatorFn || (options.apply ? defaultRegressionGate : undefined);
  return _promoteCore({ ...options, validatorFn });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply') && !args.includes('--dry-run');
  const queueIdx = args.indexOf('--queue');
  const queuePath = queueIdx >= 0 && args[queueIdx + 1] ? args[queueIdx + 1] : undefined;
  promoteLearnedInstructions({ apply, queuePath })
    .then(res => {
      console.log(JSON.stringify(res, null, 2));
      if (res.rolledBack) process.exitCode = 1;
    })
    .catch(err => {
      console.error(`Promotion failed: ${err.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  promoteLearnedInstructions,
  defaultRegressionGate,
  _isEligibleForPromotion
};
