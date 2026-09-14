import React from 'react';
import { History, TrendingUp } from 'lucide-react';

export default function CatalogTable({ displayedSkus = [], formatPrice, onOpenSkuAudit, onOpenTrend }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto max-h-[520px]">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">Checksum Status</th>
              <th className="px-4 py-3">Vendor SKU ID / Part #</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Sub-Category</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">List Price (USD)</th>
              <th className="px-4 py-3 text-right">Actions</th>
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
              displayedSkus.map((sku, idx) => {
                const status = sku.diffStatus || 'UNCHANGED';
                const isAdded = status === 'ADDED';
                const isRemoved = status === 'REMOVED' || status === 'REMOVED_DISCONTINUED';
                const isPriceChanged = status === 'PRICE_CHANGED';
                const isAttrChanged = status === 'ATTRIBUTE_CHANGED' || status === 'PRICE_AND_ATTRIBUTE_CHANGED';

                return (
                  <tr 
                    key={idx} 
                    style={{ animationDelay: `${Math.min(idx, 12) * 20}ms` }}
                    className={`animate-row-reveal hover:bg-slate-50/80 transition-colors ${
                      isRemoved ? 'bg-rose-50/40 line-through text-rose-800' : isPriceChanged ? 'bg-amber-50/30' : isAdded ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className={`badge ${
                        isAdded ? 'badge-emerald' : isPriceChanged || isAttrChanged ? 'badge-amber' : isRemoved ? 'badge-rose' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-bold mono text-slate-900">{sku.sku || sku.partNumber || sku.id || 'CTO-OPTION'}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-700 max-w-xs truncate">
                      {sku.description || sku.name || sku.subCategory || 'Configuration Option'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{sku.parentCategory}</td>
                    <td className="px-4 py-2.5 text-slate-500">{sku.subCategory}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-600">{sku.optionType || 'CTO'}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {formatPrice(sku.listPrice)}
                      {sku.priceDelta && (
                        <span className={`ml-1.5 text-[10px] font-bold ${
                          sku.priceDelta.startsWith('-') ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          ({sku.priceDelta})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-1">
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
