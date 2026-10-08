'use strict';
// CP7a pure specification. Never import the router, evaluator, fs or a service.
const { INTENT_RULES, LEGACY_EXPLICIT_INTENTS, TRANSFORM_ORDER, PLANNER_POLICY } = require('./presales_query_plan_rules.js');
const knownIntents = new Set(INTENT_RULES.map(r => r.intent));
const roleOf = intent => INTENT_RULES.find(r => r.intent === intent)?.role;
const unique = values => [...new Set(values)];

function inputModality(text, context, requested) {
  const supplied = context.filePath || context.file || '';
  const embedded = text.match(/[^\s"'<>]+\.(?:xlsx|xls|csv|tsv|png|jpg|jpeg|webp|tiff?|gif|bmp|pdf)\b/i)?.[0] || '';
  const filePath = typeof supplied === 'string' ? supplied : '';
  const sourcePath = filePath || embedded;
  const extension = sourcePath.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || null;
  const kind = /^(?:xlsx|xls|csv|tsv)$/.test(extension || '') ? 'TABULAR_FILE' :
    /^(?:png|jpg|jpeg|webp|tiff?|gif|bmp)$/.test(extension || '') ? 'IMAGE_REQUIRING_INSPECTION' :
      extension === 'pdf' ? 'PDF_REQUIRING_INSPECTION' : sourcePath ? 'FILE_REQUIRING_INSPECTION' : 'TEXT';
  const requestedOcr = requested.includes('OCR_QUOTE_INGESTION');
  return { kind, sourcePath: sourcePath || null, secondarySourcePath: typeof context.secondaryFilePath === 'string' ? context.secondaryFilePath || null : null, extension, requestedOcr,
    inspectionRequired: sourcePath !== '' && kind !== 'TABULAR_FILE',
    ingestionState: 'NOT_EXECUTED', formatSupport: 'NOT_VERIFIED' };
}

function querySignals(text, context) {
  const requestPrefix = /^(?:please\s+)?(?:can\s+you|could\s+you|can\s+(?:i|we)\s+(?:get|order|configure|quote|have|build)|i\s+(?:need|want)|we\s+(?:need|want)|need|evaluate|validate|verify|check|reconcile|compare|size|build|generate|create|export|configure|convert|transform|migrate|translate|map|modernize|profile|optimize|reduce|find|append|run|record|register|sync|inspect|extract)\b/i.test(text);
  const questionStyle = !requestPrefix && (/^(?:what|why|how|is|are|does|can|could)\b/i.test(text) || text.endsWith('?'));
  const matches = INTENT_RULES.filter(r => r.pattern && r.pattern.test(text) && (!questionStyle || r.intent === 'CATALOG_INTELLIGENCE'));
  const signals = matches.map(r => ({ intent: r.intent, basis: 'TEXT_RULE', role: r.role }));
  if (context.crossVendor === true) signals.push({ intent: 'CROSS_VENDOR_TRANSFORMATION', basis: 'CONTEXT_HINT', role: 'OBJECTIVE' });
  if (context.heterogeneous === true) signals.push({ intent: 'HETEROGENEOUS_TENDER_MODERNIZATION', basis: 'CONTEXT_HINT', role: 'OBJECTIVE' });
  if (typeof context.budget === 'number' && Number.isFinite(context.budget) && context.budget >= 0 && !questionStyle) signals.push({ intent: 'VALUE_ENGINEERING', basis: 'CONTEXT_HINT', role: 'TRANSFORM' });
  const countTokens = questionStyle ? [] : [...text.matchAll(/(?<![\w.])([+-]?\d+(?:\.\d+)?)\s+(?:nodes?|servers?)\b/gi)].map(m => Number(m[1]));
  const invalidNodeCount = countTokens.some(n => !Number.isSafeInteger(n) || n < 1);
  const nodeCounts = unique(countTokens.filter(n => Number.isSafeInteger(n) && n > 0));
  if (nodeCounts.some(n => n > 1)) signals.push({ intent: 'MULTI_CLUSTER_TENDER', basis: 'NODE_COUNT', role: 'SCOPE' });
  return { signals, nodeCounts, invalidNodeCount, questionStyle };
}

function resolveObjective(requested, explicitIntent, modality, questionStyle) {
  if (LEGACY_EXPLICIT_INTENTS.includes(explicitIntent)) return { objective: explicitIntent, candidates: [explicitIntent], basis: 'LEGACY_CONTEXT_INTENT' };
  let candidates = requested.filter(i => roleOf(i) === 'OBJECTIVE');
  // These compositions retain every requested capability in the returned plan.
  if (candidates.includes('HETEROGENEOUS_TENDER_MODERNIZATION')) candidates = candidates.filter(i => !['BOQ_EVALUATION', 'RFP_SIZING_TO_BOM', 'CROSS_VENDOR_TRANSFORMATION'].includes(i));
  else if (candidates.includes('CROSS_VENDOR_TRANSFORMATION')) candidates = candidates.filter(i => !['BOQ_EVALUATION', 'RFP_SIZING_TO_BOM'].includes(i));
  if (candidates.includes('BOM_RECONCILIATION')) candidates = candidates.filter(i => i !== 'BOQ_EVALUATION');
  if (!candidates.length && questionStyle) candidates = ['FREEFORM_QA'];
  if (!candidates.length) candidates = requested.filter(i => ['TRANSFORM', 'SCOPE'].includes(roleOf(i)));
  if (!candidates.length && modality.kind === 'TABULAR_FILE') candidates = [modality.secondarySourcePath ? 'BOM_RECONCILIATION' : 'BOQ_EVALUATION'];
  return { objective: candidates.length === 1 ? candidates[0] : null, candidates,
    basis: candidates.length === 1 ? 'DECLARED_RULES_NOT_CALIBRATED' : 'UNRESOLVED' };
}

function clarificationIssues(resolution, context, modality, nodeCounts, invalidNodeCount, text, questionStyle) {
  const issues = [];
  if (context.intent && !knownIntents.has(context.intent)) issues.push({ code: 'UNSUPPORTED_EXPLICIT_INTENT', requested: context.intent, nextAction: 'Supply an existing named intent or describe the requested outcome.' });
  if (!resolution.objective) issues.push({ code: resolution.candidates.length > 1 ? 'MULTIPLE_OBJECTIVES' : 'OBJECTIVE_REQUIRED', candidates: resolution.candidates, nextAction: 'Specify the primary outcome and the order of independent operations.' });
  if (context.filePath && context.file && context.filePath !== context.file) issues.push({ code: 'CONFLICTING_FILE_HINTS', nextAction: 'Specify which source file to ingest.' });
  if ([context.filePath, context.file, context.secondaryFilePath].some(v => v !== undefined && typeof v !== 'string')) issues.push({ code: 'INVALID_FILE_HINT', nextAction: 'Supply file paths as strings.' });
  if (modality.requestedOcr && !modality.sourcePath) issues.push({ code: 'OCR_SOURCE_REQUIRED', nextAction: 'Supply the document/image source; format support and ingestion require verification.' });
  if (nodeCounts.length > 1) issues.push({ code: 'NODE_QUANTITY_SCOPE_REQUIRED', quantities: nodeCounts, nextAction: 'Bind each count to its group and state any shared/spare quantities.' });
  if (invalidNodeCount) issues.push({ code: 'INVALID_NODE_COUNT', nextAction: 'Specify positive whole node counts within the supported quantity range.' });
  if (!questionStyle && /\b(?:do\s+not|don't|never|avoid|without)\s+(?:\w+\s+){0,2}(?:export|generat\w*|sync\w*|convert\w*|reconcil\w*|optimiz\w*|evaluat\w*|validat\w*)\b/i.test(text)) issues.push({ code: 'NEGATED_OPERATION_REQUIRES_CLARIFICATION', nextAction: 'Confirm the intended operations and exclusions; mentioned operations are not permission to execute them.' });
  if (resolution.objective === 'BOM_RECONCILIATION' && !context.secondaryFilePath && context.baselineProvided !== true && context.reconciliationMode !== 'SINGLE_FILE_AUDIT') issues.push({ code: 'RECONCILIATION_BASELINE_UNCONFIRMED', nextAction: 'Supply a second baseline or explicitly choose a single-file audit; never invent missing items.' });
  return issues;
}

/**
 * Return a proposal only. Input context is retained by reference without mutation.
 * PLANNED means an objective was resolved; it never means all sizing facts, price
 * evidence, supported product profiles, vendor scope or delivery gates passed.
 * No context.explicitTrack alias exists in the legacy router. Numeric confidence
 * does not authorize a choice. CP7b/CP11/CP7c must verify eventual consumers.
 */
function planPresalesQuery(queryText = '', context = {}) {
  if (typeof queryText !== 'string' || !context || typeof context !== 'object' || Array.isArray(context)) throw new TypeError('Query text must be a string and context an object');
  const text = queryText.trim();
  const { signals, nodeCounts, invalidNodeCount, questionStyle } = querySignals(text, context);
  const requested = unique(signals.map(s => s.intent));
  if (knownIntents.has(context.intent)) requested.unshift(context.intent);
  const declared = unique(requested);
  const modality = inputModality(text, context, declared);
  const resolution = resolveObjective(declared, context.intent, modality, questionStyle);
  const ambiguities = clarificationIssues(resolution, context, modality, nodeCounts, invalidNodeCount, text, questionStyle);
  const capabilities = unique([resolution.objective, ...declared].filter(Boolean));
  const transforms = TRANSFORM_ORDER.filter(i => declared.includes(i) && i !== resolution.objective);
  return { schemaVersion: 1, ...PLANNER_POLICY,
    status: ambiguities.length ? 'CLARIFICATION_REQUIRED' : 'PLANNED',
    objective: resolution.objective, objectiveCandidates: resolution.candidates,
    classificationBasis: resolution.basis,
    explicitIntent: context.intent || null, legacyExplicitOverride: LEGACY_EXPLICIT_INTENTS.includes(context.intent),
    inputModality: modality, transforms, requestedCapabilities: capabilities,
    scope: { kind: declared.includes('MULTI_CLUSTER_TENDER') ? 'MULTI_GROUP_REQUEST' : /\b(?:compare|comparison)\b.*\b(?:models|platforms|portfolio)\b/i.test(text) ? 'PORTFOLIO_COMPARISON' : 'UNRESOLVED', nodeCounts,
      chassisHint: typeof context.chassisName === 'string' ? context.chassisName : null,
      vendorHint: typeof context.vendor === 'string' ? context.vendor : null, resolutionState: 'NOT_VALIDATED' },
    signals, ambiguities, source: { queryText, context },
    execution: { state: 'NOT_EXECUTED', continuation: 'REQUIRES_CP7B_CP11_AND_PATH_SPECIFIC_VERIFICATION' }
  };
}
module.exports = { planPresalesQuery };
