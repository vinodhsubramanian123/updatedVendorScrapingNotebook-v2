'use strict';
/**
 * tests/unit/test_unreachable_modules_gate.js
 * Guards against dead library code, obsolete retired scripts, and broken static named imports.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { analyze, ORPHAN_ALLOWLIST } = require('../../scripts/maintenance/analyze_unreachable_modules.js');
const { auditCoverage } = require('../../scripts/maintenance/audit_skill_workflow_coverage.js');
const { loadCatalogRules } = require('../../scripts/lib/catalog/catalog_rules.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

const ROOT = path.resolve(__dirname, '..', '..');
const result = analyze();
const coverage = auditCoverage(ROOT);

test('no unexplained unreachable library modules', () => {
  assert.ok(result.libraryModules > 0, 'gate must discover library modules');
  assert.deepStrictEqual(result.unexplained, [], `Unreachable modules without allowlist reason: ${result.unexplained.join(', ')}`);
});

test('allowlist has no stale entries', () => {
  assert.deepStrictEqual(result.stale, [], `Stale allowlist entries: ${result.stale.join(', ')}`);
});

test('every allowlist entry documents a reason and points to an existing file', () => {
  for (const [file, reason] of ORPHAN_ALLOWLIST) {
    assert.ok(reason.length >= 30, `${file} needs a substantive reason`);
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} must exist`);
  }
});

test('retired shims and obsolete one-off scripts stay removed', () => {
  const retired = [
    'scripts/lib/boq/acceptance_gate.js',
    'scripts/lib/boq/vendor_quote_reconciler.js',
    'scripts/evaluators/agentic_eval.js',
    'scripts/catalogs/generate_path_b_tender_workbooks.js',
    'scripts/catalogs/generate_presentation_sheet.js',
    'scripts/catalogs/generate_tender_partner_bom.js',
    'scripts/demos/capture_topology_screenshot.js',
    'scripts/demos/deep_e2e_browser_audit.js',
    'scripts/demos/generate_processor_table.js',
    'scripts/demos/interactive_browser_eval_suite.js',
    'scripts/maintenance/beautify_gid_rfqs_sheet.js',
    'scripts/maintenance/fix_gid_rfqs_sheet.js',
    'scripts/maintenance/generate_dell_and_hpe_workbooks.js',
    'scripts/maintenance/generate_h200_gpu_cluster_boq.js',
    'scripts/maintenance/reconcile_boms.js',
    'scripts/maintenance/regenerate_dl380_artifacts.js',
    'scripts/maintenance/restore_dl380a_catalog_data.js'
  ];
  for (const f of retired) {
    assert.strictEqual(fs.existsSync(path.join(ROOT, f)), false, `${f} was retired and must stay removed`);
  }
});

test('static coverage audit finds zero broken named imports, zero broken skill links, and zero unmapped customer modules', () => {
  const brokenNamedImports = coverage.namedImportChecks.filter(n => n.status === 'NO_STATIC_EXPORT_FOUND_REVIEW');
  assert.deepStrictEqual(brokenNamedImports, [], `Broken named imports: ${JSON.stringify(brokenNamedImports)}`);
  assert.strictEqual(coverage.summary.brokenLinkOccurrences, 0, 'broken skill markdown links must remain 0');
  assert.strictEqual(coverage.summary.unresolvedLocalImports, 0, 'unresolved local imports must remain 0');
  assert.strictEqual(coverage.summary.customerMappingReviewCandidates, 0, 'unmapped customer modules must remain 0');
});

test('loadCatalogRules resolves a chassis ID via catalog_discovery without falling back to empty', () => {
  const loaded = loadCatalogRules('DL380_Gen12');
  assert.strictEqual(loaded.isFallback, false, 'DL380_Gen12 should resolve to live catalog rules, not empty fallback');
  assert.ok(loaded.sourceFile && loaded.sourceFile.includes('DL380_Gen12'), `expected DL380_Gen12 sourceFile, got ${loaded.sourceFile}`);
});

test('least_delta_combinator CLI exits cleanly with valid JSON', () => {
  const stdout = execFileSync(process.execPath, [
    path.join(ROOT, 'scripts', 'lib', 'conflict', 'least_delta_combinator.js'),
    path.join(ROOT, 'tests', 'fixtures', 'test_boq_dl380_gen12.csv'),
    '--chassis', 'DL380_Gen12',
    '--json'
  ], { encoding: 'utf8', cwd: ROOT });
  const parsed = JSON.parse(stdout);
  assert.ok(Array.isArray(parsed.troublesome), 'troublesome must be an array');
  assert.ok(Object.hasOwn(parsed, 'candidate'), 'candidate field must be present');
});

test('route_query freeform feasibility check resolves activeRulesCount > 0 via active_knowledge_router', async () => {
  const routed = await executeRoutedQuery('Is P73282-B21 compatible with DL380 Gen12?', { offline: true, chassisName: 'DL380_Gen12' });
  const check = routed?.result?.feasibilityCheck;
  assert.ok(check && check.evaluated === true, `feasibilityCheck must run, got ${JSON.stringify(routed?.result)}`);
  assert.ok(check.activeRulesCount > 0, `expected activeRulesCount > 0, got ${check?.activeRulesCount}`);
});
