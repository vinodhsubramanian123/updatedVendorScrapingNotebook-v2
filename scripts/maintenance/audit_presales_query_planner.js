#!/usr/bin/env node
'use strict';
// Read declarations and ASTs only. Never import/invoke the planner or its cases.
const fs = require('fs');
const path = require('path');
const { INTENT_RULES, LEGACY_EXPLICIT_INTENTS, PLANNER_POLICY } = require('../lib/boq/presales_query_plan_rules.js');
const { auditCoverage } = require('./audit_skill_workflow_coverage.js');
const { parseSource, visit } = require('./skill_workflow/source.js');
const { parseArgs, saveReport, readFileRecord, fingerprint } = require('./skill_workflow/io.js');
const SOURCES = Object.freeze([
  'scripts/lib/boq/presales_query_plan_rules.js', 'scripts/lib/boq/presales_query_planner.js',
  'scripts/maintenance/audit_presales_query_planner.js', 'tests/fixtures/presales_query_plan_cases.js',
  'tests/unit/test_presales_query_planner.js'
]);
const ROUTER = 'scripts/evaluators/route_query.js';

function syntax(root, file, issues) {
  const parsed = parseSource(fs.readFileSync(path.join(root, file), 'utf8'), file);
  if (!parsed.ast) issues.push({ code: 'PARSE_FAILED', path: file, detail: parsed.error });
  return parsed.ast;
}

function legacyContract(root, baselineFile, issues) {
  const ast = syntax(root, ROUTER, issues);
  let explicit = [];
  if (ast) visit(ast, node => {
    if (node.type === 'VariableDeclarator' && node.id?.name === 'explicitTracks') explicit = node.init?.properties.map(p => p.key.name || p.key.value) || [];
  });
  const baseline = baselineFile ? JSON.parse(fs.readFileSync(path.resolve(root, baselineFile), 'utf8')) : null;
  const prior = baseline?.records?.find(r => r.path === ROUTER);
  const unchanged = Boolean(prior && prior.sha256 === readFileRecord(root, ROUTER).sha256);
  if (!unchanged) issues.push({ code: 'LEGACY_ROUTER_CHANGED_OR_BASELINE_MISSING' });
  if (JSON.stringify([...explicit].sort()) !== JSON.stringify([...LEGACY_EXPLICIT_INTENTS].sort())) issues.push({ code: 'LEGACY_EXPLICIT_MAP_MISMATCH', explicit });
  return { unchanged, explicit };
}

function inspectFixtures(root, issues) {
  const ast = syntax(root, SOURCES[3], issues);
  let labels = [];
  if (ast) visit(ast, node => {
    if (node.type !== 'ObjectExpression') return;
    const field = name => node.properties.find(p => (p.key?.name || p.key?.value) === name)?.value;
    if (field('id')?.type === 'StringLiteral') labels.push({ id: field('id').value, objective: field('objective')?.value ?? null });
  });
  if (!labels.length || uniqueCount(labels.map(r => r.id)) !== labels.length) issues.push({ code: 'FIXTURE_LABELS_MISSING_OR_DUPLICATE' });
  const represented = new Set(labels.map(r => r.objective));
  for (const rule of INTENT_RULES.filter(r => r.role !== 'MODALITY')) if (!represented.has(rule.intent)) issues.push({ code: 'OBJECTIVE_FIXTURE_MISSING', intent: rule.intent });
  const testAst = syntax(root, SOURCES[4], issues);
  let embeddedPrograms = 0;
  if (testAst) visit(testAst, node => {
    if (node.type !== 'VariableDeclarator' || node.id?.name !== 'program' || node.init?.type !== 'TemplateLiteral') return;
    const text = node.init.quasis.map((q, index) => (q.value.cooked || '') + (index < node.init.expressions.length ? JSON.stringify('STATIC_PATH_PLACEHOLDER') : '')).join('');
    const parsed = parseSource(text, 'CP7a-import-isolation-child.js');
    if (!parsed.ast) issues.push({ code: 'CHILD_PROGRAM_PARSE_FAILED', detail: parsed.error });
    embeddedPrograms++;
  });
  if (embeddedPrograms !== 1) issues.push({ code: 'IMPORT_ISOLATION_CHILD_MISSING' });
  return { labels, embeddedPrograms, verifierCaseCount: inspectTestPopulation(testAst, labels.length, issues) };
}
const uniqueCount = values => new Set(values).size;

function inspectTestPopulation(ast, fixtureCount, issues) {
  if (!ast) return 0;
  let overrides = [];
  visit(ast, node => {
    if (node.type === 'VariableDeclarator' && node.id?.name === 'legacyOverrides') overrides = node.init?.elements.map(e => e.value) || [];
  });
  if (JSON.stringify([...overrides].sort()) !== JSON.stringify([...LEGACY_EXPLICIT_INTENTS].sort())) issues.push({ code: 'OVERRIDE_FIXTURE_MAP_MISMATCH' });
  const populations = { cases: fixtureCount, legacyOverrides: overrides.length };
  let count = 0;
  visit(ast, (node, ancestors) => {
    if (node.type !== 'CallExpression' || node.callee?.name !== 'test') return;
    const loop = ancestors.find(a => a.type === 'ForOfStatement');
    if (!loop) { count++; return; }
    const population = populations[loop.right?.name];
    if (population === undefined) issues.push({ code: 'UNCOUNTED_TEST_LOOP' });
    else count += population;
  });
  return count;
}

function inspectConsumers(root, modules, issues) {
  const consumers = [];
  for (const module of modules) {
    if (SOURCES.includes(module.path)) continue;
    const imports = module.imports.filter(i => SOURCES.slice(0, 2).includes(i.target));
    let namedReference = false;
    const ast = syntax(root, module.path, issues);
    if (ast) visit(ast, node => {
      if (node.type === 'Identifier' && node.name === 'planPresalesQuery') namedReference = true;
      if (node.type === 'StringLiteral' && node.value === 'planPresalesQuery') namedReference = true;
    });
    if (imports.length || namedReference) consumers.push({ path: module.path, imports, namedReference });
  }
  for (const consumer of consumers) issues.push({ code: 'UNEXPECTED_RUNTIME_CONSUMER', ...consumer });
  return consumers;
}

function auditQueryPlanner(root, baselineFile) {
  const coverage = auditCoverage(root), issues = [];
  const router = coverage.modules.find(m => m.path === ROUTER);
  const intents = [...new Set((router?.switches || []).filter(s => s.expression === 'classification.intent').flatMap(s => s.cases.map(c => c.value)).filter(i => i !== '<default>'))];
  const declared = INTENT_RULES.map(r => r.intent);
  if (uniqueCount(declared) !== declared.length || JSON.stringify([...intents].sort()) !== JSON.stringify([...declared].sort())) issues.push({ code: 'ROUTE_DECLARATIONS_MISMATCH' });
  if (PLANNER_POLICY.activation !== 'UNUSED' || PLANNER_POLICY.dispatchAllowed !== false || PLANNER_POLICY.confidenceScore !== null) issues.push({ code: 'PLANNER_POLICY_INVALID' });
  const legacy = legacyContract(root, baselineFile, issues);
  const planner = coverage.modules.find(m => m.path === SOURCES[1]);
  if (!planner?.exports.includes('planPresalesQuery')) issues.push({ code: 'PLANNER_EXPORT_MISSING' });
  for (const file of SOURCES.slice(0, 2)) {
    const module = coverage.modules.find(m => m.path === file);
    for (const imported of module?.imports || []) if (imported.target !== SOURCES[0]) issues.push({ code: 'NON_DECLARATIVE_PLANNER_DEPENDENCY', file, imported });
  }
  const fixtures = inspectFixtures(root, issues);
  const unexpectedConsumers = inspectConsumers(root, coverage.modules, issues);
  const sourceRecords = SOURCES.map(file => readFileRecord(root, file));
  return { checkpoint: 'CP7a', mode: 'STATIC_AUDIT_ONLY', generatedAt: new Date().toISOString(), valid: issues.length === 0, issues,
    summary: { routerIntents: intents.length, intentDeclarations: declared.length, legacyExplicitOverrides: legacy.explicit.length, routerBytesUnchanged: legacy.unchanged,
      labeledFixtureCases: fixtures.labels.length, verifierCaseCount: fixtures.verifierCaseCount, unexpectedRuntimeConsumers: unexpectedConsumers.length, embeddedProgramsSyntaxChecked: fixtures.embeddedPrograms },
    sourceRecords, sourceFingerprint: fingerprint(sourceRecords), fixtures: fixtures.labels, unexpectedConsumers,
    limits: ['No planner/fixture execution or behavioral test; verification assigned to Antigravity/Gemini.', 'Static named imports/callers only; computed dispatch requires independent review.', 'PLANNED is a resolved objective proposal, not hardware, source, price or delivery acceptance.', 'CP0 goldens and CP6r readiness required before CP7b; CP11 and path receipts required for CP7c.'] };
}
function main(args) {
  const options = parseArgs(args, ['--baseline']);
  if (options.help) { console.log('Usage: node scripts/maintenance/audit_presales_query_planner.js --baseline <cp7a-pre-edit-documents.json> [--save] [--json]\nStatic audit only; does not invoke planner, cases or customer handlers.'); return; }
  const report = auditQueryPlanner(options.root, options.baseline);
  const saved = options.save ? saveReport(options.root, options.reportDir, 'cp7a-planner-audit', report) : null;
  console.log(JSON.stringify(options.json ? report : { ...report.summary, valid: report.valid, issues: report.issues, sourceFingerprint: report.sourceFingerprint, saved }, null, 2));
  if (!report.valid) process.exitCode = 1;
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Query planner audit failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { SOURCES, auditQueryPlanner, main };
