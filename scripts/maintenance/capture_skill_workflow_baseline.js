#!/usr/bin/env node
'use strict';
// Reusable CP0 accounted freeze/protected-tree check. Does not run golden scenarios.
const fs = require('fs');
const path = require('path');
const { REPORT_BASE, relative, walkFiles, readFileRecord, fingerprint, git, parseArgs, saveReport } = require('./skill_workflow/io.js');

function captureBaseline(root) {
  const tracked = new Set(git(root, ['ls-files', '-z', '--cached']).split('\0').filter(Boolean));
  const visible = git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean);
  const issues = [];
  const excluded = file => { const rel = relative(root, file); return rel === REPORT_BASE || rel.startsWith(REPORT_BASE + '/'); };
  const protectedPaths = [...new Set(['outputs', 'scripts/config'].flatMap(dir => walkFiles(path.join(root, dir), { issues, exclude: excluded })).map(file => relative(root, file)))].sort();
  const inputs = [...new Set([...visible.filter(file => !excluded(path.join(root, file))), ...protectedPaths, ...['.env', '.env.local'].filter(file => fs.existsSync(path.join(root, file)))])].sort();
  const files = inputs.map(file => {
    if (!fs.existsSync(path.join(root, file))) return { path: file, tracked: tracked.has(file), state: 'MISSING' };
    return { ...readFileRecord(root, file), tracked: tracked.has(file) };
  });
  const byPath = new Map(files.map(record => [record.path, record]));
  return { schemaVersion: 1, checkpoint: 'CP0', kind: 'BASELINE_PREPARATION_NOT_GOLDEN_VERIFICATION', createdAt: new Date().toISOString(), workspace: root,
    head: git(root, ['rev-parse', 'HEAD']).trim(), branch: git(root, ['branch', '--show-current']).trim(), status: git(root, ['status', '--porcelain=v1', '--untracked-files=all']).trimEnd(),
    trackedDiff: git(root, ['diff', '--binary']), stagedDiff: git(root, ['diff', '--cached', '--binary']),
    scope: { trackedAndVisibleUntracked: true, protectedIncludingIgnored: ['outputs', 'scripts/config'], runtimeEnvironmentFilesHashedOnly: true, excludedMaintenanceReportRoot: REPORT_BASE, dependencyDirectories: 'Dependency lock files captured; node_modules not hashed.' },
    inputTreeFingerprint: fingerprint(files), protectedFingerprint: fingerprint(protectedPaths.map(file => byPath.get(file))), files, protectedPaths, issues,
    goldenStatus: 'PENDING_CANONICAL_CHARACTERIZATION', goldens: [], testsRun: [] };
}

function compareProtected(baseline, current) {
  if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.files) || !Array.isArray(baseline.protectedPaths)) throw new Error('Invalid baseline manifest');
  const records = payload => new Map(payload.files.filter(r => payload.protectedPaths.includes(r.path)).map(r => [r.path, r.sha256 || r.state]));
  const before = records(baseline), after = records(current);
  const added = [...after.keys()].filter(file => !before.has(file));
  const removed = [...before.keys()].filter(file => !after.has(file));
  const changed = [...before.keys()].filter(file => after.has(file) && before.get(file) !== after.get(file));
  return { status: added.length || removed.length || changed.length ? 'PROTECTED_CHANGE_DETECTED' : 'PROTECTED_CONTENT_UNCHANGED', added, removed, changed };
}

function main(args) {
  const options = parseArgs(args, ['--compare']);
  if (options.help) { console.log('Usage: node scripts/maintenance/capture_skill_workflow_baseline.js [--root <workspace>] [--compare <baseline.json>] [--save] [--report-dir <outputs/history/skill_workflow_excellence/...>] [--json]\nHashes tracked/untracked inputs and protected ignored output/config files. Does not execute evaluations or goldens. A protected difference returns exit 1.'); return; }
  const report = captureBaseline(options.root);
  if (options.compare) report.protectedComparison = compareProtected(JSON.parse(fs.readFileSync(path.resolve(options.root, options.compare), 'utf8')), report);
  const saved = options.save ? saveReport(options.root, options.reportDir, 'cp0-baseline', report) : null;
  console.log(JSON.stringify(options.json ? report : { head: report.head, inputTreeFingerprint: report.inputTreeFingerprint, protectedFingerprint: report.protectedFingerprint, inputs: report.files.length, protectedFiles: report.protectedPaths.length, issues: report.issues, goldenStatus: report.goldenStatus, protectedComparison: report.protectedComparison, saved }, null, 2));
  if (report.issues.length || report.protectedComparison?.status === 'PROTECTED_CHANGE_DETECTED') process.exitCode = 1;
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Baseline capture could not complete: ${error.message}`); process.exitCode = 1; }
}
module.exports = { captureBaseline, compareProtected, main };
