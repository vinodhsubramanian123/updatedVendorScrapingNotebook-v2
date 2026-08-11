import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Cpu, Search, Sparkles, Server, RefreshCw, MessageSquare, Settings,
  LayoutDashboard, Table, FileText, ShieldAlert, FileSpreadsheet, Activity, Terminal, ShieldCheck,
  ChevronDown, Check, ArrowRight, Bot, Zap, CheckCircle2, AlertCircle,
  Maximize2, X, HelpCircle, Send
} from 'lucide-react';
import CdpHealthBadge from './CdpHealthBadge';
import NotebookLmHealthBadge from './NotebookLmHealthBadge';

export default function Header({ 
  catalogs, 
  catalogData,
  selectedChassis, 
  onSelectChassis, 
  activeTab, 
  setActiveTab,
  onSmartSearch,
  onSearchLocal,
  onOpenRag,
  onOpenFeedbackDrawer,
  onOpenSettings,
  isTaskRunning,
  isCatalogLoading = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isComplexModalOpen, setIsComplexModalOpen] = useState(false);
  const [isChassisOpen, setIsChassisOpen] = useState(false);
  const [chassisFilter, setChassisFilter] = useState('');
  const chassisDropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsComplexModalOpen(false);
        setIsChassisOpen(false);
      }
    };
    const handleClickOutside = (event) => {
      if (chassisDropdownRef.current && !chassisDropdownRef.current.contains(event.target)) {
        setIsChassisOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Universal Instant Local Index Lookup
  const localSearchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { skus: [], confidence: 0, isQuestion: false };

    const questionWords = ['why', 'how', 'does', 'can', 'what', 'should', 'is', 'where', 'notebook', 'rag', 'compat', 'rule', 'explain'];
    const isQuestion = questionWords.some(w => query.includes(w));

    let matches = [];
    if (catalogData && catalogData.entries) {
      catalogData.entries.forEach(entry => {
        entry.skus?.forEach(sku => {
          const skuId = (sku['Product #'] || sku.sku || sku.partNumber || sku.id || '').toLowerCase();
          const desc = (sku.Description || sku.description || sku.name || '').toLowerCase();
          const category = (entry.parentCategory || '').toLowerCase();
          const rulesText = (entry.rules || []).join(' ').toLowerCase();

          let matchScore = 0;
          if (skuId && (skuId === query || skuId.includes(query))) {
            matchScore = skuId === query ? 100 : 90;
          } else if (desc.includes(query)) {
            matchScore = 80;
          } else if (category.includes(query) || rulesText.includes(query)) {
            matchScore = 70;
          }

          if (matchScore > 0) {
            matches.push({
              sku: sku['Product #'] || sku.sku || sku.partNumber || sku.id,
              description: sku.Description || sku.description || sku.name || 'HPE Component',
              price: sku['Unit Price (USD)'] || sku['List Price'] || sku.listPriceFormatted || '$0.00',
              optionType: sku.optionType || sku['Option Type'] || 'CTO Option',
              parentCategory: entry.parentCategory || 'General',
              matchScore
            });
          }
        });
      });
    }

    // Sort by match score descending
    matches.sort((a, b) => b.matchScore - a.matchScore);
    const topMatches = matches.slice(0, 5);

    let confidence = 0;
    if (topMatches.length > 0) {
      confidence = isQuestion ? 45 : topMatches[0].matchScore;
    } else {
      confidence = 10;
    }

    return {
      skus: topMatches,
      totalCount: matches.length,
      confidence,
      isQuestion
    };
  }, [searchQuery, catalogData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearchOpen(false);
    // If query is explicitly a question or local confidence is low, launch NotebookLM RAG
    if (localSearchResults.isQuestion || (localSearchResults.skus.length === 0 && localSearchResults.confidence < 30)) {
      onSmartSearch(q);
    } else {
      // Otherwise navigate directly to Catalog Explorer with search query applied
      if (onSearchLocal) {
        onSearchLocal(q);
      } else {
        setActiveTab('catalog');
      }
    }
  };

  const handleSelectLocalSku = (item) => {
    setIsSearchOpen(false);
    const q = item.sku || searchQuery;
    if (onSearchLocal) {
      onSearchLocal(q);
    } else {
      setActiveTab('catalog');
    }
  };

  const handleEscalateToRag = () => {
    setIsSearchOpen(false);
    onSmartSearch(searchQuery);
  };

  const currentCatalog = catalogs.find(c => c.id === selectedChassis) || catalogs[0];

  const filteredCatalogs = catalogs.filter(c => 
    c.chassis.toLowerCase().includes(chassisFilter.toLowerCase()) ||
    (c.family && c.family.toLowerCase().includes(chassisFilter.toLowerCase()))
  );

  const navTabs = [
    { id: 'overview', label: 'Executive Dashboard', icon: LayoutDashboard, primary: true, color: 'text-blue-600' },
    { id: 'sync-summary', label: 'Chassis Sync & Health', icon: ShieldCheck, primary: true, color: 'text-emerald-600' },
    { id: 'boq', label: 'BOQ Evaluator & Matrix', icon: FileText, primary: true, color: 'text-emerald-600' },
    { id: 'reconciliation', label: 'Partner Quote Reconciliation', icon: ShieldCheck, primary: true, color: 'text-indigo-600' },
    { id: 'catalog', label: 'Master Excel Catalog', icon: Table, primary: true, color: 'text-purple-600' },
    { id: 'scraper', label: 'Live CDP Scraper', icon: Terminal, primary: false, color: 'text-emerald-700' },
    { id: 'conflict', label: 'Aspect Math & CLIC', icon: ShieldAlert, primary: false, color: 'text-amber-700' },
    { id: 'artifacts', label: 'Artifacts & Quality Audit', icon: FileSpreadsheet, primary: false, color: 'text-purple-700' },
    { id: 'telemetry', label: 'System Telemetry', icon: Activity, primary: false, color: 'text-blue-700' }
  ];

  const primaryTabs = navTabs.filter(t => t.primary);
  const toolTabs = navTabs.filter(t => !t.primary);

  return (
    <header className="glass-nav px-6 pt-4 pb-2 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Context Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">Catalog Intelligence</h1>
              <p className="text-[11px] font-medium text-slate-500">Multi-Vendor Hardware BOM Engine</p>
            </div>
          </div>

          {/* Global Custom Popover Chassis Selector Pill */}
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="relative" ref={chassisDropdownRef}>
            <button
              type="button"
              onClick={() => setIsChassisOpen(!isChassisOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50/80 via-white to-slate-50 border border-blue-200/90 text-slate-800 hover:border-blue-400 hover:bg-white shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
            >
              <Server className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-slate-900 truncate max-w-[190px]">
                  {selectedChassis && currentCatalog ? currentCatalog.chassis : 'All HPE Products (Portfolio)'}
                </span>
                {selectedChassis && currentCatalog ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    {currentCatalog.totalSKUs} SKUs
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {catalogs.length} Models
                  </span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isChassisOpen ? 'rotate-180 text-blue-600' : ''}`} />
              {isCatalogLoading && (
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0 ml-0.5" />
              )}
            </button>

            {/* Custom Popover Dropdown Menu */}
            {isChassisOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-2">
                {/* Clear / All Products Option */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectChassis('');
                    setIsChassisOpen(false);
                    setChassisFilter('');
                  }}
                  className={`w-full flex items-center justify-between p-2 mb-1.5 rounded-xl text-xs transition-all ${
                    !selectedChassis
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-2xs font-bold'
                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Server className={`w-3.5 h-3.5 shrink-0 ${!selectedChassis ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="truncate">All HPE Products (Portfolio Overview)</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {catalogs.length} Models
                    </span>
                    {!selectedChassis && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                </button>

                <div className="h-[1px] bg-slate-100 my-1" />

                {/* Search filter for chassis list */}
                {catalogs.length > 3 && (
                  <div className="relative mb-2 px-1 pt-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={chassisFilter}
                      onChange={(e) => setChassisFilter(e.target.value)}
                      placeholder="Filter product models..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white"
                      autoFocus
                    />
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                  {filteredCatalogs.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">No matching chassis found</div>
                  ) : (
                    filteredCatalogs.map(c => {
                      const isSelected = c.id === selectedChassis;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onSelectChassis(c.id);
                            setIsChassisOpen(false);
                            setChassisFilter('');
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs font-bold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Server className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="truncate">{c.chassis}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                              {c.totalSKUs} SKUs
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Universal Local Instant Search Bar with RAG Escalation Bridge */}
        <div className="relative flex-1 max-w-md w-full" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 z-10 pointer-events-none" />
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search SKUs, parts (e.g. P73282-B21) or rule specs..."
              className="w-full pl-9 pr-32 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium text-slate-800"
            />

            <div className="absolute right-1.5 flex items-center gap-1 z-10">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsComplexModalOpen(true)}
                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Expand for Complex Multi-sentence / Natural Language Query Workspace"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="submit"
                disabled={isSearching}
                className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" /> Search
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Instant Search Popover Overlay */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-3 space-y-3">
              
              {/* Popover Header with Local Index Confidence */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-extrabold text-slate-800">Local Catalog Index</span>
                  <span className="text-[10px] font-bold text-slate-400">({localSearchResults.totalCount} matches)</span>
                </div>

                <div className="flex items-center gap-2">
                  {localSearchResults.confidence >= 80 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Local Confidence: {localSearchResults.confidence}%
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Low Match ({localSearchResults.confidence}%) &bull; RAG Recommended
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Close search popover (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Local SKU Results */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {localSearchResults.skus.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No matching local SKUs or parts found in current index.
                  </div>
                ) : (
                  localSearchResults.skus.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLocalSku(item)}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700">{item.sku}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {item.optionType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 truncate font-medium mt-0.5">{item.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-emerald-700">{item.price}</span>
                        <div className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 justify-end mt-0.5">
                          View <ArrowRight className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* RAG Escalation Bridge (Explicit distinction from generic local search) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between gap-3 shadow-md">
                  <div className="space-y-0.5 truncate">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Deep QuickSpecs AI RAG</span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">
                      Ask complex hardware compatibility, thermal rules or vendor policies.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleEscalateToRag}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shrink-0 flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <span>Escalate to RAG</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* COMPLEX NATURAL LANGUAGE SEARCH WORKSPACE MODAL */}
        {isComplexModalOpen && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsComplexModalOpen(false);
            }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 relative">
              
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Complex Query &amp; Natural Language Workspace
                    </h3>
                    <p className="text-xs text-slate-500">
                      Type or paste detailed technical questions, multi-part constraints, or thermal rule queries.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsComplexModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sample Prompt Chips for Convenience */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-blue-500" /> Sample Questions:
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    "Does DL380 Gen12 require high performance fans for 240W TDP CPU?",
                    "What are the memory channel limits for 32 DIMMs on Gen12?",
                    "Are -48VDC telco power supply lug kits mandatory for SFF chassis?",
                    "Check part number P73282-B21 compatibility and option rules"
                  ].map((sample, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setSearchQuery(sample)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-600 text-xs transition-all cursor-pointer text-left"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-line Full Textarea */}
              <div className="space-y-1">
                <textarea
                  ref={textareaRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  rows={5}
                  placeholder="Type your multi-sentence technical inquiry or SKU list here... (e.g. 'Evaluate whether dual 240W TDP Intel Xeon processors can be installed on DL380 Gen12 with standard fans or if high-perf fans are required.')"
                  className="w-full p-4 text-xs font-medium bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-800 transition-all leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>{searchQuery.length} characters</span>
                  <span>{localSearchResults.totalCount} local SKU matches found</span>
                </div>
              </div>

              {/* Action Buttons with Purpose Clarity */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!searchQuery.trim()) return;
                    setIsComplexModalOpen(false);
                    if (onSearchLocal) onSearchLocal(searchQuery);
                    else setActiveTab('catalog');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4 text-slate-600" />
                  <span>Filter Local SKU Catalog</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!searchQuery.trim()) return;
                    setIsComplexModalOpen(false);
                    onSmartSearch(searchQuery);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-emerald-300" />
                  <span>Ask NotebookLM AI RAG (Deep Grounding)</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Right Section: CDP Health Indicator, Task Status & Agent Feedback Drawer */}
        <div className="flex items-center gap-2.5">
          {isTaskRunning && (
            <span className="badge badge-amber animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Task Running
            </span>
          )}

          <NotebookLmHealthBadge onOpenRag={onOpenRag} />
          <CdpHealthBadge />
          
          <button
            onClick={onOpenFeedbackDrawer}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            Feedback Queue
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-2xs"
            title="System Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Container */}
      <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {/* Primary Executive Core Tabs */}
        <div className="flex items-center gap-2">
          {primaryTabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-[1.02]'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/90 bg-white border border-slate-200 shadow-2xs'
                }`}
              >
                <IconComponent className={`w-4 h-4 stroke-[2.25px] ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Engine & Scraper Tools Group */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-300 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 px-2 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-indigo-700 stroke-[2.5px]" /> Engine Tools:
          </span>
          {toolTabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-800 hover:text-slate-950 hover:bg-white bg-white border border-slate-200/80 shadow-2xs'
                }`}
              >
                <IconComponent className={`w-4 h-4 stroke-[2.25px] ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

