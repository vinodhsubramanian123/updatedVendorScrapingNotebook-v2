import React from 'react';
import {
  Menu, BookOpen, MessageSquare, ShieldAlert, Settings, Sun, Moon, WifiOff, RefreshCw
} from 'lucide-react';
import CommandOmnibox from './CommandOmnibox';
import CdpHealthBadge from './CdpHealthBadge';

function HeaderUtilityButtons({
  theme,
  onToggleTheme,
  localOnly,
  onOpenRag,
  onOpenFeedbackDrawer,
  onOpenQuarantineDrawer,
  onOpenSettings
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
      {localOnly && (
        <span className="hidden lg:inline-flex shrink-0">
          <span className="badge badge-amber" title="Local-only execution policy active">
            <WifiOff className="w-3 h-3" /> Local Only
          </span>
        </span>
      )}
      <div className="hidden sm:block">
        <CdpHealthBadge />
      </div>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={() => onOpenRag?.()}
        aria-label="Open NotebookLM RAG Studio"
        title="NotebookLM RAG Studio"
        className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
        <span className="hidden sm:inline">RAG Studio</span>
      </button>
      <button
        type="button"
        onClick={onOpenFeedbackDrawer}
        aria-label="Feedback queue"
        title="Feedback Queue"
        className="hidden sm:inline-flex p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
      >
        <MessageSquare className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onOpenQuarantineDrawer}
        aria-label="Quarantined knowledge deltas"
        title="Quarantined Deltas"
        className="hidden sm:inline-flex p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
      >
        <ShieldAlert className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Settings"
        title="Settings & Model Routing"
        className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Header({
  catalogs = [],
  selectedChassis,
  onSelectChassis,
  onSelectSku,
  setActiveTab,
  onOpenRag,
  onOpenFeedbackDrawer,
  onOpenQuarantineDrawer,
  onOpenSettings,
  isTaskRunning,
  isCatalogLoading = false,
  theme = 'light',
  onToggleTheme,
  onOpenMobileMenu,
  onRunPresalesQuery,
  onPreviewPresalesQuery,
  localOnly = false
}) {
  return (
    <header className="h-14 sticky top-0 z-40 surface-panel border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>

        {selectedChassis && (
          <span className="hidden xl:inline-flex shrink-0">
            <span className="badge badge-emerald">
              <span className="font-mono">{selectedChassis.replace(/_/g, ' ')}</span>
            </span>
          </span>
        )}
        {(isTaskRunning || isCatalogLoading) && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 shrink-0">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>{isTaskRunning ? 'Running' : 'Loading'}</span>
          </span>
        )}
      </div>

      <CommandOmnibox
        catalogs={catalogs}
        selectedChassis={selectedChassis}
        onSelectChassis={onSelectChassis}
        onSelectSku={onSelectSku}
        onOpenRag={onOpenRag}
        onRunPresalesQuery={onRunPresalesQuery}
        onPreviewPresalesQuery={onPreviewPresalesQuery}
        onSelectTab={setActiveTab}
      />

      <HeaderUtilityButtons
        theme={theme}
        onToggleTheme={onToggleTheme}
        localOnly={localOnly}
        onOpenRag={onOpenRag}
        onOpenFeedbackDrawer={onOpenFeedbackDrawer}
        onOpenQuarantineDrawer={onOpenQuarantineDrawer}
        onOpenSettings={onOpenSettings}
      />
    </header>
  );
}
