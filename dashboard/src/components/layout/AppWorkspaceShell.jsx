import React from "react";
import Header from "../Header";
import RunActivity from "../RunActivity";
import PlatformDisambiguationCard from "../PlatformDisambiguationCard";
import ErrorBoundary from "../ErrorBoundary";
import PresalesRequestPanel from "../PresalesRequestPanel";
import AgenticExecutionTimeline from "../agentic/AgenticExecutionTimeline";
import Sidebar, { MobileNavStrip, useIsDesktop } from "./Sidebar.jsx";
import { EvaluationWorkspaceDetails, WorkspaceEvaluationProgress, AppMainTabContent } from "./WorkspaceViews.jsx";
import { AppToolModals } from "./AppDrawers.jsx";

function MainWorkspaceBody({
  activeTab, setActiveTab, showRunActivityBanner, bannerRun, activeProgress, evalResults,
  streamConnected, handleTriggerKillTask, isEvalWorkspaceTab, handleSelectClarification,
  setEvalResults, activeModal, evaluatedProduct, handleReEvaluate, currentCatObj, catalogs,
  isTaskRunning, handleEvaluateBoq, boqLocalOnly, setBoqLocalOnly, serverOffline,
  omniboxRequest, setOmniboxRequest, restoringEvaluation, auditReport, setAuditReport,
  setIntakeTopologyData, runActivity, opsProduct, setOpsProduct, selectedChassis,
  setSelectedChassis, logStream, catalogData, isCatalogLoading, globalSearchTerm,
  setGlobalSearchTerm, setActiveModal, setShowTraceabilityInspector, setSelectedCardForFeedback,
  setIsRagOpen, handleSmartSearch, handleTriggerScrape, handleTriggerScrapeE2E, handleTriggerOnboard, handleTriggerRebuild,
  handleTriggerDownloadPdf, handleTriggerSyncKnowledge, handleTriggerNavigate, handleReopenRun
}) {
  return (
    <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6 space-y-5">
      {showRunActivityBanner && (
        <RunActivity
          run={bannerRun} progress={activeProgress} evaluation={evalResults}
          reconnecting={streamConnected === false} onNavigate={setActiveTab} onCancelTask={handleTriggerKillTask}
        />
      )}
      {isEvalWorkspaceTab && evalResults?.clarificationRequired && (
        <PlatformDisambiguationCard
          evalResults={evalResults} onSelectCandidate={handleSelectClarification}
          onDismiss={() => setEvalResults(prev => (prev ? { ...prev, clarificationRequired: false } : null))}
        />
      )}
      <EvaluationWorkspaceDetails
        visible={isEvalWorkspaceTab} uploaderOpen={activeModal === 'boqUploader'}
        evalResults={evalResults} evaluatedProduct={evaluatedProduct} onReEvaluate={handleReEvaluate}
      />
      <ErrorBoundary fallbackTitle="View Rendering Error">
        <div hidden={activeTab !== 'orchestrator'}>
          <AgenticExecutionTimeline onCancel={handleTriggerKillTask} />
          <WorkspaceEvaluationProgress uploaderOpen={activeModal === 'boqUploader'} progress={activeProgress} logStream={logStream} />
          <PresalesRequestPanel
            catalogs={catalogs} isTaskRunning={isTaskRunning}
            onEvaluateBoq={handleEvaluateBoq} localOnly={boqLocalOnly} onLocalOnlyChange={setBoqLocalOnly}
            serverOffline={serverOffline} omniboxRequest={omniboxRequest} onConsumeOmnibox={() => setOmniboxRequest(null)}
          />
        </div>
        <AppMainTabContent
          restoringEvaluation={restoringEvaluation} activeTab={activeTab} setActiveTab={setActiveTab}
          evalResults={evalResults} auditReport={auditReport} setAuditReport={setAuditReport}
          setIntakeTopologyData={setIntakeTopologyData} isTaskRunning={isTaskRunning}
          activeProgress={activeProgress} runActivity={runActivity} opsProduct={opsProduct}
          setOpsProduct={setOpsProduct} selectedChassis={selectedChassis} setSelectedChassis={setSelectedChassis}
          logStream={logStream} catalogs={catalogs} catalogData={catalogData} currentCatObj={currentCatObj}
          isCatalogLoading={isCatalogLoading} globalSearchTerm={globalSearchTerm} setGlobalSearchTerm={setGlobalSearchTerm}
          setActiveModal={setActiveModal} setShowTraceabilityInspector={setShowTraceabilityInspector}
          setSelectedCardForFeedback={setSelectedCardForFeedback} setIsRagOpen={setIsRagOpen}
          handleSmartSearch={handleSmartSearch} handleEvaluateBoq={handleEvaluateBoq}
          handleTriggerScrape={handleTriggerScrape} handleTriggerScrapeE2E={handleTriggerScrapeE2E}
          handleTriggerOnboard={handleTriggerOnboard} handleTriggerRebuild={handleTriggerRebuild}
          handleTriggerDownloadPdf={handleTriggerDownloadPdf} handleTriggerSyncKnowledge={handleTriggerSyncKnowledge}
          handleTriggerKillTask={handleTriggerKillTask} handleTriggerNavigate={handleTriggerNavigate}
          handleReopenRun={handleReopenRun}
        />
      </ErrorBoundary>
    </main>
  );
}

export default function AppWorkspaceShell(props) {
  const {
    activeTab, setActiveTab, mobileNavOpen, setMobileNavOpen, catalogs, activeBannerError,
    setActionError, refreshCatalogs, selectedChassis, setSelectedChassis, handleSmartSearch,
    setIsRagOpen, dispatchOmniboxQuery, setIsFeedbackDrawerOpen, setIsQuarantineOpen,
    setIsSettingsOpen, isTaskRunning, isCatalogLoading, theme, toggleTheme, boqLocalOnly,
    activeModal, setActiveModal, evalResults, intakeTopologyData, setIntakeTopologyData,
    logStream, activeProgress, setSelectedCardForFeedback, handleEvaluateBoq,
    handleReEvaluate, handleTriggerScrape, auditReport, setAuditReport, serverOffline,
    setBoqLocalOnly, drawersHost
  } = props;

  const isDesktop = useIsDesktop();
  const activePortfolioCount = catalogs.filter(c => !c.isQuarantinedStub).length;

  return (
    <div className="min-h-screen flex bg-app-root">
      <Sidebar
        activeTab={activeTab} onTabChange={setActiveTab} mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)} badges={{ portfolio: activePortfolioCount || undefined }}
        isDesktop={isDesktop}
      />
      <div className="flex-1 min-w-0 flex flex-col pb-16">
        {activeBannerError && (
          <div role="alert" className="p-3 bg-rose-50 text-rose-800 text-sm">
            {activeBannerError}
            <button className="ml-3 underline" onClick={() => { setActionError(null); refreshCatalogs(); }}>Retry catalog / dismiss</button>
          </div>
        )}
        <Header
          catalogs={catalogs} selectedChassis={selectedChassis} onSelectChassis={setSelectedChassis}
          onSelectSku={props.setGlobalSearchTerm}
          setActiveTab={setActiveTab}
          onOpenRag={(q) => (q && typeof q === 'string' ? handleSmartSearch(q) : setIsRagOpen(true))}
          onRunPresalesQuery={(q) => dispatchOmniboxQuery(q, false)}
          onPreviewPresalesQuery={(q) => dispatchOmniboxQuery(q, true)}
          onOpenFeedbackDrawer={() => setIsFeedbackDrawerOpen(true)}
          onOpenQuarantineDrawer={() => setIsQuarantineOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isTaskRunning={isTaskRunning} isCatalogLoading={isCatalogLoading}
          theme={theme} onToggleTheme={toggleTheme}
          onOpenMobileMenu={() => setMobileNavOpen(true)} localOnly={boqLocalOnly}
        />
        {!isDesktop && <MobileNavStrip activeTab={activeTab} onTabChange={setActiveTab} />}
        <MainWorkspaceBody {...props} />
        <AppToolModals
          catalogs={catalogs} activeModal={activeModal} setActiveModal={setActiveModal}
          evalResults={evalResults} intakeTopologyData={intakeTopologyData}
          setIntakeTopologyData={setIntakeTopologyData} logStream={logStream}
          activeProgress={activeProgress} selectedChassis={selectedChassis}
          setSelectedCardForFeedback={setSelectedCardForFeedback} setIsRagOpen={setIsRagOpen}
          handleSmartSearch={handleSmartSearch} handleEvaluateBoq={handleEvaluateBoq}
          handleReEvaluate={handleReEvaluate} handleTriggerScrape={handleTriggerScrape}
          auditReport={auditReport} setAuditReport={setAuditReport}
          boqLocalOnly={boqLocalOnly} serverOffline={serverOffline} setBoqLocalOnly={setBoqLocalOnly}
        />
        {drawersHost}
      </div>
    </div>
  );
}
