'use strict';
/**
 * tests/unit/test_si09_skills_and_registry.js
 *
 * SI-09 Verification Suite:
 * (a) validate_skills_integrity.js passes across all 39 skills (zero banned words, valid YAML, HALT-, INV-).
 * (b) validate_skill_workflow_registry.js reports valid: true with 39 capabilities and activation === 'UNUSED'.
 * (c) Every entrypoint export on all 5 new skills resolves to a callable function and preserves
 *     trigger/non-trigger and negative/wrong-scope isolation without writing repo files.
 * (d) All 5 new SKILL.md files and 9 updated skills satisfy link, boundary, HALT, schema, offline, and Tier-3 checks.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { runValidation, parseFrontmatter } = require('../../scripts/maintenance/validate_skills_integrity.js');
const { validateRegistry, auditRegistry, findCycles } = require('../../scripts/maintenance/validate_skill_workflow_registry.js');
const { extractLinks, resolveLink } = require('../../scripts/maintenance/skill_workflow/markdown.js');
const registry = require('../../scripts/config/skill_workflow_registry.js');

const { extractRequirementRecords } = require('../../scripts/lib/boq/requirements/requirement_records.js');
const { evaluateCandidateRequirementCoverage, DISPOSITIONS } = require('../../scripts/lib/boq/requirements/coverage.js');
const { adjudicateSolutionClaims } = require('../../scripts/lib/boq/evidence/source_adjudicator.js');
const {
  createOfficialDocumentPassageEvidence,
  createUntrustedInputEvidence,
  createClaimRecord,
  buildIndependentEvidenceStates
} = require('../../scripts/lib/boq/evidence/claim_records.js');
const { diagnoseInfeasibility } = require('../../scripts/lib/conflict/constraints/conflict_explanations.js');
const { executeVerifiedRepairTransaction, TRANSACTION_OUTCOMES } = require('../../scripts/lib/conflict/repair_transactions.js');
const { evaluateWorkloadSizingPilot } = require('../../scripts/lib/conflict/sizing/workload_demand.js');
const { qualifyCandidatesBeforeRanking } = require('../../scripts/lib/conflict/sizing/pareto_ranker.js');
const { performReasoningPostAnalysis } = require('../../scripts/lib/system/reasoning_post_analyzer.js');
const { verifyPrePresentationAcceptance } = require('../../scripts/lib/boq/bom_verifier.js');

const ROOT = path.resolve(__dirname, '../..');

const NEW_SKILL_SPECS = [
  { id: 'requirements-accounting-skill', halt: 'HALT-REQ1', kind: 'CUSTOMER' },
  { id: 'claim-evidence-adjudication-skill', halt: 'HALT-EVD1', kind: 'SHARED' },
  { id: 'constraint-diagnosis-skill', halt: 'HALT-CST1', kind: 'SHARED' },
  { id: 'decision-uncertainty-skill', halt: 'HALT-UNC1', kind: 'SHARED' },
  { id: 'solution-quality-evaluation-skill', halt: 'HALT-SQE1', kind: 'ENGINEERING' }
];

const UPDATED_SKILLS = [
  'presales-query-router',
  'rfp-sizing-synthesizer',
  'workload-dna-skill',
  'self-correction-counterfactual-skill',
  'output-validation-skill',
  'execution-trace-skill',
  'continuous-learning-skill',
  'degraded-mode-skill',
  'workbook-generator-skill'
];

test('SI-09 (a): validate_skills_integrity passes across all 39 skills via module and CLI', () => {
  const report = runValidation({ strictWarnings: true, quiet: true });
  assert.equal(report.total, 39);
  assert.equal(report.failed, 0, JSON.stringify(report.results.filter(r => r.issues.length || r.warnings.length)));
  assert.equal(report.ok, true);

  const scriptPath = path.join(ROOT, 'scripts/maintenance/validate_skills_integrity.js');
  const cli = spawnSync(process.execPath, [scriptPath], { cwd: ROOT, encoding: 'utf8', timeout: 20000 });
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(cli.stdout, /Skills:\s*39\s*\|\s*Passed:\s*39\s*\|\s*Failed:\s*0/);
});

test('SI-09 (b): registry validates cleanly with 39 capabilities, zero cycles, and activation UNUSED', () => {
  const validation = validateRegistry(ROOT);
  assert.equal(validation.valid, true, JSON.stringify(validation.issues));
  assert.equal(validation.summary.capabilities, 39);
  assert.equal(validation.summary.skillDeclarations, 39);
  assert.equal(validation.summary.activation, 'UNUSED');
  assert.equal(registry.activation, 'UNUSED');
  assert.deepEqual(findCycles(registry.capabilities), []);

  const audit = auditRegistry(ROOT);
  assert.equal(audit.validation.valid, true, JSON.stringify(audit.validation.issues));
  assert.equal(audit.summary.unmappedRouterIntents, 0);
  assert.equal(audit.summary.runtimeRegistryConsumers, 0);
});

test('SI-09 (c1): every declared entrypoint export on all 5 new skills resolves to a real callable function', () => {
  for (const spec of NEW_SKILL_SPECS) {
    const cap = registry.capabilities.find(c => c.capabilityId === spec.id);
    assert.ok(cap, `Missing capability ${spec.id}`);
    assert.equal(cap.kind, spec.kind);
    assert.deepEqual(cap.intents, []);
    assert.ok(cap.entrypoints.length >= 2);
    for (const ep of cap.entrypoints) {
      assert.equal(ep.invocation, 'MODULE');
      assert.ok(ep.exportName);
      const loaded = require(path.join(ROOT, ep.path));
      assert.equal(typeof loaded[ep.exportName], 'function', `${ep.path}:${ep.exportName} must be callable`);
    }
  }
});

test('SI-09 (c2): requirements-accounting-skill enforces positive/negative scope and incomplete-pricing gates', () => {
  const reqs = extractRequirementRecords([
    'Minimum 64 cores per node',
    'Budget under $50,000',
    'max 16 DIMMs',
    'High resilience posture mandatory'
  ]);
  assert.equal(reqs.totalClauses, 4);
  assert.equal(reqs.uninterpretedCount, 1);
  assert.equal(reqs.records.find(r => /16 DIMMs/i.test(r.rawText))?.typedValue?.metric, 'dimmCount');

  const incomplete = evaluateCandidateRequirementCoverage({
    skuPartsList: [{ sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 1, unitPriceUsd: null, priceKnown: false }],
    pricingComplete: false,
    totalCostUsd: null
  }, reqs);
  const budgetDisp = incomplete.dispositions.find(d => d.metricResults?.some(m => m.metric === 'budgetUsd'));
  assert.equal(budgetDisp?.disposition, DISPOSITIONS.UNRESOLVED);
  assert.equal(incomplete.blocksPositiveRecommendation, true);

  const strictPricedReqs = extractRequirementRecords(['Minimum 64 cores per node', 'Budget under $50,000']);
  const satisfied = evaluateCandidateRequirementCoverage({
    skuPartsList: [
      { sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 1, unitPriceUsd: 5000, priceKnown: true },
      { sku: 'P74573-B21', description: 'Intel Xeon 6 32-core Processor', quantity: 2, unitPriceUsd: 4000, priceKnown: true }
    ],
    pricingComplete: true,
    totalCostUsd: 13000
  }, strictPricedReqs);
  assert.equal(satisfied.blocksPositiveRecommendation, false);
  assert.equal(satisfied.summary.satisfiedCount, 2);
});

test('SI-09 (c3): claim-evidence-adjudication-skill rejects wrong-generation/ephemeral claims and keeps Tier-3 separate', () => {
  const claim = createClaimRecord({ claimId: 'CLM-1', assertion: 'Gen12 thermal fan kit verified' });
  const wrongGen = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380-gen11',
    passageId: 'p-1',
    passageText: 'Gen11 fan kit note',
    retrievedAt: '2026-11-18T10:00:00Z',
    scope: { product: 'DL380 Gen11', generation: 'Gen11' }
  });
  const selfCitation = createUntrustedInputEvidence({
    sourceId: 'eph-cand-1',
    passageId: 'p-self',
    passageText: 'Candidate says PASS',
    retrievedAt: '2026-11-18T10:00:00Z',
    scope: { product: 'DL380_Gen12', generation: 'Gen12' },
    isEphemeral: true
  });
  const rejected = adjudicateSolutionClaims([claim], [wrongGen, selfCitation], {
    product: 'DL380_Gen12',
    generation: 'Gen12',
    ephemeralSourceId: 'eph-cand-1',
    authoritativeSourceIds: ['qs-dl380-gen12']
  });
  assert.equal(rejected.overallStatus, 'UNKNOWN');
  assert.equal(rejected.counts.rejectedEvidence, 2);

  const validGen12 = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380-gen12',
    passageId: 'p-2',
    passageText: 'DL380 Gen12 High Performance Fan Kit P48820-B21 required above 240W.',
    retrievedAt: '2026-11-18T10:00:00Z',
    scope: { product: 'DL380_Gen12', generation: 'Gen12' }
  });
  const supported = adjudicateSolutionClaims([claim], [validGen12], {
    product: 'DL380_Gen12',
    generation: 'Gen12',
    authoritativeSourceIds: ['qs-dl380-gen12']
  });
  assert.equal(supported.overallStatus, 'SUPPORTED');

  const lanes = buildIndependentEvidenceStates({ claimAdjudication: supported }, { chassis: 'DL380_Gen12' }, {});
  assert.equal(lanes.documentGrounding.status, 'GROUNDED');
  assert.equal(lanes.liveVendorAcceptance.status, 'PORTAL VALIDATION PENDING');
  assert.equal(lanes.liveVendorAcceptance.verified, false);
});

test('SI-09 (c4): constraint-diagnosis-skill preserves UNKNOWN/scope bounds and rolls back regressive repairs', async () => {
  const unknownDiag = diagnoseInfeasibility([
    { constraintId: 'C-ELEC', domain: 'power_environment', status: 'UNKNOWN', hardness: 'HARD', missingInputs: ['inputVoltage'] }
  ], { product: 'DL380_Gen12', catalogRevision: 'rev-1' });
  assert.equal(unknownDiag.outcome, 'UNKNOWN');
  assert.equal(unknownDiag.universalImpossibilityClaimed, false);
  assert.equal(unknownDiag.hardBeforePreferences.blocksPositiveRanking, true);

  const failDiag = diagnoseInfeasibility([
    { constraintId: 'C-THERM', domain: 'compute_thermal', status: 'FAIL', hardness: 'HARD' }
  ], { product: 'DL380_Gen12', catalogRevision: 'rev-1' });
  assert.equal(failDiag.outcome, 'INFEASIBLE_IN_EVALUATED_SCOPE');
  assert.equal(failDiag.universalImpossibilityClaimed, false);

  const baseline = {
    chassis: 'DL380_Gen12',
    items: [{ sku: 'P73282-B21', quantity: 1 }],
    portalReceipt: { status: 'CLIC_ACCEPTED', manifestSha256: 'abc' }
  };
  const rolledBack = await executeVerifiedRepairTransaction(
    baseline,
    { action: 'ADD', sku: 'P48820-B21', quantity: 1 },
    {
      baselineValidation: { criticalErrorCount: 1, isValid: false },
      validateFn: async () => ({ criticalErrorCount: 2, isValid: false })
    }
  );
  assert.equal(rolledBack.outcome, TRANSACTION_OUTCOMES.ROLLED_BACK);
  assert.equal(rolledBack.regressionDetected, true);
  assert.equal(baseline.items.length, 1);

  const accepted = await executeVerifiedRepairTransaction(
    baseline,
    { action: 'ADD', sku: 'P48820-B21', quantity: 1 },
    {
      baselineValidation: { criticalErrorCount: 1, isValid: false },
      validateFn: async () => ({ criticalErrorCount: 0, isValid: true })
    }
  );
  assert.equal(accepted.outcome, TRANSACTION_OUTCOMES.ACCEPTED);
  assert.equal(accepted.receiptInvalidated, true);
  assert.equal(accepted.candidate.portalReceipt, null);
});

test('SI-09 (c5): decision-uncertainty-skill refuses unprofiled extrapolation and disqualifies invalid candidates', () => {
  const unprofiled = evaluateWorkloadSizingPilot({
    workloadFamily: 'SAP_HANA',
    workingSetGb: 1024,
    requiredCores: 64
  });
  assert.equal(unprofiled.pilotCoverage, 'UNPROFILED_REQUIRES_AUTHORITATIVE_SIZING_BASIS');
  assert.equal(unprofiled.extrapolationRefused, true);
  assert.equal(unprofiled.isQualified, false);

  const draft = evaluateWorkloadSizingPilot('Deploy VMware VCF production cluster with N+1 HA');
  assert.equal(draft.sizingStatus, 'SIZING_DRAFT_SCENARIO_RANGE');
  assert.equal(draft.nextRequiredInput, 'workingSetGb');
  assert.equal(draft.isQualified, false);

  const qualified = evaluateWorkloadSizingPilot(
    { workloadFamily: 'VMWARE_VCF', throughputOrConcurrency: { value: 80, unit: 'VMs' }, workingSetGb: 512, requiredCores: 64, growthFactor: 1.0, resilienceMode: 'N+1' },
    { perNodeMemoryGb: 512, perNodeCores: 64, channelWidth: 8, cpuSocketsPerNode: 2, perNodeDimms: 16 }
  );
  assert.equal(qualified.sizingStatus, 'SIZED_QUALIFIED');
  assert.equal(qualified.isQualified, true);

  const preRank = qualifyCandidatesBeforeRanking([
    { candidateId: 'CHEAP-BAD', physicalMathClean: false, priceMetadata: { costUsd: 5000 } },
    { candidateId: 'VALID-GOOD', physicalMathClean: true, priceMetadata: { costUsd: 12000 } }
  ]);
  assert.deepEqual(preRank.qualifiedCandidates.map(c => c.candidateId), ['VALID-GOOD']);
  assert.deepEqual(preRank.disqualifiedCandidates.map(c => c.candidateId), ['CHEAP-BAD']);
});

test('SI-09 (c6): solution-quality-evaluation-skill isolates unverified Tier-3 claims and unknown tracks', () => {
  const analysisUnverified = performReasoningPostAnalysis({
    queryText: 'Verify DL380 Gen12 quote',
    context: { chassisName: 'DL380_Gen12', persistLedger: false, isolatedMode: true },
    classification: { intent: 'BOQ_EVALUATION', confidence: 0.9 },
    responseData: { status: 'PASSED', portalValidationStatus: 'ACCEPTED_BY_VENDOR' },
    traceId: 'TRC-SI09-NEG'
  });
  assert.equal(analysisUnverified.epistemicIntegrity.tier, 'TIER_0_UNTRUSTED_CLAIM');
  assert.equal(analysisUnverified.epistemicIntegrity.vendorAcceptancePending, true);

  const analysisLocal = performReasoningPostAnalysis({
    queryText: 'Verify DL380 Gen12 quote',
    context: { chassisName: 'DL380_Gen12', persistLedger: false, isolatedMode: true },
    classification: { intent: 'BOQ_EVALUATION', confidence: 0.95 },
    responseData: { status: 'PASSED', aspectChecksCompleted: true, errors: [] },
    traceId: 'TRC-SI09-POS'
  });
  assert.equal(analysisLocal.epistemicIntegrity.tier, 'TIER_1_PHYSICAL_SANITY');
  assert.equal(analysisLocal.epistemicIntegrity.vendorAcceptancePending, true);

  const unknownTrack = verifyPrePresentationAcceptance({ items: [] }, 'UNKNOWN_TRACK_PROFILE', {});
  assert.equal(unknownTrack.isValid, false);
  assert.notEqual(unknownTrack.status, 'PASSED');
});

test('SI-09 (d): all 5 new skills and 9 updated skills satisfy boundary, schema, link, offline, and Tier-3 contracts', () => {
  for (const spec of NEW_SKILL_SPECS) {
    const relSkill = `.agents/skills/${spec.id}/SKILL.md`;
    const content = fs.readFileSync(path.join(ROOT, relSkill), 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm && fm.name === spec.id);
    assert.match(fm.description, /\*\*DO call for\*\*:/);
    assert.match(fm.description, /\*\*DO NOT call for\*\*:/);
    assert.ok(content.includes(spec.halt), `${spec.id} must define ${spec.halt}`);
    assert.ok(content.includes('normative_language.md'));
    assert.ok(content.includes('CapabilityHandoffSchema') && content.includes('scripts/lib/system/schemas.js'));
    assert.match(content, /Offline Air-Gap/i);
    assert.match(content, /Tier-3/i);
    assert.match(content, /PORTAL VALIDATION PENDING/);

    const resolvedLinks = extractLinks(content).map(l => resolveLink(ROOT, relSkill, l));
    const broken = resolvedLinks.filter(l => ['MISSING_PATH', 'MISSING_FRAGMENT', 'UNDEFINED_REFERENCE', 'INVALID_ENCODING'].includes(l.status));
    assert.deepEqual(broken, [], `${spec.id} has broken links: ${JSON.stringify(broken)}`);
    assert.ok(resolvedLinks.some(l => l.resolvedPath && l.resolvedPath.startsWith('.agents/skills/') && !l.resolvedPath.includes(spec.id)));
    assert.ok(resolvedLinks.some(l => l.resolvedPath && l.resolvedPath.startsWith('scripts/') && l.resolvedPath.endsWith('.js')));
  }

  for (const skillId of UPDATED_SKILLS) {
    const relSkill = `.agents/skills/${skillId}/SKILL.md`;
    const content = fs.readFileSync(path.join(ROOT, relSkill), 'utf8');
    const resolvedLinks = extractLinks(content).map(l => resolveLink(ROOT, relSkill, l));
    const broken = resolvedLinks.filter(l => ['MISSING_PATH', 'MISSING_FRAGMENT', 'UNDEFINED_REFERENCE', 'INVALID_ENCODING'].includes(l.status));
    assert.deepEqual(broken, [], `${skillId} has broken links: ${JSON.stringify(broken)}`);
    assert.ok(
      NEW_SKILL_SPECS.some(s => content.includes(s.id)),
      `${skillId} must cross-link at least one new SI-09 skill`
    );
  }
});
