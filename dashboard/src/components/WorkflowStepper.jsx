import Tooltip from './Tooltip';
import React, { useState, useEffect, useRef } from 'react';
import { 

  FileUp, Sparkles, ShieldCheck, Layers, Brain, LayoutDashboard,
  PauseCircle, Repeat, BarChart3, Database, CheckCircle2, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, Terminal, ArrowRight, PlayCircle, Clock,
  Copy, Download, Search, Check, Radio, Zap, Activity
} from 'lucide-react';

export default function WorkflowStepper({
  evalResults,
  auditReport,
  isTaskRunning,
  activeProgress,
  selectedChassis,
  logStream = [],
  onNavigateTab,
  onTriggerSyncKnowledge,
  onOpenTraceability
}) {
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(!!evalResults || isTaskRunning);

  useEffect(() => {
    if (isTaskRunning || evalResults) {
      setIsExpanded(true);
    }
  }, [isTaskRunning, evalResults]);

  const [showLogConsole, setShowLogConsole] = useState(isTaskRunning);

  useEffect(() => {
    if (isTaskRunning) setShowLogConsole(true);
  }, [isTaskRunning]);
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const consoleEndRef = useRef(null);

  // Derive stage completion status dynamically based on application state:
  const isEvaluating = isTaskRunning && activeProgress?.task?.includes('EVAL');
  const isSyncing = isTaskRunning && activeProgress?.task?.includes('KNOWLEDGE_SYNC');
  const hasEval = !!evalResults && evalResults.status !== 'ERROR';
  const hasAudit = !!auditReport;

  // Multi-step definitions mapping to full BOQ lifecycle across 2 distinct rows
  const stepsPhase1 = [
    {
      id: 'LOAD',
      number: 1,
      phase: 1,
      title: '1. Load BOQ',
      subtitle: 'Document Intake & Token Parsing',
      icon: FileUp,
      status: isEvaluating
        ? (activeProgress?.currentStep === 1 ? 'RUNNING' : activeProgress?.currentStep > 1 ? 'COMPLETED' : 'READY')
        : (hasEval ? 'COMPLETED' : 'READY'),
      durationMs: evalResults?.telemetry?.parsingTimeMs || 120,
      details: 'Customer Bill of Materials (.xlsx, .csv, or raw text) loaded and validated for parsing.',
      metrics: {
        rawSkus: evalResults?.chassisDetection?.totalRawSkus || 'Ready',
        chassisDetected: selectedChassis || 'Unknown Chassis'
      },
      actionText: 'Upload BOQ',
      tabTarget: 'boq'
    },
    {
      id: 'CLEANING',
      number: 2,
      phase: 1,
      title: '2. BOQ Cleaning',
      subtitle: 'SKU Normalization & Quantity Fixes',
      icon: Sparkles,
      status: isEvaluating
        ? (activeProgress?.currentStep === 2 ? 'RUNNING' : activeProgress?.currentStep > 2 ? 'COMPLETED' : 'READY')
        : (hasEval ? 'COMPLETED' : 'READY'),
      durationMs: evalResults?.telemetry?.cleaningTimeMs || 180,
      details: 'Extracted hardware SKU lines across multi-sheet workbooks, normalized HPE part numbers, cleaned quantity formatting.',
      metrics: {
        normalizedSkus: evalResults?.items?.length || 0,
        sheetsParsed: 1
      },
      actionText: 'View Input Items',
      tabTarget: 'boq'
    },
    {
      id: 'VALIDATION',
      number: 3,
      phase: 1,
      title: '3. Aspect Math',
      subtitle: 'Physical Constraints Rules Engine',
      icon: ShieldCheck,
      status: isEvaluating
        ? (activeProgress?.currentStep === 3 ? 'RUNNING' : activeProgress?.currentStep > 3 ? 'COMPLETED' : 'READY')
        : (hasEval ? (evalResults?.aspectValidation?.hasViolations ? 'WARNING' : 'COMPLETED') : 'READY'),
      durationMs: evalResults?.telemetry?.rulesTimeMs || 210,
      details: 'Evaluated physical constraints across thermal TDP thresholds, power supply lug kits, memory bit-width homogeny, and PCIe riser limits.',
      metrics: {
        rulesEvaluated: evalResults?.aspectValidation?.totalRulesEvaluated || 18,
        conflictsFound: evalResults?.aspectValidation?.violationsCount || 0
      },
      actionText: 'Inspect Aspect Rules',
      tabTarget: 'conflict'
    },
    {
      id: 'RANKING',
      number: 4,
      phase: 1,
      title: '4. Solution Ranking',
      subtitle: '5-Tier Strategic Resolution Matrix',
      icon: Layers,
      status: isEvaluating
        ? (activeProgress?.currentStep === 4 ? 'RUNNING' : activeProgress?.currentStep > 4 ? 'COMPLETED' : 'READY')
        : (hasEval ? 'COMPLETED' : 'READY'),
      durationMs: evalResults?.telemetry?.rankingTimeMs || 160,
      details: 'Synthesized 5 ranked buildable solution candidates (Rank 1 Intent-Preserving to Rank 5 Budget Minimized) with vertical itemized parts breakdowns.',
      metrics: {
        rankedTiers: evalResults?.rankedSolutions?.length || 5,
        topCandidate: evalResults?.rankedSolutions?.[0]?.title || 'Intent-Preserving'
      },
      actionText: 'View Resolution Matrix',
      tabTarget: 'boq'
    },
    {
      id: 'POST_VERIFICATION',
      number: 5,
      phase: 1,
      title: '5. Post Verification',
      subtitle: 'NotebookLM RAG & Gemini AI',
      icon: Brain,
      status: isEvaluating
        ? (activeProgress?.currentStep === 5 ? 'RUNNING' : activeProgress?.currentStep > 5 ? 'COMPLETED' : 'READY')
        : (hasEval ? (evalResults?.ragAnswer ? 'COMPLETED' : 'SKIPPED') : 'READY'),
      durationMs: evalResults?.ragData?.durationMs || evalResults?.telemetry?.ragTimeMs || 340,
      details: 'Asynchronous NotebookLM QuickSpecs RAG grounding & Gemini LLM intent cross-verification for thermal and cabling regressions.',
      metrics: {
        grounding: evalResults?.ragAnswer ? 'Verified' : 'Local Fallback',
        confidence: evalResults?.workloadDna?.confidence || '94%'
      },
      actionText: 'Check RAG Insights',
      tabTarget: 'overview'
    },
    {
      id: 'SOLUTION_PRESENTATION',
      number: 6,
      phase: 1,
      title: '6. Solution Matrix',
      subtitle: 'Export Ready for HPE Partner Portal',
      icon: LayoutDashboard,
      status: hasEval ? 'COMPLETED' : 'READY',
      durationMs: 90,
      details: '5-tier solution matrix presented on dashboard, ready to take Rank 1 candidate to HPE Partner Portal / OCA for official quote creation.',
      metrics: {
        presentationStatus: hasEval ? 'Presented' : 'Awaiting Input',
        exportReady: hasEval ? 'Yes (Rank 1)' : 'No'
      },
      actionText: 'View Executive Matrix',
      tabTarget: 'overview'
    }
  ];

  const stepsPhase2 = [
    {
      id: 'RECONCILIATION',
      number: 7,
      phase: 2,
      title: '7. Partner BOM Upload',
      subtitle: 'Bi-Directional Quote Reconciliation',
      icon: Repeat,
      status: hasAudit ? (auditReport.is100PercentMatch ? 'COMPLETED' : 'WARNING') : (hasEval ? 'READY' : 'READY'),
      durationMs: auditReport?.auditDurationMs || 0,
      details: 'Reconciles official HPE Partner Portal quote BOM against Rank 1 proposed solution; classifies discrepancies into TEMPORARY_SUPPLY or PERMANENT_PHYSICAL_DEPENDENCY.',
      metrics: {
        partnerMatch: hasAudit ? (auditReport.is100PercentMatch ? '100% Certified' : 'Deltas Learned') : 'Pending Upload',
        discrepancies: hasAudit ? (auditReport.discrepancies?.addedByVendor?.length || 0) : 0
      },
      actionText: 'Reconcile Quote',
      tabTarget: 'reconciliation'
    },
    {
      id: 'TELEMETRY',
      number: 8,
      phase: 2,
      title: '8. Telemetry & Gaps',
      subtitle: 'Workflow Learnings & Delta Logging',
      icon: BarChart3,
      status: hasAudit ? 'COMPLETED' : 'READY',
      durationMs: 45,
      details: 'Logs timing metrics, audit discrepancies, error taxonomy classification, and writes KnowledgeDelta entries to outputs/catalog_deltas.json.',
      metrics: {
        knowledgeDelta: hasAudit ? (auditReport.deltaId || 'NLM-RES-LOGGED') : 'Awaiting Audit',
        telemetrySaved: hasAudit ? 'Yes' : 'No'
      },
      actionText: 'View System Telemetry',
      tabTarget: 'telemetry'
    },
    {
      id: 'NOTEBOOK_SYNC',
      number: 9,
      phase: 2,
      title: '9. Notebook Sync',
      subtitle: 'Chassis Variant RAG Knowledge Sync',
      icon: Database,
      status: isSyncing ? 'RUNNING' : (hasAudit ? 'COMPLETED' : 'READY'),
      durationMs: 320,
      details: 'Synchronizes learned catalog deltas and physical rules to NotebookLM knowledge base for shared and individual chassis variants.',
      metrics: {
        syncState: isSyncing ? 'Syncing...' : (hasAudit ? 'Synchronized' : 'Ready'),
        chassisTarget: selectedChassis || 'Unknown Chassis'
      },
      actionText: 'Trigger Notebook Sync',
      actionHandler: onTriggerSyncKnowledge,
      tabTarget: 'scraper'
    }
  ];

  const allSteps = [...stepsPhase1, ...stepsPhase2];

  // Calculate Progress Percentage
  const completedCount = allSteps.filter(s => s.status === 'COMPLETED' || s.status === 'WARNING').length;
  const progressPercent = Math.round((completedCount / allSteps.length) * 100);

  // Selected Step Detail Object
  const selectedStep = allSteps.find(s => s.id === selectedStepId);

  const logs = logStream.map((logObj, idx) => {
    // Safely extract text from the log object
    const logStr = typeof logObj === 'object' && logObj !== null ? (logObj.text || '') : String(logObj);
    
    // Attempt to parse "[HH:MM:SS] Message"
    const match = logStr.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      const isSystem = match[2].includes('SYSTEM') || match[2].includes('START');
      const isError = match[2].includes('ERROR') || match[2].includes('FAIL');
      const isSuccess = match[2].includes('SUCCESS') || match[2].includes('DONE') || match[2].includes('✅');
      const level = isError ? 'WARN' : isSuccess ? 'SUCCESS' : isSystem ? 'SYSTEM' : 'INFO';
      
      return {
        id: `log-${idx}`,
        timestamp: match[1],
        stage: 'PIPELINE',
        level,
        message: match[2]
      };
    }
    return {
      id: `log-${idx}`,
      timestamp: new Date().toISOString().substring(11, 23),
      stage: 'PIPELINE',
      level: 'INFO',
      message: logStr
    };
  });

  // Filtered Logs
  const filteredLogs = logs.filter(l => {
    if (logFilter !== 'ALL' && l.level !== logFilter) return false;
    if (logSearch.trim() && !l.message.toLowerCase().includes(logSearch.toLowerCase()) && !l.stage.toLowerCase().includes(logSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Auto-scroll console
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
    a.download = `boq_pipeline_execution_${selectedChassis || 'dl380'}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Status Badge Renderer
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
    <div className="space-y-4">
      {/* Primary Stepper Wrapper Card */}
      <div className="glass-card p-5 border-l-4 border-l-indigo-600 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/20 shadow-md rounded-2xl transition-all duration-300">
        
        {/* 1. Header Bar with Context Run State & Expand Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-sm">
              <Brain className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Global BOQ Lifecycle Pipeline &amp; Knowledge Loop
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold shadow-2xs">
                  {selectedChassis || 'Unknown Chassis'}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">
                Deterministic hardware engine &rarr; Dual-brain AI verification &rarr; Human-in-Loop Partner Portal reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Overall Progress Indicator */}
            <div className="flex items-center gap-2 bg-white/90 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium shadow-2xs">
              <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                <div 
                  className={`bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full transition-all duration-700 ease-out ${isTaskRunning ? 'animate-stripes' : ''}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-800">{progressPercent}%</span>
            </div>

            {evalResults?.tracePayloads && evalResults.tracePayloads.length > 0 && onOpenTraceability && (
              <button
                onClick={onOpenTraceability}
                className="text-slate-600 hover:text-indigo-700 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-xs flex items-center gap-1.5 font-bold shadow-2xs transition-all"
              >
                <Activity className="w-4 h-4 text-indigo-500" /> Traceability
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs flex items-center gap-1.5 font-bold shadow-2xs transition-all"
            >
              {isExpanded ? (
                <>Minimize Stepper <ChevronUp className="w-4 h-4 text-indigo-600" /></>
              ) : (
                <>Expand Pipeline <ChevronDown className="w-4 h-4 text-indigo-600" /></>
              )}
            </button>
          </div>
        </div>

        {/* 2. Multi-Row Spacious Stepper Layout */}
        {isExpanded && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Overall Progress Track Line */}
            <div className="relative w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
              <div 
                className={`bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full transition-all duration-700 ease-out ${isTaskRunning ? 'animate-stripes' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* ROW 1: PHASE 1 — ENGINE EVALUATION & AI VERIFICATION (Steps 1 to 6) */}
            <div className="bg-slate-100/60 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" /> Phase 1: Local Aspect Math &amp; AI Dual-Brain Verification
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  Steps 01 &ndash; 06
                </span>
              </div>

              {/* Grid of 6 Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                {stepsPhase1.map((s, idx) => {
                  const isSelected = selectedStepId === s.id;
                  const StepIcon = s.icon;

                  return (
                    <div key={s.id} className="relative group/step flex">
                      <div
                        onClick={() => setSelectedStepId(s.id)}
                        className={`flex-1 p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between group relative z-10 ${
                          isSelected
                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/80 shadow-md scale-[1.02]'
                            : s.status === 'COMPLETED'
                            ? 'border-emerald-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/30 shadow-2xs'
                            : s.status === 'RUNNING'
                            ? 'border-blue-400 bg-blue-50/60 shadow-xs ring-2 ring-blue-100'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                              0{s.number}
                            </span>
                            {renderStatusBadge(s.status)}
                          </div>

                          <div className="flex items-center gap-1.5 my-1">
                            {s.status === 'RUNNING' ? (
                              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                            ) : (
                              <StepIcon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${s.status === 'COMPLETED' ? 'text-emerald-600' : 'text-indigo-600'}`} />
                            )}
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {s.title.replace(/^[0-9]+\.\s*/, '')}
                            </h4>
                          </div>

                          <p className="text-[10.5px] text-slate-500 line-clamp-1 leading-tight">
                            {s.subtitle}
                          </p>
                        </div>

                        <div className="mt-2.5 text-[9.5px] font-mono text-slate-400 flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-400" /> {s.durationMs ? `${s.durationMs}ms` : 'Ready'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStepId(s.id);
                              if (s.actionHandler) {
                                s.actionHandler();
                              } else if (s.tabTarget && onNavigateTab) {
                                onNavigateTab(s.tabTarget);
                              }
                            }}
                            className="text-indigo-600 opacity-90 group-hover:opacity-100 font-bold hover:underline transition-opacity cursor-pointer"
                          >
                            View &rarr;
                          </button>
                        </div>
                      </div>
                      
                      {/* Desktop visual connector */}
                      {idx < stepsPhase1.length - 1 && (
                        <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 text-slate-300 bg-white rounded-full p-0.5 border border-slate-200 shadow-sm pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CENTRAL SECTION: HUMAN-IN-THE-LOOP PAUSE & CONTEXT BRIDGE */}
            <div className="relative my-2">
              <div 
                className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  hasEval && !hasAudit
                    ? 'border-amber-400 bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50/80 ring-4 ring-amber-400/20 shadow-md'
                    : 'border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md'
                }`}
              >
                <div className="flex items-start md:items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    hasEval && !hasAudit ? 'bg-amber-200 text-amber-900 animate-bounce' : 'bg-indigo-800 text-indigo-200'
                  }`}>
                    <PauseCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        hasEval && !hasAudit ? 'bg-amber-300 text-amber-950' : 'bg-indigo-800 text-indigo-200'
                      }`}>
                        Human-In-The-Loop Context Bridge
                      </span>
                      {hasEval && !hasAudit ? (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                          ● PAUSED FOR PORTAL QUOTE
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                          ✔ CONTEXT ACTIVE
                        </span>
                      )}
                    </div>

                    <h4 className={`text-sm font-bold mt-1 ${hasEval && !hasAudit ? 'text-amber-950' : 'text-white'}`}>
                      {hasEval && !hasAudit
                        ? 'Phase 1 Complete &mdash; Export Rank 1 Quote to HPE Partner Portal (OCA/CLIC)'
                        : 'Context Run Preserved &mdash; Ready to Reconcile Partner Portal Quote'}
                    </h4>

                    <p className={`text-xs mt-0.5 ${hasEval && !hasAudit ? 'text-amber-800' : 'text-slate-300'}`}>
                      Active Session Context: <code className="font-mono font-bold bg-black/10 px-1.5 py-0.5 rounded">
                        {evalResults?.sessionRunId || 'RUN_ACTIVE'}
                      </code> &bull; Target: <strong className="underline">{selectedChassis || 'Unknown Chassis'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('reconciliation')}
                    className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95 ${
                      hasEval && !hasAudit
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30 ring-2 ring-amber-300'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <PlayCircle className="w-4 h-4" />
                    {hasEval && !hasAudit ? 'Resume Flow & Upload BOM' : 'Go to Quote Reconciliation'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ROW 2: PHASE 2 — PARTNER FEEDBACK LOOP, TELEMETRY & KNOWLEDGE SYNC (Steps 7 to 9) */}
            <div className="bg-slate-100/60 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-emerald-600" /> Phase 2: Partner Portal Reconciliation, Telemetry &amp; RAG Knowledge Delta Sync
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  Steps 07 &ndash; 09
                </span>
              </div>

              {/* Grid of 3 Phase 2 Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {stepsPhase2.map((s, idx) => {
                  const isSelected = selectedStepId === s.id;
                  const StepIcon = s.icon;

                  return (
                    <div key={s.id} className="relative group/step flex">
                      <div
                        onClick={() => setSelectedStepId(s.id)}
                        className={`flex-1 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between group relative z-10 ${
                          isSelected
                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/80 shadow-md scale-[1.02]'
                            : s.status === 'COMPLETED'
                            ? 'border-emerald-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/30 shadow-2xs'
                            : s.status === 'RUNNING'
                            ? 'border-blue-400 bg-blue-50/60 shadow-xs ring-2 ring-blue-100'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                              0{s.number}
                            </span>
                            {renderStatusBadge(s.status)}
                          </div>

                          <div className="flex items-center gap-2 my-1">
                            {s.status === 'RUNNING' ? (
                              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                            ) : (
                              <StepIcon className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110 ${s.status === 'COMPLETED' ? 'text-emerald-600' : 'text-indigo-600'}`} />
                            )}
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {s.title.replace(/^[0-9]+\.\s*/, '')}
                            </h4>
                          </div>

                          <p className="text-xs text-slate-500 line-clamp-1 leading-tight mt-0.5">
                            {s.subtitle}
                          </p>
                        </div>

                        <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {s.durationMs ? `${s.durationMs}ms` : 'Pending'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStepId(s.id);
                              if (s.actionHandler) {
                                s.actionHandler();
                              } else if (s.tabTarget && onNavigateTab) {
                                onNavigateTab(s.tabTarget);
                              }
                            }}
                            className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            Inspect &rarr;
                          </button>
                        </div>
                      </div>
                      
                      {/* Desktop visual connector */}
                      {idx < stepsPhase2.length - 1 && (
                        <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 text-slate-300 bg-white rounded-full p-0.5 border border-slate-200 shadow-sm pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Selected Step Inspector Drawer */}
            {selectedStep && (
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 text-xs animate-fade-in space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-bold text-indigo-400 flex items-center gap-2 text-xs">
                    <Terminal className="w-4 h-4 text-indigo-400" /> Stage {selectedStep.number}: {selectedStep.title} &mdash; {selectedStep.subtitle}
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                    Phase {selectedStep.phase} | Duration: {selectedStep.durationMs || 0}ms
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-xs">
                  {selectedStep.details}
                </p>

                {/* Metrics Pills */}
                {selectedStep.metrics && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(selectedStep.metrics).map(([k, v]) => (
                      <span key={k} className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md text-[10px] font-mono border border-slate-700">
                        <strong className="text-indigo-300 font-semibold">{k}:</strong> {String(v)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Step Quick Action Trigger */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Target Dashboard Tab: <code className="text-indigo-300 font-mono">{selectedStep.tabTarget}</code>
                  </span>
                  <button
                    onClick={() => {
                      if (selectedStep.actionHandler) {
                        selectedStep.actionHandler();
                      } else if (selectedStep.tabTarget && onNavigateTab) {
                        onNavigateTab(selectedStep.tabTarget);
                      }
                    }}
                    className="btn-primary py-1.5 px-3.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    {selectedStep.actionText} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* 3. REAL-TIME TIMESTAMPED STAGE LOGGING DISPLAY CONSOLE */}
      {isExpanded && (
        <div className="glass-card border border-slate-800/80 bg-slate-950 text-slate-100 rounded-2xl overflow-hidden shadow-xl transition-all">
          
          {/* Console Top Control Bar */}
        <div className="bg-slate-900 p-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4 className="font-mono font-bold text-slate-200 text-xs tracking-tight flex items-center gap-2">
              Real-Time Stage Execution Console Log
              <span className="text-[10px] font-normal text-slate-400 font-mono">({logs.length} events logged)</span>
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
              {['ALL', 'INFO', 'SUCCESS', 'WARN', 'SYSTEM'].map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    logFilter === f ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 w-28 sm:w-36 font-mono"
              />
            </div>

            {/* Action Buttons */}
            <Tooltip content="Copy All Logs"><button
              onClick={handleCopyLogs}
              
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-[10px] flex items-center gap-1 font-mono transition-colors"
            >
              {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedLogs ? 'Copied' : 'Copy'}
            </button></Tooltip>

            <Tooltip content="Download Log File"><button
              onClick={handleDownloadLogs}
              
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-[10px] flex items-center gap-1 font-mono transition-colors"
            >
              <Download className="w-3 h-3" />
            </button></Tooltip>

            <button
              onClick={() => setShowLogConsole(!showLogConsole)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-[10px] flex items-center gap-1 font-mono"
            >
              {showLogConsole ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Console Log Body */}
        {showLogConsole && (
          <div className="p-4 font-mono text-[11.5px] leading-relaxed max-h-56 overflow-y-auto space-y-1.5 bg-slate-950 text-slate-200 select-text border-t border-slate-900">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-600 text-xs">
                No logs match the selected filter query [{logFilter}].
              </div>
            ) : (
              filteredLogs.map((log) => {
                let levelBg = 'text-blue-400 bg-blue-950/60 border-blue-800';
                if (log.level === 'SUCCESS') levelBg = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
                if (log.level === 'WARN') levelBg = 'text-amber-400 bg-amber-950/60 border-amber-800';
                if (log.level === 'SYSTEM') levelBg = 'text-purple-400 bg-purple-950/60 border-purple-800';

                return (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/60 p-1 rounded transition-colors group">
                    <span className="text-slate-500 shrink-0 text-[10.5px]">
                      [{log.timestamp}]
                    </span>

                    <span className="text-slate-400 font-bold shrink-0 text-[10.5px]">
                      [{log.stage}]
                    </span>

                    <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border shrink-0 uppercase ${levelBg}`}>
                      {log.level}
                    </span>

                    <span className="text-slate-200 break-words flex-1 group-hover:text-white">
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={consoleEndRef} />
          </div>
        )}

        {/* Footer Log Info Bar */}
        <div className="bg-slate-900/90 px-4 py-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE STREAM ACTIVE
            </span>
            <span>Context ID: <strong className="text-indigo-300">{evalResults?.sessionRunId || 'RUN_ACTIVE'}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-950"
              />
              Auto-scroll
            </label>
            <span>HPE ProLiant AI Engine v1.1</span>
          </div>
        </div>

      </div>
      )}
    </div>
  );
}


