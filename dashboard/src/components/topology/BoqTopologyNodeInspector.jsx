import React from 'react';
import { X, ShieldCheck, AlertTriangle, Cpu, Layers, HardDrive, Network, Zap, CheckCircle2, Sparkles } from 'lucide-react';

const SUBSYSTEM_ICONS = {
  COMPUTE: Cpu,
  MEMORY: Layers,
  STORAGE: HardDrive,
  PCIE_NETWORK: Network,
  POWER_THERMAL: Zap,
  SERVICES: ShieldCheck,
  ROOT: ServerIcon
};

function ServerIcon(props) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <rect x="2" y="2" width="20" height="8" rx="2" strokeWidth="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2" strokeWidth="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3"/>
      <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3"/>
    </svg>
  );
}

export default function BoqTopologyNodeInspector({ node, onClose, onOpenRag }) {
  if (!node) return null;

  const IconComponent = SUBSYSTEM_ICONS[node.subsystem] || Cpu;
  const isGap = node.type === 'GAP_MISSING';
  const isFix = node.status === 'FIX_APPLIED';
  const isRoot = node.type === 'CHASSIS_ROOT';
  const isHub = node.type === 'SUBSYSTEM_HUB';

  return (
    <div className="w-80 sm:w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg border ${
            isGap 
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : isFix
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <IconComponent className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {isRoot ? 'Base Chassis' : isHub ? 'Subsystem Bus' : isGap ? 'Missing Gap' : 'Component SKU'}
            </span>
            <h4 className="font-bold text-slate-900 text-sm truncate max-w-[200px]">
              {node.sku || node.label}
            </h4>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {/* Status Alert */}
        {isGap ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-800">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Dependency Missing from BOQ
            </div>
            <p className="text-[11px] leading-relaxed">{node.reason}</p>
            {node.suggestedFix && (
              <div className="mt-2 pt-2 border-t border-rose-200/60 font-medium">
                <span className="text-slate-600 block text-[10px]">Suggested Resolution:</span>
                <span className="text-rose-900 font-bold">{node.suggestedFix}</span>
              </div>
            )}
          </div>
        ) : isFix ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-blue-800">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              Strategy Matrix Applied Fix
            </div>
            <p className="text-[11px] leading-relaxed">{node.rationale || 'Auto-injected compliant replacement SKU.'}</p>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Verified Buildable & Connected
          </div>
        )}

        {/* Node Properties */}
        <div className="space-y-2 border border-slate-100 bg-slate-50/70 p-3 rounded-xl">
          <h5 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Topology Metadata</h5>
          
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">Subsystem:</span>
              <span className="font-semibold text-slate-700">{node.subsystem}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Category:</span>
              <span className="font-semibold text-slate-700 truncate block">{node.category || 'System Option'}</span>
            </div>
            {node.quantity !== undefined && (
              <div>
                <span className="text-slate-400 block">Quantity:</span>
                <span className="font-semibold text-slate-700">{node.quantity} units</span>
              </div>
            )}
            {node.unitPriceUsd > 0 && (
              <div>
                <span className="text-slate-400 block">Unit List Price:</span>
                <span className="font-bold font-mono text-emerald-700">${node.unitPriceUsd.toLocaleString()}</span>
              </div>
            )}
            {node.extendedPriceUsd > 0 && (
              <div className="col-span-2 pt-1 border-t border-slate-200/50">
                <span className="text-slate-400 block">Extended Price:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">${node.extendedPriceUsd.toLocaleString()} USD</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <h5 className="font-bold text-slate-800 text-[11px] mb-1">Part Description</h5>
          <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
            {node.label}
          </p>
        </div>

        {/* Chassis details if root */}
        {isRoot && node.details && (
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <h5 className="font-bold text-slate-800 text-[11px]">Chassis Envelope Specs</h5>
            <div className="text-[11px] space-y-1 text-slate-600">
              <div className="flex justify-between"><span>Form Factor:</span><strong className="text-slate-800">{node.details.formFactor}</strong></div>
              <div className="flex justify-between"><span>Max Sockets:</span><strong className="text-slate-800">{node.details.maxSockets}</strong></div>
              <div className="flex justify-between"><span>Max DIMM Slots:</span><strong className="text-slate-800">{node.details.maxDimms}</strong></div>
              <div className="flex justify-between"><span>PCIe Slots:</span><strong className="text-slate-800">{node.details.maxPcieSlots}</strong></div>
              <div className="flex justify-between"><span>Detected CPU TDP:</span><strong className="text-slate-800">{node.details.detectedTdp}W</strong></div>
            </div>
          </div>
        )}

        {/* Quick Grounding Action */}
        {onOpenRag && (
          <button
            onClick={() => onOpenRag(node.sku || node.label)}
            className="w-full btn-secondary text-xs flex items-center justify-center gap-1.5 mt-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Query NotebookLM Grounding
          </button>
        )}
      </div>
    </div>
  );
}
