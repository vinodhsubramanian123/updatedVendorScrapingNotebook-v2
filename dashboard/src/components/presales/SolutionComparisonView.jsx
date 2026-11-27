import React from 'react';
import { formatPrice } from '../../services/pricing.js';
import { Scale, GitCompare, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

const PARITY_BADGE_MAP = {
  MAPPED: 'badge-emerald',
  VERIFIED: 'badge-emerald',
  PARTIAL: 'badge-amber',
  UNMAPPED: 'badge-amber',
  NOT_EVALUATED: 'badge-slate',
  MISSING: 'badge-rose'
};

function ParityGapList({ gaps = [] }) {
  if (!Array.isArray(gaps) || gaps.length === 0) return null;
  return (
    <div className="space-y-1.5 border-t border-slate-200 pt-2">
      <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <span>Cross-Vendor Parity Gaps & Coverage ({gaps.length})</span>
      </div>
      <div className="space-y-1">
        {gaps.slice(0, 12).map((gap, i) => {
          const status = String(gap.status || gap.disposition || (gap.unmapped ? 'UNMAPPED' : 'NOT_EVALUATED')).toUpperCase();
          const badgeCls = PARITY_BADGE_MAP[status] || 'badge-amber';
          return (
            <div key={gap.id || i} className="surface-panel px-2.5 py-1.5 rounded-lg flex items-start justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{gap.sourceItem || gap.component || gap.requirement || `Item ${i + 1}`}</div>
                {(gap.reason || gap.gap || gap.note) && (
                  <div className="text-slate-500">{gap.reason || gap.gap || gap.note}</div>
                )}
              </div>
              <span className={`badge ${badgeCls} shrink-0`}>{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRunway(value) {
  if (typeof value === 'string') return value;
  if (!value) return 'Not profiled';
  const capacities = [
    [value.maxDimmsChassis, 'DIMM slots'],
    [value.maxActivePcieSlots, 'active PCIe slots'],
    [value.maxDoubleWideGpus, 'double-wide GPUs'],
    [value.maxSffDrives, 'SFF drive bays']
  ].filter(([count]) => Number.isFinite(count));
  return capacities.map(([count, unit]) => count + ' ' + unit).join(' · ') || 'Not profiled';
}

function candidateLabel(candidate) {
  return candidate.product || candidate.platformId || candidate.platform || candidate.model || 'Unspecified platform';
}

function candidateStatus(candidate) {
  if (candidate.buildable === false || candidate.isBuildable === false) return 'BLOCKED';
  const raw = String(candidate.buildabilityStatus || candidate.status || '');
  const portalPending = /PENDING/i.test(String(candidate.portalValidationStatus || '')) || /PORTAL.*PENDING/i.test(raw);
  if (candidate.buildable === true || candidate.isBuildable === true || raw === 'BUILDABLE') {
    return portalPending ? 'BUILDABLE · PORTAL PENDING' : 'BUILDABLE';
  }
  if (portalPending || raw === 'NOT_EVALUATED') {
    return raw === 'NOT_EVALUATED' ? 'NOT_EVALUATED' : 'BUILDABLE · PORTAL PENDING';
  }
  return raw || 'NOT_EVALUATED';
}

function candidateBadgeClass(status) {
  if (status === 'BLOCKED') return 'badge-rose';
  if (status.includes('PORTAL PENDING')) return 'badge-amber';
  if (status === 'BUILDABLE' || status === 'CANDIDATE_EVALUATION_COMPLETE') return 'badge-emerald';
  return 'badge-slate';
}

function CandidatesComparisonTable({ candidates = [] }) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-[11px] text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
          <tr>
            <th className="p-2 font-semibold">Architecture</th>
            <th className="p-2 font-semibold">Status</th>
            <th className="p-2 font-semibold">Price (USD)</th>
            <th className="p-2 font-semibold">Day-2 Runway</th>
            <th className="p-2 font-semibold">Trade-Off vs Baseline</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {candidates.map((cand, idx) => (
            <tr key={cand.platform || cand.platformId || cand.product || idx} className="hover:bg-slate-50/70">
              <td className="p-2 font-semibold text-slate-800">{candidateLabel(cand)}</td>
              <td className="p-2">
                {(() => {
                  const st = candidateStatus(cand);
                  return <span className={`badge ${candidateBadgeClass(st)}`}>{st}</span>;
                })()}
              </td>
              <td className="p-2 font-mono tabular-nums text-slate-700">
                {cand.pricingComplete === false ? 'Incomplete' : formatPrice(cand.totalPriceUsd ?? cand.capexListUsd)}
              </td>
              <td className="p-2 text-slate-600">{formatRunway(cand.day2Runway || cand.headroomSummary)}</td>
              <td className="p-2 text-slate-600">{typeof cand.tradeOffVsBaseline === 'string' ? cand.tradeOffVsBaseline : (cand.tradeOffSummary || 'Not supplied')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonSummaryHeader({ isCrossVendor, grounding, baselineSummary, runway }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          {isCrossVendor ? <GitCompare className="w-3.5 h-3.5 text-indigo-600" /> : <Scale className="w-3.5 h-3.5 text-blue-600" />}
          {isCrossVendor ? 'Cross-Vendor Architecture & Parity Matrix' : 'Solution Matrix Comparison'}
        </span>
        {grounding && (
          <span className={`badge ${grounding.allGrounded ? 'badge-emerald' : 'badge-amber'} flex items-center gap-1`}>
            {grounding.allGrounded ? <CheckCircle2 className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
            Grounded: {grounding.verifiedCount ?? 0}/{grounding.totalDomains ?? 0} notebooks
          </span>
        )}
      </div>

      {(baselineSummary || runway) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          {baselineSummary && (
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <span className="font-semibold text-slate-800 block mb-0.5">Trade-off vs Baseline</span>
              {typeof baselineSummary === 'string' ? baselineSummary : JSON.stringify(baselineSummary)}
            </div>
          )}
          {runway && (
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <span className="font-semibold text-slate-800 block mb-0.5">Day-2 Growth Runway</span>
              {typeof runway === 'string' ? runway : JSON.stringify(runway)}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function SolutionComparisonView({ comparison, parityGaps = [], crossVendorReport = null }) {
  if (!comparison && !crossVendorReport && parityGaps.length === 0) return null;
  const src = comparison || {};
  const candidates = src.comparisonMatrix || src.candidates || src.options || src.comparedPlatforms || [];
  const gaps = parityGaps.length > 0 ? parityGaps : (src.parityGaps || crossVendorReport?.parityGaps || []);

  return (
    <div data-testid="solution-comparison-view" className="surface-panel rounded-xl p-3 space-y-2.5 text-xs">
      <ComparisonSummaryHeader
        isCrossVendor={Boolean(crossVendorReport)}
        grounding={src.multiNotebookGrounding}
        baselineSummary={src.tradeOffVsBaseline || src.summary}
        runway={src.day2Runway}
      />
      <CandidatesComparisonTable candidates={candidates.filter(row => row && typeof row === 'object')} />
      {src.unresolvedPlatforms?.length > 0 && (
        <p className="text-amber-800">Unmapped platforms · {src.unresolvedPlatforms.join(', ')}</p>
      )}
      <ParityGapList gaps={gaps} />
    </div>
  );
}
