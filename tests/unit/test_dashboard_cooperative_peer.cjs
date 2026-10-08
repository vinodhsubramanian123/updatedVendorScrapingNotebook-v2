'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'test_dashboard_cooperative.cjs'),'utf8');
const fixture=source.slice(source.indexOf('function response()'),source.indexOf("test('Only owned"));
const harness=vm.runInNewContext(fixture+'\nharness;',{
  fs,path,vm,root:path.resolve(__dirname,'../..'),
  receipt:path.join(path.resolve(__dirname,'../..'),'tests/receipts/dashboard-cooperative'),
  require,console,Date,Buffer,process,
  EventEmitter:require('node:events'),cp:require('node:child_process')
});

test('Invalid retry cannot reuse a pending valid cancellation or change its reason',async()=>{
  let resolve,calls=0,options;
  const h=harness({owned:true,terminate:(p,o)=>{calls++;options=o;return new Promise(r=>resolve=r);}});
  const p=h.start(),reason={original:true};
  const pending=h.kill({reason,graceMs:23});
  const bad=await h.kill({reason:'replacement',graceMs:0});
  assert.equal(bad.statusCode,400);assert.equal(calls,1);assert.equal(options.reason,reason);
  assert.equal(options.graceMs,23);assert.equal(h.active.process,p);
  resolve({exitConfirmed:false});await pending;
  assert.equal(p._terminationPromise,undefined);
});

test('False, zero, empty string and null cancellation reasons preserve exact values',async()=>{
  for(const reason of[false,0,'',null]){
    let actual;
    const h=harness({owned:true,terminate:async(p,o)=>{actual=o.reason;return{exitConfirmed:false};}});
    h.start();await h.kill({reason});assert.ok(Object.is(actual,reason));
  }
});

test('Old evaluator close cannot clear a replacement task after unconfirmed cancellation',async()=>{
  const h=harness({owned:true,terminate:async()=>({exitConfirmed:false})});
  const old=h.start();await h.kill();
  // Simulate an independently established replacement owner through the manager API
  // by closing old first, starting a fresh evaluator, and receiving duplicate old close.
  old.emit('close',1);
  const replacement=h.start();old.emit('close',1);
  assert.equal(h.active.process,replacement);
  assert.equal(h.events.filter(e=>e.type==='TASK_COMPLETED').length,1);
});

test('Real shared helper retries unconfirmed termination without release until actual close',async()=>{
  const h=harness({owned:true}),p=h.start();
  const sends=[],kills=[];p.send=(message,callback)=>{sends.push(message);if(callback)callback();};
  p.kill=signal=>{kills.push(signal);return true;};
  const first=await h.kill({reason:'first',graceMs:5,confirmationMs:5});
  assert.equal(first.data.status,'EXIT_UNCONFIRMED');assert.equal(h.active.process,p);
  assert.equal(p._terminationPromise,undefined);assert.equal(sends.length,1);
  const retry=h.kill({reason:'second',graceMs:20,confirmationMs:5});
  assert.equal(sends.length,2);assert.equal(sends[1].reason,'second');
  p.exitCode=1;p.emit('close',1);
  const final=await retry;assert.equal(final.data.status,'CANCELLED');assert.equal(h.active,null);
  assert.deepEqual(kills,['SIGTERM','SIGKILL']);
  assert.equal(h.events.filter(e=>e.type==='TASK_COMPLETED').length,1);
});
