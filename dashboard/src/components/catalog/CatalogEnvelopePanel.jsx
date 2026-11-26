import React, { useState, useEffect } from 'react';
import { Cpu, Loader, AlertTriangle } from 'lucide-react';
import { requestJson } from '../../services/api.js';
import HardwareEnvelopeView from '../presales/HardwareEnvelopeView.jsx';

export default function CatalogEnvelopePanel({ platformId }) {
  const [envelope, setEnvelope] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!platformId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    requestJson(`/api/platform-envelope?platform=${encodeURIComponent(platformId)}`, { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) setEnvelope(data?.envelope || null);
      })
      .catch(err => {
        if (!controller.signal.aborted && err?.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [platformId]);

  if (!platformId) {
    return (
      <div className="surface-panel rounded-xl p-6 text-center text-xs text-slate-500">
        Select a platform to inspect deterministic hardware capability bounds.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="surface-panel rounded-xl p-6 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader className="w-4 h-4 animate-spin text-blue-600" />
        <span>Computing deterministic envelope bounds for {platformId}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Capability envelope unavailable: {error}</span>
      </div>
    );
  }

  if (!envelope) {
    return (
      <div className="surface-panel rounded-xl p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
        <Cpu className="w-6 h-6 text-slate-400" />
        <span>No hardware envelope computed for {platformId}.</span>
      </div>
    );
  }

  return <HardwareEnvelopeView envelope={envelope} />;
}
