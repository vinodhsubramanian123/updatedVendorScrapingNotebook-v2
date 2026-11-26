import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X, Sparkles, Search, RefreshCw, Thermometer, Zap, Database, Cpu, Layers, Code } from 'lucide-react';
import { requestJson } from '../services/api.js';
import { useModalFocus } from '../hooks/useModalFocus.js';
import { RagResultCard, RagHistoryTabView } from './rag/RagResultCard.jsx';
import MultiNotebookPanel from './rag/MultiNotebookPanel.jsx';

const SCENARIO_ICON_MAP = {
  THERMAL_TDP: Thermometer,
  TELCO_DC: Zap,
  STORAGE_CACHE: Database,
  MEMORY_SYMMETRY: Cpu,
  PROCESSOR_SPECS: Sparkles,
  PCIE_EXPANSION: Layers,
  AMBIGUITY_HITL: Code
};

const DEFAULT_SCENARIOS = [
  { id: 'THERMAL_TDP', title: 'Thermal Fan Check', icon: Thermometer, query: 'Does an Intel Xeon Platinum 8480+ (350W TDP) processor require High Performance Fan Kits and Heatsinks on DL380 Gen12?', badge: 'badge-rose' },
  { id: 'TELCO_DC', title: 'Telco -48VDC Lug Kit', icon: Zap, query: 'When selecting 800W -48VDC Flex Slot Power Supplies on DL360 Gen12, is the DC power cable lug kit mandatory?', badge: 'badge-amber' },
  { id: 'STORAGE_CACHE', title: 'Storage Cache Battery', icon: Database, query: 'Does the HPE Smart Array P408i-a SR Gen10 Controller require an HPE Smart Storage Hybrid Capacitor or Battery Backup Kit?', badge: 'badge-blue' },
  { id: 'MEMORY_SYMMETRY', title: 'Memory Channel Balance', icon: Cpu, query: 'What are the DIMM interleaving and channel symmetry rules when installing 12x 64GB DDR5 DIMMs across 2 sockets?', badge: 'badge-purple' },
  { id: 'PCIE_EXPANSION', title: 'PCIe Slot & Risers', icon: Layers, query: 'Can Primary Riser 1 and Secondary Riser 2 be populated simultaneously with GPU cards without a second CPU?', badge: 'badge-emerald' }
];

function useRagDrawerBootstrap(isOpen, setHistoryList, setScenariosList) {
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    requestJson('/api/notebooklm-consultations', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted && data.log) setHistoryList(data.log); })
      .catch(() => {});
    requestJson('/api/notebook-scenarios', { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted && data.scenarios?.length > 0) {
          setScenariosList(data.scenarios.map(s => ({ ...s, icon: SCENARIO_ICON_MAP[s.id] || Sparkles })));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isOpen, setHistoryList, setScenariosList]);
}

function RagPresetChips({ scenariosList, isQuerying, onScenarioClick }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-500" /> Quick Scenario Presets
      </p>
      <div className="flex flex-wrap gap-1.5">
        {scenariosList.map((sc) => {
          const Icon = sc.icon || Sparkles;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => onScenarioClick(sc.query)}
              disabled={isQuerying}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
              title={sc.description || sc.query}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span>{sc.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RagQueryBody({ isQuerying, ragElapsedTime, ragData, showSanitizationDetails, onToggleSanitization }) {
  if (isQuerying) {
    return (
      <div className="space-y-3 py-6">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-blue-600 font-semibold animate-pulse">
            <Sparkles className="w-4 h-4" /> Querying NotebookLM RAG...
          </span>
          {ragElapsedTime > 0 && (
            <span className="font-mono text-slate-500 tabular-nums">{ragElapsedTime.toFixed(1)}s</span>
          )}
        </div>
        <div className="h-6 skeleton w-3/4"></div>
        <div className="h-24 skeleton w-full"></div>
      </div>
    );
  }
  if (ragData?.answer) {
    return (
      <RagResultCard
        ragData={ragData}
        showSanitizationDetails={showSanitizationDetails}
        onToggleSanitization={onToggleSanitization}
      />
    );
  }
  return (
    <div className="py-10 text-center text-slate-400 space-y-2">
      <BookOpen className="w-9 h-9 text-slate-300 mx-auto" />
      <p className="text-xs font-semibold text-slate-700">Gemini NotebookLM RAG Ready</p>
      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
        Ask a QuickSpecs question above or select a preset to ground compatibility rules.
      </p>
    </div>
  );
}

function RagQueryTabContent({
  drawerQuery,
  setDrawerQuery,
  selectedChassis,
  isQuerying,
  ragElapsedTime,
  ragData,
  scenariosList,
  showSanitizationDetails,
  onToggleSanitization,
  onSubmit,
  onScenarioClick
}) {
  return (
    <>
      <form onSubmit={onSubmit} className="mb-4">
        <div className="relative flex items-center">
          <input
            type="text"
            value={drawerQuery}
            onChange={(e) => setDrawerQuery(e.target.value)}
            placeholder={`Ask NotebookLM about ${selectedChassis || 'chassis rules'}...`}
            className="w-full pl-8 pr-24 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
          <button
            type="submit"
            disabled={isQuerying || !drawerQuery.trim()}
            className="absolute right-1.5 px-3 py-1.5 text-[11px] font-semibold btn-primary"
          >
            {isQuerying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>Ask RAG</span>
          </button>
        </div>
      </form>

      <RagPresetChips scenariosList={scenariosList} isQuerying={isQuerying} onScenarioClick={onScenarioClick} />
      <RagQueryBody
        isQuerying={isQuerying}
        ragElapsedTime={ragElapsedTime}
        ragData={ragData}
        showSanitizationDetails={showSanitizationDetails}
        onToggleSanitization={onToggleSanitization}
      />
    </>
  );
}

export default function NotebookRagDrawer({
  isOpen,
  onClose,
  ragData,
  isQuerying,
  onQuerySubmit,
  selectedChassis,
  ragElapsedTime,
  catalogs = [],
  localOnly = false
}) {
  const drawerRef = useModalFocus(isOpen, onClose);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [showSanitizationDetails, setShowSanitizationDetails] = useState(false);
  const [scenariosList, setScenariosList] = useState(DEFAULT_SCENARIOS);
  const [activeTab, setActiveTab] = useState('QUERY');
  const [historyList, setHistoryList] = useState([]);

  useRagDrawerBootstrap(isOpen, setHistoryList, setScenariosList);

  if (!isOpen) return null;

  const handleInlineSearch = (e) => {
    e?.preventDefault();
    if (drawerQuery.trim() && onQuerySubmit) onQuerySubmit(drawerQuery);
  };

  const handleScenarioClick = (scenarioQuery) => {
    setDrawerQuery(scenarioQuery);
    onQuerySubmit?.(scenarioQuery);
  };

  const availablePlatforms = catalogs.length > 0 ? catalogs.map(c => c.id) : undefined;
  const tabClass = (tab) => `pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
    activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
  }`;

  const drawer = (
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-slate-950/45 backdrop-blur-xs" onClick={onClose} />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rag-drawer-title"
        tabIndex={-1}
        className="drawer-content w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 p-6 overflow-y-auto focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <h3 id="rag-drawer-title" className="font-bold text-slate-900 text-base flex items-center gap-2">
                NotebookLM RAG Studio
                <span className="badge badge-blue">Traceable RAG</span>
              </h3>
              {selectedChassis && <p className="text-[11px] font-medium text-slate-500">Scope: {selectedChassis}</p>}
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 mb-4">
          <button type="button" onClick={() => setActiveTab('QUERY')} className={tabClass('QUERY')}>Single Query</button>
          <button type="button" onClick={() => setActiveTab('MULTI')} className={tabClass('MULTI')}>Multi-Notebook Fan-Out</button>
          <button type="button" onClick={() => setActiveTab('HISTORY')} className={tabClass('HISTORY')}>
            History ({historyList.length})
          </button>
        </div>

        {activeTab === 'HISTORY' && <RagHistoryTabView historyList={historyList} />}
        {activeTab === 'MULTI' && <MultiNotebookPanel availablePlatforms={availablePlatforms} initialChassis={selectedChassis} localOnly={localOnly} />}
        {activeTab === 'QUERY' && (
          <RagQueryTabContent
            drawerQuery={drawerQuery}
            setDrawerQuery={setDrawerQuery}
            selectedChassis={selectedChassis}
            isQuerying={isQuerying}
            ragElapsedTime={ragElapsedTime}
            ragData={ragData}
            scenariosList={scenariosList}
            showSanitizationDetails={showSanitizationDetails}
            onToggleSanitization={() => setShowSanitizationDetails(prev => !prev)}
            onSubmit={handleInlineSearch}
            onScenarioClick={handleScenarioClick}
          />
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : drawer;
}
