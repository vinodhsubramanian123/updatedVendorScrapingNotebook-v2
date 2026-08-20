import React from 'react';

export default function MatrixComparisonTable({ tiers = [], standardCategories = [] }) {
  if (!tiers || tiers.length === 0) return null;

  return (
    <div className="glass-card p-6 overflow-x-auto border border-slate-200 shadow-sm rounded-xl">
      <div className="mb-4">
        <h3 className="font-bold text-slate-900 text-sm">Strategic Solution Matrix — Side-by-Side Spec Comparison</h3>
        <p className="text-xs text-slate-500">Compare hardware configuration attributes and capacity allocation across Rank 1 through Rank 5 tiers.</p>
      </div>

      <table className="w-full text-left text-xs border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-700 w-48 rounded-l-lg">Configuration Dimension</th>
            {tiers.map((t, idx) => (
              <th
                key={idx}
                className={`py-2.5 px-3 font-bold text-center ${
                  t.isOptimal ? 'bg-emerald-50 text-emerald-900 border-x border-emerald-200' : 'bg-slate-50 text-slate-800'
                }`}
              >
                <span className="block text-[11px] uppercase tracking-wider text-slate-500">Rank {t.rank}</span>
                <span className="text-xs truncate max-w-[140px] block mx-auto font-bold">{t.title.split(':')[1] || t.title}</span>
                <span className="font-mono text-emerald-700 font-bold block text-xs mt-0.5">{t.capex}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr className="bg-slate-50/50 font-semibold">
            <td className="py-2 px-3 text-slate-600">Workload Alignment</td>
            {tiers.map((t, idx) => (
              <td key={idx} className={`py-2 px-3 text-center ${t.isOptimal ? 'bg-emerald-50/50 font-bold text-emerald-800' : ''}`}>
                {t.intentMatch}
              </td>
            ))}
          </tr>

          {standardCategories.map(cat => (
            <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 px-3 font-medium text-slate-700 bg-slate-50/30">
                {cat.label}
              </td>
              {tiers.map((t, idx) => {
                const matchingSkus = (t.skuPartsList || []).filter(p => {
                  const desc = (p.description || '').toLowerCase();
                  const category = (p.category || '').toLowerCase();
                  return cat.match.some(m => desc.includes(m) || category.includes(m));
                });

                return (
                  <td key={idx} className={`py-2 px-3 text-center align-top ${t.isOptimal ? 'bg-emerald-50/30' : ''}`}>
                    {matchingSkus.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">—</span>
                    ) : (
                      <div className="space-y-1">
                        {matchingSkus.map((p, pIdx) => (
                          <div key={pIdx} className="text-[11px] leading-tight">
                            <span className="font-bold text-slate-800">{p.quantity}x </span>
                            <span className="font-mono text-slate-900 font-medium" title={p.description}>{p.sku}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
