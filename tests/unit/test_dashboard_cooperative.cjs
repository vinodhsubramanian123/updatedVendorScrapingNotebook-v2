'use strict';
const {test}=require('node:test'),assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{EventEmitter}=require('events'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),receipt=path.join(root,'tests/receipts/dashboard-cooperative');
function response(){return{statusCode:200,status(n){this.statusCode=n;return this;},json(x){this.data=x;return this;},on(){},write(){},setHeader(){},end(){}};}
fs.mkdirSync(receipt,{recursive:true});
function harness({owned=false,terminate,real=false}={}){
 const handlers={},events=[],spawns=[];let active;
 const task={isTaskRunning:()=>Boolean(active),getActiveTask:()=>active,_setActiveTask:t=>active=t,broadcastSSE:e=>events.push(e),startTask(){}};
 const load=file=>{const router={post:(n,...h)=>handlers[n]=h.at(-1),get(){}};const sandbox={module:{exports:{}},exports:{},console,Date,Buffer,__filename:path.join(root,file),__dirname:path.dirname(path.join(root,file)),process:{env:{...process.env,OFFLINE_MODE:'1',NODE_ENV:'test',PRESALES_TERMINAL_OWNER:owned?'1':'0',PRESALES_EXECUTION_TRACE:'1'}},require:id=>{
 if(id==='express')return{Router:()=>router};if(id==='path')return path;if(id==='fs')return real?fs:{existsSync:()=>true,writeFileSync(){},mkdirSync(){},unlinkSync(){}};
 if(id==='multer'){const m=()=>({single:()=>()=>{}});m.diskStorage=()=>({});return m;}
 if(id==='child_process')return{spawn:(cmd,args,opts)=>{let p;if(real)p=cp.spawn(process.execPath,args,opts);else{p=new EventEmitter();p.pid=777;p.exitCode=null;p.signalCode=null;p.connected=owned;p.stdout=new EventEmitter();p.stderr=new EventEmitter();}spawns.push({args,opts,p});return p;}};
 if(id.includes('taskManager'))return task;if(id.includes('observed_child_process'))return real?require('../../scripts/lib/system/observed_child_process.js'):{spawnObservedChild:(n,f,start)=>start({})};
 if(id.includes('child_termination'))return{requestChildTermination:terminate||require('../../scripts/lib/system/child_termination.js').requestChildTermination};
 if(id.includes('pathGuard'))return{assertSafePath:p=>p};if(id.includes('errorHandler'))return{asyncHandler:f=>f,sendErrorResponse:(res,n,error)=>res.status(n).json({error})};
 if(id.includes('schemas'))return require('../../scripts/lib/system/schemas.js');if(id.includes('fs_compat'))return real?require('../../scripts/lib/system/fs_compat.js'):{safeWriteJsonAtomic(){}};
 if(id.includes('conflict_graph'))return{invalidateChassisMapCache(){}};return{};
 }};vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox);};
 load('dashboard/routes/evaluation.cjs');load('dashboard/routes/tasks.cjs');
 return{handlers,events,spawns,get active(){return active;},start(body={filepath:'valid_boq.csv'}){handlers['/eval-boq']({body},response());return spawns.at(-1).p;},kill(body={}){const res=response();return Promise.resolve(handlers['/kill-task']({body},res)).then(()=>res);}};
}
test('Only owned evaluator receives IPC; legacy child remains unmarked',()=>{for(const owned of[false,true]){const h=harness({owned}),p=h.start();assert.equal(p._presalesCooperativeCancellation,owned?true:undefined);assert.deepEqual((h.spawns[0].opts.stdio ? Array.from(h.spawns[0].opts.stdio) : undefined),owned?['pipe','pipe','pipe','ipc']:undefined);assert.equal(h.active.process,p);}});
test('Owned kill sends cooperative5000 default and exact reason; explicit valid grace honored',async()=>{for(const graceMs of[undefined,37]){let options;const h=harness({owned:true,terminate:async(p,o)=>{options=o;return{exitConfirmed:false};}}),p=h.start(),reason={why:'cancel'};const res=await h.kill({reason,...(graceMs?{graceMs}:{})});assert.equal(options.cooperative,true);assert.equal(options.graceMs,graceMs||5000);assert.equal(options.reason,reason);assert.equal(res.data.status,'EXIT_UNCONFIRMED');assert.equal(h.active.process,p);assert.equal(p._terminationPromise,undefined);}});
test('Legacy kill options retain no cooperative/default grace keys',async()=>{let options;const h=harness({terminate:async(p,o)=>{options=o;return{exitConfirmed:false};}});h.start();await h.kill();assert.deepEqual(Object.keys(options),['reason']);});
test('Concurrent kill deduplicates; completed unconfirmed can retry; ownership stays held',async()=>{let resolve,calls=0;const h=harness({owned:true,terminate:()=>{calls++;return new Promise(r=>resolve=r);}}),p=h.start();const a=h.kill(),b=h.kill();assert.equal(calls,1);resolve({exitConfirmed:false});await Promise.all([a,b]);assert.equal(h.active.process,p);const retry=h.kill();assert.equal(calls,2);resolve({exitConfirmed:true});await retry;assert.equal(h.active.process,p);p.emit('close',0);assert.equal(h.active,null);assert.equal(h.events.filter(e=>e.type==='TASK_COMPLETED').length,1);});
test('Unrelated helper rejection retains task and permits corrected retry',async()=>{const err=Error('transport'),h=harness({owned:true,terminate:async()=>{throw err;}}),p=h.start();const res=await h.kill();assert.equal(res.statusCode,500);assert.equal(res.data.error,err);assert.equal(h.active.process,p);assert.equal(p._terminationPromise,undefined);});
test('Actual VM dashboard routes own real canonical CLI cancellation and final frame', {timeout:20000},async()=>{
 const oldTrace=process.env.PRESALES_EXECUTION_TRACE;process.env.PRESALES_EXECUTION_TRACE='1';
 const {withExecutionRoot,createJsonSidecarSink,getExecutionHandle}=require('../../scripts/lib/system/execution_scope.js');
 let parentRootId;
 try { await withExecutionRoot({name:'DASHBOARD_CANCELLATION_COMPOSED'},async()=>{
 parentRootId=getExecutionHandle().rootId;
 const h=harness({owned:true,real:true});
 const input=path.join(root,'tests/fixtures/cp11_current_catalog.csv');
 assert.ok(fs.existsSync(input),'Exact existing characterization input');
 const p=h.start({filepath:input,chassisDir:path.join(root,'outputs/ProLiant/Gen12/DL380_Gen12')});
 let out='',stderr='',kills=[];p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>stderr+=d);const kill=p.kill.bind(p);p.kill=s=>{kills.push(s);return kill(s);};
 const closed=new Promise(r=>p.once('close',(code,signal)=>r({code,signal})));
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No ready message')),10000);p.on('message',m=>{if(m.type==='PRESALES_CANCELLATION_READY'){clearTimeout(timer);resolve();}});p.once('error',reject);});
 const res=await h.kill({reason:'dashboard_test_cancel',graceMs:5000});const exit=await closed;
 fs.writeFileSync(path.join(receipt,'real.stdout.log'),out);fs.writeFileSync(path.join(receipt,'real.stderr.log'),stderr);
 assert.equal(res.data.status,'CANCELLED');assert.equal(exit.code,1);assert.deepEqual(kills,[]);assert.equal(h.active,null);
 const results=h.events.filter(e=>e.type==='EVAL_RESULT');assert.equal(results.length,1);assert.equal(results[0].error.status,'CANCELLED');
 assert.equal((out.match(/__EVAL_RESULT_JSON__/g)||[]).length,2);
 const ledgerPath=results[0].error.data.evidenceLogPath,ledger=JSON.parse(fs.readFileSync(ledgerPath));
 assert.equal(Object.values(ledger.phases).length,9);assert.ok(Object.values(ledger.phases).every(p=>p.status!=='RUNNING'));
 const {safeWriteJsonAtomic}=require('../../scripts/lib/system/fs_compat.js');safeWriteJsonAtomic(path.join(receipt,'real-observation.json'),{exit,kills,events:h.events,frameCount:1,parentRootId,ledgerPath,phaseStatuses:Object.values(ledger.phases).map(p=>p.status),limits:['VM route ingress with actual child/helper/CLI; no Express/browser/cloud','Existing CANCELLED envelope is retained under EVAL_RESULT.error; no frontend success claim']});
 },{sink:createJsonSidecarSink(path.join(receipt,'parent-sidecars'))});
 const parentDir=path.join(receipt,'parent-sidecars');
 const parentPath=fs.readdirSync(parentDir).map(f=>path.join(parentDir,f)).find(f=>JSON.parse(fs.readFileSync(f)).rootId===parentRootId);
 assert.ok(parentPath);const parentSidecar=JSON.parse(fs.readFileSync(parentPath));
 assert.ok(parentSidecar.events.some(e=>e.event==='TERMINAL_OBSERVED'));
 const childDir=path.join(root,'outputs/history/evidence_logs');
 const linked=fs.readdirSync(childDir).filter(f=>f.startsWith('execution_trace_')).map(f=>({file:path.join(childDir,f),data:JSON.parse(fs.readFileSync(path.join(childDir,f)))})).filter(x=>x.data.parentRootId===parentRootId);
 assert.equal(linked.length,1,'Current child sidecar links exact parent root');
 const {safeWriteJsonAtomic}=require('../../scripts/lib/system/fs_compat.js');safeWriteJsonAtomic(path.join(receipt,'real-trace-links.json'),{parentRootId,parentSidecar:parentPath,childSidecar:linked[0].file});
 } finally {if(oldTrace===undefined)delete process.env.PRESALES_EXECUTION_TRACE;else process.env.PRESALES_EXECUTION_TRACE=oldTrace;}
});
