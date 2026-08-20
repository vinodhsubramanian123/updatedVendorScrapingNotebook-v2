import React from 'react';
import { BarChart2, ShieldCheck, Sparkles, AlertTriangle, Clock, Server } from 'lucide-react';

export default function KpiMetricsGrid({
  telemetry = {},
  history = [],
  onOpenEvaluations,
  onOpenConfidence,
  onOpenDeltas,
  onOpenViolations,
  onOpenDuration,
  onOpenExports
}) {
  const avgConfidence = telemetry.evaluationsCount > 0
    ? (telemetry.avgConfidenceScore * 100).toFixed(0) + '%'
    : '—';

  const failedEvalsCount = history.filter(h => h.criticalViolationsCount > 0).length;

  const avgDuration = history.length > 0
    ? (history.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) / history.length / 1000).toFixed(1) + 's'
    : '—';

  const totalExports = telemetry.totalExports > 0
    ? telemetry.totalExports
    : (history.length > 0 ? Math.max(1, history.length) : '—');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      <div
        className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full shadow-sm animate-fade-in-up stagger-1"
        onClick={onOpenEvaluations}
        title="Click to inspect full BOQ Evaluation history and breakdown"
      >
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
          <BarChart2 className="w-5 h-5" />
        </div>
        <div className="truncate">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate">Total Evaluations</p>
          <p className="text-xl font-bold text-slate-900">{telemetry.evaluationsCount > 0 ? telemetry.evaluationsCount : '—'}</p>
        </div>
      </div>

      <div
        className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full shadow-sm animate-fade-in-up stagger-2"
        onClick={onOpenConfidence}
        title="Click to inspect Confidence Score criteria and HITL review thresholds"
      >
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="truncate">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate">Avg Confidence</p>
          <p className="text-xl font-bold text-slate-900 flex items-baseline gap-1">{avgConfidence}</p>
        </div>
      </div>

      <div
        className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-purple-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full shadow-sm animate-fade-in-up stagger-3"
        onClick={onOpenDeltas}
        title="Click to inspect Knowledge Deltas and learned rule overrides"
      >
        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="truncate">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate">Learned Rules</p>
          <p className="text-xl font-bold text-slate-900">{telemetry.totalDeltasLearned > 0 ? telemetry.totalDeltasLearned : '—'}</p>
        </div>
      </div>

      <div
        className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-rose-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full shadow-sm animate-fade-in-up stagger-4"
        onClick={onOpenViolations}
        title="Click to view all critical violations and physical errors caught"
      >
        <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="truncate">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate">Failed Evals</p>
          <p className="text-xl font-bold text-slate-900">{failedEvalsCount > 0 ? failedEvalsCount : '—'}</p>
        </div>
      </div>

      <div
        className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full shadow-sm animate-fade-in-up stagger-5"
        onClick={onOpenDuration}
        title="Click to inspect execution runtime breakdown across pipeline stages"
      >
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="truncate">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate">Avg Duration</p>
          <p className="text-xl font-bold text-slate-900">{avgDuration}</p>
        </div>
      </div>

      <div
        className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full shadow-sm animate-fade-in-up stagger-6"
        onClick={onOpenExports}
        title="Click to view all exported BOQ workbooks and generated artifacts"
      >
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
          <Server className="w-5 h-5" />
        </div>
        <div className="truncate">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate">Workflow Exports</p>
          <p className="text-xl font-bold text-slate-900">{totalExports}</p>
        </div>
      </div>
    </div>
  );
}
