import React, { useState, useEffect, useRef } from 'react';
import { 
  FileUp, Sparkles, ShieldCheck, Layers, Brain, LayoutDashboard,
  Repeat, BarChart3, Database, Zap, GitCommit
} from 'lucide-react';
import { 
  PHASE_1_STAGES, 
  PHASE_2_STAGES, 
  ALL_STAGES, 
  computeProgressPercent 
} from '../config/workflowStages';
import WorkflowHeader from './stepper/WorkflowHeader';
import StepStageCard from './stepper/StepStageCard';
import StepLogViewer from './stepper/StepLogViewer';
import { parseLogStream } from '../utils/logParser';

const ICON_MAP = {
  FileUp,
  Sparkles,
  ShieldCheck,
  Layers,
  Brain,
  LayoutDashboard,
  Repeat,
  BarChart3,
  Database
};

function getIcon(name) {
  return ICON_MAP[name] || FileUp;
}

export default function WorkflowStepper({
  evalResults,
  auditReport,
  isTaskRunning,
  activeProgress,
  selectedChassis,
  logStream = [],
  onNavigateTab,
  onTriggerSyncKnowledge,
  onOpenTool,
  onOpenTraceability
}) {
  const [selectedStepId, setSelectedStepId] = useState('VALIDATION');
  const [activeSubstepIdx, setActiveSubstepIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showLogConsole, setShowLogConsole] = useState(isTaskRunning);
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (isTaskRunning) {
      setIsExpanded(true);
      setShowLogConsole(true);
    }
  }, [isTaskRunning]);

  const stateContext = {
    evalResults,
    auditReport,
    isTaskRunning,
    activeProgress,
    selectedChassis
  };

  const progressPercent = computeProgressPercent(stateContext);

  const selectedStep = ALL_STAGES.find(s => s.id === selectedStepId) || ALL_STAGES[0];

  const logs = parseLogStream(logStream);

  const filteredLogs = logs.filter(l => {
    if (logFilter !== 'ALL' && l.level !== logFilter) return false;
    if (logSearch.trim() && !l.message.toLowerCase().includes(logSearch.toLowerCase()) && !l.stage.toLowerCase().includes(logSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-6">
      <WorkflowHeader
        progressPercent={progressPercent}
        isTaskRunning={isTaskRunning}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        showLogConsole={showLogConsole}
        setShowLogConsole={setShowLogConsole}
      />

      {isExpanded && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Phase 1: Catalog Intelligence & Knowledge Grounding
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PHASE_1_STAGES.map(stg => (
                <StepStageCard
                  key={stg.id}
                  stage={stg}
                  isSelected={selectedStepId === stg.id}
                  onSelect={() => setSelectedStepId(stg.id)}
                  status={stg.deriveStatus(stateContext)}
                  metrics={stg.deriveMetrics(stateContext)}
                  IconComponent={getIcon(stg.iconName)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Phase 2: Continuous Evaluation & Closed-Loop Feedback
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PHASE_2_STAGES.map(stg => (
                <StepStageCard
                  key={stg.id}
                  stage={stg}
                  isSelected={selectedStepId === stg.id}
                  onSelect={() => setSelectedStepId(stg.id)}
                  status={stg.deriveStatus(stateContext)}
                  metrics={stg.deriveMetrics(stateContext)}
                  IconComponent={getIcon(stg.iconName)}
                />
              ))}
            </div>
          </div>

          {selectedStep && (
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-emerald">{selectedStep.phase || 'Phase 1'}</span>
                    <h3 className="font-bold text-slate-900 text-base">{selectedStep.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedStep.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenTraceability && (
                    <button
                      onClick={onOpenTraceability}
                      className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5"
                      title="Open End-to-End Decision Traceability Inspector"
                    >
                      <GitCommit className="w-3.5 h-3.5 text-slate-500" />
                      Traceability
                    </button>
                  )}
                  {selectedStep.primaryAction && (
                    <button
                      onClick={() => {
                        if (selectedStep.primaryAction.tab && onNavigateTab) {
                          onNavigateTab(selectedStep.primaryAction.tab);
                        } else if (selectedStep.primaryAction.action === 'SYNC' && onTriggerSyncKnowledge) {
                          onTriggerSyncKnowledge();
                        } else if (selectedStep.primaryAction.tool && onOpenTool) {
                          onOpenTool(selectedStep.primaryAction.tool);
                        }
                      }}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {selectedStep.primaryAction.label}
                    </button>
                  )}
                </div>
              </div>

              {selectedStep.substeps && selectedStep.substeps.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                    Execution Sub-steps & Micro-Operations:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedStep.substeps.map((sub, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveSubstepIdx(idx)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          activeSubstepIdx === idx
                            ? 'bg-white border-emerald-400 shadow-sm'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800 text-[11px]">#{idx + 1} {sub.title}</span>
                          <span className="text-[9px] font-mono text-slate-400">{sub.estimatedTime || 'Fast'}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{sub.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {showLogConsole && (
            <StepLogViewer
              logs={logs}
              filteredLogs={filteredLogs}
              logFilter={logFilter}
              setLogFilter={setLogFilter}
              logSearch={logSearch}
              setLogSearch={setLogSearch}
              autoScroll={autoScroll}
              setAutoScroll={setAutoScroll}
              copiedLogs={copiedLogs}
              onCopyLogs={handleCopyLogs}
              consoleEndRef={consoleEndRef}
            />
          )}
        </div>
      )}
    </div>
  );
}
