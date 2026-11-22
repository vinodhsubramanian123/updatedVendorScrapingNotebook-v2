import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu } from 'lucide-react';
import CdpHealthBadge from './CdpHealthBadge';
import NotebookLmHealthBadge from './NotebookLmHealthBadge';
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
  catalogData,
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
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    const handleClickOutside = (event) => {
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
    <header className="relative md:sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-5 py-2 shadow-xs space-y-1.5">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight whitespace-nowrap leading-none">
                HPE ProLiant AI Studio
              </h1>
            </div>
          </div>

        </div>

        <div className="flex-1 min-w-[160px] basis-full md:basis-0 md:max-w-md order-3 md:order-2">
          <SmartSearchInput
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            hasCatalog={Boolean(catalogData)}
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
            searchInputRef={searchInputRef}
          />
        </div>

        <div className="flex items-center gap-1.5 order-2 md:order-3 shrink-0">
          <CdpHealthBadge />
          <NotebookLmHealthBadge onOpenRag={onOpenRag} />
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
