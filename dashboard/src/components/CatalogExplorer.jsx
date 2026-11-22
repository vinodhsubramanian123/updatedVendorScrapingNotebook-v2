import React, { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { catalogIndexer } from '../utils/nlpSearch';
import PriceAnalyticsCard from './PriceAnalyticsCard';
import GlobalLoadingState from './GlobalLoadingState';
import RulesConfiguration from './RulesConfiguration';
import { parsePrice, formatPrice } from '../services/pricing.js';
import { requestJson } from '../services/api.js';
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
    if (sku[key] !== undefined && sku[key] !== null && sku[key] !== '') return sku[key];
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
  const lifecycleCanonical = sku.lifecycleCanonical || sku.lifecycleStatus || sku['Lifecycle Status'] || 'Active';

  return {
    ...sku,
    sku: skuId,
    description: desc,
    optionType: optType,
    listPrice: rawPrice,
    diffStatus: sku.diffStatus || sku['Diff Status'] || defaultDiff,
    priceDelta: priceDeltaVal || sku.priceDelta || null,
    lifecycleCanonical,
    vendor: sku.vendor || sku.canonicalSpecs?.vendor || null,
    rowType: sku.rowType || null,
    canonicalSpecs: sku.canonicalSpecs || null,
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

function isServiceOrSupportSku(s) {
  if (s.rowType === 'SUPPORT_SERVICE' || s.optionType === 'Service') return true;
  const parentCat = (s.parentCategory || '').toLowerCase();
  const subCat = (s.subCategory || '').toLowerCase();
  const desc = (s.description || '').toLowerCase();
  return /service|support|care/i.test(parentCat) ||
         /service|support|care/i.test(subCat) ||
         /\b(?:tech\s*care|foundation\s*care|prosupport|smartnet|hi-care|premier\s*support|warranty|installation|deployment|startup|pointnext|svc)\b/i.test(desc);
}

function isLifecycleAlertSku(s) {
  if (s.isObsolete || s.isSupplyConstrained || s.diffStatus === 'REMOVED') return true;
  const statusText = String(s.lifecycleCanonical || s.lifecycleStatus || s['Lifecycle Status'] || '');
  return /\b(?:obsolete|discontinued|90[\s-]*day|eol\s*warning|constrained\s*supply)\b|\[(?:ob|90|cs)\]/i.test(statusText);
}

function filterDisplayedSkus(baseSkus, viewMode, activeCategory, activeSubCategory, activeType, showOnlyChanges) {
  let result = baseSkus;
  if (viewMode === 'services') {
    result = result.filter(isServiceOrSupportSku);
  } else if (viewMode === 'obsolete') {
    result = result.filter(isLifecycleAlertSku);
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
  return formatPrice(priceVal);
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

function CatalogEmptyPlaceholder({ isCatalogLoading }) {
  return (
    <GlobalLoadingState isLoadingData={isCatalogLoading}>
      <div className="glass-card p-8 text-center text-slate-500">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">No Catalog Selected</p>
        <p className="text-xs text-slate-400 mt-1">Select a catalog from the header dropdown to view SKUs.</p>
      </div>
    </GlobalLoadingState>
  );
}

function deriveCatalogCategories(allSkus, activeCategory) {
  const categories = ['ALL', ...new Set(allSkus.map(e => e.parentCategory).filter(Boolean))];
  const subCatPool = activeCategory === 'ALL' ? allSkus : allSkus.filter(e => e.parentCategory === activeCategory);
  const availableSubCategories = ['ALL', ...new Set(subCatPool.map(e => e.subCategory).filter(Boolean))];
  return { categories, availableSubCategories };
}

async function fetchSkuPriceHistory(sku, chassisDir) {
  const skuId = sku.sku || sku.partNumber;
  const price = parsePrice(sku.listPrice);
  const baseline = price === null ? [] : [{ date: 'Current observation (no history)', price, status: 'CURRENT_OBSERVATION' }];
  try {
    const data = await requestJson(`/api/price-history?sku=${encodeURIComponent(skuId)}&chassisDir=${encodeURIComponent(chassisDir)}`);
    return (data.history && data.history.length > 0) ? data.history : baseline;
  } catch (e) {
    console.warn('Caught suppressed error in CatalogExplorer.jsx:', e);
    throw e;
  }
}

async function fetchSkuAuditData(sku, chassisDir) {
  const skuId = sku.sku || sku.partNumber;
  try {
    const res = await fetch(`/api/sku-version-audit?sku=${encodeURIComponent(skuId)}&chassisDir=${encodeURIComponent(chassisDir)}`);
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.warn('Error fetching SKU audit:', e);
    return null;
  }
}

function CatalogMainView({
  viewMode,
  catalogData,
  chassisDir,
  chassisName,
  displayedSkus,
  formatPrice,
  onOpenSkuAudit,
  onOpenTrend
}) {
  if (viewMode === 'rules') {
    return <RulesConfiguration catalogData={catalogData} chassisDir={chassisDir} chassisName={chassisName} />;
  }
  if (viewMode === 'analytics') {
    return <PriceAnalyticsCard selectedChassis={chassisName} chassisDir={chassisDir} />;
  }
  return (
    <CatalogTable
      displayedSkus={displayedSkus}
      formatPrice={formatPrice}
      onOpenSkuAudit={onOpenSkuAudit}
      onOpenTrend={onOpenTrend}
    />
  );
}

function useCatalogModalEscape(selectedSkuTrend, selectedSkuAudit, onCloseTrend, onCloseAudit) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (selectedSkuTrend) onCloseTrend();
      if (selectedSkuAudit) onCloseAudit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSkuTrend, selectedSkuAudit, onCloseTrend, onCloseAudit]);
}

function useCatalogGlobalSearchEffect(globalSearchTerm, catalogData, setQuery, setViewMode, setSearchResults, tableContainerRef) {
  useEffect(() => {
    if (!globalSearchTerm?.trim()) return;
    setQuery(globalSearchTerm);
    setViewMode('table');
    if (catalogData) setSearchResults(catalogIndexer.search(globalSearchTerm));
    requestAnimationFrame(() => {
      tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [globalSearchTerm, catalogData, setQuery, setViewMode, setSearchResults, tableContainerRef]);
}

export default function CatalogExplorer({
  catalogData,
  chassisName,
  catalogs = [],
  selectedChassis,
  onSelectChassis,
  isCatalogLoading = false,
  initialSearchQuery = '',
  globalSearchTerm = '',
  onClearSearch,
  _onOpenRag,
  _onRagQuery
}) {
  const [query, setQuery] = useState(initialSearchQuery || globalSearchTerm || '');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedSkuTrend, setSelectedSkuTrend] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeSubCategory, setActiveSubCategory] = useState('ALL');
  const [activeType] = useState('ALL');
  const [viewMode, setViewMode] = useState("table");
  const [realPriceTrail, setRealPriceTrail] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [selectedSkuAudit, setSelectedSkuAudit] = useState(null);
  const [skuAuditData, setSkuAuditData] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const historyRequest = useRef(0);
  const auditRequest = useRef(0);
  const tableContainerRef = useRef(null);
  useEffect(() => {
    historyRequest.current++;
    auditRequest.current++;
    setSelectedSkuTrend(null);
    setSelectedSkuAudit(null);
    setRealPriceTrail([]);
    setSkuAuditData(null);
    setActiveCategory('ALL');
    setActiveSubCategory('ALL');
    setQuery('');
    setSearchResults(null);
  }, [selectedChassis]);

  useCatalogModalEscape(
    selectedSkuTrend,
    selectedSkuAudit,
    () => { setSelectedSkuTrend(null); setRealPriceTrail([]); },
    () => { setSelectedSkuAudit(null); setSkuAuditData(null); }
  );

  useEffect(() => {
    if (!catalogData) return;
    catalogIndexer.indexCatalog(catalogData);
    const activeTerm = query || globalSearchTerm || initialSearchQuery;
    if (activeTerm && activeTerm.trim()) {
      setSearchResults(catalogIndexer.search(activeTerm));
    }
  }, [catalogData, initialSearchQuery, globalSearchTerm]);

  useCatalogGlobalSearchEffect(globalSearchTerm, catalogData, setQuery, setViewMode, setSearchResults, tableContainerRef);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSearchResults(val.trim() ? catalogIndexer.search(val) : null);
  };

  const handleClearQuery = () => {
    setQuery('');
    setSearchResults(null);
    if (onClearSearch) onClearSearch();
  };

  if (!catalogData) {
    return (
      <div className="space-y-4">
        <CatalogProductSwitcher catalogs={catalogs} selectedChassis={selectedChassis} onSelectChassis={onSelectChassis} />
        {(selectedChassis || !catalogs?.length) ? (
          <CatalogEmptyPlaceholder isCatalogLoading={isCatalogLoading} />
        ) : (
          <section className="glass-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Explore Certified Hardware Catalogs</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pick a product below to browse SKUs, pricing analytics, rules, and version diffs.
                </p>
              </div>
              <span className="badge badge-slate text-xs tabular-nums">{catalogs.length} products available</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {catalogs.map(catalog => (
                <button
                  key={catalog.id}
                  type="button"
                  onClick={() => onSelectChassis?.(catalog.id)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white/80 px-3.5 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-xs cursor-pointer motion-safe:transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{catalog.chassis || catalog.id}</div>
                    {catalog.family && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{catalog.family}</div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full tabular-nums shrink-0">
                    {catalog.totalSKUs} SKUs
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const allSkus = extractAllCatalogSkus(catalogData);
  const { categories, availableSubCategories } = deriveCatalogCategories(allSkus, activeCategory);

  const baseDisplayed = searchResults !== null ? searchResults : allSkus;
  const displayedSkus = filterDisplayedSkus(baseDisplayed, viewMode, activeCategory, activeSubCategory, activeType, showOnlyChanges);
  const changedCount = allSkus.filter(s => s.diffStatus && s.diffStatus !== 'UNCHANGED').length;
  const matchedCatalog = catalogs.find(c => c.id === selectedChassis);
  const chassisDir = catalogData?.metadata?.chassisDir || matchedCatalog?.chassisDir || selectedChassis || (chassisName ? chassisName.replace(/ /g, '_') : '');
  const incrStats = computeIncrementalStats(catalogData.metadata, allSkus.length, changedCount);

  const handleOpenTrend = async (sku) => {
    const request = ++historyRequest.current;
    setSelectedSkuTrend(sku);
    setLoadingHistory(true);
    setHistoryError(null);
    setRealPriceTrail([]);
    try {
      const data = await fetchSkuPriceHistory(sku, chassisDir);
      if (request === historyRequest.current) setRealPriceTrail(data);
    }
    catch (err) { if (request === historyRequest.current) setHistoryError(err.message); }
    finally { if (request === historyRequest.current) setLoadingHistory(false); }
  };

  const handleOpenSkuAudit = async (sku) => {
    const request = ++auditRequest.current;
    setSelectedSkuAudit(sku);
    setLoadingAudit(true);
    const auditData = await fetchSkuAuditData(sku, chassisDir);
    if (request !== auditRequest.current) return;
    setSkuAuditData(auditData);
    setLoadingAudit(false);
  };

  return (
    <div className="space-y-4">
      {historyError && <div role="alert" className="text-sm text-rose-800">Price history unavailable: {historyError}</div>}
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

      {viewMode === 'table' && (
        <CatalogChecksumBanner
          showOnlyChanges={showOnlyChanges}
          incrStats={incrStats}
          allSkusCount={allSkus.length}
          changedCount={changedCount}
        />
      )}

      <div ref={tableContainerRef} className="scroll-mt-28">
        <CatalogMainView
          viewMode={viewMode}
          catalogData={catalogData}
          chassisDir={chassisDir}
          chassisName={chassisName}
          displayedSkus={displayedSkus}
          formatPrice={formatCatalogPrice}
          onOpenSkuAudit={handleOpenSkuAudit}
          onOpenTrend={handleOpenTrend}
        />
      </div>

      <PriceTrendModal
        selectedSkuTrend={selectedSkuTrend}
        onClose={() => { setSelectedSkuTrend(null); setRealPriceTrail([]); }}
        loadingHistory={loadingHistory}
        historyError={historyError}
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

export { normalizeExplorerSkuItem, isServiceOrSupportSku, isLifecycleAlertSku, filterDisplayedSkus };
