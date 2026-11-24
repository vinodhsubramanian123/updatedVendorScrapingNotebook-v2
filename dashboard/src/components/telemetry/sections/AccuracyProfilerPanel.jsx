import React from 'react';
import { ShieldCheck, BarChart2, Clock } from 'lucide-react';
import { allocateRoundedPercentages } from '../../../utils/formatters';

function getAccuracyTier(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) {
    return {
      label: 'Unmeasured',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      barClass: 'bg-slate-600',
      iconClass: 'text-slate-400'
    };
  }
  if (score >= 85) {
    return {
      label: 'High Precision',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      barClass: 'bg-emerald-400',
      iconClass: 'text-emerald-400'
    };
  }
  if (score >= 60) {
    return {
      label: 'Moderate',
      badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
      barClass: 'bg-amber-400',
      iconClass: 'text-amber-400'
    };
  }
  return {
    label: 'Needs Calibration',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    barClass: 'bg-rose-400',
    iconClass: 'text-rose-400'
  };
}

export default function AccuracyProfilerPanel({
  telemetry = {},
  onOpenAccuracy,
  onOpenAdversarial,
  onOpenDomain,
  onOpenProfiler
}) {
  const numericAccuracy = telemetry.evalAccuracyScore != null && Number.isFinite(Number(telemetry.evalAccuracyScore))
    ? Number(telemetry.evalAccuracyScore)
    : null;
  const accuracyScore = numericAccuracy !== null ? `${numericAccuracy}%` : '—';
  const accuracyTier = getAccuracyTier(numericAccuracy);
  const rawCatchRate = telemetry.adversarial?.catchRate;
  const numericCatchRate = rawCatchRate != null && Number.isFinite(Number(rawCatchRate)) ? Number(rawCatchRate) : null;
  const adversarialCatch = numericCatchRate !== null ? `${numericCatchRate}%` : '—';

  const domainTotals = {
    THERMAL: 0,
    ELECTRICAL: 0,
    STORAGE_CACHE_BATTERY: 0,
    MEMORY_CHANNEL: 0,
    POWER_REDUNDANCY: 0
  };

  (telemetry.history || []).forEach(h => {
    if (h.domainMap) {
      domainTotals.THERMAL += (h.domainMap.THERMAL || 0);
      domainTotals.ELECTRICAL += (h.domainMap.ELECTRICAL || 0);
      domainTotals.STORAGE_CACHE_BATTERY += (h.domainMap.STORAGE_CACHE_BATTERY || 0);
      domainTotals.MEMORY_CHANNEL += (h.domainMap.MEMORY_CHANNEL || 0);
      domainTotals.POWER_REDUNDANCY += (h.domainMap.POWER_REDUNDANCY || 0);
    }
  });

  const rawCounts = [
    domainTotals.THERMAL,
    domainTotals.ELECTRICAL,
    domainTotals.STORAGE_CACHE_BATTERY,
    domainTotals.MEMORY_CHANNEL,
    domainTotals.POWER_REDUNDANCY
  ];
  const grandTotal = rawCounts.reduce((a, b) => a + b, 0);
  const allocatedPcts = grandTotal > 0 ? allocateRoundedPercentages(rawCounts) : null;
  const domainItems = [
    { domain: 'Thermal TDP Fans', color: 'bg-rose-500', pct: allocatedPcts ? `${allocatedPcts[0]}%` : '—' },
    { domain: 'Telco -48VDC Lug Kits', color: 'bg-amber-500', pct: allocatedPcts ? `${allocatedPcts[1]}%` : '—' },
    { domain: 'Storage Cache Battery', color: 'bg-blue-500', pct: allocatedPcts ? `${allocatedPcts[2]}%` : '—' },
    { domain: 'Memory Channel Symmetry', color: 'bg-purple-500', pct: allocatedPcts ? `${allocatedPcts[3]}%` : '—' },
    { domain: 'PSU Redundancy', color: 'bg-emerald-500', pct: allocatedPcts ? `${allocatedPcts[4]}%` : '—' }
  ];

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div
        className="p-5 rounded-2xl bg-slate-950 text-white shadow-sm space-y-4 flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-emerald-400/50 hover:scale-[1.01] transition-all duration-200"
        onClick={onOpenAccuracy}
        title="Click to inspect Accuracy Index methodology and synthetic vs customer BOQ benchmarks"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className={`w-4 h-4 ${accuracyTier.iconClass}`} /> Accuracy Index
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap shrink-0 ${accuracyTier.badgeClass}`}>
              {accuracyTier.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{accuracyScore}</span>
          </div>
        </div>
        <div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className={`${accuracyTier.barClass} h-full rounded-full transition-all duration-500`}
              style={{ width: `${numericAccuracy !== null ? Math.min(100, Math.max(0, numericAccuracy)) : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed flex items-center justify-between gap-2">
            <span>Calculated across synthetic and live customer BOQs.</span>
            <span className="text-emerald-400 font-bold text-[10px] whitespace-nowrap shrink-0">Inspect &rarr;</span>
          </p>
        </div>
      </div>

      <div
        className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 shadow-sm space-y-4 flex flex-col justify-between cursor-pointer hover:border-slate-400 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
        onClick={onOpenAdversarial}
        title="Click to inspect Continuous Adversarial Red-Team Stress Tests"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> Adversarial Catch
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300 whitespace-nowrap shrink-0">
              Red-Team
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{adversarialCatch}</span>
          </div>
        </div>
        <div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className="bg-slate-800 h-full rounded-full transition-all duration-500"
              style={{ width: `${numericCatchRate !== null ? Math.min(100, Math.max(0, numericCatchRate)) : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed flex items-center justify-between gap-2">
            <span>Continuous background adversarial benchmarks.</span>
            <span className="text-blue-600 font-bold text-[10px] whitespace-nowrap shrink-0">Inspect &rarr;</span>
          </p>
        </div>
      </div>

      <div
        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200"
        onClick={onOpenDomain}
        title="Click to inspect all 5 physical rule domain definitions"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-blue-600 shrink-0" /> Violation Domain Breakdown
          </span>
          <span className="text-[10px] text-blue-600 font-bold whitespace-nowrap shrink-0">View Rules &rarr;</span>
        </div>
        <div className="space-y-1.5 text-xs">
          {domainItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                <span className="font-medium text-slate-700 text-[11px]">{item.domain}</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-slate-800">{item.pct}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all duration-200"
        onClick={onOpenProfiler}
        title="Click to inspect 5-Stage Pipeline execution latency distribution"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" /> 5-Stage Pipeline Profiler
          </span>
          <span className="text-[10px] text-indigo-600 font-bold whitespace-nowrap shrink-0">Profile &rarr;</span>
        </div>
        {(() => {
          const latest = telemetry.history?.[0];
          const measured = latest?.stageTimingsMeasured !== false ? latest?.stageBreakdown : null;
          const formatStageMs = (ms, inSeconds = false) => (typeof ms === 'number' && Number.isFinite(ms))
            ? (inSeconds ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`)
            : '—';
          return (
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Stage 1: Parsing & CTO Multiplier</span>
                <span className="font-mono font-bold text-slate-800">{formatStageMs(measured?.stage1ParsingMs)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Stage 2: Aspect Math Engine</span>
                <span className="font-mono font-bold text-slate-800">{formatStageMs(measured?.stage2AspectMathMs)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Stage 3: NotebookLM Grounding</span>
                <span className="font-mono font-bold text-slate-800">{formatStageMs(measured?.stage3RAGConsultationMs, true)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Stage 4: Gemini Workload Verify</span>
                <span className="font-mono font-bold text-slate-800">{formatStageMs(measured?.stage4GeminiVerificationMs, true)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Stage 5: 5-Tier Matrix Synthesis</span>
                <span className="font-mono font-bold text-slate-800">{formatStageMs(measured?.stage5ResolutionMatrixMs)}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
