'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const { EventEmitter, getEventListeners } = require('events');
const root = path.resolve(__dirname, '../..');
const budget = require('../../scripts/lib/system/execution_budget');
const attempts = require('../../scripts/lib/notebook/query_attempt_record');
const notebook = '12345678-1234-1234-1234-123456789abc';
const log = { info() {}, warn() {}, error() {} };
const turn = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function queryHarness() {
  let now = 1000, callback, execution;
  const records = [], unknown = new WeakMap(), signals = new WeakMap();
  const tracker = { createAttempt(data) { const record = { ...data, attemptId: 'actual-test-attempt', attemptPath: 'fixture-attempt.json', status: 'DISPATCH_INTENT' }; records.push(record);
    return { update(fields) { Object.assign(record, fields); }, diagnostic() { return { attemptId: record.attemptId, attemptPath: record.attemptPath, conversationId: record.conversationId || null, verification: 'NOT_VERIFIED', remoteState: 'REMOTE_STATE_UNKNOWN' }; } }; },
  returnedConversationId: attempts.returnedConversationId,
  markRemoteUnknown(error, diagnostic, signal) { if (error && typeof error === 'object') unknown.set(error, diagnostic); if (signal?.aborted) signals.set(signal, diagnostic); },
  isRemoteUnknown: error => Boolean(error && typeof error === 'object' && unknown.has(error)),
  getNotebookQueryRecovery(error, signal) { const found = error && typeof error === 'object' ? unknown.get(error) : signals.get(signal); return found?.() || null; } };
  const stats = { spawn: 0, fallback: 0 };
  const module = { exports: {} }, filename = path.join(root, 'scripts/lib/notebook/notebook_query_utils.js');
  const requireMock = dependency => {
    if (dependency === 'child_process') return { execFile(executable, args, options, cb) { stats.spawn++; execution = { args, options }; callback = cb; return { pid: 77 }; } };
    if (dependency === 'fs') return { existsSync: () => false, readFileSync: () => JSON.stringify({ notebooks: { Demo: { notebookId: notebook, officialSourceIds: ['official'] } } }) };
    if (dependency.includes('execution_budget')) return budget;
    if (dependency.includes('query_attempt_record')) return tracker;
    if (dependency.includes('query_sanitizer')) return { sanitizeNotebookQuery: value => value };
    if (dependency.includes('query_diagnostics')) return { postProcessNotebookResult: JSON.parse, diagnoseNotebookFailure: () => ({ rootCause: 'ordinary' }) };
    if (dependency.includes('job_manager') || dependency.includes('knowledge_extractor')) return {};
    if (dependency.includes('pipeline_logger')) return log;
    if (dependency.includes('local_rag_search')) return { queryLocalKnowledgeBase() { stats.fallback++; return { answer: 'local' }; } };
    if (dependency.includes('fs_compat')) return { safeWriteJsonAtomic() {} };
    return require(dependency);
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: requireMock, __dirname: path.dirname(filename), process: { env: {}, platform: process.platform }, Date: class extends Date { static now() { return now; } }, setInterval: () => 0, clearInterval() {} });
  return { run: module.exports.executeNotebookQuery, recovery: module.exports.getNotebookQueryRecovery, records, stats, advance(ms) { now += ms; }, finish(...args) { callback(...args); }, get execution() { return execution; } };
}
test('query and child budgets are distinct; offline120000, online1800000, legacy child alias preserved', () => {
  assert.equal(budget.logicalQueryOptions({}, 1000).queryTimeoutMs, 600000);
  assert.equal(budget.childTimeout({}, 1000), 1800000);
  assert.equal(budget.childTimeout({ offline: true }, 1000), 120000);
  assert.equal(budget.childTimeout({ timeoutMs: 321000, queryTimeoutMs: 600000 }, 1000), 321000);
  assert.equal(budget.childTimeout({ childTimeoutMs: 900000, timeoutMs: 321000 }, 1000), 900000);
});
test('healthy eight-minute logical query succeeds without real wait and advisory15000 stays separate', async () => {
  const h = queryHarness(), pending = h.run(notebook, 'whole manifest'); await turn();
  assert.equal(h.execution.options.timeout, 600000); assert.equal(h.records[0].deadlineAt, 601000);
  h.advance(480000); h.finish(null, JSON.stringify({ answer: 'healthy', groundingVerification: 'VERIFIED_GROUNDED', conversation_id: 'returned-conversation' }), '');
  const result = await pending; assert.equal(result.answer, 'healthy'); assert.equal(result.latencyMs, 480000); assert.equal(result.attempts, 1);
  assert.equal(h.records[0].conversationId, 'returned-conversation'); assert.equal(h.stats.spawn, 1);
  const advisory = queryHarness(), short = advisory.run(notebook, 'advisory', { timeout: 15000 }); await turn();
  assert.equal(advisory.execution.options.timeout, 15000); advisory.finish(null, JSON.stringify({ answer: 'advisory' }), ''); await short;
});
test('shared absolute deadline caps query once; generic503 and socket never resubmit or fallback', async () => {
  for (const message of ['503', 'socket timeout']) {
    const h = queryHarness(), error = Object.freeze(new Error(message));
    const pending = h.run(notebook, 'whole', { queryTimeoutMs: 600000, deadlineAt: 5000, maxRetries: 10 }); await turn();
    assert.equal(h.execution.options.timeout, 4000); h.advance(8000); h.finish(error, '{}', '');
    await assert.rejects(pending, value => value === error); assert.equal(h.stats.spawn, 1); assert.equal(h.stats.fallback, 0);
    assert.equal(h.recovery(error).remoteState, 'REMOTE_STATE_UNKNOWN'); assert.equal(h.records[0].deadlineAt, 5000);
  }
});
test('active cancellation preserves false/null/NaN/frozen identity and weak signal diagnostic; late callback cannot promote', async () => {
  for (const reason of [false, null, NaN, Object.freeze({ stop: true })]) {
    const h = queryHarness(), controller = new AbortController(), pending = h.run(notebook, 'whole', { signal: controller.signal }); await turn();
    controller.abort(reason); await assert.rejects(pending, value => Object.is(value, reason));
    assert.equal(h.recovery(reason, controller.signal).attemptPath, 'fixture-attempt.json');
    h.finish(null, JSON.stringify({ answer: 'late', conversation_id: 'actual-late-id' }), '');
    assert.equal(h.stats.spawn, 1); assert.equal(h.stats.fallback, 0); assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
    assert.equal(h.records[0].status, 'LOCAL_ABORT_REQUESTED'); assert.equal(h.records[0].conversationId, 'actual-late-id');
  }
});
test('invalid/expired numeric budgets perform no dispatch or fallback', async () => {
  for (const key of ['queryTimeoutMs', 'deadlineAt', 'childTimeoutMs']) for (const value of [false, '600000', 0, -1, 0.5, NaN, Infinity]) {
    assert.throws(() => budget.validateBudgetOptions({ [key]: value }), /positive safe integer/);
  }
  const h = queryHarness(); await assert.rejects(h.run(notebook, 'whole', { deadlineAt: 999 }), error => error.code === 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED');
  assert.equal(h.stats.spawn, 0); assert.equal(h.stats.fallback, 0); assert.equal(h.records.length, 0);
});
test('durable initial attempt binds hash/source/deadline and explicit conversation ID only', () => {
  const record = attempts.createAttempt({ notebookId: notebook, query: 'private manifest', sourceIds: ['source-a'], startedAt: 1000, deadlineAt: 601000, timeoutMs: 600000 });
  const disk = JSON.parse(fs.readFileSync(record.file)); assert.equal(disk.querySha256.length, 64); assert.equal(disk.notebookId, notebook);
  assert.deepEqual(disk.sourceIds, ['source-a']); assert.equal(disk.deadlineAt, 601000); assert.equal(disk.verification, 'NOT_VERIFIED'); assert.equal(disk.remoteState, 'REMOTE_STATE_UNKNOWN');
  assert.equal(JSON.stringify(disk).includes('private manifest'), false); assert.equal(disk.conversationId, null);
  assert.equal(attempts.returnedConversationId('{"latest_chat":"invented"}'), null);
  record.update({ conversationId: attempts.returnedConversationId('{"conversation_id":"explicit-id"}') });
  assert.equal(JSON.parse(fs.readFileSync(record.file)).conversationId, 'explicit-id');
  const error = Object.freeze(new Error('timeout')); attempts.markRemoteUnknown(error, () => record.diagnostic());
  assert.equal(attempts.getNotebookQueryRecovery(error).attemptPath, record.file);
});

function loadFacade(execute) {
  const module = { exports: {} }, filename = path.join(root, 'scripts/evaluators/eval_multi_boq.js');
  const requireMock = name => {
    if (name === 'fs') return { existsSync: () => true };
    if (name.includes('execution_budget')) return budget;
    if (name.includes('multi_child_evaluation')) return { executeGroupChild: execute };
    if (name.includes('multi_group_plan')) return { planWorkbookGroups: () => [{ filePath: 'a.csv', sheetName: 'A' }, { filePath: 'b.csv', sheetName: 'B' }] };
    if (name.includes('multi_facility_summary')) return { attachGroupEvidence: (_, results) => results };
    if (name === 'xlsx-js-style') return { readFile: () => ({}) };
    return require(name);
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: requireMock, __dirname: path.dirname(filename), process: { env: { CI: '1' }, argv: [] }, console, Date });
  return module.exports;
}
test('group2 receives unchanged shared absolute deadline/query budget and child alias', async () => {
  const seen = [], deadlineAt = Date.now() + 100000;
  const facade = loadFacade(async (group, options) => { seen.push({ group, options }); return { status: 'ACTION_REQUIRED' }; });
  await facade.evaluateMultiBoq('fixture.xlsx', { queryTimeoutMs: 600000, timeoutMs: 1800000, deadlineAt });
  assert.equal(seen.length, 2); for (const value of seen) { assert.equal(value.options.deadlineAt, deadlineAt); assert.equal(value.options.queryTimeoutMs, 600000); assert.equal(value.options.timeoutMs, 1800000); }
  await assert.rejects(facade.evaluateMultiBoq('fixture.xlsx', { deadlineAt: 1 }), error => error.code === 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED'); assert.equal(seen.length, 2);
});
test('child lifetime survives eight fake minutes online; explicit query/deadline flags propagate; expired no spawn', async () => {
  let now = 1000, spawnCount = 0, timerMs, args, child;
  const filename = path.join(root, 'scripts/lib/boq/multi_child_evaluation.js'), module = { exports: {} };
  const requireMock = name => {
    if (name === 'child_process') return { spawn(command, childArgs) { spawnCount++; args = childArgs; child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.exitCode = null; child.signalCode = null; return child; } };
    if (name.includes('execution_budget')) return budget;
    if (name.includes('observed_child_process')) return { spawnObservedChild: (_, file, start) => start({}) };
    if (name.includes('child_termination')) return { requestChildTermination: () => assert.fail('healthy child must not be terminated') };
    return require(name);
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: requireMock, __dirname: path.dirname(filename), __filename: filename, process: { execPath: process.execPath, env: {} }, Date: class extends Date { static now() { return now; } }, Buffer, setTimeout(fn, ms) { timerMs = ms; return 1; }, clearTimeout() {} });
  const pending = module.exports.executeGroupChild({ filePath: 'fixture.csv', sheetName: 'Server Config' }, { queryTimeoutMs: 600000, deadlineAt: 2000000 });
  assert.equal(timerMs, 1800000); assert.equal(args[args.indexOf('--query-timeout-ms') + 1], '600000'); assert.equal(args[args.indexOf('--deadline-at') + 1], '2000000');
  now += 480000; child.stdout.emit('data', Buffer.from('__EVAL_RESULT_JSON__{"status":"ACTION_REQUIRED"}__EVAL_RESULT_JSON__')); child.emit('close', 0, null);
  assert.equal((await pending).status, 'ACTION_REQUIRED');
  await assert.rejects(module.exports.executeGroupChild({ filePath: 'x', sheetName: 's' }, { deadlineAt: 1 }), error => error.code === 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED'); assert.equal(spawnCount, 1);
});

test('conversation identity rejects local job IDs, conflicting fields and ambiguous generic chat recovery', async () => {
  assert.equal(attempts.returnedConversationId('{"conversation_id":"JOB_NLM_123_abc"}'), null);
  assert.equal(attempts.returnedConversationId('{"conversation_id":"one","conversationId":"two"}'), null);
  assert.equal(attempts.returnedConversationId('{"chatSessionId":"latest"}'), null);
  const h = queryHarness(), pending = h.run(notebook, 'same prefix with different whole manifest'); await turn();
  const error = Object.freeze(new Error('socket timeout')); h.finish(error, '{"conversation_id":"remote-exact-id"}', '');
  await assert.rejects(pending, value => value === error);
  assert.equal(h.recovery(error).conversationId, 'remote-exact-id'); assert.equal(h.stats.spawn, 1);
  const source = fs.readFileSync(path.join(root, 'scripts/lib/notebook/notebook_query_utils.js'), 'utf8');
  assert.equal(/\['chats', 'list'/.test(source), false);
});

function jobHarness(initial = []) {
  const records = new Map(initial.map(job => [job.jobId, {...job}])); const scheduled = [];
  const store = { computeIdempotencyKey: () => 'fixed-key', saveJob(job) { records.set(job.jobId, {...job}); },
    getJob: id => records.get(id), updateJob(id, fields) { Object.assign(records.get(id), fields); },
    findJobByIdempotencyKey: key => [...records.values()].find(job => job.idempotencyKey === key),
    listActiveJobs: () => [...records.values()].filter(job => job.status === 'PROCESSING') };
  const filename = path.join(root, 'scripts/lib/notebook/job_manager.js'), module = { exports: {} };
  const requireMock = name => {
    if (name.includes('persistent_job_store')) return store;
    if (name.includes('query_sanitizer')) return { sanitizeNotebookQuery: value => value, classifyQueryScenario: () => 'test' };
    if (name.includes('query_diagnostics')) return { diagnoseNotebookFailure: () => ({}) };
    if (name.includes('execution_budget')) return budget;
    if (name.includes('query_attempt_record')) return attempts;
    return require(name);
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { require: requireMock, module, exports: module.exports, AbortController,
    Date: class extends Date { static now() { return 10000; } }, setInterval: () => 0, clearInterval() {}, setImmediate: fn => scheduled.push(fn), process: {env: {}} });
  return { api: module.exports, records, scheduled };
}

test('restart never redispatches persisted unknown jobs, with or without remote ID or expired deadline', () => {
  for (const deadlineAt of [5000, 20000]) for (const conversationId of [null, 'remote-exact']) {
    const job = { jobId: 'JOB_NLM_local', idempotencyKey: 'fixed-key', notebookId: notebook, query: 'whole', status: 'PROCESSING', startTime: 1000, deadlineAt,
      queryAttempt: { attemptId: 'attempt', conversationId, remoteState: 'REMOTE_STATE_UNKNOWN', verification: 'NOT_VERIFIED' } };
    const h = jobHarness([job]); let dispatches = 0;
    const recovered = h.api.resumePendingJobs(() => { dispatches++; });
    assert.equal(dispatches, 0); assert.equal(recovered.length, 1); assert.equal(h.scheduled.length, 0);
    const state = h.api.getAsyncNotebookQueryJobStatus(job.jobId); assert.equal(state.status, 'FAILED');
    assert.equal(state.diagnostic.remoteState, 'REMOTE_STATE_UNKNOWN'); assert.equal(state.diagnostic.verification, 'NOT_VERIFIED');
    assert.equal(state.diagnostic.queryRecovery.conversationId, conversationId);
    const repeat = h.api.startAsyncNotebookQueryJob(notebook, 'whole', {}, () => { dispatches++; });
    assert.equal(repeat.jobId, job.jobId); assert.equal(repeat.recoveryRequired, true); assert.equal(dispatches, 0); assert.equal(h.scheduled.length, 0);
  }
});

test('running async query remains joined while active; restart helper leaves live owned jobs alone', () => {
  const h = jobHarness(); const started = h.api.startAsyncNotebookQueryJob(notebook, 'whole', {}, async () => ({answer: 'ok'}));
  h.records.get(started.jobId).queryAttempt = {remoteState: 'REMOTE_STATE_UNKNOWN'};
  const joined = h.api.startAsyncNotebookQueryJob(notebook, 'whole', {}, async () => assert.fail('duplicate dispatch'));
  assert.equal(joined.joinedInFlight, true); assert.equal(h.scheduled.length, 1);
  assert.equal(h.api.resumePendingJobs(() => assert.fail('restart duplicate')).length, 0);
});

test('source attachment and delete readback preserve cross-platform executable/PATH and45/20s operation budgets', () => {
  for (const platform of ['win32', 'linux']) {
    const commands = [], filename = path.join(root, 'scripts/lib/sync/nlm_solution_source_validator.js'), module = { exports: {} };
    const fakeFs = {existsSync: () => true};
    const requireMock = name => {
      if (name === 'fs') return fakeFs;
      if (name === 'os') return {homedir: () => '/test-home'};
      if (name === 'child_process') return {execFileSync(executable, args, options) { commands.push({executable,args,options});
        if (args[1] === 'add') return '{"source_id":"run-owned-source"}'; if (args[1] === 'list') return '[]'; return ''; }};
      if (name.includes('pipeline_logger')) return log;
      if (name.startsWith('../')) return {};
      return require(name);
    };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {require: requireMock,module,exports: module.exports,__dirname:path.dirname(filename),process:{platform,env:{PATH:'/existing'}},Date});
    assert.equal(module.exports.attachSolutionSource(notebook,'fixture.csv','title').sourceId,'run-owned-source');
    assert.equal(module.exports.detachSolutionSource(notebook,'run-owned-source'),true);
    assert.equal(commands.length,3); assert.deepEqual(commands.map(command => command.options.timeout),[45000,20000,20000]);
    for (const command of commands) {assert.equal(command.executable,path.join('/test-home','.local','bin',platform === 'win32' ? 'nlm.exe':'nlm'));assert.equal(command.options.env.PATH.includes('/existing'),true);}
  }
});

test('durable update failure is visible without replacing frozen failure or abort identities', () => {
  const filename = path.join(root, 'scripts/lib/notebook/query_attempt_record.js'), module = {exports: {}}; let writes = 0;
  const requireMock = name => { if (name === 'fs') return {mkdirSync() {}};
    if (name.includes('fs_compat')) return {safeWriteJsonAtomic() { if (++writes > 1) { const error = new Error('locked attempt file'); error.code = 'EPERM'; throw error; } }};
    return require(name); };
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:requireMock,module,exports:module.exports,__dirname:path.dirname(filename)});
  const api=module.exports, record=api.createAttempt({notebookId:notebook,query:'whole',sourceIds:['official'],startedAt:1000,deadlineAt:601000,timeoutMs:600000});
  assert.equal(record.update({status:'LOCAL_QUERY_FAILED'}),false);
  assert.equal(record.diagnostic().persistence.lastWriteSucceeded,false); assert.equal(record.diagnostic().persistence.error.code,'EPERM');
  const error=Object.freeze(new Error('socket')); api.markRemoteUnknown(error,()=>record.diagnostic());
  assert.equal(api.getNotebookQueryRecovery(error).persistence.lastWriteSucceeded,false);
  assert.equal(error.message,'socket');
});
