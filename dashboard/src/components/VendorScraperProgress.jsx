import React, { useState, useMemo } from 'react';
import TaskStatusBadge from './TaskStatusBadge';
import {
  Activity,
  CheckCircle2,
  Loader2,
  Server,
  Terminal,
  XCircle,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SCRAPER_STAGES = [
  { id: 'CDP_CONNECT',        label: 'CDP Handshake',        desc: 'Attach to Chrome port 9222',          minPercent: 0,  maxPercent: 19 },
  { id: 'PORTAL_NAV',         label: 'Portal Navigation',    desc: 'Locate HPE OCA solution root',         minPercent: 20, maxPercent: 29 },
  { id: 'CATEGORY_DISCOVERY', label: 'Category Discovery',   desc: 'Scan tree & sub-menus',                minPercent: 30, maxPercent: 44 },
  { id: 'PAGE_EXPAND',        label: 'Section Expansion',    desc: 'Deep scroll & multi-tab reveal',        minPercent: 45, maxPercent: 59 },
  { id: 'DOM_EXTRACTION',     label: 'DOM & SKU Scraping',   desc: 'Extract hardware & prices',             minPercent: 60, maxPercent: 69 },
  { id: 'RULES_PARSING',      label: 'Aspect Rules Engine',  desc: 'Synthesize constraint graph',           minPercent: 70, maxPercent: 79 },
  { id: 'CATALOG_GEN',        label: 'Catalog Generation',   desc: 'Write Excel & JSON artifacts',          minPercent: 80, maxPercent: 89 },
  { id: 'STAGING_AUDIT',      label: 'Staging Tally Audit',  desc: '7-check post-flight certification',     minPercent: 90, maxPercent: 94 },
  { id: 'KNOWLEDGE_SYNC',     label: 'NotebookLM Grounding', desc: 'Sync knowledge payload to RAG',         minPercent: 95, maxPercent: 97 },
  { id: 'REGISTRY_SYNC',      label: 'Portfolio Ledger Sync',desc: 'Update registry & telemetry',            minPercent: 98, maxPercent: 100 },
];

const OPEN_BRACE_CHAR = String.fromCharCode(123);
const CLOSE_BRACE_CHAR = String.fromCharCode(125);

function tryParseJsonProgress(text) {
  if (!text.startsWith(OPEN_BRACE_CHAR) || !text.endsWith(CLOSE_BRACE_CHAR)) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed.type === 'PROGRESS' || parsed.percent !== undefined) return parsed;
  } catch (_) {
    console.warn('Caught suppressed error in VendorScraperProgress.jsx:', _);
  }
  return null;
}

function applyJsonProgress(acc, parsed) {
  if (typeof parsed.percent === 'number') acc.percent = Math.min(100, Math.max(0, parsed.percent));
  if (parsed.stage) acc.stage = parsed.stage;
  if (parsed.message) acc.msg = parsed.message;
  if (parsed.itemsScraped !== undefined) acc.items = parsed.itemsScraped;
  if (parsed.category) acc.category = parsed.category;
  if (parsed.sku) acc.sku = parsed.sku;
}

function deriveScraperProgressState(logStream, isTaskRunning) {
  const acc = {
    percent: null,
    stage: isTaskRunning ? 'IN_PROGRESS' : 'IDLE',
    msg: 'Pipeline ready for task execution.',
    items: 0,
    category: '',
    sku: ''
  };

  for (let i = logStream.length - 1; i >= 0; i--) {
    const event = logStream[i];
    const parsed = event.type === 'PROGRESS' ? event : tryParseJsonProgress(event.text || '');
    if (parsed) {
      applyJsonProgress(acc, parsed);
      break;
    }
  }

  const recentLogEntries = logStream
    .slice(-5)
    .map(l => l.text)
    .filter(t => t && !t.startsWith(OPEN_BRACE_CHAR));

  return {
    progressPercent: acc.percent,
    progressStage: acc.stage,
    currentStageId: acc.stage,
    statusMessage: acc.msg,
    scrapedItems: acc.items,
    currentCategory: acc.category,
    recentLogEntries
  };
}

function computeStageItemStatus(stg, idx, isTaskRunning, isCompleted, currentStageId, progressPercent) {
  const isStageIdKnown = isTaskRunning && SCRAPER_STAGES.some(s => s.id === currentStageId);
  if (isStageIdKnown) {
    const isCurrent = isTaskRunning && stg.id === currentStageId;
    const stgIdx = SCRAPER_STAGES.findIndex(s => s.id === currentStageId);
    const isDone = isCompleted || (stgIdx > idx);
    return { isCurrent, isDone };
  }
  const isCurrent = isTaskRunning && progressPercent !== null && progressPercent >= stg.minPercent && progressPercent <= stg.maxPercent;
  const isDone = isCompleted || (progressPercent !== null && progressPercent > stg.maxPercent);
  return { isCurrent, isDone };
}

function ScraperStageStepperItem({ stg, idx, isTaskRunning, isCompleted, currentStageId, progressPercent }) {
  const { isCurrent, isDone } = computeStageItemStatus(stg, idx, isTaskRunning, isCompleted, currentStageId, progressPercent);
  const boxClass = isDone
    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800 shadow-sm'
    : isCurrent
      ? 'bg-blue-50/90 border-blue-400 text-blue-900 ring-2 ring-blue-200 shadow-sm'
      : 'bg-slate-50/60 border-slate-200/60 text-slate-400 hover:bg-slate-100 hover:border-slate-300';

  return (
    <div className="flex-1 flex items-center relative group">
      <div className={`w-full p-2 rounded-xl border text-[11px] transition-all relative z-10 ${boxClass}`}>
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
      {idx < SCRAPER_STAGES.length - 1 && (
        <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 text-slate-300 group-hover:text-slate-400 transition-colors bg-white rounded-full p-0.5 shadow-xs border border-slate-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      )}
    </div>
  );
}

function ScraperHeaderBanner({
  isTaskRunning,
  isCompleted,
  isFailed,
  statusMessage,
  showDetails,
  onToggleDetails
}) {
  const iconBoxClass = isTaskRunning
    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
    : isCompleted
      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      : isFailed
        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        : 'bg-slate-800 text-slate-300';

  const badgeStatus = isTaskRunning ? 'Running' : isCompleted ? 'Complete' : isFailed ? 'Failed' : 'Pending';
  const fallbackSubtitle = isTaskRunning ? 'Starting catalog scrape…' : 'Run finished.';

  return (
    <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${iconBoxClass}`}>
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
            <TaskStatusBadge status={badgeStatus} size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
            {statusMessage || fallbackSubtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleDetails}
          aria-expanded={showDetails}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title={showDetails ? 'Hide details' : 'Show details'}
        >
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function VendorScraperProgress({
  logStream = [],
  isTaskRunning = false,
  runStatus,
  className = ''
}) {
  const [showDetails, setShowDetails] = useState(true);
  const {
    progressPercent,
    progressStage,
    currentStageId,
    statusMessage,
    scrapedItems,
    recentLogEntries
  } = useMemo(() => deriveScraperProgressState(logStream, isTaskRunning), [logStream, isTaskRunning]);
  const isCompleted = runStatus === 'COMPLETED';
  const isFailed = runStatus === 'FAILED';

  if (!runStatus && !isTaskRunning && logStream.length === 0) {
    return (
      <div className={`bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-slate-500 text-xs flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <span>Scraper status: <strong className="text-slate-700">Idle & Ready</strong></span>
        </div>
        <span className="text-[11px] bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-md font-mono">Port 9222 CDP</span>
      </div>
    );
  }

  const indeterminate = isTaskRunning && progressPercent === null;
  const effectivePercent = isCompleted ? 100 : progressPercent;
  const barColorClass = isCompleted
    ? 'bg-emerald-500'
    : isFailed
      ? 'bg-rose-500'
      : isTaskRunning
        ? 'bg-blue-600'
        : 'bg-slate-400';
  const percentDisplay = effectivePercent !== null ? `${effectivePercent}%` : (isTaskRunning ? 'Working…' : '');

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all ${className}`}>
      <ScraperHeaderBanner
        isTaskRunning={isTaskRunning}
        isCompleted={isCompleted}
        isFailed={isFailed}
        statusMessage={statusMessage}
        showDetails={showDetails}
        onToggleDetails={() => setShowDetails(!showDetails)}
      />

      <div className="p-5 space-y-4">
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
              {percentDisplay}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/80 p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full ${indeterminate ? 'run-activity-indeterminate' : 'progress-bar-fill'} ${barColorClass}`}
              style={indeterminate ? undefined : { width: `${effectivePercent ?? 0}%` }}
            />
          </div>
        </div>

        {showDetails && (
          <div className="pt-2 space-y-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:flex-wrap md:flex-nowrap gap-2 items-stretch">
              {SCRAPER_STAGES.map((stg, idx) => (
                <ScraperStageStepperItem
                  key={stg.id}
                  stg={stg}
                  idx={idx}
                  isTaskRunning={isTaskRunning}
                  isCompleted={isCompleted}
                  currentStageId={currentStageId}
                  progressPercent={progressPercent}
                />
              ))}
            </div>

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
