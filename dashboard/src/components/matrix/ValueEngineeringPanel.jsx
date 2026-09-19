import React, { useState } from 'react';
import { TrendingDown, Sparkles, ChevronDown, ChevronUp, Cpu, Zap, Shield, Network } from 'lucide-react';

export default function ValueEngineeringPanel({ valueEngineering }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!valueEngineering || !valueEngineering.opportunities || valueEngineering.opportunities.length === 0) {
    return null;
  }

  const opportunities = valueEngineering.opportunities;
  const totalSavings = valueEngineering.potentialSavingsUsd ?? valueEngineering.totalEstimatedSavingsUsd ?? 0;

  // Format profile name cleanly
  const rawProfile = typeof valueEngineering.workloadProfile === 'string'
    ? valueEngineering.workloadProfile
    : (valueEngineering.workloadProfile?.profileName || 'BALANCED_ENTERPRISE');

  const profileDisplay = rawProfile.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  const traits = Array.isArray(valueEngineering.workloadTraits)
    ? valueEngineering.workloadTraits.join(' ')
    : (valueEngineering.workloadProfile?.rationale || 'Aligned to requested hardware envelope');

  return (
    <div className="glass-card border border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/80 rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                Value Engineering & Commercial Deal Optimization
              </h3>
              <span className="badge badge-emerald text-[10px] font-mono font-bold">
                ${totalSavings.toLocaleString()} Potential Savings
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Workload DNA: <strong className="text-slate-700">{profileDisplay}</strong> — {traits}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs font-semibold"
        >
          {isExpanded ? (
            <>
              <span>Hide Details</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Show {opportunities.length} Opportunities</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-emerald-100/80 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {opportunities.map((opp, idx) => {
              const oppId = (opp.id || opp.type || '').toUpperCase();
              const savings = opp.estimatedSavingsUsd ?? opp.potentialSavingsUsd ?? 0;
              const title = opp.title || opp.headline || 'Optimization Opportunity';
              const reasoning = opp.rationale || opp.technicalReasoning || '';
              const component = opp.component || opp.type || 'System';

              const isMemory = oppId.includes('MEMORY');
              const isPsu = oppId.includes('PSU');
              const isService = oppId.includes('SERVICE');
              const isCpu = oppId.includes('CPU');
              const isNic = oppId.includes('NIC') || oppId.includes('NETWORK');

              return (
                <div
                  key={idx}
                  className="bg-white/90 border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        {isMemory && <Cpu className="w-3 h-3 text-blue-600" />}
                        {isPsu && <Zap className="w-3 h-3 text-amber-600" />}
                        {isService && <Shield className="w-3 h-3 text-emerald-600" />}
                        {isCpu && <Cpu className="w-3 h-3 text-purple-600" />}
                        {isNic && <Network className="w-3 h-3 text-indigo-600" />}
                        {component}
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        -${savings.toLocaleString()}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-snug mb-1">
                      {title}
                    </h4>

                    <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                      {reasoning}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 bg-slate-50/60 -mx-3 -mb-3 p-2.5 rounded-b-xl">
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-700">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-800">Presales Pitch:</strong> {opp.presalesPitch}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
