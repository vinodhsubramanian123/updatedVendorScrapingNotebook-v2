import React, { useState, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { catalogIndexer } from '../utils/nlpSearch';
import PriceAnalyticsCard from './PriceAnalyticsCard';
import GlobalLoadingState from './GlobalLoadingState';
import RulesConfiguration from './RulesConfiguration';
import {
  CatalogProductSwitcher,
  CatalogFilterBar,
  CatalogChecksumBanner,
  CatalogTable,
  PriceTrendModal,
  SkuAuditModal
} from './catalog';

function resolveExplorerSkuRawPrice(sku) {
  for (const key of ['Unit Price (USD)', 'Price (USD)', 'List Price (USD)', 'List Price', 'Price', 'listPriceFormatted']) {
    if (sku[key]) return sku[key];
  }
  if (sku.listPrice !== undefined && sku.listPrice !== '') return sku.listPrice;
  return 'N/A';
}

function normalizeExplorerSkuItem(sku, entry) {
  const skuId = sku.sku || sku['Product #'] || sku.partNumber || sku.id || 'CTO-OPTION';
  const desc = sku.description || sku['Description'] || sku.name || sku.subCategory || 'Configuration Option';
  const optType = sku.optionType || sku['Option Type'] || sku.Type || 'CTO';
  const rawPrice = resolveExplorerSkuRawPrice(sku);
  const priceDeltaVal = sku['Price Delta (USD)'];
  const defaultDiff = priceDeltaVal && priceDeltaVal !== '-' ? 'PRICE_CHANGED' : 'UNCHANGED';

  return {
    ...sku,
    sku: skuId,
    description: desc,
    optionType: optType,
    listPrice: rawPrice,
    diffStatus: sku.diffStatus || sku['Diff Status'] || defaultDiff,
    priceDelta: priceDeltaVal || sku.priceDelta || null,
    parentCategory: entry.parentCategory || 'Uncategorized',
    subCategory: entry.subCategory || 'General',
    constraint: entry.constraint,
    rules: entry.rules
  };
}

function extractAllCatalogSkus(catalogData) {
  const allSkus = [];
  catalogData.entries?.forEach(entry => {
    entry.skus?.forEach(sku => {
      allSkus.push(normalizeExplorerSkuItem(sku, entry));
    });
  });
  return allSkus;
}

function filterDisplayedSkus(baseSkus, viewMode, activeCategory, activeSubCategory, activeType, showOnlyChanges) {
  let result = baseSkus;
  if (viewMode === 'services') {
    result = result.filter(s => s.optionType === 'Service');
  } else {
    if (activeCategory !== 'ALL') {
      result = result.filter(s => s.parentCategory === activeCategory);
    }
    if (activeSubCategory !== 'ALL') {
      result = result.filter(s => s.subCategory === activeSubCategory);
    }
    if (activeType !== 'ALL') {
      result = result.filter(s => s.optionType === activeType);
    }
  }
  if (showOnlyChanges) {
    result = result.filter(s => s.diffStatus && s.diffStatus !== 'UNCHANGED');
  }
  return result;
}

function formatCatalogPrice(priceVal) {
  if (priceVal === undefined || priceVal === null || priceVal === '' || priceVal === 'N/A') return 'N/A';
  const num = parseFloat(String(priceVal).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 'N/A';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function computeIncrementalStats(metadata, allSkusCount, changedCount) {
  if (metadata?.incrementalStats) return metadata.incrementalStats;
  if (metadata?.diffSummary) return metadata.diffSummary;
  const unchangedCount = allSkusCount - changedCount;
  return {
    unchangedSkusCount: unchangedCount,
    estimatedTokensSaved: unchangedCount * 150
  };
}

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
      if (e.key !== 'Escape') return;
      if (selectedSkuTrend) {
        setSelectedSkuTrend(null);
        setRealPriceTrail([]);
      }
      if (selectedSkuAudit) {
        setSelectedSkuAudit(null);
        setSkuAuditData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSkuTrend, selectedSkuAudit]);

  useEffect(() => {
    if (!catalogData) return;
    catalogIndexer.indexCatalog(catalogData);
    if (initialSearchQuery && initialSearchQuery.trim()) {
      setSearchResults(catalogIndexer.search(initialSearchQuery));
    }
  }, [catalogData, initialSearchQuery]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSearchResults(val.trim() ? catalogIndexer.search(val) : null);
  };

  const handleClearQuery = () => {
    setQuery('');
    setSearchResults(null);
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

  const allSkus = extractAllCatalogSkus(catalogData);
  const categories = ['ALL', ...new Set(allSkus.map(e => e.parentCategory).filter(Boolean))];
  const subCatPool = activeCategory === 'ALL' ? allSkus : allSkus.filter(e => e.parentCategory === activeCategory);
  const availableSubCategories = ['ALL', ...new Set(subCatPool.map(e => e.subCategory).filter(Boolean))];

  const baseDisplayed = searchResults !== null ? searchResults : allSkus;
  const displayedSkus = filterDisplayedSkus(baseDisplayed, viewMode, activeCategory, activeSubCategory, activeType, showOnlyChanges);
  const changedCount = allSkus.filter(s => s.diffStatus && s.diffStatus !== 'UNCHANGED').length;
  const chassisDir = catalogData?.metadata?.chassisDir || (chassisName ? chassisName.replace(/ /g, '_') : '');
  const incrStats = computeIncrementalStats(catalogData.metadata, allSkus.length, changedCount);

  const handleOpenTrend = async (sku) => {
    setSelectedSkuTrend(sku);
    setLoadingHistory(true);
    const skuId = sku.sku || sku.partNumber;
    const baseline = [{ date: 'Current', price: parseFloat(sku.listPrice) || 0, status: 'BASELINE' }];
    try {
      const res = await fetch(`/api/price-history?sku=${encodeURIComponent(skuId)}&chassisDir=${encodeURIComponent(chassisDir)}`);
      const data = await res.json();
      setRealPriceTrail(data.history && data.history.length > 0 ? data.history : baseline);
    } catch (e) {
      console.warn('Caught suppressed error in CatalogExplorer.jsx:', e);
      setRealPriceTrail(baseline);
    }
    setLoadingHistory(false);
  };

  const handleOpenSkuAudit = async (sku) => {
    setSelectedSkuAudit(sku);
    setLoadingAudit(true);
    const skuId = sku.sku || sku.partNumber;
    try {
      const res = await fetch(`/api/sku-version-audit?sku=${encodeURIComponent(skuId)}&chassisDir=${encodeURIComponent(chassisDir)}`);
      setSkuAuditData(res.ok ? await res.json() : null);
    } catch (e) {
      console.warn('Error fetching SKU audit:', e);
      setSkuAuditData(null);
    }
    setLoadingAudit(false);
  };

  return (
    <div className="space-y-4">
      <CatalogProductSwitcher
        catalogs={catalogs}
        selectedChassis={selectedChassis}
        onSelectChassis={onSelectChassis}
      />

      <CatalogFilterBar
        chassisName={chassisName}
        allSkusCount={allSkus.length}
        uniqueSkusCount={catalogData.metadata?.totalUniqueSKUs || new Set(allSkus.map(s => s.sku)).size}
        displayedSkusCount={displayedSkus.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showOnlyChanges={showOnlyChanges}
        setShowOnlyChanges={setShowOnlyChanges}
        changedCount={changedCount}
        query={query}
        onQueryChange={handleQueryChange}
        onClearQuery={handleClearQuery}
        activeCategory={activeCategory}
        setActiveCategory={(cat) => { setActiveCategory(cat); setActiveSubCategory('ALL'); }}
        categories={categories}
        activeSubCategory={activeSubCategory}
        setActiveSubCategory={setActiveSubCategory}
        availableSubCategories={availableSubCategories}
      />

      <CatalogChecksumBanner
        showOnlyChanges={showOnlyChanges}
        incrStats={incrStats}
        allSkusCount={allSkus.length}
        changedCount={changedCount}
      />

      {viewMode === 'rules' ? (
        <RulesConfiguration catalogData={catalogData} chassisDir={chassisDir} chassisName={chassisName} />
      ) : viewMode === 'analytics' ? (
        <PriceAnalyticsCard selectedChassis={chassisName} chassisDir={chassisDir} />
      ) : (
        <CatalogTable
          displayedSkus={displayedSkus}
          formatPrice={formatCatalogPrice}
          onOpenSkuAudit={handleOpenSkuAudit}
          onOpenTrend={handleOpenTrend}
        />
      )}

      <PriceTrendModal
        selectedSkuTrend={selectedSkuTrend}
        onClose={() => { setSelectedSkuTrend(null); setRealPriceTrail([]); }}
        loadingHistory={loadingHistory}
        realPriceTrail={realPriceTrail}
      />

      <SkuAuditModal
        selectedSkuAudit={selectedSkuAudit}
        onClose={() => { setSelectedSkuAudit(null); setSkuAuditData(null); }}
        loadingAudit={loadingAudit}
        skuAuditData={skuAuditData}
      />
    </div>
  );
}
