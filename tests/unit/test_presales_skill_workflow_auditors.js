'use strict';
// Authored for Antigravity/Gemini execution. All fixtures live in a disposable dir.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { isWithin, sha256, saveReport } = require('../../scripts/maintenance/skill_workflow/io.js');
const { extractLinks, resolveLink, headingAnchors } = require('../../scripts/maintenance/skill_workflow/markdown.js');
const { parserInfo, analyzeSource } = require('../../scripts/maintenance/skill_workflow/source.js');
const { auditCoverage } = require('../../scripts/maintenance/audit_skill_workflow_coverage.js');
const { auditHardcodes, validateAllowlist, compareBaseline } = require('../../scripts/maintenance/skill_workflow/hardcode.js');
const { compareProtected } = require('../../scripts/maintenance/capture_skill_workflow_baseline.js');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-workflow-audit-'));
  t.after(() => {
    const absolute = path.resolve(root);
    assert.ok(isWithin(path.resolve(os.tmpdir()), absolute) && absolute !== path.resolve(os.tmpdir()));
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
  const json = (file, value) => safeWriteJsonAtomic(path.join(root, file), value);
  return { root, write, json };
}

test('links use the referring document base, preserve parentheses/spaces and validate duplicate anchors', t => {
  const { root, write } = fixture(t);
  write('.agents/skills/sample/SKILL.md', '# Sample\n[guide](references/guide_(old).md#part-1)\n[missing](references/missing.md)\n[script](../../../scripts/tool.js)\n');
  write('.agents/skills/sample/references/guide_(old).md', '# Part\n# Part\n[nested](../../../../scripts/tool.js)\n[spaced](<file with spaces.md>)\n');
  write('.agents/skills/sample/references/file with spaces.md', '# Fine\n');
  write('scripts/tool.js', 'module.exports = {};\n');
  const file = '.agents/skills/sample/SKILL.md';
  const links = extractLinks(fs.readFileSync(path.join(root, file), 'utf8')).map(l => resolveLink(root, file, l));
  assert.deepEqual(links.map(l => l.status), ['RESOLVED', 'MISSING_PATH', 'RESOLVED']);
  const ref = '.agents/skills/sample/references/guide_(old).md';
  assert.ok(extractLinks(fs.readFileSync(path.join(root, ref), 'utf8')).every(l => resolveLink(root, ref, l).status === 'RESOLVED'));
});

test('code fences do not produce link/heading false positives and language-bearing lines cannot close fences', () => {
  const text = '# Before\n```md\n[not-link](missing.md)\n```bash\n# Still code\n```\n## After `code`\n[yes](#after-code)\n';
  assert.deepEqual(extractLinks(text).map(l => l.target), ['#after-code']);
  assert.ok(headingAnchors(text).has('after-code'));
  assert.ok(!headingAnchors(text).has('still-code'));
});

test('reference definitions, uses and undefined references are distinguished', t => {
  const { root, write } = fixture(t);
  const file = '.agents/skills/sample/SKILL.md';
  write(file, '# Sample\n[one][target]\n[two][unknown]\n[target]: #sample\n');
  const resolved = extractLinks(fs.readFileSync(path.join(root, file), 'utf8')).map(l => resolveLink(root, file, l));
  assert.equal(resolved.filter(l => l.status === 'UNDEFINED_REFERENCE').length, 1);
  assert.equal(resolved.find(l => l.syntax === 'reference-use' && l.label === 'one').status, 'RESOLVED');
});

test('static source audit never imports an inventoried CLI and exposes unresolved dynamic edges', t => {
  const { root, write } = fixture(t);
  assert.ok(parserInfo().available, 'AST parser is required for this verification scope');
  write('scripts/tool.js', 'throw new Error("MUST_NOT_IMPORT"); const { helper } = require("./helper"); require(process.env.PLUGIN); module.exports = { run: helper };\n');
  write('scripts/helper.js', 'exports.helper = function helper() {};\n');
  const result = analyzeSource(root, 'scripts/tool.js');
  assert.equal(result.parseStatus, 'PARSED');
  assert.deepEqual(result.exports, ['run']);
  assert.equal(result.imports[0].target, 'scripts/helper.js');
  assert.equal(result.dynamicEdges.length, 1);
  assert.deepEqual(result.imports[0].bindings, [{ imported: 'helper', local: 'helper' }]);
});

test('coverage retains a missing package entrypoint and distinguishes deprecated code from orphan candidates', t => {
  const { root, write, json } = fixture(t);
  json('package.json', { main: 'scripts/missing.js', scripts: { run: 'node scripts/evaluators/router.js' } });
  write('.agents/skills/sample/SKILL.md', '---\nname: sample\ndescription: Test routing.\n---\nUse scripts/evaluators/router.js\n');
  write('scripts/evaluators/router.js', 'require("../lib/helper"); module.exports = { run() {} };\n');
  write('scripts/lib/helper.js', 'module.exports = {};\n');
  write('scripts/evaluators/old.js', '/** @deprecated Superseded module. */\nmodule.exports = {};\n');
  const report = auditCoverage(root);
  assert.equal(report.summary.skills, 1);
  assert.equal(report.summary.missingEntrypoints, 1);
  assert.equal(report.modules.find(m => m.path === 'scripts/lib/helper.js').inheritedSkillCandidates[0].skillId, 'sample');
  assert.equal(report.modules.find(m => m.path === 'scripts/evaluators/old.js').classification, 'declaredDeprecated');
  assert.equal(report.reviewCandidates.length, 0);
  assert.ok(!fs.existsSync(path.join(root, 'outputs')), 'report-only library call must not write');
});

test('hardcode report detects decision price/physical literals and keeps examples/tests as explicit classes', t => {
  const { root, write } = fixture(t);
  write('scripts/lib/decision.js', 'const unitPriceUsd = 145; const rackWatts = 1600; module.exports = { sku: "P12345-B21" };\n');
  write('.agents/skills/sample/SKILL.md', 'Illustrative example: $145 and P12345-B21.\n');
  write('tests/example.js', 'const fixtureSku = "P12345-B21";\n');
  const report = auditHardcodes(root);
  assert.equal(report.mode, 'REPORT_ONLY');
  assert.ok(report.hits.some(h => h.ruleId === 'NUMERIC_PRICE_CANDIDATE' && h.value === '145'));
  assert.ok(report.hits.some(h => h.ruleId === 'NUMERIC_PHYSICAL_CANDIDATE' && h.value === '1600'));
  assert.ok(report.hits.some(h => h.candidateClass === 'FIXTURE_OR_TEST'));
  assert.ok(report.hits.some(h => h.candidateClass === 'SKILL_PROSE_REVIEW' && h.illustrativeLabelNearby));
});

test('allowlist exceptions are exact and stale entries remain visible', t => {
  const { root, write } = fixture(t);
  write('scripts/lib/decision.js', 'const unitPriceUsd = 145;\n');
  const entry = { path: 'scripts/lib/decision.js', ruleId: 'NUMERIC_PRICE_CANDIDATE', valueFingerprint: sha256('145'), reason: 'Test-only exception', owner: 'verifier', scope: 'fixture', reviewDate: '2026-10-04' };
  const report = auditHardcodes(root, { allowlist: { schemaVersion: 1, entries: [entry, { ...entry, path: 'scripts/lib/absent.js' }] } });
  assert.equal(report.hits.find(h => h.ruleId === entry.ruleId).disposition, 'EXPLICIT_EXCEPTION_RECORDED');
  assert.equal(report.staleExceptions.length, 1);
  assert.throws(() => validateAllowlist({ schemaVersion: 1, entries: [{ ...entry, path: 'scripts/**' }] }), /no wildcard/);
});

test('ratchet comparison counts copied literals but does not count a line-number move as new', () => {
  const hit = { path: 'scripts/lib/a.js', ruleId: 'NUMERIC_PRICE_CANDIDATE', valueFingerprint: sha256('145'), context: 'unitPrice: 145', line: 3 };
  const baseline = { schemaVersion: 1, hits: [hit] };
  assert.equal(compareBaseline([{ ...hit, line: 30 }], baseline).newSites.length, 0);
  assert.equal(compareBaseline([hit, { ...hit, line: 6 }], baseline).newSites[0].count, 1);
});

test('protected comparison detects added ignored records and changed content', () => {
  const before = { schemaVersion: 1, protectedPaths: ['outputs/a.json'], files: [{ path: 'outputs/a.json', sha256: 'old' }] };
  const after = { schemaVersion: 1, protectedPaths: ['outputs/a.json', 'outputs/ignored.json'], files: [{ path: 'outputs/a.json', sha256: 'new' }, { path: 'outputs/ignored.json', sha256: 'added' }] };
  assert.deepEqual(compareProtected(before, after), { status: 'PROTECTED_CHANGE_DETECTED', added: ['outputs/ignored.json'], removed: [], changed: ['outputs/a.json'] });
});

test('report saves are confined and never replace an existing customer file', t => {
  const { root } = fixture(t);
  assert.throws(() => saveReport(root, 'outputs/customer', 'bad', { schemaVersion: 1 }), /must be under/);
  const file = saveReport(root, 'outputs/history/skill_workflow_excellence/fixture', 'audit', { schemaVersion: 1, mode: 'REPORT_ONLY' });
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).mode, 'REPORT_ONLY');
});

test('CLI remains report-only when a fixture contains hardcoded values', t => {
  const { root, write } = fixture(t);
  write('scripts/lib/decision.js', 'const unitPriceUsd = 145;\n');
  const script = path.resolve(__dirname, '../../scripts/maintenance/audit_skill_hardcodes.js');
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).hitOccurrences > 0);
  assert.ok(!fs.existsSync(path.join(root, 'outputs')));
});
