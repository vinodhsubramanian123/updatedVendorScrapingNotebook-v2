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
import PresalesRequestPanel from './components/PresalesRequestPanel';
import ChassisSyncSummaryView from './components/ChassisSyncSummaryView';

import { useSSEStream } from './hooks/useSSEStream.js';
import { useRagPoller } from './hooks/useRagPoller.js';
import { useCatalogs } from './hooks/useCatalogs.js';
import { requestJson, postJson, uploadBoqFile } from './services/api.js';
import { useModalFocus } from './hooks/useModalFocus.js';

const IMMEDIATE_RAG_STATUSES = ['COMPLETED', 'CLOUD_VERIFIED', 'LOCAL_FALLBACK'];

function ToolModal({ isOpen, onClose, title, children }) {
  const dialogRef = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-backdrop"
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="bg-slate-50 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/90 animate-modal-content">
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

function isEventObject(val) {
  return Boolean(val && typeof val === 'object' && (val.nativeEvent || typeof val.preventDefault === 'function'));
}

const STANDARD_SAMPLE_TEXT = [
  '1x P73282-B21 HPE ProLiant DL380 Gen12 8SFF CTO Server',
  '2x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor',
  '16x P64707-B21 HPE 64GB 2Rx4 DDR5-5600 Registered Memory',
  '1x P47777-B21 Broadcom MegaRAID MR416i-p Gen11 Storage Controller',
  '1x P01366-B21 HPE 96W Smart Storage Battery (up to 20 Devices)',
  '4x P40498-B21 HPE 3.84TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD',
  '2x P38995-B21 HPE 1000W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit',
  '1x P73315-B21 HPE ProLiant DL380 Gen12 High Performance Fan Kit',
  '1x P73321-B21 HPE ProLiant DL380 Gen12 8SFF Controller Cable Kit',
  '1x P64923-B21 Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE',
  '1x HU4B2A3 HPE 3 Year Tech Care Basic DL380 Gen12 Service'
].join('\n');

async function buildBoqRequestPayload(boqInput, maybeRawText) {
  const cleanInput = isEventObject(boqInput) ? null : boqInput;
  if (isBoqFileInput(cleanInput)) {
    const uploadData = await uploadBoqFile(cleanInput);
    const payload = { filepath: uploadData.filepath };
    if (maybeRawText) payload.rawText = maybeRawText;
    return payload;
  }
  if (typeof cleanInput === 'string') {
    return { rawText: cleanInput };
  }
  if (cleanInput && typeof cleanInput === 'object') {
    const payload = { ...cleanInput };
    if (maybeRawText && !payload.rawText) payload.rawText = maybeRawText;
    return payload;
  }
  if (maybeRawText) {
    return { rawText: maybeRawText };
  }
  return {};
}

function dispatchBackgroundMatrixRagQuery(raw, chassisId, context, complete, startMatrixRagPoll, isCurrent, onError) {
  postJson('/api/notebook-query-async', {
      runId: raw.runId,
      query: raw.data.notebookPayload,
      chassis: chassisId,
      learningEligible: raw.data.evalResults?.requirementResolution?.learningEligible === true,
      chassisDir: raw.data.chassisDir
  })
    .then(jobInfo => {
      if (!isCurrent()) return;
      if (IMMEDIATE_RAG_STATUSES.includes(jobInfo.status)) {
        const answer = jobInfo.result?.answer || jobInfo.answer;
        complete(answer, jobInfo.result || jobInfo, context);
      } else if (jobInfo.jobId) {
        startMatrixRagPoll(jobInfo.jobId, context);
      } else throw new Error('Notebook job response is missing its job ID');
    })
    .catch(err => { if (isCurrent()) onError(`Candidate review could not start: ${err.message}`); });
}

function buildGroundedRagState(normalised) {
  if (normalised.ragData) return normalised.ragData;
  const citeCount = normalised.notebookLmStatus?.citationsCount;
  return {
    answer: normalised.ragAnswer,
    citations: [],
    citationsCount: citeCount ?? null,
    source: normalised.notebookLmStatus?.source || 'UNKNOWN'
  };
}

function triggerMatrixRecomputeIfApplicable(prev, fullData, fallbackChassis) {
  if (!prev?.items || prev.items.length === 0) return;
  return postJson('/api/recompute-matrix', {
      runId: prev.runId,
      evalData: prev,
      ragResult: fullData,
      chassisDir: prev.chassisDir || fallbackChassis
  }).catch(err => console.warn('[App.jsx] Recompute matrix advisory:', err));
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
  startSearchRagPoll,
  context,
  isCurrent
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
    const jobInfo = await postJson('/api/notebook-query-async', { query, chassis: selectedChassis });
    if (!isCurrent()) return;

    if (IMMEDIATE_RAG_STATUSES.includes(jobInfo.status)) {
      setRagData(jobInfo.result || jobInfo);
      setIsQueryingRag(false);
      stopRagElapsedTimer();
      return;
    }

    if (jobInfo.jobId) startSearchRagPoll(jobInfo.jobId, context);
    else throw new Error('Notebook job response is missing its job ID');
  } catch (err) {
    if (!isCurrent()) return;
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
    const chassisDir = payload.chassisDir || currentCat?.chassisDir || currentCat?.id;
    const data = await postJson('/api/eval-boq', { ...payload, chassisDir });
    return { ...data, originalPayload: payload };
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
  const handleTriggerDemoBoq = () => handleEvaluateBoq(null, STANDARD_SAMPLE_TEXT);

  if (activeTab === 'orchestrator') {
    return (
      <div key="orchestrator" className="animate-tab-enter">
        <PresalesRequestPanel product={currentCatObj} isTaskRunning={isTaskRunning} onEvaluateBoq={handleEvaluateBoq} />
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
          onTriggerDemoBoq={handleTriggerDemoBoq}
          onOpenTopology={() => setActiveModal('boqTopology')}
        />
      </div>
    );
  }

  if (activeTab === 'pipeline' || activeTab === 'scraper') {
    return (
      <div key="pipeline" className="space-y-6 animate-tab-enter">
        <ChassisSyncSummaryView
          selectedChassis={selectedChassis}
          catalogData={catalogData}
          onSelectChassis={setSelectedChassis}
          onNavigateTab={setActiveTab}
          isTaskRunning={isTaskRunning}
          onTriggerSyncKnowledge={handleTriggerSyncKnowledge}
        />
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
        <ArtifactInspector
          currentCatalog={currentCatObj}
          onTriggerDownloadPdf={handleTriggerDownloadPdf}
          onNavigateTab={setActiveTab}
          isTaskRunning={isTaskRunning}
        />
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
  const handleTriggerDemoBoq = () => handleEvaluateBoq(null, STANDARD_SAMPLE_TEXT);

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
          onTriggerDemoBoq={handleTriggerDemoBoq}
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

function completeMatrixRagForRun(answer, fullData, context, state) {
  if (context?.epoch !== state.evaluationEpoch.current || context?.runId !== state.evaluationRunRef.current) return;
  const previous = state.evalRef.current;
  if (!previous || previous.runId !== context.runId) return;
  const updated = { ...previous, ragAnswer: answer, ragData: fullData };
  state.evalRef.current = updated;
  state.setEvalResults(updated);
  state.setRagData(fullData);
  triggerMatrixRecomputeIfApplicable(updated, fullData, updated.chassisDir);
}

function receiveEvaluation(normalised, raw, state) {
  if (raw.recovered && !state.evaluationRunRef.current) state.evaluationRunRef.current = raw.runId;
  if (raw.runId && raw.runId !== state.evaluationRunRef.current) return;
  normalised = { ...normalised, runId: raw.runId || normalised.runId };
  state.evalRef.current = normalised;
  state.setEvalResults(normalised);
  if (normalised.ragAnswer) state.setRagData(buildGroundedRagState(normalised));
  if (raw.recovered && raw.ragJobId) {
    state.startMatrixRagPoll(raw.ragJobId, { runId: raw.runId, epoch: state.evaluationEpoch.current });
    return;
  }
  const needsRag = !raw.recovered && !raw.error && !normalised.ragAnswer && Boolean(raw.data?.notebookPayload);
  if (!needsRag) return;
  const context = { runId: raw.runId, epoch: state.evaluationEpoch.current };
  const product = normalised.chassisPrefix || raw.data.chassisPrefix || state.selectedChassisRef.current;
  dispatchBackgroundMatrixRagQuery(raw, product, context, state.completeMatrixRag, state.startMatrixRagPoll,
    () => context.epoch === state.evaluationEpoch.current && context.runId === state.evaluationRunRef.current, state.setActionError);
}

function receiveTaskCompletion(payload, state) {
  if (!payload.recovered && payload.runId && payload.runId !== state.activeRunRef.current) return;
  state.activeRunRef.current = null;
  state.setIsTaskRunning(false);
  state.setActiveProgress(null);
  if (payload.recovered) return;
  state.refreshCatalogs();
  state.setTaskHistory(prev => [{ type: payload.task || 'PIPELINE_ACTION', status: payload.code === 0 ? 'COMPLETED' : 'FAILED', timestamp: new Date().toISOString() }, ...prev.slice(0, 15)]);
  const taskName = payload.task || '';
  if (payload.code === 0 && (taskName.includes('SCRAPE') || taskName.includes('REBUILD'))) state.setActiveTab('catalog');
}

async function replayClarifiedIntake(candidate, input, catalogs, submit, setError) {
  if (!input) { setError('Original intake is unavailable. Reload the BOQ before confirming a platform.'); return; }
  const product = catalogs.find(cat => cat.id === candidate);
  const payload = await buildBoqRequestPayload(input.boqInput, input.maybeRawText);
  return submit({ ...payload, chassisName: candidate, chassisDir: product?.chassisDir || candidate });
}

function recoverIntake(input, evaluation) {
  if (input?.runId && input.runId === evaluation?.runId) return input;
  const descriptor = evaluation?.inputDescriptor;
  if (!descriptor?.filepath || !descriptor.sha256) return null;
  return { boqInput: { filepath: descriptor.filepath, inputSha256: descriptor.sha256 } };
}

export default function App() {
  const {
    catalogs,
    catalogData,
    isCatalogLoading,
    catalogError,
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
  const evalRef = useRef(null);
  const evaluationRunRef = useRef(null);
  const activeRunRef = useRef(null);
  const inputRef = useRef(null);
  const evaluationEpoch = useRef(0);
  const searchEpoch = useRef(0);
  const [actionError, setActionError] = useState(null);
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

  const completeMatrixRag = (answer, fullData, context) => completeMatrixRagForRun(answer, fullData, context,
    { evaluationEpoch, evaluationRunRef, evalRef, setEvalResults, setRagData });
  const { startPoll: startMatrixRagPoll, cancelPoll: cancelMatrixRagPoll } = useRagPoller({
    onResult: completeMatrixRag,
    onTimeout: (context) => {
      if (context?.epoch === evaluationEpoch.current) setActionError('NotebookLM candidate review timed out. The result remains provisional.');
    },
    onFail: (errMsg, context) => {
      if (context?.epoch === evaluationEpoch.current) setActionError(`NotebookLM candidate review failed: ${errMsg}`);
    }
  });

  const elapsedIntervalRef = useRef(null);
  const stopRagElapsedTimer = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  };
  useEffect(() => () => clearInterval(elapsedIntervalRef.current), []);

  const { startPoll: startSearchRagPoll, cancelPoll: cancelSearchRagPoll } = useRagPoller({
    onResult: (_, fullData, context) => {
      if (context !== searchEpoch.current) return;
      setRagData(fullData);
      setIsQueryingRag(false);
      stopRagElapsedTimer();
    },
    onTimeout: (context) => {
      if (context !== searchEpoch.current) return;
      setRagData(prev => ({ ...prev, answer: '⚠️ NotebookLM Query Timeout: No response received within the 15-minute grounding window.', source: 'ERROR' }));
      setIsQueryingRag(false);
      stopRagElapsedTimer();
    },
    onFail: (errMsg, context) => {
      if (context !== searchEpoch.current) return;
      setRagData(prev => ({ ...prev, answer: `NotebookLM Query Failed: ${errMsg}`, source: 'ERROR' }));
      setIsQueryingRag(false);
      stopRagElapsedTimer();
    }
  });

  useSSEStream({
    onTaskStarted: useCallback((payload) => {
      setLogStream([]);
      activeRunRef.current = payload.runId;
      if (payload.task === 'EVAL_BOQ') evaluationRunRef.current = payload.runId;
      setIsTaskRunning(true);
      setActiveProgress({ task: payload.task, currentStep: 0, totalSteps: 0, action: 'Starting...', status: 'started' });
    }, []),

    onTaskCompleted: useCallback(payload => receiveTaskCompletion(payload,
      { activeRunRef, setIsTaskRunning, setActiveProgress, refreshCatalogs, setTaskHistory, setActiveTab }), [refreshCatalogs]),

    onProgress: useCallback((payload) => {
      if (payload.runId && payload.runId !== activeRunRef.current) return;
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

    onEvalResult: useCallback((normalised, raw) => receiveEvaluation(normalised, raw,
      { evaluationRunRef, evaluationEpoch, evalRef, setEvalResults, setRagData, selectedChassisRef, completeMatrixRag, startMatrixRagPoll, setActionError }), [startMatrixRagPoll, completeMatrixRag])
  });

  const handleSearchLocal = (query) => { setGlobalSearchTerm(query); setActiveTab('catalog'); };

  const handleSmartSearch = (query) => {
    const context = ++searchEpoch.current;
    void cancelSearchRagPoll('REPLACED_BY_NEW_QUERY');
    return executeSmartSearchRequest({
    query,
    selectedChassis,
    setIsRagOpen,
    setIsQueryingRag,
    setRagElapsedTime,
    setRagData,
    elapsedIntervalRef,
    stopRagElapsedTimer,
    startSearchRagPoll,
    context,
    isCurrent: () => context === searchEpoch.current
  });
  };

  const postScraperEndpoint = async (url, bodyObj) => {
    setActionError(null);
    try {
      const options = bodyObj
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) }
        : { method: 'POST' };
      await requestJson(url, options);
      setActiveTab('pipeline');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleTriggerScrape = (mode) => postScraperEndpoint('/api/scrape', { mode, chassis: selectedChassis });
  const handleTriggerRebuild = () => postScraperEndpoint('/api/rebuild');
  const handleTriggerSyncKnowledge = () => postScraperEndpoint('/api/sync-knowledge');
  const handleTriggerDownloadPdf = () => postScraperEndpoint('/api/download-pdf', { chassisId: selectedChassis });
  const handleTriggerNavigate = () => postScraperEndpoint('/api/navigate-oca', { chassis: selectedChassis });

  const handleTriggerKillTask = async () => {
    try { await requestJson('/api/kill-task', { method: 'POST' }); } catch (err) { setActionError(err.message); }
  };

  const currentCatObj = catalogs.find(c => c.id === selectedChassis);
  const handleEvaluateBoq = async (boqInput, maybeRawText) => {
    evaluationEpoch.current++;
    void cancelMatrixRagPoll('REPLACED_BY_NEW_EVALUATION');
    inputRef.current = { boqInput, maybeRawText };
    evalRef.current = null;
    setActionError(null);
    const response = await executeBoqEvaluationRequest(boqInput, maybeRawText, currentCatObj, setLogStream, setEvalResults);
    inputRef.current = { boqInput, maybeRawText, runId: response.runId };
    return response;
  };

  const handleSelectClarification = async (candidate) => {
    setSelectedChassis(candidate);
    try { await replayClarifiedIntake(candidate, recoverIntake(inputRef.current, evalRef.current), catalogs, handleEvaluateBoq, setActionError); }
    catch (err) { setActionError(err.message); }
  };

  return (
    <div className="min-h-screen pb-16">
      {(actionError || catalogError) && <div role="alert" className="p-3 bg-rose-50 text-rose-800 text-sm">
        {actionError || catalogError}
        <button className="ml-3 underline" onClick={() => { setActionError(null); refreshCatalogs(); }}>Retry catalog / dismiss</button>
      </div>}
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
