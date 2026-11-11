/**
 * dashboard/src/hooks/useRagPoller.js
 *
 * Manages the polling lifecycle for async NotebookLM RAG jobs.
 * Extracted from App.jsx (GAP-L1b + SMELL-S4).
 *
 * The manual pollIntervalsRef Set in App.jsx is replaced by a single
 * useEffect cleanup function — no leaked intervals possible.
 *
 * Usage:
 *   const pollRag = useRagPoller({ onResult, onTimeout, onFail });
 *   pollRag(jobId);  // start polling for a specific job
 */
import { useRef, useCallback, useEffect } from 'react';
import { requestJson, postJson } from '../services/api.js';

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 15 * 60 * 1000;

/** Each poll owns its job, requests and context. Late responses cannot finish another job. */
export function useRagPoller({ onResult, onTimeout, onFail } = {}) {
  const active = useRef(null);
  const callbacks = useRef({});
  callbacks.current = { onResult, onTimeout, onFail };
  const detach = useCallback(() => {
    const job = active.current;
    active.current = null;
    if (job) { clearTimeout(job.timer); job.controller?.abort(); }
    return job;
  }, []);
  const cancelPoll = useCallback(async (reason = 'CANCELLED_BY_CLIENT') => {
    const job = detach();
    if (!job) return;
    try { await postJson('/api/notebook-query-cancel/' + encodeURIComponent(job.id), { reason }); }
    catch (err) { console.warn('[useRagPoller] cancellation:', err.message); }
  }, [detach]);
  useEffect(() => () => { detach(); }, [detach]);

  const startPoll = useCallback((jobId, context = null) => {
    detach();
    const job = { id: jobId, context, started: Date.now(), failures: 0, timer: null, controller: null };
    active.current = job;
    const ownsJob = () => active.current === job;
    const poll = async () => {
      if (!ownsJob()) return;
      if (Date.now() - job.started >= TIMEOUT_MS) {
        detach(); callbacks.current.onTimeout?.(context); return;
      }
      job.controller = new AbortController();
      const timeout = setTimeout(() => job.controller.abort(), 30000);
      try {
        const data = await requestJson('/api/notebook-query-status/' + encodeURIComponent(job.id), { signal: job.controller.signal });
        if (!ownsJob()) return;
        job.failures = 0;
        if (['COMPLETED', 'CLOUD_VERIFIED', 'LOCAL_FALLBACK'].includes(data.status)) {
          detach();
          callbacks.current.onResult?.(data.result?.answer || data.answer, data.result || data, context);
          return;
        }
        if (['FAILED', 'CANCELLED'].includes(data.status)) {
          detach(); callbacks.current.onFail?.(data.error || 'RAG job failed or cancelled', context); return;
        }
      } catch (err) {
        if (!ownsJob()) return;
        if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
        job.failures++;
        if (job.failures >= 3) { detach(); callbacks.current.onFail?.(err.message, context); return; }
      } finally { clearTimeout(timeout); }
      if (ownsJob()) job.timer = setTimeout(poll, POLL_INTERVAL_MS);
    };
    job.timer = setTimeout(poll, POLL_INTERVAL_MS);
  }, [detach]);
  return { startPoll, cancelPoll };
}
