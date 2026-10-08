'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { projectLedgerArtifacts } = require('../../scripts/maintenance/skill_workflow/golden_ledger_artifacts.js');
const DATE = '2026-10-06T07:16:12.350Z';
function fixture() {
 const content = { version:'2.0.0',traceId:'TRC-RECORDED', execution:{},health:{},customerInput:{},sharedState:{},phases:{},events:[],candidateAttempts:[],phaseResolutions:[],workflowFailures:[],activeRulesReached:[],arbitrationDecisions:[],modernizationDecisions:[],skuAuditLedger:[],notebookLmTraces:[],artifacts:[{role:'INPUT_BOQ',filePath:'bad.xlsx',recordedAt:DATE,exists:true,sizeBytes:3,sha256:'literal-hash',content:{recordedAt:DATE}}] };
 const artifact={path:'outputs/history/evidence_logs/evidence_log_TRC-RECORDED.json',state:'PARSED_JSON',content};
 return {artifact,parsed:{response:{traceId:'TRC-RECORDED'}}};
}
function project(f){return projectLedgerArtifacts([f.artifact],f.parsed,process.cwd())[0];}
test('bound ledger projects artifact observation time only and preserves original raw object',()=>{ const f=fixture(),r=project(f);assert.equal(r.content.artifacts[0].recordedAt,'<GENERATED_LEDGER_RUNTIME_FIELD>');assert.equal(f.artifact.content.artifacts[0].recordedAt,DATE);assert.equal(r.content.artifacts[0].content.recordedAt,DATE); });
for(const key of ['role','filePath','exists','sizeBytes','sha256'])test('artifact '+key+' remains comparison-sensitive',()=>{const f=fixture(),base=project(f);f.artifact.content.artifacts[0][key]='changed';assert.notDeepEqual(project(f),base);});
test('invalid observation date remains literal',()=>{const f=fixture();f.artifact.content.artifacts[0].recordedAt='literal';assert.equal(project(f).content.artifacts[0].recordedAt,'literal');});
test('foreign trace remains literal',()=>{const f=fixture();f.parsed.response.traceId='TRC-OTHER';assert.deepEqual(project(f),f.artifact);assert.equal(project(f).content.artifacts[0].recordedAt,DATE);});
test('foreign ledger path remains literal',()=>{const f=fixture();f.artifact.path='outputs/other.json';assert.equal(project(f).content.artifacts[0].recordedAt,DATE);});
