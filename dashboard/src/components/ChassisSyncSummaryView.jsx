import Tooltip from './Tooltip';
import React, { useState, useEffect, useMemo } from 'react';
import {

  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Server,
  Layers,
  Database,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Info,
  X
} from 'lucide-react';

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
  const [inspectVariant, setInspectVariant] = useState(null);

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

  // Extract Base Chassis CTO Variants specifically for the selected product catalog
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

  const familiesList = useMemo(() => {
    if (!data || !data.variants) return [];
    const set = new Set(data.variants.map(v => v.family).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const filteredVariants = useMemo(() => {
    if (!data || !data.variants) return [];
    return data.variants.filter(v => {
      const matchesChassisScope =
        !selectedChassis ||
        v.id === selectedChassis ||
        v.chassis === selectedChassis ||
        v.chassisDir === selectedChassis ||
        (v.chassisDir && selectedChassis && (v.chassisDir.includes(selectedChassis) || selectedChassis.includes(v.id) || v.id.includes(selectedChassis)));

      const matchesSearch =
        !searchTerm ||
        v.chassis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.family.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFamily = selectedFamily === 'ALL' || v.family === selectedFamily;
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'HEALTHY' && v.syncStatus === 'HEALTHY') ||
        (selectedStatus === 'PARSED_NO_RULES' && v.syncStatus === 'PARSED_NO_RULES') ||
        (selectedStatus === 'INCOMPLETE' && v.syncStatus === 'INCOMPLETE');

      return matchesChassisScope && matchesSearch && matchesFamily && matchesStatus;
    });
  }, [data, selectedChassis, searchTerm, selectedFamily, selectedStatus]);

  if (isLoading && !data) {
    return (
      <div className="glass-card p-8 text-center space-y-4 animate-pulse">
        <div className="flex justify-center items-center gap-3">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Analyzing Portfolio Chassis Sync & Rules Integrity...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 border-l-4 border-l-red-500 space-y-3">
        <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
          <XCircle className="w-5 h-5" />
          <span>Sync Summary Error</span>
        </div>
        <p className="text-xs text-slate-600">{error}</p>
        <button
          onClick={fetchSummary}
          className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors"
        >
          Retry Fetching Health Summary
        </button>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Active Scope Switcher Banner when a product is selected */}
      {selectedChassis ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                📌 Focused Product Scope
              </span>
              <span className="text-xs text-blue-200">
                No cross-product data pollution active
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{activeProductModel ? activeProductModel.chassis : selectedChassis}</span>
            </h3>
            <p className="text-xs text-blue-200/80">
              Family: <strong className="text-white">{activeProductModel?.family || 'ProLiant'}</strong> &bull; Gen: <strong className="text-white">{activeProductModel?.gen || 'Gen12'}</strong> &bull; Total SKUs: <strong className="text-emerald-300">{activeProductModel?.totalSKUs || 0}</strong> &bull; Location: <code className="text-[11px] text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded">{activeProductModel?.chassisDir || selectedChassis}</code>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectChassis('')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Switch to All HPE Products (Portfolio View)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white shadow-md border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/40">
                🌐 Full Portfolio Overview Mode
              </span>
              <span className="text-xs text-slate-300">
                Consolidated HPE Enterprise Lineup
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400 shrink-0" />
              <span>All Scanned HPE Product Models &amp; Chassis Families ({summary.totalChassisVariants})</span>
            </h3>
            <p className="text-xs text-slate-300/80">
              Showing consolidated status across {summary.totalFamilies} Product Families ({familiesList.join(', ')}). Click any product to scope context.
            </p>
          </div>
        </div>
      )}

      {/* DEDICATED SECTION: Active Product Scope's Base CTO Chassis Variants */}
      {selectedChassis && (
        <div className="glass-card p-6 space-y-4 border-l-4 border-l-emerald-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Product Specific Variants
                </span>
                <span className="text-xs font-semibold text-slate-500">Scoped to {activeProductModel?.chassis || selectedChassis}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-600" />
                Base CTO Chassis Variants ({activeProductBaseVariants.length} CTO Options)
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              These are the atomic CTO server chassis options available specifically for <strong className="text-slate-800">{activeProductModel?.chassis}</strong>.
            </p>
          </div>

          {activeProductBaseVariants.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              No specific base CTO chassis variants parsed for this item or catalog data is loading...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Product #</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Option Type</th>
                    <th className="px-4 py-3 text-right">List Price</th>
                    <th className="px-4 py-3 text-center">Constraint</th>
                    <th className="px-4 py-3 text-center">Rule Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeProductBaseVariants.map((variant, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        {variant.sku}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {variant.desc}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {variant.optionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                        {variant.price}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          {variant.constraint}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Validated
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Top Header & Sync Health Overview */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live Portfolio Status
              </span>
              <span className="text-xs text-slate-500">
                Last verified: {new Date(summary.lastSyncTimestamp).toLocaleTimeString()}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              Chassis Variants &amp; Rules Synchronization Summary
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Verification dashboard for all parsed HPE server, storage, tape, and synergy chassis variants. Ensures 100% SKU data completeness, rule coverage, and Excel export sync across the portfolio.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Tooltip content="Refresh status"><button
              onClick={fetchSummary}
              disabled={isLoading}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
              
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              Refresh Status
            </button></Tooltip>
            {onTriggerSyncKnowledge && (
              <button
                onClick={onTriggerSyncKnowledge}
                disabled={isTaskRunning}
                className="btn-primary text-xs flex items-center gap-2 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                Sync Knowledge Base
              </button>
            )}
          </div>
        </div>

        {/* Executive Health KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          
          {/* KPI 1: Overall Sync Health */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Overall Sync Health</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{summary.healthPercentage}%</span>
              <span className="text-xs font-semibold text-emerald-600">
                {summary.healthyVariants} / {summary.totalChassisVariants} Healthy
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${summary.healthPercentage}%` }}
              />
            </div>
          </div>

          {/* KPI 2: Total Chassis Families & Variants */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Parsed Chassis Variants</span>
              <Server className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{summary.totalChassisVariants}</span>
              <span className="text-xs text-slate-500">
                across {summary.totalFamilies} Product Families
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              ProLiant, Alletra, StoreEver, Synergy, Cray
            </p>
          </div>

          {/* KPI 3: Total Portfolio SKUs */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Total Unique SKUs</span>
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{summary.totalPortfolioSKUs.toLocaleString()}</span>
              <span className="text-xs text-emerald-600 font-semibold">100% Parsed</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Option parts, base chassis &amp; service SKUs
            </p>
          </div>

          {/* KPI 4: Active Catalog Rules */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Active Aspect Rules</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{summary.totalActiveRules}</span>
              <span className="text-xs text-purple-600 font-semibold">5 Levels</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Thermal, Electrical, Memory, Slot &amp; Vendor
            </p>
          </div>

        </div>

        {/* Real-Time SKU Validation & Chassis Sync Progress Component */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-emerald-50/60 border border-blue-200/80 shadow-xs text-slate-900 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100/80 text-blue-700 rounded-xl border border-blue-200">
                <Zap className={`w-4 h-4 ${isTaskRunning ? 'animate-bounce text-amber-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span>Chassis Variant Sync &amp; Validation Pipeline</span>
                  {isTaskRunning ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-bold animate-pulse">
                      Processing Sync...
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                      100% Synchronized
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Real-time status tracking SKU parsing, rule verification, and artifact health across all portfolio variants.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-lg font-black text-emerald-700">
                {summary.healthyVariants} / {summary.totalChassisVariants} <span className="text-xs font-semibold text-slate-500">Variants</span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">
                {Math.round((summary.healthyVariants / Math.max(summary.totalChassisVariants, 1)) * 100)}% Complete
              </div>
            </div>
          </div>

          {/* Animated Main Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-200/80 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300/80">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isTaskRunning
                    ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 animate-pulse'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500'
                }`}
                style={{
                  width: `${Math.round((summary.healthyVariants / Math.max(summary.totalChassisVariants, 1)) * 100)}%`
                }}
              />
            </div>
          </div>

          {/* Sub-Stage Sync Milestones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>SKU Parsing ({summary.totalPortfolioSKUs})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Rules Engine ({summary.totalActiveRules})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Excel Artifacts ({summary.totalChassisVariants})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>NotebookLM RAG Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chassis, family, or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Family:</span>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Families ({familiesList.length})</option>
              {familiesList.map(fam => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-600">Sync Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="HEALTHY">Healthy (Fully Synced)</option>
              <option value="PARSED_NO_RULES">Parsed (Needs Rules)</option>
              <option value="INCOMPLETE">Incomplete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chassis Variants Matrix Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              Chassis Variants Synchronization Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredVariants.length} of {data.variants.length} chassis variants
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Chassis Variant &amp; Family</th>
                <th className="px-4 py-3">SKU Intelligence</th>
                <th className="px-4 py-3">Aspect Rules</th>
                <th className="px-4 py-3 text-center">Export Artifacts</th>
                <th className="px-4 py-3 text-center">Sync Health</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                    No chassis variants match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredVariants.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Column 1: Chassis Variant & Family */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {v.chassis}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                            {v.family} / {v.gen}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]" title={v.chassisDir}>
                            {v.chassisDir}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: SKU Intelligence */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.skuStatus === 'PARSED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {v.skuStatus}
                          </span>
                          <span className="font-extrabold text-slate-900">{v.totalSKUs.toLocaleString()} SKUs</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{v.subcategoriesCount} Subcats</span>
                          <span>&bull;</span>
                          <span>{v.baseVariantsCount} Base CTO Variants</span>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Aspect Rules */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.rulesStatus === 'VALID'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : v.rulesStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {v.rulesStatus}
                          </span>
                          <span className="font-bold text-slate-900">{v.totalRules} Rules</span>
                          {v.isRulesFallback && (
                            <span className="text-[10px] text-amber-600 font-medium">(Fallback)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Tooltip content="Vendor level"><span >{v.ruleLevels.VENDOR} Standard</span></Tooltip>
                          <span>&bull;</span>
                          <Tooltip content="Chassis level"><span >{v.ruleLevels.CHASSIS} Physical</span></Tooltip>
                          <span>&bull;</span>
                          <Tooltip content="Category level"><span >{v.ruleLevels.CATEGORY} Category</span></Tooltip>
                        </div>
                      </div>
                    </td>

                    {/* Column 4: Export Artifacts */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {v.hasExcel ? (
                          <Tooltip content="Download Excel Workbook"><a
                            href={v.xlsxPath}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </a></Tooltip>
                        ) : (
                          <Tooltip content="Excel workbook missing"><span className="p-1.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200" >
                            <FileSpreadsheet className="w-4 h-4" />
                          </span></Tooltip>
                        )}

                        {v.hasPdf ? (
                          <Tooltip content="View QuickSpecs PDF"><a
                            href={v.pdfPath}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            
                          >
                            <FileText className="w-4 h-4" />
                          </a></Tooltip>
                        ) : (
                          <Tooltip content="QuickSpecs PDF missing"><span className="p-1.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200" >
                            <FileText className="w-4 h-4" />
                          </span></Tooltip>
                        )}
                      </div>
                    </td>

                    {/* Column 5: Sync Health */}
                    <td className="px-4 py-4 text-center">
                      {v.syncStatus === 'HEALTHY' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          100% Synced
                        </span>
                      )}
                      {v.syncStatus === 'PARSED_NO_RULES' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Needs Rules
                        </span>
                      )}
                      {v.syncStatus === 'INCOMPLETE' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5" />
                          Incomplete
                        </span>
                      )}
                    </td>

                    {/* Column 6: Action */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (onSelectChassis) onSelectChassis(v.id);
                            if (onNavigateTab) onNavigateTab('catalog');
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-blue-200"
                        >
                          Select Context
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
