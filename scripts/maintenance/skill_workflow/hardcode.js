'use strict';
// Heuristic triage, not hardware authority or proof that a literal is erroneous.
const fs = require('fs');
const path = require('path');
const { SOURCE_EXTENSIONS, inventoryFiles, sha256, fingerprint } = require('./io.js');
const { parserInfo, parseSource, visit, property } = require('./source.js');

const TEXT_RULES = [
  { id: 'SKU_SHAPE', pattern: /\b(?:[A-Z][A-Z0-9]{3,12}-[A-Z0-9]{2,8}|[A-Z]{1,3}\d[A-Z0-9]{4,7})\b/g, note: 'Part-number heuristic; also matches identifiers and product names.' },
  { id: 'CURRENCY_LITERAL', pattern: /(?:\$\s*\d[\d,]*(?:\.\d+)?|\b(?:USD|EUR|GBP|INR)\s*\d[\d,]*(?:\.\d+)?)/g, note: 'Currency-shaped text; examples and quoted observations need classification.' },
  { id: 'VENDOR_PRODUCT_TERM', pattern: /\b(?:HPE|Dell|Cisco|ProLiant|PowerEdge|Tech\s+Care|Smart\s+CTO|CTO|OCA|CLIC|DL\d{3}[a-z]?|Gen\d+)\b/gi, note: 'Names are permitted in scoped skills/adapters/provenance; not automatically a violation.' },
  { id: 'UNIT_BEARING_LITERAL', pattern: /\b\d+(?:\.\d+)?\s*(?:kW|W|GB|TB|MHz|MT\/s|Gbps|GbE|U|°C)\b/g, note: 'Classify sourced product facts, illustrative inputs and universal arithmetic separately.' }
];
const PRICE_KEYS = /price|cost|saving|discount|usd|eur|gbp|inr/i;
const PHYSICAL_KEYS = /watt|tdp|thermal|derat|efficien|socket|slot|bay|dimm|channel|rack|capacity|voltage|ambient/i;

function candidateClass(file) {
  if (/^tests\/|(?:^|\/)fixtures\//.test(file)) return 'FIXTURE_OR_TEST';
  if (file.startsWith('scripts/demos/')) return 'ILLUSTRATIVE_DEMO';
  if (/^scripts\/config\/vendors\/|vendor_scraper_adapter\.js$|vendor_portal_router\.js$/.test(file)) return 'VENDOR_ADAPTER_REVIEW';
  if (/^scripts\/config\/profiles\/|platform_profiles\.js$/.test(file)) return 'SCOPED_PROFILE_REVIEW';
  if (file.startsWith('.agents/skills/')) return 'SKILL_PROSE_REVIEW';
  if (file.startsWith('scripts/maintenance/')) return 'ENGINEERING_TOOL_REVIEW';
  if (/^scripts\/(?:scrapers|catalogs)\//.test(file)) return 'OPERATIONAL_CODE_REVIEW';
  return 'GENERIC_DECISION_CANDIDATE';
}

function illustrationAt(text, index) {
  const paragraph = text.slice(Math.max(0, text.lastIndexOf('\n\n', index)), index + 100);
  return /\b(?:illustrative|fictional|example|fixture|for illustration)\b/i.test(paragraph);
}

function textHits(file, text) {
  const hits = [];
  for (const rule of TEXT_RULES) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(text))) {
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      hits.push({ ruleId: rule.id, path: file, line: text.slice(0, match.index).split('\n').length, column: match.index - lineStart + 1,
        value: match[0], valueFingerprint: sha256(match[0]), candidateClass: candidateClass(file), illustrativeLabelNearby: illustrationAt(text, match.index),
        context: text.slice(lineStart, text.indexOf('\n', match.index) < 0 ? text.length : text.indexOf('\n', match.index)).trim().slice(0, 240), note: rule.note });
    }
  }
  return hits;
}

function numericContext(node, ancestors) {
  const parent = ancestors.at(-1);
  if (parent?.type === 'ObjectProperty' && parent.value === node) return property(parent.key);
  if (parent?.type === 'VariableDeclarator' && parent.init === node) return property(parent.id);
  if (parent?.type === 'AssignmentExpression' && parent.right === node) return property(parent.left.property) || property(parent.left);
  return null;
}

function numericHits(file, text, parser) {
  const parsed = parseSource(text, file, parser), hits = [];
  if (!parsed.ast) return { hits, error: parsed.error };
  visit(parsed.ast, (node, ancestors) => {
    if (node.type !== 'NumericLiteral') return;
    const key = numericContext(node, ancestors);
    const ruleId = key && PRICE_KEYS.test(key) ? 'NUMERIC_PRICE_CANDIDATE' : key && PHYSICAL_KEYS.test(key) ? 'NUMERIC_PHYSICAL_CANDIDATE' : null;
    if (!ruleId) return;
    hits.push({ ruleId, path: file, line: node.loc.start.line, column: node.loc.start.column + 1, value: String(node.value), valueFingerprint: sha256(String(node.value)),
      candidateClass: candidateClass(file), context: `${key}: ${node.value}`, note: 'AST literal assigned to a price/physical-shaped key; units, decision use and source must be reviewed.' });
  });
  return { hits, error: null };
}

function validateAllowlist(allowlist) {
  if (!allowlist || allowlist.schemaVersion !== 1 || !Array.isArray(allowlist.entries)) throw new Error('Allowlist needs schemaVersion: 1 and entries array');
  const seen = new Set();
  for (const entry of allowlist.entries) {
    if (!entry.path || /[*?]/.test(entry.path) || !entry.ruleId || !entry.valueFingerprint || !entry.reason || !entry.owner || !entry.scope || !entry.reviewDate) throw new Error('Allowlist entries need exact path/rule/valueFingerprint, reason, owner, scope and reviewDate; no wildcard paths');
    const key = `${entry.path}:${entry.ruleId}:${entry.valueFingerprint}`;
    if (seen.has(key)) throw new Error(`Duplicate allowlist entry: ${key}`);
    seen.add(key);
  }
  return allowlist;
}

function applyAllowlist(hits, allowlist) {
  validateAllowlist(allowlist);
  const used = new Set();
  const classified = hits.map(hit => {
    const index = allowlist.entries.findIndex(e => e.path === hit.path && e.ruleId === hit.ruleId && e.valueFingerprint === hit.valueFingerprint);
    if (index >= 0) used.add(index);
    return { ...hit, disposition: index >= 0 ? 'EXPLICIT_EXCEPTION_RECORDED' : 'TRIAGE_REQUIRED', exception: index >= 0 ? allowlist.entries[index] : null };
  });
  return { hits: classified, staleExceptions: allowlist.entries.filter((_, index) => !used.has(index)) };
}

function compareBaseline(hits, baseline) {
  if (!baseline) return { status: 'NO_BASELINE_COMPARISON', newSites: [], removedSites: [] };
  if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.hits)) throw new Error('Baseline must be a schemaVersion 1 hardcode report with hits');
  // Line numbers are omitted from identity so moving an existing site is not a new literal.
  // Multiplicity is retained: copying a fallback into a second location is still new.
  const key = h => `${h.path}:${h.ruleId}:${h.valueFingerprint}:${h.context}`;
  const old = new Map(), current = new Map();
  for (const h of baseline.hits) { const k = key(h); old.set(k, (old.get(k) || 0) + 1); }
  for (const h of hits) { const k = key(h); current.set(k, (current.get(k) || 0) + 1); }
  const newSites = [...current].filter(([k, n]) => n > (old.get(k) || 0)).map(([identity, n]) => ({ identity, count: n - (old.get(identity) || 0) }));
  const removedSites = [...old].filter(([k, n]) => n > (current.get(k) || 0)).map(([identity, n]) => ({ identity, count: n - (current.get(identity) || 0) }));
  return { status: 'REPORT_ONLY_CANDIDATE_DIFF_NOT_BLOCKING', newSites, removedSites };
}

function auditHardcodes(root, options = {}) {
  const inventory = inventoryFiles(root, ['scripts', 'dashboard', '.agents', 'tests']);
  const files = inventory.files.filter(f => SOURCE_EXTENSIONS.has(path.extname(f)) || f.startsWith('.agents/skills/') && /\.md$/i.test(f) || f.startsWith('scripts/config/') && /\.json$/i.test(f));
  const parser = parserInfo(), records = [], rawHits = [], errors = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    records.push({ path: file, sha256: sha256(text) });
    rawHits.push(...textHits(file, text));
    if (SOURCE_EXTENSIONS.has(path.extname(file))) {
      const numeric = numericHits(file, text, parser);
      rawHits.push(...numeric.hits);
      if (numeric.error) errors.push({ path: file, error: numeric.error });
    }
  }
  rawHits.sort((a, b) => a.path.localeCompare(b.path, 'en') || a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId));
  const allowlist = options.allowlist || { schemaVersion: 1, entries: [] };
  const classified = applyAllowlist(rawHits, allowlist);
  const countBy = field => Object.fromEntries([...new Set(classified.hits.map(h => h[field]))].sort().map(value => [value, classified.hits.filter(h => h[field] === value).length]));
  return { schemaVersion: 1, checkpoint: 'CP2', mode: 'REPORT_ONLY', generatedAt: new Date().toISOString(), root, sourceFingerprint: fingerprint(records),
    inventory: { method: inventory.method, exclusions: inventory.exclusions, roots: ['scripts', 'dashboard', '.agents', 'tests'], issues: inventory.issues },
    limits: ['Heuristic matches are triage candidates, not violations or vendor facts.', 'Fixture/demo/adapter/profile classes are retained explicitly, not silently excluded.', 'Nearby example labels are hints, not proof of safe decision use.', 'AST numeric detection covers direct assignments only; absence of a hit does not prove no hardcoding.', 'No blocking lint, runtime firewall, code mutation or activation is performed.'],
    summary: { filesScanned: files.length, filesWithHits: new Set(classified.hits.map(h => h.path)).size, hitOccurrences: classified.hits.length, byRule: countBy('ruleId'), byCandidateClass: countBy('candidateClass'), byDisposition: countBy('disposition'), parseErrors: errors.length, staleExceptions: classified.staleExceptions.length },
    allowlist, staleExceptions: classified.staleExceptions, comparison: compareBaseline(classified.hits, options.baseline), parserErrors: errors, hits: classified.hits, files: records };
}

module.exports = { TEXT_RULES, candidateClass, textHits, numericHits, validateAllowlist, applyAllowlist, compareBaseline, auditHardcodes };
