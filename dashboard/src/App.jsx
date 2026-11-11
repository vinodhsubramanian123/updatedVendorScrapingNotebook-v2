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
import RunActivity from './components/RunActivity';
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
import { normalizeEvalResult } from './services/evalNormalizer.js';
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
  localOnly = true,
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
    const offlineFlag = Boolean(localOnly);
    const jobInfo = await postJson('/api/notebook-query-async', {
      query,
      chassis: selectedChassis,
      offline: offlineFlag,
      offlineMode: offlineFlag
    });
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

const SESSION_BOQ_RUN_KEY = 'boq.ownedRunId';
const SESSION_BOQ_LAST_COMPLETED_KEY = 'boq.lastCompletedRunId';
const SESSION_BOQ_INTAKE_KEY = 'boq.intakeDescriptor';

function readSessionValue(key) {
  try { return typeof window !== 'undefined' ? window.sessionStorage?.getItem(key) || null : null; }
  catch { return null; }
}

function readSessionJson(key) {
  try {
    const raw = readSessionValue(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSessionJson(key, value) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (value === null || value === undefined) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {}
}

async function executeBoqEvaluationRequest(boqInput, maybeRawText, currentCat, setLogStream, setEvalResults, localOnly = true, runId = null) {
  setLogStream([]);
  setEvalResults(null);
  try {
    const payload = await buildBoqRequestPayload(boqInput, maybeRawText);
    if (payload.offline === undefined) payload.offline = localOnly;
    if (runId && !payload.runId) payload.runId = runId;
    const explicitProduct = payload.chassisDir || payload.candidateReference?.chassisDir || payload.candidateReference?.product || payload.chassisName;
    const chassisDir = explicitProduct || currentCat?.chassisDir || currentCat?.id;
    const chassisName = payload.chassisName || payload.candidateReference?.product || (explicitProduct ? undefined : currentCat?.id);
    const data = await postJson('/api/eval-boq', { ...payload, chassisDir, ...(chassisName ? { chassisName } : {}) });
    return { ...data, originalPayload: payload };
  } catch (err) {
    const errResult = { status: 'ERROR', code: err.code, error: err.message, remediationAction: err.remediationAction };
    setEvalResults(errResult);
    return { error: err.message, remediationAction: err.remediationAction, code: err.code, status: err.status };
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
  runActivity,
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
  handleTriggerNavigate,
  handleReopenRun
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
          runActivity={runActivity}
          onTriggerScrape={handleTriggerScrape}
          onTriggerRebuild={handleTriggerRebuild}
          onTriggerDownloadPdf={handleTriggerDownloadPdf}
          onTriggerSyncKnowledge={handleTriggerSyncKnowledge}
          onTriggerKillTask={handleTriggerKillTask}
          onTriggerNavigate={handleTriggerNavigate}
          onReopenRun={handleReopenRun}
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
  activeProgress,
  selectedChassis,
  setSelectedCardForFeedback,
  setIsRagOpen,
  handleSmartSearch,
  handleEvaluateBoq,
  handleTriggerScrape,
  auditReport,
  setAuditReport,
  boqLocalOnly,
  setBoqLocalOnly
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
          activeProgress={activeProgress}
          localOnly={boqLocalOnly}
          onLocalOnlyChange={setBoqLocalOnly}
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

function _shouldAcceptIncomingRunId(raw, state) {
  const ownedId = state.evaluationRunRef.current || readSessionValue(SESSION_BOQ_RUN_KEY);
  if (raw.explicitReopen) {
    state.evaluationRunRef.current = raw.runId;
    return true;
  }
  if (raw.recovered) {
    if (!ownedId) state.evaluationRunRef.current = raw.runId;
    return !ownedId || raw.runId === ownedId;
  }
  if (raw.runId && ownedId && raw.runId !== ownedId) return false;
  if (raw.runId && !ownedId) state.evaluationRunRef.current = raw.runId;
  return true;
}

function _isOfflineEvaluationRequested(raw, normalised) {
  return Boolean(
    raw.effectivePolicy?.offline === true ||
    raw.inputDescriptor?.offline === true ||
    raw.data?.evalResults?.offlineMode === true ||
    normalised.effectivePolicy?.offline === true ||
    normalised.offlineMode === true
  );
}

function receiveEvaluation(normalised, raw, state) {
  if (!_shouldAcceptIncomingRunId(raw, state)) return;
  normalised = { ...normalised, runId: raw.runId || normalised.runId };
  state.evalRef.current = normalised;
  state.setEvalResults(normalised);
  const completedCleanly = normalised.status && !['ERROR', 'CANCELLED', 'INTERRUPTED', 'ACTION_REQUIRED'].includes(normalised.status);
  if (completedCleanly && !normalised.clarificationRequired && normalised.runId) {
    writeSessionJson(SESSION_BOQ_LAST_COMPLETED_KEY, normalised.runId);
  }
  if (normalised.ragAnswer) state.setRagData(buildGroundedRagState(normalised));
  const isOfflineRequested = _isOfflineEvaluationRequested(raw, normalised);
  if (!isOfflineRequested && raw.recovered && raw.ragJobId && !normalised.ragAnswer) {
    state.startMatrixRagPoll(raw.ragJobId, { runId: raw.runId, epoch: state.evaluationEpoch.current });
    return;
  }
  const needsRag = !isOfflineRequested && !raw.recovered && !raw.error && !normalised.ragAnswer && Boolean(raw.data?.notebookPayload);
  if (!needsRag) return;
  const context = { runId: raw.runId, epoch: state.evaluationEpoch.current };
  const product = normalised.chassisPrefix || raw.data.chassisPrefix || state.selectedChassisRef.current;
  dispatchBackgroundMatrixRagQuery(raw, product, context, state.completeMatrixRag, state.startMatrixRagPoll,
    () => context.epoch === state.evaluationEpoch.current && context.runId === state.evaluationRunRef.current, state.setActionError);
}

function syncInputFromRun(run, inputRef) {
  const desc = run?.inputDescriptor;
  if (!desc?.filepath) return;
  const offline = run.effectivePolicy?.offline ?? desc.offline;
  const record = {
    boqInput: { filepath: desc.filepath, inputSha256: desc.sha256, offline, effectivePolicy: run.effectivePolicy || desc.effectivePolicy },
    inputDescriptor: desc,
    offline,
    runId: run.runId
  };
  if (inputRef) inputRef.current = record;
  writeSessionJson(SESSION_BOQ_INTAKE_KEY, record);
}

function restoreBoqRunRecord(run, state, explicit = false) {
  if (!run?.result) return;
  const restoredRaw = {
    ...run.result,
    runId: run.runId,
    inputDescriptor: run.inputDescriptor || run.result.inputDescriptor,
    effectivePolicy: run.effectivePolicy || run.result.effectivePolicy,
    explicitReopen: explicit,
    recovered: !explicit
  };
  receiveEvaluation(normalizeEvalResult(restoredRaw), restoredRaw, state);
  syncInputFromRun(run, state.inputRef);
}

async function restorePreviousCompletedBoq(ownedId, snapshotDetail, state) {
  if (state.evalRef.current) return;
  const lastCompletedId = readSessionValue(SESSION_BOQ_LAST_COMPLETED_KEY);
  if (lastCompletedId && lastCompletedId !== ownedId) {
    try {
      const prevData = await requestJson(`/api/run/${encodeURIComponent(lastCompletedId)}`);
      const prevRun = prevData?.run || prevData;
      if (prevRun?.result) {
        restoreBoqRunRecord(prevRun, state, true);
        return;
      }
    } catch {}
  }
  if (snapshotDetail?.latestResult?.data) {
    const snap = snapshotDetail.latestResult;
    restoreBoqRunRecord({ runId: snap.runId, result: snap, inputDescriptor: snap.inputDescriptor, effectivePolicy: snap.effectivePolicy }, state, true);
  }
}

async function recoverOwnedBoqRun(snapshotDetail, state) {
  const ownedId = state.evaluationRunRef.current || readSessionValue(SESSION_BOQ_RUN_KEY);
  if (!ownedId) return;
  try {
    const data = await requestJson(`/api/run/${encodeURIComponent(ownedId)}`);
    const run = data?.run || data;
    if (!run) return;
    if (run.result) {
      restoreBoqRunRecord(run, state, true);
      return;
    }
    if (run.status === 'INTERRUPTED' || run.status === 'CANCELLED') {
      if (!state.activeRunRef.current) {
        state.setRunActivity(prev => (!prev || prev.status !== 'RUNNING') ? { ...run } : prev);
      }
      await restorePreviousCompletedBoq(ownedId, snapshotDetail, state);
    }
  } catch {}
}

function receiveTaskCompletion(payload, state) {
  if (!payload.recovered && payload.runId && payload.runId !== state.activeRunRef.current) return;
  state.visibleRunRef.current = payload.runId;
  state.activeRunRef.current = null;
  state.setIsTaskRunning(false);
  state.setActiveProgress(null);
  state.setRunActivity(previous => payload.runId ? {
    ...(previous?.runId === payload.runId ? previous : {}),
    ...payload,
    status: payload.status || (payload.code === 0 ? 'COMPLETED' : 'FAILED')
  } : null);
  if (payload.runId && payload.runId === state.evaluationRunRef.current && !state.evalRef.current) {
    requestJson(`/api/run/${encodeURIComponent(payload.runId)}`)
      .then(data => {
        const run = data?.run || data;
        if (run?.result && state.evaluationRunRef.current === payload.runId) {
          state.recoverEvalRun?.(run);
        }
      })
      .catch(() => {});
  }
  if (payload.recovered) return;
  state.refreshCatalogs();
}

async function replayClarifiedIntake(candidate, input, catalogs, submit, setError) {
  if (!input) { setError('Original intake is unavailable. Reload the BOQ before confirming a platform.'); return { error: 'Original intake is unavailable' }; }
  const product = catalogs.find(cat => cat.id === candidate);
  const payload = await buildBoqRequestPayload(input.boqInput, input.maybeRawText);
  if (payload.offline === undefined && input.offline !== undefined) payload.offline = input.offline;
  return submit({ ...payload, chassisName: candidate, chassisDir: product?.chassisDir || candidate });
}

function recoverIntake(input, evaluation) {
  if (input?.runId && input.runId === evaluation?.runId && input.boqInput?.filepath && input.boqInput?.inputSha256) return input;
  const descriptor = evaluation?.inputDescriptor || (input?.runId === evaluation?.runId ? input?.inputDescriptor : null);
  if (descriptor?.filepath && descriptor.sha256) {
    return {
      boqInput: { filepath: descriptor.filepath, inputSha256: descriptor.sha256, offline: descriptor.offline, effectivePolicy: descriptor.effectivePolicy },
      offline: descriptor.offline
    };
  }
  if (input?.runId && input.runId === evaluation?.runId) return input;
  return null;
}

function isAbortCancellation(err) {
  return err?.name === 'AbortError' || err?.message?.includes('aborted');
}

function computeActiveBannerError(actionError, catalogError) {
  if (actionError && !actionError.includes('aborted') && !actionError.includes('AbortError')) return actionError;
  if (catalogError && !catalogError.includes('aborted') && !catalogError.includes('AbortError')) return catalogError;
  return null;
}

function usePipelineTriggers({ selectedChassis, setActionError, setActiveTab, activeRunRef, runActivityRef }) {
  const postScraperEndpoint = async (url, bodyObj) => {
    setActionError(null);
    try {
      const options = bodyObj
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) }
        : { method: 'POST' };
      await requestJson(url, options);
      setActiveTab('pipeline');
    } catch (err) {
      if (!isAbortCancellation(err)) setActionError(err.message);
    }
  };

  return {
    handleTriggerScrape: (mode) => postScraperEndpoint('/api/scrape', { mode, chassis: selectedChassis }),
    handleTriggerRebuild: () => postScraperEndpoint('/api/rebuild'),
    handleTriggerSyncKnowledge: () => postScraperEndpoint('/api/sync-knowledge'),
    handleTriggerDownloadPdf: () => postScraperEndpoint('/api/download-pdf', { chassisId: selectedChassis }),
    handleTriggerNavigate: () => postScraperEndpoint('/api/navigate-oca', { chassis: selectedChassis }),
    handleTriggerKillTask: async (explicitRunId) => {
      const targetRunId = (typeof explicitRunId === 'string' && explicitRunId)
        ? explicitRunId
        : (activeRunRef?.current || runActivityRef?.current?.runId || undefined);
      try {
        await postJson('/api/kill-task', targetRunId ? { runId: targetRunId } : {});
      } catch (err) {
        if (!isAbortCancellation(err)) setActionError(err.message);
      }
    }
  };
}

function useSearchRagPoller({ searchEpoch, setRagData, setIsQueryingRag, stopRagElapsedTimer }) {
  return useRagPoller({
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
}

function useMatrixRagPoller({ evaluationEpoch, setActionError, completeMatrixRag }) {
  return useRagPoller({
    onResult: completeMatrixRag,
    onTimeout: (context) => {
      if (context?.epoch === evaluationEpoch.current) {
        setActionError('NotebookLM candidate review timed out. The result remains provisional.');
      }
    },
    onFail: (errMsg, context) => {
      if (typeof errMsg === 'string' && (errMsg.includes('AbortError') || errMsg.includes('aborted'))) return;
      if (context?.epoch === evaluationEpoch.current) {
        setActionError(`NotebookLM candidate review failed: ${errMsg}`);
      }
    }
  });
}

function buildPersistedIntakeRecord(boqInput, maybeRawText, response, effectiveOffline, runId) {
  if (response?.inputDescriptor) {
    return {
      boqInput: {
        filepath: response.inputDescriptor.filepath,
        inputSha256: response.inputDescriptor.sha256,
        offline: effectiveOffline
      },
      inputDescriptor: response.inputDescriptor,
      maybeRawText,
      offline: effectiveOffline,
      runId
    };
  }
  const safeInput = (typeof File !== 'undefined' && boqInput instanceof File) || isBoqFileInput(boqInput) ? null : boqInput;
  return { boqInput: safeInput, maybeRawText, offline: effectiveOffline, runId };
}

async function executeRunReopen(run, state) {
  if (!run?.runId) return;
  state.setActionError(null);
  try {
    const data = await requestJson(`/api/run/${encodeURIComponent(run.runId)}`);
    const full = data?.run || data;
    if (!full) throw new Error(`Run ${run.runId} could not be loaded`);
    if (full.result) {
      state.evaluationEpoch.current++;
      state.evaluationRunRef.current = full.runId;
      writeSessionJson(SESSION_BOQ_RUN_KEY, full.runId);
      restoreBoqRunRecord(full, state, true);
      if (full.product && state.catalogs.some(c => c.id === full.product)) {
        state.setSelectedChassis(full.product);
      }
      state.setActiveTab('matrix');
      return;
    }
    if (full.queryResult) {
      writeSessionJson('presales.ownedRunId', full.runId);
      state.setActiveTab('orchestrator');
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dashboard-reopen-routed-result', {
            detail: { runId: full.runId, data: full.queryResult.data || full.queryResult }
          }));
        }
      }, 0);
      return;
    }
    state.setActionError(`Run ${full.runId} has status ${full.status || 'UNKNOWN'} and no saved result to reopen.`);
  } catch (err) {
    if (!isAbortCancellation(err)) state.setActionError(err.message);
  }
}

function useProgressStream({
  setLogStream,
  activeRunRef,
  evaluationRunRef,
  inputRef,
  setIsTaskRunning,
  setActiveProgress,
  refreshCatalogs,
  setRunActivity,
  setStreamConnected,
  evaluationEpoch,
  evalRef,
  setEvalResults,
  setRagData,
  selectedChassisRef,
  completeMatrixRag,
  startMatrixRagPoll,
  setActionError
}) {
  const visibleRunRef = useRef(null);
  const recoveryStateRef = useRef(null);
  recoveryStateRef.current = {
    evaluationRunRef,
    evaluationEpoch,
    evalRef,
    inputRef,
    activeRunRef,
    setEvalResults,
    setRagData,
    setRunActivity,
    selectedChassisRef,
    completeMatrixRag,
    startMatrixRagPoll,
    setActionError
  };

  useEffect(() => {
    void recoverOwnedBoqRun(null, recoveryStateRef.current);
    const onSnapshot = (event) => {
      void recoverOwnedBoqRun(event?.detail || null, recoveryStateRef.current);
    };
    window.addEventListener('dashboard-sse-snapshot', onSnapshot);
    return () => window.removeEventListener('dashboard-sse-snapshot', onSnapshot);
  }, []);

  useSSEStream({
    onTaskStarted: useCallback((payload) => {
      if (!payload.recovered) setLogStream([]);
      activeRunRef.current = payload.runId;
      visibleRunRef.current = payload.runId;
      const ownedId = evaluationRunRef.current || readSessionValue(SESSION_BOQ_RUN_KEY);
      if (payload.task === 'EVAL_BOQ' && !ownedId && !payload.recovered) {
        evaluationRunRef.current = payload.runId;
        writeSessionJson(SESSION_BOQ_RUN_KEY, payload.runId);
        evalRef.current = null;
        setEvalResults(null);
      }
      setIsTaskRunning(true);
      setRunActivity({ ...payload, startTime: payload.startTime ?? Date.now(), status: 'RUNNING' });
      setActiveProgress({ task: payload.task, action: 'Starting…', status: 'started' });
    }, [activeRunRef, evaluationRunRef, evalRef, setEvalResults, setIsTaskRunning, setRunActivity, setActiveProgress, setLogStream]),

    onTaskCompleted: useCallback(payload => receiveTaskCompletion(payload,
      {
        activeRunRef,
        visibleRunRef,
        evaluationRunRef,
        evalRef,
        setIsTaskRunning,
        setActiveProgress,
        refreshCatalogs,
        setRunActivity,
        recoverEvalRun: (run) => restoreBoqRunRecord(run, recoveryStateRef.current, true)
      }),
      [activeRunRef, evaluationRunRef, evalRef, setIsTaskRunning, setActiveProgress, refreshCatalogs, setRunActivity]),

    onProgress: useCallback((payload) => {
      if (payload.runId && payload.runId !== activeRunRef.current) return;
      setActiveProgress({
        task: payload.task || 'RUNNING',
        currentStep: payload.step,
        totalSteps: payload.total,
        action: payload.action,
        stage: payload.stage,
        status: payload.status,
        detail: payload.detail
      });
      setLogStream(prev => [...prev.slice(-200), payload]);
    }, [activeRunRef, setActiveProgress, setLogStream]),

    onLog: useCallback((payload) => {
      if (payload.runId && payload.runId !== visibleRunRef.current) return;
      setLogStream(prev => [...prev.slice(-200), payload]);
    }, [setLogStream]),

    onLogsRestored: setLogStream,
    onConnectionChange: setStreamConnected,

    onEvalResult: useCallback((normalised, raw) => receiveEvaluation(normalised, raw,
      { evaluationRunRef, evaluationEpoch, evalRef, setEvalResults, setRagData, selectedChassisRef, completeMatrixRag, startMatrixRagPoll, setActionError }),
      [evaluationRunRef, evaluationEpoch, evalRef, setEvalResults, setRagData, selectedChassisRef, completeMatrixRag, startMatrixRagPoll, setActionError])
  });
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
  const [activeProgress, setActiveProgress] = useState(null);
  const [runActivity, setRunActivity] = useState(null);
  const [streamConnected, setStreamConnected] = useState(null);

  const [evalResults, setEvalResults] = useState(null);
  const evalRef = useRef(null);
  const evaluationRunRef = useRef(readSessionValue(SESSION_BOQ_RUN_KEY));
  const activeRunRef = useRef(null);
  const runActivityRef = useRef(null);
  useEffect(() => { runActivityRef.current = runActivity; }, [runActivity]);
  const inputRef = useRef(readSessionJson(SESSION_BOQ_INTAKE_KEY));
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
  const [boqLocalOnly, setBoqLocalOnly] = useState(true);

  const completeMatrixRag = (answer, fullData, context) => completeMatrixRagForRun(answer, fullData, context,
    { evaluationEpoch, evaluationRunRef, evalRef, setEvalResults, setRagData });
  const { startPoll: startMatrixRagPoll, cancelPoll: cancelMatrixRagPoll } = useMatrixRagPoller({
    evaluationEpoch,
    setActionError,
    completeMatrixRag
  });

  const elapsedIntervalRef = useRef(null);
  const stopRagElapsedTimer = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  };
  useEffect(() => () => clearInterval(elapsedIntervalRef.current), []);

  const { startPoll: startSearchRagPoll, cancelPoll: cancelSearchRagPoll } = useSearchRagPoller({
    searchEpoch,
    setRagData,
    setIsQueryingRag,
    stopRagElapsedTimer
  });

  useProgressStream({
    setLogStream,
    activeRunRef,
    evaluationRunRef,
    inputRef,
    setIsTaskRunning,
    setActiveProgress,
    refreshCatalogs,
    setRunActivity,
    setStreamConnected,
    evaluationEpoch,
    evalRef,
    setEvalResults,
    setRagData,
    selectedChassisRef,
    completeMatrixRag,
    startMatrixRagPoll,
    setActionError
  });

  const {
    handleTriggerScrape,
    handleTriggerRebuild,
    handleTriggerSyncKnowledge,
    handleTriggerDownloadPdf,
    handleTriggerNavigate,
    handleTriggerKillTask
  } = usePipelineTriggers({ selectedChassis, setActionError, setActiveTab, activeRunRef, runActivityRef });

  const handleSearchLocal = (query) => { setGlobalSearchTerm(query); setActiveTab('catalog'); };

  const handleSmartSearch = (query) => {
    const context = ++searchEpoch.current;
    void cancelSearchRagPoll('REPLACED_BY_NEW_QUERY');
    return executeSmartSearchRequest({
      query,
      selectedChassis,
      localOnly: boqLocalOnly,
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

  const currentCatObj = catalogs.find(c => c.id === selectedChassis);
  const handleEvaluateBoq = async (boqInput, maybeRawText) => {
    evaluationEpoch.current++;
    void cancelMatrixRagPoll('REPLACED_BY_NEW_EVALUATION');
    const requestedOffline = (boqInput && typeof boqInput === 'object' && boqInput.offline !== undefined)
      ? boqInput.offline
      : boqLocalOnly;
    const clientRunId = (boqInput && typeof boqInput === 'object' && boqInput.runId)
      ? boqInput.runId
      : `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    evaluationRunRef.current = clientRunId;
    writeSessionJson(SESSION_BOQ_RUN_KEY, clientRunId);
    const initialRecord = buildPersistedIntakeRecord(boqInput, maybeRawText, null, requestedOffline, clientRunId);
    inputRef.current = initialRecord;
    writeSessionJson(SESSION_BOQ_INTAKE_KEY, initialRecord);
    evalRef.current = null;
    setActionError(null);
    const response = await executeBoqEvaluationRequest(boqInput, maybeRawText, currentCatObj, setLogStream, setEvalResults, requestedOffline, clientRunId);
    if (response?.error) {
      const msg = response.remediationAction && !String(response.error).includes(response.remediationAction)
        ? `${response.error} — ${response.remediationAction}`
        : response.error;
      setActionError(msg);
      return response;
    }
    const effectiveOffline = response?.effectivePolicy?.offline ?? requestedOffline;
    const resolvedRunId = response?.runId || clientRunId;
    const persisted = buildPersistedIntakeRecord(boqInput, maybeRawText, response, effectiveOffline, resolvedRunId);
    inputRef.current = persisted;
    writeSessionJson(SESSION_BOQ_INTAKE_KEY, persisted);
    return response;
  };

  const handleSelectClarification = async (candidate) => {
    setSelectedChassis(candidate);
    try {
      const res = await replayClarifiedIntake(candidate, recoverIntake(inputRef.current, evalRef.current), catalogs, handleEvaluateBoq, setActionError);
      if (res?.error) {
        const msg = res.remediationAction && !String(res.error).includes(res.remediationAction)
          ? `${res.error} — ${res.remediationAction}`
          : res.error;
        setActionError(msg);
      }
    } catch (err) {
      if (!isAbortCancellation(err)) setActionError(err.message);
    }
  };

  const handleReopenRun = (run) => executeRunReopen(run, {
    evaluationEpoch,
    evaluationRunRef,
    evalRef,
    inputRef,
    setEvalResults,
    setRagData,
    selectedChassisRef,
    completeMatrixRag,
    startMatrixRagPoll,
    setActionError,
    setSelectedChassis,
    catalogs,
    setActiveTab
  });

  const activeBannerError = computeActiveBannerError(actionError, catalogError);

  return (
    <div className="min-h-screen pb-16">
      {activeBannerError && <div role="alert" className="p-3 bg-rose-50 text-rose-800 text-sm">
        {activeBannerError}
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
        onOpenRag={(q) => {
          if (q && typeof q === 'string') handleSmartSearch(q);
          else setIsRagOpen(true);
        }}
        onOpenFeedbackDrawer={() => setIsFeedbackDrawerOpen(true)}
        onOpenQuarantineDrawer={() => setIsQuarantineOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isTaskRunning={isTaskRunning}
        isCatalogLoading={isCatalogLoading}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6 space-y-6">
        <RunActivity
          run={runActivity}
          progress={activeProgress}
          evaluation={evalResults}
          reconnecting={streamConnected === false}
          onNavigate={setActiveTab}
          onCancelTask={handleTriggerKillTask}
        />

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
            runActivity={runActivity}
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
            handleReopenRun={handleReopenRun}
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
        activeProgress={activeProgress}
        selectedChassis={selectedChassis}
        setSelectedCardForFeedback={setSelectedCardForFeedback}
        setIsRagOpen={setIsRagOpen}
        handleSmartSearch={handleSmartSearch}
        handleEvaluateBoq={handleEvaluateBoq}
        handleTriggerScrape={handleTriggerScrape}
        auditReport={auditReport}
        setAuditReport={setAuditReport}
        boqLocalOnly={boqLocalOnly}
        setBoqLocalOnly={setBoqLocalOnly}
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
