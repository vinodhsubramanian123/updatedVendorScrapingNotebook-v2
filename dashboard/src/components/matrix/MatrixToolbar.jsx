import React from 'react';
import { AlertTriangle, Network, Upload } from 'lucide-react';

export default function MatrixToolbar({
  viewMode,
  setViewMode,
  evalResults,
  onTriggerDemoBoq,
  exportError,
  onOpenTopology,
  onOpenUploader
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-emerald">Strategy Matrix</span>
            <span className="text-xs text-slate-500 font-mono">Rank 1–5 Multi-Metric Tradeoffs</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Multi-Tier Strategic Resolution Matrix</h2>
          <p className="text-xs text-slate-500">
            Compare ranked candidate BOMs across CapEx budget, workload DNA intent, and strict hardware buildability.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {onOpenTopology && evalResults && (
            <button
              onClick={onOpenTopology}
              className="btn-secondary text-xs flex items-center gap-1.5 text-emerald-800 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 whitespace-nowrap"
            >
              <Network className="w-3.5 h-3.5 text-emerald-600" />
              Visual Topology
            </button>
          )}

          {onOpenUploader && (
            <button
              onClick={onOpenUploader}
              className="btn-primary text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Load / Evaluate BOQ
            </button>
          )}

          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tier Cards
            </button>
            <button
              onClick={() => setViewMode('vertical-matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'vertical-matrix'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Side-by-Side Matrix
            </button>
          </div>

          {!evalResults && onTriggerDemoBoq && (
            <button
              onClick={() => onTriggerDemoBoq()}
              className="btn-secondary text-xs whitespace-nowrap"
            >
              Load Demo BOQ
            </button>
          )}
        </div>
      </div>

      {exportError && (
        <div className="w-full p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Export failed: {exportError}</span>
        </div>
      )}
    </div>
  );
}
