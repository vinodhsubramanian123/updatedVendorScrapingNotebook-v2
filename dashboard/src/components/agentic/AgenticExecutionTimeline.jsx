import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getTimeline, subscribeTimeline } from '../../services/executionTimeline.js';
import { Loader, CheckCircle2, XCircle, AlertTriangle, Copy, Check, StopCircle, Terminal } from 'lucide-react';

const TIER_NAMES = {
  DETERMINISTIC: 'Deterministic Router',
  GEMINI_AGENT: 'Gemini Copilot',
  AGY_DEEP: 'Antigravity Deep'
};

function matchesFilter(event, filter) {
  if (filter === 'steps') return event.type !== 'LOG';
  if (filter === 'warnings') return /warn|error|fail|block|unavailable|escalat/i.test(`${event.type} ${event.label}`);
  return true;
}

function TimelineLog({ events }) {
  const [filter, setFilter] = useState('all');
  const [copyStatus, setCopyStatus] = useState('');
  const bottom = useRef(null);
  const visible = events.filter(event => matchesFilter(event, filter));

  useEffect(() => {
    const box = bottom.current;
    if (box && box.dataset.follow !== 'false') box.scrollTop = box.scrollHeight;
  }, [events, filter]);

  async function copyLogs() {
    try {
      await navigator.clipboard.writeText(visible.map(event => `${event.type} · ${event.label}`).join('\n'));
      setCopyStatus('Copied');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Clipboard unavailable');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <select
            aria-label="Filter execution logs"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium bg-white text-slate-700"
          >
            <option value="all">All events ({events.length})</option>
            <option value="steps">Phases &amp; tools</option>
            <option value="warnings">Warnings &amp; errors</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={copyLogs} className="btn-secondary text-[11px] py-1 px-2.5">
            {copyStatus === 'Copied' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copyStatus || 'Copy logs'}</span>
          </button>
        </div>
      </div>

      <ol
        ref={bottom}
        aria-label="Execution events"
        onScroll={e => {
          const el = e.currentTarget;
          el.dataset.follow = String(el.scrollHeight - el.scrollTop - el.clientHeight < 20);
        }}
        className="terminal-console max-h-56 overflow-auto space-y-1 p-2.5 rounded-lg text-[11px]"
      >
        {visible.map((event, i) => (
          <li key={i} className="border-l-2 border-emerald-500 pl-2 break-words">
            {event.detail ? (
              <details>
                <summary className="cursor-pointer">{event.label}</summary>
                <pre className="whitespace-pre-wrap mt-1 opacity-90">
                  {typeof event.detail === 'string' ? event.detail : JSON.stringify(event.detail, null, 2)}
                </pre>
              </details>
            ) : event.label}
            {Number.isFinite(event.durationMs) && (
              <small className="opacity-70"> · {(event.durationMs / 1000).toFixed(1)} s</small>
            )}
          </li>
        ))}
        {!visible.length && <li className="opacity-70">No matching events.</li>}
      </ol>
    </div>
  );
}

export default function AgenticExecutionTimeline({ onCancel }) {
  const run = useSyncExternalStore(subscribeTimeline, getTimeline);
  const [now, setNow] = useState(Date.now);
  const active = run?.status === 'RUNNING';

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, run?.runId]);

  if (!run) return null;
  const seconds = Math.max(0, Math.round((run.durationMs ?? (now - run.start)) / 1000));
  const percent = Number.isFinite(run.percent) ? Math.max(0, Math.min(100, run.percent)) : null;
  const StatusIcon = active ? Loader : (run.status === 'FAILED' ? XCircle : CheckCircle2);

  return (
    <section className="surface-panel rounded-xl p-4 mb-4 text-xs space-y-2.5" aria-label="Execution timeline">
      <details key={run.runId + active} open={active}>
        <summary className="cursor-pointer font-semibold flex items-center justify-between gap-2 select-none">
          <span className="flex items-center gap-2 text-slate-800">
            <StatusIcon className={`w-4 h-4 ${active ? 'animate-spin text-blue-600' : (run.status === 'FAILED' ? 'text-rose-600' : 'text-emerald-600')}`} />
            <span>{run.task === 'EVAL_BOQ' ? 'BOQ evaluation' : 'Presales query'} · {run.status}</span>
            {run.tier && <span className="badge badge-indigo">{TIER_NAMES[run.tier] || run.tier}</span>}
          </span>
          <span className="font-mono text-[11px] text-slate-500 tabular-nums">{percent === null ? '' : percent + '% · '}{seconds} s</span>
        </summary>

        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-slate-600">
              {run.intent && <span className="badge badge-slate">{run.intent.replaceAll('_', ' ')}</span>}
              {run.scope && <span className="font-mono text-[11px]">{run.scope}</span>}
              {run.events.some(e => e.type === 'ESCALATION') && (
                <span className="badge badge-amber inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Escalation requested
                </span>
              )}
            </div>
            {active && (
              <button type="button" className="btn-secondary text-[11px] text-rose-700" onClick={() => onCancel?.(run.runId)}>
                <StopCircle className="w-3.5 h-3.5" /> Cancel run
              </button>
            )}
          </div>

          {active && (
            <progress aria-label="Execution progress" className="w-full h-1.5 rounded-full accent-emerald-600" max="100" value={run.percent ?? undefined} />
          )}
          <TimelineLog events={run.events} />
        </div>
      </details>
    </section>
  );
}
