'use strict';
/**
 * scripts/maintenance/analyze_unreachable_modules.js — Unreachable Module Gate
 *
 * Finds library modules (scripts/lib, scripts/config, scripts/services) that no
 * production entry point can reach. A module is reachable when it is imported,
 * transitively, from at least one ROOT:
 *   - a file named by a package.json script or .github workflow,
 *   - a file linked from a SKILL.md / skill reference, AGENTS.md or GEMINI.md,
 *   - a registry entrypoint in scripts/config/skill_workflow_registry.js,
 *   - any CLI file outside scripts/lib and scripts/config containing `require.main === module`,
 *   - dashboard/server.cjs and dashboard/src/main.jsx.
 * Test-only reachability does NOT count: a module used solely by tests is dead in production.
 *
 * Exceptions live in ORPHAN_ALLOWLIST with a written reason. The gate fails when
 *   (a) an unreachable module is not allowlisted, or
 *   (b) an allowlist entry is stale (file missing or now reachable).
 *
 * Usage: node scripts/maintenance/analyze_unreachable_modules.js [--json] [--fail-on-orphan]
 */

const fs = require('fs');
const path = require('path');
const { buildDependencyGraph } = require('./analyze_circular_deps.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SCAN_DIRS = ['scripts', 'dashboard/src', 'dashboard/routes', 'dashboard/services', 'tests'];
const LIBRARY_PREFIXES = ['scripts/lib/', 'scripts/config/', 'scripts/services/'];
const CODE_EXT = /\.(js|cjs|mjs|jsx)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'graphify-out', '_archive_scripts', '.agents']);

// Each entry documents WHY an unreachable module is intentionally retained.
const ORPHAN_ALLOWLIST = new Map([
  ['scripts/lib/system/telemetry_measurement_store.js', 'CP6 measurement store deliberately has no production consumer (audit_telemetry_measurement_contracts asserts this); wire in or remove at CP11.'],
  ['scripts/lib/index.js', 'Documented master barrel (docs/ARCHITECTURE_AND_DESIGN.md); verified by test_m5_packaging_and_hygiene. No production importer yet.'],
  ['scripts/lib/orchestrator/evaluation_orchestrator.js', 'Programmatic adapter over runEvaluationPipeline kept for library consumers; covered by test_evaluation_orchestrator. Review for removal.'],
  ['scripts/lib/adapters/vendor_x_adapter.js', 'Vendor adapter scaffolding; registry vendorAdapterInterface is CONTRACT_ONLY_NO_VENDOR_MIGRATION.']
]);

function rel(file) { return path.relative(PROJECT_ROOT, file).split(path.sep).join('/'); }

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (CODE_EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function readSafe(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function listSkillTexts() {
  const skillsDir = path.join(PROJECT_ROOT, '.agents', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  const texts = [];
  for (const name of fs.readdirSync(skillsDir)) {
    const dir = path.join(skillsDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    texts.push(readSafe(path.join(dir, 'SKILL.md')));
    const refs = path.join(dir, 'references');
    if (fs.existsSync(refs)) for (const f of fs.readdirSync(refs)) texts.push(readSafe(path.join(refs, f)));
  }
  return texts;
}

function collectDeclaredText() {
  const pkg = JSON.parse(readSafe(path.join(PROJECT_ROOT, 'package.json')) || '{}');
  const workflows = path.join(PROJECT_ROOT, '.github', 'workflows');
  const ci = fs.existsSync(workflows) ? fs.readdirSync(workflows).map(f => readSafe(path.join(workflows, f))) : [];
  return [
    Object.values(pkg.scripts || {}).join('\n'),
    readSafe(path.join(PROJECT_ROOT, 'dashboard', 'package.json')),
    readSafe(path.join(PROJECT_ROOT, 'AGENTS.md')),
    readSafe(path.join(PROJECT_ROOT, 'GEMINI.md')),
    readSafe(path.join(PROJECT_ROOT, 'scripts', 'config', 'skill_workflow_registry.js')),
    ...ci,
    ...listSkillTexts()
  ].join('\n');
}

function isCliFile(file, content) {
  const r = rel(file);
  if (LIBRARY_PREFIXES.some(p => r.startsWith(p) && !r.startsWith('scripts/services/'))) return false;
  return /require\.main\s*===\s*module/.test(content);
}

function findRoots(files, declaredText) {
  const roots = new Set();
  for (const file of files) {
    const r = rel(file);
    if (r.startsWith('tests/')) continue;
    const tail = r.split('/').slice(-2).join('/');
    const declared = declaredText.includes(r) || declaredText.includes(tail);
    if (declared || isCliFile(file, readSafe(file))) roots.add(file);
  }
  for (const fixed of ['dashboard/server.cjs', 'dashboard/src/main.jsx']) {
    const full = path.join(PROJECT_ROOT, fixed);
    if (fs.existsSync(full)) roots.add(full);
  }
  return roots;
}

function reachableFrom(roots, graph) {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const cur = queue.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const dep of graph.get(cur) || []) if (!seen.has(dep)) queue.push(dep);
  }
  return seen;
}

function dashboardFiles() {
  const server = path.join(PROJECT_ROOT, 'dashboard', 'server.cjs');
  return fs.existsSync(server) ? [server] : [];
}

function analyze() {
  const files = [...SCAN_DIRS.flatMap(d => walk(path.join(PROJECT_ROOT, d))), ...dashboardFiles()];
  const graph = buildDependencyGraph(files);
  const roots = findRoots(files, collectDeclaredText());
  const reachable = reachableFrom(roots, graph);
  const libraryFiles = files.filter(f => LIBRARY_PREFIXES.some(p => rel(f).startsWith(p)));
  const unreachable = libraryFiles.filter(f => !reachable.has(f)).map(rel).sort();
  const unexplained = unreachable.filter(f => !ORPHAN_ALLOWLIST.has(f));
  const stale = [...ORPHAN_ALLOWLIST.keys()].filter(f => !fs.existsSync(path.join(PROJECT_ROOT, f)) || !unreachable.includes(f));
  return { scanned: files.length, roots: roots.size, libraryModules: libraryFiles.length, unreachable, unexplained, stale };
}

function main(argv) {
  const result = analyze();
  if (argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Scanned ${result.scanned} files | roots ${result.roots} | library modules ${result.libraryModules}`);
    console.log(`Unreachable library modules: ${result.unreachable.length} (allowlisted ${result.unreachable.length - result.unexplained.length})`);
    result.unexplained.forEach(f => console.log(`  ORPHAN: ${f}`));
    result.stale.forEach(f => console.log(`  STALE_ALLOWLIST: ${f}`));
  }
  const failing = result.unexplained.length + result.stale.length;
  if (argv.includes('--fail-on-orphan') && failing > 0) process.exitCode = 1;
  return result;
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { analyze, ORPHAN_ALLOWLIST };
