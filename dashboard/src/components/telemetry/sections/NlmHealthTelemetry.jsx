import React from 'react';
import { Server } from 'lucide-react';

export default function NlmHealthTelemetry({ nlmHealth, nlmMetrics }) {
  if (!nlmHealth) return null;

  return (
    <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Server className="w-4 h-4 text-blue-600" /> NotebookLM RAG Observability &amp; Telemetry
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">MCP CLI Health</span>
          <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${nlmHealth.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            {nlmHealth.status} ({nlmHealth.notebooksFound !== undefined ? nlmHealth.notebooksFound : 0} Notebooks)
          </span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Avg RAG Latency</span>
          <span className="font-bold font-mono text-blue-700 text-sm mt-0.5 block">
            {nlmMetrics.avgNlmResponseTimeMs ? `${nlmMetrics.avgNlmResponseTimeMs}ms` : 'N/A'}
          </span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Agreement Index</span>
          <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
            {nlmMetrics.nlmAgreementIndex !== undefined ? `${nlmMetrics.nlmAgreementIndex}%` : 'N/A'}
          </span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Citation Match Rate</span>
          <span className="font-bold text-purple-700 text-sm mt-0.5 block">
            {nlmMetrics.nlmCitationMatchRate !== undefined ? `${nlmMetrics.nlmCitationMatchRate}%` : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}
