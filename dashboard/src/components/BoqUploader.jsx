import React from 'react';
import BoqInputZone from './uploader/BoqInputZone';
import EvaluationProgressSteps from './uploader/EvaluationProgressSteps';
import PreflightPipelineAudit from './uploader/PreflightPipelineAudit';
import MultiConfigSplitModal from './uploader/MultiConfigSplitModal';
import EvaluationOutcomeCard from './uploader/EvaluationOutcomeCard';
import { useBoqUploader } from '../hooks/useBoqUploader.js';

function PreprocessingSkeletonCard() {
  return (
    <div className="glass-card p-6 rounded-xl space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 skeleton rounded"></div>
        <div className="h-6 w-28 skeleton rounded-full"></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-3 kpi-tile space-y-2">
            <div className="h-2.5 w-16 skeleton rounded"></div>
            <div className="h-5 w-20 skeleton rounded"></div>
          </div>
        ))}
      </div>
      <div className="text-center text-xs text-slate-500 font-medium pt-1">
        Parsing BOQ structure, SKU hierarchies, and configuration clusters...
      </div>
    </div>
  );
}

function BoqIntakeSection({ serverOffline, uploader }) {
  if (serverOffline === null) {
    return <p role="status" className="text-xs text-slate-600">Reading server evaluation policy…</p>;
  }
  return (
    <BoqInputZone
      isDragging={uploader.isDragging}
      setIsDragging={uploader.setIsDragging}
      file={uploader.file}
      setFile={uploader.setFile}
      rawText={uploader.rawText}
      setRawText={uploader.setRawText}
      onDrop={uploader.handleDrop}
      onFileChange={uploader.handleFileChange}
      onPreprocess={uploader.handlePreprocess}
      isPreprocessing={uploader.isPreprocessing}
      onDirectEvaluate={uploader.handleDirectEvaluate}
      isEvaluating={uploader.isEvaluating}
      onLoadSampleBoq={uploader.handleLoadSampleBoq}
      localOnly={uploader.effectiveLocalOnly}
      serverOffline={serverOffline}
      onLocalOnlyChange={uploader.handleLocalOnlyChange}
    />
  );
}

export default function BoqUploader({
  onEvaluateBoq,
  evalResults,
  logStream = [],
  chassisDir,
  activeProgress,
  onOpenMatrix,
  onOpenReconciliation,
  onOpenTopology,
  localOnly,
  serverOffline,
  onLocalOnlyChange
}) {
  const uploader = useBoqUploader({
    onEvaluateBoq, evalResults, logStream, chassisDir, activeProgress, localOnly, serverOffline, onLocalOnlyChange
  });
  const visibleLogs = (activeProgress?.qualifications || uploader.isRunningEvaluation) ? logStream : [];

  return (
    <div className="space-y-6">
      <BoqIntakeSection serverOffline={serverOffline} uploader={uploader} />

      {uploader.evalError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <strong>Evaluation Error:</strong> {uploader.evalError}
        </div>
      )}

      {uploader.isPreprocessing && <PreprocessingSkeletonCard />}

      <PreflightPipelineAudit
        preflightData={uploader.preflightData}
        onProceedToEvaluate={uploader.handleDirectEvaluate}
        onOpenSplitModal={() => uploader.setIsSplitModalOpen(true)}
        onOpenTopology={onOpenTopology ? () => onOpenTopology(uploader.preflightData) : undefined}
        isEvaluating={uploader.isEvaluating}
      />

      <EvaluationProgressSteps
        isEvaluating={uploader.isEvaluating}
        currentStep={uploader.isRunningEvaluation ? activeProgress.currentStep : undefined}
        action={activeProgress?.action}
        qualifications={activeProgress?.qualifications}
        logStream={visibleLogs}
        logsEndRef={uploader.logsEndRef}
      />

      <EvaluationOutcomeCard
        evalResults={evalResults}
        outcomeRef={uploader.outcomeRef}
        onOpenTopology={onOpenTopology}
        onOpenReconciliation={onOpenReconciliation}
        onOpenMatrix={onOpenMatrix}
      />

      <MultiConfigSplitModal
        isOpen={uploader.isSplitModalOpen}
        onClose={() => uploader.setIsSplitModalOpen(false)}
        preflightData={uploader.preflightData}
        confirmedSplits={uploader.confirmedConfigSplits}
        onConfirmSplit={uploader.handleConfirmSplit}
        onEvaluateSplit={uploader.handleEvaluateVariation}
      />
    </div>
  );
}
