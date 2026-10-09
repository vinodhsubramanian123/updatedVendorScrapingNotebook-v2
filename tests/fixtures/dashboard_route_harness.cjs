const fs=require('fs'),path=require('path'),vm=require('vm'),{EventEmitter}=require('events'),cp=require('child_process');
const root=path.resolve(__dirname,'../..');
const requireMain=require;
function response(){return{statusCode:200,status(n){this.statusCode=n;return this;},json(x){this.data=x;return this;},on(){},write(){},setHeader(){},end(){}};}

function harness({owned=false,terminate,real=false}={}){
 const handlers={},events=[],spawns=[];let active;
 const task={isTaskRunning:()=>Boolean(active),getActiveTask:()=>active,_setActiveTask:t=>active=t,broadcastSSE:e=>events.push(e),startTask(){}};
 const load=file=>{const router={post:(n,...h)=>handlers[n]=h.at(-1),get(){}};const sandbox={module:{exports:{}},exports:{},console,Date,Buffer,__filename:path.join(root,file),__dirname:path.dirname(path.join(root,file)),process:{env:{...process.env,OFFLINE_MODE:'1',NODE_ENV:'test',PRESALES_TERMINAL_OWNER:owned?'1':'0',PRESALES_EXECUTION_TRACE:'1'}},require:id=>{
 if(id==='express')return{Router:()=>router};if(id==='path')return path;if(id==='fs')return real?fs:{existsSync:()=>true,writeFileSync(){},mkdirSync(){},unlinkSync(){}};
 if(id==='multer'){const m=()=>({single:()=>()=>{}});m.diskStorage=()=>({});return m;}
 if(id==='child_process')return{spawn:(cmd,args,opts)=>{let p;if(real)p=cp.spawn(process.execPath,args,opts);else{p=new EventEmitter();p.pid=777;p.exitCode=null;p.signalCode=null;p.connected=owned;p.stdout=new EventEmitter();p.stderr=new EventEmitter();}spawns.push({args,opts,p});return p;}};
 if(id.includes('taskManager'))return task;if(id.includes('observed_child_process'))return real?require('../../scripts/lib/system/observed_child_process.js'):{spawnObservedChild:(n,f,start)=>start({})};
 if(id.includes('child_termination'))return{requestChildTermination:terminate||requireMain('../../scripts/lib/system/child_termination.js').requestChildTermination};
 if(id.includes('pathGuard'))return{assertSafePath:p=>p};if(id.includes('errorHandler'))return{asyncHandler:f=>f,sendErrorResponse:(res,n,error)=>res.status(n).json({error})};
 if(id.includes('schemas'))return requireMain('../../scripts/lib/system/schemas.js');if(id.includes('fs_compat'))return real?require('../../scripts/lib/system/fs_compat.js'):{safeWriteJsonAtomic(){}};
 if(id.includes('conflict_graph'))return{invalidateChassisMapCache(){}};return{};
 }};vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox);};
 load('dashboard/routes/evaluation.cjs');load('dashboard/routes/tasks.cjs');
 return{handlers,events,spawns,get active(){return active;},start(body={filepath:'valid_boq.csv'}){handlers['/eval-boq']({body},response());return spawns.at(-1).p;},kill(body={}){const res=response();return Promise.resolve(handlers['/kill-task']({body},res)).then(()=>res);}};
}

module.exports={harness};
