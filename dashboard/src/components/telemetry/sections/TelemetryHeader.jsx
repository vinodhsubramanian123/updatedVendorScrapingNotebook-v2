import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export default function TelemetryHeader({ onRefresh, loading }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          System Telemetry & Pipeline Observability
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time telemetry captured across BOQ evaluations, knowledge deltas, confidence scores, and runtime durations.
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="btn-secondary text-xs"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
        Refresh Telemetry
      </button>
    </div>
  );
}
