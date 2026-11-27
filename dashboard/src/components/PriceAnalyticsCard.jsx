import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Layers, Activity, History, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

function formatSnapshotDate(scrapeDate, index) {
  if (!scrapeDate || scrapeDate === 'N/A') return `Snapshot #${index + 1}`;
  const parsed = new Date(scrapeDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return String(scrapeDate);
}

function formatSnapshotLocaleDate(scrapeDate) {
  if (!scrapeDate || scrapeDate === 'N/A') return 'N/A';
  const parsed = new Date(scrapeDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }
  return String(scrapeDate);
}

function computePriceAnalyticsMetrics(analyticsData, selectedCategory) {
  const latestSnapshot = analyticsData.snapshots[analyticsData.snapshots.length - 1];
  const categoryBreakdown = latestSnapshot?.priceAnalytics?.categoryBreakdown || {};
  const categories = Object.keys(categoryBreakdown);

  const priceHistoryMap = analyticsData.priceHistory || {};
  const skuKeys = Object.keys(priceHistoryMap);
  const totalSkusTracked = skuKeys.length;

  let priceChangedCount = 0;
  let totalDeltaSum = 0;

  skuKeys.forEach(pn => {
    const history = priceHistoryMap[pn] || [];
    if (history.length > 1) {
      const first = history[0].price || 0;
      const last = history[history.length - 1].price || 0;
      if (Math.abs(last - first) > 0.01) {
        priceChangedCount++;
        totalDeltaSum += (last - first);
      }
    }
  });

  const chartData = (analyticsData.snapshots || []).map((snap, idx) => {
    const dateStr = formatSnapshotDate(snap.scrapeDate, idx);
    const point = { date: dateStr };
    const catBreakdown = snap.priceAnalytics?.categoryBreakdown || {};

    if (selectedCategory === 'ALL') {
      let sum = 0;
      let count = 0;
      Object.values(catBreakdown).forEach(c => {
        if (c.avgPrice) {
          sum += c.avgPrice;
          count++;
        }
      });
      point.avgPrice = count > 0 ? (sum / count) : 0;
    } else {
      point.avgPrice = catBreakdown[selectedCategory]?.avgPrice || 0;
    }
    return point;
  });

  return { categoryBreakdown, categories, totalSkusTracked, priceChangedCount, totalDeltaSum, chartData };
}

function CategoryPriceCard({ cat, data }) {
  const avgFormatted = data.avgPrice ? `$${data.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
  const minFormatted = data.minPrice ? `$${data.minPrice.toLocaleString()}` : '$0';
  const maxFormatted = data.maxPrice ? `$${data.maxPrice.toLocaleString()}` : '$0';
  const subcategories = data.subcategories || {};

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-slate-800 text-sm">{cat}</span>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
          {data.totalSKUs} SKUs
        </span>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-600">
          <span>Category Average:</span>
          <span className="font-bold text-slate-900">{avgFormatted}</span>
        </div>

        <div className="flex justify-between items-center text-slate-500">
          <span>Price Range (Min - Max):</span>
          <span className="font-medium text-slate-700">{minFormatted} - {maxFormatted}</span>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <div className="text-[11px] font-medium text-slate-400 mb-1">Subcategories ({Object.keys(subcategories).length}):</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(subcategories).map(([sub, sData]) => (
              <span key={sub} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] rounded">
                {sub} ({sData.totalSKUs})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PriceAnalyticsCard({ selectedChassis, chassisDir }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const targetDir = chassisDir || selectedChassis || 'DL380_Gen12';

  useEffect(() => {
    setLoading(true);
    fetch(`/api/price-analytics?chassisDir=${encodeURIComponent(targetDir)}`)
      .then(res => res.json())
      .then(data => {
        setAnalyticsData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching price analytics:', err);
        setLoading(false);
      });
  }, [targetDir]);

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <Activity className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <p className="text-sm text-slate-500 font-medium">Loading catalog price history & variance analytics...</p>
      </div>
    );
  }

  if (!analyticsData?.snapshots?.length) {
    return (
      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
        <History className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <h4 className="font-semibold text-slate-700">Baseline Catalog Snapshot</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Historical price variance tracking initializes automatically on subsequent catalog scrapes and resyncs.
        </p>
      </div>
    );
  }

  const { categoryBreakdown, categories, totalSkusTracked, priceChangedCount, totalDeltaSum, chartData } =
    computePriceAnalyticsMetrics(analyticsData, selectedCategory);
  const isNonNegativeDelta = totalDeltaSum >= 0;
  const visibleCategories = categories.filter(c => selectedCategory === 'ALL' || selectedCategory === c);

  return (
    <div className="space-y-6">
      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Historical Snapshots</div>
            <div className="text-xl font-bold text-slate-800">{analyticsData.totalSnapshots} Scrapes</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SKUs Tracked</div>
            <div className="text-xl font-bold text-slate-800">{totalSkusTracked} Unique</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Price Variances</div>
            <div className="text-xl font-bold text-amber-700">{priceChangedCount} SKUs Changed</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${isNonNegativeDelta ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center font-bold`}>
            {isNonNegativeDelta ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Portfolio Impact</div>
            <div className={`text-xl font-bold ${isNonNegativeDelta ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isNonNegativeDelta ? '+' : ''}${totalDeltaSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Variance Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Main Category List Price Breakdown & Averages
            </h3>
            <p className="text-xs text-slate-500">Average list price and min/max ranges per component category</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter Category:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCategories.map(cat => (
            <CategoryPriceCard key={cat} cat={cat} data={categoryBreakdown[cat]} />
          ))}
        </div>
      </div>

      {/* Category Price Variance Timeline Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          {selectedCategory === 'ALL' ? 'Overall Average' : selectedCategory} Price Variance Timeline
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} width={80} tickFormatter={val => `$${val.toLocaleString()}`} />
              <Tooltip formatter={(value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <Legend />
              <Line type="monotone" dataKey="avgPrice" name="Average List Price" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#2563EB' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Snapshots Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          Catalog Scrape History & Snapshot Ledger
        </h3>

        <div className="divide-y divide-slate-100">
          {analyticsData.snapshots.map((snap, idx) => (
            <div key={snap.filename} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                  #{idx + 1}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{snap.filename}</div>
                  <div className="text-slate-500 text-[11px]">Scraped Date: {formatSnapshotLocaleDate(snap.scrapeDate)}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 font-semibold rounded">
                  {snap.totalSKUs} Unique SKUs
                </span>
                {idx === 0 && snap.diffSummary && (snap.diffSummary.added > snap.totalSKUs || snap.diffSummary.removed === 0) ? (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 font-semibold rounded" title={`Baseline capture indexed ${snap.diffSummary.added} option rows`}>
                    Initial Baseline
                  </span>
                ) : snap.diffSummary ? (
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded">
                      +{Math.min(snap.diffSummary.added || 0, snap.totalSKUs || snap.diffSummary.added || 0)} Added
                    </span>
                    <span className="px-2 py-1 bg-rose-50 text-rose-700 font-semibold rounded">
                      -{snap.diffSummary.removed || 0} Removed
                    </span>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 font-semibold rounded">
                      {snap.diffSummary.priceChanged || 0} Price Delta
                    </span>
                  </div>
                ) : (
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 font-medium rounded">
                    Snapshot Recorded
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CrossSolutionSkuPanel />
    </div>
  );
}

function CrossSolutionSkuPanel() {
  const [skuQuery, setSkuQuery] = useState('R7A11AAE');
  const [compareResult, setCompareResult] = useState(null);
  const [searching, setSearching] = useState(false);

  const runLookup = async (e) => {
    if (e) e.preventDefault();
    const cleaned = String(skuQuery || '').trim();
    if (!cleaned) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/cross-solution-sku-compare?sku=${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      setCompareResult(data);
    } catch {
      setCompareResult(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Cross-Solution SKU Price &amp; Status Comparison
        </h3>
        <form onSubmit={runLookup} className="flex items-center gap-2">
          <input
            type="text"
            value={skuQuery}
            onChange={e => setSkuQuery(e.target.value)}
            placeholder="SKU (e.g. R7A11AAE)"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            {searching ? 'Checking...' : 'Compare'}
          </button>
        </form>
      </div>

      {compareResult?.summary && (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span><strong>Solutions:</strong> {compareResult.summary.solutionsFound}</span>
            <span><strong>Priced:</strong> {compareResult.summary.pricedCount}</span>
            <span><strong>Unpriced:</strong> {compareResult.summary.unpricedCount}</span>
            {compareResult.summary.minPriceUsd !== null && (
              <span><strong>Range:</strong> ${compareResult.summary.minPriceUsd.toLocaleString()} – ${compareResult.summary.maxPriceUsd.toLocaleString()}</span>
            )}
            {compareResult.summary.hasPriceVariance && (
              <span className="text-amber-700 font-semibold">Spread: ${compareResult.summary.spreadUsd.toLocaleString()} ({compareResult.summary.spreadPct}%)</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Solution</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Price (USD)</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Lead Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(compareResult.matches || []).map((m, i) => (
                  <tr key={`${m.product}-${m.sku}-${i}`}>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{m.product}</td>
                    <td className="py-2 pr-3 font-mono">{m.sku}</td>
                    <td className="py-2 pr-3 font-semibold">
                      {m.listPriceUsd !== null ? `$${m.listPriceUsd.toLocaleString()}` : 'Unpriced'}
                    </td>
                    <td className="py-2 pr-3">{m.lifecycleStatus}</td>
                    <td className="py-2 pr-3">{m.leadTimeDays !== null ? `${m.leadTimeDays}d` : (m.leadTimeText || '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
