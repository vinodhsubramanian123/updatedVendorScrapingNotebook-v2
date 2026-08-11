import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Layers, Cpu, HardDrive, Zap, 
  Search, Sliders, Filter, Sparkles, CheckCircle, Database,
  ChevronRight, RefreshCw, Bookmark, HelpCircle, X
} from 'lucide-react';

export default function RulesConfiguration({ catalogData, chassisDir, chassisName }) {
  const [rulesData, setRulesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLevelFilter, setActiveLevelFilter] = useState('ALL');
  const [showStrictOnly, setShowStrictOnly] = useState(false);

  // 1. Fetch rich multi-level rules from the standalone Catalog Rules API
  useEffect(() => {
    if (!chassisDir) return;
    setLoading(true);
    fetch(`/api/catalog-rules?chassisDir=${encodeURIComponent(chassisDir)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load rules API');
        return res.json();
      })
      .then(data => {
        setRulesData(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn('⚠️ Rules API not loaded, using local catalog data fallback:', err);
        setRulesData(null);
        setLoading(false);
      });
  }, [chassisDir]);

  // 2. Dual-Safety Net: Combine API rules with inline catalog entries if necessary
  let parsedRules = rulesData?.parsedRules || [];
  const subcategoryConstraints = rulesData?.subcategoryConstraints || [];
  const isFallback = rulesData?.isFallback || false;
  const sourceFile = rulesData?.sourceFile || 'Fallback Catalog JSON';

  // If we couldn't get any rules from the API, extract inline notes from the main catalog data
  if (parsedRules.length === 0 && catalogData?.entries) {
    catalogData.entries.forEach(entry => {
      if (entry.rules && entry.rules.length > 0) {
        entry.rules.forEach(ruleText => {
          parsedRules.push({
            level: 'SUBCATEGORY',
            ruleType: 'INLINE_NOTE',
            parentCategory: entry.parentCategory,
            subCategory: entry.subCategory,
            ruleText: ruleText,
            isStrict: !ruleText.toLowerCase().includes('recommended')
          });
        });
      }
    });
  }

  // Also extract subcategory limits from catalogData metadata if they're missing from the rules API
  let activeSubcategories = subcategoryConstraints;
  if (activeSubcategories.length === 0 && catalogData?.subcategories) {
    catalogData.subcategories.forEach(sc => {
      activeSubcategories.push({
        parentCategory: sc.parentCategory,
        subCategory: sc.name,
        constraint: sc.constraint,
        maxQty: sc.maxQty,
        level: 'SUBCATEGORY'
      });
    });
  }

  // 3. Filter rules based on Search, Level Filter, and Strictness
  let filteredRules = [...parsedRules];

  if (activeLevelFilter !== 'ALL') {
    filteredRules = filteredRules.filter(r => r.level === activeLevelFilter);
  }

  if (showStrictOnly) {
    filteredRules = filteredRules.filter(r => r.isStrict);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredRules = filteredRules.filter(r => 
      r.ruleText?.toLowerCase().includes(q) ||
      r.parentCategory?.toLowerCase().includes(q) ||
      r.subCategory?.toLowerCase().includes(q) ||
      r.level?.toLowerCase().includes(q)
    );
  }

  // 4. Statistics calculations
  const totalRulesCount = parsedRules.length;
  const strictRulesCount = parsedRules.filter(r => r.isStrict).length;
  const recommendedRulesCount = totalRulesCount - strictRulesCount;
  const learnedRulesCount = parsedRules.filter(r => r.parentCategory === 'Learned Feedback Rules' || r.level === 'VENDOR' && r.ruleText?.includes('flagged')).length;

  const levelBreakdown = {
    VENDOR: parsedRules.filter(r => r.level === 'VENDOR').length,
    CHASSIS: parsedRules.filter(r => r.level === 'CHASSIS').length,
    CATEGORY: parsedRules.filter(r => r.level === 'CATEGORY').length,
    SUBCATEGORY: parsedRules.filter(r => r.level === 'SUBCATEGORY').length,
    SKU: parsedRules.filter(r => r.level === 'SKU').length,
  };

  const levelDetails = {
    VENDOR: { label: 'Vendor Portal', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    CHASSIS: { label: 'Chassis Form-Factor', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    CATEGORY: { label: 'Category Mixing', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    SUBCATEGORY: { label: 'Subcategory Limits', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    SKU: { label: 'SKU Dependency', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. Header Banner */}
      <div className="glass-card p-6 border-l-4 border-l-purple-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600 stroke-[2.25px]" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              HPE ProLiant AI Studio — Multi-Level Business Rules Dashboard
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Real-time catalog rules, physical constraints, and thermal threshold maps for <span className="font-bold text-slate-800">{chassisName || 'Selected Platform'}</span>. 
            Integrates vendor limitations directly from QuickSpecs knowledge grounding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            Source: <span className="text-slate-900 font-extrabold truncate max-w-[150px]">{sourceFile.split('/').pop()}</span>
          </span>
          {isFallback && (
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
              Fallback Active
            </span>
          )}
        </div>
      </div>

      {/* 2. Overview Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Layers className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rules Mapped</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalRulesCount} Rules</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Across {Object.values(levelBreakdown).filter(v => v > 0).length} taxonomy tiers
            </p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Strict Physical Bounds</p>
            <h3 className="text-xl font-extrabold text-rose-950 mt-0.5">{strictRulesCount} Enforced</h3>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">
              {Math.round((strictRulesCount / (totalRulesCount || 1)) * 100)}% strict verification
            </p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Informative Guidelines</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{recommendedRulesCount} Advisory</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Recommended layout practices</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Feedback Loop Deltas</p>
            <h3 className="text-xl font-extrabold text-indigo-950 mt-0.5">{learnedRulesCount} Learned</h3>
            <p className="text-[10px] text-indigo-600 font-medium mt-0.5">Bi-directional loop active</p>
          </div>
        </div>
      </div>

      {/* 3. Subcategory Physical Boundaries & Capacity Limits */}
      {activeSubcategories.length > 0 && (
        <div className="glass-card p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-500 stroke-[2.25px]" />
              Scraped Subcategory Capacity Limits & Slot Bounds
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Automated physical limits scraped from the active OCA tab landmarks (Max CPU, DIMMs, PSUs, etc.)
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {activeSubcategories.map((sc, scIdx) => (
              <div key={scIdx} className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate" title={sc.parentCategory}>
                  {sc.parentCategory}
                </p>
                <p className="text-xs font-extrabold text-slate-900 truncate mt-1" title={sc.subCategory}>
                  {sc.subCategory}
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    sc.maxQty === -1 || sc.maxQty === 32 ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {sc.constraint || 'No Limit'}
                  </span>
                  <span className="text-[11px] font-black text-slate-700">
                    {sc.maxQty !== undefined && sc.maxQty !== -1 && sc.maxQty !== -2 ? `Max ${sc.maxQty}` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filter Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 sticky top-[238px] z-20 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 stroke-[2.25px]" />
          <input
            type="text"
            placeholder="Search catalog rules by level, category path, SKU, mixing keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Level Selector Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveLevelFilter('ALL')}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
              activeLevelFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            All Levels ({totalRulesCount})
          </button>
          {Object.keys(levelBreakdown).map(lvl => (
            <button
              key={lvl}
              onClick={() => setActiveLevelFilter(lvl)}
              disabled={levelBreakdown[lvl] === 0}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all border ${
                activeLevelFilter === lvl
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950 disabled:opacity-40'
              }`}
            >
              {levelDetails[lvl]?.label || lvl} ({levelBreakdown[lvl]})
            </button>
          ))}
        </div>

        {/* Strictness Switch */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
          <span className="text-xs font-bold text-slate-600">Strict Only</span>
          <button
            onClick={() => setShowStrictOnly(!showStrictOnly)}
            className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
              showStrictOnly ? 'bg-rose-500 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-xs" />
          </button>
        </div>
      </div>

      {/* 5. Unified Rules Ledger Tree */}
      <div className="glass-card overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
            <Bookmark className="w-4 h-4 text-purple-600 stroke-[2.25px]" />
            Active Business Rule Catalog &amp; Dependency Ledger
          </h3>
          <span className="badge badge-purple text-[10px]">
            {filteredRules.length} of {totalRulesCount} Matches
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
            <p className="text-xs font-bold">Querying rule configuration catalogs...</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">No active business rules matching current filter context.</p>
            <p className="text-[10px] text-slate-400">Try loosening your search or selecting "All Levels".</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {filteredRules.map((rule, idx) => {
              const lvlInfo = levelDetails[rule.level] || { label: rule.level, color: 'bg-slate-100 text-slate-800' };
              const isLearned = rule.parentCategory === 'Learned Feedback Rules' || rule.level === 'VENDOR' && rule.ruleText?.includes('flagged');

              return (
                <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 max-w-4xl">
                    {/* Level Badge + Breadcrumb Path */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 border rounded-full ${lvlInfo.color}`}>
                        {lvlInfo.label}
                      </span>
                      {rule.parentCategory && (
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          {rule.parentCategory}
                          <ChevronRight className="w-2.5 h-2.5 stroke-[3]" />
                          <span className="text-slate-600">{rule.subCategory}</span>
                        </span>
                      )}
                    </div>

                    {/* Rule text */}
                    <div className="text-xs font-bold text-slate-800 leading-relaxed">
                      {isLearned ? (
                        <span className="text-indigo-900 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 inline-flex items-center gap-1.5 mr-1.5 font-extrabold shadow-3xs">
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          Partner-Learned Loop
                        </span>
                      ) : null}
                      {rule.ruleText}
                    </div>
                  </div>

                  {/* Strictness Action Banner */}
                  <div className="flex items-center justify-end shrink-0 gap-3">
                    {rule.isStrict ? (
                      <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded flex items-center gap-1 shadow-2xs">
                        <AlertTriangle className="w-3 h-3 text-rose-600 stroke-[2.25px]" />
                        Strict Constraint
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded flex items-center gap-1 shadow-2xs">
                        <CheckCircle className="w-3 h-3 text-blue-600 stroke-[2.25px]" />
                        Guideline Advisory
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Diagnostic Note / Help */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
        <Sliders className="w-5 h-5 text-purple-600 stroke-[2] shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-500 leading-relaxed">
          <p className="font-extrabold text-slate-700">How the HPE ProLiant AI Studio Rule Engine Evaluates Vendor BOM Quotes</p>
          <p className="mt-1">
            The rules displayed on this dashboard are dynamically compiled during active catalog scraping of the HPE Partner Portal. 
            When you upload a customer quote under the **BOQ Evaluator** or submit a reconciled quote under **Partner Reconciliation**, 
            the deterministic rules engine computes multi-dimensional aspect algebra (calculating heat thermal TDP limits, riser routing slot configurations, and power electrical draw) 
            prior to submitting candidate variations. 
            If portal validation raises any regional substitutions or unhandled dependencies, the system creates a taxonomy-scoped delta loop, preserving the learned rules in the dashboard for continuous improvement.
          </p>
        </div>
      </div>
    </div>
  );
}
