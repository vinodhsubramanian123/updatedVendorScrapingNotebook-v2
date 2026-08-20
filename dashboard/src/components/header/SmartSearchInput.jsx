import React from 'react';
import { Search, Sparkles, ArrowRight } from 'lucide-react';

export default function SmartSearchInput({
  searchQuery,
  setSearchQuery,
  isSearchOpen,
  setIsSearchOpen,
  localSearchResults,
  onSubmitSearch,
  onOpenRag,
  searchContainerRef
}) {
  return (
    <div className="relative flex-1 max-w-md hidden md:block" ref={searchContainerRef}>
      <form onSubmit={onSubmitSearch} className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          placeholder="Search catalog SKUs, rules or ask NotebookLM..."
          className="w-full text-xs bg-slate-100/90 border border-slate-200 rounded-xl pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ×
          </button>
        )}
      </form>

      {isSearchOpen && searchQuery.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-3 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-700">
              Matching SKUs in Current Catalog ({localSearchResults.skus.length}):
            </span>
            <button
              onClick={() => onOpenRag(searchQuery)}
              className="text-emerald-700 font-semibold flex items-center gap-1 hover:underline text-[10px]"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Ask NotebookLM
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {localSearchResults.skus.length === 0 ? (
              <p className="text-[11px] text-slate-400 p-2 text-center">
                No matching SKU found locally. Click &quot;Ask NotebookLM&quot; for RAG lookup.
              </p>
            ) : (
              localSearchResults.skus.map((sku, sIdx) => (
                <div
                  key={sIdx}
                  className="p-2 hover:bg-slate-50 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer"
                  onClick={() => onOpenRag(`Tell me the rules and dependencies for SKU ${sku.sku}`)}
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900">{sku.sku}</span>
                    <p className="text-[11px] text-slate-500 truncate max-w-[280px]">{sku.description}</p>
                  </div>
                  <span className="font-mono text-emerald-700 text-xs font-bold shrink-0 ml-2">{sku.price}</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => onOpenRag(searchQuery)}
              className="text-[11px] btn-primary py-1 px-2.5 flex items-center gap-1"
            >
              <span>Query Gemini RAG</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
