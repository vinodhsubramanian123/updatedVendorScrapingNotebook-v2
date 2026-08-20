import React, { useState, useEffect, useRef } from 'react';
import BoqInputZone from './uploader/BoqInputZone';
import EvaluationProgressSteps from './uploader/EvaluationProgressSteps';
import PreflightPipelineAudit from './uploader/PreflightPipelineAudit';
import MultiConfigSplitModal from './uploader/MultiConfigSplitModal';

export default function BoqUploader({
  onEvaluateBoq,
  evalResults,
  logStream = [],
  chassisDir,
  isTaskRunning = false,
  _onOpenMatrix,
  _onOpenReconciliation
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

  const isEvaluating = isSubmitting || (isTaskRunning && logStream.some(l => {
    const text = typeof l === 'string' ? l : (l?.text || l?.action || '');
    return text.includes('Step ') || text.includes('Evaluating') || text.includes('Extracting');
  }));

  const currentStep = React.useMemo(() => {
    if (evalResults && evalResults.status !== 'ERROR') return 10;
    if (!isEvaluating) return 0;
    let highest = 1;
    for (const log of logStream) {
      if (typeof log === 'object' && log !== null && typeof log.step === 'number') {
        highest = Math.max(highest, log.step);
      }
      const text = typeof log === 'string' ? log : (log?.text || log?.action || '');
      const match = text.match(/Step\s+(\d+)\/10/i);
      if (match) {
        highest = Math.max(highest, parseInt(match[1], 10));
      }
    }
    return highest;
  }, [logStream, isEvaluating, evalResults]);

  useEffect(() => {
    if (isEvaluating && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logStream, isEvaluating]);

  useEffect(() => {
    if (evalResults) {
      setIsSubmitting(false);
    }
  }, [evalResults]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreprocess = async (overrideFile = null, overrideRawText = null) => {
    const isFileObject = (overrideFile instanceof File) || (overrideFile && typeof overrideFile.name === 'string' && typeof overrideFile.size === 'number');
    const currentFile = isFileObject ? overrideFile : file;
    const currentText = (typeof overrideRawText === 'string') ? overrideRawText : rawText;

    if (!currentFile && !currentText?.trim()) return;
    setIsPreprocessing(true);
    setEvalError(null);

    try {
      let filepath = null;
      if (currentFile) {
        const formData = new FormData();
        formData.append('boqFile', currentFile);
        const uploadRes = await fetch('/api/upload-boq', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        filepath = uploadData.filepath;
      }

      const res = await fetch('/api/preprocess-boq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath, rawText: currentText, chassisDir })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setPreflightData(data.preflightData);
      } else {
        setEvalError(data.error || 'Failed to preprocess BOQ');
      }
    } catch (err) {
      setEvalError(err.message || 'Failed to preprocess BOQ');
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleConfirmSplit = async (configId, splitReason) => {
    try {
      const res = await fetch('/api/confirm-preflight-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId,
          splitReason,
          chassis: preflightData?.detectedChassis?.id || 'DL380_Gen12_SFF'
        })
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
    if (!file && !rawText.trim()) return;
    setIsSubmitting(true);
    setEvalError(null);
    try {
      await onEvaluateBoq(file, rawText);
    } catch (err) {
      setEvalError(err.message || 'Evaluation failed');
      setIsSubmitting(false);
    }
  };

  const handleEvaluateVariation = (variation) => {
    setIsSplitModalOpen(false);
    const varText = (variation.items || []).map(it => `${it.quantity || 1}x ${it.sku} ${it.description || ''}`).join('\n');
    setRawText(varText);
    setFile(null);
    setIsSubmitting(true);
    setEvalError(null);
    onEvaluateBoq(null, varText);
  };

  const handleLoadSampleBoq = (type) => {
    if (type === 'standard') {
      const sample = [
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
      setRawText(sample);
      setFile(null);
    } else {
      const multi = [
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
      setRawText(multi);
      setFile(null);
    }
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

      <PreflightPipelineAudit
        preflightData={preflightData}
        onProceedToEvaluate={handleDirectEvaluate}
        onOpenSplitModal={() => setIsSplitModalOpen(true)}
        isEvaluating={isEvaluating}
      />

      <EvaluationProgressSteps
        isEvaluating={isEvaluating}
        currentStep={currentStep}
        logStream={logStream}
        logsEndRef={logsEndRef}
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
