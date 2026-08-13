import React, { useState, useEffect, useRef } from 'react';
import { 
  FileUp, Sparkles, ShieldCheck, Layers, Brain, LayoutDashboard,
  PauseCircle, Repeat, BarChart3, Database, CheckCircle2, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, Terminal, ArrowRight, PlayCircle, Clock,
  Copy, Download, Search, Check, Radio, Zap, Activity,
  Server, Square, Navigation, KeyRound, ShieldAlert
} from 'lucide-react';
import Tooltip from './Tooltip';
import VendorScraperProgress from './VendorScraperProgress';

export default function MacroOrchestratorFlow({
  // Data
  evalResults,
  auditReport,
  isTaskRunning,
  activeProgress,
  selectedChassis,
  logStream = [],
  
  // Handlers from App
  onTriggerScrape,
  onTriggerRebuild,
  onTriggerDownloadPdf,
  onTriggerSyncKnowledge,
  onTriggerKillTask,
  onTriggerNavigate,
  onOpenTool, // function(toolName) to open BoqUploader, Matrix, etc.
}) {
  const [cdpState, setCdpState] = useState({ status: 'CHECKING', message: 'Probing browser...' });
  const [scrapeMode, setScrapeMode] = useState('solution');
  
  // Terminal State
  const [showLogConsole, setShowLogConsole] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    // Keep log console hidden by default as requested. Detailed logs remain in the background/backend.
    if (isTaskRunning && !showLogConsole) {
      // Intentionally not auto-expanding the terminal.
    }
  }, [isTaskRunning, showLogConsole]);

  useEffect(() => {
    let interval;
    const checkCDP = async () => {
      try {
        const res = await fetch('/api/cdp-status');
        const data = await res.json();
        setCdpState(data);
      } catch {
        setCdpState({ status: 'DISCONNECTED', error: 'Backend unreachable' });
      }
    };
    
    checkCDP();
    if (!isTaskRunning) {
      interval = setInterval(checkCDP, 3000);
    }
    return () => clearInterval(interval);
  }, [isTaskRunning]);

  const canScrape = cdpState.status === 'READY';
  
  const isEvaluating = isTaskRunning && activeProgress?.task?.includes('EVAL');
  const isSyncing = isTaskRunning && activeProgress?.task?.includes('KNOWLEDGE_SYNC');
  const isScraping = isTaskRunning && activeProgress?.task?.includes('SCRAPE');
  const hasEval = !!evalResults && evalResults.status !== 'ERROR';
  const hasAudit = !!auditReport;

  // Process Logs
  const logs = logStream.map((logObj, idx) => {
    const logStr = typeof logObj === 'object' && logObj !== null ? (logObj.text || '') : String(logObj);
    const match = logStr.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      const isSystem = match[2].includes('SYSTEM') || match[2].includes('START');
      const isError = match[2].includes('ERROR') || match[2].includes('FAIL') || match[2].includes('❌');
      const isSuccess = match[2].includes('SUCCESS') || match[2].includes('DONE') || match[2].includes('✅') || match[2].includes('PASS');
      const level = isError ? 'WARN' : isSuccess ? 'SUCCESS' : isSystem ? 'SYSTEM' : 'INFO';
      return { id: `log-${idx}`, timestamp: match[1], stage: 'PIPELINE', level, message: match[2] };
    }
    return { id: `log-${idx}`, timestamp: new Date().toISOString().substring(11, 23), stage: 'PIPELINE', level: 'INFO', message: logStr };
  });

  const filteredLogs = logs.filter(l => {
    if (logFilter !== 'ALL' && l.level !== logFilter) return false;
    if (logSearch.trim() && !l.message.toLowerCase().includes(logSearch.toLowerCase()) && !l.stage.toLowerCase().includes(logSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, autoScroll, showLogConsole]);

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.stage}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleDownloadLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.stage}] [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_execution_${selectedChassis || 'dl380'}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/90 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Complete
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50/90 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" /> Warnings
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse shadow-2xs">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin shrink-0" /> Running
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200">
            Ready
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-blue-500" />
          BOQ Evaluation &amp; Reconciliation Engine
        </h1>
        <p className="text-slate-500 text-sm max-w-2xl">
          Validate physical constraints, build Strategy Matrix, and reconcile final vendor quotes.
        </p>
      </div>



      {/* STAGE 1: BOQ VERIFICATION (Math Engine) */}
      <div className={`bg-white rounded-xl p-5 border border-slate-200 border-l-4 shadow-sm relative overflow-hidden transition-colors ${isEvaluating ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-slate-300'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Brain className="w-32 h-32 text-slate-400" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${isEvaluating ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              01
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Stage 1: BOQ Aspect Math &amp; Verification</h3>
              <p className="text-xs text-slate-500">Validate physical constraints (TDP, PCIe, Cables) and build a 5-Tier Strategy Matrix.</p>
            </div>
            <div className="ml-auto">
               {renderStatusBadge(isEvaluating ? 'RUNNING' : (hasEval ? 'COMPLETED' : 'READY'))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
             {/* Sub-steps */}
             <div className={`p-3 rounded-xl border ${hasEval || isEvaluating ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
                <FileUp className={`w-4 h-4 mb-2 ${hasEval || isEvaluating ? 'text-blue-500' : 'text-slate-400'}`} />
                <h4 className="text-[11px] font-bold text-slate-700">Parse Document</h4>
             </div>
             <div className={`p-3 rounded-xl border ${hasEval || (isEvaluating && activeProgress?.currentStep >= 2) ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
                <ShieldCheck className={`w-4 h-4 mb-2 ${hasEval || (isEvaluating && activeProgress?.currentStep >= 2) ? 'text-blue-500' : 'text-slate-400'}`} />
                <h4 className="text-[11px] font-bold text-slate-700">Physical Math</h4>
             </div>
             <div className={`p-3 rounded-xl border ${hasEval || (isEvaluating && activeProgress?.currentStep >= 4) ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
                <Layers className={`w-4 h-4 mb-2 ${hasEval || (isEvaluating && activeProgress?.currentStep >= 4) ? 'text-blue-500' : 'text-slate-400'}`} />
                <h4 className="text-[11px] font-bold text-slate-700">5-Tier Ranking</h4>
             </div>
             <div className={`p-3 rounded-xl border ${hasEval || (isEvaluating && activeProgress?.currentStep >= 5) ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
                <Brain className={`w-4 h-4 mb-2 ${hasEval || (isEvaluating && activeProgress?.currentStep >= 5) ? 'text-blue-500' : 'text-slate-400'}`} />
                <h4 className="text-[11px] font-bold text-slate-700">RAG AI Cross-Check</h4>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <button
               onClick={() => onOpenTool('boqUploader')}
               disabled={isTaskRunning}
               className="py-2 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95 bg-blue-600 hover:bg-blue-500 text-white"
             >
               <FileUp className="w-4 h-4" /> Load BOQ &amp; Evaluate
             </button>
             
             {hasEval && (
               <button onClick={() => onOpenTool('resolutionMatrix')} className="py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                 <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" /> View 5-Tier Resolution Matrix
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Visual Connector */}
      <div className="flex justify-center -my-3 relative z-0">
        <div className="w-1 h-8 bg-slate-200 rounded-full" />
      </div>

      {/* STAGE 2: RECONCILIATION & SYNC */}
      <div className={`bg-white rounded-xl p-5 border border-slate-200 border-l-4 shadow-sm relative overflow-hidden transition-colors ${isSyncing ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-slate-300'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Repeat className="w-32 h-32 text-slate-400" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${isSyncing ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              02
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Stage 2: Reconciliation &amp; Knowledge Sync</h3>
              <p className="text-xs text-slate-500">Reconcile final Vendor Portal Quote against Rank 1 Strategy, log deltas, and sync RAG.</p>
            </div>
            <div className="ml-auto">
               {renderStatusBadge(isSyncing ? 'RUNNING' : (hasAudit ? 'COMPLETED' : 'READY'))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <button
               onClick={() => onOpenTool('reconciliation')}
               disabled={!hasEval || isTaskRunning}
               className={`py-2 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95 ${hasEval ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
             >
               <Repeat className="w-4 h-4" /> Reconcile Partner Quote
             </button>
             
             <button
               onClick={onTriggerSyncKnowledge}
               disabled={isTaskRunning}
               className="py-2 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
             >
               {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> : <Database className="w-4 h-4 text-blue-500" />} 
               Sync NotebookLM Knowledge
             </button>
          </div>
        </div>
      </div>

      {/* REAL-TIME TERMINAL CONSOLE */}
      <div className="glass-card border border-slate-800/80 bg-slate-950 text-slate-100 rounded-2xl overflow-hidden shadow-xl mt-8">
        <div className="bg-slate-900 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${isTaskRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'} shrink-0`} />
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4 className="font-mono font-bold text-slate-200 text-xs tracking-tight">
              Detailed Logs &amp; Activity
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowLogConsole(!showLogConsole)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-[10px] flex items-center gap-1 font-mono transition-colors">
              {showLogConsole ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {showLogConsole ? 'Hide Logs' : 'View Detailed Logs'}
            </button>
          </div>
        </div>

        {showLogConsole && (
          <div className="p-4 font-mono text-[11.5px] leading-relaxed h-64 overflow-y-auto space-y-1.5 bg-slate-950 text-slate-200 select-text">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-600 text-xs">Waiting for pipeline execution events...</div>
            ) : (
              filteredLogs.map((log) => {
                let levelBg = 'text-blue-400 bg-blue-950/60 border-blue-800';
                if (log.level === 'SUCCESS') levelBg = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
                if (log.level === 'WARN') levelBg = 'text-amber-400 bg-amber-950/60 border-amber-800';
                if (log.level === 'SYSTEM') levelBg = 'text-purple-400 bg-purple-950/60 border-purple-800';

                return (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/60 p-1 rounded transition-colors group">
                    <span className="text-slate-500 shrink-0 text-[10px]">[{log.timestamp}]</span>
                    <span className="text-slate-400 font-bold shrink-0 text-[10px]">[{log.stage}]</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 uppercase ${levelBg}`}>{log.level}</span>
                    <span className="text-slate-200 break-words flex-1 group-hover:text-white">{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={consoleEndRef} />
          </div>
        )}
      </div>

    </div>
  );
}
