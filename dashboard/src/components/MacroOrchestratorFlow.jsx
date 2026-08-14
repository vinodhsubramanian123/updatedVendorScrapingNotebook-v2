import React, { useState, useEffect, useRef } from 'react';
import { 
  FileUp, ShieldCheck, Layers, Brain, LayoutDashboard,
  Repeat, Database, CheckCircle2, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, Terminal, ArrowRight,
  Zap, Sparkles, Activity, Award
} from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';
import AutonomousWorkflowSimulator from './AutonomousWorkflowSimulator';

export default function MacroOrchestratorFlow({
  // Data
  evalResults,
  auditReport,
  isTaskRunning,
  activeProgress,
  selectedChassis,
  logStream = [],
  
  // Handlers from App
  onTriggerSyncKnowledge,
  onOpenTool, // function(toolName) to open BoqUploader, Matrix, etc.
  onNavigateTab
}) {
  const [viewMode, setViewMode] = useState('simulator'); // 'simulator', 'stepper', 'macro', 'both'
  const [showLogConsole, setShowLogConsole] = useState(false);
  const consoleEndRef = useRef(null);

  const isEvaluating = isTaskRunning && activeProgress?.task?.includes('EVAL');
  const isSyncing = isTaskRunning && activeProgress?.task?.includes('KNOWLEDGE_SYNC');
  const hasEval = !!evalResults && evalResults.status !== 'ERROR';
  const hasAudit = !!auditReport;

  // Extract confidence score
  const confidenceVal = evalResults?.confidence?.score ?? evalResults?.conflictGraph?.quantitativeConfidenceScore;
  const confidencePercent = confidenceVal !== undefined ? Math.round(confidenceVal * 100) : null;
  const violationsCount = evalResults?.aspectChecks?.filter(a => a.status === 'FAIL')?.length || evalResults?.errors?.length || 0;

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

  const filteredLogs = logs;

  useEffect(() => {
    if (showLogConsole && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, showLogConsole]);

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/90 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Complete
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50/90 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Warnings
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50/90 px-2.5 py-0.5 rounded-full border border-blue-200 animate-pulse shadow-2xs">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" /> Running
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100/90 px-2.5 py-0.5 rounded-full border border-slate-200">
            Ready
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      
      {/* Top Banner with View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-7 h-7 text-blue-600" />
            Autonomous BOQ Evaluation &amp; Closed-Loop Orchestrator
          </h1>
          <p className="text-slate-500 text-xs max-w-2xl">
            6-aspect physical constraint math, 5-tier Strategic Resolution Matrix, dual-brain RAG verification, and Partner Portal quote reconciliation.
          </p>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setViewMode('simulator')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'simulator' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Auto-Pilot Runner
          </button>
          <button
            onClick={() => setViewMode('stepper')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'stepper' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> 9-Stage Stepper
          </button>
          <button
            onClick={() => setViewMode('macro')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'macro' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Macro Lifecycle
          </button>
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'both' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Views
          </button>
        </div>
      </div>

      {/* 0. AUTONOMOUS SIMULATOR & STEP RUNNER */}
      {(viewMode === 'simulator' || viewMode === 'both') && (
        <div className="animate-fade-in">
          <AutonomousWorkflowSimulator />
        </div>
      )}

      {/* 1. EMBEDDED 9-STAGE WORKFLOW STEPPER */}
      {(viewMode === 'stepper' || viewMode === 'both') && (
        <div className="animate-fade-in">
          <WorkflowStepper
            evalResults={evalResults}
            auditReport={auditReport}
            isTaskRunning={isTaskRunning}
            activeProgress={activeProgress}
            selectedChassis={selectedChassis}
            logStream={logStream}
            onNavigateTab={onNavigateTab}
            onTriggerSyncKnowledge={onTriggerSyncKnowledge}
            onOpenTraceability={() => onOpenTool && onOpenTool('traceability')}
          />
        </div>
      )}

      {/* 2. MACRO 2-STAGE LIFECYCLE CARDS */}
      {(viewMode === 'macro' || viewMode === 'both') && (
        <div className="space-y-4 animate-fade-in">
          
          {/* STAGE 1: BOQ VERIFICATION (Math Engine) */}
          <div className={`glass-card p-5 border-l-4 shadow-sm relative overflow-hidden transition-all ${
            isEvaluating ? 'border-l-blue-500 bg-blue-50/40 ring-2 ring-blue-200' : 'border-l-blue-600'
          }`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Brain className="w-32 h-32 text-blue-900" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm border shadow-2xs ${
                  isEvaluating ? 'bg-blue-600 text-white border-blue-600 animate-pulse' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  01
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">Stage 1: BOQ Aspect Math &amp; Verification</h3>
                    {confidencePercent !== null && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        confidencePercent >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        Confidence: {confidencePercent}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Validate physical constraints (TDP, PCIe, Cables) and build a 5-Tier Strategy Matrix.</p>
                </div>
                <div className="ml-auto">
                   {renderStatusBadge(isEvaluating ? 'RUNNING' : (hasEval ? (violationsCount > 0 ? 'WARNING' : 'COMPLETED') : 'READY'))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                 <div className={`p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${hasEval || isEvaluating ? 'border-blue-300 bg-blue-50/60 shadow-2xs' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}`}>
                    <FileUp className={`w-4 h-4 mb-1.5 ${hasEval || isEvaluating ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h4 className="text-[11px] font-bold text-slate-800">1. Parse Document</h4>
                    <p className="text-[10px] text-slate-500 truncate">{evalResults?.items?.length ? `${evalResults.items.length} SKUs Parsed` : 'Excel / CSV intake'}</p>
                 </div>
                 <div className={`p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${hasEval || (isEvaluating && activeProgress?.currentStep >= 2) ? 'border-blue-300 bg-blue-50/60 shadow-2xs' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}`}>
                    <ShieldCheck className={`w-4 h-4 mb-1.5 ${hasEval || (isEvaluating && activeProgress?.currentStep >= 2) ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h4 className="text-[11px] font-bold text-slate-800">2. Physical Math</h4>
                    <p className="text-[10px] text-slate-500 truncate">{hasEval ? (violationsCount === 0 ? 'All 6 Aspects Passed' : `${violationsCount} Violations Flagged`) : 'Thermal / Power / RAM'}</p>
                 </div>
                 <div className={`p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${hasEval || (isEvaluating && activeProgress?.currentStep >= 4) ? 'border-blue-300 bg-blue-50/60 shadow-2xs' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}`}>
                    <Layers className={`w-4 h-4 mb-1.5 ${hasEval || (isEvaluating && activeProgress?.currentStep >= 4) ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h4 className="text-[11px] font-bold text-slate-800">3. 5-Tier Ranking</h4>
                    <p className="text-[10px] text-slate-500 truncate">{hasEval ? `${evalResults?.conflictGraph?.rankedSolutions?.length || 5} Tiers Synthesized` : 'Rank 1 Intent Match'}</p>
                 </div>
                 <div className={`p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${hasEval || (isEvaluating && activeProgress?.currentStep >= 5) ? 'border-blue-300 bg-blue-50/60 shadow-2xs' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}`}>
                    <Brain className={`w-4 h-4 mb-1.5 ${hasEval || (isEvaluating && activeProgress?.currentStep >= 5) ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h4 className="text-[11px] font-bold text-slate-800">4. RAG AI Verification</h4>
                    <p className="text-[10px] text-slate-500 truncate">{evalResults?.ragAnswer ? 'QuickSpecs Verified' : 'Grounded Double-Check'}</p>
                 </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                 <button
                   onClick={() => onOpenTool('boqUploader')}
                   disabled={isTaskRunning}
                   className="btn-primary text-xs flex items-center gap-2 shadow-sm"
                 >
                   <FileUp className="w-4 h-4" /> Load BOQ &amp; Evaluate
                 </button>
                 
                 {hasEval && (
                   <button 
                     onClick={() => onOpenTool('resolutionMatrix')} 
                     className="btn-secondary text-xs flex items-center gap-2 text-blue-700 bg-blue-50/60 hover:bg-blue-100/60 border-blue-200 shadow-xs hover:-translate-y-0.5 transition-all"
                   >
                     <Award className="w-4 h-4 text-blue-600" /> View 5-Tier Resolution Matrix <ArrowRight className="w-3.5 h-3.5" />
                   </button>
                 )}
              </div>
            </div>
          </div>

          {/* Visual Animated Connector */}
          <div className="flex justify-center -my-2 relative z-0">
            <div className={`w-1.5 h-8 rounded-full transition-all duration-500 ${
              hasEval ? 'bg-emerald-500 shadow-xs shadow-emerald-500/40 animate-connector-fill' : 'bg-slate-300'
            }`} />
          </div>

          {/* STAGE 2: RECONCILIATION & SYNC */}
          <div className={`glass-card p-5 border-l-4 shadow-sm relative overflow-hidden transition-all ${
            isSyncing ? 'border-l-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200' : 'border-l-emerald-600'
          }`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Repeat className="w-32 h-32 text-emerald-900" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm border shadow-2xs ${
                  isSyncing ? 'bg-emerald-600 text-white border-emerald-600 animate-breathe' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  02
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">Stage 2: Partner Quote Reconciliation &amp; Closed-Loop Learning</h3>
                    {hasAudit && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        auditReport.is100PercentMatch ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {auditReport.is100PercentMatch ? '100% Certified Match' : 'Deltas Logged'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Reconcile final Vendor Portal Quote against Rank 1 Strategy, log atomic KnowledgeDeltas, and sync RAG.</p>
                </div>
                <div className="ml-auto">
                   {renderStatusBadge(isSyncing ? 'RUNNING' : (hasAudit ? 'COMPLETED' : 'READY'))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                 <button
                   onClick={() => onOpenTool('reconciliation')}
                   disabled={!hasEval || isTaskRunning}
                   className={`py-2 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95 ${
                     hasEval 
                       ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' 
                       : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                   }`}
                 >
                   <Repeat className="w-4 h-4" /> Reconcile Partner Quote
                 </button>
                 
                 <button
                   onClick={onTriggerSyncKnowledge}
                   disabled={isTaskRunning}
                   className="btn-secondary text-xs flex items-center gap-2"
                 >
                   {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <Database className="w-4 h-4 text-emerald-600" />} 
                   Sync NotebookLM Knowledge
                 </button>
              </div>
            </div>
          </div>

          {/* REAL-TIME TERMINAL CONSOLE */}
          <div className="glass-card border border-slate-800/80 bg-slate-950 text-slate-100 rounded-2xl overflow-hidden shadow-xl mt-6">
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
      )}

    </div>
  );
}

