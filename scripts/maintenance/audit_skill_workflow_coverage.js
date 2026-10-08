#!/usr/bin/env node
'use strict';
// CP1 report-only auditor. It reads files/ASTs; never imports customer modules.
const fs = require('fs');
const path = require('path');
const { SOURCE_EXTENSIONS, inventoryFiles, walkFiles, relative, sha256, fingerprint, parseArgs, saveReport } = require('./skill_workflow/io.js');
const { extractLinks, resolveLink } = require('./skill_workflow/markdown.js');
const { parserInfo, analyzeSource } = require('./skill_workflow/source.js');

function readSkills(root) {
  const directory = path.join(root, '.agents/skills');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    const home = path.join(directory, entry.name), skill = path.join(home, 'SKILL.md');
    if (!fs.existsSync(skill)) return [];
    const files = walkFiles(home, { omitDependencies: true }).filter(f => /\.md$/i.test(f)).map(f => relative(root, f));
    const text = fs.readFileSync(skill, 'utf8');
    const frontmatter = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] || '';
    // Preserve raw frontmatter; this is presence inspection, not YAML validation.
    const name = /^name:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim();
    const descriptionPresent = /^description:\s*\S/m.test(frontmatter);
    return [{ id: entry.name, skillPath: relative(root, skill), files, sha256: sha256(text), words: text.trim().split(/\s+/).length, frontmatter: { name, descriptionPresent, status: name && descriptionPresent ? 'PRESENT_NOT_SCHEMA_VALIDATED' : 'MISSING_REQUIRED_FIELD' } }];
  });
}

function classifyModule(file) {
  if (file.startsWith('tests/')) return 'verification';
  if (/^scripts\/(?:maintenance|demos)\//.test(file) || /jules/i.test(file)) return 'engineering';
  if (/^scripts\/(?:scrapers|catalogs)\//.test(file)) return 'operational';
  if (file.startsWith('scripts/evaluators/')) return 'customer';
  if (file.startsWith('dashboard/src/')) return 'customerInterface';
  if (/^dashboard\/(?:routes|services)\//.test(file) || file.endsWith('scripts/services/mcp_server.js')) return 'customerAdapterNeedsScopeReview';
  if (file.startsWith('scripts/services/')) return 'operationalNeedsScopeReview';
  return 'sharedInfrastructureNeedsScopeReview';
}

function discoverEntrypoints(root, production) {
  const entries = [];
  for (const manifest of ['package.json', 'dashboard/package.json']) {
    const full = path.join(root, manifest);
    if (!fs.existsSync(full)) continue;
    const pkg = JSON.parse(fs.readFileSync(full, 'utf8')), base = path.dirname(manifest);
    const add = (value, kind, name) => {
      const file = relative(root, path.resolve(root, base, value));
      entries.push({ kind, name, manifest, path: file, exists: fs.existsSync(path.join(root, file)), inProductionInventory: production.has(file) });
    };
    if (pkg.main) add(pkg.main, 'package-main', pkg.name);
    for (const [name, command] of Object.entries(pkg.scripts || {})) {
      for (const match of command.matchAll(/(?:^|\s|&&\s*)node\s+(?:--[\w-]+\s+)*([\w./\\-]+\.[cm]?[jt]sx?)/g)) add(match[1], 'package-script', name);
    }
  }
  for (const file of production) {
    if (/^dashboard\/src\/main\.[jt]sx?$/.test(file)) entries.push({ kind: 'frontend-bootstrap', path: file, exists: true, inProductionInventory: true });
  }
  return entries;
}

function documentedModules(root, skills, modules) {
  const uniqueBasenames = new Map();
  for (const file of modules) {
    const name = path.basename(file);
    uniqueBasenames.set(name, uniqueBasenames.has(name) ? null : file);
  }
  return skills.map(skill => {
    const references = new Map();
    for (const file of skill.files) {
      const text = fs.readFileSync(path.join(root, file), 'utf8');
      for (const match of text.matchAll(/(?:scripts|dashboard|tests)\/[A-Za-z0-9_./-]+\.(?:[cm]?js|jsx|tsx?|json)/g)) {
        const target = match[0];
        references.set(`${file}:${target}`, { document: file, target, method: 'explicit-path', exists: fs.existsSync(path.join(root, target)) });
      }
      for (const [name, target] of uniqueBasenames) {
        if (target && text.includes(name)) references.set(`${file}:${target}:basename`, { document: file, target, method: 'unique-basename-mention', exists: true });
      }
      if (text.includes('dashboard/src/')) for (const target of modules) if (target.startsWith('dashboard/src/')) references.set(`${file}:${target}:directory`, { document: file, target, method: 'directory-scope', exists: true });
    }
    return { ...skill, moduleReferences: [...references.values()], mappingStatus: 'DOCUMENTED_MENTIONS_NOT_RUNTIME_INVOCATION' };
  });
}

function reachability(modules, seeds) {
  const byPath = new Map(modules.map(m => [m.path, m]));
  const reached = new Map(), queue = seeds.filter(s => byPath.has(s.path)).map(s => ({ path: s.path, chain: [s.path], via: s.kind }));
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index];
    if (reached.has(item.path)) continue;
    reached.set(item.path, item);
    for (const edge of byPath.get(item.path).imports) if (byPath.has(edge.target)) queue.push({ path: edge.target, chain: [...item.chain, edge.target], via: item.via });
  }
  return reached;
}

function buildReverseMap(modules, tests, skills, entries) {
  const incoming = new Map(modules.map(m => [m.path, []]));
  for (const module of [...modules, ...tests]) for (const edge of module.imports) {
    if (incoming.has(edge.target)) incoming.get(edge.target).push({ caller: module.path, kind: edge.kind, line: edge.line, bindings: edge.bindings, callerClass: classifyModule(module.path) });
  }
  const rooted = reachability(modules, entries);
  const inherited = new Map(modules.map(m => [m.path, []]));
  for (const skill of skills) {
    const seeds = skill.moduleReferences.filter(r => r.exists).map(r => ({ path: r.target, kind: r.method }));
    for (const [file, info] of reachability(modules, seeds)) inherited.get(file).push({ skillId: skill.id, chain: info.chain, evidence: 'STATIC_DEPENDENCY_FROM_DOCUMENTED_MENTION' });
  }
  return modules.map(module => ({
    ...module,
    classification: module.deprecatedDeclaration ? 'declaredDeprecated' : classifyModule(module.path),
    classificationEvidence: module.deprecatedDeclaration ? 'SOURCE_DEPRECATED_DECLARATION_NOT_REMOVAL_AUTHORIZATION' : 'PATH_HEURISTIC_REQUIRES_REVIEW',
    callers: incoming.get(module.path),
    directSkillMentions: skills.filter(s => s.moduleReferences.some(r => r.target === module.path)).map(s => s.id),
    inheritedSkillCandidates: inherited.get(module.path),
    entrypointReachability: rooted.get(module.path) || null,
    testImporters: incoming.get(module.path).filter(c => c.callerClass === 'verification').map(c => c.caller),
    disposition: rooted.has(module.path) ? 'STATICALLY_REACHABLE_NOT_BEHAVIORALLY_VERIFIED' : 'NO_STATIC_ENTRYPOINT_PATH_REVIEW_REQUIRED'
  }));
}

function namedImportChecks(modules) {
  const byPath = new Map(modules.map(m => [m.path, m]));
  return modules.flatMap(module => module.imports.flatMap(edge => (edge.bindings || []).filter(b => b.imported && b.imported !== '*').map(binding => {
    const target = byPath.get(edge.target);
    const status = !target ? 'TARGET_NOT_PARSED_SOURCE' : target.parseStatus !== 'PARSED' || target.exports.some(e => e.startsWith('*')) ? 'COMPUTED_OR_UNPARSED_EXPORT_REVIEW' : target.exports.includes(binding.imported) ? 'DECLARED_EXPORT_FOUND' : 'NO_STATIC_EXPORT_FOUND_REVIEW';
    return { source: module.path, target: edge.target, line: edge.line, imported: binding.imported, local: binding.local, status };
  })));
}

function auditCoverage(root) {
  const inventory = inventoryFiles(root, ['scripts', 'dashboard', '.agents']);
  const testInventory = inventoryFiles(root, ['tests']);
  const productionFiles = inventory.files.filter(f => SOURCE_EXTENSIONS.has(path.extname(f)));
  const testFiles = testInventory.files.filter(f => SOURCE_EXTENSIONS.has(path.extname(f)));
  const parser = parserInfo();
  const modules = productionFiles.map(f => analyzeSource(root, f, parser));
  const tests = testFiles.map(f => analyzeSource(root, f, parser));
  const skills = documentedModules(root, readSkills(root), productionFiles);
  const linkCache = new Map();
  const links = skills.flatMap(s => s.files.flatMap(file => extractLinks(fs.readFileSync(path.join(root, file), 'utf8')).map(link => resolveLink(root, file, link, linkCache))));
  const entries = discoverEntrypoints(root, new Set(productionFiles));
  const mapped = buildReverseMap(modules, tests, skills, entries);
  const broken = links.filter(l => ['MISSING_PATH', 'MISSING_FRAGMENT', 'UNDEFINED_REFERENCE', 'INVALID_ENCODING', 'ENVIRONMENT_PATH_MISSING'].includes(l.status));
  const records = inventory.files.filter(f => SOURCE_EXTENSIONS.has(path.extname(f)) || skills.some(s => s.files.includes(f))).map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(root, file))) }));
  const gaps = mapped.filter(m => m.classification === 'customer' && (!m.entrypointReachability || !m.directSkillMentions.length && !m.inheritedSkillCandidates.length));
  return {
    schemaVersion: 1, checkpoint: 'CP1', mode: 'REPORT_ONLY', generatedAt: new Date().toISOString(), root,
    sourceFingerprint: fingerprint(records), inventory: { method: inventory.method, exclusions: inventory.exclusions, issues: inventory.issues, productionRoots: ['scripts', 'dashboard', '.agents'], testMethod: testInventory.method },
    parser: { available: parser.available, path: parser.path, version: parser.version, dependencyStatus: parser.dependencyStatus, reason: parser.reason },
    limits: ['Static mentions/imports are candidate mappings, not executed skill ownership.', 'Dynamic imports, alias resolution, computed exports and runtime host selection need review.', 'Frontmatter presence is checked; complete host YAML schema validation is not claimed.', 'Markdown common links/fences/heading fragments are checked; host-specific rendering and uncommon nested syntax need review.', 'Test imports are coverage candidates, not proof of asserted behavior.', 'No production module was imported and no customer workflow executed.'],
    summary: {
      skills: skills.length, skillEntrypointWords: skills.reduce((n, s) => n + s.words, 0), skillDocuments: skills.reduce((n, s) => n + s.files.length, 0), productionModules: mapped.length,
      testModules: tests.length, parsedProductionModules: mapped.filter(m => m.parseStatus === 'PARSED').length,
      linkOccurrences: links.length, brokenLinkOccurrences: broken.length, missingPathOccurrences: broken.filter(l => l.status === 'MISSING_PATH').length,
      brokenSkillEntrypointPathOccurrences: broken.filter(l => l.status === 'MISSING_PATH' && l.source.endsWith('/SKILL.md')).length,
      dynamicEdges: mapped.reduce((n, m) => n + m.dynamicEdges.length, 0), unresolvedLocalImports: mapped.reduce((n, m) => n + m.imports.filter(i => i.resolution === 'UNRESOLVED_LOCAL').length, 0),
      missingEntrypoints: entries.filter(e => !e.exists).length, customerMappingReviewCandidates: gaps.length
    },
    skills, links, brokenLinks: broken, entrypoints: entries, modules: mapped, namedImportChecks: namedImportChecks(modules),
    reviewCandidates: gaps.map(m => ({ path: m.path, reason: m.entrypointReachability ? 'NO_DOCUMENTED_SKILL_DEPENDENCY_CANDIDATE' : 'NO_STATIC_ENTRYPOINT_PATH', status: 'REVIEW_REQUIRED_NOT_CONFIRMED_ORPHAN' })),
    tests: tests.map(t => ({ path: t.path, parseStatus: t.parseStatus, error: t.error, imports: t.imports, dynamicEdges: t.dynamicEdges }))
  };
}

function main(args) {
  const options = parseArgs(args);
  if (options.help) { console.log('Usage: node scripts/maintenance/audit_skill_workflow_coverage.js [--root <workspace>] [--save] [--report-dir <outputs/history/skill_workflow_excellence/...>] [--json]\nReport-only; findings do not set a failure exit code. No customer module is imported.'); return; }
  const report = auditCoverage(options.root);
  const saved = options.save ? saveReport(options.root, options.reportDir, 'cp1-coverage', report) : null;
  console.log(JSON.stringify(options.json ? report : { mode: report.mode, sourceFingerprint: report.sourceFingerprint, ...report.summary, parser: report.parser, saved, verification: 'STATIC_REPORT_NOT_RUNTIME_CERTIFICATION' }, null, 2));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Coverage audit could not complete: ${error.message}`); process.exitCode = 1; }
}
module.exports = { readSkills, classifyModule, discoverEntrypoints, documentedModules, reachability, buildReverseMap, namedImportChecks, auditCoverage, main };
