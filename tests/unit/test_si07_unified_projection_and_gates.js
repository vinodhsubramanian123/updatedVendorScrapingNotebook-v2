'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx-js-style');

const ROOT = path.resolve(__dirname, '..', '..');

const {
  SCHEMA_VERSION,
  buildSolutionIntelligenceEnvelope,
  projectCustomerDecision,
  extractUncertaintyRecords,
  buildEvidenceSummaryStates,
  isStrictDocumentReviewVerified
} = require('../../scripts/lib/boq/decision_projection.js');
const {
  validateBoqEvaluationCriteria,
  verifyPrePresentationAcceptance
} = require('../../scripts/lib/boq/bom_verifier.js');
const {
  generateMarkdownReport,
  _buildDecisionProjectionSection
} = require('../../scripts/lib/boq/eval_output_serializer.js');
const {
  generateRankedPortalWorkbook,
  generatePartnerPortalUploadBOM,
  generateMultiRankSolutionWorkbook,
  generateProfessionalBOQ
} = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const {
  buildGuardrailSystemPrompt,
  formatGuardrailContextSuffix,
  ACTIVE_VERSION
} = require('../../scripts/lib/prompts/guardrail_prompt.js');
const { _initGuardrailContext } = require('../../scripts/lib/rag/agentic_guardrail.js');
const mcpServer = require('../../scripts/services/mcp_server.js');
const { deliveryFingerprint, solutionFingerprint } = require('../../scripts/lib/boq/solution_evidence.js');
const { issueDeliveryAuthorization } = require('../../scripts/lib/contracts/workflow_contract.js');
const { createClaimRecord, createCatalogObservationEvidence } = require('../../scripts/lib/boq/evidence/claim_records.js');
const { adjudicateSolutionClaims } = require('../../scripts/lib/boq/evidence/source_adjudicator.js');

const tmpRoots = [];
function makeTmpDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpRoots) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  }
});

function buildStrictDocReview() {
  return {
    success: true,
    isCloudGrounded: true,
    sourceDetached: true,
    doubleCheckVerdict: 'DOUBLE_CHECK_PASSED',
    attachment: { isMock: false },
    simulationPassed: false,
    citations: [{ sourceId: 'QS-DL380-G12', excerpt: 'Verified rail kit P69770-B21 for LFF/SFF Gen12 chassis.' }],
    authoritativeSourceIds: ['QS-DL380-G12']
  };
}

function buildBaselineFixture({ offline = false, stale = false, partialDoc = false, incompletePricing = false } = {}) {
  const baseItems = [
    { sku: 'P71632-B21', description: 'HPE DL380 Gen12 8SFF CTO', quantity: 1, unitPriceUsd: 3500 },
    { sku: 'P69770-B21', description: 'HPE Rail Kit', quantity: 1, unitPriceUsd: 150, isFixInjected: true, ruleId: 'RULE-RAIL-01', reason: 'Rack rail kit mandated for Gen12 deployment' }
  ];
  const candParts = [
    { sku: 'P71632-B21', description: 'HPE DL380 Gen12 8SFF CTO', quantity: 1, unitPriceUsd: 3500, priceKnown: true },
    {
      sku: 'P69770-B21',
      description: 'HPE Rail Kit',
      quantity: 2,
      unitPriceUsd: incompletePricing ? 0 : 150,
      priceKnown: !incompletePricing,
      isFixInjected: true,
      ruleId: 'RULE-RAIL-02',
      reason: 'Adjusted rail kit quantity per cluster requirement'
    }
  ];
  const docReview = partialDoc
    ? { success: true }
    : (offline ? null : buildStrictDocReview());

  const evalFixture = {
    chassis: 'DL380_Gen12',
    chassisPrefix: 'DL380_Gen12',
    offlineMode: offline,
    isMathClean: true,
    items: [{ sku: 'P71632-B21', description: 'HPE DL380 Gen12 8SFF CTO', quantity: 1 }],
    aspectChecks: [
      { id: 1, name: 'Compute & Thermal', status: 'PASSED', detail: 'Thermal envelope and TDP checks nominal' },
      { id: 6, name: 'Power & Environment', status: 'PASSED', detail: 'PSU headroom nominal' }
    ],
    resolvedFixes: [
      { sku: 'P69770-B21', quantity: 2, ruleId: 'RULE-RAIL-02', rule: 'Rail kit rule for 2U DL380 Gen12' }
    ],
    requirementAccounting: {
      totalClauses: 2,
      hardRequirementsCount: 2,
      omittedClausesCount: 0,
      violatedHardCount: 0,
      unresolvedHardCount: 0,
      records: [
        { id: 'REQ-1', rawText: 'Must use DL380 Gen12 8SFF chassis', hardness: 'HARD_CONSTRAINT', parseStatus: 'PARSED' },
        { id: 'REQ-2', rawText: 'Include sliding rail kit', hardness: 'HARD_CONSTRAINT', parseStatus: 'PARSED' }
      ],
      ambiguities: [],
      uninterpretedClauses: []
    },
    claimAdjudication: {
      overallStatus: 'SUPPORTED',
      contradictionCount: 0,
      unsupportedMaterialCount: 0,
      claims: [
        { claimId: 'CLM-1', isMaterial: true, supportState: 'SUPPORTED', assertion: 'P69770-B21 fits DL380 Gen12 2U rail mount' }
      ]
    },
    dependencyInvalidation: stale ? { isStale: true, reason: 'Catalog snapshot revised' } : { isStale: false },
    ephemeralSourceValidation: docReview,
    confidenceMetrics: {
      routingScore: 0.98,
      similarityScore: 0.94,
      evidenceCoverage: 1,
      calibratedProbability: null
    },
    conflictGraph: {
      isWholeSolutionValid: true,
      constraintResults: [
        { constraintId: 'CONSTR-COMPUTE-THERMAL', domain: 'compute_thermal', hardness: 'HARD', status: 'PASS' }
      ],
      rankedSolutions: [
        {
          rank: 1,
          name: 'Closest Valid Solution',
          physicalMathClean: true,
          qualifiedForRecommendation: true,
          estimatedCostUsd: incompletePricing ? 0 : 3800,
          pricingComplete: !incompletePricing,
          leadTimeDays: incompletePricing ? null : 7,
          leadTimeStatus: incompletePricing ? 'UNKNOWN' : 'KNOWN',
          skuPartsList: candParts,
          requirementCoverage: {
            summary: { coverageStatus: 'EVALUATED', totalRequirements: 2, satisfiedCount: 2, hardConstraintCount: 2, exclusionCount: 0 },
            dispositions: [
              { requirementId: 'REQ-1', hardness: 'HARD_CONSTRAINT', disposition: 'SATISFIED', reason: 'Exact CTO match' },
              { requirementId: 'REQ-2', hardness: 'HARD_CONSTRAINT', disposition: 'SATISFIED', reason: 'Rail kit present' }
            ]
          },
          tradeOffNotes: ['Minimal change to baseline BOM']
        },
        {
          rank: 5,
          name: 'Value Engineered Alternative',
          physicalMathClean: true,
          qualifiedForRecommendation: true,
          estimatedCostUsd: 3650,
          pricingComplete: true,
          leadTimeDays: 14,
          leadTimeStatus: 'KNOWN',
          skuPartsList: baseItems,
          tradeOffNotes: ['Lower price with longer lead time']
        }
      ]
    },
    acceptanceGate: {
      isValid: !stale,
      checks: [],
      blockers: stale ? [{ id: 'B24', detail: 'Stale dependency invalidation' }] : []
    }
  };

  if (!stale) {
    const fp = deliveryFingerprint(evalFixture);
    evalFixture.manifestFingerprint = fp;
    evalFixture.deliveryAuthorization = issueDeliveryAuthorization({
      manifestFingerprint: fp,
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: { isApproved: true, profile: 'BOQ_EVALUATION' }
    });
  }
  return evalFixture;
}

function loadEvaluationRouterWithTmpOutputs(tmpDir, seededRuns) {
  const routerPath = path.join(ROOT, 'dashboard', 'routes', 'evaluation.cjs');
  const outputsDir = path.resolve(ROOT, 'outputs');
  const localRequire = createRequire(routerPath);
  const sseEvents = [];

  const redirectPath = (target) => {
    if (typeof target !== 'string') return target;
    const resolved = path.resolve(target);
    if (resolved === outputsDir || resolved.startsWith(outputsDir + path.sep)) {
      const rel = path.relative(outputsDir, resolved);
      return path.join(tmpDir, rel);
    }
    return target;
  };

  const sandboxFs = {
    ...fs,
    existsSync: p => fs.existsSync(redirectPath(p)),
    mkdirSync: (p, opts) => fs.mkdirSync(redirectPath(p), opts),
    writeFileSync: (p, data, opts) => fs.writeFileSync(redirectPath(p), data, opts),
    readFileSync: (p, opts) => fs.readFileSync(redirectPath(p), opts),
    renameSync: (a, b) => fs.renameSync(redirectPath(a), redirectPath(b)),
    statSync: p => fs.statSync(redirectPath(p)),
    unlinkSync: p => fs.unlinkSync(redirectPath(p))
  };

  const customRequire = (modId) => {
    if (modId === 'fs') return sandboxFs;
    if (modId === '../services/runState.cjs') {
      return {
        isValidRunId: () => true,
        getRunById: id => seededRuns.get(id) || null,
        runsById: seededRuns
      };
    }
    if (modId === '../services/taskManager.cjs') {
      return {
        isTaskRunning: () => false,
        getActiveTask: () => null,
        broadcastSSE: ev => sseEvents.push(ev),
        releaseTaskMutex: () => {},
        isCancellationRequested: () => false,
        _setActiveTask: () => {},
        getRunSnapshot: () => ({})
      };
    }
    if (modId === '../../scripts/lib/system/telemetry.js') {
      return {
        recordCleansingPreflightTelemetry: () => {},
        recordOcrTelemetry: () => {},
        recordExportTelemetry: () => {},
        loadTelemetry: () => ({})
      };
    }
    if (modId === '../../scripts/lib/system/fs_compat.js') {
      return {
        safeWriteJsonAtomic: (target, payload) => {
          const dest = redirectPath(target);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, JSON.stringify(payload, null, 2), 'utf8');
        }
      };
    }
    if (modId === '../../scripts/lib/boq/generate_boq_xlsx.js') {
      const realGen = localRequire(modId);
      return {
        ...realGen,
        generateProfessionalBOQ: (evalObj, expPath, ch, rk, opts) =>
          realGen.generateProfessionalBOQ(evalObj, redirectPath(expPath), ch, rk, opts)
      };
    }
    return localRequire(modId);
  };

  const mod = { exports: {} };
  const source = fs.readFileSync(routerPath, 'utf8');
  const wrapped = `(function(exports, require, module, __filename, __dirname) {\n${source}\n})`;
  const fn = vm.runInNewContext(wrapped, {
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    Date,
    AbortController,
    URL,
    Intl
  });
  fn(mod.exports, customRequire, mod, routerPath, path.dirname(routerPath));
  return { router: mod.exports, sseEvents };
}

function invokeRouterRoute(router, method, routePath, body) {
  return new Promise((resolve, reject) => {
    const req = {
      method: method.toUpperCase(),
      url: routePath,
      originalUrl: routePath,
      path: routePath,
      body: body || {},
      headers: {},
      query: {},
      params: {}
    };
    let statusCode = 200;
    const res = {
      statusCode: 200,
      headersSent: false,
      status(code) { statusCode = code; this.statusCode = code; return this; },
      json(payload) { this.headersSent = true; resolve({ status: statusCode, body: payload }); return this; },
      send(payload) { this.headersSent = true; resolve({ status: statusCode, body: payload }); return this; },
      setHeader() {}
    };
    router.handle(req, res, (err) => {
      if (err) reject(err);
      else reject(new Error(`Unhandled route ${method} ${routePath}`));
    });
  });
}

describe('SI-07 Unified Decision Projection, Delivery Gates, Exports, Dashboard, Guardrail & MCP Parity', () => {
  it('1) produces identical SolutionIntelligenceEnvelope across projection, Markdown, analytical XLSX & MCP', async () => {
    const fixture = buildBaselineFixture();
    const projected = projectCustomerDecision(fixture);
    const envelope = buildSolutionIntelligenceEnvelope(fixture);

    assert.equal(envelope.schemaVersion, SCHEMA_VERSION);
    assert.deepStrictEqual(projected.outcome, envelope.outcome);
    assert.deepStrictEqual(projected.requirementCoverage, envelope.requirementCoverage);
    assert.deepStrictEqual(projected.evidenceStates, envelope.evidenceStates);
    assert.deepStrictEqual(projected.uncertainties, envelope.uncertainties);
    assert.equal(envelope.outcome.isBuildable, true);
    assert.equal(envelope.evidenceStates.documentGrounding, 'DOUBLE_CHECK_PASSED');
    assert.equal(envelope.evidenceStates.liveVendorAcceptance, 'PORTAL_VALIDATION_PENDING');
    assert.equal(envelope.evidenceStates.dependencyInvalidationStatus, 'VALID');

    const mcpResp = await mcpServer.executeToolRequest({
      params: {
        name: 'get_solution_intelligence_envelope',
        arguments: { eval_result: fixture }
      }
    });
    assert.ok(!mcpResp.isError, mcpResp.content?.[0]?.text);
    const mcpEnvelope = JSON.parse(mcpResp.content[0].text);
    assert.deepStrictEqual(mcpEnvelope.outcome, projected.outcome);
    assert.deepStrictEqual(mcpEnvelope.requirementCoverage, projected.requirementCoverage);
    assert.deepStrictEqual(mcpEnvelope.evidenceStates, projected.evidenceStates);
    assert.deepStrictEqual(mcpEnvelope.uncertainties, projected.uncertainties);

    const simResp = await mcpServer.executeToolRequest({
      params: {
        name: 'simulate_build',
        arguments: {
          chassis_id: 'DL380_Gen12',
          items_json: JSON.stringify([{ sku: 'P71632-B21', description: 'HPE DL380 Gen12 8SFF CTO', qty: 1 }])
        }
      }
    });
    assert.ok(!simResp.isError);
    const simParsed = JSON.parse(simResp.content[0].text);
    assert.ok(simParsed.solutionIntelligence);
    assert.equal(simParsed.solutionIntelligence.schemaVersion, '1.0');

    const md = generateMarkdownReport({
      evalResults: fixture,
      items: fixture.items,
      graph: fixture.conflictGraph,
      budgetOpt: null,
      targetBudgetUsd: null,
      chassisDir: null
    });
    assert.ok(md.includes('## 📊 3.8 Decision & Evidence Projection'));
    assert.ok(md.includes('REQ-1'));
    assert.ok(md.includes('P69770-B21'));
    assert.ok(md.includes('DOUBLE_CHECK_PASSED'));
    assert.ok(md.includes('PORTAL_VALIDATION_PENDING'));
    assert.ok(!md.includes('undefined'));

    const tmpDir = makeTmpDir('si07-xlsx-');
    const multiPath = path.join(tmpDir, 'multi_rank.xlsx');
    const profPath = path.join(tmpDir, 'prof_rank1.xlsx');

    const wbMulti = generateMultiRankSolutionWorkbook(fixture, multiPath, 'DL380_Gen12');
    assert.ok(wbMulti.SheetNames.includes('Decision & Evidence'));
    const multiRows = XLSX.utils.sheet_to_json(wbMulti.Sheets['Decision & Evidence'], { header: 1 });
    const multiText = multiRows.flat().map(v => String(v ?? '')).join('\n');
    assert.ok(multiText.includes(projected.outcome.disposition));
    assert.ok(multiText.includes('DOUBLE_CHECK_PASSED'));
    assert.ok(multiText.includes('PORTAL_VALIDATION_PENDING'));
    assert.ok(multiText.includes('P69770-B21'));

    generateProfessionalBOQ(fixture, profPath, 'DL380_Gen12', 1);
    const wbProf = XLSX.readFile(profPath);
    assert.ok(wbProf.SheetNames.includes('Decision & Evidence'));
  });

  it('2) strictly preserves 7-column Partner Portal upload workbooks without adding extra sheets or columns', () => {
    const fixture = buildBaselineFixture();
    const tmpDir = makeTmpDir('si07-portal-');
    const rankedPortalPath = path.join(tmpDir, 'ranked_portal.xlsx');
    const singlePortalPath = path.join(tmpDir, 'single_portal.xlsx');

    const wbRanked = generateRankedPortalWorkbook(fixture, rankedPortalPath, 'DL380_Gen12');
    assert.ok(!wbRanked.SheetNames.includes('Decision & Evidence'));
    for (const sheetName of wbRanked.SheetNames) {
      const ref = wbRanked.Sheets[sheetName]['!ref'];
      const range = XLSX.utils.decode_range(ref);
      assert.equal(range.e.c + 1, 7, `${sheetName} must keep exact 7 columns`);
    }

    const wbPartner = generatePartnerPortalUploadBOM(
      fixture,
      singlePortalPath,
      { chassisKey: 'DL380_Gen12', profile: 'BOQ_EVALUATION' }
    );
    assert.equal(wbPartner.SheetNames.length, 1);
    assert.ok(!wbPartner.SheetNames.includes('Decision & Evidence'));
    const partnerRange = XLSX.utils.decode_range(wbPartner.Sheets[wbPartner.SheetNames[0]]['!ref']);
    assert.equal(partnerRange.e.c + 1, 7);
  });

  it('3) emits NOT_EVALUATED / NO_CLAIMS_RECORDED with zero fabricated claims on empty inputs across all surfaces', async () => {
    for (const emptyInput of [null, undefined, {}]) {
      const env = buildSolutionIntelligenceEnvelope(emptyInput);
      assert.deepStrictEqual(env.outcome, {
        disposition: 'NOT_EVALUATED',
        isBuildable: false,
        selectedRank: null,
        candidateCount: 0,
        summary: 'NO_CLAIMS_RECORDED'
      });
      assert.deepStrictEqual(env.changesAndRationales, []);
      assert.deepStrictEqual(env.alternatives, []);
      assert.deepStrictEqual(extractUncertaintyRecords(emptyInput), []);
    }

    const emptySection = _buildDecisionProjectionSection({});
    assert.ok(emptySection.includes('NOT_EVALUATED'));
    assert.ok(emptySection.includes('NO_CLAIMS_RECORDED'));
    assert.ok(!emptySection.includes('undefined'));

    const emptyMd = generateMarkdownReport({ evalResults: {} });
    assert.ok(emptyMd.includes('NO_CLAIMS_RECORDED'));
    assert.ok(!emptyMd.includes('undefined'));

    const mcpResp = await mcpServer.executeToolRequest({
      params: { name: 'get_solution_intelligence_envelope', arguments: {} }
    });
    const mcpEnv = JSON.parse(mcpResp.content[0].text);
    assert.equal(mcpEnv.outcome.disposition, 'NOT_EVALUATED');
    assert.equal(mcpEnv.outcome.summary, 'NO_CLAIMS_RECORDED');
  });

  it('4) keeps offline & partial evidence strictly separated and preserves null costs/lead-times & separate confidence metrics', () => {
    const offlineFixture = buildBaselineFixture({ offline: true, incompletePricing: true });
    const proj = projectCustomerDecision(offlineFixture);

    assert.equal(proj.evidenceStates.localPhysicalChecks, 'PASSED');
    assert.equal(proj.evidenceStates.documentGrounding, 'NOT_RUN_LOCAL_ONLY');
    assert.equal(proj.evidenceStates.cloudSynchronization, 'NOT_RUN_LOCAL_ONLY');
    assert.equal(proj.evidenceStates.liveVendorAcceptance, 'PORTAL_VALIDATION_PENDING');

    assert.equal(proj.alternatives[0].costUsd, null);
    assert.equal(proj.alternatives[0].pricingComplete, false);
    assert.equal(proj.alternatives[0].leadTimeDays, null);
    assert.equal(proj.alternatives[0].leadTimeStatus, 'UNKNOWN');

    const kinds = new Set(proj.uncertainties.map(u => u.kind));
    assert.ok(kinds.has('PRICING_INCOMPLETE'));
    assert.ok(kinds.has('LEAD_TIME_GAP'));
    assert.ok(kinds.has('DOCUMENT_GROUNDING_INCOMPLETE'));
    assert.ok(kinds.has('PORTAL_VALIDATION_PENDING'));

    assert.deepStrictEqual(proj.confidenceMetrics, {
      routingScore: 0.98,
      similarityScore: 0.94,
      evidenceCoverage: 1,
      calibratedProbability: null
    });
  });

  it('5) enforces BOM verifier B22, B23, and B24 BLOCK gates while keeping legacy outputs compatible', () => {
    const baseValid = {
      chassis: 'DL380_Gen12',
      items: [{ sku: 'P71632-B21', description: 'CTO', qty: 1 }],
      aspectChecks: [1, 2, 3, 4, 5, 6, 7].map(id => ({ id, name: `A${id}`, status: 'PASSED' })),
      conflictGraph: {
        rankedSolutions: [{
          rank: 1,
          name: 'Valid',
          physicalMathClean: true,
          skuPartsList: [{ sku: 'P71632-B21', qty: 1, unitPriceUsd: 3500 }],
          totalOrderCostUsd: 3500
        }]
      },
      notebookLmStatus: { isGrounded: true }
    };
    const legacyChecks = validateBoqEvaluationCriteria(baseValid, { profile: 'BOQ_EVALUATION' });
    assert.ok(Array.isArray(legacyChecks));
    assert.ok(!legacyChecks.some(c => ['B22', 'B23', 'B24'].includes(c.id)));

    const omittedArtifact = {
      ...baseValid,
      requirementAccounting: { totalClauses: 3, hardRequirementsCount: 3, omittedClausesCount: 1, violatedHardCount: 0, unresolvedHardCount: 0 }
    };
    const b22FailChecks = validateBoqEvaluationCriteria(omittedArtifact, { profile: 'BOQ_EVALUATION' });
    const b22Check = b22FailChecks.find(c => c.id === 'B22');
    assert.equal(b22Check.status, 'FAILED');
    assert.equal(b22Check.severity, 'BLOCK');
    assert.equal(verifyPrePresentationAcceptance(omittedArtifact, { profile: 'BOQ_EVALUATION' }).isValid, false);

    const unresolvedArtifact = {
      ...baseValid,
      requirementAccounting: { totalClauses: 2, hardRequirementsCount: 2, omittedClausesCount: 0, violatedHardCount: 0, unresolvedHardCount: 1 }
    };
    const b22ActionChecks = validateBoqEvaluationCriteria(unresolvedArtifact, { profile: 'BOQ_EVALUATION' });
    assert.equal(b22ActionChecks.find(c => c.id === 'B22').status, 'ACTION_REQUIRED');
    assert.equal(verifyPrePresentationAcceptance(unresolvedArtifact, { profile: 'BOQ_EVALUATION' }).isValid, false);

    const claimArtifact = {
      ...baseValid,
      claimAdjudication: {
        claims: [{ claimId: 'C1', isMaterial: true, supportState: 'UNSUPPORTED', assertion: 'Unsupported claim' }],
        unsupportedMaterialCount: 1,
        contradictionCount: 0
      }
    };
    const b23FailChecks = validateBoqEvaluationCriteria(claimArtifact, { profile: 'BOQ_EVALUATION' });
    assert.equal(b23FailChecks.find(c => c.id === 'B23').status, 'FAILED');
    assert.equal(verifyPrePresentationAcceptance(claimArtifact, { profile: 'BOQ_EVALUATION' }).isValid, false);

    const staleArtifact = {
      ...baseValid,
      dependencyInvalidation: { isStale: true, reason: 'Catalog changed after run' }
    };
    const b24FailChecks = validateBoqEvaluationCriteria(staleArtifact, { profile: 'BOQ_EVALUATION' });
    assert.equal(b24FailChecks.find(c => c.id === 'B24').status, 'FAILED');

    const fullGate = verifyPrePresentationAcceptance(staleArtifact, { profile: 'BOQ_EVALUATION' });
    assert.equal(fullGate.isValid, false);
  });

  it('6) rejects partial docReview on strict validator, evidence states, and dashboard /export-boq; blocks stale export with HTTP 409', async () => {
    assert.equal(isStrictDocumentReviewVerified({ success: true }), false);
    assert.equal(isStrictDocumentReviewVerified({ ...buildStrictDocReview(), attachment: { isMock: true } }), false);
    assert.equal(isStrictDocumentReviewVerified({ ...buildStrictDocReview(), simulationPassed: true }), false);
    assert.equal(isStrictDocumentReviewVerified({ ...buildStrictDocReview(), citations: [] }), false);
    assert.equal(isStrictDocumentReviewVerified(buildStrictDocReview()), true);

    const partialProj = buildEvidenceSummaryStates(buildBaselineFixture({ partialDoc: true }));
    assert.equal(partialProj.documentGrounding, 'INCOMPLETE_EVIDENCE');

    const tmpDir = makeTmpDir('si07-route-');
    const runs = new Map();
    const { router } = loadEvaluationRouterWithTmpOutputs(tmpDir, runs);

    const partialEval = buildBaselineFixture({ partialDoc: true });
    runs.set('run_partial', {
      runId: 'run_partial',
      product: 'DL380_Gen12',
      result: { data: { chassis: 'DL380_Gen12', evalResults: partialEval } }
    });
    const partialRes = await invokeRouterRoute(router, 'POST', '/export-boq', {
      runId: 'run_partial',
      chassisId: 'DL380_Gen12',
      rankTier: 1
    });
    assert.equal(partialRes.status, 200);
    assert.equal(partialRes.body.evidenceState.candidateDocumentReview, 'INCOMPLETE_EVIDENCE');
    assert.notEqual(partialRes.body.evidenceState.candidateDocumentReview, 'VERIFIED');
    assert.ok(partialRes.body.solutionIntelligence);
    assert.equal(partialRes.body.solutionIntelligence.evidenceStates.documentGrounding, 'INCOMPLETE_EVIDENCE');

    const staleEval = buildBaselineFixture({ stale: true });
    runs.set('run_stale', {
      runId: 'run_stale',
      product: 'DL380_Gen12',
      result: { data: { chassis: 'DL380_Gen12', evalResults: staleEval } }
    });
    const staleRes = await invokeRouterRoute(router, 'POST', '/export-boq', {
      runId: 'run_stale',
      chassisId: 'DL380_Gen12',
      rankTier: 1
    });
    assert.equal(staleRes.status, 409);
    assert.equal(staleRes.body.code || staleRes.body.error?.code, 'STALE_INVALIDATED_DEPENDENCY');
  });

  it('7) preserves legacy guardrail prompts and appends hard requirements & flagged constraints when present', () => {
    assert.equal(ACTIVE_VERSION, 'v3');
    const baseV3 = buildGuardrailSystemPrompt('DL380_Gen12');
    assert.equal(buildGuardrailSystemPrompt('DL380_Gen12', 'v3', null), baseV3);
    assert.equal(buildGuardrailSystemPrompt('DL380_Gen12', 'v3', {}), baseV3);
    assert.equal(formatGuardrailContextSuffix(null), '');

    const promptContext = {
      requirementAccounting: {
        totalClauses: 2,
        hardRequirementsCount: 1,
        omittedClausesCount: 0,
        violatedHardCount: 1,
        unresolvedHardCount: 0,
        records: [
          { id: 'REQ-10', rawText: 'Require redundant 1600W Titanium PSU', hardness: 'HARD_CONSTRAINT' },
          { id: 'REQ-11', rawText: 'Prefer shorter lead time', hardness: 'PREFERENCE' }
        ]
      },
      constraintResults: [
        { constraintId: 'CONSTR-PSU-01', status: 'FAIL', hardness: 'HARD', message: 'Mixed Titanium and Platinum PSUs' },
        { constraintId: 'CONSTR-THERMAL-01', status: 'UNKNOWN', hardness: 'HARD', message: 'Ambient temp missing' },
        { constraintId: 'CONSTR-CPU-01', status: 'PASS', hardness: 'HARD', message: 'Dual identical CPUs verified' }
      ]
    };

    const enriched = buildGuardrailSystemPrompt('DL380_Gen12', 'v3', promptContext);
    assert.ok(enriched.startsWith(baseV3));
    assert.ok(enriched.includes('REQ-10'));
    assert.ok(!enriched.includes('REQ-11'));
    assert.ok(enriched.includes('CONSTR-PSU-01 | FAIL | HARD'));
    assert.ok(enriched.includes('CONSTR-THERMAL-01 | UNKNOWN | HARD'));
    assert.ok(!enriched.includes('CONSTR-CPU-01'));

    const fakeChassisDir = path.join(makeTmpDir('si07-chassis-'), 'DL380_Gen12');
    fs.mkdirSync(fakeChassisDir, { recursive: true });
    fs.writeFileSync(path.join(fakeChassisDir, 'DL380_Gen12_Catalog.json'), JSON.stringify({
      catalogName: 'DL380_Gen12',
      options: []
    }), 'utf8');

    const bundle = _initGuardrailContext(
      [{ sku: 'P71632-B21', description: 'CTO', qty: 1 }],
      fakeChassisDir,
      { apiKey: 'test-key-offline', totalKeys: 1 },
      promptContext
    );
    assert.ok(bundle.rotationState.systemInstruction.includes('REQ-10'));
    assert.ok(bundle.rotationState.systemInstruction.includes('CONSTR-PSU-01'));
  });

  it('8) interoperates with real SI-03 adjudicateSolutionClaims UNKNOWN outputs and syncs constraintResults FAIL/UNKNOWN with outcome buildability', () => {
    const wrongGenEvidence = createCatalogObservationEvidence({
      sourceId: 'CAT-GEN11',
      product: 'DL380_Gen11',
      generation: 'Gen11',
      excerpt: 'Gen11 PSU support',
      statement: 'Supports X'
    });
    const realUnknownAdj = adjudicateSolutionClaims(
      [createClaimRecord({ assertion: 'Supports X' })],
      [wrongGenEvidence],
      { product: 'DL380_Gen12', generation: 'Gen12' }
    );
    assert.equal(realUnknownAdj.overallStatus, 'UNKNOWN');
    assert.equal(realUnknownAdj.claims[0].status, 'UNKNOWN');
    assert.equal(realUnknownAdj.claims[0].isSupported, false);

    const adjArtifact = {
      chassis: 'DL380_Gen12',
      items: [{ sku: 'P71632-B21', description: 'CTO', qty: 1 }],
      aspectChecks: [1, 2, 3, 4, 5, 6, 7].map(id => ({ id, name: `A${id}`, status: 'PASSED' })),
      conflictGraph: {
        rankedSolutions: [{
          rank: 1,
          name: 'Valid',
          physicalMathClean: true,
          skuPartsList: [{ sku: 'P71632-B21', qty: 1, unitPriceUsd: 3500 }],
          totalOrderCostUsd: 3500
        }]
      },
      notebookLmStatus: { isGrounded: true },
      claimAdjudication: realUnknownAdj
    };
    const b23Unknown = validateBoqEvaluationCriteria(adjArtifact, { profile: 'BOQ_EVALUATION' }).find(c => c.id === 'B23');
    assert.equal(b23Unknown.status, 'ACTION_REQUIRED');
    assert.equal(b23Unknown.severity, 'BLOCK');
    assert.equal(verifyPrePresentationAcceptance(adjArtifact, { profile: 'BOQ_EVALUATION' }).isValid, false);

    const unknownClaimProj = projectCustomerDecision({ ...buildBaselineFixture(), claimAdjudication: realUnknownAdj });
    assert.equal(unknownClaimProj.outcome.isBuildable, false);
    assert.equal(unknownClaimProj.outcome.disposition, 'ACTION_REQUIRED');

    const infoOnlyAdj = adjudicateSolutionClaims(
      [createClaimRecord({ assertion: 'Optional cosmetic note', materiality: 'INFORMATIONAL' })],
      [wrongGenEvidence],
      { product: 'DL380_Gen12', generation: 'Gen12' }
    );
    const infoCheck = validateBoqEvaluationCriteria({ ...adjArtifact, claimAdjudication: infoOnlyAdj }, { profile: 'BOQ_EVALUATION' }).find(c => c.id === 'B23');
    assert.equal(infoCheck.status, 'PASSED');
    assert.equal(projectCustomerDecision({ ...buildBaselineFixture(), claimAdjudication: infoOnlyAdj }).outcome.isBuildable, true);

    const baseNoTopMath = buildBaselineFixture();
    delete baseNoTopMath.isMathClean;
    const failedConstraintProj = projectCustomerDecision({
      ...baseNoTopMath,
      conflictGraph: {
        ...baseNoTopMath.conflictGraph,
        constraintResults: [{ constraintId: 'CONSTR-PSU', hardness: 'HARD', status: 'FAIL', detail: 'Mixed PSU wattage' }]
      }
    });
    assert.equal(failedConstraintProj.evidenceStates.localPhysicalChecks, 'FAILED');
    assert.equal(failedConstraintProj.outcome.isBuildable, false);
    assert.equal(failedConstraintProj.outcome.disposition, 'DELIVERY_BLOCKED_UNBUILDABLE');

    const unknownConstraintProj = projectCustomerDecision({
      ...baseNoTopMath,
      conflictGraph: {
        ...baseNoTopMath.conflictGraph,
        constraintResults: [{ constraintId: 'CONSTR-PSU', hardness: 'HARD', status: 'UNKNOWN', missingInputs: ['psuWattage'] }]
      }
    });
    assert.equal(unknownConstraintProj.evidenceStates.localPhysicalChecks, 'INCOMPLETE');
    assert.equal(unknownConstraintProj.outcome.isBuildable, false);
    assert.equal(unknownConstraintProj.outcome.disposition, 'ACTION_REQUIRED');
    assert.ok(!unknownConstraintProj.outcome.summary.includes('Local physical checks passed'));
  });

  it('9) solution_evidence binds dependencyInvalidation & solutionIntelligence cleanly without breaking legacy fingerprints', () => {
    const legacyBase = {
      chassis: 'DL380_Gen12',
      items: [{ sku: 'P71632-B21', quantity: 1 }],
      conflictGraph: { rankedSolutions: [{ rank: 1, skuList: [{ sku: 'P71632-B21', quantity: 1 }] }] }
    };
    const fpLegacy1 = deliveryFingerprint(legacyBase);
    const fpLegacy2 = deliveryFingerprint({ ...legacyBase });
    assert.equal(fpLegacy1, fpLegacy2);

    const fpRev1 = deliveryFingerprint({
      ...legacyBase,
      dependencyInvalidation: { isStale: false, indexRevisionSha256: 'rev-1' },
      solutionIntelligence: projectCustomerDecision(legacyBase)
    });
    const fpStale = deliveryFingerprint({
      ...legacyBase,
      dependencyInvalidation: { isStale: true, indexRevisionSha256: 'rev-2' },
      solutionIntelligence: projectCustomerDecision(legacyBase)
    });
    assert.notEqual(fpRev1, fpLegacy1);
    assert.notEqual(fpStale, fpRev1);

    const sfpValid = solutionFingerprint({
      ...legacyBase,
      dependencyInvalidation: { isStale: false, indexRevisionSha256: 'rev-1' }
    });
    const sfpStale = solutionFingerprint({
      ...legacyBase,
      dependencyInvalidation: { isStale: true, indexRevisionSha256: 'rev-1' }
    });
    assert.notEqual(sfpStale, sfpValid);
  });
});
