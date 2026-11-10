import React from 'react';
import { Cpu, Database, Zap, Layers, Activity } from 'lucide-react';

export default function WorkloadDnaCard({ dnaData }) {
  if (!dnaData) {
    return (
      <div className="glass-card p-6 text-center text-slate-400">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-600">No BOQ Evaluated Yet</p>
        <p className="text-[11px] text-slate-400">Upload a BOQ above to extract live Workload DNA profiling metrics.</p>
      </div>
    );
  }

  // Support both raw workloadDna payload and nested conflictGraph payload
  const dna = dnaData.workloadDna || dnaData;
  const totalCoresDisplay = Number.isFinite(dna.totalCores) ? `${dna.totalCores} Cores` : 'Not reported';
  const socketFreqDisplay = Number.isFinite(dna.maxFreqGhz) ? `${dna.maxFreqGhz}GHz` : 'Not reported';
  const ramPerCoreDisplay = dna.gbPerCore ? `${dna.gbPerCore} GB / Core` : (dna.totalMemoryGb && dna.totalCores ? `${Math.round(dna.totalMemoryGb / dna.totalCores)} GB / Core` : 'Standard Memory');
  const gpuCount = dna.gpuCount ?? (dna.hasGpu === false ? 0 : 'Not reported');
  const storageIoType = dna.workloadDescription || dna.storageWorkload || dna.storageType || 'Not assessed';
  const workloadIntent = dna.primaryWorkload || dna.intent || 'Not assessed';
  const confidenceScore = Number.isFinite(dna.confidence) ? `${Math.round(dna.confidence * (dna.confidence <= 1 ? 100 : 1))}%` : 'Not assessed';

  return (
    <div className="glass-card p-6 space-y-4 animate-fade-in-up delay-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Live Workload DNA Profiler
          </h3>
          <p className="text-xs text-slate-500">Detected Workload Intent: <span className="font-semibold text-blue-600">{workloadIntent}</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
            Workload data reported by the evaluation
          </span>
          <span className="badge bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
            Grounding and intent review are separate evidence
          </span>
          <span className="badge badge-emerald">DNA Confidence {confidenceScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Core Density */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase">CPU Core Density</p>
            <p className="text-sm font-bold text-slate-900">{totalCoresDisplay} ({socketFreqDisplay})</p>
          </div>
        </div>

        {/* RAM Density Ratio */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Memory Density</p>
            <p className="text-sm font-bold text-slate-900">{ramPerCoreDisplay}</p>
          </div>
        </div>

        {/* GPU Accelerator */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase">GPU Acceleration</p>
            <p className="text-sm font-bold text-slate-900">{gpuCount > 0 ? `${gpuCount}x Enterprise GPU` : 'Standard Compute'}</p>
          </div>
        </div>

        {/* Storage IO Profile */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Storage I/O Tier</p>
            <p className="text-xs font-bold text-slate-900 truncate">{storageIoType}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
