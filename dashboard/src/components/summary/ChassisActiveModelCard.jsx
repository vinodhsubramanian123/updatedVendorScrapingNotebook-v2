import React from 'react';
import { FileSpreadsheet, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ChassisActiveModelCard({
  activeProductModel,
  activeProductBaseVariants = [],
  selectedChassis,
  onNavigateTab
}) {
  if (!activeProductModel) return null;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold uppercase tracking-wider">
              {activeProductModel.family} • {activeProductModel.gen}
            </span>
            <span className="text-xs font-semibold text-slate-400">Active Chassis Context</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{activeProductModel.model || selectedChassis}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Form Factor: {activeProductModel.formFactor || 'Standard Server Chassis'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeProductModel.xlsxPath && (
            <a
              href={activeProductModel.xlsxPath}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Catalog Excel</span>
            </a>
          )}
          {activeProductModel.pdfPath && (
            <a
              href={activeProductModel.pdfPath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>QuickSpecs PDF</span>
            </a>
          )}
          <button
            onClick={() => onNavigateTab?.('catalog')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activeProductBaseVariants.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Base CTO Server Chassis Variants ({activeProductBaseVariants.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Part #</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Option Type</th>
                  <th className="py-2.5 px-3">Constraint</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activeProductBaseVariants.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{v.sku}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{v.desc}</td>
                    <td className="py-2.5 px-3 text-slate-500">{v.optionType}</td>
                    <td className="py-2.5 px-3 text-slate-500">{v.constraint}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{v.price}</td>
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
