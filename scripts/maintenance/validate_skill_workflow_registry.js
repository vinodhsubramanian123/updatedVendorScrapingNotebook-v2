#!/usr/bin/env node
'use strict';
// CP4 maintenance-only. Never imports inventoried customer modules or CLIs.
const fs = require('fs');
const path = require('path');
const registry = require('../config/skill_workflow_registry.js');
const schemas = require('../lib/system/schemas.js');
const { SkillWorkflowRegistrySchema } = schemas;
const { auditCoverage, readSkills, reachability } = require('./audit_skill_workflow_coverage.js');
const { analyzeSource, parseSource, visit, memberName, literal, property } = require('./skill_workflow/source.js');
const { parseArgs, saveReport, isWithin, fingerprint, readFileRecord } = require('./skill_workflow/io.js');

function findCycles(capabilities) {
  const edges = new Map(capabilities.map(c => [c.capabilityId, new Set()]));
  for (const c of capabilities) {
    for (const required of c.requires) edges.get(required)?.add(c.capabilityId);
    for (const handoff of c.next) edges.get(c.capabilityId).add(handoff.capabilityId);
  }
  const complete = new Set(), active = new Set(), cycles = [];
  function walk(id, chain) {
    if (active.has(id)) { cycles.push([...chain, id]); return; }
    if (complete.has(id) || !edges.has(id)) return;
    active.add(id);
    for (const child of edges.get(id)) walk(child, [...chain, id]);
    active.delete(id);
    complete.add(id);
  }
  for (const id of edges.keys()) walk(id, []);
  return cycles;
}

function inspectCapabilityDeclarations(capabilities, checks) {
  const { ids, skillPaths, add, checkPath, checkExport, checkSchema } = checks;
  for (const c of capabilities) {
    if (ids.has(c.capabilityId)) add('DUPLICATE_CAPABILITY', c.capabilityId, 'Duplicate ID');
    if (skillPaths.has(c.skillPath)) add('DUPLICATE_SKILL', c.skillPath, 'Multiple declarations for one skill need explicit design review');
    ids.add(c.capabilityId); skillPaths.add(c.skillPath);
    checkPath(c.skillPath);
    for (const e of c.entrypoints) {
      if (e.invocation === 'MODULE' && !e.exportName) add('MISSING_MODULE_SYMBOL', c.capabilityId, e.path);
      checkExport(e);
    }
    checkSchema(c.inputSchema); checkSchema(c.outputSchema);
    c.tests.forEach(checkPath);
  }
}

function inspectCapabilityDependencies(capabilities, ids, add) {
  for (const c of capabilities) {
    const targets = [...c.requires, ...c.next.map(n => n.capabilityId)];
    for (const target of targets) {
      if (!ids.has(target)) add('DANGLING_CAPABILITY', c.capabilityId, target);
      if (target === c.capabilityId) add('SELF_DEPENDENCY', c.capabilityId, target);
    }
  }
  for (const cycle of findCycles(capabilities)) add('CAPABILITY_CYCLE', cycle[0], cycle.join(' -> '));
}

function validateRegistry(root, declaration = registry) {
  const parsed = SkillWorkflowRegistrySchema.safeParse(declaration);
  if (!parsed.success) return { valid: false, issues: parsed.error.issues.map(i => ({ code: 'SCHEMA', path: i.path.join('.'), message: i.message })), summary: null };
  const issues = [], ids = new Set(), skillPaths = new Set(), cache = new Map();
  const add = (code, at, message) => issues.push({ code, path: at, message });
  const checkPath = file => {
    const full = path.resolve(root, file);
    if (!isWithin(root, full) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      add('MISSING_FILE', file, 'Expected existing repository file'); return false;
    }
    return true;
  };
  const checkExport = e => {
    if (!checkPath(e.path) || !e.exportName) return;
    if (!cache.has(e.path)) cache.set(e.path, analyzeSource(root, e.path));
    const source = cache.get(e.path);
    if (source.parseStatus !== 'PARSED') add('UNPARSED_EXPORT', e.path, source.error);
    else if (!source.exports.includes(e.exportName)) add('MISSING_EXPORT', e.path, e.exportName);
  };
  const checkSchema = reference => {
    checkExport(reference);
    if (reference.path !== 'scripts/lib/system/schemas.js') add('UNSUPPORTED_SCHEMA_PATH', reference.path, 'CP4 uses the canonical schema module only');
    else if (typeof schemas[reference.exportName]?.safeParse !== 'function') add('NOT_A_SCHEMA', reference.path, reference.exportName);
  };
  inspectCapabilityDeclarations(parsed.data.capabilities, { ids, skillPaths, add, checkPath, checkExport, checkSchema });
  inspectCapabilityDependencies(parsed.data.capabilities, ids, add);
  for (const skill of readSkills(root)) if (!skillPaths.has(skill.skillPath)) add('UNMAPPED_SKILL', skill.skillPath, 'Missing explicit declaration');
  checkExport(parsed.data.vendorAdapterInterface);
  parsed.data.vendorAdapterInterface.existingComponents.forEach(checkExport);
  return { valid: issues.length === 0, issues, summary: { capabilities: ids.size, skillDeclarations: skillPaths.size, staticExportFiles: cache.size, activation: parsed.data.activation } };
}

// Static bindings retain file/line/local path. Mounted URLs, computed tool names,
// signature/result semantics and CLI parsing require independent consumer review.
function inspectPublicBindings(root, modules) {
  const bindings = [];
  for (const module of modules) {
    if (!/^dashboard\/(?:routes|server)|^scripts\/(?:evaluators|services)\//.test(module.path)) continue;
    const parsed = parseSource(fs.readFileSync(path.join(root, module.path), 'utf8'), module.path);
    if (!parsed.ast) continue;
    visit(parsed.ast, node => {
      if (node.type === 'CallExpression' && /^router\.(get|post|put|patch|delete|use)$/.test(memberName(node.callee) || '')) {
        bindings.push({ kind: 'HTTP_LOCAL_BINDING', path: module.path, line: node.loc.start.line, method: memberName(node.callee), localPath: literal(node.arguments[0]), status: 'STATIC_MOUNT_SCOPE_NOT_RESOLVED' });
      }
      if (node.type === 'ObjectProperty' && property(node.key) === 'tools' && node.value.type === 'ArrayExpression') {
        for (const item of node.value.elements) {
          const name = item?.properties?.find(p => property(p.key) === 'name');
          bindings.push({ kind: 'MCP_DECLARED_TOOL', path: module.path, line: item?.loc.start.line, name: name ? literal(name.value) : null, status: 'STATIC_DECLARATION_NOT_INVOCATION' });
        }
      }
      if (node.type === 'StringLiteral' && /^--[a-z][a-z0-9-]*$/.test(node.value)) {
        bindings.push({ kind: 'CLI_FLAG_LITERAL', path: module.path, line: node.loc.start.line, flag: node.value, status: 'LITERAL_NOT_PARSER_CONFORMANCE' });
      }
    });
  }
  return bindings;
}

function auditRegistry(root) {
  const validation = validateRegistry(root);
  const coverage = auditCoverage(root);
  const ownership = new Map(coverage.modules.map(m => [m.path, []]));
  for (const c of registry.capabilities) {
    const seeds = c.entrypoints.map(e => ({ path: e.path, kind: e.invocation }));
    for (const [file, edge] of reachability(coverage.modules, seeds)) {
      ownership.get(file).push({ capabilityId: c.capabilityId, chain: edge.chain, evidence: 'DECLARED_ENTRYPOINT_STATIC_DEPENDENCY_NOT_INVOCATION' });
    }
  }
  const router = coverage.modules.find(m => m.path === 'scripts/evaluators/route_query.js');
  const routerIntents = [...new Set((router?.switches || []).flatMap(s => s.cases.map(c => c.value)).filter(i => i !== '<default>'))];
  const unmappedRouterIntents = routerIntents.filter(i => !registry.capabilities.some(c => c.intents.includes(i)));
  for (const intent of unmappedRouterIntents) validation.issues.push({ code: 'UNMAPPED_ROUTER_INTENT', path: router.path, message: intent });
  validation.valid = validation.valid && unmappedRouterIntents.length === 0;
  const registryPath = 'scripts/config/skill_workflow_registry.js';
  const productionConsumers = coverage.modules.filter(m => m.imports.some(i => i.target === registryPath));
  const unexpectedConsumers = productionConsumers.filter(m => m.path !== 'scripts/maintenance/validate_skill_workflow_registry.js');
  for (const m of unexpectedConsumers) validation.issues.push({ code: 'UNEXPECTED_REGISTRY_CONSUMER', path: m.path, message: 'CP4 must remain unused by runtime paths' });
  validation.valid = validation.valid && unexpectedConsumers.length === 0;
  const sources = [registryPath, 'scripts/lib/system/schemas.js', 'scripts/lib/contracts/vendor_adapter_contract.js', 'scripts/maintenance/validate_skill_workflow_registry.js', 'tests/unit/test_skill_workflow_registry_contracts.js'];
  return {
    checkpoint: 'CP4', mode: 'MAINTENANCE_ONLY', generatedAt: new Date().toISOString(), validation,
    sourceFingerprint: fingerprint(sources.map(p => readFileRecord(root, p))),
    summary: { ...validation.summary, productionModules: coverage.modules.length, routerIntents: routerIntents.length, unmappedRouterIntents: unmappedRouterIntents.length, runtimeRegistryConsumers: unexpectedConsumers.length, missingPackageEntrypoints: coverage.entrypoints.filter(e => !e.exists).length },
    routerIntents,
    moduleOwnership: coverage.modules.map(m => ({ path: m.path, classification: m.classification, exports: m.exports, callers: m.callers, publicEntrypointChain: m.entrypointReachability, capabilityCandidates: ownership.get(m.path), disposition: ownership.get(m.path).length ? 'STATIC_CAPABILITY_CANDIDATE' : 'UNOWNED_REQUIRES_CLASSIFICATION_NOT_PROVEN_ORPHAN' })),
    publicContracts: { packageAndCliEntrypoints: coverage.entrypoints, bindings: inspectPublicBindings(root, coverage.modules), dynamicEdges: coverage.modules.filter(m => m.dynamicEdges.length).map(m => ({ path: m.path, edges: m.dynamicEdges })) },
    limits: ['Registry unused; handoff schemas do not validate legacy call signatures/results.', 'Declared next/requires DAG is not a runtime workflow completion claim.', 'Static ownership/caller chains do not prove skill invocation or host loading.', 'Missing package.main is preserved; facade choice and consumer compatibility remain pending.', 'Adapter contract has no migrated vendor implementations or live conformance.', 'Tests and isolated import verification remain assigned to Antigravity/Gemini.']
  };
}

function main(args) {
  const options = parseArgs(args);
  if (options.help) { console.log('Usage: node scripts/maintenance/validate_skill_workflow_registry.js [--root <workspace>] [--save] [--report-dir <maintenance-report-dir>] [--json]\nStatic contracts/reverse/public inventory; never imports inventoried CLIs.'); return; }
  const report = auditRegistry(options.root);
  const saved = options.save ? saveReport(options.root, options.reportDir, 'cp4-registry', report) : null;
  console.log(JSON.stringify(options.json ? report : { ...report.summary, valid: report.validation.valid, issues: report.validation.issues, sourceFingerprint: report.sourceFingerprint, saved }, null, 2));
  if (!report.validation.valid) process.exitCode = 1;
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Registry validation failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { findCycles, validateRegistry, inspectPublicBindings, auditRegistry, main };
