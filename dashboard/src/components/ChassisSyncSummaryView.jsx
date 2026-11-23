import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import ChassisHeaderSummary from './summary/ChassisHeaderSummary';
import ChassisActiveModelCard from './summary/ChassisActiveModelCard';
import ChassisPortfolioTable from './summary/ChassisPortfolioTable';

const BASE_PARENT_TOKENS = ['chassis', 'server', 'base', 'compute module', 'system', 'tape'];
const BASE_SUB_TOKENS = ['variant', 'base'];

function isBaseVariantEntry(entry) {
  const parentLower = (entry.parentCategory || '').toLowerCase();
  const subLower = (entry.subCategory || '').toLowerCase();
  return (
    BASE_PARENT_TOKENS.some(t => parentLower.includes(t)) ||
    BASE_SUB_TOKENS.some(t => subLower.includes(t))
  );
}

function resolveRawSkuPrice(s) {
  const candidates = [
    s['List Price'],
    s['Price'],
    s['Unit Price (USD)'],
    s['List Price (USD)'],
    s.listPriceFormatted
  ];
  for (const val of candidates) {
    if (val) return val;
  }
  return s.listPrice !== undefined && s.listPrice !== '' ? s.listPrice : '$0.00';
}

function mapSkuToBaseVariant(s, entry) {
  const skuId = s['Product #'] || s.sku || s.partNumber || s.id;
  if (!skuId) return null;
  const desc = s.Description || s.description || s.name || 'Base Chassis CTO Server Variant';
  const rawPrice = resolveRawSkuPrice(s);
  const price = typeof rawPrice === 'number'
    ? `$${rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : String(rawPrice);

  return {
    sku: skuId,
    desc,
    price,
    qty: s.Qty || s.qty || '1',
    optionType: s.optionType || s['Option Type'] || 'CTO Chassis Base',
    constraint: entry.constraint || 'Chassis Standard (Max 1)',
    rules: entry.rules || ['Mandatory base chassis selection required for solution build']
  };
}

function extractActiveBaseVariants(selectedChassis, catalogData) {
  if (!selectedChassis || !catalogData?.entries) return [];
  const variants = [];
  catalogData.entries.forEach(entry => {
    if (!isBaseVariantEntry(entry)) return;
    entry.skus?.forEach(s => {
      const mapped = mapSkuToBaseVariant(s, entry);
      if (mapped && !variants.some(v => v.sku === mapped.sku)) {
        variants.push(mapped);
      }
    });
  });
  return variants;
}

export default function ChassisSyncSummaryView({
  selectedChassis,
  catalogData,
  onSelectChassis,
  onNavigateTab,
  isTaskRunning,
  onTriggerSyncKnowledge
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const fetchSummary = async (signal, forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = forceRefresh ? '/api/chassis-sync-summary?refresh=1' : '/api/chassis-sync-summary';
      const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load sync summary`);
      const result = await res.json();
      if (!signal?.aborted) setData(result);
    } catch (err) {
      if (err?.name === 'AbortError' || signal?.aborted) return;
      const message = err?.name === 'TimeoutError'
        ? 'Sync summary request timed out while scanning catalogs. Click Retry to reload.'
        : (err?.message || 'Failed to load sync summary');
      setError(message);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchSummary(controller.signal, false);
    return () => controller.abort();
  }, [isTaskRunning]);

  const activeProductModel = useMemo(() => {
    if (!selectedChassis || !data?.variants) return null;
    return data.variants.find(v => v.id === selectedChassis) || null;
  }, [selectedChassis, data]);

  const activeProductBaseVariants = useMemo(
    () => extractActiveBaseVariants(selectedChassis, catalogData),
    [selectedChassis, catalogData]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-5 text-slate-400">
        <RefreshCw className="size-4 motion-safe:animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-semibold text-slate-600">Loading Portfolio Sync Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-8">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-rose-800">Failed to Load Sync Summary</h3>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={() => fetchSummary(undefined, true)}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in">
      <ChassisHeaderSummary
        summary={data?.summary}
        onTriggerSyncKnowledge={onTriggerSyncKnowledge}
        isTaskRunning={isTaskRunning}
      />

      <ChassisActiveModelCard
        activeProductModel={activeProductModel}
        activeProductBaseVariants={activeProductBaseVariants}
        selectedChassis={selectedChassis}
        onNavigateTab={onNavigateTab}
      />

      <ChassisPortfolioTable
        variants={data?.variants || []}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFamily={selectedFamily}
        setSelectedFamily={setSelectedFamily}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        families={data?.summary?.families || []}
        selectedChassis={selectedChassis}
        onSelectChassis={onSelectChassis}
      />
    </div>
  );
}
