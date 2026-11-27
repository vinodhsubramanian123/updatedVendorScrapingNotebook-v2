import { useState, useRef, useCallback, useEffect } from "react";
import { useSSEStream } from "./useSSEStream.js";
import { useRagPoller } from "./useRagPoller.js";
import { requestJson, postJson } from "../services/api.js";
import { deriveDualBrainBadges, normalizeEvalResult } from "../services/evalNormalizer.js";
import { isBoqFileInput, buildBoqRequestPayload, dispatchBackgroundMatrixRagQuery, buildGroundedRagState, triggerMatrixRecomputeIfApplicable, readSessionValue, writeSessionJson, SESSION_BOQ_RUN_KEY, SESSION_BOQ_LAST_COMPLETED_KEY, SESSION_BOQ_INTAKE_KEY } from "../services/workspaceRequests.js";

export function completeMatrixRagForRun(answer, fullData, context, state) {
  if (context?.epoch !== state.evaluationEpoch.current || context?.runId !== state.evaluationRunRef.current) return;
  const previous = state.evalRef.current;
  if (!previous || previous.runId !== context.runId) return;
  const isFallback = ['LOCAL_RAG_FALLBACK', 'LOCAL_FALLBACK'].includes(fullData.source) || fullData.isFallback === true;
  const notebookLmStatus = {
    ...previous.notebookLmStatus,
    isFallback,
    isCloudGrounded: fullData.isCloudGrounded === true,
    citationsCount: fullData.citations?.length || 0,
    fallbackReason: fullData.fallbackReason || fullData.cloudUnavailableReason || null
  };
  const updated = { ...previous, ragAnswer: answer, ragData: fullData, notebookLmStatus };
  updated.dualBrainBadges = deriveDualBrainBadges({ ...updated, isCloudGrounded: notebookLmStatus.isCloudGrounded });
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

function _shouldDispatchBackgroundRag(raw, normalised, isOfflineRequested) {
  return !isOfflineRequested && !raw.recovered && !raw.explicitReopen && !raw.error && !normalised.ragAnswer && Boolean(raw.data?.notebookPayload);
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
  if (!_shouldDispatchBackgroundRag(raw, normalised, isOfflineRequested)) return;
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
    evaluationStartedAt: run.startTime ?? run.result.evaluationStartedAt,
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
  state.setActiveProgress(previous => previous?.qualifications ? { ...previous, task: null } : null);
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

export async function replayClarifiedIntake(candidate, input, catalogs, submit, setError) {
  if (!input) { setError('Original intake is unavailable. Reload the BOQ before confirming a platform.'); return { error: 'Original intake is unavailable' }; }
  const product = catalogs.find(cat => cat.id === candidate);
  const payload = await buildBoqRequestPayload(input.boqInput, input.maybeRawText);
  if (payload.offline === undefined && input.offline !== undefined) payload.offline = input.offline;
  return submit({ ...payload, chassisName: candidate, chassisDir: product?.chassisDir || candidate });
}

export function recoverIntake(input, evaluation) {
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

export function isAbortCancellation(err) {
  return err?.name === 'AbortError' || err?.message?.includes('aborted');
}

export function computeActiveBannerError(actionError, catalogError) {
  if (actionError && !actionError.includes('aborted') && !actionError.includes('AbortError')) return actionError;
  if (catalogError && !catalogError.includes('aborted') && !catalogError.includes('AbortError')) return catalogError;
  return null;
}

function _pickPipelineTarget(explicitTarget, fallbackChassis) {
  return (typeof explicitTarget === 'string' && explicitTarget.trim()) ? explicitTarget.trim() : fallbackChassis;
}

export function usePipelineTriggers({ selectedChassis, setActionError, setActiveTab, activeRunRef, runActivityRef }) {
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
    handleTriggerScrape: (mode, explicitTarget, opts = {}) => {
      const target = _pickPipelineTarget(explicitTarget, selectedChassis);
      return target && postScraperEndpoint('/api/scrape', { mode, chassis: target, ...opts });
    },
    handleTriggerScrapeE2E: (mode, explicitTarget, opts = {}) => {
      const target = _pickPipelineTarget(explicitTarget, selectedChassis);
      return target && postScraperEndpoint('/api/scrape-e2e', { mode, chassis: target, ...opts });
    },
    handleTriggerOnboard: async (explicitTarget) => {
      const target = _pickPipelineTarget(explicitTarget, selectedChassis);
      if (!target) return null;
      setActionError(null);
      try {
        return await postJson('/api/onboard-product', { productId: target });
      } catch (err) {
        if (!isAbortCancellation(err)) setActionError(err.message);
        return null;
      }
    },
    handleTriggerRebuild: () => postScraperEndpoint('/api/rebuild'),
    handleTriggerSyncKnowledge: () => postScraperEndpoint('/api/sync-knowledge'),
    handleTriggerDownloadPdf: (product) => {
      const target = _pickPipelineTarget(product, selectedChassis);
      return target && postScraperEndpoint('/api/download-pdf', { chassisId: target });
    },
    handleTriggerNavigate: (explicitTarget, opts = {}) => {
      const target = _pickPipelineTarget(explicitTarget, selectedChassis);
      return target && postScraperEndpoint('/api/navigate-oca', { chassis: target, ...opts });
    },
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

export function useSearchRagPoller({ searchEpoch, setRagData, setIsQueryingRag, stopRagElapsedTimer }) {
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

export function useMatrixRagPoller({ evaluationEpoch, setActionError, completeMatrixRag }) {
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

export function buildPersistedIntakeRecord(boqInput, maybeRawText, response, effectiveOffline, runId) {
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

export async function executeRunReopen(run, state) {
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

export function useProgressStream({
  setLogStream,
  activeRunRef,
  evaluationRunRef,
  inputRef,
  setIsTaskRunning,
  setActiveProgress,
  refreshCatalogs,
  setRunActivity,
  setStreamConnected,
  setRestoringEvaluation,
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
    let mounted = true;
    void recoverOwnedBoqRun(null, recoveryStateRef.current).finally(() => {
      if (mounted) setRestoringEvaluation(false);
    });
    const onSnapshot = (event) => {
      void recoverOwnedBoqRun(event?.detail || null, recoveryStateRef.current);
    };
    window.addEventListener('dashboard-sse-snapshot', onSnapshot);
    return () => {
      mounted = false;
      window.removeEventListener('dashboard-sse-snapshot', onSnapshot);
    };
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
      setActiveProgress(previous => previous?.qualifications && !payload.qualifications ? previous : ({
        task: payload.task || 'RUNNING',
        currentStep: payload.step,
        totalSteps: payload.total,
        action: payload.action,
        stage: payload.stage,
        status: payload.status,
        detail: payload.detail,
        qualifications: payload.qualifications
      }));
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

export function formatErrorWithRemediation(res) {
  if (!res?.error) return null;
  if (res.remediationAction && !String(res.error).includes(res.remediationAction)) {
    return `${res.error} — ${res.remediationAction}`;
  }
  return res.error;
}

export function computeRunActivityDisplay({ activeTab, runActivity, streamConnected, isTaskRunning }) {
  const isEvalWorkspaceTab = activeTab === 'orchestrator' || activeTab === 'matrix';
  const evaluationActivity = runActivity?.task === 'EVAL_BOQ' || runActivity?.task === 'PRESALES_QUERY';
  const activeRunVisible = runActivity?.status === 'RUNNING';
  const showRunActivityBanner = streamConnected === false || activeRunVisible ||
    (activeTab === 'pipeline' ? Boolean(runActivity) : evaluationActivity && (isEvalWorkspaceTab || isTaskRunning));
  const bannerRun = activeTab === 'pipeline' || evaluationActivity || activeRunVisible ? runActivity : null;
  return { isEvalWorkspaceTab, showRunActivityBanner, bannerRun };
}

export function useServerOfflinePolicy() {
  const [serverOffline, setServerOffline] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    const onSnapshot = ({ detail }) => {
      if (typeof detail?.serverOffline === 'boolean') setServerOffline(detail.serverOffline);
    };
    window.addEventListener('dashboard-sse-snapshot', onSnapshot);
    requestJson('/api/health', { signal: controller.signal })
      .then(({ serverOffline }) => {
        if (!controller.signal.aborted && typeof serverOffline === 'boolean') {
          setServerOffline(previous => previous ?? serverOffline);
        }
      })
      .catch(() => {});
    return () => {
      controller.abort();
      window.removeEventListener('dashboard-sse-snapshot', onSnapshot);
    };
  }, []);
  return serverOffline;
}
