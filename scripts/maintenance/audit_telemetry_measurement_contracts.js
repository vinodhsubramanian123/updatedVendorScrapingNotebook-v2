#!/usr/bin/env node
'use strict';
// CP6 static declarations/consumer audit. Never imports legacy telemetry/store.
const fs = require('fs');
const path = require('path');
const { RUN_KINDS, EVENT_TYPES, METRICS } = require('../lib/system/telemetry_measurement.js');
const { auditCoverage } = require('./audit_skill_workflow_coverage.js');
const { parseSource, visit, memberName, property } = require('./skill_workflow/source.js');
const { parseArgs, readFileRecord, fingerprint, sha256, saveReport } = require('./skill_workflow/io.js');
const SOURCES = Object.freeze(['scripts/lib/system/telemetry.js', 'scripts/lib/system/telemetry_measurement.js', 'scripts/lib/system/telemetry_populations.js', 'scripts/lib/system/telemetry_legacy_migration.js', 'scripts/lib/system/telemetry_measurement_store.js', 'scripts/maintenance/audit_telemetry_measurement_contracts.js', 'tests/unit/test_telemetry_measurement_contracts.js']);
const APIS = new Set(['normalizeTelemetryMeasurement', 'migrateLegacyTelemetry', 'summarizeTelemetryPopulation', 'createTelemetryMeasurementStore']);

function exportsInOrder(source) {
  const parsed = parseSource(source, 'telemetry-export-inventory.js');
  if (parsed.error) throw new Error(parsed.error);
  let names = [];
  visit(parsed.ast, node => {
    if (node.type === 'AssignmentExpression' && memberName(node.left) === 'module.exports' && node.right.type === 'ObjectExpression') names = node.right.properties.map(p => property(p.key));
  });
  return names;
}

function legacyParity(root, baselineFile, issues) {
  if (!baselineFile) { issues.push({ code: 'LEGACY_BASELINE_REQUIRED' }); return null; }
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(root, baselineFile), 'utf8'));
  const old = snapshot.records.find(r => r.path === SOURCES[0]);
  if (!old) throw new Error('Legacy telemetry baseline missing');
  const bytes = Buffer.from(old.originalBytesBase64, 'base64');
  if (sha256(bytes) !== old.sha256) throw new Error('Legacy baseline byte hash mismatch');
  const before = bytes.toString('utf8').replace(/\r\n/g, '\n');
  const after = fs.readFileSync(path.join(root, SOURCES[0]), 'utf8').replace(/\r\n/g, '\n');
  const oldIndex = before.indexOf('module.exports ='), newIndex = after.indexOf('// CP6 opt-in measurement contracts;');
  const implementationUnchanged = oldIndex >= 0 && newIndex >= 0 && before.slice(0, oldIndex).trimEnd() === after.slice(0, newIndex).trimEnd();
  const originalExports = exportsInOrder(before), finalExports = exportsInOrder(after);
  const exportOrderPreserved = JSON.stringify(originalExports) === JSON.stringify(finalExports.filter(n => originalExports.includes(n)));
  if (!implementationUnchanged || !exportOrderPreserved) issues.push({ code: 'LEGACY_TELEMETRY_CHANGED' });
  return { implementationUnchanged, exportOrderPreserved, originalExports, newExports: finalExports.filter(n => !originalExports.includes(n)) };
}

function unexpectedConsumers(root, modules, issues) {
  const consumers = [];
  for (const module of modules) {
    if (SOURCES.includes(module.path)) continue;
    const parsed = parseSource(fs.readFileSync(path.join(root, module.path), 'utf8'), module.path);
    if (parsed.error) { issues.push({ code: 'SOURCE_PARSE_FAILED', path: module.path, detail: parsed.error }); continue; }
    const references = new Set();
    visit(parsed.ast, node => {
      if (node.type === 'Identifier' && APIS.has(node.name)) references.add(node.name);
      if (node.type === 'StringLiteral' && APIS.has(node.value)) references.add(node.value);
    });
    const importsContract = module.imports.some(i => SOURCES.slice(1, 5).includes(i.target));
    if (importsContract || references.size) consumers.push({ path: module.path, importsContract, references: [...references] });
  }
  for (const consumer of consumers) issues.push({ code: 'UNEXPECTED_RUNTIME_CONSUMER', ...consumer });
  return consumers;
}

function auditTelemetryContracts(root, baselineFile) {
  const issues = [], coverage = auditCoverage(root);
  const legacy = legacyParity(root, baselineFile, issues);
  const consumers = unexpectedConsumers(root, coverage.modules, issues);
  const sourceRecords = SOURCES.map(file => readFileRecord(root, file));
  return {
    checkpoint: 'CP6', mode: 'STATIC_AUDIT_ONLY', generatedAt: new Date().toISOString(), valid: issues.length === 0, issues,
    summary: { runKinds: RUN_KINDS.length, eventTypes: EVENT_TYPES.length, numericMetrics: Object.keys(METRICS).length, legacyExports: legacy?.originalExports.length || 0, legacyImplementationUnchanged: legacy?.implementationUnchanged || false, legacyExportOrderPreserved: legacy?.exportOrderPreserved || false, unexpectedRuntimeConsumers: consumers.length },
    declarations: { runKinds: RUN_KINDS, eventTypes: EVENT_TYPES, numericMetrics: Object.keys(METRICS) },
    legacy, consumers, sourceRecords, sourceFingerprint: fingerprint(sourceRecords),
    limits: ['Named/static import and API references only; computed dispatch is not proven absent.', 'No normalization, migration, aggregation, persistence or customer execution by this audit.', 'Legacy dashboard metrics and telemetry defaults remain unchanged until CP11-dependent activation.', 'Behavioral, concurrent-writer and import-isolation fixtures assigned to Antigravity/Gemini.']
  };
}

function main(args) {
  const options = parseArgs(args, ['--baseline']);
  if (options.help) { console.log('Usage: node scripts/maintenance/audit_telemetry_measurement_contracts.js --baseline <cp6-pre-edit-documents.json> [--save] [--json]\nStatic declarations/parity/consumers only; no telemetry execution.'); return; }
  const report = auditTelemetryContracts(options.root, options.baseline);
  const saved = options.save ? saveReport(options.root, options.reportDir, 'cp6-contract-audit', report) : null;
  console.log(JSON.stringify(options.json ? report : { ...report.summary, valid: report.valid, issues: report.issues, sourceFingerprint: report.sourceFingerprint, saved }, null, 2));
  if (!report.valid) process.exitCode = 1;
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Telemetry contract audit failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { SOURCES, exportsInOrder, legacyParity, unexpectedConsumers, auditTelemetryContracts, main };
