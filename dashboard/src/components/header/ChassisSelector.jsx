import React from 'react';
import { Server, ChevronDown, Check, RefreshCw } from 'lucide-react';

export default function ChassisSelector({
  catalogs = [],
  selectedChassis,
  onSelectChassis,
  isChassisOpen,
  setIsChassisOpen,
  chassisFilter,
  setChassisFilter,
  chassisDropdownRef,
  isCatalogLoading
}) {
  const filteredCatalogs = catalogs.filter(c => {
    const term = chassisFilter.toLowerCase();
    return (
      (c.id && c.id.toLowerCase().includes(term)) ||
      (c.model && c.model.toLowerCase().includes(term)) ||
      (c.family && c.family.toLowerCase().includes(term))
    );
  });

  const currentChassisObj = catalogs.find(c => c.id === selectedChassis) || {
    id: selectedChassis || 'DL380_Gen12',
    model: selectedChassis || 'DL380 Gen12',
    family: 'ProLiant'
  };

  return (
    <div className="relative" ref={chassisDropdownRef}>
      <button
        onClick={() => setIsChassisOpen(!isChassisOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 transition-colors text-xs font-semibold text-slate-800"
      >
        <Server className="w-4 h-4 text-emerald-600 shrink-0" />
        <div className="text-left truncate max-w-[130px] sm:max-w-[160px]">
          <span className="block text-[10px] text-slate-500 font-normal leading-none">Chassis Context</span>
          <span className="font-bold truncate">{currentChassisObj.model || currentChassisObj.id}</span>
        </div>
        {isCatalogLoading ? (
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </button>

      {isChassisOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 space-y-2 animate-in fade-in duration-150">
          <input
            type="text"
            value={chassisFilter}
            onChange={e => setChassisFilter(e.target.value)}
            placeholder="Search chassis..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
            autoFocus
          />

          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredCatalogs.length === 0 ? (
              <p className="text-[11px] text-slate-400 p-2 text-center">No matching chassis found</p>
            ) : (
              filteredCatalogs.map(c => {
                const isSelected = c.id === selectedChassis;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectChassis(c.id);
                      setIsChassisOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="leading-tight">{c.model || c.id}</p>
                      <span className="text-[10px] text-slate-400 font-normal">{c.family || 'ProLiant'} • {c.gen || 'Gen12'}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
