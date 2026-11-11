import React from 'react';
import ValueEngineeringPanel from './ValueEngineeringPanel';
import { deriveEvidenceStates } from '../../services/exportEligibility.js';

function DeliveryAuthBanner({ authState, customerDisposition }) {
  if (authState.state === 'BLOCKED') {
    return (
      <div data-testid="delivery-auth-banner" className="p-3.5 rounded-xl border-2 border-rose-500 bg-rose-50/90 text-rose-950 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-700 text-white font-bold font-mono uppercase shrink-0">
            {customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' ? 'DELIVERY_BLOCKED_UNBUILDABLE' : 'EXPORT_BLOCKED'}
          </span>
          <span className="font-medium">Delivery Authorization blocked: {authState.reason}</span>
        </div>
      </div>
    );
  }
  if (authState.state === 'AUTHORIZED') {
    const manifestSuffix = authState.manifestFingerprint ? ` · manifest ${authState.manifestFingerprint.slice(0, 12)}` : '';
    return (
      <div data-testid="delivery-auth-banner" className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 text-emerald-950 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-700 text-white font-bold font-mono uppercase shrink-0">
            DELIVERY_AUTHORIZED
          </span>
          <span className="font-medium">
            Cryptographic Delivery Authorization active ({authState.tokenPrefix || 'DELIV-AUTH'}{manifestSuffix}). The server revalidates the stored run before export.
          </span>
        </div>
      </div>
    );
  }
  return null;
}

function EvidenceStatesBar({ evidence, authState }) {
  const authBadgeClass = authState.state === 'AUTHORIZED'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : 'bg-amber-50 border-amber-200 text-amber-900';
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white/80 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]">
          Vendor acceptance: <strong>{evidence.vendorAcceptance}</strong>
        </span>
        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]">
          Candidate Document Review: <strong>{evidence.candidateDocumentReview}</strong>
        </span>
        <span className={`px-2 py-0.5 rounded border font-mono text-[11px] ${authBadgeClass}`}>
          Delivery Authorization: <strong>{authState.state}</strong>
        </span>
      </div>
      <span className="text-[11px] text-slate-500">Changing the manifest requires new acceptance and delivery evidence.</span>
    </div>
  );
}

function ClusterSizingBanner({ cluster, clusterNodes, parentRunId }) {
  if (!cluster || clusterNodes <= 1) return null;
  const rackCount = cluster.standard42uRacksRequired ?? cluster.recommended42uRacks ?? null;
  const powerKw = cluster.totalFacilityPowerKw ?? cluster.peakFacilityPowerKw ?? null;
  const highLine = cluster.needsHighLine220v ?? cluster.deratingRequired ?? false;
  const railOk = cluster.railKitCoverage?.isCompliant ?? (cluster.railKitCoverage?.status === 'PASS');
  return (
    <div data-testid="cluster-sizing-banner" className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-bold text-sm">
          <span className="px-2 py-0.5 rounded text-xs bg-indigo-600 text-white font-mono">Cluster Infrastructure</span>
          <span>Multi-Node Tender Synthesis ({clusterNodes}x Nodes)</span>
          {parentRunId && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-white/80 border border-indigo-200 font-mono text-indigo-800">
              Parent: {String(parentRunId).slice(0, 18)}
            </span>
          )}
        </div>
        <p className="text-xs text-indigo-800">
          Total Rack Footprint: <strong>{cluster.totalRackUnits ?? 'N/A'} RU</strong> ({rackCount ?? 'N/A'} standard 42U racks) | Facility Peak Power: <strong>{powerKw ?? 'N/A'} kW</strong>
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs shrink-0">
        <span className={`px-2 py-1 rounded border font-medium ${highLine ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-emerald-100 border-emerald-300 text-emerald-900'}`}>
          {highLine ? '⚡ High-Line 200-240V Mandated' : '⚡ Standard Utility Power'}
        </span>
        <span className="px-2 py-1 rounded border bg-white/80 border-indigo-200 font-medium">
          Rail Kits: {railOk ? '✅ 100% Covered' : '⚠️ Missing Rail Kits'}
        </span>
      </div>
    </div>
  );
}

export default function MatrixStatusBanners({ evalResults }) {
  const cluster = evalResults?.clusterSizing;
  const clusterNodes = cluster?.totalServers || cluster?.serverCount || 0;
  const redundantDefaults = evalResults?.redundantDefaults || [];
  const discrepancies = evalResults?.opinionDiscrepancies || [];
  const evidence = deriveEvidenceStates(evalResults);
  const authState = evidence.deliveryAuthorization;

  return (
    <>
      {evalResults && <DeliveryAuthBanner authState={authState} customerDisposition={evalResults.customerDisposition} />}

      {evalResults?.isProvisional ? (
        <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="badge badge-amber font-mono font-bold animate-pulse">⏳ Provisional Matrix</span>
            <span className="font-medium">Candidate review remains incomplete. Consult the stage outcomes for local checks and cloud review status.</span>
          </div>
        </div>
      ) : evalResults?.ephemeralSourceValidation?.success === true ? (
        <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="badge badge-emerald font-mono font-bold">Grounded candidate review recorded</span>
            <span className="font-medium">Review source citations and manifest identity. Official vendor acceptance is a separate requirement.</span>
          </div>
        </div>
      ) : null}

      {evalResults && <EvidenceStatesBar evidence={evidence} authState={authState} />}
      {evalResults?.valueEngineering && <ValueEngineeringPanel valueEngineering={evalResults.valueEngineering} />}
      <ClusterSizingBanner cluster={cluster} clusterNodes={clusterNodes} parentRunId={evalResults?.parentRunId} />

      {redundantDefaults.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-white font-bold uppercase">Presales Advisory</span>
            <span>Chassis standard components detected in BOQ ({redundantDefaults.map(d => d.sku).join(', ')}). These are pre-included with base chassis and do not require re-ordering unless requested as maintenance spares.</span>
          </div>
        </div>
      )}

      {discrepancies.length > 0 && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-bold uppercase">Discrepancy Alert</span>
            <span>Grounding identified divergent constraints on {discrepancies.length} SKU(s). Presales engineering sign-off recommended before generating customer tender BOM.</span>
          </div>
        </div>
      )}
    </>
  );
}
