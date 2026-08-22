import React from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

export default function WorkflowHeader({
  progressPercent,
  isTaskRunning,
  isExpanded,
  setIsExpanded,
  showLogConsole,
  setShowLogConsole
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <div className="flex items-center gap-2">
          <span className="badge badge-emerald">Autonomous Lifecycle</span>
          {isTaskRunning && (
            <span className="badge badge-blue flex items-center gap-1 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" /> Live Pipeline Active
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-900 mt-1">
          HPE Autonomous Configuration & Continuous Learning Lifecycle
        </h2>
        <p className="text-xs text-slate-500">
          6-Stage Continuous Learning: Scrape ➔ Sync ➔ Pre-check ➔ RAG Ground ➔ Trial ➔ Learn
        </p>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-slate-500 font-medium">Pipeline Progress</span>
          <p className="text-sm font-bold text-slate-900 font-mono">{progressPercent}%</p>
        </div>

        <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden hidden sm:block">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <button
          onClick={() => setShowLogConsole(!showLogConsole)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            showLogConsole
              ? 'bg-slate-900 text-emerald-400 border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Console
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title={isExpanded ? 'Collapse Workflow' : 'Expand Workflow'}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
