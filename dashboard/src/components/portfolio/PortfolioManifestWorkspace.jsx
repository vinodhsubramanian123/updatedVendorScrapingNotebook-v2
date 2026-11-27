import React, { useState, useEffect } from 'react';
import { Cpu, Globe, RefreshCw, ShieldCheck } from 'lucide-react';
import { requestJson } from '../../services/api.js';
import ChassisPortfolioTable from '../summary/ChassisPortfolioTable.jsx';
import RulesConfiguration from '../RulesConfiguration.jsx';

function VendorAdaptersStrip({ adapters = [] }) {
  if (adapters.length === 0) return null;
  return (
    <section className="surface-panel rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-indigo-600" />
          Dynamic Multi-Vendor Adapters ({adapters.length})
        </h3>
        <span className="badge badge-indigo">Normalized Cross-Vendor Registry</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {adapters.map(({ vendorId, descriptor }) => (
          <div key={vendorId} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900">{vendorId}</span>
              <span className="badge badge-emerald">{descriptor?.implementationStatus || 'IMPLEMENTED'}</span>
            </div>
            <div className="text-[11px] text-slate-600">
              Domains: <span className="font-mono">{(descriptor?.domains || []).join(', ')}</span>
            </div>
            {descriptor?.evidenceLimits?.[0] && (
              <p className="text-[11px] text-slate-500 leading-snug">{descriptor.evidenceLimits[0]}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductManifestsGrid({ manifests = [], selectedChassis, onSelectChassis }) {
  if (manifests.length === 0) return null;
  return (
    <section className="surface-panel rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Declarative Capability Manifests ({manifests.length})
        </h3>
        <span className="badge badge-emerald">Schema-Validated JSON Contracts</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {manifests.map(item => {
          const active = selectedChassis === item.productId;
          return (
            <button
              key={item.productId}
              type="button"
              onClick={() => onSelectChassis?.(item.productId)}
              className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                active
                  ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-slate-900 truncate">{item.displayName}</span>
                <span className="badge badge-blue shrink-0">{item.domain}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                <span>{item.family}</span>
                {item.formFactor && <span>· {item.formFactor}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function PortfolioManifestWorkspace({
  catalogs = [],
  catalogData,
  selectedChassis,
  onSelectChassis,
  currentCatObj
}) {
  const [manifests, setManifests] = useState([]);
  const [adapters, setAdapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      requestJson('/api/product-manifests', { signal: controller.signal }).catch(() => null),
      requestJson('/api/vendor-adapters', { signal: controller.signal }).catch(() => null)
    ]).then(([mRes, aRes]) => {
      if (controller.signal.aborted) return;
      if (Array.isArray(mRes?.manifests)) setManifests(mRes.manifests);
      if (Array.isArray(aRes?.adapters)) setAdapters(aRes.adapters);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const families = Array.from(new Set(catalogs.map(c => c.family).filter(Boolean)));
  const activeCatalogCount = catalogs.filter(c => !c.isQuarantinedStub).length;
  const quarantinedStubCount = catalogs.filter(c => c.isQuarantinedStub).length;
  const chassisDir = currentCatObj?.chassisDir || currentCatObj?.id || selectedChassis;

  return (
    <div className="space-y-5">
      <div className="surface-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            Portfolio, Capability Manifests & Multi-Vendor Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeCatalogCount} active product catalogs{quarantinedStubCount > 0 ? ` (${quarantinedStubCount} quarantined legacy stubs)` : ''} paired with declarative manifests and cross-vendor adapters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-emerald">{activeCatalogCount} Active</span>
          {quarantinedStubCount > 0 && <span className="badge badge-amber">{quarantinedStubCount} Quarantined Stubs</span>}
          {loading && (
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading manifests...
            </span>
          )}
        </div>
      </div>

      <VendorAdaptersStrip adapters={adapters} />
      <ProductManifestsGrid manifests={manifests} selectedChassis={selectedChassis} onSelectChassis={onSelectChassis} />

      <ChassisPortfolioTable
        variants={catalogs}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFamily={selectedFamily}
        setSelectedFamily={setSelectedFamily}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        families={families}
        selectedChassis={selectedChassis}
        onSelectChassis={onSelectChassis}
      />

      {chassisDir && (
        <RulesConfiguration catalogData={catalogData} chassisDir={chassisDir} chassisName={currentCatObj?.chassis || selectedChassis} />
      )}
    </div>
  );
}
