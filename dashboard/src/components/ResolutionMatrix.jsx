import React, { useState, useEffect } from 'react';
import VendorBomVerificationModal from './VendorBomVerificationModal';
import RankCard from './matrix/RankCard';
import MatrixComparisonTable from './matrix/MatrixComparisonTable';
import MatrixToolbar from './matrix/MatrixToolbar';
import RejectionModal from './matrix/RejectionModal';

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
      ...tier.skuPartsList.map(p => `${p.quantity}x\t${p.sku}\t$${((p.unitPriceUsd || 0) * (p.quantity || 1)).toLocaleString()}\t[${p.category || 'Option'}]\t${p.description}`),
      `--------------------------------------------------`,
      `Total Estimated CapEx Budget: ${tier.capex}`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopyStatus(prev => ({ ...prev, [tier.rank]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [tier.rank]: false }));
    }, 2500);
  };

  const rankedFromEval = evalResults?.conflictGraph?.rankedSolutions || evalResults?.rankedSolutions || [];

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
          capex: sol.estimatedCostUsd ? `$${sol.estimatedCostUsd.toLocaleString()}` : 'Pricing N/A',
          budgetBreakdown: sol.budgetBreakdown || null,
          badgeClass: sol.rank === 1 ? 'badge-emerald' : sol.rank <= 3 ? 'badge-blue' : 'badge-amber',
          rationale: sol.reasoning,
          ragSecondOpinion: sol.rank === 1 && evalResults?.ragAnswer ? evalResults.ragAnswer : sol.ragSecondOpinion,
          isOptimal: sol.rank === 1,
          swaps: detailedSwaps,
          skuPartsList: sol.skuPartsList || [],
          cascadingImpact: sol.cascadingImpact || null
        };
      })
    : [
        {
          rank: 1,
          title: 'Rank 1: Intent Preserved (Direct Workload Alignment)',
          subtitle: 'Direct hardware mapping preserving customer core/RAM ratio and storage specs with zero unrequested over-provisioning.',
          score: 0.98,
          intentMatch: '100% (Direct Match)',
          capex: '$14,250',
          badgeClass: 'badge-emerald',
          rationale: 'Prioritizes original quote intent by keeping requested CPU/RAM footprint and injecting only mandatory physical thermal/power items.',
          isOptimal: true,
          swaps: ['Injected P48820-B21 High Performance Fan Kit', 'Paired P01366-B21 Smart Storage Battery with MR416i'],
          skuPartsList: [],
          cascadingImpact: null
        },
        {
          rank: 2,
          title: 'Rank 2: Standardized CTO Baseline & Factory Default Accessories',
          subtitle: 'Standardized factory default cable and rail accessories for maximum factory assembly stability.',
          score: 0.92,
          intentMatch: '94% (Standardized)',
          capex: '$14,500',
          badgeClass: 'badge-blue',
          rationale: 'Standardizes baseline options with factory default cable and rail accessories for maximum assembly stability.',
          isOptimal: false,
          swaps: ['Standardized factory default accessories', 'Standardized thermal paste and rail kit'],
          skuPartsList: [],
          cascadingImpact: null
        },
        {
          rank: 3,
          title: 'Rank 3: High-IOPS & Storage Performance Optimized',
          subtitle: 'Upgrades storage write-cache and smart hybrid battery protection for enhanced database IOPS.',
          score: 0.86,
          intentMatch: '88% (Storage Heavy)',
          capex: '$15,100',
          badgeClass: 'badge-blue',
          rationale: 'Upgrades storage write-cache and smart hybrid battery protection for enhanced transactional database read/write IOPS.',
          isOptimal: false,
          swaps: ['Upgraded to 4GB Flash-Backed Write Cache', 'Added redundant battery module'],
          skuPartsList: [],
          cascadingImpact: null
        },
        {
          rank: 4,
          title: 'Rank 4: Maximum Density & Future Scalability Expansion',
          subtitle: 'Expands chassis with secondary PCIe riser cages and redundant power infrastructure for future multi-GPU/NVMe expansion.',
          score: 0.80,
          intentMatch: '82% (High-Capacity)',
          capex: '$16,400',
          badgeClass: 'badge-amber',
          rationale: 'Expands chassis with secondary PCIe riser cages and redundant power infrastructure.',
          isOptimal: false,
          swaps: ['Added Secondary 2U Riser Cage', 'Upgraded to Dual 1600W Titanium PSUs'],
          skuPartsList: [],
          cascadingImpact: null
        },
        {
          rank: 5,
          title: 'Rank 5: Budget Minimized (Zero Over-Provisioning)',
          subtitle: 'Strips non-essential accessories to provide the most cost-effective valid buildable configuration.',
          score: 0.72,
          intentMatch: '75% (CapEx Focused)',
          capex: '$13,600',
          badgeClass: 'badge-amber',
          rationale: 'Strips optional secondary accessories, cable management arms, and discretionary brackets while retaining 100% physical validity.',
          isOptimal: false,
          swaps: ['Removed Optional Cable Management Arm', 'Selected Standard Tool-less Rails'],
          skuPartsList: [],
          cascadingImpact: null
        }
      ];

  const cluster = evalResults?.clusterSizing;
  const redundantDefaults = evalResults?.redundantDefaults || [];
  const discrepancies = evalResults?.opinionDiscrepancies || [];

  const handleExportXlsx = async (tier) => {
    setExportingRank(tier.rank);
    setExportError(null);
    try {
      const chassisId = evalResults?.conflictGraph?.chassisInfo?.id || selectedChassis || 'DL380_Gen12_SFF';
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
      const chassisId = evalResults?.conflictGraph?.chassisInfo?.id || selectedChassis || 'DL380_Gen12_SFF';
      const res = await fetch('/api/feedback-rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassis: chassisId,
          rankTier: rejectionModal.rank,
          strategyName: rejectionModal.title,
          rawRejectionText: rejectionText,
          skuPartsList: rejectionModal.skuPartsList || []
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record rejection feedback');
      }

      setRejectionConfirmed(data.delta || { deltaId: 'LEARNED_DELTA' });
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

      {/* Cluster Infrastructure Sizing Matrix Banner (INV-29) */}
      {cluster && cluster.totalServers > 1 && (
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="px-2 py-0.5 rounded text-xs bg-indigo-600 text-white font-mono">Cluster Infrastructure</span>
              <span>Multi-Node Tender Synthesis ({cluster.totalServers}x Nodes)</span>
            </div>
            <p className="text-xs text-indigo-800">
              Total Rack Footprint: <strong>{cluster.totalRackUnits} RU</strong> ({cluster.recommended42uRacks} standard 42U racks) | Facility Peak Power: <strong>{cluster.peakFacilityPowerKw} kW</strong>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className={`px-2 py-1 rounded border font-medium ${cluster.deratingRequired ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-emerald-100 border-emerald-300 text-emerald-900'}`}>
              {cluster.deratingRequired ? '⚡ High-Line 200-240V Mandated' : '⚡ Standard Utility Power'}
            </span>
            <span className="px-2 py-1 rounded border bg-white/80 border-indigo-200 font-medium">
              Rail Kits: {cluster.railKitCoverage?.status === 'PASS' ? '✅ 100% Covered' : '⚠️ Missing Rail Kits'}
            </span>
          </div>
        </div>
      )}

      {/* Chassis Default Included Components Advisory (GAP 2) */}
      {redundantDefaults.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-white font-bold uppercase">Presales Advisory</span>
            <span>
              Chassis standard components detected in BOQ ({redundantDefaults.map(d => d.sku).join(', ')}). These are pre-included with base chassis and do not require re-ordering unless requested as maintenance spares.
            </span>
          </div>
        </div>
      )}

      {/* Presales Discrepancy & Human Review Alert */}
      {discrepancies.length > 0 && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-bold uppercase">Discrepancy Alert</span>
            <span>
              Grounding identified divergent constraints on {discrepancies.length} SKU(s). Presales engineering sign-off recommended before generating customer tender BOM.
            </span>
          </div>
        </div>
      )}

      {matrixViewMode === 'vertical-matrix' ? (
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
      )}

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
          selectedChassis={evalResults?.conflictGraph?.chassisInfo?.id || selectedChassis || 'DL380_Gen12_SFF'}
          onClose={() => setVendorVerificationModal(null)}
          onApplyReconciliation={(_result) => {
            setVendorVerificationModal(null);
          }}
        />
      )}
    </div>
  );
}
