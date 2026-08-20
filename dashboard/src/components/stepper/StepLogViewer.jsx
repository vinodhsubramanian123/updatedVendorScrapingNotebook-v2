import React from 'react';
import { Terminal, Copy, Search, Check } from 'lucide-react';

export default function StepLogViewer({
  filteredLogs = [],
  logFilter,
  setLogFilter,
  logSearch,
  setLogSearch,
  autoScroll,
  setAutoScroll,
  copiedLogs,
  onCopyLogs,
  consoleEndRef
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-300 space-y-3 shadow-inner">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-xs">Live Execution Console &amp; SSE Stream</span>
          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
            {filteredLogs.length} line(s)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
            <input
              type="text"
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              placeholder="Search logs..."
              className="bg-slate-800 border border-slate-700 text-white pl-6 pr-2 py-1 rounded text-[11px] outline-none focus:border-emerald-500 w-32"
            />
          </div>

          <select
            value={logFilter}
            onChange={e => setLogFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white px-2 py-1 rounded text-[11px] outline-none"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warnings / Errors</option>
            <option value="SUCCESS">Success</option>
            <option value="SYSTEM">System</option>
          </select>

          <button
            onClick={onCopyLogs}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 px-2 transition-colors"
            title="Copy logs"
          >
            {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedLogs ? 'Copied' : 'Copy'}
          </button>

          <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAutoScroll(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
        {filteredLogs.length === 0 ? (
          <p className="text-slate-500 italic py-4 text-center">No logs matching filter criteria.</p>
        ) : (
          filteredLogs.map(l => (
            <div key={l.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-500 shrink-0 select-none">[{l.timestamp}]</span>
              <span className={`shrink-0 px-1 py-0.2 rounded text-[9px] font-bold ${
                l.level === 'WARN' ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50' :
                l.level === 'SUCCESS' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' :
                l.level === 'SYSTEM' ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50' :
                'bg-slate-800 text-slate-400'
              }`}>
                {l.level}
              </span>
              <span className={`${
                l.level === 'WARN' ? 'text-rose-200' :
                l.level === 'SUCCESS' ? 'text-emerald-300' :
                l.level === 'SYSTEM' ? 'text-purple-200 font-semibold' :
                'text-slate-300'
              }`}>
                {l.message}
              </span>
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
