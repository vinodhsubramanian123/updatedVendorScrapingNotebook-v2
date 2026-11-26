import { postJson, uploadBoqFile } from "./api.js";

const IMMEDIATE_RAG_STATUSES = ['COMPLETED', 'CLOUD_VERIFIED', 'LOCAL_FALLBACK'];
export function isBoqFileInput(boqInput) {
  if (boqInput instanceof File) return true;
  if (!boqInput || typeof boqInput !== 'object') return false;
  return typeof boqInput.name === 'string' && typeof boqInput.size === 'number';
}

function isEventObject(val) {
  return Boolean(val && typeof val === 'object' && (val.nativeEvent || typeof val.preventDefault === 'function'));
}

export const STANDARD_SAMPLE_TEXT = [
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

export async function buildBoqRequestPayload(boqInput, maybeRawText) {
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

export function dispatchBackgroundMatrixRagQuery(raw, chassisId, context, complete, startMatrixRagPoll, isCurrent, onError) {
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

export function buildGroundedRagState(normalised) {
  if (normalised.ragData) return normalised.ragData;
  const citeCount = normalised.notebookLmStatus?.citationsCount;
  return {
    answer: normalised.ragAnswer,
    citations: [],
    citationsCount: citeCount ?? null,
    source: normalised.notebookLmStatus?.source || 'UNKNOWN'
  };
}

export function triggerMatrixRecomputeIfApplicable(prev, fullData, fallbackChassis) {
  if (!prev?.items || prev.items.length === 0) return;
  return postJson('/api/recompute-matrix', {
      runId: prev.runId,
      evalData: prev,
      ragResult: fullData,
      chassisDir: prev.chassisDir || fallbackChassis
  }).catch(err => console.warn('[App.jsx] Recompute matrix advisory:', err));
}

export async function executeSmartSearchRequest({
  query,
  selectedChassis,
  localOnly = false,
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

export const SESSION_BOQ_RUN_KEY = 'boq.ownedRunId';
export const SESSION_BOQ_LAST_COMPLETED_KEY = 'boq.lastCompletedRunId';
export const SESSION_BOQ_INTAKE_KEY = 'boq.intakeDescriptor';

export function readSessionValue(key) {
  try { return typeof window !== 'undefined' ? window.sessionStorage?.getItem(key) || null : null; }
  catch { return null; }
}

export function readSessionJson(key) {
  try {
    const raw = readSessionValue(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeSessionJson(key, value) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (value === null || value === undefined) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {}
}

export async function executeBoqEvaluationRequest(boqInput, maybeRawText, currentCat, setLogStream, setEvalResults, localOnly = false, runId = null) {
  setLogStream([]);
  setEvalResults(null);
  try {
    const payload = await buildBoqRequestPayload(boqInput, maybeRawText);
    if (payload.offline === undefined) payload.offline = localOnly;
    if (runId && !payload.runId) payload.runId = runId;
    const explicitProduct = payload.chassisDir || payload.candidateReference?.chassisDir || payload.candidateReference?.product || payload.chassisName;
    const chassisDir = explicitProduct || (!payload.autoScope && (currentCat?.chassisDir || currentCat?.id)) || undefined;
    const chassisName = payload.chassisName || payload.candidateReference?.product || (explicitProduct || payload.autoScope ? undefined : currentCat?.id);
    const data = await postJson('/api/eval-boq', { ...payload, chassisDir, ...(chassisName ? { chassisName } : {}) });
    return { ...data, originalPayload: payload };
  } catch (err) {
    const errResult = { status: 'ERROR', code: err.code, error: err.message, remediationAction: err.remediationAction };
    setEvalResults(errResult);
    return { error: err.message, remediationAction: err.remediationAction, code: err.code, status: err.status };
  }
}
