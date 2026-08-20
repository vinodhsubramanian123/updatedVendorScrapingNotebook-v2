import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu } from 'lucide-react';
import CdpHealthBadge from './CdpHealthBadge';
import NotebookLmHealthBadge from './NotebookLmHealthBadge';
import ChassisSelector from './header/ChassisSelector';
import SmartSearchInput from './header/SmartSearchInput';
import NavigationTabs from './header/NavigationTabs';

export default function Header({ 
  catalogs, 
  catalogData,
  selectedChassis, 
  onSelectChassis, 
  activeTab, 
  setActiveTab,
  _onSmartSearch,
  _onSearchLocal,
  onOpenRag,
  onOpenFeedbackDrawer,
  onOpenSettings,
  _isTaskRunning,
  isCatalogLoading = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChassisOpen, setIsChassisOpen] = useState(false);
  const [chassisFilter, setChassisFilter] = useState('');
  const chassisDropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
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
    if (onOpenRag) {
      onOpenRag(q);
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-sm space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
                HPE ProLiant AI Studio
                <span className="badge badge-emerald text-[9px] py-0 px-1.5 font-mono">v2.5 Dual-Brain</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                BOQ Physical Math &amp; Conflict Resolution Engine
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <ChassisSelector
            catalogs={catalogs}
            selectedChassis={selectedChassis}
            onSelectChassis={onSelectChassis}
            isChassisOpen={isChassisOpen}
            setIsChassisOpen={setIsChassisOpen}
            chassisFilter={chassisFilter}
            setChassisFilter={setChassisFilter}
            chassisDropdownRef={chassisDropdownRef}
            isCatalogLoading={isCatalogLoading}
          />
        </div>

        <SmartSearchInput
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          localSearchResults={localSearchResults}
          onSubmitSearch={handleSearchSubmit}
          onOpenRag={onOpenRag}
          searchContainerRef={searchContainerRef}
        />

        <div className="flex items-center gap-2">
          <CdpHealthBadge />
          <NotebookLmHealthBadge />
        </div>
      </div>

      <NavigationTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFeedbackDrawer={onOpenFeedbackDrawer}
        onOpenSettings={onOpenSettings}
      />
    </header>
  );
}
