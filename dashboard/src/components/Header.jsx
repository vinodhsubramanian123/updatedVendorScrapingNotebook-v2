import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu } from 'lucide-react';
import CdpHealthBadge from './CdpHealthBadge';
import NotebookLmHealthBadge from './NotebookLmHealthBadge';
import ChassisSelector from './header/ChassisSelector';
import SmartSearchInput from './header/SmartSearchInput';
import NavigationTabs from './header/NavigationTabs';
import { formatPrice } from '../services/pricing.js';

const QUESTION_WORDS = ['why', 'how', 'does', 'can', 'what', 'should', 'is', 'where', 'notebook', 'rag', 'compat', 'rule', 'explain'];

function resolveSkuId(sku) {
  return sku['Product #'] || sku.sku || sku.partNumber || sku.id || '';
}

function resolveSkuDescription(sku) {
  return sku.Description || sku.description || sku.name || 'HPE Component';
}

function resolveSkuPrice(sku) {
  return formatPrice(sku['Unit Price (USD)'] ?? sku['Price (USD)'] ?? sku['List Price'] ?? sku.listPriceFormatted ?? sku.listPrice);
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

  const isQuestion = query.split(/\W+/).some(word => QUESTION_WORDS.includes(word));
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
    if (onSearchLocal && !localSearchResults.isQuestion && localSearchResults.skus.length > 0) {
      onSearchLocal(q);
    } else if (onSmartSearch) {
      onSmartSearch(q);
    } else if (onOpenRag) {
      onOpenRag(q);
    }
  };

  return (
    <header className="relative md:sticky top-0 z-40 bg-white/95 border-b border-slate-200 px-3 sm:px-4 py-2 shadow-sm space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
                HPE ProLiant AI Studio
              </h1>
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

        <div className="flex-1 min-w-0 basis-full md:basis-48 md:max-w-md order-3 md:order-2">
          <SmartSearchInput
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            localSearchResults={localSearchResults}
            onSubmitSearch={handleSearchSubmit}
            onSelectSku={sku => {
              setIsSearchOpen(false);
              onSearchLocal?.(sku);
            }}
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

        <div className="flex flex-wrap items-center gap-1.5 order-2 md:order-3">
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
