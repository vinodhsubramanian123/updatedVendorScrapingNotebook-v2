import { useState, useEffect, useCallback } from 'react';
import { requestJson } from '../../../services/api.js';

/**
 * Custom hook to manage telemetry data fetching, NLM metrics, health status, and refresh lifecycle.
 */
export function useTelemetryData(initialTelemetry, propTelemetry) {
  const [telemetry, setTelemetry] = useState(propTelemetry || initialTelemetry || null);
  const [nlmMetrics, setNlmMetrics] = useState({ totalQueries: 0, citationMatches: 0 });
  const [nlmHealth, setNlmHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchTelemetry = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const options = { timeoutMs: 10000 };
      const data = await requestJson('/api/telemetry', options);
      setTelemetry(data);

      const [consultations, health] = await Promise.allSettled([
        requestJson('/api/notebooklm-consultations', options),
        requestJson('/api/test-notebooklm', options)
      ]);
      if (consultations.status === 'fulfilled') setNlmMetrics(consultations.value);
      if (health.status === 'fulfilled') setNlmHealth(health.value);
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
      setFetchError(err.message || 'Error connecting to telemetry bridge');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (propTelemetry) {
      setTelemetry(propTelemetry);
    } else {
      fetchTelemetry();
    }
  }, [propTelemetry, fetchTelemetry]);

  return {
    telemetry,
    nlmMetrics,
    nlmHealth,
    loading,
    fetchError,
    fetchTelemetry
  };
}
