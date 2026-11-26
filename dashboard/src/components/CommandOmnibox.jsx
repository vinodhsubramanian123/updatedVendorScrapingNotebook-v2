import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, BookOpen, Cpu, Package, Compass, CornerDownLeft } from 'lucide-react';
import { requestJson } from '../services/api.js';

function useOmniboxShortcut(inputRef, setIsOpen) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      const targetTag = String(e.target?.tagName || '').toLowerCase();
      const isTyping = ['input', 'textarea', 'select'].includes(targetTag) || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === '/' && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputRef, setIsOpen]);
}

function useGlobalSearchFetch(query, isOpen) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen || trimmed.length < 1) {
      setData(null);
      setLoading(false);
      return;
    }
    setData(null);
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      requestJson(`/api/global-search?q=${encodeURIComponent(trimmed)}&limit=6`, { signal: controller.signal })
        .then(res => { if (!controller.signal.aborted) setData(res?.results || null); })
        .catch(() => { if (!controller.signal.aborted) setData(null); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen]);

  return { data, loading };
}

function OmniboxResultGroups({ trimmed, loading, results, onSelectAction, onSelectSku, onAskStudio, onPreviewStudio, onOpenRag }) {
  const skus = results?.skus || [];
  const platforms = results?.platforms || [];
  const actions = results?.actions || [];

  return (
    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 surface-panel rounded-xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto p-2 space-y-2 text-xs">
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onAskStudio(trimmed)}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/15 text-emerald-800 font-semibold cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Run in Presales Studio: &ldquo;{trimmed}&rdquo;</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-700 flex items-center gap-0.5 shrink-0">
            <CornerDownLeft className="w-3 h-3" /> Enter
          </span>
        </button>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onPreviewStudio(trimmed)}
            className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-slate-500" /> Preview Route Only
          </button>
          <button
            type="button"
            onClick={() => onOpenRag(trimmed)}
            className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Ask NotebookLM RAG
          </button>
        </div>
      </div>

      {loading && <div className="px-2.5 py-1 text-[11px] text-slate-500">Searching catalogs, manifests, and routes...</div>}

      {actions.length > 0 && (
        <div>
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace Views</div>
          {actions.map(act => (
            <button key={act.id} type="button" onClick={() => onSelectAction(act.tab)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-left cursor-pointer">
              <Compass className="w-3.5 h-3.5 text-slate-400" /> {act.label}
            </button>
          ))}
        </div>
      )}

      {platforms.length > 0 && (
        <div>
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Manifests</div>
          {platforms.map(p => (
            <button key={p.productId} type="button" onClick={() => onSelectAction('catalog', p.productId)} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-left cursor-pointer">
              <span className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-indigo-500" /> {p.productId.replace(/_/g, ' ')}</span>
              <span className="text-[10px] font-mono text-slate-500">{p.domain}</span>
            </button>
          ))}
        </div>
      )}

      {skus.length > 0 && (
        <div>
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Catalog SKUs</div>
          {skus.map((item, idx) => (
            <button key={`${item.platformId}-${item.sku}-${idx}`} type="button" onClick={() => onSelectSku(item)} className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left cursor-pointer">
              <span className="flex items-center gap-2 min-w-0">
                <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-bold text-slate-800 shrink-0">{item.sku}</span>
                <span className="truncate text-slate-600">{item.description}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500 shrink-0 tabular-nums">
                {item.listPriceUsd != null ? `$${Number(item.listPriceUsd).toLocaleString()}` : item.platformId}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommandOmnibox({
  onSelectChassis,
  onSelectSku,
  onOpenRag,
  onRunPresalesQuery,
  onPreviewPresalesQuery,
  onSelectTab
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useOmniboxShortcut(inputRef, setIsOpen);
  const { data: results, loading } = useGlobalSearchFetch(query, isOpen);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsOpen(false);
    if (onRunPresalesQuery) onRunPresalesQuery(trimmed);
    else onOpenRag?.(trimmed);
  };

  const trimmed = query.trim();

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 max-w-md">
      <form onSubmit={handleSubmit} className="relative flex items-center min-w-0">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 sm:left-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          aria-label="Search catalog SKUs or ask NotebookLM"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          placeholder="Search SKUs, platforms, or ask Presales AI..."
          className="w-full min-w-0 h-9 pl-8 sm:pr-14 pr-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium text-slate-800 placeholder:text-slate-400"
        />
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-200 rounded bg-white absolute right-2 pointer-events-none">
          ⌘K
        </kbd>
      </form>

      {isOpen && trimmed.length >= 1 && (
        <OmniboxResultGroups
          trimmed={trimmed}
          loading={loading}
          results={results}
          onSelectAction={(tab, platformId) => {
            if (platformId) onSelectChassis?.(platformId);
            if (tab) onSelectTab?.(tab);
            setIsOpen(false);
          }}
          onSelectSku={(item) => {
            if (item.platformId) onSelectChassis?.(item.platformId);
            onSelectSku?.(item.sku);
            onSelectTab?.('catalog');
            setIsOpen(false);
          }}
          onAskStudio={(q) => { onRunPresalesQuery?.(q); setIsOpen(false); }}
          onPreviewStudio={(q) => { onPreviewPresalesQuery?.(q); setIsOpen(false); }}
          onOpenRag={(q) => { onOpenRag?.(q); setIsOpen(false); }}
        />
      )}
    </div>
  );
}
