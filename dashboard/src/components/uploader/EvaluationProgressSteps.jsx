import React from 'react';
import { Terminal } from 'lucide-react';

export const EVAL_PIPELINE_STEPS = [
  'Read BOQ', 'Resolve platform', 'Load catalog rules', 'Check hardware', 'Check conflicts',
  'Review alternatives', 'Check pricing', 'Prepare evidence', 'Review evidence', 'Finalize results'
];

export default function EvaluationProgressSteps({
  isEvaluating,
  currentStep,
  action,
  logStream,
  logsEndRef
}) {
  if (!isEvaluating) return null;

  return (
    <div className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-4">
      <div role="status" className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 text-sm">{action || 'Starting evaluation…'}</h3>
        {currentStep > 0 && <span className="text-xs text-slate-600">Stage {currentStep} of {EVAL_PIPELINE_STEPS.length}</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {EVAL_PIPELINE_STEPS.map((title, index) => {
          const isCurrent = currentStep === index + 1;
          return (
            <div
              key={title}
              aria-current={isCurrent ? 'step' : undefined}
              className={`p-2.5 rounded-lg border text-xs transition-colors ${
                isCurrent ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {index + 1}. {title}
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
