import React, { useState, useMemo } from 'react';
import { AlertTriangle, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { buildTopologyGraph, SUBSYSTEM_DEFS } from '../../services/topologyGraphBuilder';
import BoqTopologyCanvas from './BoqTopologyCanvas';
import BoqTopologyNodeInspector from './BoqTopologyNodeInspector';

export default function BoqTopologyModal({
  isOpen,
  evalResults,
  onOpenRag,
  onOpenMatrix,
  onOpenAmbiguity
}) {
  const [selectedRank, setSelectedRank] = useState('BASELINE');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedNode, setSelectedNode] = useState(null);

  // Build topology graph based on evalResults and selectedRank
  const graphData = useMemo(() => {
    return buildTopologyGraph(evalResults, selectedRank);
  }, [evalResults, selectedRank]);

  if (!isOpen) return null;

  return (
    <div className="space-y-4 text-slate-800">
      {/* Top Controls Bar: Rank Selector & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Rank Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 mr-1 uppercase tracking-wider">Topology View:</span>
          <button
            onClick={() => { setSelectedRank('BASELINE'); setSelectedNode(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedRank === 'BASELINE'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Customer Baseline (with Gaps)
          </button>

          {[1, 2, 3, 4, 5].map(rank => (
            <button
              key={rank}
              onClick={() => { setSelectedRank(rank); setSelectedNode(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
                String(selectedRank) === String(rank)
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Rank {rank} Resolved
            </button>
          ))}
        </div>

        {/* Stats Summary Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium">Nodes:</span>
            <span className="font-bold text-slate-900">{graphData.stats.totalNodes}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-800 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{graphData.stats.validCount} Valid</span>
          </div>

          {graphData.stats.fixCount > 0 && (
            <div className="flex items-center gap-1.5 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 text-sky-800 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>{graphData.stats.fixCount} Fixes</span>
            </div>
          )}

          {graphData.stats.gapCount > 0 && (
            <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-800 font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{graphData.stats.gapCount} Gaps</span>
            </div>
          )}

          {graphData.stats.ambiguityCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 text-amber-900 font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>{graphData.stats.ambiguityCount} Ambiguous (HITL)</span>
            </div>
          )}
        </div>
      </div>

      {/* Ambiguity Alert Banner */}
      {graphData.stats.ambiguityCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-950 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>{graphData.stats.ambiguityCount} SKU(s) / subsystem connections</strong> require Human-in-the-Loop clarification (unverified by NotebookLM / local rules).
            </span>
          </div>
          {onOpenAmbiguity && (
            <button
              onClick={() => onOpenAmbiguity()}
              className="btn-primary text-xs py-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0"
            >
              Open Ambiguity Inbox
            </button>
          )}
        </div>
      )}

      {/* Subsystem Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/80 p-2 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="badge badge-blue font-bold px-2 py-0.5">
            {graphData.diagnostics?.productFamily || 'ProLiant'}
          </span>
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeFilter === 'ALL'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Subsystems
          </button>
          {SUBSYSTEM_DEFS.map(sub => (
            <button
              key={sub.id}
              onClick={() => setActiveFilter(sub.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeFilter === sub.id
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sub.label}
            </button>
          ))}
          <button
            onClick={() => setActiveFilter('GAPS')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all text-rose-700 ${
              activeFilter === 'GAPS'
                ? 'bg-rose-100/80 text-rose-900 shadow-sm border border-rose-200'
                : 'hover:bg-rose-50'
            }`}
          >
            ⚠️ Gaps & Fixes
          </button>
          {graphData.stats.ambiguityCount > 0 && (
            <button
              onClick={() => setActiveFilter('AMBIGUITIES')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-amber-900 ${
                activeFilter === 'AMBIGUITIES'
                  ? 'bg-amber-200 text-amber-950 shadow-sm border border-amber-300'
                  : 'hover:bg-amber-100 text-amber-800'
              }`}
            >
              ⚠️ Ambiguities ({graphData.stats.ambiguityCount})
            </button>
          )}
        </div>

        {onOpenMatrix && (
          <button
            onClick={onOpenMatrix}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1 shadow-none"
          >
            Open 5-Tier Strategy Matrix
          </button>
        )}
      </div>

      {/* Main Canvas & Inspector Area */}
      <div className="relative flex overflow-hidden rounded-xl">
        <div className="flex-1">
          <BoqTopologyCanvas
            graphData={graphData}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            activeFilter={activeFilter}
          />
        </div>

        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0">
            <BoqTopologyNodeInspector
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onOpenRag={onOpenRag}
              onOpenAmbiguity={onOpenAmbiguity}
            />
          </div>
        )}
      </div>

      {/* Diagnostic & Telemetry Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 text-slate-300 rounded-xl text-[11px] font-mono border border-slate-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-slate-400">
            Family: <strong className="text-white font-bold">{graphData.diagnostics?.productFamily || 'ProLiant'}</strong>
          </span>
          {graphData.diagnostics?.subProductsCount > 0 && (
            <span className="flex items-center gap-1 text-sky-400">
              Modular Sub-Products: <strong className="text-sky-300 font-bold">{graphData.diagnostics.subProductsCount}</strong>
            </span>
          )}
          <span className="flex items-center gap-1 text-slate-400">
            SKUs Mapped: <strong className="text-emerald-400 font-bold">{graphData.diagnostics?.totalSkusMapped || 0}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-slate-400">
            Topology Completeness: 
            <strong className={`font-bold ${
              graphData.diagnostics?.completenessScore === 100 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {graphData.diagnostics?.completenessScore || 100}%
            </strong>
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            Render: <strong className="text-slate-300 font-normal">~{graphData.diagnostics?.renderLatencyMs || 2}ms</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
