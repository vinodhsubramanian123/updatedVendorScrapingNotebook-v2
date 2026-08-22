import React from 'react';
import { CheckCircle2, Activity, Terminal } from 'lucide-react';

export const EVAL_PIPELINE_STEPS = [
  { id: 1, title: 'Workload DNA & Intake', subtitle: 'Extract hardware SKU lines, multi-sheet BOM & CTO multipliers' },
  { id: 2, title: 'Chassis Auto-Detection', subtitle: 'Identify target chassis variant, generation & form factor' },
  { id: 3, title: 'Catalog Rules Engine', subtitle: 'Load multi-tiered scraped rules & mandatory dependencies' },
  { id: 4, title: '6-Aspect Physical Math', subtitle: 'Compute/Thermal, Memory, Storage, PCIe, Power, Support checks' },
  { id: 5, title: '5-Tier Strategy Matrix', subtitle: 'Synthesize Rank 1 (Intent) through Rank 5 (Budget Minimized)' },
  { id: 6, title: 'Quantitative Confidence', subtitle: 'Calculate deterministic reliability & conflict graph score' },
  { id: 7, title: 'CapEx Budget Optimizer', subtitle: 'Evaluate budget limits, upgrade paths & pricing baseline' },
  { id: 8, title: 'Agentic Guardrail Loop', subtitle: 'Autonomous conflict resolution & fallback safety checks' },
  { id: 9, title: 'NotebookLM RAG Grounding', subtitle: 'QuickSpecs document verification & grounding payload' },
  { id: 10, title: 'Solution Report & Audit', subtitle: 'Compile telemetry ledger, exportable BOM & actionable fixes' }
];

export default function EvaluationProgressSteps({
  isEvaluating,
  currentStep,
  logStream,
  logsEndRef
}) {
  if (!isEvaluating && currentStep === 0) return null;

  return (
    <div className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="badge badge-emerald">Real-time Pipeline Telemetry</span>
          <h3 className="font-bold text-slate-900 text-sm mt-1">10-Stage Deterministic & Agentic Execution</h3>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          Step {Math.min(10, Math.max(1, currentStep))} of 10
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {EVAL_PIPELINE_STEPS.map(step => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                isDone
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : isCurrent
                  ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-100 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[10px] uppercase tracking-wider">Step {step.id}</span>
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : isCurrent ? (
                  <Activity className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                ) : null}
              </div>
              <p className="font-semibold truncate text-[11px]">{step.title}</p>
            </div>
          );
        })}
      </div>

      {logStream && logStream.length > 0 && (
        <div className="mt-4 bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] max-h-40 overflow-y-auto space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] pb-1 border-b border-slate-800">
            <Terminal className="w-3 h-3" /> Execution Log Stream
          </div>
          {logStream.slice(-20).map((log, idx) => (
            <div key={idx} className="leading-snug truncate">
              <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>{' '}
              {typeof log === 'string' ? log : (log?.text || log?.message || log?.action || JSON.stringify(log))}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
