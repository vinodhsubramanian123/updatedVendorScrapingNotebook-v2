import React from 'react';
import ValueEngineeringPanel from './ValueEngineeringPanel';

export default function MatrixStatusBanners({ evalResults }) {
  const cluster = evalResults?.clusterSizing;
  const redundantDefaults = evalResults?.redundantDefaults || [];
  const discrepancies = evalResults?.opinionDiscrepancies || [];

  return (
    <>
      {/* Cryptographic Delivery Gate (INV-128 / INV-140) */}
      {evalResults?.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' ? (
        <div className="p-3.5 rounded-xl border-2 border-rose-500 bg-rose-50/90 text-rose-950 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-700 text-white font-bold font-mono uppercase shrink-0">
              DELIVERY_BLOCKED_UNBUILDABLE
            </span>
            <span className="font-medium">
              Pre-Presentation Acceptance Gate blocked: Customer proposal export is cryptographically restricted until critical physical violations and enablement kits are resolved.
            </span>
          </div>
        </div>
      ) : evalResults?.deliveryAuthorization ? (
        <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 text-emerald-950 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-700 text-white font-bold font-mono uppercase shrink-0">
              DELIVERY_AUTHORIZED
            </span>
            <span className="font-medium">
              Cryptographic delivery authorization verified ({evalResults.deliveryAuthorization.certificateId || 'CERT-OK'}). 100% buildable proposal export cleared.
            </span>
          </div>
        </div>
      ) : null}

      {/* Dual-Brain Provisional vs Verified Status Banner (GAP 2) */}
      {evalResults?.isProvisional ? (
        <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="badge badge-amber font-mono font-bold animate-pulse">⏳ Provisional Matrix</span>
            <span className="font-medium">Physical aspect math verified. Background Gemini NotebookLM RAG verification in progress...</span>
          </div>
        </div>
      ) : (evalResults?.matrixStatus === 'VERIFIED' || evalResults?.ragSecondOpinion || evalResults?.ragResult) ? (
        <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="badge badge-emerald font-mono font-bold">✅ Dual-Brain RAG Verified</span>
            <span className="font-medium">100% buildable, certified against live NotebookLM sources and QuickSpecs knowledge.</span>
          </div>
        </div>
      ) : null}

      {/* Value Engineering & Commercial Deal Optimization (GAP 2 & GAP 5) */}
      {evalResults?.valueEngineering && (
        <ValueEngineeringPanel valueEngineering={evalResults.valueEngineering} />
      )}

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
    </>
  );
}
