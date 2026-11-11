import React from 'react';
import { Search, Terminal, Calendar, Clock, RotateCcw } from 'lucide-react';
import TaskStatusBadge from '../TaskStatusBadge';

export default function RunHistoryTable({
  runs = [],
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  onViewTrace,
  onReopenRun
}) {
  const filteredRuns = runs.filter(run => {
    const effectiveStatus = run.status || (run.exitCode === 0 ? 'COMPLETED' : 'FAILED');
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      run.runId?.toLowerCase().includes(q) ||
      run.taskType?.toLowerCase().includes(q) ||
      run.product?.toLowerCase().includes(q) ||
      run.chassis?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'SUCCESS' && effectiveStatus === 'COMPLETED') ||
      (statusFilter === 'FAILED' && ['FAILED', 'CANCELLED', 'INTERRUPTED'].includes(effectiveStatus)) ||
      effectiveStatus === statusFilter;
    const matchesType = typeFilter === 'ALL' || run.taskType?.includes(typeFilter);
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search run ID, task, or product..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-56"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="ACTION_REQUIRED">Action Required</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="INTERRUPTED">Interrupted</option>
            <option value="FAILED">Failed / Cancelled / Interrupted</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Tasks</option>
            <option value="EVAL_BOQ">BOQ Evaluations</option>
            <option value="PRESALES_QUERY">Presales Queries</option>
            <option value="SCRAPE">Scrape Tasks</option>
            <option value="REBUILD">Rebuild Tasks</option>
            <option value="KNOWLEDGE_SYNC">Knowledge Sync</option>
            <option value="DOWNLOAD_PDF">QuickSpecs PDF</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Run ID</th>
              <th className="py-2.5 px-3">Task Type</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Started At</th>
              <th className="py-2.5 px-3">Duration</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                  No execution runs match the current search filters.
                </td>
              </tr>
            ) : (
              filteredRuns.map(run => {
                const effectiveStatus = run.status || (run.exitCode === 0 ? 'COMPLETED' : 'FAILED');
                const canReopen = Boolean(onReopenRun && (run.hasRecoverableResult || ['EVAL_BOQ', 'PRESALES_QUERY'].includes(run.taskType)));
                return (
                  <tr key={run.runId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{run.runId}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      <span>{run.taskType || run.type}</span>
                      {run.product && <span className="ml-1.5 text-[10px] font-normal text-slate-500">({run.product})</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <TaskStatusBadge status={effectiveStatus} exitCode={run.exitCode} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{run.startTime ? new Date(run.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {canReopen && (
                          <button
                            onClick={() => onReopenRun(run)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all cursor-pointer border border-emerald-200"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reopen</span>
                          </button>
                        )}
                        <button
                          onClick={() => onViewTrace?.(run)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>Trace</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
