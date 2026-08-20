import React, { useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import CatalogExplorer from './components/CatalogExplorer';
import ScraperTriggerCard from './components/ScraperTriggerCard';
import BoqUploader from './components/BoqUploader';
import WorkloadDnaCard from './components/WorkloadDnaCard';
import ResolutionMatrix from './components/ResolutionMatrix';
import NotebookRagDrawer from './components/NotebookRagDrawer';
import ArtifactInspector from './components/ArtifactInspector';
import TelemetryCard from './components/TelemetryCard';
import AmbiguityInbox from './components/AmbiguityInbox';
import UserFeedbackDrawer from './components/UserFeedbackDrawer';
import FeedbackModal from './components/FeedbackModal';
import SettingsDrawer from './components/SettingsDrawer';
import PartnerReconciliationView from './components/PartnerReconciliationView';
import GlobalLoadingState from './components/GlobalLoadingState';
import MacroOrchestratorFlow from './components/MacroOrchestratorFlow';
import TraceabilityInspector from './components/TraceabilityInspector';

// Extracted services & hooks (GAP-L1, GAP-L4 fixes)
import { useSSEStream } from './hooks/useSSEStream.js';
import { useRagPoller } from './hooks/useRagPoller.js';
import { useCatalogs } from './hooks/useCatalogs.js';

// ── Generic Modal Wrapper ─────────────────────────────────────────────────────
import { useEffect } from 'react';

function ToolModal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-backdrop"
    >
      <div className="bg-slate-50 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/90 animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Catalog State (via useCatalogs hook) ─────────────────────────────────
  const {
    catalogs,
    catalogData,
    isCatalogLoading,
    selectedChassis,
    setSelectedChassis,
    refreshCatalogs
  } = useCatalogs('DL380_Gen12_SFF');

  const selectedChassisRef = useRef(selectedChassis);
  useEffect(() => { selectedChassisRef.current = selectedChassis; }, [selectedChassis]);

  // ── UI State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('orchestrator');
  const [activeModal, setActiveModal] = useState(null);
  const [showTraceabilityInspector, setShowTraceabilityInspector] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // ── Task / Pipeline State ──────────────────────────────────────────────────
  const [logStream, setLogStream] = useState([]);
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [_taskHistory, setTaskHistory] = useState([]);
  const [activeProgress, setActiveProgress] = useState(null);

  // ── Eval State ────────────────────────────────────────────────────────────
  const [evalResults, setEvalResults] = useState(null);
  const [auditReport, setAuditReport] = useState(null);

  // ── RAG Drawer State ──────────────────────────────────────────────────────
  const [isRagOpen, setIsRagOpen] = useState(false);
  const [ragData, setRagData] = useState(null);
  const [ragElapsedTime, setRagElapsedTime] = useState(0);
  const [isQueryingRag, setIsQueryingRag] = useState(false);

  // ── Drawer / Modal State ──────────────────────────────────────────────────
  const [isFeedbackDrawerOpen, setIsFeedbackDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCardForFeedback, setSelectedCardForFeedback] = useState(null);

  // ── RAG Poller for Matrix (useRagPoller hook — SMELL-S4 fix) ─────────────
  const { startPoll: startMatrixRagPoll } = useRagPoller({
    onResult: (answer, fullData) => {
      setEvalResults(prev => ({ ...prev, ragAnswer: answer, ragData: fullData }));
    },
    onTimeout: () => {
      setEvalResults(prev => ({ ...prev, ragAnswer: '⚠️ NotebookLM Query Timeout: RAG verification took too long.' }));
    },
    onFail: (errMsg) => {
      setEvalResults(prev => ({ ...prev, ragAnswer: `⚠️ NotebookLM Query Failed: ${errMsg}` }));
    }
  });

  // ── RAG Poller for Drawer search ──────────────────────────────────────────
  const elapsedIntervalRef = useRef(null);
  const { startPoll: startSearchRagPoll } = useRagPoller({
    onResult: (_, fullData) => {
      setRagData(fullData);
      setIsQueryingRag(false);
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
    },
    onTimeout: () => {
      setRagData(prev => ({ ...prev, answer: '⚠️ NotebookLM Query Timeout: No response received after 120 seconds.', source: 'ERROR' }));
      setIsQueryingRag(false);
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
    },
    onFail: (errMsg) => {
      setRagData(prev => ({ ...prev, answer: `NotebookLM Query Failed: ${errMsg}`, source: 'ERROR' }));
      setIsQueryingRag(false);
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
    }
  });

  // ── SSE Stream (useSSEStream hook — GAP-L1a fix) ─────────────────────────
  useSSEStream({
    onTaskStarted: useCallback((payload) => {
      setIsTaskRunning(true);
      setActiveProgress({ task: payload.task, currentStep: 0, totalSteps: 0, action: 'Starting...', status: 'started' });
    }, []),

    onTaskCompleted: useCallback((payload) => {
      setIsTaskRunning(false);
      setActiveProgress(null);
      refreshCatalogs(); // Refresh catalog registry after scrape/rebuild
      setTaskHistory(prev => [{
        type: payload.task || 'PIPELINE_ACTION',
        status: payload.code === 0 ? 'COMPLETED' : 'FAILED',
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 15)]);
      if (payload.task?.includes('SCRAPE') || payload.task?.includes('REBUILD')) {
        setActiveTab('catalog');
      }
    }, [refreshCatalogs]),

    onProgress: useCallback((payload) => {
      setActiveProgress({
        task: payload.task || 'RUNNING',
        currentStep: payload.step,
        totalSteps: payload.total,
        action: payload.action,
        status: payload.status,
        detail: payload.detail
      });
      setLogStream(prev => [...prev.slice(-200), payload]);
    }, []),

    onLog: useCallback((payload) => {
      setLogStream(prev => [...prev.slice(-200), payload]);
    }, []),

    onEvalResult: useCallback((normalised, raw) => {
      setIsTaskRunning(false);
      setActiveProgress(null);

      if (raw.error) {
        setEvalResults(normalised);
        return;
      }

      setEvalResults(normalised);

      // Dispatch parallel RAG query once the matrix is rendered
      if (raw.data?.notebookPayload) {
        fetch('/api/notebook-query-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: raw.data.notebookPayload, chassis: selectedChassisRef.current })
        })
          .then(res => res.json())
          .then(jobInfo => {
            if (jobInfo.status === 'COMPLETED') {
              const answer = jobInfo.result?.answer || jobInfo.answer;
              setEvalResults(prev => ({ ...prev, ragAnswer: answer, ragData: jobInfo.result || jobInfo }));
            } else if (jobInfo.jobId) {
              startMatrixRagPoll(jobInfo.jobId);
            }
          })
          .catch(err => console.error('Failed to dispatch background RAG query:', err));
      }
    }, [startMatrixRagPoll])
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearchLocal = (query) => { setGlobalSearchTerm(query); setActiveTab('catalog'); };

  const handleSmartSearch = async (query) => {
    if (!query?.trim()) return;
    setIsRagOpen(true);
    setIsQueryingRag(true);
    setRagElapsedTime(0);
    setRagData({ query, answer: 'Querying Gemini NotebookLM RAG... Consulting QuickSpecs notebook.', citations: [], source: 'PENDING' });

    // Elapsed timer
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    let secs = 0;
    elapsedIntervalRef.current = setInterval(() => { secs += 1.5; setRagElapsedTime(secs); }, 1500);

    try {
      const initRes = await fetch('/api/notebook-query-async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chassis: selectedChassis })
      });
      const jobInfo = await initRes.json();

      if (jobInfo.status === 'COMPLETED') {
        setRagData(jobInfo.result || jobInfo);
        setIsQueryingRag(false);
        if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
        return;
      }

      if (jobInfo.jobId) startSearchRagPoll(jobInfo.jobId);
    } catch (err) {
      setRagData({ query, answer: `Failed to initiate RAG Query: ${err.message || 'Network error'}`, citations: [], source: 'ERROR' });
      setIsQueryingRag(false);
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
    }
  };

  const handleTriggerScrape = async (mode) => {
    setLogStream([]); setActiveTab('scraper'); setEvalResults(null);
    try { await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) }); } catch (err) { console.error(err); }
  };

  const handleTriggerRebuild = async () => {
    setLogStream([]); setActiveTab('scraper'); setEvalResults(null);
    try { await fetch('/api/rebuild', { method: 'POST' }); } catch (err) { console.error(err); }
  };

  const handleTriggerSyncKnowledge = async () => {
    setLogStream([]); setActiveTab('scraper'); setEvalResults(null);
    try { await fetch('/api/sync-knowledge', { method: 'POST' }); } catch (err) { console.error(err); }
  };

  const handleTriggerDownloadPdf = async () => {
    setLogStream([]); setActiveTab('scraper'); setEvalResults(null);
    try { await fetch('/api/download-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chassisId: selectedChassis }) }); } catch (err) { console.error(err); }
  };

  const handleTriggerKillTask = async () => {
    try { await fetch('/api/kill-task', { method: 'POST' }); } catch (err) { console.error(err); }
  };

  const handleTriggerNavigate = async () => {
    setLogStream([]); setActiveTab('scraper'); setEvalResults(null);
    try { await fetch('/api/navigate-oca', { method: 'POST' }); } catch (err) { console.error(err); }
  };

  const handleEvaluateBoq = async (boqInput) => {
    setLogStream([]); setEvalResults(null);
    try {
      const currentCat = catalogs.find(c => c.id === selectedChassis);
      const res = await fetch('/api/eval-boq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...boqInput, chassisDir: currentCat?.chassisDir || currentCat?.id })
      });
      const data = await res.json();
      if (!res.ok) { setEvalResults({ status: 'ERROR', error: data.error }); return { error: data.error }; }
      return { status: 'ACCEPTED' };
    } catch (err) {
      setEvalResults({ status: 'ERROR', error: err.message });
      return { error: err.message };
    }
  };

  const currentCatObj = catalogs.find(c => c.id === selectedChassis);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-16">
      <Header
        catalogs={catalogs}
        catalogData={catalogData}
        selectedChassis={selectedChassis}
        onSelectChassis={setSelectedChassis}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSmartSearch={handleSmartSearch}
        onSearchLocal={handleSearchLocal}
        onOpenRag={() => setIsRagOpen(true)}
        onOpenFeedbackDrawer={() => setIsFeedbackDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isTaskRunning={isTaskRunning}
        isCatalogLoading={isCatalogLoading}
      />

      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        <GlobalLoadingState isTaskRunning={isTaskRunning} isQueryingRag={isQueryingRag} activeProgress={activeProgress} mode="banner" />

        {activeTab === 'orchestrator' && (
          <div key="orchestrator" className="animate-tab-enter">
            <MacroOrchestratorFlow
              evalResults={evalResults} auditReport={auditReport}
              isTaskRunning={isTaskRunning} activeProgress={activeProgress}
              selectedChassis={selectedChassis} logStream={logStream}
              onOpenTool={(tool) => {
                if (tool === 'traceability') {
                  setShowTraceabilityInspector(true);
                } else {
                  setActiveModal(tool);
                }
              }}
              onTriggerSyncKnowledge={handleTriggerSyncKnowledge}
              onNavigateTab={setActiveTab}
            />
          </div>
        )}

        {activeTab === 'scraper' && (
          <div key="scraper" className="animate-tab-enter">
            <ScraperTriggerCard
              logStream={logStream} isTaskRunning={isTaskRunning}
              onTriggerScrape={handleTriggerScrape} onTriggerRebuild={handleTriggerRebuild}
              onTriggerDownloadPdf={handleTriggerDownloadPdf} onTriggerSyncKnowledge={handleTriggerSyncKnowledge}
              onTriggerKillTask={handleTriggerKillTask} onTriggerNavigate={handleTriggerNavigate}
            />
          </div>
        )}

        {activeTab === 'catalog' && (
          <div key="catalog" className="animate-tab-enter">
            <CatalogExplorer
              catalogData={catalogData} catalogs={catalogs}
              selectedChassis={selectedChassis} onSelectChassis={setSelectedChassis}
              chassisName={currentCatObj?.chassis} isCatalogLoading={isCatalogLoading}
              globalSearchTerm={globalSearchTerm} onClearSearch={() => setGlobalSearchTerm('')}
              onOpenRag={() => setIsRagOpen(true)} onRagQuery={handleSmartSearch}
            />
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div key="artifacts" className="animate-tab-enter">
            <ArtifactInspector currentCatalog={currentCatObj} onAuditCatalog={() => {}} />
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div key="telemetry" className="animate-tab-enter">
            <TelemetryCard />
          </div>
        )}
      </main>

      {/* Tool Modals */}
      <ToolModal isOpen={activeModal === 'boqUploader'} onClose={() => setActiveModal(null)} title="Stage 1: BOQ Quote Ingestion & 6-Aspect Math Engine">
        <BoqUploader
          onEvaluateBoq={handleEvaluateBoq} evalResults={evalResults}
          logStream={logStream} chassisDir={currentCatObj?.chassisDir}
          isTaskRunning={isTaskRunning}
          onOpenMatrix={() => setActiveModal('resolutionMatrix')}
          onOpenReconciliation={() => setActiveModal('reconciliation')}
        />
        {evalResults && (
          <div className="mt-6 space-y-6 animate-fade-in">
            <AmbiguityInbox evalResults={evalResults} chassisContext={selectedChassis || 'Unknown Chassis'} onReEvaluate={(extraText) => handleEvaluateBoq({ rawText: extraText || '' })} />
            <WorkloadDnaCard dnaData={evalResults.workloadDna} />
          </div>
        )}
      </ToolModal>

      <ToolModal isOpen={activeModal === 'resolutionMatrix'} onClose={() => setActiveModal(null)} title="Stage 1.5: 5-Tier Strategic Resolution Matrix">
        <ResolutionMatrix evalResults={evalResults} onOpenPortalFeedback={setSelectedCardForFeedback} selectedChassis={selectedChassis} onTriggerDemoBoq={handleEvaluateBoq} />
      </ToolModal>

      <ToolModal isOpen={activeModal === 'reconciliation'} onClose={() => setActiveModal(null)} title="Stage 3: Partner Quote Reconciliation">
        <PartnerReconciliationView evalResults={evalResults} selectedChassis={selectedChassis} onTriggerScrape={handleTriggerScrape} auditReport={auditReport} onAuditReportChange={setAuditReport} />
      </ToolModal>

      {/* Drawers */}
      <NotebookRagDrawer isOpen={isRagOpen} onClose={() => setIsRagOpen(false)} ragData={ragData} isQuerying={isQueryingRag} ragElapsedTime={ragElapsedTime} onQuerySubmit={handleSmartSearch} selectedChassis={selectedChassis} />
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <UserFeedbackDrawer isOpen={isFeedbackDrawerOpen} onClose={() => setIsFeedbackDrawerOpen(false)} />
      <FeedbackModal isOpen={!!selectedCardForFeedback} onClose={() => setSelectedCardForFeedback(null)} resolutionCard={selectedCardForFeedback} />
      <TraceabilityInspector isOpen={showTraceabilityInspector} onClose={() => setShowTraceabilityInspector(false)} traces={evalResults?.tracePayloads || []} />
    </div>
  );
}
