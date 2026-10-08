'use strict';
// CP4 verifier suite, authored for Antigravity/Gemini; not executed by Codex.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const registry = require('../../scripts/config/skill_workflow_registry.js');
const { CapabilityHandoffSchema, VendorAdapterDescriptorSchema } = require('../../scripts/lib/system/schemas.js');
const { validateRegistry, findCycles, inspectPublicBindings, auditRegistry } = require('../../scripts/maintenance/validate_skill_workflow_registry.js');
const { validateVendorAdapter } = require('../../scripts/lib/contracts/vendor_adapter_contract.js');
const { analyzeSource } = require('../../scripts/maintenance/skill_workflow/source.js');
const { isWithin } = require('../../scripts/maintenance/skill_workflow/io.js');
const root = path.resolve(__dirname, '../..');
const clone = () => JSON.parse(JSON.stringify(registry));
const descriptor = capabilities => ({ vendorId: 'Vendor X', contractVersion: 1, domains: ['server'], capabilities, implementationStatus: 'FIXTURE', evidenceLimits: ['Fixture only; no live availability'] });

test('all repository skills have path/export-valid declarations, frozen and unused', () => {
  const result = validateRegistry(root);
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.equal(result.summary.capabilities, 28);
  assert.equal(registry.activation, 'UNUSED');
  assert.ok(Object.isFrozen(registry.capabilities[0].entrypoints[0]));
  assert.throws(() => { registry.capabilities[0].intents.push('MUTATION'); }, TypeError);
});

test('dangling, self and cyclic dependencies are rejected separately', () => {
  const r = clone(), a = r.capabilities[0], b = r.capabilities[1];
  a.requires.push('absent-capability', a.capabilityId);
  a.next.push({ capabilityId: b.capabilityId, when: 'fixture' });
  b.next.push({ capabilityId: a.capabilityId, when: 'fixture' });
  const result = validateRegistry(root, r);
  assert.equal(result.valid, false);
  for (const code of ['DANGLING_CAPABILITY', 'SELF_DEPENDENCY', 'CAPABILITY_CYCLE']) assert.ok(result.issues.some(i => i.code === code));
});

test('duplicate capability/skill declarations fail; shared helpers stay allowed', () => {
  const r = clone();
  r.capabilities.push(r.capabilities[0]);
  const result = validateRegistry(root, r);
  assert.ok(result.issues.some(i => i.code === 'DUPLICATE_CAPABILITY'));
  assert.ok(result.issues.some(i => i.code === 'DUPLICATE_SKILL'));
  assert.equal(validateRegistry(root).valid, true); // Shared router/CLI paths are intentional.
});

test('existing files with nonexistent exports are not accepted as valid contracts', () => {
  const r = clone();
  r.capabilities[0].entrypoints[0].exportName = 'notAnActualExport';
  assert.ok(validateRegistry(root, r).issues.some(i => i.code === 'MISSING_EXPORT'));
  r.capabilities[0].inputSchema.exportName = 'notASchema';
  assert.ok(validateRegistry(root, r).issues.some(i => i.code === 'MISSING_EXPORT' && i.message === 'notASchema'));
  r.capabilities[0].inputSchema.exportName = 'safeParseCatalog';
  assert.ok(validateRegistry(root, r).issues.some(i => i.code === 'NOT_A_SCHEMA'));
});

test('missing paths and module bindings fail; explicit CLI binding does not require an export', () => {
  const r = clone();
  r.capabilities[0].entrypoints[0].path = 'scripts/absent.js';
  r.capabilities[0].entrypoints[0].exportName = null;
  const result = validateRegistry(root, r);
  assert.ok(result.issues.some(i => i.code === 'MISSING_FILE'));
  assert.ok(result.issues.some(i => i.code === 'MISSING_MODULE_SYMBOL'));
  assert.equal(registry.capabilities.find(c => c.capabilityId === 'oca-catalog-scraper').entrypoints[0].invocation, 'CLI');
});

test('handoff schema preserves unknown scope explicitly and invents no success state', () => {
  const data = { capabilityId: 'sample', scope: { vendor: null, domain: null, product: null, generation: null }, artifactRefs: [], evidenceRefs: [], unresolvedRequirements: ['Target product unknown'] };
  assert.deepEqual(CapabilityHandoffSchema.parse(data), data);
  assert.equal(CapabilityHandoffSchema.safeParse({ ...data, scope: {} }).success, false);
  assert.equal(CapabilityHandoffSchema.safeParse({ ...data, status: 'PASS' }).success, false);
  assert.equal(CapabilityHandoffSchema.safeParse({ ...data, evidenceRefs: [''] }).success, false);
});

test('adapter validation checks declared methods without invoking them or granting conformance', () => {
  let calls = 0;
  const adapter = { descriptor: descriptor(['IDENTIFIER']), normalizeIdentifier() { calls++; throw Error('Must not execute'); } };
  assert.deepEqual(validateVendorAdapter(adapter), { valid: true, issues: [] });
  assert.equal(calls, 0);
  adapter.descriptor.capabilities.push('PORTAL_ACCEPTANCE');
  assert.equal(validateVendorAdapter(adapter).valid, false);
  assert.equal(calls, 0);
});

test('adapter unknown/duplicate capabilities fail; no vendor/default is inferred', () => {
  assert.equal(VendorAdapterDescriptorSchema.safeParse(descriptor(['UNRECOGNIZED'])).success, false);
  assert.equal(validateVendorAdapter({ descriptor: descriptor(['IDENTIFIER', 'IDENTIFIER']), normalizeIdentifier() {} }).valid, false);
  assert.equal(validateVendorAdapter({ vendor: 'HPE', normalizeRawCatalogRow() {} }).valid, false);
  assert.equal(validateVendorAdapter(null).valid, false);
});

test('isolated imports of registry/interface have no mutations, child processes, network or customer imports', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-import-'));
  t.after(() => {
    assert.ok(isWithin(path.resolve(os.tmpdir()), path.resolve(temp)) && path.resolve(temp) !== path.resolve(os.tmpdir()));
    fs.rmSync(temp, { recursive: true, force: true });
  });
  const code = `
    const assert=require('node:assert/strict'), fs=require('fs'), Module=require('module');
    const deny=()=>{throw Error('Unexpected import side effect');};
    for(const method of ['writeFileSync','writeFile','appendFileSync','appendFile','mkdirSync','mkdir','renameSync','rename','unlinkSync','unlink','rmSync','rm','copyFileSync','copyFile','createWriteStream']) fs[method]=deny;
    for(const method of ['writeFile','appendFile','mkdir','rename','unlink','rm','copyFile']) fs.promises[method]=deny;
    const cp=require('child_process');for(const method of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']) cp[method]=deny;
    require('net').connect=deny;require('http').request=deny;require('http').get=deny;require('https').request=deny;require('https').get=deny;global.fetch=deny;
    global.setTimeout=deny;global.setInterval=deny;process.exit=deny;
    const load=Module._load;Module._load=function(id,parent,...args){const resolved=Module._resolveFilename(id,parent);if(typeof resolved==='string'&&/[\\\\/]scripts[\\\\/](evaluators|services|scrapers)[\\\\/]/.test(resolved))deny();return load.call(this,id,parent,...args);};
    const r=require(${JSON.stringify(path.join(root, 'scripts/config/skill_workflow_registry.js'))});
    const a=require(${JSON.stringify(path.join(root, 'scripts/lib/contracts/vendor_adapter_contract.js'))});
    assert.equal(r.activation,'UNUSED');assert.equal(typeof a.validateVendorAdapter,'function');
    process.stdout.write('CP4_IMPORT_COMPLETE');
  `;
  const child = spawnSync(process.execPath, ['-e', code], { cwd: temp, encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, 'CP4_IMPORT_COMPLETE');
  assert.deepEqual(fs.readdirSync(temp), []);
});

test('public binding inventory reads source without executing a hostile CLI/service body', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-bindings-'));
  t.after(() => {
    assert.ok(isWithin(path.resolve(os.tmpdir()), path.resolve(temp)) && path.resolve(temp) !== path.resolve(os.tmpdir()));
    fs.rmSync(temp, { recursive: true, force: true });
  });
  const file = 'scripts/services/fixture.js';
  fs.mkdirSync(path.join(temp, 'scripts/services'), { recursive: true });
  fs.writeFileSync(path.join(temp, file), `throw Error('Must not run'); router.post('/fixture', handler); const response={tools:[{name:'fixture_tool'}]}; const flag='--fixture';`);
  const bindings = inspectPublicBindings(temp, [analyzeSource(temp, file)]);
  assert.ok(bindings.some(b => b.localPath === '/fixture'));
  assert.ok(bindings.some(b => b.name === 'fixture_tool'));
  assert.ok(bindings.some(b => b.flag === '--fixture'));
});

test('declared DAG accepts converging paths without inventing cycles', () => {
  const c = (capabilityId, requires = [], next = []) => ({ capabilityId, requires, next: next.map(id => ({ capabilityId: id, when: 'fixture' })) });
  assert.deepEqual(findCycles([c('a', [], ['b','c']), c('b', [], ['d']), c('c', [], ['d']), c('d')]), []);
});

test('all current router branches are declared while registry stays unused by runtime', () => {
  const report = auditRegistry(root);
  assert.equal(report.validation.valid, true, JSON.stringify(report.validation.issues));
  assert.equal(report.summary.routerIntents, 17);
  assert.equal(report.summary.unmappedRouterIntents, 0);
  assert.equal(report.summary.runtimeRegistryConsumers, 0);
  assert.ok(report.moduleOwnership.length > 0);
  assert.ok(report.publicContracts.packageAndCliEntrypoints.some(e => e.kind === 'package-main' && e.exists === false));
  assert.ok(report.publicContracts.bindings.some(b => b.kind === 'MCP_DECLARED_TOOL'));
});
