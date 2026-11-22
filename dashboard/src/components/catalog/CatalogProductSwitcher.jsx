import React from 'react';
import { Tag } from 'lucide-react';

export default function CatalogProductSwitcher({ catalogs = [], selectedChassis, onSelectChassis }) {
  if (!catalogs || catalogs.length === 0) return null;

  return (
    <div className="glass-card px-3.5 py-2.5 bg-white/95 rounded-2xl border border-slate-200 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <Tag className="w-3.5 h-3.5 text-blue-600" />
          Catalogs ({catalogs.length}):
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-nav min-w-0">
          {catalogs.map(c => {
            const isSelected = c.id === selectedChassis;
            return (
              <button
                key={c.chassisDir || c.id}
                type="button"
                onClick={() => onSelectChassis && onSelectChassis(c.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <span>{c.chassis}</span>
                <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {c.totalSKUs}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
