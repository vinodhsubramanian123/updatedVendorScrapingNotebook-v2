import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function VendorMatchTable({
  auditReport,
  _getCategoryStyle
}) {
  if (!auditReport) return null;

  const discrepancies = auditReport.discrepancies || {};
  const matches = discrepancies.matches || [];
  const addedByVendor = discrepancies.addedByVendor || [];
  const missingFromVendor = discrepancies.missingFromVendor || [];
  const quantityMismatches = discrepancies.quantityMismatches || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <span className="text-[11px] text-emerald-800 font-medium">Exact SKU Matches</span>
          <p className="font-bold text-emerald-900 text-lg">{matches.length}</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
          <span className="text-[11px] text-purple-800 font-medium">Auto-Inserted / Vendor Extra</span>
          <p className="font-bold text-purple-900 text-lg">{addedByVendor.length}</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
          <span className="text-[11px] text-amber-800 font-medium">Missing from Vendor</span>
          <p className="font-bold text-amber-900 text-lg">{missingFromVendor.length}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <span className="text-[11px] text-blue-800 font-medium">Qty Mismatches</span>
          <p className="font-bold text-blue-900 text-lg">{quantityMismatches.length}</p>
        </div>
      </div>

      {addedByVendor.length > 0 && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
            Vendor Extra / Auto-Inserted SKUs (Potential New Catalog Rule):
          </div>
          <div className="max-h-40 overflow-y-auto border border-purple-200 rounded-lg text-xs bg-white">
            <table className="w-full text-left">
              <thead className="bg-purple-100/60 text-purple-900 font-semibold sticky top-0">
                <tr>
                  <th className="px-3 py-1.5">Vendor Qty</th>
                  <th className="px-3 py-1.5">SKU</th>
                  <th className="px-3 py-1.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {addedByVendor.map((it, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/50 font-mono text-[11px]">
                    <td className="px-3 py-1.5 font-bold text-purple-900">{it.quantity}x</td>
                    <td className="px-3 py-1.5 font-bold text-slate-900">{it.sku}</td>
                    <td className="px-3 py-1.5 text-slate-700 font-sans">{it.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-2">
          <span className="font-bold text-emerald-900 text-xs block">
            Verified Matching Components ({matches.length} SKUs):
          </span>
          <div className="max-h-36 overflow-y-auto border border-emerald-200 rounded-lg text-xs bg-white">
            <table className="w-full text-left">
              <thead className="bg-emerald-100/60 text-emerald-900 font-semibold sticky top-0">
                <tr>
                  <th className="px-3 py-1.5">Qty</th>
                  <th className="px-3 py-1.5">SKU</th>
                  <th className="px-3 py-1.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {matches.map((it, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/50 font-mono text-[11px]">
                    <td className="px-3 py-1.5 font-bold text-emerald-900">{it.quantity}x</td>
                    <td className="px-3 py-1.5 font-semibold text-slate-900">{it.sku}</td>
                    <td className="px-3 py-1.5 text-slate-700 font-sans">{it.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
