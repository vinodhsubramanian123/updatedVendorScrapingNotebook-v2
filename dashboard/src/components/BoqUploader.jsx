import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, AlertTriangle, ArrowRight, Network } from 'lucide-react';
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
      if (outcomeRef.current) {
        outcomeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
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
    if (!file && !rawText.trim() && !preflightData?.filepath) return;
    setIsSubmitting(true);
    setEvalError(null);
    try {
      const filePayload = file || (preflightData?.filepath ? { filepath: preflightData.filepath } : null);
      await onEvaluateBoq(filePayload, rawText);
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

      {isPreprocessing && (
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
      )}

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

      {evalResults && (
        <div ref={outcomeRef} className="glass-card p-6 border border-slate-200 shadow-sm rounded-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`p-2.5 rounded-xl border ${
                evalResults.criticalViolationsCount === 0 || evalResults.isMathClean !== false
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                {evalResults.criticalViolationsCount === 0 || evalResults.isMathClean !== false ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </span>
              <div>
                <span className="badge badge-blue mb-1">BOQ Evaluation Outcome</span>
                <h3 className="font-bold text-slate-900 text-base">
                  {evalResults.criticalViolationsCount === 0 || evalResults.isMathClean !== false
                    ? 'Certified Buildable Configuration'
                    : 'Physical Constraint Violations Flagged'}
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 font-medium">Confidence Score:</span>
              <p className="font-bold text-emerald-700 text-lg font-mono">
                {Math.round((evalResults.confidence?.score ?? evalResults.confidenceScore ?? 0.95) * (evalResults.confidenceScore > 1 ? 1 : 100))}%
              </p>
            </div>
          </div>

          {/* NotebookLM Grounding & Dual-Brain Status Banner */}
          {evalResults.notebookLmStatus?.isFallback && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Local Verified Fallback Active:</span> NotebookLM Cloud was not consulted ({evalResults.notebookLmStatus.fallbackReason || 'Timeout or Local Mode'}). Rules and physical constraints evaluated via deterministic rule engine.
              </div>
            </div>
          )}
          {evalResults.notebookLmStatus?.isCloudGrounded && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Cloud Grounded via NotebookLM:</span> Live QuickSpecs notebook verified ({evalResults.notebookLmStatus.citationsCount || 0} citations).
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 flex-wrap">
            {onOpenTopology && (
              <button
                type="button"
                onClick={onOpenTopology}
                className="btn-secondary text-xs flex items-center gap-1.5 text-emerald-800 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100"
              >
                <Network className="w-3.5 h-3.5 text-emerald-600" />
                Visual BOQ Topology
              </button>
            )}
            {onOpenReconciliation && (
              <button
                type="button"
                onClick={onOpenReconciliation}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                Reconcile with Partner Quote
              </button>
            )}
            {onOpenMatrix && (
              <button
                type="button"
                onClick={onOpenMatrix}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
              >
                View 5-Tier Resolution Matrix
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

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
