'use strict';
// CP5 declarative response profiles only; legacy delivery acceptance is unchanged.
// Required fields describe response content, not hardware/portal certification.
const definitions = [
  ['FREEFORM_QA', 'QA_ANSWER', 'INFORMATIONAL', ['answer'], 'Supply scoped sources or clarify the unanswered question.'],
  ['BOQ_EVALUATION', 'BOQ_CANDIDATE', 'DRAFT', ['items', 'parsedItems', 'rankedSolutions', 'conflictGraph'], 'Resolve candidate violations and obtain exact validation evidence.'],
  ['RFP_SIZING_TO_BOM', 'SIZING_DRAFT', 'DRAFT', ['candidateBOM', 'resolutions', 'constructionPlan'], 'Resolve sizing gaps and evaluate the resulting scoped candidate.'],
  ['BOM_RECONCILIATION', 'RECONCILIATION_REPORT', 'REPORT', ['auditReport'], 'Provide missing baselines/prices or resolve itemized discrepancies.'],
  ['CATALOG_INTELLIGENCE', 'CATALOG_INTELLIGENCE', 'INFORMATIONAL', ['pricingTrail', 'liveDetails'], 'Supply exact catalog/history scope for missing observations.'],
  ['OCR_QUOTE_INGESTION', 'INGESTION_DRAFT', 'DRAFT', ['extractedItems', 'ocrResult'], 'Perform OCR, preserve page evidence and resume the requested objective.'],
  ['HETEROGENEOUS_TENDER_MODERNIZATION', 'HETEROGENEOUS_PLANNING', 'DRAFT', ['carrierFleetSummary', 'deliverableSummary'], 'Resolve unparsed/unsupported groups and validate each owned domain.'],
  ['CROSS_VENDOR_TRANSFORMATION', 'CROSS_VENDOR_CONVERSION', 'DRAFT', ['competitorSpec', 'auditReport', 'recommendedBom'], 'Resolve parity/sizing gaps and evaluate a supported target candidate.'],
  ['WORKLOAD_DNA', 'WORKLOAD_ADVISORY', 'ADVISORY', ['dna'], 'Supply application/load requirements and perform scoped sizing/evaluation.'],
  ['VALUE_ENGINEERING', 'OPTIMIZATION_ADVISORY', 'ADVISORY', ['budgetOptimization'], 'Verify price basis and revalidate changed candidates against original requirements.'],
  ['LEAST_DELTA_SYNTHESIS', 'CANDIDATE_ADVISORY', 'DRAFT', ['leastDeltaCandidate'], 'Preserve requirements and evaluate the proposed candidate.'],
  ['MULTI_CLUSTER_TENDER', 'MULTI_CLUSTER_PLANNING', 'DRAFT', ['clusterAnalysis'], 'Evaluate each supported group and resolve facility/quantity assumptions.'],
  ['ADVERSARIAL_VALIDATION', 'ENGINEERING_TEST_REPORT', 'REPORT', ['generatedBoq', 'evaluation'], 'Separate synthetic stress evidence from actual customer-candidate scrutiny.'],
  ['WORKBOOK_GENERATION', 'ARTIFACT_REFERENCE', 'ARTIFACT_REFERENCED', ['exportPath'], 'Verify artifact completeness and use the existing delivery-authorization gate.'],
  ['REMARKS_RECONCILIATION', 'REMARKS_REPORT', 'REPORT', ['outputRows'], 'Verify source-row parity and quantity bridges against the reconciliation baseline.'],
  ['CONTINUOUS_LEARNING', 'LEARNING_RESULT', 'OPERATIONAL_RESULT', ['feedbackProcessed'], 'Review lesson scope/status and demonstrate exact consumer/effect.'],
  ['KNOWLEDGE_SYNC', 'SYNC_RESULT', 'OPERATIONAL_RESULT', ['syncResult', 'drift'], 'Inspect exact local/cloud outcomes and recovery/readback evidence.']
];

const RESPONSE_PROFILES = Object.freeze(Object.fromEntries(definitions.map(([intent, profileId, disposition, contentFields, nextAction]) => [intent, Object.freeze({
  intent, profileId, disposition, contentFields: Object.freeze(contentFields), nextAction,
  activation: 'UNUSED', acceptanceScope: 'RESPONSE_STRUCTURE_ONLY', deliveryAuthorization: 'EXISTING_GATE_REQUIRED'
})])));

function normalizeIntent(intent) {
  return typeof intent === 'string' ? intent.trim().toUpperCase().replace(/[\s-]+/g, '_') : null;
}

function getPresalesResponseProfile(intent) {
  const key = normalizeIntent(intent);
  return Object.hasOwn(RESPONSE_PROFILES, key) ? RESPONSE_PROFILES[key] : null;
}

module.exports = { RESPONSE_PROFILES, normalizeIntent, getPresalesResponseProfile };
