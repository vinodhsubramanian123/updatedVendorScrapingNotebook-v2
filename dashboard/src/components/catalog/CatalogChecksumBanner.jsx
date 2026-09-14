import React from 'react';
import { Zap } from 'lucide-react';

export default function CatalogChecksumBanner({ showOnlyChanges, incrStats = {}, allSkusCount = 0, changedCount = 0 }) {
  if (!showOnlyChanges && !(incrStats.unchangedSkusCount > 0)) return null;

  const unchanged = incrStats.unchangedSkusCount || (allSkusCount - changedCount);
  const tokenSavings = incrStats.estimatedTokensSaved || (unchanged * 150);

  return (
    <div className="glass-card p-4 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 via-white to-blue-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
            Incremental Hash-Based Checksum Comparison
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Active Differential Pipeline
          </span>
        </div>
        <p className="text-xs text-slate-600">
          Deterministic SHA-256 hashes verified <span className="font-bold text-slate-900">{unchanged}</span> unchanged SKUs. Skipped re-classification to preserve pipeline speed and minimize API token usage.
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs shrink-0">
        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Token Savings</div>
          <div className="text-sm font-black text-emerald-600">~{tokenSavings.toLocaleString()} Tokens</div>
        </div>
        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Changed SKUs</div>
          <div className="text-sm font-black text-amber-600">{changedCount} SKUs</div>
        </div>
      </div>
    </div>
  );
}
