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
import { useEffect } from 'react';
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
        case 'TASK_STARTED':
          onTaskStarted?.(payload);
          break;

        case 'TASK_COMPLETED':
          onTaskCompleted?.(payload);
          break;

        case 'PROGRESS':
          onProgress?.(payload);
          break;

        case 'LOG':
          onLog?.(payload);
          break;

        case 'EVAL_RESULT': {
          // Normalise the raw payload before surfacing it to the app —
          // all domain flattening lives in the service layer now.
          const normalised = normalizeEvalResult(payload);
          onEvalResult?.(normalised, payload);
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
    // Handlers are captured at mount. If callers need reactive updates they
    // should stabilise references with useCallback before passing them in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
