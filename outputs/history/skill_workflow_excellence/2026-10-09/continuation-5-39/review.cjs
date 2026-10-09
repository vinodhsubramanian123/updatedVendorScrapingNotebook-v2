'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const p=require('./scripts/lib/aspects/pcie_riser');
const source=fs.readFileSync(path.join(__dirname,'scripts/lib/boq/boq_evaluator.js'),'utf8');
const start=source.indexOf('function validatePowerRules(ctx)'),end=source.indexOf('\nfunction ',start+1),sandbox={resolveGpuCableCapacity:p.resolveGpuCableCapacity};
vm.runInNewContext(source.slice(start,end),sandbox);
for(const capacity of [1,3])test('custom capacity '+capacity+' conserved in tally and9node remedy',()=>{
 const mandatory={GPU_POWER_CABLE_KIT:{sku:'CUSTOM',capacity,name:'GPU power cable'}};
 const tally=p.evalPcieRiserSlots([{sku:'BASE',description:'HPE DL380a Gen12 CTO',quantity:1},{sku:'GPU',description:'NVIDIA GPU accelerator',quantity:8},{sku:'CUSTOM',description:'GPU power cable',quantity:1}],null,mandatory);
 assert.equal(tally.gpuPowerCableKitCount,capacity);
 const ctx={pcie:{...tally,needsGpuPowerCableKit:true},power:{isDl380aGpuChassis:true,psuCount:18},serverCount:9,mandatorySkus:mandatory,errors:[],warnings:[],mathDeductions:[],missingDependencies:[],items:[],chassisInfo:{gen:'Gen12'}};
 sandbox.validatePowerRules(ctx);assert.equal(ctx.missingDependencies[0].quantity,Math.ceil((8-capacity)/capacity)*9);
});
for(const capacity of [0,-1,1.5,NaN,Number.MAX_SAFE_INTEGER+1])test('invalidcapacity '+capacity+' rejects',()=>assert.equal(p.resolveGpuCableCapacity('CUSTOM','GPU power cable',{GPU_POWER_CABLE_KIT:{sku:'CUSTOM',capacity}}),1));
for(const configured of [{capacity:3},{sku:'OTHER',capacity:3},{sku:'',capacity:3},null])test('metadata ownership '+JSON.stringify(configured),()=>assert.equal(p.resolveGpuCableCapacity('CUSTOM','GPU power cable',{GPU_POWER_CABLE_KIT:configured}),1));
for(const sku of ['P74700-B21','P83526-B21'])test('knownkit '+sku,()=>assert.equal(p.resolveGpuCableCapacity(sku,'GPU16pin',{}),2));
test('generic16pin and12VHPWR are not dualproof',()=>{for(const d of ['GPU16-pin power cable','12VHPWR PCIe cable'])assert.equal(p.resolveGpuCableCapacity('UNKNOWN',d,{}),1);});
test('mixedcapacity narrative never fabricates physical kitcount',()=>{
 const ctx={pcie:{gpuCount:8,gpuPowerCableKitCount:5,needsGpuPowerCableKit:true},power:{isDl380aGpuChassis:true,psuCount:18},serverCount:9,mandatorySkus:{GPU_POWER_CABLE_KIT:{sku:'CUSTOM',capacity:3,name:'GPU power cable'}},errors:[],warnings:[],mathDeductions:[],missingDependencies:[],items:[],chassisInfo:{gen:'Gen12'}};
 sandbox.validatePowerRules(ctx);assert.equal(ctx.missingDependencies[0].quantity,9);assert.doesNotMatch(ctx.warnings[0],/Found 1\./,'5connection capacity from two differingkits cannot be declaredone physicalkit');
});
