import { useState } from 'react';
import { Layers, ChevronDown, Search } from 'lucide-react';

export default function CatalogProductSwitcher({ catalogs = [], selectedChassis, onSelectChassis }) {
  const [filter, setFilter] = useState('');
  if (!catalogs?.length) return null;

  const active = catalogs.find(catalog => catalog.id === selectedChassis);
  const search = filter.trim().toLowerCase();
  const matches = catalogs.filter(catalog =>
    [catalog.chassis, catalog.id].some(value => value?.toLowerCase().includes(search))
  );

  return (
    <details className="group glass-card rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xs">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none select-none text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5 min-w-0">
          <span className={`p-1.5 rounded-lg border shrink-0 ${
            selectedChassis
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <Layers className="w-4 h-4" />
          </span>
          <span className="truncate">
            {selectedChassis ? 'Catalog · ' + (active?.chassis || selectedChassis) : 'Choose a product'}
          </span>
          {active?.totalSKUs != null && (
            <span className="badge badge-emerald text-[11px] tabular-nums shrink-0">
              {active.totalSKUs} SKUs
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-slate-500 shrink-0">
          <span className="hidden sm:inline tabular-nums">{catalogs.length} catalogs</span>
          <ChevronDown className="w-4 h-4 text-slate-400 motion-safe:transition-transform motion-safe:duration-150 group-open:rotate-180" />
        </span>
      </summary>

      <div className="disclosure-content mt-3 pt-3 border-t border-slate-100">
        <label className="block text-xs font-medium text-slate-600">
          Filter catalogs
          <div className="relative mt-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="search"
              value={filter}
              onChange={event => setFilter(event.target.value)}
              placeholder="Type a model name (e.g. DL380, Alletra, Synergy)..."
              className="block w-full rounded-lg border border-slate-300 bg-slate-50/70 pl-8 pr-3 py-1.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </label>
        {matches.length ? (
          <ul className="mt-2.5 grid max-h-60 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 pr-1">
            {matches.map(catalog => (
              <li key={catalog.id}>
                <button
                  type="button"
                  aria-current={catalog.id === selectedChassis ? 'true' : undefined}
                  className="w-full flex items-center justify-between gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100/90 hover:border-slate-200 aria-[current=true]:bg-emerald-50 aria-[current=true]:border-emerald-200 aria-[current=true]:text-emerald-900 aria-[current=true]:font-semibold cursor-pointer motion-safe:transition-colors"
                  onClick={event => {
                    const disclosure = event.currentTarget.closest('details');
                    onSelectChassis?.(catalog.id);
                    setFilter('');
                    disclosure.open = false;
                    disclosure.querySelector('summary').focus();
                  }}
                >
                  <span className="truncate">{catalog.chassis || catalog.id}</span>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md tabular-nums shrink-0">
                    ({catalog.totalSKUs})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2.5 text-sm text-slate-600" role="status">No matching catalogs.</p>}
      </div>
    </details>
  );
}
