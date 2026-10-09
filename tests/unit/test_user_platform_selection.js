'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const os = require('os');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'user-platform-selection-controls-'));
const fixtures = ['DL380_Gen11', 'DL380_Gen12', 'DL360_Gen11'].map(id => {
  const catalogDir = path.join(fixtureRoot, id);
  fs.mkdirSync(catalogDir);
  const catalogJsonPath = path.join(catalogDir, `${id}_Catalog.json`);
  fs.writeFileSync(catalogJsonPath, JSON.stringify({metadata: {chassis:id,...(id==='DL380_Gen12'?{baseSku:'P73282-B21'}:{})},entries:[]}));
  return {id, chassis:id, catalogDir, catalogJsonPath};
});
require('../../scripts/lib/catalog/catalog_discovery.js').listAllCatalogs = () => fixtures;
process.env.PRESALES_QUERY_SHADOW = '0';
test.after(() => fs.rmSync(fixtureRoot,{recursive:true,force:true}));
const helper = require('../../scripts/lib/boq/presales_disambiguation.js');
const router = require('../../scripts/evaluators/route_query.js');
const store = require('../../scripts/lib/boq/user_platform_selection_store.js');
const root = path.resolve(__dirname, '../..');
const selectedDir = fixtures.find(c=>c.id==='DL380_Gen12').catalogDir;
const candidates = ['DL380_Gen11', 'DL380_Gen12'];
const context = { offlineMode: true };
function fresh(query, extra = {}) {
  const body = `require('./scripts/lib/catalog/catalog_discovery.js').listAllCatalogs=()=>${JSON.stringify(fixtures)};require('./scripts/evaluators/route_query.js').executeRoutedQuery(${JSON.stringify(query)},${JSON.stringify({...context,...extra})}).then(r=>console.log('RESULT:'+JSON.stringify(r))).catch(e=>{console.error(e);process.exit(1)})`;
  const child = spawnSync(process.execPath, ['-e', body], { cwd: root, encoding: 'utf8', env: {...process.env, PRESALES_QUERY_SHADOW: '0', OFFLINE_MODE: 'true'} });
  assert.equal(child.status, 0, child.stderr);
  const line = child.stdout.split('\n').find(l=>l.startsWith('RESULT:'));
  assert.ok(line, child.stdout);
  return JSON.parse(line.slice(7));
}
test('exact single choice only; unknown, arrays, and multiple choices fail closed', () => {
  assert.equal(helper.parseDisambiguationChoice('(Recommended) HPE ProLiant DL380 Gen12', candidates), 'DL380_Gen12');
  for (const choice of ['unknown', '', 'DL380 Gen12 and DL380 Gen11', ['DL380_Gen12'], null]) assert.equal(helper.parseDisambiguationChoice(choice, candidates), null);
  assert.equal(helper.parseDisambiguationChoice('DL380 Gen12', []), null);
});
test('no candidate invention or recommendation from absent evidence', () => {
  const prompt = helper.formatDisambiguationPrompt({hitlRequired:true,ambiguityDetails:{}});
  assert.deepEqual(prompt.rawCandidates, []);
  assert.deepEqual(prompt.options, []);
  assert.ok(!helper.formatDisambiguationPrompt({hitlRequired:false}));
  assert.ok(helper.formatDisambiguationPrompt({hitlRequired:true,ambiguityDetails:{candidates}}).options.every(o=>!o.includes('Recommended')));
});
test('base SKU from explicit catalog metadata only', () => {
  assert.equal(helper.getBaseChassisSku('DL380_Gen12'), 'P73282-B21');
  assert.equal(helper.getBaseChassisSku('DL380_Gen11'), null);
  assert.equal(helper.getBaseChassisSku('unknown_gen12'), null);
});
test('real platform ambiguity returns ACTION_REQUIRED before sizing handler', async () => {
  const r = await router.executeRoutedQuery('Size a DL380 with 128GB RAM', context);
  assert.equal(r.result.status, 'ACTION_REQUIRED');
  assert.equal(r.result.code, 'PLATFORM_CLARIFICATION_REQUIRED');
  assert.deepEqual(r.result.question.rawCandidates.sort(), candidates);
  assert.equal(r.result.initialBom, undefined);
});
test('multiple-platform ambiguity offers only actual matched platforms', async () => {
  const r = await router.executeRoutedQuery('Compare DL360 with DL380', context);
  assert.equal(r.result.status, 'ACTION_REQUIRED');
  assert.deepEqual(r.ambiguityDetails.candidates.sort(), ['DL360_Gen11', ...candidates]);
});
test('missing stored choice cannot verify loop', async () => {
  const r = await helper.runDisambiguationLoopTest('What memory works in DL380 without stored choice?', 'DL380_Gen12', context);
  assert.equal(r.verified, false); assert.deepEqual(r.usedPreferenceIds, []);
});
test('explicit chosen context can verify route but cannot verify memory', async () => {
  const r = await helper.runDisambiguationLoopTest('What memory works in DL380?', 'DL380_Gen12', {...context,chassisName:'DL380_Gen12'});
  assert.equal(r.clarifiedRouteVerified, true); assert.equal(r.verified, false);
});
test('invalid choice and mismatched target history never write', () => {
  assert.throws(()=>helper.recordDisambiguationDecision('What memory works in DL380?', 'unknown'));
  assert.throws(()=>helper.recordDisambiguationDecision('What memory works in DL380?', 'DL380_Gen12', {targetDir:root}));
});
test('human choice produces local typed preference with no fabricated hardware evidence', () => {
  const r = helper.recordDisambiguationDecision('What memory works in DL380?', 'DL380_Gen12', {reasoning:'User chose this generation'});
  assert.equal(r.delta.type, 'USER_PLATFORM_SELECTION'); assert.equal(r.delta.evidenceSource, 'USER_CHOICE');
  assert.equal(r.delta.governanceStatus, 'LOCAL_USER_PREFERENCE');
  assert.deepEqual(r.delta.candidatePlatforms, candidates);
  for(const field of ['affectedSku','ruleUpdate','humanReview','evidence','sourceId']) assert.equal(r.delta[field], undefined);
  assert.equal(r.delta.queryHash, store.queryHash('What memory works in DL380?'));
});
test('fresh process consumes exact normalized query memory before handler', () => {
  const r = fresh('  WHAT memory works in DL380?  ');
  assert.equal(r.resolvedPlatform,'DL380_Gen12'); assert.equal(r.result.chassis,'DL380_Gen12');
  assert.equal(r.hitlRequired,false); assert.equal(r.platformSelectionMemory.usedIds.length,1);
  assert.deepEqual(r.platformSelectionMemory.usedIds,r.platformSelectionMemory.retrievedIds);
});
test('stored decision is verified by original query loop', async () => {
  const r = await helper.runDisambiguationLoopTest('What memory works in DL380?', 'DL380_Gen12', context);
  assert.equal(r.verified,true); assert.equal(r.usedPreferenceIds.length,1);
  assert.equal((await helper.runDisambiguationLoopTest('What memory works in DL380?', 'DL380_Gen11', context)).verified,false);
});
test('unrelated query does not retrieve or consume selection', () => {
  const r = fresh('What power works in DL380?');
  assert.equal(r.result.status,'ACTION_REQUIRED'); assert.deepEqual(r.platformSelectionMemory.usedIds,[]);
  assert.deepEqual(r.platformSelectionMemory.retrievedIds,[]);
});
test('conflicting explicit context never consumes remembered decision', () => {
  const r = fresh('What memory works in DL380?', {chassisName:'DL380_Gen11'});
  assert.equal(r.resolvedPlatform,'DL380_Gen11'); assert.deepEqual(r.platformSelectionMemory.usedIds,[]);
});
test('wrong candidate set is retrieved but not used', () => {
  const {listAllCatalogs} = require('../../scripts/lib/catalog/catalog_discovery.js');
  const r = store.retrievePlatformSelection('What memory works in DL380?', ['DL380_Gen12','DL360_Gen11'],listAllCatalogs());
  assert.equal(r.selected,null); assert.equal(r.retrievedIds.length,1);
});
test('ordinary FREEFORM 0.8 remains usable', () => {
  const r = fresh('What memory works in DL360 Gen11?');
  assert.equal(r.classificationConfidence,0.8); assert.equal(r.hitlRequired,false);
  assert.equal(r.result.chassis,'DL360_Gen11'); assert.deepEqual(r.platformSelectionMemory.usedIds,[]);
});
test('owner-aware lease prevents concurrent preference writes', () => {
  const {acquireWorkflowLease} = require('../../scripts/lib/system/workflow_lease.js');
  const release = acquireWorkflowLease('user-platform-selections',path.join(selectedDir,'history/locks'));
  try { assert.throws(()=>helper.recordDisambiguationDecision('What memory works in DL380?', 'DL380_Gen12'), /WORKFLOW_BUSY/); } finally { release(); }
});
test('explicit context and all 17 public routes retain dispatch under non-ambiguous input', async () => {
  const filename = path.join(root,'scripts/evaluators/route_query.js');
  const source = fs.readFileSync(filename,'utf8');
  const handlers = [...source.matchAll(/(?:async )?function (_handle\w+)\(/g)].map(m=>m[1]);
  const sandbox = {require: p=>require(require.resolve(p,{paths:[path.dirname(filename)]})), module:{exports:{}}, exports:{}, __filename:filename, __dirname:path.dirname(filename), process, console, Buffer, setTimeout, clearTimeout};
  const replacement = handlers.map(h=>`${h} = async (q,c) => ({handler:'${h}',chassis:c.chassisName});`).join('\n');
  vm.runInNewContext(source+'\n'+replacement,sandbox,{filename});
  const routes = ['CROSS_VENDOR_TRANSFORMATION','HETEROGENEOUS_TENDER_MODERNIZATION','FREEFORM_QA','BOQ_EVALUATION','OCR_QUOTE_INGESTION','CATALOG_INTELLIGENCE','RFP_SIZING_TO_BOM','BOM_RECONCILIATION','WORKLOAD_DNA','VALUE_ENGINEERING','LEAST_DELTA_SYNTHESIS','WORKBOOK_GENERATION','REMARKS_RECONCILIATION','MULTI_CLUSTER_TENDER','ADVERSARIAL_VALIDATION','CONTINUOUS_LEARNING','KNOWLEDGE_SYNC'];
  for(const intent of routes) {
    const r = await sandbox.module.exports.executeRoutedQuery('DL380 Gen12',{intent,chassisName:'DL380_Gen12',offlineMode:true,...(intent==='OCR_QUOTE_INGESTION'?{filePath:'fixture.png'}:{})});
    assert.equal(r.classification.intent,intent); assert.ok(r.result.handler || ['OCR_QUOTE_INGESTION','CATALOG_INTELLIGENCE','BOM_RECONCILIATION'].includes(intent));
    assert.equal(r.hitlRequired,false); assert.deepEqual(Array.from(r.platformSelectionMemory.usedIds),[]);
  }
});
