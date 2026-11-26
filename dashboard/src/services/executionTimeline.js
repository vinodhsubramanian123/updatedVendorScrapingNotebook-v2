const tracked = new Set(['PRESALES_QUERY', 'EVAL_BOQ']);
const eventTypes = new Set(['PROGRESS', 'LOG', 'TOOL_CALL', 'TOOL_RESULT', 'ESCALATION', 'TASK_COMPLETED']);
const listeners = new Set();
let current = null;

function ownsRun(task, runId) {
  try {
    const key = task === 'EVAL_BOQ' ? 'boq.ownedRunId' : 'presales.ownedRunId';
    return Boolean(runId && window.sessionStorage.getItem(key) === runId);
  } catch { return false; }
}

function fromTask(task, status = 'RUNNING') {
  return {
    runId: task.runId, task: task.task, start: task.startTime || Date.now(), status,
    tier: task.tier || null, scope: task.product || '', intent: task.intent || '',
    percent: null, events: [], durationMs: task.durationMs
  };
}

function entry(event) {
  return {
    type: event.type, time: event.timestamp || Date.now(),
    label: String(event.text || event.message || event.label || event.stage || event.tool || event.action || event.type),
    detail: event.summary || event.reason || event.outputSummary || event.inputSummary || null,
    durationMs: event.durationMs
  };
}

function finishStatus(event) {
  if (event.cancelled) return 'CANCELLED';
  return event.code === 0 ? 'COMPLETED' : 'FAILED';
}

function restoreSnapshot(previous, event, isOwner) {
  const task = event.activeTask || event.latestTask;
  if (!task || !tracked.has(task.task) || !isOwner(task.task, task.runId)) return previous;
  let restored = previous?.runId === task.runId ? previous : fromTask(task, task.status);
  const progress = event.progress?.runId === task.runId ? event.progress : null;
  if (!restored.events.length) {
    const events = [...(event.logs || []), progress].filter(item => item?.runId === task.runId);
    restored = { ...restored, events: events.slice(-200).map(entry), percent: progress?.percent ?? null };
  }
  return { ...restored, tier: progress?.tier || restored.tier, status: event.activeTask ? 'RUNNING' : task.status, durationMs: task.durationMs };
}

export function reduceTimeline(previous, event, isOwner = ownsRun) {
  if (event.historical) return previous;
  if (event.type === 'RUN_SNAPSHOT') return restoreSnapshot(previous, event, isOwner);
  if (event.type === 'TASK_STARTED') {
    if (!tracked.has(event.task) || !isOwner(event.task, event.runId)) return previous;
    return fromTask(event);
  }
  if (!previous || previous.runId !== event.runId || !eventTypes.has(event.type)) return previous;
  return {
    ...previous,
    events: [...previous.events.slice(-199), entry(event)],
    scope: event.product || previous.scope, intent: event.intent || previous.intent,
    tier: event.tier || previous.tier,
    percent: Number.isFinite(event.percent) ? Math.min(100, Math.max(0, event.percent)) : previous.percent,
    status: event.type === 'TASK_COMPLETED' ? finishStatus(event) : previous.status,
    durationMs: event.type === 'TASK_COMPLETED' ? event.durationMs : previous.durationMs
  };
}

export function receiveTimelineEvent(event) {
  const next = reduceTimeline(current, event);
  if (next === current) return;
  current = next;
  listeners.forEach(notify => notify());
}

export const getTimeline = () => current;
export function subscribeTimeline(notify) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}
