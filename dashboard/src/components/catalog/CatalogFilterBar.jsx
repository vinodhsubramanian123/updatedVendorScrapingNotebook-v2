import React from 'react';
import { FileSpreadsheet, GitCompare, Search, X } from 'lucide-react';

export default function CatalogFilterBar({
  chassisName,
  allSkusCount,
  uniqueSkusCount,
  displayedSkusCount,
  viewMode,
  setViewMode,
  showOnlyChanges,
  setShowOnlyChanges,
  changedCount,
  query,
  onQueryChange,
  onClearQuery,
  activeCategory,
  setActiveCategory,
  categories,
  activeSubCategory,
  setActiveSubCategory,
  availableSubCategories
}) {
  return (
    <div className="glass-card p-4 space-y-3 bg-white/95 shadow-xs border border-slate-200/80">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="truncate">{chassisName || 'Master Catalog'} Explorer</span>
          </h2>
          <p className="text-xs text-slate-500">
            Total SKU Category Mappings: <span className="font-semibold text-slate-800">{allSkusCount}</span> | Unique SKUs: <span className="font-semibold text-emerald-600">{uniqueSkusCount}</span> | Filtered: <span className="font-semibold text-blue-600">{displayedSkusCount}</span>
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex flex-wrap items-center p-1 bg-slate-100 rounded-lg border border-slate-200 gap-0.5 self-start lg:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            SKU Table View
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'analytics' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Price Variance & History
          </button>
          <button
            onClick={() => setViewMode('services')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'services' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Services & Support
          </button>
          <button
            onClick={() => setViewMode('obsolete')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'obsolete' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Lifecycle & Obsolete
          </button>
          <button
            onClick={() => setViewMode('rules')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'rules' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Rules Configuration
          </button>
        </div>
      </div>

      {/* Filter Row */}
      {(viewMode === 'table' || viewMode === 'services') && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={query}
              onChange={onQueryChange}
              placeholder="Search SKUs, descriptions, or specs..."
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            {query && (
              <button
                aria-label="Close"
                onClick={onClearQuery}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none min-w-[140px] max-w-[190px] truncate [color-scheme:light]"
          >
            <option value="ALL">All Categories</option>
            {categories.filter(c => c !== 'ALL').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={activeSubCategory}
            onChange={(e) => setActiveSubCategory(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none min-w-[155px] max-w-[210px] truncate [color-scheme:light]"
          >
            <option value="ALL">All Sub-Categories</option>
            {availableSubCategories.filter(s => s !== 'ALL').map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          <button
            onClick={() => setShowOnlyChanges(!showOnlyChanges)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border shadow-2xs cursor-pointer whitespace-nowrap shrink-0 ${
              showOnlyChanges
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Filter to only show SKUs with price or attribute changes"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Show Changes</span>
            {changedCount > 0 && (
              <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${
                showOnlyChanges ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {changedCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
