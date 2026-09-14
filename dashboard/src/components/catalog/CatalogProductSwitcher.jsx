import React from 'react';
import { Tag } from 'lucide-react';

export default function CatalogProductSwitcher({ catalogs = [], selectedChassis, onSelectChassis }) {
  if (!catalogs || catalogs.length === 0) return null;

  return (
    <div className="glass-card p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            Select Hardware Catalog:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectChassis && onSelectChassis('')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              !selectedChassis
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Products ({catalogs.length})
          </button>
          {catalogs.map(c => {
            const isSelected = c.id === selectedChassis;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectChassis && onSelectChassis(c.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <span>{c.chassis}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
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
