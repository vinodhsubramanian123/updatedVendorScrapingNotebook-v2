import React from 'react';

function AvailabilityCell({ tier }) {
  const supply = tier.supplyMetrics;
  if (!supply) return 'Unavailable';
  return (
    <>
      <div>{supply.solutionEdtDays == null ? 'Incomplete' : `${supply.solutionEdtDays} days`}</div>
      {supply.solutionEdtDays == null && supply.maxLeadTimeDays != null && (
        <div className="text-slate-500">{supply.maxLeadTimeDays} days for slowest known SKU</div>
      )}
      {supply.pacingItems?.length > 0 && (
        <div className="break-words font-mono text-slate-600">{[...new Set(supply.pacingItems.map(part => part.sku))].join(', ')}</div>
      )}
      {tier.liveSolutionEdt?.fastShipRange && <div>Live OCA {tier.liveSolutionEdt.fastShipRange}</div>}
    </>
  );
}

const SUPPORT_SKU_RE = /^(HU\d[A-Z0-9]{2,}|HA\d{3}A|BD505|R7A\d{2}|S\d[A-Z]\d{2}AAE)/i;

const DESC_CATEGORY_RULES = [
  { id: 'chassis', re: /\b(cto server|configure-to-order server|synergy\s*12000\s*frame|base chassis|storage array base|tape library.*base|cto\s+configure-to-order)\b/i },
  { id: 'cpu', re: /\b(xeon|epyc|processor|cpu kit)\b/i },
  { id: 'cooling', re: /\b(fan kit|heatsink|heat sink|liquid cooling|thermal kit|high performance fan|standard fan)\b/i },
  { id: 'memory', re: /\b(ddr5|ddr4|rdimm|lrdimm|mrdimm|smart memory|\bdimm\b|\d+gb\s+\drx\d)\b/i },
  { id: 'storage_ctrl', re: /\b(megaraid|smart array|mr\d+i|sr\d+i|tri-mode.*controller|storage controller|smart storage.*battery|hybrid capacitor|ns204i|boot device|boot optimized)\b/i },
  { id: 'storage_drives', re: /\b(ssd|hdd|nvme|sata\s+\d|sas\s+\d|drive cage|backplane|lto-\d|hard drive|solid state|sff\s+bc|lff\s+lp|u\.3|edsff|e3\.s|read intensive|mixed use|write intensive)\b/i },
  { id: 'power', re: /\b(power supply|flex slot|\bpsu\b|power cord|cable lug kit|-48vdc|\b\d{3,4}w\b.*(titanium|platinum|hot plug|ac|dc))\b/i },
  { id: 'networking', re: /\b(ethernet|base-t|sfp28|qsfp|ocp3|network adapter|riser|pcie|gpu|nvidia|transceiver|fibre channel|infiniband|cable kit|rail kit|bezel|broadcom\s+bcm|mellanox|connectx|intel\s+e810)\b/i },
  { id: 'support', re: /\b(tech care|foundation care|pointnext|complete care|support service|installation|startup service|compute ops|ilo\s+advanced|warranty|proactive care|greenlake)\b/i }
];

const CAT_FALLBACK_RULES = [
  { id: 'chassis', re: /\b(base chassis|chassis|cto server|server base|frame|enclosure base|compute module|system base)\b/i },
  { id: 'cpu', re: /\b(processor|cpu)\b/i },
  { id: 'cooling', re: /\b(fan|cooling|heatsink|thermal)\b/i },
  { id: 'memory', re: /\b(memory|dimm|ram)\b/i },
  { id: 'storage_ctrl', re: /\b(storage controller|raid|smart array|storage battery|cache|boot)\b/i },
  { id: 'storage_drives', re: /\b(drive|ssd|hdd|nvme|storage media|drive cage|backplane|tape)\b/i },
  { id: 'power', re: /\b(power|psu|power supply|power cord)\b/i },
  { id: 'networking', re: /\b(network|nic|ocp|ethernet|fibre channel|pcie|riser|gpu|accelerator|interconnect|transceiver|cable|rail)\b/i },
  { id: 'support', re: /\b(service|support|warranty|tech care|foundation care|installation|software|subscription|license)\b/i }
];

function normalizeSkuKey(sku) {
  return String(sku || '').trim().toUpperCase();
}

function classifyCanonicalSku(sku, descriptions, categories) {
  if (SUPPORT_SKU_RE.test(sku)) return 'support';
  const combinedDesc = descriptions.join(' ');
  for (const rule of DESC_CATEGORY_RULES) {
    if (rule.re.test(combinedDesc)) return rule.id;
  }
  const combinedCat = categories.join(' ');
  for (const rule of CAT_FALLBACK_RULES) {
    if (rule.re.test(combinedCat)) return rule.id;
  }
  return 'other';
}

function buildCanonicalSkuCategoryMap(tiers) {
  const metaBySku = new Map();
  for (const tier of tiers) {
    for (const part of tier.skuPartsList || []) {
      const key = normalizeSkuKey(part?.sku);
      if (!key) continue;
      if (!metaBySku.has(key)) metaBySku.set(key, { descriptions: [], categories: [] });
      const entry = metaBySku.get(key);
      if (part.description) entry.descriptions.push(String(part.description));
      if (part.category) entry.categories.push(String(part.category));
    }
  }
  const categoryMap = new Map();
  for (const [sku, meta] of metaBySku.entries()) {
    categoryMap.set(sku, classifyCanonicalSku(sku, meta.descriptions, meta.categories));
  }
  return categoryMap;
}

function consolidateTierPartsByCategory(tier, skuCategoryMap) {
  const buckets = new Map();
  const seenBySku = new Map();
  for (const part of tier.skuPartsList || []) {
    const key = normalizeSkuKey(part?.sku);
    if (!key) continue;
    const qty = Number(part.quantity || 1);
    if (seenBySku.has(key)) {
      const existing = seenBySku.get(key);
      if (!part.isFixInjected && !existing.isFixInjected) {
        existing.quantity += qty;
      } else {
        existing.quantity = Math.max(existing.quantity, qty);
      }
      if (!existing.description && part.description) existing.description = part.description;
      continue;
    }
    const merged = { ...part, quantity: qty };
    seenBySku.set(key, merged);
    const catId = skuCategoryMap.get(key) || 'other';
    if (!buckets.has(catId)) buckets.set(catId, []);
    buckets.get(catId).push(merged);
  }
  return buckets;
}

export default function MatrixComparisonTable({ tiers = [], standardCategories = [] }) {
  if (!tiers || tiers.length === 0) return null;

  const skuCategoryMap = buildCanonicalSkuCategoryMap(tiers);
  const groupedByTier = tiers.map(tier => consolidateTierPartsByCategory(tier, skuCategoryMap));

  const visibleCategories = standardCategories.filter(cat =>
    cat.id !== 'other' || groupedByTier.some(buckets => (buckets.get('other')?.length || 0) > 0)
  );

  return (
    <div className="glass-card p-3 sm:p-6 min-w-0 border border-slate-200 shadow-sm rounded-xl">
      <div className="mb-4">
        <h3 className="font-bold text-slate-900 text-sm">Strategic Solution Matrix — Side-by-Side Spec Comparison</h3>
        <p className="text-xs text-slate-500">Compare hardware specifications, capacity, and availability across candidate BOMs.</p>
      </div>

      <div tabIndex={0} role="region" aria-label="Scrollable BOM comparison" className="overflow-x-auto">
      <table className="w-full text-left text-xs border-separate border-spacing-0 min-w-[700px]">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-700 w-28 sm:w-48 rounded-l-lg sticky left-0 z-10">Configuration Dimension</th>
            {tiers.map((t, idx) => (
              <th
                key={idx}
                className={`py-2.5 px-3 font-bold text-center ${
                  t.isOptimal ? 'bg-emerald-50 text-emerald-900 border-x border-emerald-200' : 'bg-slate-50 text-slate-800'
                }`}
              >
                <span className="block text-[11px] uppercase tracking-wider text-slate-500">Rank {t.rank}</span>
                <span className="text-xs max-w-48 break-words block mx-auto font-bold">{t.title.split(':')[1] || t.title}</span>
                <span className="font-mono text-slate-700 font-semibold block text-xs mt-0.5">{t.capex}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr className="bg-slate-50/50 font-semibold">
            <td className="sticky left-0 z-10 bg-slate-50 py-2 px-3 text-slate-600">Workload Alignment</td>
            {tiers.map((t, idx) => (
              <td key={idx} className={`py-2 px-3 text-center ${t.isOptimal ? 'bg-emerald-50/50 font-bold text-emerald-800' : ''}`}>
                {t.intentMatch}
              </td>
            ))}
          </tr>
          {tiers.some(tier => tier.supplyMetrics) && (
            <tr className="bg-slate-50/50">
              <td className="sticky left-0 z-10 bg-slate-50 py-2 px-3 font-semibold text-slate-600">BOM lead-time estimate</td>
              {tiers.map(tier => (
                <td key={tier.rank} className="px-3 py-2 text-center">
                  <AvailabilityCell tier={tier} />
                </td>
              ))}
            </tr>
          )}

          {visibleCategories.map(cat => (
            <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 px-3 font-medium text-slate-700 bg-slate-50 sticky left-0 z-10">
                {cat.label}
              </td>
              {tiers.map((t, idx) => {
                const matchingSkus = groupedByTier[idx]?.get(cat.id) || [];

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
    </div>
  );
}
