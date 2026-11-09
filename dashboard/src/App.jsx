import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import QuarantineManagementDrawer from './components/QuarantineManagementDrawer';
import FeedbackModal from './components/FeedbackModal';
import SettingsDrawer from './components/SettingsDrawer';
import PartnerReconciliationView from './components/PartnerReconciliationView';
import GlobalLoadingState from './components/GlobalLoadingState';
import MacroOrchestratorFlow from './components/MacroOrchestratorFlow';
import TraceabilityInspector from './components/TraceabilityInspector';
import { BoqTopologyModal } from './components/topology';
import PlatformDisambiguationCard from './components/PlatformDisambiguationCard';
import ErrorBoundary from './components/ErrorBoundary';

import { useSSEStream } from './hooks/useSSEStream.js';
import { useRagPoller } from './hooks/useRagPoller.js';
import { useCatalogs } from './hooks/useCatalogs.js';

const IMMEDIATE_RAG_STATUSES = ['COMPLETED', 'CLOUD_VERIFIED', 'LOCAL_FALLBACK'];

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

function isBoqFileInput(boqInput) {
  if (boqInput instanceof File) return true;
  if (!boqInput || typeof boqInput !== 'object') return false;
  return typeof boqInput.name === 'string' && typeof boqInput.size === 'number';
}

async function buildBoqRequestPayload(boqInput, maybeRawText) {
  if (isBoqFileInput(boqInput)) {
    const formData = new FormData();
    formData.append('boqFile', boqInput);
    const uploadRes = await fetch('/api/upload-boq', { method: 'POST', body: formData });
    const uploadData = await uploadRes.json();
    const payload = { filepath: uploadData.filepath };
    if (maybeRawText) payload.rawText = maybeRawText;
    return payload;
  }
  if (typeof boqInput === 'string') {
    return { rawText: boqInput };
  }
  if (boqInput && typeof boqInput === 'object') {
    const payload = { ...boqInput };
    if (maybeRawText && !payload.rawText) payload.rawText = maybeRawText;
    return payload;
  }
  if (maybeRawText) {
    return { rawText: maybeRawText };
  }
  return {};
}

function dispatchBackgroundMatrixRagQuery(raw, chassisId, setEvalResults, startMatrixRagPoll) {
  fetch('/api/notebook-query-async', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: raw.data.notebookPayload,
      chassis: chassisId,
      learningEligible: raw.data.evalResults?.requirementResolution?.learningEligible === true,
      chassisDir: raw.data.chassisDir
    })
  })
    .then(res => res.json())
    .then(jobInfo => {
      if (IMMEDIATE_RAG_STATUSES.includes(jobInfo.status)) {
        const answer = jobInfo.result?.answer || jobInfo.answer;
        setEvalResults(prev => ({ ...prev, ragAnswer: answer, ragData: jobInfo.result || jobInfo }));
      } else if (jobInfo.jobId) {
        startMatrixRagPoll(jobInfo.jobId);
      }
    })
    .catch(err => console.error('Failed to dispatch background RAG query:', err));
}

function buildGroundedRagState(normalised) {
  if (normalised.ragData) return normalised.ragData;
  const citeCount = normalised.notebookLmStatus?.citationsCount;
  return {
    answer: normalised.ragAnswer,
    citations: citeCount ? [`Verified QuickSpecs Reference (${citeCount} citations)`] : [],
    source: normalised.notebookLmStatus?.source || 'GROUNDED'
  };
}

function triggerMatrixRecomputeIfApplicable(prev, fullData, fallbackChassis) {
  if (!prev?.items || prev.items.length === 0) return;
  fetch('/api/recompute-matrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evalData: prev,
      ragResult: fullData,
      chassisDir: prev.chassisDir || fallbackChassis
    })
  }).catch(err => console.warn('[App.jsx] Recompute matrix advisory:', err));
}

function handleEvalResultEffect(normalised, raw, chassisId, setEvalResults, setRagData, startMatrixRagPoll) {
  setEvalResults(normalised);
  if (raw.error) return;
  const needsBgRag = !normalised.ragAnswer && !raw.data?.ragAnswer && Boolean(raw.data?.notebookPayload);
  if (needsBgRag) {
    dispatchBackgroundMatrixRagQuery(raw, chassisId, setEvalResults, startMatrixRagPoll);
  } else if (normalised.ragAnswer) {
    setRagData(buildGroundedRagState(normalised));
  }
}

async function executeSmartSearchRequest({
  query,
  selectedChassis,
  setIsRagOpen,
  setIsQueryingRag,
  setRagElapsedTime,
  setRagData,
  elapsedIntervalRef,
  stopRagElapsedTimer,
  startSearchRagPoll
}) {
  if (!query?.trim()) return;
  setIsRagOpen(true);
  setIsQueryingRag(true);
  setRagElapsedTime(0);
  setRagData({ query, answer: 'Querying Gemini NotebookLM RAG... Consulting QuickSpecs notebook.', citations: [], source: 'PENDING' });

  stopRagElapsedTimer();
  let secs = 0;
  elapsedIntervalRef.current = setInterval(() => { secs += 1.5; setRagElapsedTime(secs); }, 1500);

  try {
    const initRes = await fetch('/api/notebook-query-async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, chassis: selectedChassis })
    });
    const jobInfo = await initRes.json();

    if (IMMEDIATE_RAG_STATUSES.includes(jobInfo.status)) {
      setRagData(jobInfo.result || jobInfo);
      setIsQueryingRag(false);
      stopRagElapsedTimer();
      return;
    }

    if (jobInfo.jobId) startSearchRagPoll(jobInfo.jobId);
  } catch (err) {
    setRagData({ query, answer: `Failed to initiate RAG Query: ${err.message || 'Network error'}`, citations: [], source: 'ERROR' });
    setIsQueryingRag(false);
    stopRagElapsedTimer();
  }
}

async function executeBoqEvaluationRequest(boqInput, maybeRawText, currentCat, setLogStream, setEvalResults) {
  setLogStream([]);
  setEvalResults(null);
  try {
    const payload = await buildBoqRequestPayload(boqInput, maybeRawText);
    const chassisDir = currentCat?.chassisDir || currentCat?.id;
    const res = await fetch('/api/eval-boq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, chassisDir })
    });
    const data = await res.json();
    if (!res.ok) {
      setEvalResults({ status: 'ERROR', error: data.error });
      return { error: data.error };
    }
    return { status: 'ACCEPTED' };
  } catch (err) {
    setEvalResults({ status: 'ERROR', error: err.message });
    return { error: err.message };
  }
}

function DualBrainBadgesBar({ evalResults }) {
  if (!evalResults?.dualBrainBadges?.length || evalResults?.clarificationRequired) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-xs animate-tab-enter">
      <span className="text-xs font-semibold text-slate-500 mr-1">Verification Status:</span>
      {evalResults.dualBrainBadges.map(badge => (
        <span
          key={badge.id}
          className={`badge badge-${badge.variant} text-xs cursor-help transition-transform hover:scale-105`}
          title={badge.tooltip}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function AppMainTabContent({
  activeTab,
  setActiveTab,
  evalResults,
  auditReport,
  isTaskRunning,
  activeProgress,
  selectedChassis,
  setSelectedChassis,
  logStream,
  catalogs,
  catalogData,
  currentCatObj,
  isCatalogLoading,
  globalSearchTerm,
  setGlobalSearchTerm,
  setActiveModal,
  setShowTraceabilityInspector,
  setSelectedCardForFeedback,
  setIsRagOpen,
  handleSmartSearch,
  handleEvaluateBoq,
  handleTriggerScrape,
  handleTriggerRebuild,
  handleTriggerDownloadPdf,
  handleTriggerSyncKnowledge,
  handleTriggerKillTask,
  handleTriggerNavigate
}) {
  if (activeTab === 'orchestrator') {
    return (
      <div key="orchestrator" className="animate-tab-enter">
        <MacroOrchestratorFlow
          evalResults={evalResults}
          auditReport={auditReport}
          isTaskRunning={isTaskRunning}
          activeProgress={activeProgress}
          selectedChassis={selectedChassis}
          logStream={logStream}
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
    );
  }

  if (activeTab === 'matrix') {
    return (
      <div key="matrix" className="animate-tab-enter space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <span className="badge badge-emerald mb-1">5-Tier Resolution Engine</span>
            <h2 className="text-lg font-bold text-slate-900">5-Tier Strategic Resolution Matrix</h2>
            <p className="text-xs text-slate-500">Compare ranked candidate BOMs across CapEx budget, workload DNA intent, and strict hardware buildability.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal('boqTopology')}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              Visual BOQ Topology
            </button>
            <button
              onClick={() => setActiveModal('boqUploader')}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              Load / Evaluate BOQ
            </button>
          </div>
        </div>
        <ResolutionMatrix
          evalResults={evalResults}
          onOpenPortalFeedback={setSelectedCardForFeedback}
          selectedChassis={selectedChassis}
          onTriggerDemoBoq={handleEvaluateBoq}
          onOpenTopology={() => setActiveModal('boqTopology')}
        />
      </div>
    );
  }

  if (activeTab === 'pipeline' || activeTab === 'scraper') {
    return (
      <div key="pipeline" className="animate-tab-enter">
        <ScraperTriggerCard
          logStream={logStream}
          isTaskRunning={isTaskRunning}
          onTriggerScrape={handleTriggerScrape}
          onTriggerRebuild={handleTriggerRebuild}
          onTriggerDownloadPdf={handleTriggerDownloadPdf}
          onTriggerSyncKnowledge={handleTriggerSyncKnowledge}
          onTriggerKillTask={handleTriggerKillTask}
          onTriggerNavigate={handleTriggerNavigate}
        />
      </div>
    );
  }

  if (activeTab === 'catalog') {
    return (
      <div key="catalog" className="animate-tab-enter">
        <CatalogExplorer
          catalogData={catalogData}
          catalogs={catalogs}
          selectedChassis={selectedChassis}
          onSelectChassis={setSelectedChassis}
          chassisName={currentCatObj?.chassis}
          isCatalogLoading={isCatalogLoading}
          globalSearchTerm={globalSearchTerm}
          onClearSearch={() => setGlobalSearchTerm('')}
          onOpenRag={(query) => {
            if (query) handleSmartSearch(query);
            else setIsRagOpen(true);
          }}
          onRagQuery={handleSmartSearch}
        />
      </div>
    );
  }

  if (activeTab === 'artifacts') {
    return (
      <div key="artifacts" className="animate-tab-enter">
        <ArtifactInspector currentCatalog={currentCatObj} />
      </div>
    );
  }

  if (activeTab === 'telemetry') {
    return (
      <div key="telemetry" className="animate-tab-enter">
        <TelemetryCard />
      </div>
    );
  }

  return null;
}

function AppToolModals({
  activeModal,
  setActiveModal,
  evalResults,
  intakeTopologyData,
  setIntakeTopologyData,
  logStream,
  currentCatObj,
  isTaskRunning,
  selectedChassis,
  setSelectedCardForFeedback,
  setIsRagOpen,
  handleSmartSearch,
  handleEvaluateBoq,
  handleTriggerScrape,
  auditReport,
  setAuditReport
}) {
  return (
    <>
      <ToolModal isOpen={activeModal === 'boqUploader'} onClose={() => setActiveModal(null)} title="Stage 1: BOQ Quote Ingestion & 6-Aspect Math Engine">
        <BoqUploader
          onEvaluateBoq={handleEvaluateBoq}
          evalResults={evalResults}
          logStream={logStream}
          chassisDir={currentCatObj?.chassisDir}
          isTaskRunning={isTaskRunning}
          onOpenMatrix={() => setActiveModal('resolutionMatrix')}
          onOpenReconciliation={() => setActiveModal('reconciliation')}
          onOpenTopology={(customData) => {
            if (customData) setIntakeTopologyData(customData);
            setActiveModal('boqTopology');
          }}
        />
        {evalResults && (
          <div className="mt-6 space-y-6 animate-fade-in">
            <AmbiguityInbox
              evalResults={evalResults}
              chassisContext={selectedChassis || 'Unknown Chassis'}
              onReEvaluate={(extraText) => handleEvaluateBoq({ rawText: extraText || '' })}
            />
            <WorkloadDnaCard dnaData={evalResults.workloadDna} />
          </div>
        )}
      </ToolModal>

      <ToolModal isOpen={activeModal === 'resolutionMatrix'} onClose={() => setActiveModal(null)} title="Stage 1.5: 5-Tier Strategic Resolution Matrix">
        <ResolutionMatrix
          evalResults={evalResults}
          onOpenPortalFeedback={setSelectedCardForFeedback}
          selectedChassis={selectedChassis}
          onTriggerDemoBoq={handleEvaluateBoq}
          onOpenTopology={() => setActiveModal('boqTopology')}
        />
      </ToolModal>

      <ToolModal isOpen={activeModal === 'boqTopology'} onClose={() => setActiveModal(null)} title="Visual BOQ Configuration Topology & Subsystem Mindmap">
        <BoqTopologyModal
          isOpen={activeModal === 'boqTopology'}
          onClose={() => setActiveModal(null)}
          evalResults={evalResults || intakeTopologyData}
          onOpenRag={(query) => {
            setIsRagOpen(true);
            if (query) handleSmartSearch(query);
          }}
          onOpenMatrix={() => setActiveModal('resolutionMatrix')}
          onOpenAmbiguity={() => setActiveModal('boqUploader')}
        />
      </ToolModal>

      <ToolModal isOpen={activeModal === 'reconciliation'} onClose={() => setActiveModal(null)} title="Stage 3: Partner Quote Reconciliation">
        <PartnerReconciliationView
          evalResults={evalResults}
          selectedChassis={selectedChassis}
          onTriggerScrape={handleTriggerScrape}
          auditReport={auditReport}
          onAuditReportChange={setAuditReport}
          onOpenTopology={(customData) => {
            if (customData) setIntakeTopologyData(customData);
            setActiveModal('boqTopology');
          }}
        />
      </ToolModal>
    </>
  );
}

export default function App() {
  const {
    catalogs,
    catalogData,
    isCatalogLoading,
    selectedChassis,
    setSelectedChassis,
    refreshCatalogs
  } = useCatalogs('DL380_Gen12');

  const selectedChassisRef = useRef(selectedChassis);
  useEffect(() => { selectedChassisRef.current = selectedChassis; }, [selectedChassis]);

  const [activeTab, setActiveTab] = useState('orchestrator');
  const [activeModal, setActiveModal] = useState(null);
  const [showTraceabilityInspector, setShowTraceabilityInspector] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const [logStream, setLogStream] = useState([]);
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [_taskHistory, setTaskHistory] = useState([]);
  const [activeProgress, setActiveProgress] = useState(null);

  const [evalResults, setEvalResults] = useState(null);
  const [intakeTopologyData, setIntakeTopologyData] = useState(null);
  const [auditReport, setAuditReport] = useState(null);
  const [isQueryingRag, setIsQueryingRag] = useState(false);
  const [isRagOpen, setIsRagOpen] = useState(false);
  const [ragElapsedTime, setRagElapsedTime] = useState(0);
  const [ragData, setRagData] = useState({ answer: null, latencyMs: null, source: null });
  const [isFeedbackDrawerOpen, setIsFeedbackDrawerOpen] = useState(false);
  const [isQuarantineOpen, setIsQuarantineOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCardForFeedback, setSelectedCardForFeedback] = useState(null);

  const { startPoll: startMatrixRagPoll } = useRagPoller({
    onResult: (answer, fullData) => {
      setEvalResults(prev => {
        triggerMatrixRecomputeIfApplicable(prev, fullData, selectedChassisRef.current);
        return { ...prev, ragAnswer: answer, ragData: fullData };
      });
    },
    onTimeout: () => {
      setEvalResults(prev => ({ ...prev, ragAnswer: '⚠️ NotebookLM Query Timeout: RAG verification took too long.' }));
    },
    onFail: (errMsg) => {
      setEvalResults(prev => ({ ...prev, ragAnswer: `⚠️ NotebookLM Query Failed: ${errMsg}` }));
    }
  });

  const elapsedIntervalRef = useRef(null);
  const stopRagElapsedTimer = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  };

  const { startPoll: startSearchRagPoll } = useRagPoller({
    onResult: (_, fullData) => {
      setRagData(fullData);
      setIsQueryingRag(false);
      stopRagElapsedTimer();
    },
    onTimeout: () => {
      setRagData(prev => ({ ...prev, answer: '⚠️ NotebookLM Query Timeout: No response received within the 15-minute grounding window.', source: 'ERROR' }));
      setIsQueryingRag(false);
      stopRagElapsedTimer();
    },
    onFail: (errMsg) => {
      setRagData(prev => ({ ...prev, answer: `NotebookLM Query Failed: ${errMsg}`, source: 'ERROR' }));
      setIsQueryingRag(false);
      stopRagElapsedTimer();
    }
  });

  useSSEStream({
    onTaskStarted: useCallback((payload) => {
      setIsTaskRunning(true);
      setActiveProgress({ task: payload.task, currentStep: 0, totalSteps: 0, action: 'Starting...', status: 'started' });
    }, []),

    onTaskCompleted: useCallback((payload) => {
      setIsTaskRunning(false);
      setActiveProgress(null);
      refreshCatalogs();
      setTaskHistory(prev => [{
        type: payload.task || 'PIPELINE_ACTION',
        status: payload.code === 0 ? 'COMPLETED' : 'FAILED',
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 15)]);
      const taskName = payload.task || '';
      if (taskName.includes('SCRAPE') || taskName.includes('REBUILD')) {
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
      handleEvalResultEffect(normalised, raw, selectedChassisRef.current, setEvalResults, setRagData, startMatrixRagPoll);
    }, [startMatrixRagPoll])
  });

  const handleSearchLocal = (query) => { setGlobalSearchTerm(query); setActiveTab('catalog'); };

  const handleSmartSearch = (query) => executeSmartSearchRequest({
    query,
    selectedChassis,
    setIsRagOpen,
    setIsQueryingRag,
    setRagElapsedTime,
    setRagData,
    elapsedIntervalRef,
    stopRagElapsedTimer,
    startSearchRagPoll
  });

  const postScraperEndpoint = async (url, bodyObj) => {
    setLogStream([]);
    setActiveTab('scraper');
    setEvalResults(null);
    try {
      const options = bodyObj
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) }
        : { method: 'POST' };
      await fetch(url, options);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerScrape = (mode) => postScraperEndpoint('/api/scrape', { mode });
  const handleTriggerRebuild = () => postScraperEndpoint('/api/rebuild');
  const handleTriggerSyncKnowledge = () => postScraperEndpoint('/api/sync-knowledge');
  const handleTriggerDownloadPdf = () => postScraperEndpoint('/api/download-pdf', { chassisId: selectedChassis });
  const handleTriggerNavigate = () => postScraperEndpoint('/api/navigate-oca');

  const handleTriggerKillTask = async () => {
    try { await fetch('/api/kill-task', { method: 'POST' }); } catch (err) { console.error(err); }
  };

  const currentCatObj = catalogs.find(c => c.id === selectedChassis);
  const handleEvaluateBoq = (boqInput, maybeRawText) => executeBoqEvaluationRequest(
    boqInput,
    maybeRawText,
    currentCatObj,
    setLogStream,
    setEvalResults
  );

  const handleSelectClarification = async (candidate) => {
    setSelectedChassis(candidate);
    const prevPayload = evalResults?.originalPayload || {};
    await handleEvaluateBoq({ ...prevPayload, chassisName: candidate, chassisDir: candidate });
  };

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
        onOpenQuarantineDrawer={() => setIsQuarantineOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isTaskRunning={isTaskRunning}
        isCatalogLoading={isCatalogLoading}
      />

      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        <GlobalLoadingState isTaskRunning={isTaskRunning} isQueryingRag={isQueryingRag} activeProgress={activeProgress} mode="banner" />

        {evalResults?.clarificationRequired && (
          <PlatformDisambiguationCard
            evalResults={evalResults}
            onSelectCandidate={handleSelectClarification}
            onDismiss={() => setEvalResults(prev => prev ? { ...prev, clarificationRequired: false } : null)}
          />
        )}

        <DualBrainBadgesBar evalResults={evalResults} />

        <ErrorBoundary fallbackTitle="View Rendering Error">
          <AppMainTabContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            evalResults={evalResults}
            auditReport={auditReport}
            isTaskRunning={isTaskRunning}
            activeProgress={activeProgress}
            selectedChassis={selectedChassis}
            setSelectedChassis={setSelectedChassis}
            logStream={logStream}
            catalogs={catalogs}
            catalogData={catalogData}
            currentCatObj={currentCatObj}
            isCatalogLoading={isCatalogLoading}
            globalSearchTerm={globalSearchTerm}
            setGlobalSearchTerm={setGlobalSearchTerm}
            setActiveModal={setActiveModal}
            setShowTraceabilityInspector={setShowTraceabilityInspector}
            setSelectedCardForFeedback={setSelectedCardForFeedback}
            setIsRagOpen={setIsRagOpen}
            handleSmartSearch={handleSmartSearch}
            handleEvaluateBoq={handleEvaluateBoq}
            handleTriggerScrape={handleTriggerScrape}
            handleTriggerRebuild={handleTriggerRebuild}
            handleTriggerDownloadPdf={handleTriggerDownloadPdf}
            handleTriggerSyncKnowledge={handleTriggerSyncKnowledge}
            handleTriggerKillTask={handleTriggerKillTask}
            handleTriggerNavigate={handleTriggerNavigate}
          />
        </ErrorBoundary>
      </main>

      <AppToolModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        evalResults={evalResults}
        intakeTopologyData={intakeTopologyData}
        setIntakeTopologyData={setIntakeTopologyData}
        logStream={logStream}
        currentCatObj={currentCatObj}
        isTaskRunning={isTaskRunning}
        selectedChassis={selectedChassis}
        setSelectedCardForFeedback={setSelectedCardForFeedback}
        setIsRagOpen={setIsRagOpen}
        handleSmartSearch={handleSmartSearch}
        handleEvaluateBoq={handleEvaluateBoq}
        handleTriggerScrape={handleTriggerScrape}
        auditReport={auditReport}
        setAuditReport={setAuditReport}
      />

      <NotebookRagDrawer isOpen={isRagOpen} onClose={() => setIsRagOpen(false)} ragData={ragData} isQuerying={isQueryingRag} ragElapsedTime={ragElapsedTime} onQuerySubmit={handleSmartSearch} selectedChassis={selectedChassis} />
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <UserFeedbackDrawer isOpen={isFeedbackDrawerOpen} onClose={() => setIsFeedbackDrawerOpen(false)} />
      <QuarantineManagementDrawer isOpen={isQuarantineOpen} onClose={() => setIsQuarantineOpen(false)} />
      <FeedbackModal isOpen={!!selectedCardForFeedback} onClose={() => setSelectedCardForFeedback(null)} resolutionCard={selectedCardForFeedback} />
      <TraceabilityInspector isOpen={showTraceabilityInspector} onClose={() => setShowTraceabilityInspector(false)} traces={evalResults?.tracePayloads || []} />
    </div>
  );
}
