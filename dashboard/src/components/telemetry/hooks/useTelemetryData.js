import { useState, useEffect, useCallback, useRef } from 'react';
import { requestJson } from '../../../services/api.js';

/** Fetch the latest telemetry and discard requests superseded by navigation or refresh. */
export function useTelemetryData(initialTelemetry, propTelemetry) {
  const [telemetry, setTelemetry] = useState(propTelemetry || initialTelemetry || null);
  const [nlmMetrics, setNlmMetrics] = useState({ totalQueries: 0, citationMatches: 0 });
  const [nlmHealth, setNlmHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const activeRequest = useRef(null);

  const fetchTelemetry = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const { signal } = controller;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await requestJson('/api/telemetry', { signal });
      if (signal.aborted) return;
      setTelemetry(data);

      const [consultations, health] = await Promise.allSettled([
        requestJson('/api/notebooklm-consultations', { signal }),
        requestJson('/api/test-notebooklm', { signal })
      ]);
      if (signal.aborted) return;
      if (consultations.status === 'fulfilled') setNlmMetrics(consultations.value);
      if (health.status === 'fulfilled') setNlmHealth(health.value);
    } catch (err) {
      if (!signal.aborted) setFetchError(err.message || 'Error connecting to telemetry bridge');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (propTelemetry) {
      setTelemetry(propTelemetry);
      setLoading(false);
      setFetchError(null);
    } else {
      void fetchTelemetry();
    }
    return () => activeRequest.current?.abort();
  }, [propTelemetry, fetchTelemetry]);

  return { telemetry, nlmMetrics, nlmHealth, loading, fetchError, fetchTelemetry };
}
