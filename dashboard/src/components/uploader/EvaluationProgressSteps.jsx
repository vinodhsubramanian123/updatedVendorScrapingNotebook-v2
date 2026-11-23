import React from 'react';
import { Terminal } from 'lucide-react';

const PHASE_STATUS = {
  NOT_STARTED: ['Pending', 'bg-slate-100 text-slate-700'],
  RUNNING: ['In progress', 'badge-blue'],
  PASSED: ['Passed', 'badge-emerald'],
  RESOLVED: ['Resolved', 'badge-emerald'],
  WARNED: ['Passed with warnings', 'badge-amber'],
  ACTION_REQUIRED: ['Action required', 'badge-amber'],
  SKIPPED: ['Skipped', 'bg-slate-100 text-slate-700'],
  FAILED: ['Failed', 'badge-rose'],
  NOT_REACHED: ['Not reached', 'bg-slate-100 text-slate-700']
};

export default function EvaluationProgressSteps({
  isEvaluating,
  currentStep,
  action,
  qualifications,
  logStream,
  logsEndRef
}) {
  if (!isEvaluating && !qualifications?.length) return null;
  const halted = qualifications?.some(phase => phase.status === 'FAILED');

  return (
    <div className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-4">
      <div role="status" className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 text-sm">{isEvaluating ? action || 'Starting evaluation…' : 'Evaluation stages'}</h3>
        {isEvaluating && currentStep > 0 && qualifications?.length > 0 &&
          <span className="text-xs text-slate-600">Stage {currentStep} of {qualifications.length}</span>}
      </div>

      {qualifications?.length > 0 && (
        <ol aria-label="Stage qualification" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {qualifications.map(phase => {
            const status = halted && phase.status === 'NOT_STARTED' ? 'NOT_REACHED' : phase.status;
            const [label, badge] = PHASE_STATUS[status] || PHASE_STATUS.NOT_STARTED;
            const isCurrent = isEvaluating && phase.step === currentStep;
            return (
              <li key={phase.step} aria-current={isCurrent ? 'step' : undefined}
                className={`space-y-1 rounded-lg border p-2.5 text-xs ${isCurrent ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="font-semibold text-slate-900">{phase.title}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${badge}`}>{label}</span>
                  <span className="text-slate-600">{phase.mode}</span>
                </div>
                {phase.reason && <p className="text-slate-700"><strong>Qualification reason</strong> · {phase.reason}</p>}
              </li>
            );
          })}
        </ol>
      )}

      {logStream && logStream.length > 0 && (
        <div className="mt-4 bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] max-h-40 overflow-y-auto space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] pb-1 border-b border-slate-800">
            <Terminal className="w-3 h-3" /> Execution Log Stream
          </div>
          {logStream.slice(-20).map((log, idx) => (
            <div key={idx} className="leading-snug truncate">
              {log?.timestamp && <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}] </span>}
              {typeof log === 'string' ? log : (log?.text || log?.message || log?.action || JSON.stringify(log))}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
