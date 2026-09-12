import React, { useState } from 'react';
import { Award, Check, MessageSquare, Download, Loader, Sparkles, ShieldCheck, Copy, CheckCircle, Zap, Brain, GitFork, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { getCategoryStyle } from '../../utils/categoryStyles';

export default function RankCard({
  tier,
  isExpanded,
  onToggleExpand,
  onCopyBom,
  isCopied,
  onExportXlsx,
  isExporting,
  exportedFile,
  onOpenVendorVerification,
  onOpenRejectionModal
}) {
  const [isLeastDeltaExpanded, setIsLeastDeltaExpanded] = useState(false);
  const [isDecisionTraceExpanded, setIsDecisionTraceExpanded] = useState(false);

  return (
    <div
      className={`glass-card flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
        tier.isOptimal ? 'border-2 border-emerald-500 ring-4 ring-emerald-50/50' : 'border border-slate-200'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`badge ${tier.badgeClass}`}>
              Rank {tier.rank} Solution
            </span>
            {(tier.leastDeltaAnalysis || tier.isLeastDeltaPath) && (
              <span className="badge badge-blue flex items-center gap-1 text-[10px] font-semibold">
                <GitFork className="w-3 h-3 text-blue-600" /> Least-Delta Pruned
              </span>
            )}
          </div>
          {tier.isOptimal && (
            <span className="badge badge-emerald flex items-center gap-1 font-bold shadow-sm animate-pulse">
              <Award className="w-3.5 h-3.5 text-emerald-600" /> Optimal Workload Match
            </span>
          )}
        </div>

        <h3 className="font-bold text-slate-900 text-base leading-snug">{tier.title}</h3>
        <p className="text-xs text-slate-500 mt-1">{tier.subtitle}</p>

        <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Workload Intent Alignment:</span>
            <span className="font-bold text-slate-800">{tier.intentMatch}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Estimated CapEx Budget:</span>
            <span className="font-bold font-mono text-emerald-700 text-sm">{tier.capex}</span>
          </div>
          {tier.budgetBreakdown && (
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-1 text-[10px] text-slate-500 text-center">
              <div>
                <span className="block font-semibold text-slate-700">${(tier.budgetBreakdown.baseBomCost || 0).toLocaleString()}</span>
                Base BOM
              </div>
              <div>
                <span className="block font-semibold text-rose-600">+${(tier.budgetBreakdown.fixCost || 0).toLocaleString()}</span>
                Aspect Fixes
              </div>
              <div>
                <span className="block font-semibold text-blue-600">+${(tier.budgetBreakdown.strategyAddonCost || 0).toLocaleString()}</span>
                Add-ons
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Automated Configuration & Rule Fixes:</h4>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {tier.swaps.map((swap, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-100">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{swap}</span>
              </li>
            ))}
          </ul>
        </div>

        {tier.skuPartsList && tier.skuPartsList.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Full Configuration BOM ({tier.skuPartsList.length} SKUs)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onCopyBom(tier)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="Copy BOM to clipboard"
                >
                  {isCopied ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy BOM
                    </>
                  )}
                </button>
                <button
                  onClick={() => onToggleExpand(tier.rank)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="px-2 py-1">Qty</th>
                      <th className="px-2 py-1">SKU</th>
                      <th className="px-2 py-1">Price</th>
                      <th className="px-2 py-1">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {tier.skuPartsList.map((part, pIdx) => (
                      <tr key={pIdx} className={part.isFixInjected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}>
                        <td className="px-2 py-1 font-bold text-slate-800">{part.quantity}x</td>
                        <td className="px-2 py-1 font-mono font-semibold text-slate-900" title={part.description}>
                          {part.sku}
                        </td>
                        <td className="px-2 py-1 text-slate-600 font-mono">
                          ${((part.unitPriceUsd || 0) * (part.quantity || 1)).toLocaleString()}
                        </td>
                        <td className="px-2 py-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${getCategoryStyle(part.category)}`}>
                            {part.category || 'Option'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed italic">
            <span className="font-semibold text-slate-700 not-italic">Engine Rationale: </span>
            {tier.rationale}
          </p>
        </div>

        {tier.cascadingImpact && (
          <div className="mt-3 p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-indigo-950 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                Cascading Ripple Analysis:
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                {tier.cascadingImpact.affectedCount || 0} Affected SKU(s)
              </span>
            </div>
            <p className="text-indigo-900 text-[11px] leading-relaxed mb-2">
              {tier.cascadingImpact.summary}
            </p>
            {tier.cascadingImpact.humanRationale && (
              <div className="text-[10px] text-indigo-800 bg-white/70 p-1.5 rounded border border-indigo-100 leading-snug">
                <strong>Presales Guidance:</strong> {tier.cascadingImpact.humanRationale}
              </div>
            )}
          </div>
        )}

        {tier.ragSecondOpinion && (
          <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              NotebookLM RAG Grounding Verification:
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">
              {tier.ragSecondOpinion}
            </p>
          </div>
        )}

        {/* Least-Delta Cascade Pruning Analysis */}
        {tier.leastDeltaAnalysis && (
          <div className="mt-3 p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-blue-950 flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5 text-blue-600" />
                Least-Delta Cascade Pruning:
              </span>
              <button
                onClick={() => setIsLeastDeltaExpanded(!isLeastDeltaExpanded)}
                className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 cursor-pointer"
              >
                {isLeastDeltaExpanded ? 'Hide' : 'Details'}
                {isLeastDeltaExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-blue-900 text-[11px] leading-relaxed mb-2 font-medium">
              {tier.leastDeltaAnalysis.presalesValuePitch}
            </p>
            {isLeastDeltaExpanded && (
              <div className="space-y-2 pt-2 border-t border-blue-200/60 text-[11px]">
                <div className="flex items-center justify-between text-blue-900 bg-white/70 p-2 rounded-lg border border-blue-100">
                  <span>Root Troublesome SKU:</span>
                  <span className="font-mono font-bold text-rose-700">{tier.leastDeltaAnalysis.troublesomeRootSku}</span>
                </div>
                {tier.leastDeltaAnalysis.alternativeSku && (
                  <div className="flex items-center justify-between text-blue-900 bg-white/70 p-2 rounded-lg border border-blue-100">
                    <span>Functional Replacement:</span>
                    <span className="font-mono font-bold text-emerald-700">{tier.leastDeltaAnalysis.alternativeSku}</span>
                  </div>
                )}
                {tier.leastDeltaAnalysis.cascadingSkusEliminated?.length > 0 && (
                  <div className="bg-white/70 p-2 rounded-lg border border-blue-100 text-blue-900">
                    <span className="font-semibold block mb-1">Cascades Avoided:</span>
                    <div className="flex flex-wrap gap-1">
                      {tier.leastDeltaAnalysis.cascadingSkusEliminated.map((c, cIdx) => (
                        <span key={cIdx} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-blue-700 font-medium">
                  {tier.leastDeltaAnalysis.deltaSummary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Decision Chain & Trade-Offs Ledger */}
        {tier.decisionTrace && tier.decisionTrace.length > 0 && (
          <div className="mt-3 p-3 bg-slate-100/90 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-slate-600" />
                Thinking & Decision Chain:
              </span>
              <button
                onClick={() => setIsDecisionTraceExpanded(!isDecisionTraceExpanded)}
                className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
              >
                <span>{tier.decisionTrace.length} Decision{tier.decisionTrace.length === 1 ? '' : 's'}</span>
                {isDecisionTraceExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            {isDecisionTraceExpanded && (
              <div className="space-y-2 pt-2 border-t border-slate-200/80 text-[11px]">
                {tier.decisionTrace.map((dec, dIdx) => (
                  <div key={dIdx} className="bg-white p-2 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[10px] uppercase">{dec.decisionPoint}</span>
                      <span className="text-[9px] font-mono text-slate-400 font-semibold">{Math.round((dec.confidence || 1) * 100)}% Conf</span>
                    </div>
                    <p className="text-slate-600 text-[10px]">
                      <strong>Trigger:</strong> {dec.trigger}
                    </p>
                    {dec.selectedAlternative && (
                      <div className="text-[10px] text-emerald-800 bg-emerald-50/70 p-1 rounded border border-emerald-200/60">
                        <strong>Chosen:</strong> {dec.selectedAlternative.id} — {dec.selectedAlternative.selectionRationale || dec.selectedAlternative.description}
                      </div>
                    )}
                    {dec.alternativesEvaluated?.some(a => a.status === 'REJECTED') && (
                      <div className="text-[10px] text-slate-500 space-y-0.5 pt-0.5">
                        <strong className="text-slate-600 block">Rejected:</strong>
                        {dec.alternativesEvaluated.filter(a => a.status === 'REJECTED').map((alt, aIdx) => (
                          <div key={aIdx} className="flex items-start gap-1">
                            <XCircle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                            <span><strong>{alt.id}:</strong> {alt.rejectionReason || alt.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onExportXlsx(tier)}
            disabled={isExporting}
            className="btn-secondary text-xs flex items-center justify-center gap-1.5"
            title="Download full categorized Excel workbook"
          >
            {isExporting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isExporting ? 'Exporting...' : 'Export XLSX'}
          </button>
          <button
            onClick={() => onOpenVendorVerification(tier)}
            className="btn-secondary text-xs flex items-center justify-center gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            title="Cross-verify against Partner Vendor Quote"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Verify Quote
          </button>
        </div>

        <button
          onClick={() => onOpenRejectionModal(tier)}
          className="w-full text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 font-medium transition-colors"
          title="Record portal rejection or auto-inserted SKU for evidence-backed review"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Test in Portal / Confirm Difference
        </button>

        {exportedFile && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center justify-between">
            <span className="truncate">Saved: <strong>{exportedFile}</strong></span>
            <a
              href={`/artifacts/${exportedFile}`}
              download
              className="text-emerald-700 underline font-bold shrink-0 ml-2"
            >
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
