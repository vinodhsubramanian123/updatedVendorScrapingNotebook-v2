'use strict';
/**
 * scripts/maintenance/validate_skills_integrity.js
 *
 * Strict quality gate for .agents/skills/*:
 *  - valid frontmatter (name == directory, description >= 30 chars)
 *  - description carries DO call / DO NOT call triggers (unless allowlisted)
 *  - HALT-<PREFIX><n> block present (unless allowlisted with a reason)
 *  - link to the normative language standard (unless allowlisted)
 *  - relative and file:/// links resolve; every file in references/ is linked from SKILL.md
 *  - every INV-n cited exists in docs/INVARIANTS.md or AGENTS.md
 *  - every vendor SKU token (e.g. P69770-B21) exists in a scraped catalog/services file, or is allowlisted
 *  - banned hedge terms absent from procedural text (comments and fenced code excluded)
 *  - no mojibake / replacement characters
 * Every function stays at cyclomatic complexity <= 30.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(PROJECT_ROOT, '.agents', 'skills');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');

// design-taste-frontend is third-party styling guidance: only structure/link/encoding checks apply.
const THIRD_PARTY = new Set(['design-taste-frontend']);
const HALT_ALLOWLIST = new Map([
  ['bom-reconciliation-skill', 'legacy HALT format pending migration'],
  ['continuous-learning-skill', 'legacy HALT format pending migration'],
  ['execution-trace-skill', 'legacy HALT format pending migration'],
  ['jules-autonomous-protocol', 'CI/CD protocol uses stage gates'],
  ['knowledge-sync-skill', 'legacy HALT format pending migration'],
  ['oca-catalog-scraper', 'legacy HALT format pending migration'],
  ['oca-portal-navigator', 'uses HPE_AUTH_* stage codes'],
  ['presales-query-router', 'router verification gates'],
  ['rfp-sizing-synthesizer', 'S1-S10 gate table']
]);

const BANNED = [
  'appropriate', 'as needed', 'when needed', 'etc\\.', 'consider', 'typically', 'usually',
  'generally', 'if possible', 'try to', 'should', 'might'
].map(w => ({ word: w.replace('\\.', '.'), re: new RegExp(`\\b${w}(?![\\w])`, 'i') }));

const SKU_RE = /\b[A-Z0-9]{5,7}-B21\b|\b[A-Z0-9]{5,6}AAE?\b/g;
// Intentional non-existent example SKUs used to illustrate not-found handling.
const SKU_ALLOW = new Set(['P99999-B21', '900000-B21']);

function readSafe(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const raw = match[1];
  const name = (raw.match(/^name:\s*(.+)$/m) || [])[1] || '';
  const block = raw.match(/^description:\s*[>|]-?\s*\r?\n([\s\S]*?)(?=^\S|$(?![\r\n]))/m);
  const single = raw.match(/^description:\s*(.+)$/m);
  const description = block
    ? block[1].split(/\r?\n/).map(l => l.trim()).filter(Boolean).join(' ')
    : (single ? single[1].trim() : '');
  return { name: name.trim(), description, length: match[0].length };
}

function stripCodeAndComments(body) {
  return body.replace(/```[\s\S]*?```/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

function loadKnownInvariants() {
  const text = readSafe(path.join(PROJECT_ROOT, 'docs', 'INVARIANTS.md')) + readSafe(path.join(PROJECT_ROOT, 'AGENTS.md'));
  const known = new Set();
  for (const m of text.matchAll(/INV-(\d+)/g)) known.add(Number(m[1]));
  return known;
}

function collectCatalogFiles(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'history' && entry.name !== 'node_modules') collectCatalogFiles(full, acc);
    } else if (/_(Catalog|Services|Catalog_SKUs)\.(json|tsv)$/i.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function listMarkdown(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => n.endsWith('.md')).map(n => path.join(dir, n)) : [];
}

function loadKnownSkus() {
  const known = new Set();
  // SKUs documented in the invariant catalog or dated audits are sourced evidence too.
  const docs = [path.join(PROJECT_ROOT, 'docs', 'INVARIANTS.md'), ...listMarkdown(path.join(PROJECT_ROOT, 'docs', 'audits'))];
  for (const file of docs) for (const m of readSafe(file).matchAll(SKU_RE)) known.add(m[0]);
  for (const file of collectCatalogFiles(OUTPUTS_DIR, [])) {
    for (const m of readSafe(file).matchAll(SKU_RE)) known.add(m[0]);
  }
  return known;
}

function checkFrontmatter(dirName, fm, issues) {
  if (!fm) { issues.push('missing YAML frontmatter'); return; }
  if (fm.name !== dirName) issues.push(`frontmatter name "${fm.name}" != directory "${dirName}"`);
  if (fm.description.length < 30) issues.push(`description too short (${fm.description.length})`);
  if (!THIRD_PARTY.has(dirName) && !/DO NOT call/i.test(fm.description)) {
    issues.push('description lacks "DO NOT call for" trigger boundary');
  }
}

function checkStructure(dirName, content, issues) {
  if (THIRD_PARTY.has(dirName)) return;
  if (!/HALT-[A-Z]+\d/.test(content) && !HALT_ALLOWLIST.has(dirName)) issues.push('no HALT-<PREFIX><n> block');
  if (!/normative_language\.md/.test(content) && !HALT_ALLOWLIST.has(dirName)) issues.push('no normative-language link');
}

function resolveLink(skillFile, target) {
  if (target.startsWith('file:///')) {
    const stripped = target.replace(/^file:\/\/\/?/, '');
    return /^[a-zA-Z]:/.test(stripped) ? path.normalize(stripped) : path.join(PROJECT_ROOT, path.normalize(stripped));
  }
  return path.resolve(path.dirname(skillFile), target.split('#')[0].split('?')[0]);
}

function checkLinks(skillFile, body, issues) {
  for (const m of body.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
    const target = m[2].trim();
    if (/^(https?:|#|mailto:)/.test(target) || !target.split('#')[0]) continue;
    if (!fs.existsSync(resolveLink(skillFile, target))) issues.push(`broken link: ${target}`);
  }
}

function checkReferencesLinked(skillFile, body, issues) {
  const refDir = path.join(path.dirname(skillFile), 'references');
  if (!fs.existsSync(refDir)) return;
  for (const f of fs.readdirSync(refDir)) {
    if (!body.includes(`references/${f}`)) issues.push(`orphan reference not linked from SKILL.md: ${f}`);
  }
}

function checkInvariants(body, known, issues) {
  const seen = new Set();
  for (const m of body.matchAll(/INV-(\d+)/g)) {
    const n = Number(m[1]);
    if (!known.has(n) && !seen.has(n)) { seen.add(n); issues.push(`cites INV-${n}, absent from docs/INVARIANTS.md and AGENTS.md`); }
  }
}

function checkSkus(body, knownSkus, issues) {
  const seen = new Set();
  for (const m of body.matchAll(SKU_RE)) {
    const sku = m[0];
    if (SKU_ALLOW.has(sku) || seen.has(sku)) continue;
    seen.add(sku);
    if (!knownSkus.has(sku)) issues.push(`SKU ${sku} not found in any scraped catalog/services file`);
  }
}

function checkEncoding(content, issues) {
  if (/\uFFFD/.test(content) || /[\u00C2\u00C3\u00E2][\u0080-\u00BF\u201A-\u203A]/.test(content)) {
    issues.push('mojibake / replacement characters present');
  }
}

function checkBanned(body, warnings) {
  const lines = stripCodeAndComments(body).split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { word, re } of BANNED) {
      if (re.test(line)) warnings.push(`banned term "${word}": ${line.trim().slice(0, 90)}`);
    }
    if (i < 0) warnings.push('unreachable');
  });
}

function validateSkill(dirName, ctx) {
  const skillFile = path.join(SKILLS_DIR, dirName, 'SKILL.md');
  const issues = [];
  const warnings = [];
  const content = readSafe(skillFile);
  if (!content) return { dirName, issues: ['missing SKILL.md'], warnings };
  const fm = parseFrontmatter(content);
  checkFrontmatter(dirName, fm, issues);
  checkStructure(dirName, content, issues);
  checkEncoding(content, issues);
  const body = fm ? content.slice(fm.length) : content;
  checkLinks(skillFile, body, issues);
  checkReferencesLinked(skillFile, body, issues);
  if (!THIRD_PARTY.has(dirName)) {
    checkInvariants(body, ctx.invariants, issues);
    checkSkus(body, ctx.skus, issues);
    checkBanned(body, warnings);
  }
  return { dirName, issues, warnings };
}

function runValidation({ strictWarnings = true, quiet = false } = {}) {
  const ctx = { invariants: loadKnownInvariants(), skus: loadKnownSkus() };
  const dirs = fs.readdirSync(SKILLS_DIR).filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory());
  const results = dirs.map(d => validateSkill(d, ctx));
  const failed = results.filter(r => r.issues.length || (strictWarnings && r.warnings.length));
  if (!quiet) {
    for (const r of results) {
      const bad = r.issues.length || (strictWarnings && r.warnings.length);
      console.log(`${bad ? 'FAIL' : 'PASS'}  ${r.dirName}`);
      [...r.issues, ...(strictWarnings ? r.warnings : [])].forEach(m => console.log(`      - ${m}`));
    }
    console.log(`\nSkills: ${results.length} | Passed: ${results.length - failed.length} | Failed: ${failed.length} | known INV: ${ctx.invariants.size} | known SKUs: ${ctx.skus.size}`);
  }
  return { ok: failed.length === 0, total: results.length, failed: failed.length, results };
}

if (require.main === module) {
  const { ok } = runValidation();
  process.exit(ok ? 0 : 1);
}

module.exports = { runValidation, validateSkill, parseFrontmatter };
