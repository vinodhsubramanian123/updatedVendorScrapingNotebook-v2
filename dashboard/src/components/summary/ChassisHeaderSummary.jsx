import React from 'react';
import { Server, Layers, Database, ShieldCheck } from 'lucide-react';

export default function ChassisHeaderSummary({ summary, onTriggerSyncKnowledge, isTaskRunning }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certified Portfolio</span>
          <Server className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-800 tracking-tight">{summary.totalProducts || 0}</span>
          <span className="text-xs text-emerald-600 font-medium">100% Certified</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Across 5 Product Families</div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scraped SKUs</span>
          <Layers className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-800 tracking-tight">{(summary.totalSKUs || 0).toLocaleString()}</span>
          <span className="text-xs text-blue-600 font-medium">Live Catalog</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Hardware + Service SKUs</div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Rules & Math</span>
          <ShieldCheck className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-800 tracking-tight">{summary.totalRules || 0}</span>
          <span className="text-xs text-purple-600 font-medium">5-Level Hierarchy</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Physical Constraints</div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">NotebookLM RAG</span>
            <Database className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-700">Multi-Product Synced</span>
          </div>
        </div>
        <button
          onClick={onTriggerSyncKnowledge}
          disabled={isTaskRunning}
          className="mt-2 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
        >
          <span>Sync All to NLM</span>
        </button>
      </div>
    </div>
  );
}
