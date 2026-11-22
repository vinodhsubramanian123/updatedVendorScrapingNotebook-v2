import React, { useState, useEffect } from 'react';
import { History, TrendingUp } from 'lucide-react';
import { humanizeEnum } from '../../utils/formatters';

export default function CatalogTable({ displayedSkus = [], formatPrice, onOpenSkuAudit, onOpenTrend }) {
  const [selectedPage, setSelectedPage] = useState(1);
  const pageSize = 100;
  const pages = Math.max(1, Math.ceil(displayedSkus.length / pageSize));
  const page = Math.min(selectedPage, pages);
  useEffect(() => setSelectedPage(1), [displayedSkus]);
  const visibleSkus = displayedSkus.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs border-b border-slate-100">
        <span className="text-slate-600">{displayedSkus.length} option occurrences · Page {page} of {pages}</span>
        <div className="flex gap-3 font-semibold text-slate-700">
          <button disabled={page <= 1} onClick={() => setSelectedPage(page - 1)} className="disabled:opacity-40 cursor-pointer hover:text-emerald-700">Previous</button>
          <button disabled={page >= pages} onClick={() => setSelectedPage(page + 1)} className="disabled:opacity-40 cursor-pointer hover:text-emerald-700">Next</button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[540px]">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
              <th className="px-3 py-2.5 whitespace-nowrap">SKU / Part #</th>
              <th className="px-3 py-2.5">Description</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Category</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Sub-Category</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Type</th>
              <th className="px-3 py-2.5 whitespace-nowrap">List Price</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedSkus.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No SKUs matched your filter criteria.
                </td>
              </tr>
            ) : (
              visibleSkus.map((sku, idx) => {
                const status = sku.diffStatus || 'UNCHANGED';
                const isAdded = status === 'ADDED';
                const isRemoved = status === 'REMOVED' || status === 'REMOVED_DISCONTINUED';
                const isPriceChanged = status === 'PRICE_CHANGED';
                const isAttrChanged = status === 'ATTRIBUTE_CHANGED' || status === 'PRICE_AND_ATTRIBUTE_CHANGED';
                const descText = sku.description || sku.name || sku.subCategory || 'Configuration Option';

                return (
                  <tr
                    key={idx}
                    style={{ animationDelay: `${Math.min(idx, 12) * 20}ms` }}
                    className={`animate-row-reveal hover:bg-slate-50/80 transition-colors ${
                      isRemoved ? 'bg-rose-50/40 line-through text-rose-800' : isPriceChanged ? 'bg-amber-50/30' : isAdded ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {sku.isObsolete || sku.lifecycleStatus === 'DISCONTINUED' || sku.lifecycleStatus === 'OBSOLETE' ? (
                        <span className="badge badge-rose font-bold text-[10px]" title={sku.lifecycleReason || 'Discontinued / Obsolete SKU'}>
                          Discontinued {sku.obsoleteDate ? `(${sku.obsoleteDate})` : ''}
                        </span>
                      ) : sku.lifecycleStatus === '90-DAY WARNING' ? (
                        <span className="badge badge-amber font-bold text-[10px]" title="90-Day End-of-Life Warning">
                          90-Day EOL
                        </span>
                      ) : sku.lifecycleStatus === 'REINSTATED' ? (
                        <span className="badge bg-blue-100 text-blue-700 font-bold text-[10px]" title={`Reinstated on ${sku.reinstatedDate || 'recent date'}`}>
                          Reinstated
                        </span>
                      ) : (
                        <span className={`badge text-[10px] ${
                          isAdded ? 'badge-emerald' : isPriceChanged || isAttrChanged ? 'badge-amber' : isRemoved ? 'badge-rose' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {humanizeEnum(status)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold mono text-slate-900 whitespace-nowrap">{sku.sku || sku.partNumber || sku.id || 'CTO-OPTION'}</td>
                    <td className="px-3 py-2 font-medium text-slate-700 max-w-[240px] truncate" title={descText}>
                      {descText}
                    </td>
                    <td className="px-3 py-2 text-slate-600 max-w-[130px] truncate" title={sku.parentCategory}>{sku.parentCategory}</td>
                    <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate" title={sku.subCategory}>{sku.subCategory}</td>
                    <td className="px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">{sku.optionType || 'CTO'}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900 whitespace-nowrap">
                      {sku.isFioIncluded ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                          {sku.fioBadge || 'FIO ($0.00)'}
                        </span>
                      ) : (
                        formatPrice(sku.listPrice)
                      )}
                      {sku.priceDelta && (
                        <span className={`ml-1 text-[10px] font-bold ${
                          String(sku.priceDelta).startsWith('-') ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          ({sku.priceDelta})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => onOpenSkuAudit(sku)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                        title="Audit SKU Version History & SHA-256 Hashes"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Audit</span>
                      </button>
                      <button
                        onClick={() => onOpenTrend(sku)}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-all inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                        title="View Real Price History Trail"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
