import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, X, Zap, Cpu, HardDrive, Power, Award, Layers } from 'lucide-react';
import RuleLogicVisualizer from './RuleLogicVisualizer';

export default function ConflictGraphInspector({ evalResults, chassisName, selectedChassis }) {
  const [showClicModal, setShowClicModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showClicModal) setShowClicModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showClicModal]);

  // Extract dynamic physical checks from evalResults if available
  const rawAspects = evalResults?.physicalChecks || evalResults?.aspectChecks;

  const aspectIcons = { Cpu, HardDrive, Zap, Power, Award, Layers, ShieldCheck };

  // Dynamic modular aspect definitions — reads from eval payload when available
  const defaultAspects = [
    { id: 1, name: 'Thermal & Compute Math', iconType: 'Cpu', defaultRule: 'CPU TDP thermal envelope vs cooling kit population rules' },
    { id: 2, name: 'Memory & Channel Balance', iconType: 'Memory', defaultRule: 'Memory interleaving, channel balance & population rules' },
    { id: 3, name: 'Storage & Controller Cabling', iconType: 'HardDrive', defaultRule: 'Storage controller, drive cage & cable kit compatibility checks' },
    { id: 4, name: 'PCIe Riser & Slot Expansion Math', iconType: 'Layers', defaultRule: 'PCIe slot capacity, riser lane allocation & GPU expansion rules' },
    { id: 5, name: 'Networking & OCP Interconnect', iconType: 'Zap', defaultRule: 'OCP 3.0 network adapter slots and port allocation rules' },
    { id: 6, name: 'Power & Redundancy Math', iconType: 'Power', defaultRule: 'Power supply redundancy rating & auxiliary kit requirements' },
    { id: 7, name: 'Vendor Support Taxonomy', iconType: 'Award', defaultRule: 'Hardware SKU validation against mandatory support SLA tiers' }
  ];

  const dataSource = rawAspects && rawAspects.length > 0 ? rawAspects : defaultAspects;

  const aspects = dataSource.map((def, idx) => {
    const isEvaluated = !!evalResults;
    const passed = def.status === 'PASS';
    let detail = def.detail || def.defaultRule;
    let status = def.status || (!isEvaluated ? 'PENDING' : 'PASS');

    // If using default aspects (no backend payload), try to fallback to mathDeductions mapping
    if (isEvaluated && !rawAspects && evalResults.mathDeductions) {
      const keyword = def.name.split(' ')[0]; // e.g., "Thermal", "Memory", "Storage", "PCIe", "Power", "Vendor"
      const matchedDeduction = evalResults.mathDeductions.find(d => 
        d.includes(keyword) || 
        (keyword === 'Thermal' && d.includes('Compute')) ||
        (keyword === 'Vendor' && d.includes('Support')) ||
        (keyword === 'PCIe' && d.includes('PCIe'))
      );

      if (matchedDeduction) {
        
        status = 'FAIL';
        detail = matchedDeduction;
      }
    }

    return {
      ...def,
      id: def.id || (idx + 1),
      name: def.name,
      status,
      detail,
      iconType: def.iconType || 'ShieldCheck'
    };
  });

  const overallPass = evalResults ? aspects.every(a => a.status === 'PASS') : null;

  return (
    <div className="space-y-6">
      {/* Aspect Checklist Card */}
      <div className="glass-card p-6 animate-fade-in-up delay-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Dynamic Multi-Aspect Constraint Engine
            </h2>
            <p className="text-xs text-slate-500">
              Automated pre-flight physical rules audit for <span className="font-semibold text-slate-800">{chassisName || 'Selected Solution'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {overallPass !== null && (
              <span className={`badge ${overallPass ? 'badge-emerald' : 'badge-amber'}`}>
                {overallPass ? '100% VERIFIED PASS' : 'PHYSICAL CONFLICT DETECTED'}
              </span>
            )}
            <button
              onClick={() => setShowClicModal(true)}
              className="btn-secondary text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Inspect CLIC Errors
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aspects.map(asp => {
            const Icon = aspectIcons[asp.iconType] || ShieldCheck;
            const isPass = asp.status === 'PASS';
            const isPending = asp.status === 'PENDING';

            return (
              <div
                key={asp.id}
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  isPending
                    ? 'bg-slate-50 border-slate-200/80'
                    : isPass
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-rose-50/80 border-rose-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                    isPending
                      ? 'bg-slate-200 text-slate-800'
                      : isPass
                      ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100/90 text-rose-800 border border-rose-300'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.25px]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900">{asp.id}. {asp.name}</h4>
                    <span
                      className={`badge ${
                        isPending ? 'badge-amber' : isPass ? 'badge-emerald' : 'badge-amber'
                      }`}
                    >
                      {isPending ? 'PENDING EVAL' : isPass ? 'PASS' : 'VIOLATION'}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 ${isPass || isPending ? 'text-slate-600' : 'text-rose-700 font-semibold'}`}>{asp.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scraped Rule Logic Visualizer Tree Diagram */}
      <RuleLogicVisualizer
        selectedChassis={selectedChassis || 'Unknown Chassis'}
        evalResults={evalResults}
        chassisName={chassisName}
      />

      {/* CLIC Error Modal */}
      {showClicModal && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowClicModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Vendor Portal Error &amp; CLIC Inspector
              </h3>
              <button onClick={() => setShowClicModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2">
              {evalResults?.clicErrors && evalResults.clicErrors.length > 0 ? (
                evalResults.clicErrors.map((err, i) => (
                  <div key={i} className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{err.code || `Portal Violation ${i+1}`}</p>
                      <p className="text-[11px] text-rose-800 mt-0.5">{err.message || err}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Zero Portal Configuration Errors</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      The evaluated solution passes 100% of vendor portal factory constraints &amp; physical rules.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setShowClicModal(false)} className="w-full mt-4 btn-secondary justify-center text-xs">
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
