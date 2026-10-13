import React, { useState, useEffect } from 'react';
import VendorBomVerificationModal from './VendorBomVerificationModal';
import RankCard from './matrix/RankCard';
import MatrixComparisonTable from './matrix/MatrixComparisonTable';
import MatrixToolbar from './matrix/MatrixToolbar';
import RejectionModal from './matrix/RejectionModal';
import MatrixStatusBanners from './matrix/MatrixStatusBanners';

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && rejectionModal) {
        setRejectionModal(null);
        setRejectionText('');
        setRejectionConfirmed(null);
        setRejectionError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectionModal]);

  const handleCopyBomText = (tier) => {
    if (!tier.skuPartsList || tier.skuPartsList.length === 0) return;
    const lines = [
      `HPE PROLIANT BOM — ${tier.title}`,
      `Strategy: ${tier.subtitle} | CapEx: ${tier.capex}`,
      `Workload Alignment: ${tier.intentMatch}`,
      `--------------------------------------------------`,
      ...tier.skuPartsList.map(p => `${p.quantity}x\t${p.sku}\t${p.priceKnown === false ? 'PRICE N/A' : `$${((p.unitPriceUsd || 0) * (p.quantity || 1)).toLocaleString()}`}\t[${p.category || 'Option'}]\t${p.description}`),
      `--------------------------------------------------`,
      `Total Estimated CapEx Budget: ${tier.capex}`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopyStatus(prev => ({ ...prev, [tier.rank]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [tier.rank]: false }));
    }, 2500);
  };

  const rankedFromEval = (Array.isArray(evalResults?.conflictGraph?.rankedSolutions) && evalResults.conflictGraph.rankedSolutions.length > 0)
    ? evalResults.conflictGraph.rankedSolutions
    : (Array.isArray(evalResults?.rankedSolutions) && evalResults.rankedSolutions.length > 0)
    ? evalResults.rankedSolutions
    : (Array.isArray(evalResults?.conflictGraph?.recommendedSolutions) && evalResults.conflictGraph.recommendedSolutions.length > 0)
    ? evalResults.conflictGraph.recommendedSolutions
    : (Array.isArray(evalResults?.recommendedSolutions) && evalResults.recommendedSolutions.length > 0)
    ? evalResults.recommendedSolutions
    : [];

  const tiers = (rankedFromEval && rankedFromEval.length > 0)
    ? rankedFromEval.map(sol => {
        const resolvedFixes = evalResults?.conflictGraph?.resolvedFixes || evalResults?.resolvedFixes || [];
        const detailedSwaps = resolvedFixes.length > 0
          ? resolvedFixes.map(f => `${f.sku}: ${f.reasoning || f.action}`)
          : [
              `Modifications: ${sol.tradeoffMetrics?.skuModifications || '0 fixes'}`,
              `Cost Delta: ${sol.tradeoffMetrics?.costDeltaUsd || '$0'}`,
              `Expansion: ${sol.tradeoffMetrics?.capacityExpansion || 'Standard'}`
            ];

        return {
          rank: sol.rank,
          title: sol.name,
          subtitle: sol.workloadDnaMatch || `Rank ${sol.rank} Solution`,
          score: sol.score || 0.9,
          intentMatch: sol.tradeoffMetrics?.intentAlignment || `${Math.round((sol.score || 0.9) * 100)}%`,
          capex: sol.pricingComplete === false
            ? `Partial: $${Number(sol.estimatedCostUsd || 0).toLocaleString()} (Missing: ${sol.priceUnavailableSkus?.length || 0} SKU${sol.priceUnavailableSkus?.length === 1 ? '' : 's'})`
            : `$${Number(sol.estimatedCostUsd || 0).toLocaleString()}`,
          budgetBreakdown: sol.budgetBreakdown || null,
          badgeClass: sol.rank === 1 ? 'badge-emerald' : sol.rank <= 3 ? 'badge-blue' : 'badge-amber',
          rationale: sol.reasoning,
          ragSecondOpinion: sol.rank === 1 && evalResults?.ragAnswer ? evalResults.ragAnswer : sol.ragSecondOpinion,
          isOptimal: sol.rank === 1,
          swaps: detailedSwaps,
          skuPartsList: sol.skuPartsList || [],
          cascadingImpact: sol.cascadingImpact || null,
          leastDeltaAnalysis: sol.leastDeltaAnalysis || null,
          decisionTrace: sol.decisionTrace || [],
          portalConditionalSkus: sol.portalConditionalSkus || [],
          isLeastDeltaPath: Boolean(sol.leastDeltaAnalysis?.isLeastDeltaPath || sol.isLeastDeltaPath)
        };
      })
    : [];

  const handleExportXlsx = async (tier) => {
    setExportingRank(tier.rank);
    setExportError(null);
    try {
      const chassisId = evalResults?.conflictGraph?.chassisInfo?.id || selectedChassis || 'DL380_Gen12';
      const parts = tier.skuPartsList && tier.skuPartsList.length > 0
        ? tier.skuPartsList
        : (evalResults?.items || []);

      const res = await fetch('/api/export-boq-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassisId,
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
      const chassisId = evalResults?.conflictGraph?.chassisInfo?.id || selectedChassis || 'DL380_Gen12';
      const res = await fetch('/api/simulate-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassis: chassisId,
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
        onClose={() => {
          setRejectionModal(null);
          setRejectionText('');
          setRejectionConfirmed(null);
          setRejectionError(null);
        }}
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
          selectedChassis={evalResults?.conflictGraph?.chassisInfo?.id || selectedChassis || 'DL380_Gen12'}
          onClose={() => setVendorVerificationModal(null)}
          onApplyReconciliation={(_result) => {
            setVendorVerificationModal(null);
          }}
        />
      )}
    </div>
  );
}
