import React, { useEffect } from 'react';
import { Terminal, X, Loader2 } from 'lucide-react';
import TaskStatusBadge from '../TaskStatusBadge';

export default function RunDetailModal({
  selectedTraceRun,
  traceLogs = [],
  isLoadingTrace,
  onClose
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedTraceRun) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTraceRun, onClose]);

  if (!selectedTraceRun) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-backdrop"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950 border border-emerald-800/60 rounded-xl text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">{selectedTraceRun.runId}</h3>
                <TaskStatusBadge status={selectedTraceRun.exitCode === 0 ? 'COMPLETED' : 'FAILED'} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Task: <span className="text-slate-200 font-semibold">{selectedTraceRun.taskType || selectedTraceRun.type}</span> • Duration: {selectedTraceRun.durationMs ? `${(selectedTraceRun.durationMs / 1000).toFixed(1)}s` : 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300 space-y-1 bg-slate-950">
          {isLoadingTrace ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
              <span>Loading execution logs...</span>
            </div>
          ) : traceLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No stdout/stderr stream logs captured for this run.</div>
          ) : (
            traceLogs.map((l, i) => (
              <div
                key={i}
                className={`py-0.5 px-2 rounded flex items-start gap-2 ${
                  l.stream === 'stderr' || l.text?.includes('ERROR') || l.text?.includes('FAIL')
                    ? 'text-rose-400 bg-rose-950/20'
                    : l.text?.includes('SUCCESS') || l.text?.includes('PASS') || l.text?.includes('100%')
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-slate-600 select-none text-[10px] w-16">{l.timestamp?.substring(11, 19) || '—'}</span>
                <span className="flex-1 break-all whitespace-pre-wrap">{l.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
