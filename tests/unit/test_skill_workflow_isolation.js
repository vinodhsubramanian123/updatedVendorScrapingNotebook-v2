'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const { createIsolation, executeIsolated, readOwnedCopy } = require('../../scripts/maintenance/create_skill_workflow_isolation.js');
const { acceptedManifest } = require('../../scripts/maintenance/skill_workflow/isolation_manifest.js');

function fixture(t, program = "require('fs').writeFileSync('outputs/result.txt', 'local'); console.log('completed');") {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-isolation-fixture-'));
  execFileSync('git', ['init', '-q'], { cwd: source });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: source });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture baseline'], { cwd: source });
  function put(file, text) { const full = path.join(source, file); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, text); }
  put('.gitignore', 'outputs/\ntests/assets/\n.env*\nnode_modules/\n');
  put('scripts/scenario.js', program); put('outputs/catalog.json', '{"entries":[{"sku":"fixture"}]}');
  put('tests/assets/input.bin', Buffer.from([0, 1, 255])); put('scripts/config/vendor.json', '{"vendor":"fixture"}');
  put('.env', 'SECRET=never-copy'); put('.env.production', 'SECRET=never-copy');
  execFileSync('git', ['add', '.gitignore', 'scripts/scenario.js'], { cwd: source });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'tracked fixture'], { cwd: source });
  put('scripts/scenario.js', program + '\n// accepted dirty source\n');
  put('scripts/untracked.js', 'module.exports = true;');
  const copies = [];
  t.after(() => {
    for (const directory of [...copies, source]) {
      const resolved = fs.realpathSync(directory), temp = fs.realpathSync(os.tmpdir());
      assert.ok(resolved.startsWith(temp + path.sep));
      assert.match(path.basename(resolved), /^skill-(?:workflow-isolation|isolation-fixture)-/);
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  });
  return { source, put, copy(options = {}) { const receipt = createIsolation({ source, checkpoint: 'CP0_FIXTURE', ...options }); copies.push(receipt.container); return receipt; } };
}
function run(receipt) { return executeIsolated({ root: receipt.root, ownerToken: receipt.ownerToken, script: 'scripts/scenario.js', timeoutMs: 15000 }); }
test('accepted dirty and untracked source, ignored catalogs/config/fixtures are hash copied', t => {
  const sample = fixture(t), receipt = sample.copy();
  for (const file of ['scripts/scenario.js', 'scripts/untracked.js', 'outputs/catalog.json', 'scripts/config/vendor.json', 'tests/assets/input.bin']) assert.deepEqual(fs.readFileSync(path.join(receipt.root, file)), fs.readFileSync(path.join(sample.source, file)));
  assert.equal(receipt.copyVerification.mismatches.length, 0);
  assert.equal(fs.existsSync(path.join(receipt.root, '.git')), false);
  assert.equal(fs.existsSync(path.join(receipt.root, '.env')), false);
  assert.ok(receipt.manifest.omissions.some(item => item.path === '.env.production'));
  assert.equal(fs.existsSync(path.join(receipt.root, 'owner.json')), false);
});
test('refresh creates distinct roots and refuses mismatched owners', t => {
  const sample = fixture(t), first = sample.copy(), second = sample.copy();
  assert.notEqual(first.root, second.root);
  assert.throws(() => readOwnedCopy(first.root, second.ownerToken), /owner\/state mismatch/);
});
test('source or copy drift blocks a run before customer script starts', t => {
  const sample = fixture(t), receipt = sample.copy();
  sample.put('scripts/untracked.js', 'module.exports = false;');
  assert.throws(() => run(receipt), /Source tree changed since snapshot/);
  fs.writeFileSync(path.join(receipt.root, 'scripts/scenario.js'), 'changed');
  assert.throws(() => run(receipt), /Snapshot hash mismatch/);
});
test('local writes stay in copy and source protected fingerprint is preserved', t => {
  const sample = fixture(t), before = acceptedManifest(sample.source), receipt = sample.copy(), record = run(receipt);
  assert.equal(record.exitCode, 0, fs.readFileSync(path.join(record.runDir, 'stderr.log'), 'utf8'));
  assert.equal(record.sourceProtectedUnchanged, true);
  assert.equal(acceptedManifest(sample.source).sourceProtectedFingerprint, before.sourceProtectedFingerprint);
  assert.equal(fs.existsSync(path.join(sample.source, 'outputs/result.txt')), false);
  assert.equal(fs.readFileSync(path.join(receipt.root, 'outputs/result.txt'), 'utf8'), 'local');
});
for (const [name, program, category] of [
  ['direct source write', "try { require('fs').writeFileSync(require('path').join(process.env.SKILL_ISOLATION_SOURCE,'outputs/catalog.json'),'bad'); } catch(e) { console.log(e.code); }", 'OUTSIDE_COPY_WRITE'],
  ['caught fetch', "try { fetch('https://example.invalid'); } catch(e) { console.log(e.code); }", 'NETWORK_FETCH'],
  ['socket', "try { new (require('net').Socket)().connect(443,'example.invalid'); } catch(e) { console.log(e.code); }", 'NETWORK_SOCKET'],
  ['shell process', "try { require('child_process').execSync('echo bad'); } catch(e) { console.log(e.code); }", 'SHELL_SUBPROCESS'],
  ['native process', "try { require('child_process').spawnSync('git',['status']); } catch(e) { console.log(e.code); }", 'NON_NODE_SUBPROCESS'],
  ['alias creation', "try { require('fs').symlinkSync(process.env.SKILL_ISOLATION_SOURCE,'alias','junction'); } catch(e) { console.log(e.code); }", 'CREATE_ALIAS']
]) test(`${name} denied attempt remains visible even after caller catches it`, t => {
  const receipt = fixture(t, program).copy(), record = run(receipt);
  assert.equal(record.exitCode, 0);
  assert.ok(record.deniedAttempts.some(item => item.category === category));
  assert.equal(record.outcome, 'COMMAND_EXIT_ZERO_WITH_DENIED_ATTEMPTS');
});
test('native command basename distinguishes Git from provider calls without retaining arguments', t => {
  const program = "const cp=require('child_process');for(const command of ['git','nlm.exe']){try{cp.spawnSync(command,['query','private-query-not-for-log']);}catch(e){console.log(e.code)}}try{cp.execSync('curl private-query-not-for-log')}catch(e){console.log(e.code)}";
  const receipt = fixture(t, program).copy(), record = run(receipt);
  assert.equal(record.exitCode, 0);
  assert.deepEqual(record.deniedAttempts.filter(item => item.category === 'NON_NODE_SUBPROCESS').map(item => item.command), ['git', 'nlm']);
  assert.equal(record.deniedAttempts.find(item => item.category === 'SHELL_SUBPROCESS').command, 'curl');
  assert.equal(JSON.stringify(record.deniedAttempts).includes('private-query-not-for-log'), false);
});
test('Node children inherit boundaries even when options request empty env', t => {
  const program = "const cp=require('child_process'); const r=cp.spawnSync(process.execPath,['-e',`try { fetch('https://example.invalid'); } catch(e) { console.log(e.code); }`],{env:{},encoding:'utf8'}); console.log(r.stdout); if(r.status!==0) throw Error(r.stderr);";
  const receipt = fixture(t, program).copy(), record = run(receipt);
  assert.equal(record.exitCode, 0, fs.readFileSync(path.join(record.runDir, 'stderr.log'), 'utf8'));
  assert.ok(record.deniedAttempts.some(item => item.category === 'NETWORK_FETCH' && item.pid !== process.pid));
});
test('callback-style Node execFile propagates the guard and callback', t => {
  const program = "require('child_process').execFile(process.execPath,['-e',`try{fetch('https://example.invalid')}catch(e){console.log(e.code)}`],(error,stdout)=>{if(error)throw error;console.log(stdout)});";
  const receipt = fixture(t, program).copy(), record = run(receipt);
  assert.equal(record.exitCode, 0, fs.readFileSync(path.join(record.runDir, 'stderr.log'), 'utf8'));
  assert.ok(record.deniedAttempts.some(item => item.category === 'NETWORK_FETCH'));
});
test('owned temp cwd allows Node fixture children while arbitrary control cwd stays blocked', t => {
  const program = "const fs=require('fs'),path=require('path'),cp=require('child_process');const directory=fs.mkdtempSync(path.join(require('os').tmpdir(),'child-fixture-'));const result=cp.spawnSync(process.execPath,['-e',`require('fs').writeFileSync('local.txt','fixture');try{fetch('https://example.invalid')}catch(e){console.log(e.code)}`],{cwd:directory,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);if(fs.readFileSync(path.join(directory,'local.txt'),'utf8')!=='fixture')throw Error('Missing local fixture');try{cp.spawnSync(process.execPath,['-e',''],{cwd:path.dirname(require('os').tmpdir())})}catch(e){console.log(e.code)}";
  const receipt = fixture(t, program).copy(), record = run(receipt);
  assert.equal(record.exitCode, 0, fs.readFileSync(path.join(record.runDir, 'stderr.log'), 'utf8'));
  assert.ok(record.deniedAttempts.some(item => item.category === 'NETWORK_FETCH'));
  assert.ok(record.deniedAttempts.some(item => item.category === 'CHILD_CWD_OUTSIDE_COPY'));
});
test('dependency junction is explicitly read only under guarded runner', t => {
  const sample = fixture(t, "try { require('fs').writeFileSync('node_modules/library.txt','bad'); } catch(e) { console.log(e.code); }");
  sample.put('node_modules/library.txt', 'dependency');
  const receipt = sample.copy({ dependencies: true }), record = run(receipt);
  assert.equal(record.exitCode, 0);
  assert.ok(record.deniedAttempts.some(item => item.category === 'ALIASED_OUTSIDE_COPY_WRITE'));
  assert.equal(fs.readFileSync(path.join(sample.source, 'node_modules/library.txt'), 'utf8'), 'dependency');
});
test('runtime claim markers omitted but accounted in source protected fingerprint', t => {
  const sample = fixture(t); sample.put('outputs/history/locks/source-recovery-queue.lock', '123\n');
  const receipt = sample.copy();
  assert.equal(fs.existsSync(path.join(receipt.root, 'outputs/history/locks/source-recovery-queue.lock')), false);
  assert.ok(receipt.manifest.omissions.some(item => item.path.endsWith('source-recovery-queue.lock')));
});
test('an existing execution marker blocks a concurrent runner without clobber', t => {
  const receipt = fixture(t).copy(), marker = path.join(receipt.control, 'execution.lock');
  fs.writeFileSync(marker, 'other-owner\n'); assert.throws(() => run(receipt), /EEXIST/);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'other-owner\n');
});

function runRaceFixture(sample, receipt) {
  const guard = path.resolve(__dirname, '../../scripts/maintenance/skill_workflow/isolation_guard.js');
  const log = path.join(receipt.control, 'race-denied.jsonl');
  const before = acceptedManifest(sample.source);
  const result = spawnSync(process.execPath, ['--require', path.join(receipt.root, 'scripts/race_preload.js'), '--require', guard,
    path.join(receipt.root, 'scripts/scenario.js')], { cwd: receipt.root, encoding: 'utf8', timeout: 15000,
    env: { ...process.env, NODE_OPTIONS: '', SKILL_ISOLATION_ROOT: receipt.root, SKILL_ISOLATION_CONTROL: receipt.control,
      SKILL_ISOLATION_SOURCE: sample.source, SKILL_ISOLATION_GUARD_LOG: log,
      TEMP: path.join(receipt.control, 'temp'), TMP: path.join(receipt.control, 'temp'), TMPDIR: path.join(receipt.control, 'temp') } });
  const after = acceptedManifest(sample.source);
  assert.equal(after.sourceAccountedFingerprint, before.sourceAccountedFingerprint);
  assert.equal(after.sourceProtectedFingerprint, before.sourceProtectedFingerprint);
  return { ...result, denials: fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [] };
}

test('disappearing checked claim is benign while remaining enclosing parents are inspected', t => {
  const sample = fixture(t, "const fs=require('fs');fs.writeFileSync('outputs/race/claim','new owner');console.log('RACE_CHECKS '+JSON.stringify(global.guardRaceChecks));");
  sample.put('outputs/race/claim', 'former owner');
  sample.put('scripts/race_preload.js', `
    const fs=require('fs'),path=require('path');const exists=fs.existsSync,realpath=fs.realpathSync,unlink=fs.unlinkSync;
    const target=path.join(process.env.SKILL_ISOLATION_ROOT,'outputs/race/claim');let armed=false,fired=false;
    global.guardRaceChecks=[];
    fs.existsSync=function(file){const found=exists.call(this,file);if(path.resolve(file)===target&&found&&!fired)armed=true;return found;};
    fs.realpathSync=function(file,...args){const full=path.resolve(file);global.guardRaceChecks.push(full);
      if(full===target&&armed&&!fired){fired=true;unlink(target);throw Object.assign(new Error('Injected vanished claim'),{code:'ENOENT'});}
      return realpath.call(this,file,...args);};
  `);
  const receipt = sample.copy(), result = runRaceFixture(sample, receipt);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.denials, []);
  assert.equal(fs.readFileSync(path.join(receipt.root, 'outputs/race/claim'), 'utf8'), 'new owner');
  const checks = JSON.parse(result.stdout.split('RACE_CHECKS ')[1].trim());
  const leaf = checks.indexOf(path.join(receipt.root, 'outputs/race/claim'));
  assert.ok(leaf >= 0);
  assert.ok(checks.slice(leaf + 1).includes(path.join(receipt.root, 'outputs/race')));
  assert.ok(checks.slice(leaf + 1).includes(path.join(receipt.root, 'outputs')));
  assert.ok(checks.slice(leaf + 1).includes(receipt.root));
});

test('ENOENT leaf race still rejects an enclosing dependency alias outside the copy', t => {
  const sample = fixture(t, "try{require('fs').writeFileSync('node_modules/new-claim','bad')}catch(error){console.log(error.code)}");
  sample.put('node_modules/original.txt', 'dependency');
  sample.put('scripts/race_preload.js', `
    const fs=require('fs'),path=require('path'),exists=fs.existsSync,realpath=fs.realpathSync;
    const target=path.join(process.env.SKILL_ISOLATION_ROOT,'node_modules/new-claim');let fired=false;
    fs.existsSync=function(file){if(path.resolve(file)===target&&!fired)return true;return exists.call(this,file);};
    fs.realpathSync=function(file,...args){if(path.resolve(file)===target&&!fired){fired=true;throw Object.assign(new Error('Injected vanished alias leaf'),{code:'ENOENT'});}return realpath.call(this,file,...args);};
  `);
  const receipt = sample.copy({ dependencies: true }), result = runRaceFixture(sample, receipt);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.denials.some(item => item.category === 'ALIASED_OUTSIDE_COPY_WRITE'));
  assert.equal(fs.existsSync(path.join(sample.source, 'node_modules/new-claim')), false);
});

for (const code of ['EACCES', 'EPERM', 'EIO']) test(`non-ENOENT realpath ${code} is preserved and no write occurs`, t => {
  const sample = fixture(t, `try{require('fs').writeFileSync('outputs/existing-claim','bad')}catch(error){if(error.code!==${JSON.stringify(code)})throw error;console.log(error.code);}`);
  sample.put('outputs/existing-claim', 'preserved');
  sample.put('scripts/race_preload.js', `
    const fs=require('fs'),path=require('path'),realpath=fs.realpathSync;const target=path.join(process.env.SKILL_ISOLATION_ROOT,'outputs/existing-claim');
    fs.realpathSync=function(file,...args){if(path.resolve(file)===target)throw Object.assign(new Error('Injected realpath fault'),{code:${JSON.stringify(code)}});return realpath.call(this,file,...args);};
  `);
  const receipt = sample.copy(), result = runRaceFixture(sample, receipt);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), code);
  assert.equal(fs.readFileSync(path.join(receipt.root, 'outputs/existing-claim'), 'utf8'), 'preserved');
  assert.deepEqual(result.denials, []);
});

test('guarded original four-writer concurrency retains all 48 acknowledged telemetry events', t => {
  const fixtureTest = fs.readFileSync(path.resolve(__dirname, 'test_telemetry_measurement_contracts.js'), 'utf8');
  const sample = fixture(t, `
    const cp=require('child_process'),env={...process.env};delete env.NODE_TEST_CONTEXT;
    const result=cp.spawnSync(process.execPath,['--test','--test-name-pattern=concurrent writers retain every acknowledged event','tests/unit/test_telemetry_measurement_contracts.js'],{cwd:process.env.SKILL_ISOLATION_ROOT,env,encoding:'utf8',timeout:20000});
    process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
    if(result.status!==0)throw Error('Original guarded concurrency fixture failed: '+result.status);
  `);
  sample.put('tests/unit/test_telemetry_measurement_contracts.js', fixtureTest);
  for (const file of ['fs_compat', 'workflow_lease', 'telemetry_measurement', 'telemetry_populations', 'telemetry_legacy_migration', 'telemetry_measurement_store']) {
    sample.put(`scripts/lib/system/${file}.js`, fs.readFileSync(path.resolve(__dirname, `../../scripts/lib/system/${file}.js`)));
  }
  sample.put('scripts/maintenance/skill_workflow/io.js', fs.readFileSync(path.resolve(__dirname, '../../scripts/maintenance/skill_workflow/io.js')));
  const receipt = sample.copy(), record = run(receipt);
  assert.equal(record.exitCode, 0, fs.readFileSync(path.join(record.runDir, 'stderr.log'), 'utf8'));
  assert.equal(record.sourceProtectedUnchanged, true);
  assert.deepEqual(record.deniedAttempts, []);
  const stdout = fs.readFileSync(path.join(record.runDir, 'stdout.log'), 'utf8');
  assert.match(stdout, /concurrent writers retain every acknowledged event/);
  assert.match(stdout, /tests 1/);
  assert.match(stdout, /pass 1/);
  assert.match(stdout, /fail 0/);
});
