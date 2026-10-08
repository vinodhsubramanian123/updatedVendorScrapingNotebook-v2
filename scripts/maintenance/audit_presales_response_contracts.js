#!/usr/bin/env node
'use strict';
// Static checkpoint audit. Imports declarations only, never adapter/gate/customer code.
const fs = require('fs');
const path = require('path');
const { RESPONSE_PROFILES } = require('../lib/boq/presales_response_profiles.js');
const { auditCoverage } = require('./audit_skill_workflow_coverage.js');
const { parseSource, visit } = require('./skill_workflow/source.js');
const { parseArgs, saveReport, readFileRecord, fingerprint, sha256 } = require('./skill_workflow/io.js');
const SOURCES = Object.freeze([
  'scripts/lib/boq/bom_verifier.js', 'scripts/lib/boq/presales_response_profiles.js',
  'scripts/lib/contracts/presales_response_adapter.js', 'scripts/lib/boq/presales_response_validator.js',
  'scripts/maintenance/audit_presales_response_contracts.js', 'tests/unit/test_presales_response_contracts.js'
]);
const APIs = new Set(['getPresalesResponseProfile', 'adaptPresalesResponse', 'verifyPresalesResponseAcceptance']);

function checkLegacyPrefix(root, baselineFile, issues) {
  if (!baselineFile) { issues.push({ code: 'LEGACY_BASELINE_REQUIRED' }); return false; }
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(root, baselineFile), 'utf8'));
  const original = snapshot.records.find(r => r.path === SOURCES[0]);
  if (!original) { issues.push({ code: 'LEGACY_BASELINE_MISSING' }); return false; }
  const bytes = Buffer.from(original.originalBytesBase64, 'base64');
  if (sha256(bytes) !== original.sha256) throw new Error('Original-byte baseline hash mismatch');
  const before = bytes.toString('utf8').replace(/\r\n/g, '\n');
  const after = fs.readFileSync(path.join(root, SOURCES[0]), 'utf8').replace(/\r\n/g, '\n');
  const oldIndex = before.indexOf('module.exports =');
  const newIndex = after.indexOf('// CP5 opt-in response contracts.');
  const unchanged = oldIndex >= 0 && newIndex >= 0 && before.slice(0, oldIndex).trimEnd() === after.slice(0, newIndex).trimEnd();
  if (!unchanged) issues.push({ code: 'LEGACY_IMPLEMENTATION_CHANGED' });
  return unchanged;
}

function findUnexpectedConsumers(root, modules, issues) {
  const allowed = new Set(SOURCES);
  const consumers = [];
  for (const module of modules) {
    if (allowed.has(module.path)) continue;
    const importsContract = module.imports.some(i => SOURCES.slice(1, 4).includes(i.target));
    const parsed = parseSource(fs.readFileSync(path.join(root, module.path), 'utf8'), module.path);
    if (!parsed.ast) { issues.push({ code: 'SOURCE_PARSE_FAILED', path: module.path, detail: parsed.error }); continue; }
    const names = new Set();
    visit(parsed.ast, node => {
      if (node.type === 'Identifier' && APIs.has(node.name)) names.add(node.name);
      if (node.type === 'StringLiteral' && APIs.has(node.value)) names.add(node.value);
    });
    if (importsContract || names.size) consumers.push({ path: module.path, importsContract, namedApiReferences: [...names] });
  }
  for (const consumer of consumers) issues.push({ code: 'UNEXPECTED_RUNTIME_CONSUMER', ...consumer });
  return consumers;
}

function auditResponseContracts(root, baselineFile) {
  const coverage = auditCoverage(root), issues = [];
  const router = coverage.modules.find(m => m.path === 'scripts/evaluators/route_query.js');
  const intents = [...new Set((router?.switches || []).filter(s => s.expression === 'classification.intent').flatMap(s => s.cases.map(c => c.value)).filter(i => i !== '<default>'))];
  if (!intents.length) issues.push({ code: 'ROUTER_INTENTS_NOT_DISCOVERED' });
  for (const intent of intents) if (!Object.hasOwn(RESPONSE_PROFILES, intent)) issues.push({ code: 'MISSING_ROUTE_PROFILE', intent });
  for (const [intent, profile] of Object.entries(RESPONSE_PROFILES)) {
    if (!intents.includes(intent)) issues.push({ code: 'STALE_ROUTE_PROFILE', intent });
    if (profile.activation !== 'UNUSED' || profile.acceptanceScope !== 'RESPONSE_STRUCTURE_ONLY' || profile.deliveryAuthorization !== 'EXISTING_GATE_REQUIRED') issues.push({ code: 'PROFILE_SCOPE_INVALID', intent });
    if (!profile.contentFields.length || !profile.nextAction.trim()) issues.push({ code: 'PROFILE_CONTENT_CONTRACT_MISSING', intent });
  }
  const unchanged = checkLegacyPrefix(root, baselineFile, issues);
  const facade = coverage.modules.find(m => m.path === SOURCES[0]);
  const originalExports = ['verifyPrePresentationAcceptance', 'validateUniversalCriteria', 'validateBoqEvaluationCriteria', 'validateRfpSizingCriteria', 'validateBomReconciliationCriteria', 'validateFreeformQaCriteria'];
  for (const name of [...originalExports, ...APIs]) if (!facade?.exports.includes(name)) issues.push({ code: 'PUBLIC_EXPORT_MISSING', name });
  const unexpectedConsumers = findUnexpectedConsumers(root, coverage.modules, issues);
  return {
    checkpoint: 'CP5', mode: 'STATIC_AUDIT_ONLY', generatedAt: new Date().toISOString(), valid: issues.length === 0, issues,
    summary: { routerIntents: intents.length, profiles: Object.keys(RESPONSE_PROFILES).length, legacyImplementationUnchanged: unchanged, legacyExportsPreserved: originalExports.length, unexpectedRuntimeConsumers: unexpectedConsumers.length },
    sourceRecords: SOURCES.map(file => readFileRecord(root, file)), sourceFingerprint: fingerprint(SOURCES.map(file => readFileRecord(root, file))),
    profiles: Object.values(RESPONSE_PROFILES), unexpectedConsumers,
    limits: ['Named/static imports and references only; computed dynamic dispatch needs independent review.', 'No adapter/validator or customer execution; structure profiles do not validate facts, artifacts, buildability or delivery.', 'UNKNOWN execution state can accompany useful response content; response validity is never successful execution.', 'Behavioral/import-isolation tests remain assigned to Antigravity/Gemini.']
  };
}

function main(args) {
  const options = parseArgs(args, ['--baseline']);
  if (options.help) { console.log('Usage: node scripts/maintenance/audit_presales_response_contracts.js --baseline <cp5-pre-edit-documents.json> [--save] [--json]\nStatic declarations, callers and legacy-prefix audit; no customer execution.'); return; }
  const report = auditResponseContracts(options.root, options.baseline);
  const saved = options.save ? saveReport(options.root, options.reportDir, 'cp5-profile-audit', report) : null;
  console.log(JSON.stringify(options.json ? report : { ...report.summary, valid: report.valid, issues: report.issues, sourceFingerprint: report.sourceFingerprint, saved }, null, 2));
  if (!report.valid) process.exitCode = 1;
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Response contract audit failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { SOURCES, checkLegacyPrefix, findUnexpectedConsumers, auditResponseContracts, main };
