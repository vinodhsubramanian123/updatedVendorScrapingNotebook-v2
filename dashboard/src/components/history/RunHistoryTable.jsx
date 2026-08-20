import React from 'react';
import { Search, Terminal, Calendar, Clock } from 'lucide-react';
import TaskStatusBadge from '../TaskStatusBadge';

export default function RunHistoryTable({
  runs = [],
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  onViewTrace
}) {
  const filteredRuns = runs.filter(run => {
    const matchesSearch = !searchQuery.trim() ||
      run.runId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.taskType?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'SUCCESS' && run.exitCode === 0) ||
      (statusFilter === 'FAILED' && run.exitCode !== 0);
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
            placeholder="Search run ID or task type..."
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
            <option value="SUCCESS">Completed (Success)</option>
            <option value="FAILED">Failed / Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Tasks</option>
            <option value="SCRAPE">Scrape Tasks</option>
            <option value="REBUILD">Rebuild Tasks</option>
            <option value="EVAL_BOQ">BOQ Evaluations</option>
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
              <th className="py-2.5 px-3 text-right">Logs</th>
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
              filteredRuns.map(run => (
                <tr key={run.runId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{run.runId}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">{run.taskType || run.type}</td>
                  <td className="py-2.5 px-3">
                    <TaskStatusBadge status={run.exitCode === 0 ? 'COMPLETED' : 'FAILED'} />
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
                    <button
                      onClick={() => onViewTrace?.(run)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Trace</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
