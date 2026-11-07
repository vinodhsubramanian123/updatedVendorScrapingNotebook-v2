import React, { useState, useEffect } from 'react';
import VendorBomVerificationModal from './VendorBomVerificationModal';
import RankCard from './matrix/RankCard';
import MatrixComparisonTable from './matrix/MatrixComparisonTable';
import MatrixToolbar from './matrix/MatrixToolbar';
import RejectionModal from './matrix/RejectionModal';
import MatrixStatusBanners from './matrix/MatrixStatusBanners';

const STANDARD_CATEGORIES = [
  { id: 'chassis', label: 'Chassis Base & Form Factor', match: ['chassis', 'base', 'enclosure', 'cto'] },
  { id: 'cpu', label: 'Compute Processors & Thermal TDP', match: ['processor', 'cpu', 'intel', 'xeon'] },
  { id: 'cooling', label: 'Thermal Fans & Heatsinks', match: ['fan', 'cooling', 'heatsink', 'thermal'] },
  { id: 'memory', label: 'Memory (DDR5 1DPC / 2DPC)', match: ['memory', 'ram', 'dimm', 'ddr5'] },
  { id: 'storage_ctrl', label: 'Storage Controllers & Battery', match: ['storage controller', 'controller', 'raid', 'cache', 'battery'] },
  { id: 'storage_drives', label: 'Drive Media & Backplanes', match: ['drive', 'ssd', 'hdd', 'nvme', 'cage'] },
  { id: 'power', label: 'Power Infrastructure & Redundancy', match: ['power', 'psu', 'titanium', 'platinum', 'dc', 'lug'] },
  { id: 'networking', label: 'Networking & PCIe Risers', match: ['network', 'nic', 'ocp', 'adapter', 'riser', 'pcie'] },
  { id: 'support', label: 'Pointnext Tech Care Warranty', match: ['service', 'support', 'warranty', 'care'] }
];

function extractRankedSolutionsFromEval(evalResults) {
  const candidates = [
    evalResults?.conflictGraph?.rankedSolutions,
    evalResults?.rankedSolutions,
    evalResults?.conflictGraph?.recommendedSolutions,
    evalResults?.recommendedSolutions
  ];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

function buildDetailedSwaps(sol, resolvedFixes) {
  if (resolvedFixes.length > 0) {
    return resolvedFixes.map(f => `${f.sku}: ${f.reasoning || f.action}`);
  }
  return [
    `Modifications: ${sol.tradeoffMetrics?.skuModifications || '0 fixes'}`,
    `Cost Delta: ${sol.tradeoffMetrics?.costDeltaUsd || '$0'}`,
    `Expansion: ${sol.tradeoffMetrics?.capacityExpansion || 'Standard'}`
  ];
}

function formatSolutionCapex(sol) {
  const formattedTotal = `$${Number(sol.estimatedCostUsd || 0).toLocaleString()}`;
  if (sol.pricingComplete === false) {
    const missingCount = sol.priceUnavailableSkus?.length || 0;
    const suffix = missingCount === 1 ? '' : 's';
    return `Partial: ${formattedTotal} (Missing: ${missingCount} SKU${suffix})`;
  }
  return formattedTotal;
}

function mapSolutionToTier(sol, evalResults) {
  const resolvedFixes = evalResults?.conflictGraph?.resolvedFixes || evalResults?.resolvedFixes || [];
  const scoreVal = sol.score || 0.9;
  const badgeClass = sol.rank === 1 ? 'badge-emerald' : sol.rank <= 3 ? 'badge-blue' : 'badge-amber';
  const ragSecondOpinion = sol.rank === 1 && evalResults?.ragAnswer ? evalResults.ragAnswer : sol.ragSecondOpinion;

  return {
    rank: sol.rank,
    title: sol.name,
    subtitle: sol.workloadDnaMatch || `Rank ${sol.rank} Solution`,
    score: scoreVal,
    intentMatch: sol.tradeoffMetrics?.intentAlignment || `${Math.round(scoreVal * 100)}%`,
    capex: formatSolutionCapex(sol),
    budgetBreakdown: sol.budgetBreakdown || null,
    badgeClass,
    rationale: sol.reasoning,
    ragSecondOpinion,
    isOptimal: sol.rank === 1,
    swaps: buildDetailedSwaps(sol, resolvedFixes),
    skuPartsList: sol.skuPartsList || [],
    cascadingImpact: sol.cascadingImpact || null,
    leastDeltaAnalysis: sol.leastDeltaAnalysis || null,
    decisionTrace: sol.decisionTrace || [],
    portalConditionalSkus: sol.portalConditionalSkus || [],
    isLeastDeltaPath: Boolean(sol.leastDeltaAnalysis?.isLeastDeltaPath || sol.isLeastDeltaPath)
  };
}

function formatBomCopyLines(tier) {
  const partLines = tier.skuPartsList.map(p => {
    const priceStr = p.priceKnown === false
      ? 'PRICE N/A'
      : `$${((p.unitPriceUsd || 0) * (p.quantity || 1)).toLocaleString()}`;
    return `${p.quantity}x\t${p.sku}\t${priceStr}\t[${p.category || 'Option'}]\t${p.description}`;
  });
  return [
    `HPE PROLIANT BOM — ${tier.title}`,
    `Strategy: ${tier.subtitle} | CapEx: ${tier.capex}`,
    `Workload Alignment: ${tier.intentMatch}`,
    `--------------------------------------------------`,
    ...partLines,
    `--------------------------------------------------`,
    `Total Estimated CapEx Budget: ${tier.capex}`
  ];
}

export default function ResolutionMatrix({
  evalResults,
  onOpenPortalFeedback,
  selectedChassis,
  onTriggerDemoBoq,
  onOpenTopology
}) {
  const [exportingRank, setExportingRank] = useState(null);
  const [exportedFiles, setExportedFiles] = useState({});
  const [exportError, setExportError] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null);
  const [vendorVerificationModal, setVendorVerificationModal] = useState(null);
  const [rejectionText, setRejectionText] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);
  const [rejectionConfirmed, setRejectionConfirmed] = useState(null);
  const [rejectionError, setRejectionError] = useState(null);

  const [matrixViewMode, setMatrixViewMode] = useState('cards');
  const [expandedParts, setExpandedParts] = useState({});
  const [copyStatus, setCopyStatus] = useState({});

  const clearRejectionModal = () => {
    setRejectionModal(null);
    setRejectionText('');
    setRejectionConfirmed(null);
    setRejectionError(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && rejectionModal) {
        clearRejectionModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectionModal]);

  const handleCopyBomText = (tier) => {
    if (!tier.skuPartsList || tier.skuPartsList.length === 0) return;
    navigator.clipboard.writeText(formatBomCopyLines(tier).join('\n'));
    setCopyStatus(prev => ({ ...prev, [tier.rank]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [tier.rank]: false }));
    }, 2500);
  };

  const rankedFromEval = extractRankedSolutionsFromEval(evalResults);
  const tiers = rankedFromEval.map(sol => mapSolutionToTier(sol, evalResults));
  const resolvedChassisId = evalResults?.conflictGraph?.chassisInfo?.id || selectedChassis || 'DL380_Gen12';

  const handleExportXlsx = async (tier) => {
    setExportingRank(tier.rank);
    setExportError(null);
    try {
      const parts = tier.skuPartsList && tier.skuPartsList.length > 0
        ? tier.skuPartsList
        : (evalResults?.items || []);

      const res = await fetch('/api/export-boq-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassisId: resolvedChassisId,
          rankTier: tier.rank,
          strategyName: tier.title,
          items: parts,
          evalResults: evalResults || {},
          totalBudgetUsd: tier.capex
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate XLSX');
      }

      setExportedFiles(prev => ({ ...prev, [tier.rank]: data.filename }));
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportingRank(null);
    }
  };

  const handleRejectionSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionText.trim() || !rejectionModal) return;

    setIsSubmittingRejection(true);
    setRejectionError(null);

    try {
      const res = await fetch('/api/simulate-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassis: resolvedChassisId,
          errorMessage: `[Rank ${rejectionModal.rank} - ${rejectionModal.title}] ${rejectionText}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record rejection feedback');
      }

      setRejectionConfirmed(data.delta || { deltaId: 'QUARANTINED_OBSERVATION' });
      if (onOpenPortalFeedback) {
        onOpenPortalFeedback(data.delta);
      }
    } catch (err) {
      setRejectionError(err.message);
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  return (
    <div className="space-y-6">
      <MatrixToolbar
        viewMode={matrixViewMode}
        setViewMode={setMatrixViewMode}
        evalResults={evalResults}
        onTriggerDemoBoq={onTriggerDemoBoq}
        exportError={exportError}
        onOpenTopology={onOpenTopology}
      />

      <MatrixStatusBanners evalResults={evalResults} />

      {tiers.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          No candidate passed the buildability, uniqueness, Pareto, and customer-closeness gates. Review the reported conflicts before exporting a BOM.
        </div>
      )}

      {tiers.length > 0 && (matrixViewMode === 'vertical-matrix' ? (
        <MatrixComparisonTable
          tiers={tiers}
          standardCategories={STANDARD_CATEGORIES}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <RankCard
              key={tier.rank}
              tier={tier}
              isExpanded={!!expandedParts[tier.rank]}
              onToggleExpand={(rank) => setExpandedParts(prev => ({ ...prev, [rank]: !prev[rank] }))}
              onCopyBom={handleCopyBomText}
              isCopied={!!copyStatus[tier.rank]}
              onExportXlsx={handleExportXlsx}
              isExporting={exportingRank === tier.rank}
              exportedFile={exportedFiles[tier.rank]}
              onOpenVendorVerification={(t) => setVendorVerificationModal(t)}
              onOpenRejectionModal={(t) => {
                setRejectionModal(t);
                setRejectionText('');
                setRejectionConfirmed(null);
                setRejectionError(null);
              }}
            />
          ))}
        </div>
      ))}

      <RejectionModal
        modalData={rejectionModal}
        onClose={clearRejectionModal}
        rejectionText={rejectionText}
        setRejectionText={setRejectionText}
        onSubmit={handleRejectionSubmit}
        isSubmitting={isSubmittingRejection}
        rejectionConfirmed={rejectionConfirmed}
        rejectionError={rejectionError}
      />

      {vendorVerificationModal && (
        <VendorBomVerificationModal
          rankSolution={vendorVerificationModal}
          selectedChassis={resolvedChassisId}
          onClose={() => setVendorVerificationModal(null)}
          onApplyReconciliation={(_result) => {
            setVendorVerificationModal(null);
          }}
        />
      )}
    </div>
  );
}
