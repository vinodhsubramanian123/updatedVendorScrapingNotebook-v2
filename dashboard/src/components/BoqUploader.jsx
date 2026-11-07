import React, { useState, useEffect, useRef } from 'react';
import BoqInputZone from './uploader/BoqInputZone';
import EvaluationProgressSteps from './uploader/EvaluationProgressSteps';
import PreflightPipelineAudit from './uploader/PreflightPipelineAudit';
import MultiConfigSplitModal from './uploader/MultiConfigSplitModal';
import EvaluationOutcomeCard from './uploader/EvaluationOutcomeCard';

const STANDARD_SAMPLE_LINES = [
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

const MULTI_SAMPLE_LINES = [
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

function extractLogText(log) {
  return typeof log === 'string' ? log : (log?.text || log?.action || '');
}

function isLogStreamEvaluating(logStream) {
  return logStream.some(l => {
    const text = extractLogText(l);
    return text.includes('Step ') || text.includes('Evaluating') || text.includes('Extracting');
  });
}

function computeHighestEvaluationStep(logStream, isEvaluating, evalResults) {
  if (evalResults && evalResults.status !== 'ERROR') return 10;
  if (!isEvaluating) return 0;
  let highest = 1;
  for (const log of logStream) {
    if (typeof log === 'object' && log !== null && typeof log.step === 'number') {
      highest = Math.max(highest, log.step);
    }
    const text = extractLogText(log);
    const match = text.match(/Step\s+(\d+)\/10/i);
    if (match) {
      highest = Math.max(highest, parseInt(match[1], 10));
    }
  }
  return highest;
}

function isValidFileObject(candidate) {
  return (candidate instanceof File) || Boolean(candidate && typeof candidate.name === 'string' && typeof candidate.size === 'number');
}

async function runBoqPreprocessRequest(currentFile, currentText, chassisDir) {
  let filepath = null;
  if (currentFile) {
    const formData = new FormData();
    formData.append('boqFile', currentFile);
    const uploadRes = await fetch('/api/upload-boq', { method: 'POST', body: formData });
    const uploadData = await uploadRes.json();
    filepath = uploadData.filepath;
  }

  const res = await fetch('/api/preprocess-boq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filepath, rawText: currentText, chassisDir })
  });
  return res.json();
}

function resolvePreprocessTargets(overrideFile, overrideRawText, file, rawText) {
  const currentFile = isValidFileObject(overrideFile) ? overrideFile : file;
  const currentText = (typeof overrideRawText === 'string') ? overrideRawText : rawText;
  const hasPayload = Boolean(currentFile || currentText?.trim());
  return { currentFile, currentText, hasPayload };
}

function resolveDirectEvalFilePayload(file, preflightData) {
  if (file) return file;
  if (preflightData?.filepath) return { filepath: preflightData.filepath };
  return null;
}

function formatVariationRawText(variation) {
  return (variation.items || [])
    .map(it => `${it.quantity || 1}x ${it.sku} ${it.description || ''}`)
    .join('\n');
}

function PreprocessingSkeletonCard() {
  return (
    <div className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 bg-slate-200 rounded"></div>
        <div className="h-6 w-28 bg-slate-200 rounded-full"></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-3 bg-slate-100/70 rounded-xl space-y-2">
            <div className="h-2.5 w-16 bg-slate-200 rounded"></div>
            <div className="h-5 w-20 bg-slate-300 rounded"></div>
          </div>
        ))}
      </div>
      <div className="text-center text-xs text-slate-500 font-medium pt-1">
        Parsing BOQ structure, SKU hierarchies, and configuration clusters...
      </div>
    </div>
  );
}

export default function BoqUploader({
  onEvaluateBoq,
  evalResults,
  logStream = [],
  chassisDir,
  isTaskRunning = false,
  onOpenMatrix,
  onOpenReconciliation,
  onOpenTopology
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evalError, setEvalError] = useState(null);

  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preflightData, setPreflightData] = useState(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [confirmedConfigSplits, setConfirmedConfigSplits] = useState(new Set());
  const logsEndRef = useRef(null);
  const outcomeRef = useRef(null);

  const isEvaluating = isSubmitting || Boolean(isTaskRunning && isLogStreamEvaluating(logStream));
  const currentStep = React.useMemo(
    () => computeHighestEvaluationStep(logStream, isEvaluating, evalResults),
    [logStream, isEvaluating, evalResults]
  );

  useEffect(() => {
    if (isEvaluating) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logStream, isEvaluating]);

  useEffect(() => {
    if (!evalResults) return;
    setIsSubmitting(false);
    outcomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [evalResults]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handlePreprocess = async (overrideFile = null, overrideRawText = null) => {
    const { currentFile, currentText, hasPayload } = resolvePreprocessTargets(overrideFile, overrideRawText, file, rawText);
    if (!hasPayload) return;
    setIsPreprocessing(true);
    setEvalError(null);

    try {
      const data = await runBoqPreprocessRequest(currentFile, currentText, chassisDir);
      if (data.status === 'SUCCESS') {
        setPreflightData(data.preflightData);
      } else {
        setEvalError(data.error || 'Failed to preprocess BOQ');
      }
    } catch (err) {
      setEvalError(err.message);
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleConfirmSplit = async (configId, splitReason) => {
    try {
      const res = await fetch('/api/confirm-preflight-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId, splitReason, chassisDir })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setConfirmedConfigSplits(prev => new Set([...prev, configId]));
      }
    } catch (e) {
      console.warn('Sample load error:', e);
    }
  };

  const handleDirectEvaluate = async () => {
    const filePayload = resolveDirectEvalFilePayload(file, preflightData);
    if (!filePayload && !rawText.trim()) return;
    setIsSubmitting(true);
    setEvalError(null);
    try {
      await onEvaluateBoq(filePayload, rawText);
    } catch (err) {
      setEvalError(err.message);
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

  const handleLoadSampleBoq = (type) => {
    setRawText(type === 'standard' ? STANDARD_SAMPLE_LINES : MULTI_SAMPLE_LINES);
    setFile(null);
  };

  return (
    <div className="space-y-6">
      <BoqInputZone
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        file={file}
        setFile={setFile}
        rawText={rawText}
        setRawText={setRawText}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
        onPreprocess={handlePreprocess}
        isPreprocessing={isPreprocessing}
        onDirectEvaluate={handleDirectEvaluate}
        isEvaluating={isEvaluating}
        onLoadSampleBoq={handleLoadSampleBoq}
      />

      {evalError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <strong>Evaluation Error:</strong> {evalError}
        </div>
      )}

      {isPreprocessing && <PreprocessingSkeletonCard />}

      <PreflightPipelineAudit
        preflightData={preflightData}
        onProceedToEvaluate={handleDirectEvaluate}
        onOpenSplitModal={() => setIsSplitModalOpen(true)}
        onOpenTopology={onOpenTopology ? () => onOpenTopology(preflightData) : undefined}
        isEvaluating={isEvaluating}
      />

      <EvaluationProgressSteps
        isEvaluating={isEvaluating}
        currentStep={currentStep}
        logStream={logStream}
        logsEndRef={logsEndRef}
      />

      <EvaluationOutcomeCard
        evalResults={evalResults}
        outcomeRef={outcomeRef}
        onOpenTopology={onOpenTopology}
        onOpenReconciliation={onOpenReconciliation}
        onOpenMatrix={onOpenMatrix}
      />

      <MultiConfigSplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        preflightData={preflightData}
        confirmedSplits={confirmedConfigSplits}
        onConfirmSplit={handleConfirmSplit}
        onEvaluateSplit={handleEvaluateVariation}
      />
    </div>
  );
}
