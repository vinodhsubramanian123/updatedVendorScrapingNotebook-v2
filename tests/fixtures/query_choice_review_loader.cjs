
const fs=require('fs'),path=require('path'),vm=require('vm'),Module=require('module');
module.exports=function(root,dirs){
 const catalogs=['DL380_Gen11','DL380_Gen12'].map((id,i)=>({id,chassis:id,catalogDir:dirs[i],catalogJsonPath:path.join(dirs[i],'catalog.json')}));
 const calls=[];let router;
 function load(rel,extra=''){const file=path.join(root,rel),mod={exports:{}};const native=Module.createRequire(file);function req(name){if(name.endsWith('catalog_discovery.js'))return{listAllCatalogs:()=>catalogs,getChassisMap:()=>({})};if(name.endsWith('route_query.js'))return router;if(name.endsWith('execution_trace_runtime.js'))return{observeRouterEntry:(f,q,fn)=>fn(),observeActualInvocation:(n,f,fn)=>fn(),resolveEntryTraceId:fn=>fn()};if(name.endsWith('presales_disambiguation.js'))return load('scripts/lib/boq/presales_disambiguation.js');if(name.endsWith('bom_verifier.js'))return{verifyPrePresentationAcceptance:()=>({status:'FIXTURE',isValid:false,blockersCount:0,warningsCount:0})};if(name==='../lib/rag/local_rag_search.js'||name==='../lib/boq/boq_evaluator.js'||name==='../lib/boq/vendor_bom_verifier.js')return{};return native(name);}
 vm.runInNewContext(fs.readFileSync(file,'utf8')+'\n'+extra,{module:mod,exports:mod.exports,require:req,__dirname:path.dirname(file),__filename:file,process,console,Buffer,globalCalls:calls});return mod.exports;}
 const names=[...fs.readFileSync(path.join(root,'scripts/evaluators/route_query.js'),'utf8').matchAll(/(?:async )?function (_handle\w+)\(/g)].map(m=>m[1]); const replacements=names.map(n=>n+"=(q,c)=>{globalCalls.push({query:q,chassis:c.chassisName,handler:'"+n+"'});return{status:'DRAFT',chassis:c.chassisName,handler:'"+n+"'};};").join('\n');router=load('scripts/evaluators/route_query.js',replacements);
 // Define shared handler recorder in the module sandbox via a second loader below.
 return{router,helper:load('scripts/lib/boq/presales_disambiguation.js'),catalogs,calls};
};
