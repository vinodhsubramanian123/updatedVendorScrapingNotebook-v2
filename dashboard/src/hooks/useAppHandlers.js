import { useRef, useEffect } from "react";
import {
  executeSmartSearchRequest,
  writeSessionJson,
  executeBoqEvaluationRequest,
  SESSION_BOQ_RUN_KEY,
  SESSION_BOQ_INTAKE_KEY
} from "../services/workspaceRequests.js";
import {
  completeMatrixRagForRun,
  replayClarifiedIntake,
  recoverIntake,
  isAbortCancellation,
  useSearchRagPoller,
  useMatrixRagPoller,
  buildPersistedIntakeRecord,
  executeRunReopen,
  useProgressStream,
  formatErrorWithRemediation
} from "./useWorkspaceRuns.js";

function _resolveBoqClientMeta(boqInput, boqLocalOnly) {
  const isObj = boqInput && typeof boqInput === 'object';
  const requestedOffline = isObj && boqInput.offline !== undefined ? boqInput.offline : boqLocalOnly;
  const clientRunId = isObj && boqInput.runId
    ? boqInput.runId
    : `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return { requestedOffline, clientRunId };
}

function useRagAndEvaluationState(props) {
  const {
    evaluationEpoch, evaluationRunRef, evalRef, inputRef, searchEpoch,
    setEvalResults, setRagData, setActionError, setIsQueryingRag,
    setLogStream, setIsTaskRunning, setActiveProgress, refreshCatalogs,
    setRunActivity, setStreamConnected, setRestoringEvaluation, selectedChassisRef
  } = props;

  const completeMatrixRag = (answer, fullData, context) => completeMatrixRagForRun(
    answer, fullData, context, { evaluationEpoch, evaluationRunRef, evalRef, setEvalResults, setRagData }
  );
  const { startPoll: startMatrixRagPoll, cancelPoll: cancelMatrixRagPoll } = useMatrixRagPoller({
    evaluationEpoch, setActionError, completeMatrixRag
  });
  const elapsedIntervalRef = useRef(null);
  const stopRagElapsedTimer = () => {
    if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
  };
  useEffect(() => () => clearInterval(elapsedIntervalRef.current), []);

  const { startPoll: startSearchRagPoll, cancelPoll: cancelSearchRagPoll } = useSearchRagPoller({
    searchEpoch, setRagData, setIsQueryingRag, stopRagElapsedTimer
  });

  useProgressStream({
    setLogStream, activeRunRef: props.activeRunRef, evaluationRunRef, inputRef,
    setIsTaskRunning, setActiveProgress, refreshCatalogs, setRunActivity,
    setStreamConnected, setRestoringEvaluation, evaluationEpoch, evalRef,
    setEvalResults, setRagData, selectedChassisRef, completeMatrixRag,
    startMatrixRagPoll, setActionError
  });

  return { completeMatrixRag, startMatrixRagPoll, cancelMatrixRagPoll, elapsedIntervalRef, stopRagElapsedTimer, startSearchRagPoll, cancelSearchRagPoll };
}

export function useAppHandlers(props) {
  const {
    catalogs, currentCatObj, selectedChassis, boqLocalOnly, evalResults,
    setGlobalSearchTerm, setActiveTab, setIsRagOpen, setIsQueryingRag,
    setRagElapsedTime, setRagData, setActionError, setLogStream, setEvalResults
  } = props;

  const st = useRagAndEvaluationState(props);

  const handleSearchLocal = (query) => { setGlobalSearchTerm(query); setActiveTab('catalog'); };

  const handleSmartSearch = (query) => {
    const context = ++props.searchEpoch.current;
    void st.cancelSearchRagPoll('REPLACED_BY_NEW_QUERY');
    return executeSmartSearchRequest({
      query, selectedChassis, localOnly: boqLocalOnly, setIsRagOpen, setIsQueryingRag,
      setRagElapsedTime, setRagData, elapsedIntervalRef: st.elapsedIntervalRef,
      stopRagElapsedTimer: st.stopRagElapsedTimer, startSearchRagPoll: st.startSearchRagPoll,
      context, isCurrent: () => context === props.searchEpoch.current
    });
  };

  const handleEvaluateBoq = async (boqInput, maybeRawText) => {
    props.evaluationEpoch.current++;
    void st.cancelMatrixRagPoll('REPLACED_BY_NEW_EVALUATION');
    const { requestedOffline, clientRunId } = _resolveBoqClientMeta(boqInput, boqLocalOnly);
    props.evaluationRunRef.current = clientRunId;
    writeSessionJson(SESSION_BOQ_RUN_KEY, clientRunId);
    const initialRecord = buildPersistedIntakeRecord(boqInput, maybeRawText, null, requestedOffline, clientRunId);
    props.inputRef.current = initialRecord;
    writeSessionJson(SESSION_BOQ_INTAKE_KEY, initialRecord);
    props.evalRef.current = null;
    setActionError(null);

    const response = await executeBoqEvaluationRequest(boqInput, maybeRawText, currentCatObj, setLogStream, setEvalResults, requestedOffline, clientRunId);
    const responseError = formatErrorWithRemediation(response);
    if (responseError) { setActionError(responseError); return response; }

    const effectiveOffline = response?.effectivePolicy?.offline ?? requestedOffline;
    const persisted = buildPersistedIntakeRecord(boqInput, maybeRawText, response, effectiveOffline, response?.runId || clientRunId);
    props.inputRef.current = persisted;
    writeSessionJson(SESSION_BOQ_INTAKE_KEY, persisted);
    return response;
  };

  const handleSelectClarification = async (candidate) => {
    try {
      const res = await replayClarifiedIntake(candidate, recoverIntake(props.inputRef.current, props.evalRef.current), catalogs, handleEvaluateBoq, setActionError);
      const errMsg = formatErrorWithRemediation(res);
      if (errMsg) setActionError(errMsg);
    } catch (err) {
      if (!isAbortCancellation(err)) setActionError(err.message);
    }
  };

  const handleReopenRun = (run) => executeRunReopen(run, {
    evaluationEpoch: props.evaluationEpoch, evaluationRunRef: props.evaluationRunRef,
    evalRef: props.evalRef, inputRef: props.inputRef, setEvalResults, setRagData,
    selectedChassisRef: props.selectedChassisRef, completeMatrixRag: st.completeMatrixRag,
    startMatrixRagPoll: st.startMatrixRagPoll, setActionError, setActiveTab
  });

  const evaluatedProduct = evalResults?.chassisPrefix || evalResults?.chassisDir;
  const handleReEvaluate = evaluatedProduct ? () => replayClarifiedIntake(
    evaluatedProduct, recoverIntake(props.inputRef.current, evalResults), catalogs, handleEvaluateBoq, setActionError
  ) : undefined;

  return { handleSearchLocal, handleSmartSearch, handleEvaluateBoq, handleSelectClarification, handleReopenRun, evaluatedProduct, handleReEvaluate };
}
