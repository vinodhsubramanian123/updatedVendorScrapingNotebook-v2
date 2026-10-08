'use strict';
// CP5 fixtures for independent Antigravity/Gemini execution; no customer pipeline.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const { RESPONSE_PROFILES, getPresalesResponseProfile } = require('../../scripts/lib/boq/presales_response_profiles.js');
const { adaptPresalesResponse, EVIDENCE_DOMAINS } = require('../../scripts/lib/contracts/presales_response_adapter.js');
const { verifyPresalesResponseAcceptance } = require('../../scripts/lib/boq/presales_response_validator.js');
const { isWithin } = require('../../scripts/maintenance/skill_workflow/io.js');
const root = path.resolve(__dirname, '../..');
const samples = {
  FREEFORM_QA: { answer: 'Fixture answer; grounding remains unknown.' },
  BOQ_EVALUATION: { items: [{ sku: 'FIXTURE-SKU', quantity: 1 }] },
  RFP_SIZING_TO_BOM: { status: 'SIZING_DRAFT', candidateBOM: [{ sku: 'FIXTURE-SKU' }] },
  BOM_RECONCILIATION: { isTwoBaselineComparison: true, auditReport: { discrepancies: { pricingGaps: ['Unquoted fixture'] } } },
  CATALOG_INTELLIGENCE: { pricingTrail: { observed: 'Fixture history' } },
  OCR_QUOTE_INGESTION: { extractedItems: [{ sourcePage: 1, text: 'Fixture OCR' }] },
  HETEROGENEOUS_TENDER_MODERNIZATION: { status: 'DRAFT_VALIDATION_REQUIRED', carrierFleetSummary: { totalPools: 1 } },
  CROSS_VENDOR_TRANSFORMATION: { status: 'CANDIDATE_EVALUATION_REQUIRED', competitorSpec: { cores: 8 }, auditReport: { status: 'NOT_EVALUATED' } },
  WORKLOAD_DNA: { status: 'ADVISORY', dna: { primaryWorkload: 'Fixture' } },
  VALUE_ENGINEERING: { status: 'ADVISORY', budgetOptimization: { status: 'UNPRICED_OPPORTUNITY' } },
  LEAST_DELTA_SYNTHESIS: { status: 'CANDIDATE_REVIEW_REQUIRED', leastDeltaCandidate: { skuPartsList: [{ sku: 'FIXTURE-SKU' }] } },
  MULTI_CLUSTER_TENDER: { status: 'DRAFT_VALIDATION_REQUIRED', clusterAnalysis: { totalServers: 2, powerEnvelopeKw: null } },
  ADVERSARIAL_VALIDATION: { generatedBoq: [{ sku: 'SYNTHETIC' }], evaluation: { totalIssuesCaught: 0 } },
  WORKBOOK_GENERATION: { status: 'GENERATED_DRAFT', exportPath: 'outputs/fixture.xlsx' },
  REMARKS_RECONCILIATION: { status: 'FORMATTED', outputRows: [['Fixture', 1]] },
  CONTINUOUS_LEARNING: { feedbackProcessed: { status: 'PENDING', lessonId: 'fixture' } },
  KNOWLEDGE_SYNC: { status: 'INSPECTED', drift: { localRules: 0 } }
};

for (const [intent, payload] of Object.entries(samples)) {
  test(`${intent}: useful response structure never grants delivery or implied evidence PASS`, () => {
    const response = adaptPresalesResponse(payload, { intent });
    const acceptance = verifyPresalesResponseAcceptance(response);
    assert.equal(acceptance.responseValid, true, JSON.stringify(acceptance.issues));
    assert.equal(acceptance.deliveryAuthorized, false);
    assert.equal(response.deliveryAuthorized, false);
    assert.strictEqual(response.legacy, payload);
    assert.ok(EVIDENCE_DOMAINS.every(domain => response.evidenceStates[domain].status === 'UNKNOWN'));
  });
}

test('profiles are immutable; unknown intents and empty profiles cannot silently pass', () => {
  assert.equal(Object.keys(RESPONSE_PROFILES).length, 17);
  assert.equal(getPresalesResponseProfile('catalog-intelligence').profileId, 'CATALOG_INTELLIGENCE');
  assert.equal(getPresalesResponseProfile('constructor'), null);
  assert.throws(() => { RESPONSE_PROFILES.CATALOG_INTELLIGENCE.contentFields.push('status'); }, TypeError);
  assert.equal(verifyPresalesResponseAcceptance(adaptPresalesResponse({ message: 'Opaque' }, { intent: 'NEW_ROUTE' })).responseValid, false);
  assert.equal(verifyPresalesResponseAcceptance(adaptPresalesResponse({ status: 'PASSED', isApproved: true }, { intent: 'BOQ_EVALUATION' })).responseValid, false);
});

test('input-required diagnostic requires a reason and next action, not a workbook or physical PASS', () => {
  const response = adaptPresalesResponse({ status: 'INPUT_REQUIRED', message: 'Supply the vendor quote and tender.' }, { intent: 'BOM_RECONCILIATION' });
  assert.equal(response.profileId, 'DIAGNOSTIC_ADVISORY');
  assert.equal(response.executionStatus, 'ACTION_REQUIRED');
  assert.equal(verifyPresalesResponseAcceptance(response).responseValid, true);
  response.diagnosticReason = null;
  assert.equal(verifyPresalesResponseAcceptance(response).responseValid, false);
});

test('unbuildable ACTION_REQUIRED diagnostic and fatal ERROR retain separate execution states', () => {
  const blocked = adaptPresalesResponse({ status: 'ACTION_REQUIRED', customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE', message: 'Missing required enablement.' }, { intent: 'BOQ_EVALUATION' });
  assert.equal(blocked.executionStatus, 'ACTION_REQUIRED');
  assert.equal(verifyPresalesResponseAcceptance(blocked).responseValid, true);
  const fatal = adaptPresalesResponse({ status: 'ERROR', error: 'Engine failed.' }, { intent: 'BOQ_EVALUATION' });
  assert.equal(fatal.executionStatus, 'FAILED');
  assert.equal(verifyPresalesResponseAcceptance(fatal).responseValid, true); // Useful failure report, not successful hardware evaluation.
  assert.equal(fatal.legacy.status, 'ERROR');
  const both = adaptPresalesResponse({ status: 'ERROR', customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE', error: 'Engine failed while preparing diagnostics.' }, { intent: 'BOQ_EVALUATION' });
  assert.equal(both.executionStatus, 'FAILED');
});

test('unknown and malformed legacy statuses are preserved without default success or crashes', () => {
  for (const status of [null, false, [], 'FUTURE_STATUS']) {
    const raw = { status, answer: 'Fixture answer' };
    const response = adaptPresalesResponse(raw, { intent: 'FREEFORM_QA' });
    assert.equal(response.executionStatus, 'UNKNOWN');
    assert.strictEqual(response.legacy.status, status);
  }
  for (const raw of [null, undefined, [], 'text']) assert.equal(verifyPresalesResponseAcceptance(adaptPresalesResponse(raw, { intent: 'FREEFORM_QA' })).responseValid, false);
});

test('explicit router-envelope adapter preserves classification, result, acceptance and unknown legacy fields', () => {
  const result = { answer: 'Fixture', acceptanceGate: { isValid: false }, customField: 42 };
  const legacy = Object.freeze({ classification: Object.freeze({ intent: 'FREEFORM_QA', confidence: 0.123 }), result: Object.freeze(result), status: 'FUTURE_TOP_STATUS', traceId: 'original' });
  const response = adaptPresalesResponse(legacy, { inputKind: 'ROUTER_ENVELOPE' });
  assert.strictEqual(response.legacy, legacy);
  assert.strictEqual(response.payload, result);
  assert.equal(response.intent, 'FREEFORM_QA');
  assert.equal(response.legacy.classification.confidence, 0.123);
  assert.equal(result.customField, 42);
  assert.equal(result.acceptanceGate.isValid, false);
  assert.equal(adaptPresalesResponse(legacy).intent, null); // Wrapper not guessed.
});

test('badges, portal paths and legacy approvals never manufacture evidence or delivery authority', () => {
  const response = adaptPresalesResponse({ ...samples.WORKBOOK_GENERATION, isApproved: true, deliveryAuthorization: { signature: 'fixture' }, portalValidationStatus: 'PASSED', documentGrounding: true }, { intent: 'WORKBOOK_GENERATION' });
  assert.ok(EVIDENCE_DOMAINS.every(d => response.evidenceStates[d].status === 'UNKNOWN'));
  assert.equal(verifyPresalesResponseAcceptance(response).deliveryAuthorized, false);
});

test('affirmative evidence declarations require references and remain explicitly source-declared', () => {
  const missing = adaptPresalesResponse(samples.FREEFORM_QA, { intent: 'FREEFORM_QA', evidenceStates: { portalAcceptance: { status: 'PASSED', evidenceRefs: [] } } });
  assert.equal(missing.evidenceStates.portalAcceptance.status, 'UNKNOWN');
  assert.equal(verifyPresalesResponseAcceptance(missing).responseValid, false);
  const declared = adaptPresalesResponse(samples.FREEFORM_QA, { intent: 'FREEFORM_QA', evidenceStates: { documentGrounding: { status: 'PASSED', evidenceRefs: ['fixture-source'] } } });
  assert.equal(declared.evidenceStates.documentGrounding.verification, 'SOURCE_DECLARATION_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(declared.evidenceStates.portalAcceptance.status, 'UNKNOWN');
  assert.equal(declared.deliveryAuthorized, false);
});

test('forged or incomplete response metadata is rejected rather than trusted', () => {
  const response = adaptPresalesResponse(samples.FREEFORM_QA, { intent: 'FREEFORM_QA' });
  response.evidenceStates.delivery = { status: 'PASSED', evidenceRefs: [] };
  response.profileId = 'WRONG_PROFILE';
  response.deliveryAuthorized = true;
  assert.equal(verifyPresalesResponseAcceptance(response).responseValid, false);
  assert.equal(verifyPresalesResponseAcceptance(response).deliveryAuthorized, false);
  assert.equal(verifyPresalesResponseAcceptance(null).responseStatus, 'INVALID');
});

test('malformed adapter options and unsupported evidence verification cannot silently pass', () => {
  for (const options of [{ inputKind: 'GUESSED_WRAPPER' }, { evidenceStates: [] }, { unresolvedRequirements: [false] }]) {
    const response = adaptPresalesResponse(samples.FREEFORM_QA, { intent: 'FREEFORM_QA', ...options });
    assert.equal(verifyPresalesResponseAcceptance(response).responseValid, false);
  }
  const response = adaptPresalesResponse(samples.FREEFORM_QA, { intent: 'FREEFORM_QA' });
  response.evidenceStates.portalAcceptance = { status: 'PASSED', evidenceRefs: ['unverified'], verification: 'INDEPENDENTLY_VERIFIED' };
  assert.equal(verifyPresalesResponseAcceptance(response).responseValid, false);
});

test('OCR ready descriptor and learning subsystem readiness are not completed extraction/learning', () => {
  const ocr = adaptPresalesResponse({ status: 'READY_FOR_OCR', filePath: 'fixture.pdf', message: 'Input identified; OCR pending.' }, { intent: 'OCR_QUOTE_INGESTION' });
  assert.equal(ocr.executionStatus, 'ACTION_REQUIRED');
  assert.equal(ocr.responseDisposition, 'DIAGNOSTIC');
  assert.equal(ocr.evidenceStates.localValidation.status, 'UNKNOWN');
  const ready = adaptPresalesResponse({ feedbackProcessed: null, message: 'Ready for learning.' }, { intent: 'CONTINUOUS_LEARNING' });
  assert.equal(ready.executionStatus, 'UNKNOWN');
  assert.equal(verifyPresalesResponseAcceptance(ready).responseValid, false);
});

test('single-file audit never becomes a two-baseline comparison or a fabricated price delta', () => {
  const raw = { status: 'SINGLE_FILE_AUDIT', isTwoBaselineComparison: false, auditReport: { discrepancies: { pricingGaps: ['Missing quote'] }, summary: { netPriceDeltaUsd: null } } };
  const response = adaptPresalesResponse(raw, { intent: 'BOM_RECONCILIATION' });
  assert.equal(verifyPresalesResponseAcceptance(response).responseValid, true);
  assert.equal(response.payload.isTwoBaselineComparison, false);
  assert.equal(response.payload.auditReport.summary.netPriceDeltaUsd, null);
});

test('cancelled result and unresolved requirements remain visible', () => {
  const response = adaptPresalesResponse({ status: 'CANCELLED', message: 'Customer cancelled.', unresolvedRequirements: ['Quantity scope unresolved'] }, { intent: 'MULTI_CLUSTER_TENDER' });
  assert.equal(response.executionStatus, 'CANCELLED');
  assert.deepEqual(response.unresolvedRequirements, ['Quantity scope unresolved']);
  assert.equal(verifyPresalesResponseAcceptance(response).responseValid, true);
});

test('lazy public facade adds APIs while retaining all six legacy exports', () => {
  const gate = require('../../scripts/lib/boq/bom_verifier.js');
  for (const name of ['verifyPrePresentationAcceptance','validateUniversalCriteria','validateBoqEvaluationCriteria','validateRfpSizingCriteria','validateBomReconciliationCriteria','validateFreeformQaCriteria']) assert.equal(typeof gate[name], 'function');
  assert.equal(gate.getPresalesResponseProfile('CATALOG_INTELLIGENCE').profileId, 'CATALOG_INTELLIGENCE');
  assert.equal(gate.verifyPresalesResponseAcceptance(gate.adaptPresalesResponse(samples.CATALOG_INTELLIGENCE, { intent: 'CATALOG_INTELLIGENCE' })).deliveryAuthorized, false);
});

test('pure contract imports and adapter/validator execution have no IO/network/process/customer side effects', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'response-contract-import-'));
  t.after(() => {
    assert.ok(isWithin(path.resolve(os.tmpdir()), path.resolve(temp)) && path.resolve(temp) !== path.resolve(os.tmpdir()));
    fs.rmSync(temp, { recursive: true, force: true });
  });
  const code = `
    const assert=require('node:assert/strict'),fs=require('fs'),Module=require('module');const deny=()=>{throw Error('Unexpected contract side effect');};
    for(const m of ['writeFileSync','writeFile','appendFileSync','mkdirSync','renameSync','unlinkSync','rmSync','copyFileSync','createWriteStream'])fs[m]=deny;
    for(const m of ['writeFile','appendFile','mkdir','rename','unlink','rm','copyFile'])fs.promises[m]=deny;
    const cp=require('child_process');for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[m]=deny;
    require('net').connect=deny;require('http').request=deny;require('https').request=deny;global.fetch=deny;global.setTimeout=deny;global.setInterval=deny;process.exit=deny;
    const load=Module._load;Module._load=function(id,parent,...args){const resolved=Module._resolveFilename(id,parent);if(typeof resolved==='string'&&/[\\\\/]scripts[\\\\/](evaluators|services|scrapers)[\\\\/]/.test(resolved))deny();return load.call(this,id,parent,...args);};
    const a=require(${JSON.stringify(path.join(root,'scripts/lib/contracts/presales_response_adapter.js'))});
    const v=require(${JSON.stringify(path.join(root,'scripts/lib/boq/presales_response_validator.js'))});
    const r=a.adaptPresalesResponse({status:'INPUT_REQUIRED',message:'Input needed'},{intent:'BOQ_EVALUATION'});assert.equal(v.verifyPresalesResponseAcceptance(r).deliveryAuthorized,false);process.stdout.write('CP5_CONTRACT_COMPLETE');
  `;
  const child = spawnSync(process.execPath, ['-e', code], { cwd: temp, encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, 'CP5_CONTRACT_COMPLETE');
  assert.deepEqual(fs.readdirSync(temp), []);
});
