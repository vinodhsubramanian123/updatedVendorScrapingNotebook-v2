import { useState, useEffect, useRef } from 'react';
import { postJson, uploadBoqFile } from '../services/api.js';

export const STANDARD_SAMPLE_LINES = [
  '1x P73282-B21 HPE ProLiant DL380 Gen12 8SFF CTO Server',
  '2x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor',
  '16x P64707-B21 HPE 64GB 2Rx4 DDR5-5600 Registered Memory',
  '1x P47777-B21 Broadcom MegaRAID MR416i-p Gen11 Storage Controller',
  '1x P01366-B21 HPE 96W Smart Storage Battery (up to 20 Devices)',
  '4x P50239-B21 HPE 3.84TB NVMe Gen4 Read Intensive SFF SSD',
  '2x P48818-B21 HPE 800W Flex Slot Platinum Hot Plug Power Supply',
  '1x P48820-B21 HPE ProLiant DL380 Gen12 High Performance Fan Kit',
  '1x P76453-B21 HPE ProLiant DL380 Gen12 Box 1/2 Storage Cable Kit',
  '1x P10180-B21 Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter',
  '1x H7K80E HPE 3 Year Tech Care Essential Service'
].join('\n');

export const MULTI_SAMPLE_LINES = [
  '# Server Cluster Node A (High-Memory Analytics)',
  '1x P73282-B21 HPE ProLiant DL380 Gen12 8SFF CTO Server',
  '2x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor',
  '32x P64707-B21 HPE 64GB 2Rx4 DDR5-5600 Registered Memory',
  '2x P48818-B21 HPE 800W Flex Slot Platinum Hot Plug Power Supply',
  '',
  '# Server Cluster Node B (Edge GPU Inferencing)',
  '1x P52534-B21 HPE ProLiant DL360 Gen11 CTO Server',
  '1x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor',
  '8x P64707-B21 HPE 64GB 2Rx4 DDR5-5600 Registered Memory',
  '1x P48818-B21 HPE 800W Flex Slot Platinum Hot Plug Power Supply'
].join('\n');

function isValidFileObject(candidate) {
  if (candidate instanceof File) return true;
  if (!candidate || typeof candidate !== 'object') return false;
  return typeof candidate.name === 'string' && typeof candidate.size === 'number';
}

async function runBoqPreprocessRequest(currentFile, currentText, chassisDir, offline = false) {
  let filepath = null;
  if (currentFile) {
    const uploadData = await uploadBoqFile(currentFile);
    filepath = uploadData.filepath;
  }
  return postJson('/api/preprocess-boq', { filepath, rawText: currentText, chassisDir, offline });
}

function resolvePreprocessTargets(overrideFile, overrideRawText, file, rawText) {
  const currentFile = isValidFileObject(overrideFile) ? overrideFile : file;
  const currentText = typeof overrideRawText === 'string' ? overrideRawText : rawText;
  return { currentFile, currentText, hasPayload: Boolean(currentFile || currentText?.trim()) };
}

function resolveDirectEvalFilePayload(file, preflightData) {
  if (file) return file;
  return preflightData?.filepath ? { filepath: preflightData.filepath } : null;
}

function formatVariationRawText(variation) {
  return (variation.items || []).map(it => `${it.quantity}x ${it.sku} ${it.description || ''}`).join('\n');
}

function formatUploaderErrorMessage(baseMessage, remediationAction, fallback = 'Request failed') {
  const text = String(baseMessage || fallback);
  if (!remediationAction || text.includes(remediationAction)) return text;
  return `${text} ${remediationAction}`;
}

function useOutcomeScroll(evalResults, outcomeRef, setIsSubmitting) {
  const prevRef = useRef(evalResults);
  useEffect(() => {
    if (!evalResults) { prevRef.current = null; return; }
    setIsSubmitting(false);
    if (prevRef.current !== evalResults) {
      prevRef.current = evalResults;
      outcomeRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [evalResults, outcomeRef, setIsSubmitting]);
}

function useUploaderLogScroll(logStream, isEvaluating, logsEndRef) {
  useEffect(() => {
    const logArea = logsEndRef.current?.parentElement;
    if (isEvaluating && logArea) logArea.scrollTop = logArea.scrollHeight;
  }, [logStream, isEvaluating, logsEndRef]);
}

function useBoqActions({
  file, rawText, chassisDir, effectiveLocalOnly, preflightData, intakeRevision,
  onEvaluateBoq, setPreflightData, setConfirmedConfigSplits, setIsSplitModalOpen,
  setIsPreprocessing, setIsSubmitting, setEvalError, setRawText, setFile
}) {
  const handlePreprocess = async (overrideFile = null, overrideRawText = null) => {
    const revision = intakeRevision.current;
    const { currentFile, currentText, hasPayload } = resolvePreprocessTargets(overrideFile, overrideRawText, file, rawText);
    if (!hasPayload) return;
    setIsPreprocessing(true);
    setEvalError(null);
    try {
      const data = await runBoqPreprocessRequest(currentFile, currentText, chassisDir, effectiveLocalOnly);
      if (revision !== intakeRevision.current) return;
      if (data.status === 'SUCCESS') setPreflightData(data.preflightData);
      else setEvalError(formatUploaderErrorMessage(data.error, data.remediationAction, 'Failed to preprocess BOQ'));
    } catch (err) {
      if (revision === intakeRevision.current) setEvalError(formatUploaderErrorMessage(err.message, err.remediationAction));
    } finally {
      if (revision === intakeRevision.current) setIsPreprocessing(false);
    }
  };

  const handleConfirmSplit = async (configId, splitReason) => {
    const revision = intakeRevision.current;
    try {
      const data = await postJson('/api/confirm-preflight-split', { configId, splitReason, chassisDir });
      if (revision === intakeRevision.current && data.status === 'SUCCESS') {
        setConfirmedConfigSplits(prev => new Set([...prev, configId]));
      }
    } catch (err) {
      if (revision === intakeRevision.current) setEvalError(err.message);
    }
  };

  const handleDirectEvaluate = async () => {
    const filePayload = resolveDirectEvalFilePayload(file, preflightData);
    if (!filePayload && !rawText.trim()) return;
    setIsSubmitting(true);
    setEvalError(null);
    try {
      const res = await onEvaluateBoq(filePayload, rawText);
      if (res?.error) {
        setEvalError(formatUploaderErrorMessage(res.error, res.remediationAction));
        setIsSubmitting(false);
      }
    } catch (err) {
      setEvalError(formatUploaderErrorMessage(err.message, err.remediationAction));
      setIsSubmitting(false);
    }
  };

  const handleEvaluateVariation = (variation) => {
    setIsSplitModalOpen(false);
    const varText = formatVariationRawText(variation);
    setRawText(varText);
    setFile(null);
    setIsSubmitting(true);
    setEvalError(null);
    onEvaluateBoq(null, varText);
  };

  return { handlePreprocess, handleConfirmSplit, handleDirectEvaluate, handleEvaluateVariation };
}

export function useBoqUploader({
  onEvaluateBoq,
  evalResults,
  logStream = [],
  chassisDir,
  activeProgress,
  localOnly,
  serverOffline,
  onLocalOnlyChange
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evalError, setEvalError] = useState(null);
  const [internalLocalOnly, setInternalLocalOnly] = useState(false);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preflightData, setPreflightData] = useState(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [confirmedConfigSplits, setConfirmedConfigSplits] = useState(new Set());

  const logsEndRef = useRef(null);
  const outcomeRef = useRef(null);
  const intakeRevision = useRef(0);

  const effectiveLocalOnly = Boolean(serverOffline || (localOnly ?? internalLocalOnly));
  const handleLocalOnlyChange = onLocalOnlyChange || setInternalLocalOnly;
  const isRunningEvaluation = activeProgress?.task === 'EVAL_BOQ';
  const isEvaluating = isSubmitting || isRunningEvaluation;

  useEffect(() => {
    intakeRevision.current++;
    setPreflightData(null);
    setConfirmedConfigSplits(new Set());
    setIsSplitModalOpen(false);
    setIsPreprocessing(false);
  }, [file, rawText, chassisDir]);

  useUploaderLogScroll(logStream, isEvaluating, logsEndRef);
  useOutcomeScroll(evalResults, outcomeRef, setIsSubmitting);

  const actions = useBoqActions({
    file, rawText, chassisDir, effectiveLocalOnly, preflightData, intakeRevision,
    onEvaluateBoq, setPreflightData, setConfirmedConfigSplits, setIsSplitModalOpen,
    setIsPreprocessing, setIsSubmitting, setEvalError, setRawText, setFile
  });

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); };
  const handleLoadSampleBoq = (type) => {
    setRawText(type === 'standard' ? STANDARD_SAMPLE_LINES : MULTI_SAMPLE_LINES);
    setFile(null);
  };

  return {
    isDragging, setIsDragging, file, setFile, rawText, setRawText,
    effectiveLocalOnly, handleLocalOnlyChange, isPreprocessing, preflightData,
    isSplitModalOpen, setIsSplitModalOpen, confirmedConfigSplits,
    isRunningEvaluation, isEvaluating, evalError, logsEndRef, outcomeRef,
    ...actions, handleDrop, handleFileChange, handleLoadSampleBoq
  };
}
