'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { analyzeFile, stripNonCodeLiterals, runAnalysis } = require('../../scripts/maintenance/analyze_complexity.js');

test('Complexity analyzer strips braces and branch keywords inside strings, comments, and regex literals', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-acc-'));
  const file = path.join(tmpDir, 'sample.js');
  fs.writeFileSync(file, [
    'class Demo {',
    '  compute(a, b) {',
    '    // if (x && y || z) { }',
    '    const re = /\\{foo\\}|if\\s*\\(/g;',
    '    const str = "a && b || c ? d : e { }";',
    '    const tpl = `hello ${a ? "x" : "y"} { world }`;',
    '    const opt = b?.name ?? "none";',
    '    if (a > 0) return 1;',
    '    else if (a < 0) return -1;',
    '    return re.test(str) ? opt : tpl;',
    '  }',
    '}',
    'module.exports = { Demo };'
  ].join('\n'));

  try {
    const res = analyzeFile(file);
    assert.equal(res.functions.length, 1, 'Must detect class method compute()');
    const fn = res.functions[0];
    assert.equal(fn.name, 'compute');
    assert.equal(fn.loc, 10, 'Braces in comments/strings/regex must not distort LOC');
    // Expected CC: 1 base + 1 (${a ? ...}) + 1 (??) + 1 (if) + 1 (else if) + 1 (return ? :) = 6
    assert.equal(fn.complexity, 6, `Expected CC 6 without string/regex/else-if inflation, got ${fn.complexity}`);

    const cleaned = stripNonCodeLiterals('const x = "{if (a && b)}"; // ||');
    assert.equal(cleaned.includes('&&'), false);
    assert.equal(cleaned.includes('||'), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runAnalysis populates totalFiles, totalFunctions, violations, and topComplexFunctions', () => {
  const origArgv = process.argv;
  process.argv = [process.execPath, 'analyze_complexity.js', '--tier=aspects', '--top=5'];
  try {
    const out = runAnalysis();
    assert.ok(out.totalFiles > 0);
    assert.ok(out.totalFunctions > 0);
    assert.ok(Array.isArray(out.violations));
    assert.ok(Array.isArray(out.topComplexFunctions));
    assert.ok(out.topComplexFunctions.length <= 5);
  } finally {
    process.argv = origArgv;
  }
});

test('3D ratchet measures maxNesting accurately and flags unbaselined CC/LOC/nesting breaches', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-ratchet-'));
  const file = path.join(tmpDir, 'nested.js');
  const baselinePath = path.join(tmpDir, 'baseline.json');
  fs.writeFileSync(file, [
    'function deepFn(a, b, c, d, e) {',
    '  const cfg = { ok: true };',
    '  if (a) {',
    '    for (const x of b) {',
    '      while (c) {',
    '        try {',
    '          if (d && e) { return cfg; }',
    '        } catch (err) { return null; }',
    '      }',
    '    }',
    '  }',
    '  return cfg;',
    '}'
  ].join('\n'));
  fs.writeFileSync(baselinePath, JSON.stringify({ entries: {} }));

  const origArgv = process.argv;
  try {
    const res = analyzeFile(file);
    assert.equal(res.functions[0].maxNesting, 5, 'Expected control-flow nesting depth 5 (ignoring object literal)');
    process.argv = [process.execPath, 'analyze_complexity.js', '--ratchet', `--baseline=${baselinePath}`, '--max-cc=20', '--max-loc=80', '--max-nesting=4'];
    const emptyOut = runAnalysis();
    assert.ok(emptyOut.violations.length > 0, 'Empty baseline must flag legacy functions exceeding 3D caps');
    process.argv = [process.execPath, 'analyze_complexity.js', '--ratchet', '--max-cc=20', '--max-loc=80', '--max-nesting=4'];
    const repoOut = runAnalysis();
    assert.equal(repoOut.violations.length, 0, 'Repo baseline checks must have 0 unbaselined breaches');
  } finally {
    process.argv = origArgv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
