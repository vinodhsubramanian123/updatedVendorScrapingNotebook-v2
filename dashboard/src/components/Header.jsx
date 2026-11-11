import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu } from 'lucide-react';
import CdpHealthBadge from './CdpHealthBadge';
import NotebookLmHealthBadge from './NotebookLmHealthBadge';
import ChassisSelector from './header/ChassisSelector';
import SmartSearchInput from './header/SmartSearchInput';
import NavigationTabs from './header/NavigationTabs';

const QUESTION_WORDS = ['why', 'how', 'does', 'can', 'what', 'should', 'is', 'where', 'notebook', 'rag', 'compat', 'rule', 'explain'];

function resolveSkuId(sku) {
  return sku['Product #'] || sku.sku || sku.partNumber || sku.id || '';
}

function resolveSkuDescription(sku) {
  return sku.Description || sku.description || sku.name || 'HPE Component';
}

function resolveSkuPrice(sku) {
  return sku['Unit Price (USD)'] || sku['List Price'] || sku.listPriceFormatted || '$0.00';
}

function scoreCatalogSkuMatch(sku, entry, query) {
  const skuId = resolveSkuId(sku).toLowerCase();
  const desc = resolveSkuDescription(sku).toLowerCase();
  const category = (entry.parentCategory || '').toLowerCase();
  const rulesText = (entry.rules || []).join(' ').toLowerCase();

  if (skuId && skuId === query) return 100;
  if (skuId && skuId.includes(query)) return 90;
  if (desc.includes(query)) return 80;
  if (category.includes(query) || rulesText.includes(query)) return 70;
  return 0;
}

function computeLocalSearchResults(searchQuery, catalogData) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return { skus: [], confidence: 0, isQuestion: false };

  const isQuestion = QUESTION_WORDS.some(w => query.includes(w));
  const matches = [];

  if (catalogData?.entries) {
    catalogData.entries.forEach(entry => {
      entry.skus?.forEach(sku => {
        const matchScore = scoreCatalogSkuMatch(sku, entry, query);
        if (matchScore > 0) {
          matches.push({
            sku: resolveSkuId(sku),
            description: resolveSkuDescription(sku),
            price: resolveSkuPrice(sku),
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
  let confidence = 10;
  if (topMatches.length > 0) {
    confidence = isQuestion ? 45 : topMatches[0].matchScore;
  }

  return {
    skus: topMatches,
    totalCount: matches.length,
    confidence,
    isQuestion
  };
}

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
  onOpenQuarantineDrawer,
  onOpenSettings,
  isTaskRunning,
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

  const localSearchResults = useMemo(
    () => computeLocalSearchResults(searchQuery, catalogData),
    [searchQuery, catalogData]
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearchOpen(false);
    if (onSmartSearch) {
      onSmartSearch(q);
    } else if (onOpenRag) {
      onOpenRag(q);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 py-2 shadow-sm space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
                HPE ProLiant AI Studio
                <span className="badge badge-emerald text-[8px] sm:text-[9px] py-0 px-1 font-mono">v2.5 Dual-Brain</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[200px] sm:max-w-none">
                BOQ Physical Math & Conflict Resolution Engine
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />

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

        <div className="flex-1 min-w-[180px] max-w-md order-3 sm:order-2">
          <SmartSearchInput
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            localSearchResults={localSearchResults}
            onSubmitSearch={handleSearchSubmit}
            onOpenRag={(q) => {
              setIsSearchOpen(false);
              if (onSmartSearch) {
                onSmartSearch(q);
              } else if (onOpenRag) {
                onOpenRag(q);
              }
            }}
            searchContainerRef={searchContainerRef}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 order-2 sm:order-3">
          <CdpHealthBadge />
          <NotebookLmHealthBadge />
        </div>
      </div>

      <NavigationTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFeedbackDrawer={onOpenFeedbackDrawer}
        onOpenQuarantineDrawer={onOpenQuarantineDrawer}
        onOpenSettings={onOpenSettings}
      />
    </header>
  );
}
