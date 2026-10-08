'use strict';
// CP7a declarations only. These labels request capabilities; none certifies execution.
const INTENT_RULES = Object.freeze([
  ['FREEFORM_QA', 'OBJECTIVE', null],
  ['BOQ_EVALUATION', 'OBJECTIVE', /\b(?:evaluate\s+(?:this\s+)?(?:boq|bom)|validate\s+(?:this\s+)?(?:boq|bom)|verify\s+bom|check\s+buildability)\b/i],
  ['RFP_SIZING_TO_BOM', 'OBJECTIVE', /\b(?:size\s+(?:a\s+)?(?:server|configuration)|sizing|build\s+(?:a\s+)?bom|generate\s+(?:a\s+)?bom|create\s+a\s+configuration|configure|quote\s+me|need.*(?:cores|ram|tb\s+storage))\b/i],
  ['BOM_RECONCILIATION', 'OBJECTIVE', /\b(?:reconcile|compare\s+boms?|tender\s+vs\.?\s+quote|quote\s+comparison|ghost\s+sku)\b/i],
  ['CATALOG_INTELLIGENCE', 'OBJECTIVE', /\b(?:price\s+trend|pricing\s+history|lifecycle|is\s+obsolete|direct\s+ship|gpl\s+price|list\s+price\s+of|options\s+added)\b/i],
  ['OCR_QUOTE_INGESTION', 'MODALITY', /\b(?:ocr|scan(?:ned)?\s+(?:quote|pdf|tender)|extract.*(?:image|pdf))\b/i],
  ['HETEROGENEOUS_TENDER_MODERNIZATION', 'OBJECTIVE', /\b(?:heterogeneous|mixed[\s-]domain|carrier\s+(?:fleet|nodes?)|tender\s+modernization|dirty\s+boq|loose\s+memory|spare\s+parts\s+absorption)\b/i],
  ['CROSS_VENDOR_TRANSFORMATION', 'OBJECTIVE', /\b(?:dell\s+to\s+hpe|cisco\s+to\s+hpe|lenovo\s+to\s+hpe|cross[\s-]vendor|transpile|(?:convert|transform|migrate|translate|map).*(?:dell|cisco|lenovo|supermicro))\b/i],
  ['WORKLOAD_DNA', 'TRANSFORM', /\b(?:sap\s*hana|vmware|vcf|vsphere|vdi|ai\s*inference|llm\s*inference|hft|high[\s-]frequency\s*trading|oltp|sql\s*server|big\s*data|workload\s*dna|resource\s*arbitration)\b/i],
  ['VALUE_ENGINEERING', 'TRANSFORM', /\b(?:value\s*engineering|budget\s*optimi[sz]|optimize.*budget|budget.*optimi[sz]|reduce\s*capex|cost\s*reduction|right[\s-]size\s*cpu)\b/i],
  ['LEAST_DELTA_SYNTHESIS', 'TRANSFORM', /\b(?:least[\s-]delta|minimal[\s-]mutation|minimum[\s-]change|least[\s-]change|rank\s*1l|alternative\s*topology)\b/i],
  ['MULTI_CLUSTER_TENDER', 'SCOPE', /\b(?:multi[\s-]cluster|3[\s-]tier|web[\s/]app[\s/]db|42u\s*rack|datacenter\s*rack\s*layout)\b/i],
  ['ADVERSARIAL_VALIDATION', 'TRANSFORM', /\b(?:adversarial|red[\s-]team|stress[\s-]test|boundary[\s-]fuzz|chaos[\s-]test)\b/i],
  ['WORKBOOK_GENERATION', 'TRANSFORM', /\b(?:(?:generate|create|export).*(?:excel|workbook|spreadsheet|\.xlsx)|portal\s*upload|7[\s-]column\s*portal)\b/i],
  ['REMARKS_RECONCILIATION', 'TRANSFORM', /\b(?:commercial\s*remarks|reconciliation\s*remarks|append\s*remarks|engineering\s*remarks)\b/i],
  ['CONTINUOUS_LEARNING', 'OBJECTIVE', /\b(?:continuous[\s-]learning|record\s*feedback|register\s*learned|learning\s*reachability|feedback\s*loop)\b/i],
  ['KNOWLEDGE_SYNC', 'OBJECTIVE', /\b(?:knowledge[\s-]sync|sync\s*deltas?|sync\s*catalog|inspect\s*drift|knowledge\s*drift|post[\s-]flow\s*sync)\b/i]
].map(([intent, role, pattern]) => Object.freeze({ intent, role, pattern })));

// The legacy option is context.intent, not context.explicitTrack. OCR is excluded
// from its early explicitTracks map; a planner OCR hint does not change that fact.
const LEGACY_EXPLICIT_INTENTS = Object.freeze(INTENT_RULES.map(r => r.intent).filter(i => i !== 'OCR_QUOTE_INGESTION'));
const TRANSFORM_ORDER = Object.freeze(['WORKLOAD_DNA', 'MULTI_CLUSTER_TENDER', 'LEAST_DELTA_SYNTHESIS', 'VALUE_ENGINEERING', 'ADVERSARIAL_VALIDATION', 'REMARKS_RECONCILIATION', 'WORKBOOK_GENERATION']);
const PLANNER_POLICY = Object.freeze({
  activation: 'UNUSED', dispatchAllowed: false, deliveryAuthorized: false,
  confidenceScore: null, confidenceMeaning: 'UNKNOWN_UNCALIBRATED',
  ambiguityPolicy: 'CONSEQUENTIAL_CHOICES_REQUIRE_CLARIFICATION_BEFORE_FUTURE_DISPATCH',
  legacyRuntimeIndicatorThreshold: 0.80, charterConfidenceTarget: 0.95,
  retiredSkillThreshold: 0.85, thresholdEnforcement: 'NO_RUNTIME_GATE_IN_CP7A'
});
module.exports = { INTENT_RULES, LEGACY_EXPLICIT_INTENTS, TRANSFORM_ORDER, PLANNER_POLICY };
