/**
 * dashboard/src/hooks/useSSEStream.js
 *
 * Owns the full SSE connection lifecycle and dispatches structured events
 * to callers via callbacks. Extracted from App.jsx (GAP-L1a).
 *
 * Usage:
 *   useSSEStream({
 *     onTaskStarted, onTaskCompleted, onProgress, onLog, onEvalResult
 *   });
 */
import { useEffect, useRef } from 'react';
import { normalizeEvalResult } from '../services/evalNormalizer.js';

/**
 * @param {object} handlers
 * @param {Function} [handlers.onTaskStarted]   (payload) => void
 * @param {Function} [handlers.onTaskCompleted] (payload) => void
 * @param {Function} [handlers.onProgress]      (payload) => void
 * @param {Function} [handlers.onLog]           (payload) => void
 * @param {Function} [handlers.onEvalResult]    (normalizedResult, rawPayload) => void
 */
export function useSSEStream({
  onTaskStarted,
  onTaskCompleted,
  onProgress,
  onLog,
  onEvalResult
} = {}) {
  const handlers = useRef({});
  handlers.current = { onTaskStarted, onTaskCompleted, onProgress, onLog, onEvalResult };
  useEffect(() => {
    const eventSource = new EventSource('/api/stream-logs');

    eventSource.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (payload.type) {
        case 'RUN_SNAPSHOT': {
          if (payload.activeTask) handlers.current.onTaskStarted?.({ ...payload.activeTask, recovered: true });
          else handlers.current.onTaskCompleted?.({ task: 'RECOVERY', recovered: true });
          for (const log of payload.logs || []) handlers.current.onLog?.(log);
          if (payload.progress && payload.activeTask) handlers.current.onProgress?.(payload.progress);
          const result = payload.latestResult;
          if (payload.latestQueryResult) window.dispatchEvent(new CustomEvent('dashboard-routed-result', { detail: payload.latestQueryResult }));
          if (result && (!payload.activeTask || result.runId === payload.activeTask.runId)) {
            handlers.current.onEvalResult?.(normalizeEvalResult(result), { ...result, recovered: true });
          }
          break;
        }
        case 'TASK_STARTED':
          handlers.current.onTaskStarted?.(payload);
          break;

        case 'ROUTED_RESULT':
          window.dispatchEvent(new CustomEvent('dashboard-routed-result', { detail: payload }));
          break;

        case 'TASK_COMPLETED':
          handlers.current.onTaskCompleted?.(payload);
          window.dispatchEvent(new CustomEvent('dashboard-task-completed', { detail: payload }));
          break;

        case 'PROGRESS':
          handlers.current.onProgress?.(payload);
          break;

        case 'LOG':
          handlers.current.onLog?.(payload);
          break;

        case 'EVAL_RESULT':
        case 'EVAL_RESULT_UPDATED': {
          // Normalise the raw payload before surfacing it to the app —
          // all domain flattening lives in the service layer now.
          const normalised = normalizeEvalResult(payload);
          handlers.current.onEvalResult?.(normalised, payload);
          break;
        }

        default:
          break;
      }
    };

    eventSource.onerror = (err) => {
      console.error('[useSSEStream] EventSource error:', err);
    };

    return () => eventSource.close();
    // The connection stays stable while dispatching to current render handlers.
  }, []);
}
