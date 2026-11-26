import CatalogProductSwitcher from "../catalog/CatalogProductSwitcher.jsx";
import React from "react";
import CatalogExplorer from "../CatalogExplorer";
import ScraperTriggerCard from "../ScraperTriggerCard";
import ResolutionMatrix from "../ResolutionMatrix";
import ArtifactInspector from "../ArtifactInspector";
import TelemetryCard from "../TelemetryCard";
import AmbiguityInbox from "../AmbiguityInbox";
import MacroOrchestratorFlow from "../MacroOrchestratorFlow";
import ChassisSyncSummaryView from "../ChassisSyncSummaryView";
import PartnerReconciliationView from "../PartnerReconciliationView";
import PortfolioManifestWorkspace from "../portfolio/PortfolioManifestWorkspace";
import EvaluationProgressSteps from "../uploader/EvaluationProgressSteps";
import { LifecycleAlternatives } from "../uploader/EvaluationOutcomeCard";

export function WorkspaceEvaluationProgress({ uploaderOpen, progress, logStream }) {
  if (uploaderOpen || (progress?.task !== 'EVAL_BOQ' && !progress?.qualifications)) return null;
  return (
    <EvaluationProgressSteps
      isEvaluating={progress.task === 'EVAL_BOQ'}
      currentStep={progress.currentStep}
      action={progress.action}
      qualifications={progress.qualifications}
      logStream={logStream}
    />
  );
}
import { STANDARD_SAMPLE_TEXT } from "../../services/workspaceRequests.js";

export function EvaluationWorkspaceDetails({ visible, uploaderOpen, evalResults, evaluatedProduct, onReEvaluate }) {
  if (!visible) return null;
  const showDetails = !uploaderOpen && evalResults && !evalResults.clarificationRequired;
  return (
    <>
      <DualBrainBadgesBar evalResults={evalResults} />
      {showDetails && (
        <>
          <AmbiguityInbox evalResults={evalResults} chassisContext={evaluatedProduct || 'Unknown Chassis'} onReEvaluate={onReEvaluate} />
          {evalResults.lifecycleRecommendations?.length > 0 && (
            <div className="glass-card p-4">
              <LifecycleAlternatives recommendations={evalResults.lifecycleRecommendations} />
            </div>
          )}
        </>
      )}
    </>
  );
}
function DualBrainBadgesBar({ evalResults }) {
  if (!evalResults?.dualBrainBadges?.length || evalResults?.clarificationRequired) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-xs animate-tab-enter">
      <span className="text-xs font-semibold text-slate-500 mr-1">Evaluation baseline checks</span>
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

function PipelineWorkspaceView({
  selectedChassis,
  catalogData,
  setSelectedChassis,
  setActiveTab,
  isTaskRunning,
  onTriggerSyncKnowledge,
  opsProduct,
  setOpsProduct,
  catalogs,
  logStream,
  runActivity,
  onTriggerScrape,
  onTriggerRebuild,
  onTriggerDownloadPdf,
  onTriggerKillTask,
  onTriggerNavigate,
  onReopenRun
}) {
  return (
    <div key="pipeline" className="space-y-6 animate-tab-enter">
      <ChassisSyncSummaryView
        selectedChassis={selectedChassis}
        catalogData={catalogData}
        onSelectChassis={setSelectedChassis}
        onNavigateTab={setActiveTab}
        isTaskRunning={isTaskRunning}
        onTriggerSyncKnowledge={onTriggerSyncKnowledge}
      />
      <div className="surface-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <label htmlFor="pipeline-target-product" className="block text-sm font-semibold text-slate-900">
            Pipeline target product
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a product for live OCA scraping, portal navigation, or QuickSpecs downloads.
          </p>
        </div>
        <select
          id="pipeline-target-product"
          className="w-full sm:w-auto sm:min-w-[240px] max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          value={opsProduct}
          onChange={event => setOpsProduct(event.target.value)}
        >
          <option value="">Choose a product</option>
          {catalogs.map(catalog => <option key={catalog.id} value={catalog.id}>{catalog.chassis || catalog.id}</option>)}
        </select>
      </div>
      <ScraperTriggerCard
        logStream={logStream}
        isTaskRunning={isTaskRunning}
        runActivity={runActivity}
        targetRequired={!opsProduct}
        onTriggerScrape={onTriggerScrape}
        onTriggerRebuild={onTriggerRebuild}
        onTriggerDownloadPdf={onTriggerDownloadPdf}
        onTriggerSyncKnowledge={onTriggerSyncKnowledge}
        onTriggerKillTask={onTriggerKillTask}
        onTriggerNavigate={onTriggerNavigate}
        onReopenRun={onReopenRun}
      />
    </div>
  );
}

function _renderPrimaryTabView(props) {
  const { activeTab } = props;
  if (activeTab === 'orchestrator') {
    return (
      <div key="orchestrator" className="animate-tab-enter">
        <MacroOrchestratorFlow
          evalResults={props.evalResults}
          auditReport={props.auditReport}
          isTaskRunning={props.isTaskRunning}
          activeProgress={props.activeProgress}
          selectedChassis={props.selectedChassis}
          logStream={props.logStream}
          onOpenTool={(tool) => {
            if (tool === 'traceability') props.setShowTraceabilityInspector(true);
            else props.setActiveModal(tool);
          }}
          onTriggerSyncKnowledge={props.handleTriggerSyncKnowledge}
          onNavigateTab={props.setActiveTab}
        />
      </div>
    );
  }
  if (activeTab === 'matrix') {
    return (
      <div key="matrix" className="animate-tab-enter space-y-6">
        <ResolutionMatrix
          restoringEvaluation={props.restoringEvaluation}
          evaluationRunning={props.runActivity?.task === 'EVAL_BOQ' && props.runActivity.status === 'RUNNING'}
          evalResults={props.evalResults}
          onOpenPortalFeedback={props.setSelectedCardForFeedback}
          selectedChassis={props.selectedChassis}
          onTriggerDemoBoq={() => props.handleEvaluateBoq(null, STANDARD_SAMPLE_TEXT)}
          onOpenTopology={() => props.setActiveModal('boqTopology')}
          onOpenUploader={() => props.setActiveModal('boqUploader')}
        />
      </div>
    );
  }
  if (activeTab === 'reconciliation') {
    return (
      <div key="reconciliation" className="animate-tab-enter">
        <PartnerReconciliationView
          evalResults={props.evalResults}
          selectedChassis={props.selectedChassis}
          onTriggerScrape={props.handleTriggerScrape}
          auditReport={props.auditReport}
          onAuditReportChange={props.setAuditReport}
          onOpenTopology={(customData) => {
            if (customData) props.setIntakeTopologyData?.(customData);
            props.setActiveModal('boqTopology');
          }}
        />
      </div>
    );
  }
  return null;
}

function _renderSecondaryTabView(props) {
  const { activeTab } = props;
  if (activeTab === 'portfolio') {
    return (
      <div key="portfolio" className="animate-tab-enter">
        <PortfolioManifestWorkspace
          catalogs={props.catalogs}
          catalogData={props.catalogData}
          selectedChassis={props.selectedChassis}
          onSelectChassis={props.setSelectedChassis}
          currentCatObj={props.currentCatObj}
        />
      </div>
    );
  }
  if (activeTab === 'pipeline' || activeTab === 'scraper') {
    return (
      <PipelineWorkspaceView
        selectedChassis={props.selectedChassis}
        catalogData={props.catalogData}
        setSelectedChassis={props.setSelectedChassis}
        setActiveTab={props.setActiveTab}
        isTaskRunning={props.isTaskRunning}
        onTriggerSyncKnowledge={props.handleTriggerSyncKnowledge}
        opsProduct={props.opsProduct}
        setOpsProduct={props.setOpsProduct}
        catalogs={props.catalogs}
        logStream={props.logStream}
        runActivity={props.runActivity}
        onTriggerScrape={props.handleTriggerScrape}
        onTriggerRebuild={props.handleTriggerRebuild}
        onTriggerDownloadPdf={props.handleTriggerDownloadPdf}
        onTriggerKillTask={props.handleTriggerKillTask}
        onTriggerNavigate={props.handleTriggerNavigate}
        onReopenRun={props.handleReopenRun}
      />
    );
  }
  if (activeTab === 'catalog') {
    return (
      <div key="catalog" className="animate-tab-enter">
        <CatalogExplorer
          catalogData={props.catalogData}
          catalogs={props.catalogs}
          selectedChassis={props.selectedChassis}
          onSelectChassis={props.setSelectedChassis}
          chassisName={props.currentCatObj?.chassis}
          isCatalogLoading={props.isCatalogLoading}
          globalSearchTerm={props.globalSearchTerm}
          onClearSearch={() => props.setGlobalSearchTerm('')}
          onOpenRag={(query) => (query ? props.handleSmartSearch(query) : props.setIsRagOpen(true))}
          onRagQuery={props.handleSmartSearch}
        />
      </div>
    );
  }
  if (activeTab === 'artifacts') {
    return (
      <div key="artifacts" className="animate-tab-enter space-y-4">
        <CatalogProductSwitcher catalogs={props.catalogs} selectedChassis={props.selectedChassis} onSelectChassis={props.setSelectedChassis} />
        <ArtifactInspector
          currentCatalog={props.currentCatObj}
          onTriggerDownloadPdf={() => props.handleTriggerDownloadPdf(props.selectedChassis)}
          onNavigateTab={props.setActiveTab}
          isTaskRunning={props.isTaskRunning}
        />
      </div>
    );
  }
  if (activeTab === 'telemetry') {
    return <div key="telemetry" className="animate-tab-enter"><TelemetryCard /></div>;
  }
  return null;
}

export function AppMainTabContent(props) {
  return _renderPrimaryTabView(props) || _renderSecondaryTabView(props);
}
