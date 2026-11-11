import { useEffect, useState } from 'react';
import { Activity, AlertCircle, ArrowRight, Check, CirclePause, WifiOff } from 'lucide-react';

const taskNames = {
  EVAL_BOQ: 'BOQ evaluation',
  PRESALES_QUERY: 'Presales workflow',
  KNOWLEDGE_SYNC: 'Knowledge sync',
  REBUILD_ALL: 'Catalog rebuild',
  DOWNLOAD_PDF: 'QuickSpecs download',
  NAVIGATE_OCA: 'Open HPE configurator',
  VERIFY_ALL: 'Portfolio verification'
};

const statusStyles = {
  running: { icon: Activity, color: 'text-emerald-800 bg-emerald-50' },
  reconnecting: { icon: WifiOff, color: 'text-amber-900 bg-amber-50' },
  complete: { icon: Check, color: 'text-emerald-800 bg-emerald-50' },
  attention: { icon: CirclePause, color: 'text-amber-900 bg-amber-50' },
  failed: { icon: AlertCircle, color: 'text-rose-800 bg-rose-50' }
};

function describeRun(run, progress, evaluation, reconnecting) {
  if (reconnecting) return { tone: 'reconnecting', message: 'Reconnecting to live updates' };
  if (run.status === 'RUNNING') return { tone: 'running', message: progress?.action || 'Starting…', action: 'View logs', view: 'pipeline' };
  if (run.status === 'INTERRUPTED') return { tone: 'attention', message: 'Interrupted by backend restart', action: 'View logs', view: 'pipeline' };
  if (run.status === 'CANCELLED' || evaluation?.status === 'CANCELLED') return { tone: 'attention', message: 'Cancelled', action: 'View logs', view: 'pipeline' };
  if (evaluation?.clarificationRequired || run.status === 'ACTION_REQUIRED') {
    return evaluation?.clarificationRequired
      ? { tone: 'attention', message: 'Platform confirmation needed', action: 'Review intake', view: 'orchestrator' }
      : { tone: 'attention', message: 'Review required', action: 'Review results', view: 'matrix' };
  }
  if (run.status === 'FAILED' || evaluation?.status === 'ERROR') {
    return { tone: 'failed', message: 'Run failed', action: 'View logs', view: 'pipeline' };
  }
  if (evaluation) {
    const attention = evaluation.status === 'ACTION_REQUIRED' || evaluation.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE';
    return { tone: attention ? 'attention' : 'complete', message: attention ? 'Review required' : 'Results ready', action: 'Review results', view: 'matrix' };
  }
  if (run.task === 'PRESALES_QUERY') return { tone: 'complete', message: 'Run finished', action: 'Open presales', view: 'orchestrator' };
  if (run.task === 'EVAL_BOQ') return { tone: 'complete', message: 'Run finished', action: 'View logs', view: 'pipeline' };
  return { tone: 'complete', message: 'Run finished', action: 'View run history', view: 'pipeline' };
}

function useElapsed(run, running) {
  const [now, setNow] = useState(Date.now);
  const startedAt = run?.startTime;
  useEffect(() => {
    if (!running || !Number.isFinite(startedAt)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running, startedAt]);

  const duration = running && Number.isFinite(startedAt) ? now - startedAt : run?.durationMs;
  if (!Number.isFinite(duration)) return null;
  const seconds = Math.max(0, Math.floor(duration / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function StageTrack({ task, progress, reconnecting }) {
  const { currentStep, totalSteps } = progress || {};
  const known = Number.isInteger(currentStep) && Number.isInteger(totalSteps) &&
    currentStep > 0 && currentStep <= totalSteps;
  const label = known ? `Stage ${currentStep} of ${totalSteps}` : undefined;
  return (
    <div className="flex items-center gap-3 text-xs text-slate-600">
      <div
        role="progressbar"
        aria-label={`${task} progress`}
        aria-valuemin={known ? 0 : undefined}
        aria-valuemax={known ? totalSteps : undefined}
        aria-valuenow={known ? currentStep : undefined}
        aria-valuetext={label}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full bg-emerald-600 ${known ? 'progress-bar-fill' : 'run-activity-indeterminate'}`}
          style={known ? { width: `${100 * currentStep / totalSteps}%` } : undefined}
          data-paused={reconnecting}
        />
      </div>
      {label && <span className="shrink-0 tabular-nums">{label}</span>}
    </div>
  );
}

export default function RunActivity({ run, progress, evaluation, reconnecting, onNavigate, onCancelTask }) {
  const running = run?.status === 'RUNNING';
  const elapsed = useElapsed(run, running);
  if (!run && !reconnecting) return <div role="status" className="sr-only" />;

  const currentEvaluation = run?.runId && run.runId === evaluation?.runId ? evaluation : null;
  const { tone, message, action, view } = describeRun(run || {}, progress, currentEvaluation, reconnecting);
  const { icon: Icon, color } = statusStyles[tone];
  const task = taskNames[run?.task] || (run?.task?.startsWith('SCRAPE') ? 'Catalog scrape' : 'Workflow');
  const product = typeof run?.product === 'string' ? run.product.replaceAll('_', ' ') : null;
  return (
    <section aria-label="Run activity" className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm sm:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`rounded-lg p-2 ${color}`}><Icon aria-hidden="true" className="size-4" /></span>
        <div className="min-w-0 flex-1" role="status" aria-atomic="true">
          {run && <p className="text-xs font-semibold text-slate-600">{task}{product && ` · ${product}`}</p>}
          <p className="text-sm font-semibold text-slate-900">{message}</p>
        </div>
        {elapsed && <span className="text-xs tabular-nums text-slate-600" aria-label={`Elapsed time ${elapsed}`}>{elapsed}</span>}
        {running && onCancelTask && run?.runId && (
          <button
            type="button"
            onClick={() => onCancelTask(run.runId)}
            className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-2.5 py-1.5"
          >
            Cancel run
          </button>
        )}
        {action && (
          <button type="button" onClick={() => onNavigate(view)} className="btn-secondary inline-flex items-center gap-1.5 text-xs">
            {action}<ArrowRight aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
      {running && <div className="mt-2.5"><StageTrack task={task} progress={progress} reconnecting={reconnecting} /></div>}
    </section>
  );
}
