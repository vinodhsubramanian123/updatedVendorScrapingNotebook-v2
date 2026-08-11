import React, { useState, useEffect, useMemo } from 'react';
import TaskStatusBadge from './TaskStatusBadge';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Database, 
  Download, 
  FileCode, 
  FileSpreadsheet, 
  Filter, 
  Layers, 
  Loader2, 
  Play, 
  RefreshCw, 
  Search, 
  Server, 
  Sparkles, 
  Terminal, 
  X, 
  XCircle,
  ChevronRight,
  ExternalLink,
  Activity,
  Box
} from 'lucide-react';

export default function ScrapingHistorySection({ 
  onTriggerScrape, 
  onTriggerRebuild, 
  isTaskRunning = false,
  className = '' 
}) {
  const [runs, setRuns] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | SUCCESS | FAILED
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | SCRAPE | REBUILD | PDF | KNOWLEDGE
  const [selectedTraceRun, setSelectedTraceRun] = useState(null);
  const [traceLogs, setTraceLogs] = useState([]);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedTraceRun) {
        setSelectedTraceRun(null);
        setTraceLogs([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTraceRun]);

  // Fetch runs history & available catalogs
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const [runsRes, catRes] = await Promise.all([
        fetch('/api/history/runs').then(r => r.json()),
        fetch('/api/available-catalogs').then(r => r.json())
      ]);
      setRuns(Array.isArray(runsRes) ? runsRes : []);
      setCatalogs(catRes.catalogs || []);
    } catch (err) {
      console.error('Failed to fetch scraping history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isTaskRunning]);

  // View full execution trace logs for a selected run ID
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

  // Filter and sort runs
  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      // Search text match
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchesId = run.runId?.toLowerCase().includes(query);
        const matchesType = run.taskType?.toLowerCase().includes(query);
        const matchesChassis = run.chassis?.toLowerCase().includes(query);
        const matchesSummary = run.summaryText?.toLowerCase().includes(query);
        if (!matchesId && !matchesType && !matchesChassis && !matchesSummary) return false;
      }

      // Status filter
      if (statusFilter === 'SUCCESS' && run.exitCode !== 0) return false;
      if (statusFilter === 'FAILED' && run.exitCode === 0) return false;

      // Task Type filter
      if (typeFilter === 'SCRAPE' && !run.taskType?.includes('SCRAPE')) return false;
      if (typeFilter === 'REBUILD' && !run.taskType?.includes('REBUILD') && !run.taskType?.includes('CATALOG')) return false;
      if (typeFilter === 'PDF' && !run.taskType?.includes('PDF')) return false;
      if (typeFilter === 'KNOWLEDGE' && !run.taskType?.includes('KNOWLEDGE') && !run.taskType?.includes('SYNC')) return false;

      return true;
    });
  }, [runs, searchQuery, statusFilter, typeFilter]);

  // Calculate summary metrics
  const stats = useMemo(() => {
    const total = runs.length;
    const successful = runs.filter(r => r.exitCode === 0).length;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
    const totalSkus = runs.reduce((acc, r) => acc + (r.itemsScraped || 0), 0);
    const avgDuration = total > 0 
      ? (runs.reduce((acc, r) => acc + (r.durationMs || 0), 0) / total / 1000).toFixed(1)
      : '0.0';

    return { total, successful, successRate, totalSkus, avgDuration };
  }, [runs]);

  // Helper formatting functions
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) { console.warn('Caught suppressed error in ScrapingHistorySection.jsx:', e);
return isoString;
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '< 1s';
    if (ms < 1000) return `${ms}ms`;
    const secs = (ms / 1000).toFixed(1);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = Math.round(secs % 60);
    return `${mins}m ${remSecs}s`;
  };

  const getTaskBadgeClass = (taskType = '') => {
    if (taskType.includes('SCRAPE')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (taskType.includes('REBUILD')) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (taskType.includes('PDF')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (taskType.includes('KNOWLEDGE') || taskType.includes('SYNC')) return 'bg-purple-50 text-purple-800 border-purple-200';
    return 'bg-slate-50 text-slate-800 border-slate-200';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Metrics Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 stroke-[2.25]" />
              Persisted Vendor Scraping &amp; Pipeline History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical ledger of live CDP portal scrapes, offline catalog builds, and QuickSpecs ingestion tasks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="btn-secondary text-xs"
              title="Refresh scraping history log"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Executive Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Total Scrapes</span>
              <Server className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">{stats.total}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Recorded execution runs</p>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600 font-mono">{stats.successRate}%</div>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.successful} / {stats.total} runs passed</p>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Total SKUs Extracted</span>
              <Database className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">{stats.totalSkus.toLocaleString()}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Aggregated unique hardware SKUs</p>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Avg Execution Time</span>
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">{stats.avgDuration}s</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Per scraper execution</p>
          </div>
        </div>
      </div>

      {/* Main Scrape Ledger Table & Filters */}
      <div className="glass-card p-6 space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by run ID, chassis, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {/* Task Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium [color-scheme:light]"
            >
              <option value="ALL">All Task Types</option>
              <option value="SCRAPE">Live Scrapes</option>
              <option value="REBUILD">Offline Rebuilds</option>
              <option value="PDF">QuickSpecs PDF</option>
              <option value="KNOWLEDGE">Knowledge Sync</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium [color-scheme:light]"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
            </select>
          </div>
        </div>

        {/* History List Rows */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs font-semibold">Loading persisted scraping runs...</p>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No Scraping Runs Found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'No runs match your current search or status filters.'
                  : 'Execute a live scrape or offline rebuild above to record a new run.'}
              </p>
            </div>
          ) : (
            filteredRuns.map((run) => {
              const isSuccess = run.exitCode === 0;
              const matchingCat = catalogs.find(c => c.id === run.chassis || run.chassis?.includes(c.id));

              return (
                <div
                  key={run.runId}
                  className="bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl p-4 shadow-sm transition-all space-y-3"
                >
                  {/* Top Row: Task Type + Status + Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${getTaskBadgeClass(run.taskType)}`}>
                        {run.taskType}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Box className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{run.chassis || 'General Portfolio'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(run.startTime)}</span>
                      </div>

                      <TaskStatusBadge 
                        status={run.status || (isSuccess ? 'Complete' : 'Failed')} 
                        exitCode={run.exitCode}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Middle Row: Results Summary Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Scraped / Processed</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {run.itemsScraped > 0 ? `${run.itemsScraped.toLocaleString()} SKUs` : 'Catalog Metadata Sync'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Task Duration</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {formatDuration(run.durationMs)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Execution Run ID</span>
                      <span className="font-mono text-slate-600 text-[11px] truncate block">
                        {run.runId}
                      </span>
                    </div>
                  </div>

                  {/* Milestones Completed Pills */}
                  {run.milestones && run.milestones.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Milestones:</span>
                      {run.milestones.map((ms, i) => (
                        <span key={i} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md font-medium">
                          ✓ {ms}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Result Summary & Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-slate-600 font-medium line-clamp-1 flex-1">
                      <strong className="text-slate-800">Summary: </strong> 
                      {run.summaryText || 'Pipeline completed execution.'}
                    </p>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Download Excel Artifact if catalog exists */}
                      {matchingCat && matchingCat.xlsxPath && (
                        <a
                          href={matchingCat.xlsxPath}
                          download
                          className="btn-secondary text-[11px] py-1 px-2.5 h-auto"
                          title="Download Excel Catalog"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
                        </a>
                      )}

                      {/* Download JSON Artifact */}
                      {matchingCat && matchingCat.jsonPath && (
                        <a
                          href={matchingCat.jsonPath}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-[11px] py-1 px-2.5 h-auto"
                          title="View JSON Catalog"
                        >
                          <FileCode className="w-3.5 h-3.5 text-blue-600" /> JSON
                        </a>
                      )}

                      {/* View Execution Trace Terminal Button */}
                      <button
                        onClick={() => handleViewTrace(run)}
                        className="btn-primary text-[11px] py-1 px-2.5 h-auto"
                        title="View trace logs"
                      >
                        <Terminal className="w-3.5 h-3.5" /> Inspect Logs
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Trace Logs Modal Drawer */}
      {selectedTraceRun && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTraceRun(null);
              setTraceLogs([]);
            }
          }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Scraping Trace Log: {selectedTraceRun.runId}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {selectedTraceRun.taskType} • {formatDate(selectedTraceRun.startTime)} • {formatDuration(selectedTraceRun.durationMs)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTraceRun(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 bg-slate-950">
              {isLoadingTrace ? (
                <div className="flex h-full items-center justify-center text-blue-400 animate-pulse gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Fetching execution trace logs from storage...</span>
                </div>
              ) : traceLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-8">No stdout/stderr logs recorded for this task.</div>
              ) : (
                traceLogs.map((log, i) => {
                  const isPass = log.text?.includes('PASS') || log.text?.includes('SUCCESS') || log.text?.includes('✅');
                  const isErr = log.stream === 'stderr' || log.text?.includes('FAIL') || log.text?.includes('ERROR') || log.text?.includes('❌');
                  return (
                    <div key={i} className={`flex items-start gap-2 ${
                      isPass ? 'text-emerald-400' : isErr ? 'text-rose-400' : 'text-slate-300'
                    }`}>
                      <span className="text-slate-600 select-none shrink-0 font-mono text-[10px]">
                        [{log.timestamp ? log.timestamp.split('T')[1].slice(0, 8) : '--'}]
                      </span>
                      <span className="break-all">{log.text}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Recorded lines: {traceLogs.length}</span>
              <button
                onClick={() => setSelectedTraceRun(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
