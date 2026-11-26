import { useModalFocus } from '../../hooks/useModalFocus.js';
import React, { useState, useEffect } from 'react';
import {
  Sparkles, Layers, Scale, Package, Cpu, Sliders,
  FileSpreadsheet, Activity, PanelLeftClose, PanelLeftOpen, X
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Evaluate & Size',
    items: [
      { id: 'orchestrator', label: 'BOQ & Presales Studio', shortLabel: 'Studio', icon: Sparkles },
      { id: 'matrix', label: '5-Tier Matrix', shortLabel: 'Matrix', icon: Layers },
      { id: 'reconciliation', label: 'BOM Reconciliation', shortLabel: 'Reconcile', icon: Scale }
    ]
  },
  {
    label: 'Catalog & Rules',
    items: [
      { id: 'catalog', label: 'Catalog Explorer', shortLabel: 'Catalog', icon: Package },
      { id: 'portfolio', label: 'Portfolio & Manifests', shortLabel: 'Portfolio', icon: Cpu },
      { id: 'pipeline', label: 'Pipeline & Rules', shortLabel: 'Pipeline', icon: Sliders }
    ]
  },
  {
    label: 'Operations & Audit',
    items: [
      { id: 'artifacts', label: 'Exports & Artifacts', shortLabel: 'Exports', icon: FileSpreadsheet },
      { id: 'telemetry', label: 'Telemetry & Traces', shortLabel: 'Traces', icon: Activity }
    ]
  }
];

const FLAT_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export function useIsDesktop() {
  const check = () => (typeof window === 'undefined' || window.innerWidth === 0 || window.innerWidth >= 1024);
  const [isDesktop, setIsDesktop] = useState(check);

  useEffect(() => {
    const onResize = () => setIsDesktop(check());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isDesktop;
}

function SidebarNavContent({ activeTab, collapsed, badges = {}, onSelect, includeDataTab = true }) {
  return (
    <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          {!collapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.label}
            </div>
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const count = badges[item.id];
            return (
              <button
                key={item.id}
                type="button"
                {...(includeDataTab ? { 'data-tab': item.id, 'aria-current': active ? 'page' : undefined } : {})}
                title={collapsed ? item.label : undefined}
                onClick={() => onSelect(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-600/12 text-emerald-700 border border-emerald-500/30 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                {!collapsed && count != null && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function MobileNavStrip({ activeTab, onTabChange }) {
  return (
    <nav aria-label="Mobile workspace navigation" className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 surface-panel">
      <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
        {FLAT_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-tab={item.id}
              aria-current={active ? 'page' : undefined}
              onClick={() => onTabChange?.(item.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer border transition-colors ${
                active
                  ? 'bg-emerald-600/12 text-emerald-700 border-emerald-500/30'
                  : 'text-slate-600 hover:bg-slate-100 border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <select
        aria-label="More dashboard views"
        value={activeTab}
        onChange={(e) => onTabChange?.(e.target.value)}
        className="shrink-0 h-8 w-28 truncate whitespace-nowrap text-[11px] font-semibold rounded-lg border border-slate-300 surface-panel px-2 py-1 text-slate-700 cursor-pointer"
      >
        {FLAT_NAV_ITEMS.map((item) => (
          <option key={item.id} value={item.id} title={item.label}>{item.shortLabel}</option>
        ))}
      </select>
    </nav>
  );
}

export default function Sidebar({ activeTab, onTabChange, mobileOpen, onCloseMobile, badges, isDesktop = true }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('hpe_sidebar_collapsed') === '1'; }
    catch (_) { return false; }
  });

  const mobileDialog = useModalFocus(!isDesktop && mobileOpen, onCloseMobile);

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem('hpe_sidebar_collapsed', next ? '1' : '0'); } catch (_) {}
  };

  const handleSelect = (id) => {
    onTabChange?.(id);
    onCloseMobile?.();
  };

  return (
    <>
      {isDesktop && (
        <aside className={`sticky top-0 h-screen flex flex-col shrink-0 border-r border-slate-200 surface-panel transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
          <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200 shrink-0">
            {!collapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">H</div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 truncate">HPE ProLiant Studio</div>
                  <div className="text-[10px] font-medium text-slate-500 truncate">AI Architecture Engine</div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer shrink-0 mx-auto lg:mx-0"
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
          <SidebarNavContent activeTab={activeTab} collapsed={collapsed} badges={badges} onSelect={handleSelect} includeDataTab={true} />
        </aside>
      )}

      {!isDesktop && mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-slate-950/50 backdrop-blur-xs" onClick={onCloseMobile} />
          <div ref={mobileDialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Workspace navigation menu" className="w-64 surface-panel border-l border-slate-200 flex flex-col shadow-2xl">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
              <span className="text-xs font-extrabold text-slate-900">HPE ProLiant Studio</span>
              <button type="button" onClick={onCloseMobile} aria-label="Close navigation" className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarNavContent activeTab={activeTab} collapsed={false} badges={badges} onSelect={handleSelect} includeDataTab={false} />
          </div>
        </div>
      )}
    </>
  );
}
