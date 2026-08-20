import { useState, useEffect, useCallback } from 'react';

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
      const res = await fetch('/api/telemetry');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch telemetry`);
      const data = await res.json();
      setTelemetry(data);

      const nlmRes = await fetch('/api/notebooklm-consultations');
      if (nlmRes.ok) {
        const nlmData = await nlmRes.json();
        setNlmMetrics(nlmData);
      }

      const healthRes = await fetch('/api/test-notebooklm');
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setNlmHealth(healthData);
      }
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
