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

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 450; // 2s * 450 = 900s max (15 minutes)

/**
 * @param {object} options
 * @param {Function} options.onResult    (answer: string, fullData: object) => void
 * @param {Function} [options.onTimeout] () => void
 * @param {Function} [options.onFail]    (errorMsg: string) => void
 */
export function useRagPoller({ onResult, onTimeout, onFail } = {}) {
  const activeTimerRef = useRef(null);
  const activeJobIdRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (activeTimerRef.current !== null) {
      clearInterval(activeTimerRef.current);
      activeTimerRef.current = null;
    }
  }, []);

  /** Cancel both the browser poll and its durable server-side cloud job. */
  const cancelPoll = useCallback(async (reason = 'CANCELLED_BY_CLIENT') => {
    stopTimer();
    const jobId = activeJobIdRef.current;
    activeJobIdRef.current = null;
    if (!jobId) return;
    try {
      await fetch(`/api/notebook-query-cancel/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
    } catch (err) {
      console.error('[useRagPoller] cancellation error:', err);
    }
  }, [stopTimer]);

  useEffect(() => () => {
    void cancelPoll('CLIENT_UNMOUNTED');
  }, [cancelPoll]);

  /**
   * Start polling for a job. Automatically cancels any previous poll.
   * @param {string} jobId  The async notebook query job ID to poll.
   */
  const startPoll = useCallback((jobId) => {
    if (activeJobIdRef.current && activeJobIdRef.current !== jobId) {
      void cancelPoll('REPLACED_BY_NEW_JOB');
    } else {
      stopTimer();
    }
    activeJobIdRef.current = jobId;

    let polls = 0;

    activeTimerRef.current = setInterval(async () => {
      polls++;

      if (polls > MAX_POLLS) {
        void cancelPoll('CLIENT_POLL_TIMEOUT');
        onTimeout?.();
        return;
      }

      try {
        const res = await fetch(`/api/notebook-query-status/${jobId}`);
        const data = await res.json();

        if (data.status === 'COMPLETED' || data.status === 'CLOUD_VERIFIED' || data.status === 'LOCAL_FALLBACK') {
          stopTimer();
          activeJobIdRef.current = null;
          const answer = data.result?.answer || data.answer;
          onResult?.(answer, data.result || data);
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          stopTimer();
          activeJobIdRef.current = null;
          onFail?.(data.error || 'RAG query failed or was cancelled');
        }
        // Still PROCESSING or CLOUD_PENDING — keep polling
      } catch (err) {
        console.error('[useRagPoller] poll error:', err);
      }
    }, POLL_INTERVAL_MS);
  }, [cancelPoll, stopTimer, onResult, onTimeout, onFail]);

  return { startPoll, cancelPoll };
}
