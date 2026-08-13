import Tooltip from './Tooltip';
import React, { useState, useEffect, useMemo } from 'react';
import TaskStatusBadge from './TaskStatusBadge';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Server, 
  Square, 
  Terminal, 
  XCircle,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * Stage definitions for HPE OCA Vendor Scraping & Catalog Pipeline Workflow
 */
const SCRAPER_STAGES = [
  { id: 'CDP_CONNECT', label: 'CDP Handshake', desc: 'Attach to Chrome port 9222' },
  { id: 'PORTAL_NAV', label: 'Portal Navigation', desc: 'Locate HPE OCA solution root' },
  { id: 'CATEGORY_DISCOVERY', label: 'Category Discovery', desc: 'Scan tree & sub-menus' },
  { id: 'DOM_EXTRACTION', label: 'DOM & SKU Scraping', desc: 'Extract hardware & prices' },
  { id: 'RULES_PARSING', label: 'Aspect Rules Engine', desc: 'Synthesize constraint graph' },
  { id: 'CATALOG_GEN', label: 'Catalog Generation', desc: 'Write Excel & JSON artifacts' },
];

export default function VendorScraperProgress({
  logStream = [],
  isTaskRunning = false,
  taskType = 'SCRAPE',
  onCancelTask,
  className = ''
}) {
  const [showDetails, setShowDetails] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for elapsed time when task is running
  useEffect(() => {
    let timer;
    if (isTaskRunning) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isTaskRunning]);

  // Extract latest progress event and status from logStream
  const { 
    progressPercent, 
    progressStage, 
    statusMessage, 
    scrapedItems, 
    recentLogEntries,
    isCompleted,
    isFailed
  } = useMemo(() => {
    let percent = null;
    let stage = isTaskRunning ? 'IN_PROGRESS' : 'IDLE';
    let msg = 'Pipeline ready for task execution.';
    let items = 0;
    let category = '';
    let sku = '';
    let completed = false;
    let failed = false;

    // Search log stream in reverse for progress events
    for (let i = logStream.length - 1; i >= 0; i--) {
      const log = logStream[i];
      const text = log.text || '';

      // Check for structured JSON progress payload
      try {
        if (text.startsWith('{') && text.endsWith('}')) {
          const parsed = JSON.parse(text);
          if (parsed.type === 'PROGRESS' || parsed.percent !== undefined) {
            if (typeof parsed.percent === 'number') percent = Math.min(100, Math.max(0, parsed.percent));
            if (parsed.stage) stage = parsed.stage;
            if (parsed.message) msg = parsed.message;
            if (parsed.itemsScraped !== undefined) items = parsed.itemsScraped;
            if (parsed.category) category = parsed.category;
            if (parsed.sku) sku = parsed.sku;
            break;
          }
        }
      } catch (_) { console.warn('Caught suppressed error in VendorScraperProgress.jsx:', _); }

      // Fallback heuristics from log text
      if (text.includes('100%') || text.includes('✅ Scrape completed') || text.includes('Scrape Complete')) {
        percent = 100;
        completed = true;
        msg = text;
      } else if (text.includes('❌') || text.includes('Error') || text.includes('Failed')) {
        failed = true;
      }

      // Try to parse stage names or percentages from plain text logs
      const percentMatch = text.match(/(\d{1,3})%/);
      if (percentMatch && percent === null) {
        const val = parseInt(percentMatch[1], 10);
        if (val <= 100) percent = val;
      }

      const itemsMatch = text.match(/(\d+)\s*(SKUs|items|entries|products)/i);
      if (itemsMatch && items === 0) {
        items = parseInt(itemsMatch[1], 10);
      }
    }

    // Default stage index mapping
    let currentStageIndex = 0;
    if (percent !== null) {
      if (percent >= 100) currentStageIndex = 5;
      else if (percent >= 80) currentStageIndex = 4;
      else if (percent >= 50) currentStageIndex = 3;
      else if (percent >= 30) currentStageIndex = 2;
      else if (percent >= 10) currentStageIndex = 1;
      else currentStageIndex = 0;
    }

    // Extract recent progress logs (last 3)
    const recent = logStream
      .slice(-5)
      .map(l => l.text)
      .filter(t => t && !t.startsWith('{'));

    return {
      progressPercent: percent,
      progressStage: stage,
      statusMessage: msg,
      scrapedItems: items,
      currentCategory: category,
      currentSku: sku,
      currentStageIndex,
      recentLogEntries: recent,
      isCompleted: completed,
      isFailed: failed
    };
  }, [logStream, isTaskRunning]);

  // Format elapsed time in MM:SS
  const formattedTime = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Estimate time remaining
  const estimatedRemaining = useMemo(() => {
    if (!isTaskRunning || progressPercent === null || progressPercent <= 5) return 'Calculating...';
    if (progressPercent >= 100) return '00:00';
    const totalEst = (elapsedSeconds / progressPercent) * 100;
    const rem = Math.max(0, Math.round(totalEst - elapsedSeconds));
    const mins = Math.floor(rem / 60);
    const secs = rem % 60;
    return `~${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [elapsedSeconds, progressPercent, isTaskRunning]);

  if (!isTaskRunning && logStream.length === 0) {
    return (
      <div className={`bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-slate-500 text-xs flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <span>Scraper status: <strong className="text-slate-700">Idle &amp; Ready</strong></span>
        </div>
        <span className="text-[11px] bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-md font-mono">Port 9222 CDP</span>
      </div>
    );
  }

  const effectivePercent = progressPercent !== null ? progressPercent : (isTaskRunning ? 35 : 0);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all ${className}`}>
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isTaskRunning ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse' :
            isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            isFailed ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
            'bg-slate-800 text-slate-300'
          }`}>
            {isTaskRunning ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> :
             isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
             isFailed ? <XCircle className="w-5 h-5 text-rose-400" /> :
             <Server className="w-5 h-5 text-slate-300" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                HPE Vendor Portal Scraper
              </h3>
              <TaskStatusBadge 
                status={isTaskRunning ? 'Running' : isCompleted ? 'Complete' : isFailed ? 'Failed' : 'Pending'} 
                size="sm"
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {statusMessage || (isTaskRunning ? `Processing ${taskType} workflow...` : 'Task ended.')}
            </p>
          </div>
        </div>

        {/* Action Button & Timer Controls */}
        <div className="flex items-center gap-3">
          {isTaskRunning && (
            <div className="hidden sm:flex items-center gap-3 text-xs bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-mono text-white font-semibold">{formattedTime}</span>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <div className="text-slate-400 text-[11px]">
                ETA: <span className="font-mono text-slate-200 font-semibold">{estimatedRemaining}</span>
              </div>
            </div>
          )}

          {isTaskRunning && onCancelTask && (
            <Tooltip content="Abort current scraper process"><button
              onClick={onCancelTask}
              className="flex items-center gap-1.5 text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 px-3 py-1.5 rounded-lg transition-all"
              
            >
              <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              <span>Cancel</span>
            </button></Tooltip>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Progress Bar Container */}
      <div className="p-5 space-y-4">
        {/* Progress Header Stats */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 text-slate-700">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Workflow Stage: <span className="text-blue-600 font-bold">{progressStage}</span></span>
          </div>

          <div className="flex items-center gap-3">
            {scrapedItems > 0 && (
              <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
                <strong>{scrapedItems}</strong> SKUs parsed
              </span>
            )}
            <span className="text-slate-900 font-bold font-mono text-sm">
              {progressPercent !== null ? `${progressPercent}%` : isTaskRunning ? 'Running...' : '0%'}
            </span>
          </div>
        </div>

        {/* Animated Custom Progress Bar */}
        <div className="relative">
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/80 p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
                isCompleted ? 'bg-emerald-500' :
                isFailed ? 'bg-rose-500' :
                isTaskRunning ? 'animate-stripes bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500' :
                'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500'
              }`}
              style={{ width: `${Math.max(effectivePercent, 5)}%` }}
            >
              {/* Shimmer Light Bar overlay when running */}
              {isTaskRunning && (
                <div className="absolute inset-0 bg-white/10 animate-pulse-slow" />
              )}
            </div>
          </div>
        </div>

        {/* Sub-details (Stage stepper & live logs) */}
        {showDetails && (
          <div className="pt-2 space-y-4 border-t border-slate-100">
            {/* Visual Stage Stepper */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap md:flex-nowrap gap-2 items-stretch">
              {SCRAPER_STAGES.map((stg, idx) => {
                const isCurrent = isTaskRunning && (progressPercent === null || (progressPercent >= idx * 16 && progressPercent < (idx + 1) * 16 + 5));
                const isDone = isCompleted || (progressPercent !== null && progressPercent >= (idx + 1) * 16);

                return (
                  <div key={stg.id} className="flex-1 flex items-center relative group">
                    <div
                      className={`w-full p-2 rounded-xl border text-[11px] transition-all relative z-10 ${
                        isDone
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800 shadow-sm'
                          : isCurrent
                          ? 'bg-blue-50/90 border-blue-400 text-blue-900 ring-2 ring-blue-200 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200/60 text-slate-400 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-0.5">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-[9px] flex items-center justify-center text-slate-600 font-bold shrink-0">
                            {idx + 1}
                          </span>
                        )}
                        <span className="truncate">{stg.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{stg.desc}</p>
                    </div>
                    {/* Connector visual on desktop */}
                    {idx < SCRAPER_STAGES.length - 1 && (
                      <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 text-slate-300 group-hover:text-slate-400 transition-colors bg-white rounded-full p-0.5 shadow-xs border border-slate-100">
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live Log Snippet Box */}
            {recentLogEntries.length > 0 && (
              <div className="bg-slate-900 rounded-xl p-3 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1 font-sans font-semibold">
                  <span className="flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-blue-400" /> Recent Scraper Stream
                  </span>
                  <span>Live Telemetry</span>
                </div>
                {recentLogEntries.map((logText, i) => (
                  <div key={i} className="truncate text-slate-300 flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold shrink-0">&gt;</span>
                    <span className="truncate">{logText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
