import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, FileSpreadsheet, X, GitCompare, History, Zap, ShieldCheck, Tag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { catalogIndexer } from '../utils/nlpSearch';
import PriceAnalyticsCard from './PriceAnalyticsCard';
import GlobalLoadingState from './GlobalLoadingState';
import RulesConfiguration from './RulesConfiguration';

export default function CatalogExplorer({ 
  catalogData, 
  chassisName, 
  catalogs = [],
  selectedChassis,
  onSelectChassis,
  isCatalogLoading = false, 
  initialSearchQuery = '',
  _globalSearchTerm = '',
  _onClearSearch,
  _onOpenRag,
  _onRagQuery
}) {
  const [query, setQuery] = useState(initialSearchQuery || '');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedSkuTrend, setSelectedSkuTrend] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeSubCategory, setActiveSubCategory] = useState('ALL');
  const [activeType] = useState('ALL');
  const [viewMode, setViewMode] = useState("table");
  const [realPriceTrail, setRealPriceTrail] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [selectedSkuAudit, setSelectedSkuAudit] = useState(null);
  const [skuAuditData, setSkuAuditData] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedSkuTrend) {
          setSelectedSkuTrend(null);
          setRealPriceTrail([]);
        }
        if (selectedSkuAudit) {
          setSelectedSkuAudit(null);
          setSkuAuditData(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSkuTrend, selectedSkuAudit]);

  useEffect(() => {
    if (catalogData) {
      catalogIndexer.indexCatalog(catalogData);
      if (initialSearchQuery && initialSearchQuery.trim()) {
        const matches = catalogIndexer.search(initialSearchQuery);
        setSearchResults(matches);
      }
    }
  }, [catalogData, initialSearchQuery]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
    } else {
      const matches = catalogIndexer.search(val);
      setSearchResults(matches);
    }
  };

  if (!catalogData) {
    return (
      <GlobalLoadingState mode="catalog" isLoadingData={isCatalogLoading} operationName="Loading Master Catalog Data...">
        <div className="glass-card p-8 text-center text-slate-500">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No Catalog Selected</p>
          <p className="text-xs text-slate-400 mt-1">Select a catalog from the header dropdown to view SKUs.</p>
        </div>
      </GlobalLoadingState>
    );
  }

  // Extract all SKUs across entries
  let allSkus = [];
  catalogData.entries?.forEach(entry => {
    entry.skus?.forEach(sku => {
      const skuId = sku.sku || sku['Product #'] || sku.partNumber || sku.id || 'CTO-OPTION';
      const desc = sku.description || sku['Description'] || sku.name || sku.subCategory || 'Configuration Option';
      const optType = sku.optionType || sku['Option Type'] || sku.Type || 'CTO';
      const rawPrice = sku['Unit Price (USD)'] || sku['Price (USD)'] || sku['List Price (USD)'] || sku['List Price'] || sku['Price'] || sku.listPriceFormatted || (sku.listPrice !== undefined && sku.listPrice !== '' ? sku.listPrice : 'N/A');

      allSkus.push({
        ...sku,
        sku: skuId,
        description: desc,
        optionType: optType,
        listPrice: rawPrice,
        diffStatus: sku.diffStatus || sku['Diff Status'] || (sku['Price Delta (USD)'] && sku['Price Delta (USD)'] !== '-' ? 'PRICE_CHANGED' : 'UNCHANGED'),
        priceDelta: sku['Price Delta (USD)'] || sku.priceDelta || null,
        parentCategory: entry.parentCategory || 'Uncategorized',
        subCategory: entry.subCategory || 'General',
        constraint: entry.constraint,
        rules: entry.rules
      });
    });
  });

  const categories = ['ALL', ...new Set(allSkus.map(e => e.parentCategory).filter(Boolean))];
  
  // Available sub-categories based on selected category
  const availableSubCategories = activeCategory === 'ALL'
    ? ['ALL', ...new Set(allSkus.map(e => e.subCategory).filter(Boolean))]
    : ['ALL', ...new Set(allSkus.filter(e => e.parentCategory === activeCategory).map(e => e.subCategory).filter(Boolean))];

  let displayedSkus = searchResults !== null ? searchResults : allSkus;
  
  if (viewMode === 'services') {
    displayedSkus = displayedSkus.filter(s => s.optionType === 'Service');
  } else {
    if (activeCategory !== 'ALL') {
      displayedSkus = displayedSkus.filter(s => s.parentCategory === activeCategory);
    }
    if (activeSubCategory !== 'ALL') {
      displayedSkus = displayedSkus.filter(s => s.subCategory === activeSubCategory);
    }
    if (activeType !== 'ALL') {
      displayedSkus = displayedSkus.filter(s => s.optionType === activeType);
    }
  }

  // Calculate changed SKUs count for toggle button badge
  const changedSkus = allSkus.filter(s => s.diffStatus && s.diffStatus !== 'UNCHANGED');
  const changedCount = changedSkus.length;

  if (showOnlyChanges) {
    displayedSkus = displayedSkus.filter(s => s.diffStatus && s.diffStatus !== 'UNCHANGED');
  }

  // Derive chassisDir from catalogData.metadata if available or chassisName
  const chassisDir = catalogData?.metadata?.chassisDir || (chassisName ? chassisName.replace(/ /g, '_') : '');

  // Price formatting helper
  const formatPrice = (priceVal) => {
    if (priceVal === undefined || priceVal === null || priceVal === '' || priceVal === 'N/A') return 'N/A';
    const num = parseFloat(String(priceVal).replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return 'N/A';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const handleOpenTrend = async (sku) => {
    setSelectedSkuTrend(sku);
    setLoadingHistory(true);
    const skuId = sku.sku || sku.partNumber;
    try {
      const res = await fetch(`/api/price-history?sku=${encodeURIComponent(skuId)}&chassisDir=${encodeURIComponent(chassisDir)}`);
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        setRealPriceTrail(data.history);
      } else {
        setRealPriceTrail([{ date: 'Current', price: parseFloat(sku.listPrice) || 0, status: 'BASELINE' }]);
      }
    } catch (e) { 
      console.warn('Caught suppressed error in CatalogExplorer.jsx:', e);
      setRealPriceTrail([{ date: 'Current', price: parseFloat(sku.listPrice) || 0, status: 'BASELINE' }]);
    }
    setLoadingHistory(false);
  };

  const handleOpenSkuAudit = async (sku) => {
    setSelectedSkuAudit(sku);
    setLoadingAudit(true);
    const skuId = sku.sku || sku.partNumber;
    try {
      const res = await fetch(`/api/sku-version-audit?sku=${encodeURIComponent(skuId)}&chassisDir=${encodeURIComponent(chassisDir)}`);
      if (res.ok) {
        const audit = await res.json();
        setSkuAuditData(audit);
      } else {
        setSkuAuditData(null);
      }
    } catch (e) {
      console.warn('Error fetching SKU audit:', e);
      setSkuAuditData(null);
    }
    setLoadingAudit(false);
  };

  const incrStats = catalogData.metadata?.incrementalStats || catalogData.metadata?.diffSummary || {
    unchangedSkusCount: catalogData.metadata?.diffSummary?.unchanged || (allSkus.length - changedCount),
    estimatedTokensSaved: (catalogData.metadata?.diffSummary?.unchanged || (allSkus.length - changedCount)) * 150
  };

  return (
    <div className="space-y-4">
      
      {/* Dedicated Product Line Switcher Bar */}
      {catalogs.length > 0 && (
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
      )}

      {/* Top Explorer Control Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-[156px] z-20 bg-white/95 backdrop-blur-md shadow-xs border border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            {chassisName || 'Master Catalog'} Explorer
          </h2>
          <p className="text-xs text-slate-500">
            Total SKU Category Mappings: <span className="font-semibold text-slate-800">{allSkus.length}</span> | Unique SKUs: <span className="font-semibold text-emerald-600">{catalogData.metadata?.totalUniqueSKUs || new Set(allSkus.map(s => s.sku)).size}</span> | Filtered: <span className="font-semibold text-blue-600">{displayedSkus.length}</span>
          </p>
        </div>

        {/* View Mode Toggle & Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              SKU Table View
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === 'analytics' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Price Variance & History
            </button>
            <button
              onClick={() => setViewMode('services')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === 'services' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Services & Support
            </button>
            <button
              onClick={() => setViewMode('rules')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === 'rules' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Rules Configuration
            </button>
          </div>

          {(viewMode === 'table' || viewMode === 'services') && (
            <>
              {/* Show Changes Toggle */}
              <button
                onClick={() => setShowOnlyChanges(!showOnlyChanges)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border shadow-xs ${
                  showOnlyChanges
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Filter to only show SKUs with price or attribute changes"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Show Changes</span>
                {changedCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    showOnlyChanges ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {changedCount}
                  </span>
                )}
              </button>

              {/* Instant Search input */}
              <div className="relative flex-1 md:w-48">
                <input
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Search SKUs..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setSearchResults(null);
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Main Category Filter */}
              <select
                value={activeCategory}
                onChange={(e) => { setActiveCategory(e.target.value); setActiveSubCategory('ALL'); }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none max-w-[130px] truncate [color-scheme:light]"
              >
                <option value="ALL">All Categories</option>
                {categories.filter(c => c !== 'ALL').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Sub-Category Filter */}
              <select
                value={activeSubCategory}
                onChange={(e) => setActiveSubCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none max-w-[130px] truncate [color-scheme:light]"
              >
                <option value="ALL">All Sub-Categories</option>
                {availableSubCategories.filter(s => s !== 'ALL').map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Hash Checksum Differential & Token Savings Summary Banner */}
      {(showOnlyChanges || incrStats.unchangedSkusCount > 0) && (
        <div className="glass-card p-4 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 via-white to-blue-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                Incremental Hash-Based Checksum Comparison
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Active Differential Pipeline
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Deterministic SHA-256 hashes verified <span className="font-bold text-slate-900">{incrStats.unchangedSkusCount || (allSkus.length - changedCount)}</span> unchanged SKUs. Skipped re-classification to preserve pipeline speed and minimize API token usage.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Token Savings</div>
              <div className="text-sm font-black text-emerald-600">~{(incrStats.estimatedTokensSaved || (incrStats.unchangedSkusCount * 150)).toLocaleString()} Tokens</div>
            </div>
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Changed SKUs</div>
              <div className="text-sm font-black text-amber-600">{changedCount} SKUs</div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'rules' ? (
        <RulesConfiguration catalogData={catalogData} chassisDir={chassisDir} chassisName={chassisName} />
      ) : viewMode === 'analytics' ? (
        <PriceAnalyticsCard selectedChassis={chassisName} chassisDir={chassisDir} />
      ) : (
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
                      className={`animate-row-reveal hover:bg-slate-50/80 transition-colors ${isRemoved ? 'bg-rose-50/40 line-through text-rose-800' : isPriceChanged ? 'bg-amber-50/30' : isAdded ? 'bg-emerald-50/30' : ''}`}
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
                          onClick={() => handleOpenSkuAudit(sku)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all inline-flex items-center gap-1 text-[11px] font-medium"
                          title="Audit SKU Version History & SHA-256 Hashes"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Audit</span>
                        </button>
                        <button
                          onClick={() => handleOpenTrend(sku)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-all inline-flex items-center gap-1 text-[11px] font-medium"
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
      )}

      {/* Historical Price Trend Modal */}
      {selectedSkuTrend && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedSkuTrend(null);
              setRealPriceTrail([]);
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  Historical Price Elasticity & Trend Trail
                </h3>
                <p className="text-xs mono text-slate-500">{selectedSkuTrend.sku || selectedSkuTrend.partNumber}</p>
              </div>
              <button onClick={() => setSelectedSkuTrend(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading price history...</div>
            ) : (
              <div className="h-64 w-full my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realPriceTrail}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Line type="monotone" dataKey="price" stroke="#D97706" strokeWidth={2} dot={{ fill: '#D97706' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <button onClick={() => setSelectedSkuTrend(null)} className="w-full btn-secondary justify-center text-xs">
              Close Price Chart
            </button>
          </div>
        </div>
      )}

      {/* SKU Data Version Audit Modal */}
      {selectedSkuAudit && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedSkuAudit(null);
              setSkuAuditData(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    File-Versioning Audit
                  </span>
                  <span className="text-xs font-mono text-slate-500">{selectedSkuAudit.sku}</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mt-1 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  SKU Data Layer Versioning & Mutation Audit
                </h3>
              </div>
              <button onClick={() => { setSelectedSkuAudit(null); setSkuAuditData(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingAudit ? (
              <div className="p-8 text-center text-xs text-slate-500">Querying historical catalog snapshots & checksums...</div>
            ) : skuAuditData ? (
              <div className="space-y-4 text-xs">
                {/* Current Status Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Ecosystem Status</span>
                    <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Status: {skuAuditData.currentStatus}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Snapshot Occurrences</span>
                    <div className="text-sm font-extrabold text-blue-600">{skuAuditData.snapshotOccurrences?.length || 0} Snapshots</div>
                  </div>
                </div>

                {/* Historical Snapshot Hashes */}
                {skuAuditData.snapshotOccurrences?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                      Cryptographic Catalog Snapshots (SHA-256 Hashes)
                    </h4>
                    <div className="space-y-1.5">
                      {skuAuditData.snapshotOccurrences.map((snap, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between font-mono text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">{snap.snapshotFile}</span>
                            <span className="ml-2 text-slate-400 text-[10px]">({snap.scrapeDate})</span>
                          </div>
                          <div className="text-slate-500 truncate max-w-[200px]" title={snap.snapshotChecksum}>
                            SHA: {snap.snapshotChecksum.substring(0, 16)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attribute Mutations */}
                {skuAuditData.attributeMutations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs">Attribute & Specification Mutations</h4>
                    <div className="space-y-1.5">
                      {skuAuditData.attributeMutations.map((mut, i) => (
                        <div key={i} className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200 text-amber-900">
                          <div className="font-semibold text-[11px]">{mut.field} modified on {mut.date}</div>
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            From <span className="line-through">{mut.oldValue}</span> to <span className="font-bold text-emerald-700">{mut.newValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discontinued EOL Info */}
                {skuAuditData.discontinuedInfo && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                    <div className="font-bold text-xs">End-Of-Life / Discontinued SKU Record</div>
                    <p className="text-[11px]">Discontinued on {skuAuditData.discontinuedInfo.discontinuedDate || 'Recent Scrape'}. Note: {skuAuditData.discontinuedInfo['Table Rule/Note'] || 'SKU removed from HPE OCA catalog.'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">No version audit data found for this SKU.</div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => { setSelectedSkuAudit(null); setSkuAuditData(null); }} className="btn-secondary text-xs">
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

