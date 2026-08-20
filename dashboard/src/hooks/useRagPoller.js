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
import { useRef, useCallback } from 'react';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60; // 2s * 60 = 120s max

/**
 * @param {object} options
 * @param {Function} options.onResult    (answer: string, fullData: object) => void
 * @param {Function} [options.onTimeout] () => void
 * @param {Function} [options.onFail]    (errorMsg: string) => void
 */
export function useRagPoller({ onResult, onTimeout, onFail } = {}) {
  const activeTimerRef = useRef(null);

  /** Cancel any in-flight poll — safe to call multiple times. */
  const cancelPoll = useCallback(() => {
    if (activeTimerRef.current !== null) {
      clearInterval(activeTimerRef.current);
      activeTimerRef.current = null;
    }
  }, []);

  /**
   * Start polling for a job. Automatically cancels any previous poll.
   * @param {string} jobId  The async notebook query job ID to poll.
   */
  const startPoll = useCallback((jobId) => {
    cancelPoll(); // cancel any previous poll first

    let polls = 0;

    activeTimerRef.current = setInterval(async () => {
      polls++;

      if (polls > MAX_POLLS) {
        cancelPoll();
        onTimeout?.();
        return;
      }

      try {
        const res = await fetch(`/api/notebook-query-status/${jobId}`);
        const data = await res.json();

        if (data.status === 'COMPLETED') {
          cancelPoll();
          const answer = data.result?.answer || data.answer;
          onResult?.(answer, data.result || data);
        } else if (data.status === 'FAILED') {
          cancelPoll();
          onFail?.(data.error || 'RAG query failed');
        }
        // Still PENDING — keep polling
      } catch (err) {
        console.error('[useRagPoller] poll error:', err);
      }
    }, POLL_INTERVAL_MS);
  }, [cancelPoll, onResult, onTimeout, onFail]);

  return { startPoll, cancelPoll };
}
