import React from 'react';
import { ShieldCheck, AlertTriangle, ArrowRight, Network } from 'lucide-react';
import GuardrailReviewStatus from './GuardrailReviewStatus';
import EvaluationNarrativeCard from './EvaluationNarrativeCard';

export default function EvaluationOutcomeCard({
  evalResults,
  outcomeRef,
  onOpenTopology,
  onOpenReconciliation,
  onOpenMatrix
}) {
  if (!evalResults) return null;
  if (evalResults.status === 'ERROR' || evalResults.isContractInvalid) return (
    <div ref={outcomeRef} role="alert" className="glass-card p-6 border border-red-200 rounded-xl space-y-2">
      <h3 className="font-bold text-red-900">Evaluation could not be validated</h3>
      <p className="text-sm text-red-800">{typeof evalResults.error === 'string' ? evalResults.error : evalResults.error?.message || 'Review the input and evaluator diagnostics before retrying.'}</p>
      <p className="text-xs text-red-700">Customer export is blocked. Correct the reported errors and run the evaluation again.</p>
    </div>
  );

  const isCertified = Boolean(evalResults)
    && !evalResults.requirementResolution?.requiresHumanClarification
    && evalResults.isMathClean === true
    && evalResults.criticalViolationsCount === 0
    && evalResults.ephemeralSourceValidation?.success === true
    && ['CLIC_ACCEPTED', 'CORRECTED_CANDIDATE_CLIC_ACCEPTED'].includes(evalResults.portalValidationStatus);

  return (
    <div ref={outcomeRef} className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`p-2.5 rounded-xl border ${
            isCertified
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            {isCertified ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </span>
          <div>
            <span className="badge badge-blue mb-1">BOQ Evaluation Outcome</span>
            <h3 className="font-bold text-slate-900 text-base">
              {isCertified
                ? 'Corrected Candidate Verified'
                : evalResults.requirementResolution?.requiresHumanClarification
                  ? 'Human Part/Category Confirmation Required'
                  : 'Validation Incomplete or Changes Required'}
            </h3>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-500 font-medium">Confidence Score:</span>
          <p className="font-bold text-emerald-700 text-lg font-mono">
            {Number.isFinite(evalResults.confidence?.score ?? evalResults.confidenceScore)
              ? `${Math.round((evalResults.confidence?.score ?? evalResults.confidenceScore) * ((evalResults.confidence?.score ?? evalResults.confidenceScore) > 1 ? 1 : 100))}%`
              : 'Not assessed'}
          </p>
        </div>
      </div>

      {/* NotebookLM Grounding & Dual-Brain Status Banner */}
      {evalResults.notebookLmStatus?.isFallback && (
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Local Verified Fallback Active:</span> NotebookLM Cloud was not consulted ({evalResults.notebookLmStatus.fallbackReason || 'Timeout or Local Mode'}). Rules and physical constraints evaluated via deterministic rule engine.
          </div>
        </div>
      )}
      {evalResults.notebookLmStatus?.isCloudGrounded && (
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Cloud Grounded via NotebookLM:</span> Live QuickSpecs notebook verified ({evalResults.notebookLmStatus.citationsCount || 0} citations).
          </div>
        </div>
      )}

      <GuardrailReviewStatus status={evalResults.agenticReviewStatus} review={evalResults.agenticReview} />
      {evalResults.pcieTopology && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900">PCIe topology — per node and cluster</span>
            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${evalResults.pcieTopology.requiresNotebookVerification ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-emerald-300 bg-emerald-100 text-emerald-900'}`}>
              {evalResults.pcieTopology.requiresNotebookVerification ? 'Notebook verification required' : 'Catalog topology evidence'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div><span className="text-slate-500">Cards/node</span><div className="font-mono font-bold">{evalResults.pcieTopology.perNodeDemand?.pcieCards ?? 0}</div></div>
            <div><span className="text-slate-500">Mechanical/node</span><div className="font-mono font-bold">{evalResults.pcieTopology.totalMechanicalSlots ?? 0}</div></div>
            <div><span className="text-slate-500">Active/node</span><div className="font-mono font-bold">{evalResults.pcieTopology.electricallyActiveSlots ?? 0}</div></div>
            <div><span className="text-slate-500">Cluster active</span><div className="font-mono font-bold">{evalResults.pcieTopology.clusterTotals?.electricallyActiveSlotCapacity ?? 0}</div></div>
          </div>
        </div>
      )}

      {evalResults.evaluationNarrative && (
        <EvaluationNarrativeCard
          narrative={evalResults.evaluationNarrative}
          chassis={evalResults.chassis}
        />
      )}

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 flex-wrap">
        {onOpenTopology && (
          <button
            type="button"
            onClick={onOpenTopology}
            className="btn-secondary text-xs flex items-center gap-1.5 text-emerald-800 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100"
          >
            <Network className="w-3.5 h-3.5 text-emerald-600" />
            Visual BOQ Topology
          </button>
        )}
        {onOpenReconciliation && (
          <button
            type="button"
            onClick={onOpenReconciliation}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            Reconcile with Partner Quote
          </button>
        )}
        {onOpenMatrix && (
          <button
            type="button"
            onClick={onOpenMatrix}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
          >
            View 5-Tier Resolution Matrix
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
