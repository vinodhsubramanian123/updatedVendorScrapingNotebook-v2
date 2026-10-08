'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {projectLedgerArtifacts}=require('../../scripts/maintenance/skill_workflow/golden_ledger_artifacts.js');
const {semanticProjection,compareGolden,policy}=require('../../scripts/maintenance/skill_workflow/golden_projection.js');
const {safeWriteJsonAtomic}=require('../../scripts/lib/system/fs_compat.js');
const authorRoot=path.resolve(__dirname,'../..'),diagnostic=JSON.parse(fs.readFileSync(path.join(authorRoot,'receipts/pilot-diagnostic.json'),'utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fixture(t,number=1,mutate=()=>{},options={}){
 const observed=diagnostic.records[number-1],root=fs.mkdtempSync(path.join(os.tmpdir(),'ledger-projection-test-'));
 t.after(()=>{const resolved=fs.realpathSync(root),temp=fs.realpathSync(os.tmpdir());assert.ok(resolved.startsWith(temp+path.sep));assert.match(path.basename(resolved),/^ledger-projection-test-/);fs.rmSync(root,{recursive:true,force:true});});
 for(const name of ['evidence_ledger','pipeline_logger','trace_context','fs_compat']){const target=path.join(root,'scripts/lib/system',name+'.js');fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(authorRoot,'scripts/lib/system',name+'.js'),target);}
 const ledgerArtifact=observed.artifactSemantics.find(item=>item.state==='PARSED_JSON'),ledger=structuredClone(ledgerArtifact.content);mutate(ledger);
 const ledgerPath=options.ledgerPath||ledgerArtifact.path,summaryPath=options.summaryPath||ledgerArtifact.path.replace('evidence_log_','evidence_summary_').replace(/\.json$/,'.md');
 const {EvidenceLedger}=require(path.join(root,'scripts/lib/system/evidence_ledger.js'));
 const instance=Object.create(EvidenceLedger.prototype);Object.assign(instance,ledger);
 const sourceSummary=options.reuseObservedSummary?fs.readFileSync(path.join(authorRoot,'receipts/pilot/pass-'+number,path.basename(summaryPath))):Buffer.from(EvidenceLedger.prototype._renderMarkdownSummary.call(instance),'utf8');
 const summary=options.summarySuffix?Buffer.concat([sourceSummary,Buffer.from(options.summarySuffix)]):sourceSummary;
 const jsonFile=path.join(root,ledgerPath),mdFile=path.join(root,summaryPath);fs.mkdirSync(path.dirname(jsonFile),{recursive:true});fs.mkdirSync(path.dirname(mdFile),{recursive:true});safeWriteJsonAtomic(jsonFile,ledger);fs.writeFileSync(mdFile,summary);
 const artifacts=[{path:ledgerPath,state:'PARSED_JSON',content:ledger},{path:summaryPath,state:'EXACT_BYTES',bytes:summary.length,sha256:sha(summary)}];
 const parsed=structuredClone(observed.raw);if(options.foreignReturnedTrace){parsed.response.traceId='TRC-FOREIGN';parsed.response.result.traceId='TRC-FOREIGN';}
 const projected=projectLedgerArtifacts(artifacts,parsed,root);
 return {root,ledger,parsed,artifacts,projected,observed,summary,semantic:semanticProjection({response:parsed.response,error:parsed.error,envelopes:parsed.envelopes,artifacts:projected},{root:observed.root})};
}
test('policy v2 exact pilot pair reprojects reproducibly with raw Markdown bytes intact',t=>{
 const first=fixture(t,1,()=>{},{reuseObservedSummary:true}),second=fixture(t,2,()=>{},{reuseObservedSummary:true});
 assert.equal(policy.version,5);assert.equal(first.projected[0].state,'BOUND_EVIDENCE_LEDGER');assert.equal(first.projected[1].state,'VERIFIED_CANONICAL_LEDGER_SUMMARY');
 assert.equal(second.projected[1].state,'VERIFIED_CANONICAL_LEDGER_SUMMARY');assert.equal(compareGolden(first.semantic,second.semantic).equal,true);
 assert.notEqual(first.artifacts[1].sha256,second.artifacts[1].sha256);assert.equal(sha(fs.readFileSync(path.join(first.root,first.artifacts[1].path))),first.artifacts[1].sha256);
 assert.equal(first.projected[0].content.health.workflowStatus,'INCOMPLETE');assert.ok(first.projected[0].content.health.gaps.includes('PHASE_3_MISSING'));
});
test('only proven typed runtime fields normalize and phase durations preserve invalid values',t=>{
 const base=fixture(t);
 const generated=fixture(t,1,ledger=>{ledger.startedAt='2026-10-06T00:00:00Z';ledger.completedAt='2026-10-06T00:00:01Z';ledger.totalDurationMs=1000;for(const phase of Object.values(ledger.phases)){phase.startedAt='2026-10-06T00:00:00Z';phase.completedAt='2026-10-06T00:00:01Z';phase.durationMs=1000;}for(const event of ledger.events)event.timestamp='2026-10-06T00:00:00Z';});
 assert.equal(compareGolden(base.semantic,generated.semantic).equal,true);
 for(const value of ['3',true,-1,null,'not-time']){
  const changed=fixture(t,1,ledger=>{ledger.totalDurationMs=value;ledger.phases.phase_1.durationMs=value;});assert.equal(compareGolden(base.semantic,changed.semantic).equal,false,JSON.stringify(value));
 }
 const invalidTime=fixture(t,1,ledger=>{ledger.startedAt='2026-02-30T00:00:00Z';ledger.events[0].timestamp='invalid';});assert.equal(compareGolden(base.semantic,invalidTime.semantic).equal,false);
});
for(const[name,mutate]of [
 ['status',ledger=>{ledger.phases.phase_1.status='FAILED';}],
 ['sku',ledger=>{ledger.phases.phase_1.outputSummary={sku:'CHANGED-SKU'};}],
 ['price',ledger=>{ledger.customerInput.price=0;}],
 ['source date',ledger=>{ledger.customerInput.sourceDate='2026-10-06';}],
 ['ordering',ledger=>{ledger.events.reverse();}],
 ['manifest hash',ledger=>{ledger.execution.sourceManifestSha256='CHANGED-HASH';}],
 ['new branch runtime',ledger=>{ledger.candidateAttempts.push({timestamp:'2026-10-06T00:00:00Z'});}],
 ['other phase runtime',ledger=>{ledger.phases.phase_3={status:'NOT_RUN',startedAt:'2026-10-06T00:00:00Z',completedAt:null,durationMs:0};}]
])test('complete ledger '+name+' mutation remains a semantic difference',t=>{
 const base=fixture(t),changed=fixture(t,1,mutate);assert.equal(compareGolden(base.semantic,changed.semantic).equal,false,name);
});
test('changed Markdown text cannot obtain canonical summary projection',t=>{
 const base=fixture(t),changed=fixture(t,1,()=>{},{summarySuffix:'\nChanged human statement'});
 assert.equal(changed.projected[1].state,'EXACT_BYTES');assert.equal(compareGolden(base.semantic,changed.semantic).equal,false);
});
test('false filename, foreign trace and unsupported schema keep generic JSON and Markdown unmasked',t=>{
 for(const options of [{ledgerPath:'outputs/history/evidence_logs/arbitrary.json'}, {foreignReturnedTrace:true}]){
  const sample=fixture(t,1,()=>{},options);assert.equal(sample.projected[0].state,'PARSED_JSON');assert.equal(sample.projected[1].state,'EXACT_BYTES');assert.deepEqual(sample.projected,sample.artifacts);
 }
 const schema=fixture(t,1,ledger=>{ledger.version='9.9.9';});assert.equal(schema.projected[0].state,'PARSED_JSON');assert.equal(schema.projected[1].state,'EXACT_BYTES');
});
test('missing pair, schema corruption, generic and malformed artifacts retain exact/raw outcomes',t=>{
 const sample=fixture(t);assert.deepEqual(projectLedgerArtifacts([sample.artifacts[1]],sample.parsed,sample.root),[sample.artifacts[1]]);
 const corrupt=structuredClone(sample.artifacts);corrupt[0].content.events=null;assert.deepEqual(projectLedgerArtifacts(corrupt,sample.parsed,sample.root),corrupt);
 const generic=[{path:'outputs/generic.json',state:'PARSED_JSON',content:{version:'2.0.0',timestamp:'2026-10-06T00:00:00Z',durationMs:123}},{path:'outputs/generic.md',state:'EXACT_BYTES',sha256:'sha',bytes:3},{path:sample.artifacts[0].path,state:'OPAQUE_JSON',sha256:'broken',bytes:1,parseError:{name:'SyntaxError',message:'bad'}}];
 assert.deepEqual(projectLedgerArtifacts(generic,sample.parsed,sample.root),generic);
});
test('summary requires exact bytes/hash and copied canonical renderer without constructor/finalizer',t=>{
 const sample=fixture(t),wrong=structuredClone(sample.artifacts);wrong[1].sha256='0'.repeat(64);assert.equal(projectLedgerArtifacts(wrong,sample.parsed,sample.root)[1].state,'EXACT_BYTES');
 const writer=path.join(sample.root,'scripts/lib/system/evidence_ledger.js'),{EvidenceLedger}=require(writer);
 const finalize=EvidenceLedger.prototype.finalizeAndExport;EvidenceLedger.prototype.finalizeAndExport=()=>{throw Error('finalize prohibited');};
 try{assert.equal(projectLedgerArtifacts(sample.artifacts,sample.parsed,sample.root)[1].state,'VERIFIED_CANONICAL_LEDGER_SUMMARY');}finally{EvidenceLedger.prototype.finalizeAndExport=finalize;}
 fs.unlinkSync(writer);assert.equal(projectLedgerArtifacts(sample.artifacts,sample.parsed,sample.root)[1].state,'EXACT_BYTES');
});
test('canonical captureArtifacts integrates the bound projection while archiving original JSON and MD bytes',t=>{
 const sample=fixture(t,1,()=>{},{reuseObservedSummary:true}),harness=require('../../scripts/maintenance/capture_skill_workflow_goldens.js'),archive=path.join(sample.root,'archive');fs.mkdirSync(archive);
 function rebase(value){if(typeof value==='string')return value.split(sample.observed.root).join(sample.root);if(Array.isArray(value))return value.map(rebase);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,rebase(item)]));return value;}
 const capture=harness.captureArtifacts({root:sample.root,manifest:{files:[]}},rebase(sample.parsed),archive);
 assert.equal(capture.artifactSemantics[0].state,'BOUND_EVIDENCE_LEDGER');assert.equal(capture.artifactSemantics[1].state,'VERIFIED_CANONICAL_LEDGER_SUMMARY');
 for(const artifact of capture.artifacts){const bytes=fs.readFileSync(path.join(archive,artifact.archivePath));assert.equal(sha(bytes),artifact.sha256);assert.equal(bytes.length,artifact.bytes);}
 assert.equal(capture.artifacts[1].sha256,sample.artifacts[1].sha256);
});
test('observed reconciliation verification time is typed and exact-path scoped while audit facts remain',()=>{
 const before={response:{result:{auditReport:{verificationTimestamp:'2026-10-05T00:00:00Z',sourceDate:'2026-10-01',status:'ACTION_REQUIRED',manifestSha256:'same-hash'},otherAudit:{verificationTimestamp:'2026-10-05T00:00:00Z'}}}};
 const runtime=structuredClone(before);runtime.response.result.auditReport.verificationTimestamp='2026-10-06T00:00:00Z';assert.equal(compareGolden(semanticProjection(before),semanticProjection(runtime)).equal,true);
 for(const [field,value]of [['verificationTimestamp','invalid'],['verificationTimestamp','2026-02-30T00:00:00Z'],['verificationTimestamp',0],['sourceDate','2026-10-02'],['status','PASSED'],['manifestSha256','different-hash']]){const changed=structuredClone(before);changed.response.result.auditReport[field]=value;assert.equal(compareGolden(semanticProjection(before),semanticProjection(changed)).equal,false,field);}
 const sibling=structuredClone(before);sibling.response.result.otherAudit.verificationTimestamp='2026-10-06T00:00:00Z';assert.equal(compareGolden(semanticProjection(before),semanticProjection(sibling)).equal,false);
});
