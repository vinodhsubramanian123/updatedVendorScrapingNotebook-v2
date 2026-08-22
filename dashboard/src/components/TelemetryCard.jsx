import React, { useState } from 'react';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';

import { useTelemetryData } from './telemetry/hooks/useTelemetryData';
import TelemetryHeader from './telemetry/sections/TelemetryHeader';
import KpiMetricsGrid from './telemetry/sections/KpiMetricsGrid';
import NlmHealthTelemetry from './telemetry/sections/NlmHealthTelemetry';
import AccuracyProfilerPanel from './telemetry/sections/AccuracyProfilerPanel';
import RagPlayground from './telemetry/sections/RagPlayground';
import EvaluationHistoryLedger from './telemetry/sections/ledgers/EvaluationHistoryLedger';
import NlmConsultationLedger from './telemetry/sections/ledgers/NlmConsultationLedger';
import CleansingAuditLedger from './telemetry/sections/ledgers/CleansingAuditLedger';
import OcrAuditLedger from './telemetry/sections/ledgers/OcrAuditLedger';

import {
  ViolationsModal,
  LearnedRulesModal,
  EvaluationsModal,
  ConfidenceModal,
  DurationModal,
  ExportsModal,
  AccuracyModal,
  AdversarialModal,
  DomainBreakdownModal,
  PipelineProfilerModal
} from './telemetry/modals';

export default function TelemetryCard({ initialTelemetry, telemetry: propTelemetry } = {}) {
  const {
    telemetry,
    nlmMetrics,
    nlmHealth,
    loading,
    fetchError,
    fetchTelemetry
  } = useTelemetryData(initialTelemetry, propTelemetry);

  // Modal display states
  const [activeModal, setActiveModal] = useState(null);

  if (fetchError && !telemetry) {
    return (
      <div className="glass-card p-6 text-center text-rose-600 border-l-4 border-l-rose-500 space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold">Telemetry Bridge Error</p>
        <p className="text-xs text-slate-500">{fetchError}</p>
        <button onClick={fetchTelemetry} className="btn-primary text-xs mx-auto inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching Telemetry
        </button>
      </div>
    );
  }

  if (!telemetry) {
    return (
      <div className="glass-card p-6 text-center text-slate-400">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
        <p className="text-xs font-semibold text-slate-600">Loading Telemetry & Observability Metrics...</p>
      </div>
    );
  }

  const history = telemetry.history || [];

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        {/* Header & KPI Summary Cards */}
        <TelemetryHeader onRefresh={fetchTelemetry} loading={loading} />

        {/* 6 Interactive KPI Metrics Grid */}
        <KpiMetricsGrid
          telemetry={telemetry}
          history={history}
          onOpenEvaluations={() => setActiveModal('evaluations')}
          onOpenConfidence={() => setActiveModal('confidence')}
          onOpenDeltas={() => setActiveModal('deltas')}
          onOpenViolations={() => setActiveModal('violations')}
          onOpenDuration={() => setActiveModal('duration')}
          onOpenExports={() => setActiveModal('exports')}
        />

        {/* NLM Health & RAG Telemetry Section */}
        <NlmHealthTelemetry nlmHealth={nlmHealth} nlmMetrics={nlmMetrics} />

        {/* Evals Accuracy & Stage Profiler Panel */}
        <AccuracyProfilerPanel
          telemetry={telemetry}
          onOpenAccuracy={() => setActiveModal('accuracy')}
          onOpenAdversarial={() => setActiveModal('adversarial')}
          onOpenDomain={() => setActiveModal('domain')}
          onOpenProfiler={() => setActiveModal('profiler')}
        />

        {/* Gemini NotebookLM RAG Playground */}
        <RagPlayground />

        {/* 4 Diagnostic Ledgers */}
        <EvaluationHistoryLedger history={history} />
        <NlmConsultationLedger nlmMetrics={nlmMetrics} />
        <CleansingAuditLedger cleansingLogs={telemetry.cleansingAuditLogs || []} />
        <OcrAuditLedger ocrLogs={telemetry.ocrAuditLogs || []} />
      </div>

      {/* 10 Drill-Down Diagnostic Modals */}
      <ViolationsModal
        isOpen={activeModal === 'violations'}
        onClose={() => setActiveModal(null)}
        history={history}
      />
      <LearnedRulesModal
        isOpen={activeModal === 'deltas'}
        onClose={() => setActiveModal(null)}
        telemetry={telemetry}
      />
      <EvaluationsModal
        isOpen={activeModal === 'evaluations'}
        onClose={() => setActiveModal(null)}
        history={history}
        telemetry={telemetry}
      />
      <ConfidenceModal
        isOpen={activeModal === 'confidence'}
        onClose={() => setActiveModal(null)}
        history={history}
        telemetry={telemetry}
      />
      <DurationModal
        isOpen={activeModal === 'duration'}
        onClose={() => setActiveModal(null)}
        history={history}
      />
      <ExportsModal
        isOpen={activeModal === 'exports'}
        onClose={() => setActiveModal(null)}
      />
      <AccuracyModal
        isOpen={activeModal === 'accuracy'}
        onClose={() => setActiveModal(null)}
      />
      <AdversarialModal
        isOpen={activeModal === 'adversarial'}
        onClose={() => setActiveModal(null)}
      />
      <DomainBreakdownModal
        isOpen={activeModal === 'domain'}
        onClose={() => setActiveModal(null)}
      />
      <PipelineProfilerModal
        isOpen={activeModal === 'profiler'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
