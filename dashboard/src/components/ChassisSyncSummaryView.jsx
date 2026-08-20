import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import ChassisHeaderSummary from './summary/ChassisHeaderSummary';
import ChassisActiveModelCard from './summary/ChassisActiveModelCard';
import ChassisPortfolioTable from './summary/ChassisPortfolioTable';

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

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chassis-sync-summary');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load sync summary`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching chassis sync summary:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const activeProductModel = useMemo(() => {
    if (!selectedChassis || !data || !data.variants) return null;
    return data.variants.find(v => v.id === selectedChassis) || null;
  }, [selectedChassis, data]);

  const activeProductBaseVariants = useMemo(() => {
    if (!selectedChassis || !catalogData || !catalogData.entries) return [];
    const variants = [];
    catalogData.entries.forEach(entry => {
      const parentLower = (entry.parentCategory || '').toLowerCase();
      const subLower = (entry.subCategory || '').toLowerCase();
      if (
        parentLower.includes('chassis') ||
        parentLower.includes('server') ||
        parentLower.includes('base') ||
        subLower.includes('variant') ||
        parentLower.includes('compute module') ||
        parentLower.includes('system') ||
        parentLower.includes('tape') ||
        subLower.includes('base')
      ) {
        entry.skus?.forEach(s => {
          const skuId = s['Product #'] || s.sku || s.partNumber || s.id;
          const desc = s.Description || s.description || s.name || '';
          const rawPrice =
            s['List Price'] ||
            s['Price'] ||
            s['Unit Price (USD)'] ||
            s['List Price (USD)'] ||
            s.listPriceFormatted ||
            (s.listPrice !== undefined && s.listPrice !== '' ? s.listPrice : '$0.00');
          const qty = s.Qty || s.qty || '1';
          if (skuId && !variants.find(v => v.sku === skuId)) {
            variants.push({
              sku: skuId,
              desc: desc || 'Base Chassis CTO Server Variant',
              price: typeof rawPrice === 'number' ? `$${rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : String(rawPrice),
              qty,
              optionType: s.optionType || s['Option Type'] || 'CTO Chassis Base',
              constraint: entry.constraint || 'Chassis Standard (Max 1)',
              rules: entry.rules || ['Mandatory base chassis selection required for solution build']
            });
          }
        });
      }
    });
    return variants;
  }, [selectedChassis, catalogData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
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
          onClick={fetchSummary}
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
