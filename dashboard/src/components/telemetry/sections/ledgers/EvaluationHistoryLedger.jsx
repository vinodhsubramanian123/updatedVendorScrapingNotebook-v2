import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDuration, formatBoqFileName } from '../../../../utils/formatters';

export default function EvaluationHistoryLedger({ history = [] }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Evaluation Run History Ledger</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5">Timestamp</th>
              <th className="px-4 py-2.5">BOQ Input</th>
              <th className="px-4 py-2.5">Chassis Model</th>
              <th className="px-4 py-2.5">Confidence</th>
              <th className="px-4 py-2.5">Violations / Warnings</th>
              <th className="px-4 py-2.5">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No evaluation history recorded yet. Run a BOQ evaluation to populate telemetry.
                </td>
              </tr>
            ) : (
              history.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-semibold text-slate-800 max-w-[240px] truncate" title={entry.boqFile || 'Inline BOQ Input'}>
                    {formatBoqFileName(entry.boqFile)}
                  </td>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{entry.chassisModel}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`badge ${entry.confidenceScore >= 0.75 ? 'badge-emerald' : 'badge-amber'}`}>
                      {Math.round(entry.confidenceScore * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {entry.criticalViolationsCount > 0 ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {entry.criticalViolationsCount} {entry.criticalViolationsCount === 1 ? 'Violation' : 'Violations'}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Clean Pass
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {formatDuration(entry.durationMs)}
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
