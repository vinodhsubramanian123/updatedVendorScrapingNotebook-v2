import React from 'react';
import { BarChart2, ShieldCheck, Sparkles, AlertTriangle, Clock, Server } from 'lucide-react';

function KpiCardTile({ label, value, title, icon: Icon, iconBoxClass, hoverBorder, staggerClass, onClick }) {
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      title={title}
      className={`bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer ${hoverBorder} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full shadow-sm animate-fade-in-up ${staggerClass}`}
    >
      <div className={`w-10 h-10 rounded-lg ${iconBoxClass} flex items-center justify-center font-bold shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

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
  const hasAvgConfidence = telemetry.evaluationsCount > 0 && Number.isFinite(Number(telemetry.avgConfidenceScore));
  const avgConfidence = hasAvgConfidence ? `${(Number(telemetry.avgConfidenceScore) * 100).toFixed(0)}%` : '—';
  const failedEvalsCount = history.filter(h => h.criticalViolationsCount > 0).length;
  const durations = history.map(h => h?.durationMs).filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
  const avgDuration = durations.length > 0 ? `${(durations.reduce((a, b) => a + b, 0) / durations.length / 1000).toFixed(1)}s` : '—';

  const cards = [
    { label: 'Total Evaluations', value: telemetry.evaluationsCount > 0 ? telemetry.evaluationsCount : '—', title: 'Click to inspect full BOQ Evaluation history and breakdown', icon: BarChart2, iconBoxClass: 'bg-blue-50 text-blue-700', hoverBorder: 'hover:border-blue-400', staggerClass: 'stagger-1', onClick: onOpenEvaluations },
    { label: 'Avg Confidence', value: avgConfidence, title: 'Click to inspect Confidence Score criteria and HITL review thresholds', icon: ShieldCheck, iconBoxClass: 'bg-emerald-50 text-emerald-700', hoverBorder: 'hover:border-emerald-400', staggerClass: 'stagger-2', onClick: onOpenConfidence },
    { label: 'Learned Rules', value: telemetry.totalDeltasLearned > 0 ? telemetry.totalDeltasLearned : '—', title: 'Click to inspect Knowledge Deltas and learned rule overrides', icon: Sparkles, iconBoxClass: 'bg-purple-50 text-purple-700', hoverBorder: 'hover:border-purple-400', staggerClass: 'stagger-3', onClick: onOpenDeltas },
    { label: 'Failed Evals', value: failedEvalsCount > 0 ? failedEvalsCount : '—', title: 'Click to view all critical violations and physical errors caught', icon: AlertTriangle, iconBoxClass: 'bg-rose-50 text-rose-700', hoverBorder: 'hover:border-rose-400', staggerClass: 'stagger-4', onClick: onOpenViolations },
    { label: 'Avg Duration', value: avgDuration, title: 'Click to inspect execution runtime breakdown across pipeline stages', icon: Clock, iconBoxClass: 'bg-indigo-50 text-indigo-700', hoverBorder: 'hover:border-indigo-400', staggerClass: 'stagger-5', onClick: onOpenDuration },
    { label: 'Workflow Exports', value: telemetry.totalExports ?? '—', title: 'Click to view all exported BOQ workbooks and generated artifacts', icon: Server, iconBoxClass: 'bg-emerald-50 text-emerald-700', hoverBorder: 'hover:border-emerald-400', staggerClass: 'stagger-6', onClick: onOpenExports }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => <KpiCardTile key={card.label} {...card} />)}
    </div>
  );
}
