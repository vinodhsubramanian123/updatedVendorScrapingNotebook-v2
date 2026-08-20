import React from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CleansingAuditLedger({ cleansingLogs = [] }) {
  return (
    <div className="mt-8">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-600 stroke-[2.25px]" /> 5-Stage Cleansing &amp; Pre-Validation Subflow Audit Ledger
      </h3>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5">Timestamp</th>
              <th className="px-4 py-2.5">BOQ Document</th>
              <th className="px-4 py-2.5">Base Chassis</th>
              <th className="px-4 py-2.5">Stages Cleared</th>
              <th className="px-4 py-2.5">Fractional Math Anomaly</th>
              <th className="px-4 py-2.5">Cleansing Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cleansingLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No cleansing subflow records in current session. Upload or paste a BOQ to audit preflight math.
                </td>
              </tr>
            ) : (
              cleansingLogs.slice(0, 10).map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-semibold text-slate-800">{log.boqFile}</td>
                  <td className="px-4 py-2 text-slate-600 font-mono">{log.baseChassisQty}x ({log.baseChassisSku})</td>
                  <td className="px-4 py-2 font-bold text-indigo-700">{log.stagesCleared}/{log.totalStages} Stages</td>
                  <td className="px-4 py-2">
                    {log.hasNonIntegerFraction ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 stroke-[2.25px]" /> Fractional Remainder Flagged
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.25px]" /> Integer Multiples Valid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${log.hasNonIntegerFraction ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
