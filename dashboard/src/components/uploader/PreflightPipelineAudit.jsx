import React from 'react';
import { Layers, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';

export default function PreflightPipelineAudit({
  preflightData,
  onProceedToEvaluate,
  onOpenSplitModal,
  onOpenTopology,
  isEvaluating
}) {
  if (!preflightData) return null;

  const variations = preflightData.configVariations || [];
  const hasVariations = variations.length > 1;

  return (
    <div className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <span className="badge badge-blue mb-1">Pre-flight Intake Audit</span>
          <h3 className="font-bold text-slate-900 text-base">Configuration & BOM Variation Analysis</h3>
        </div>
        {hasVariations ? (
          <span className="badge badge-amber font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {variations.length} Configuration Variations Detected
          </span>
        ) : (
          <span className="badge badge-emerald font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Single Homogenous Configuration
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">Parsed SKU Lines</span>
          <p className="font-bold text-slate-900 text-lg">{preflightData.totalParsedSkus || 0}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">Identified CTO Multiplier</span>
          <p className="font-bold text-emerald-700 text-lg">{preflightData.ctoNodeMultiplier || 1}x Node(s)</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">Auto-Detected Chassis</span>
          <p className="font-bold text-slate-900 text-sm truncate">{preflightData.detectedChassis?.model || 'DL380 Gen12'}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">Workload DNA Profile</span>
          <p className="font-bold text-purple-700 text-sm truncate">{preflightData.workloadDna?.primaryWorkload || 'Balanced'}</p>
        </div>
      </div>

      {hasVariations && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-900 text-xs">
              Multiple distinct hardware configurations or non-integer multipliers detected in this quote:
            </span>
            <button
              onClick={onOpenSplitModal}
              className="text-xs font-bold text-amber-800 underline hover:text-amber-950 flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" /> Review & Split Configurations
            </button>
          </div>
          <p className="text-[11px] text-amber-800">
            Evaluating a mixed quote as a single BOM may produce false physical conflicts. Reviewing splits ensures 100% accuracy.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        {onOpenTopology ? (
          <button
            type="button"
            onClick={onOpenTopology}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Inspect Intake Topology</span>
          </button>
        ) : <div />}

        <button
          onClick={onProceedToEvaluate}
          disabled={isEvaluating}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          <span>Proceed to Full 6-Aspect Evaluation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
