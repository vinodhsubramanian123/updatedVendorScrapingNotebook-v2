import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import RunHistoryTable from './history/RunHistoryTable';
import RunDetailModal from './history/RunDetailModal';

export default function ScrapingHistorySection({ 
  onTriggerScrape: _onTriggerScrape, 
  onTriggerRebuild: _onTriggerRebuild, 
  isTaskRunning = false,
  className = '' 
}) {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedTraceRun, setSelectedTraceRun] = useState(null);
  const [traceLogs, setTraceLogs] = useState([]);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const runsRes = await fetch('/api/history/runs').then(r => r.json());
      setRuns(Array.isArray(runsRes) ? runsRes : []);
    } catch (err) {
      console.error('Failed to fetch scraping history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isTaskRunning]);

  const handleViewTrace = async (run) => {
    setSelectedTraceRun(run);
    setIsLoadingTrace(true);
    setTraceLogs([]);
    try {
      const res = await fetch(`/api/history/runs/${run.runId}`);
      const data = await res.json();
      setTraceLogs(data.logs || []);
    } catch (err) {
      setTraceLogs([{ text: `Error loading trace: ${err.message}`, stream: 'stderr' }]);
    } finally {
      setIsLoadingTrace(false);
    }
  };

  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Execution & Scrape History</h2>
            <p className="text-xs text-slate-500">Trace audit logs of background tasks, scrapes, and rebuilds</p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <RunHistoryTable
        runs={runs}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onViewTrace={handleViewTrace}
      />

      <RunDetailModal
        selectedTraceRun={selectedTraceRun}
        traceLogs={traceLogs}
        isLoadingTrace={isLoadingTrace}
        onClose={() => setSelectedTraceRun(null)}
      />
    </div>
  );
}
