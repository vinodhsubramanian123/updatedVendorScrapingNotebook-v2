import React from 'react';
import { Search, CheckCircle2, FileSpreadsheet, FileText } from 'lucide-react';

export default function ChassisPortfolioTable({
  variants = [],
  searchTerm,
  setSearchTerm,
  selectedFamily,
  setSelectedFamily,
  selectedStatus,
  setSelectedStatus,
  families = [],
  selectedChassis,
  onSelectChassis
}) {
  const filteredVariants = variants.filter(v => {
    const matchesSearch = !searchTerm.trim() ||
      v.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.family?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = selectedFamily === 'ALL' || v.family === selectedFamily;
    const matchesStatus = selectedStatus === 'ALL' ||
      (selectedStatus === 'HEALTHY' && v.health === 'HEALTHY') ||
      (selectedStatus === 'PARTIAL' && v.health === 'PARTIAL');
    return matchesSearch && matchesFamily && matchesStatus;
  });

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Portfolio Hardware & Rule Intelligence</h3>
          <p className="text-xs text-slate-500">Cross-generational coverage across all registered platforms</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search platform, model..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-48 lg:w-60"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['ALL', 'HEALTHY', 'PARTIAL'].map(s => (
              <button
                key={s}
                onClick={() => setSelectedStatus?.(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatus === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s === 'ALL' ? 'All Status' : s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedFamily('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFamily === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            {families.map(f => (
              <button
                key={f}
                onClick={() => setSelectedFamily(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedFamily === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Platform & Generation</th>
              <th className="py-3 px-4">Catalog Status</th>
              <th className="py-3 px-4">Scraped SKUs</th>
              <th className="py-3 px-4">Rules & Math</th>
              <th className="py-3 px-4">Documents</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredVariants.map(v => {
              const isSelected = selectedChassis === v.id;
              return (
                <tr
                  key={v.id}
                  className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{v.model || v.id}</span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {v.family} • {v.gen}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{v.skuStatus || 'PARSED'}</span>
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-700">{v.totalSKUs || 0}</span>
                    <span className="text-slate-400 text-[11px] ml-1">SKUs</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-purple-700">{v.totalRules || 0}</span>
                    <span className="text-slate-400 text-[11px] ml-1">Rules</span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {v.xlsxPath && (
                        <a href={v.xlsxPath} download className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Excel Catalog">
                          <FileSpreadsheet className="w-4 h-4" />
                        </a>
                      )}
                      {v.pdfPath && (
                        <a href={v.pdfPath} target="_blank" rel="noreferrer" className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="QuickSpecs PDF">
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectChassis?.(v.id)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
