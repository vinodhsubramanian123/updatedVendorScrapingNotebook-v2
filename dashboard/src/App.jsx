import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import UserFeedbackDrawer from "./components/UserFeedbackDrawer";
import QuarantineManagementDrawer from "./components/QuarantineManagementDrawer";
import FeedbackModal from "./components/FeedbackModal";
import TraceabilityInspector from "./components/TraceabilityInspector";
import AppWorkspaceShell from "./components/layout/AppWorkspaceShell.jsx";
import { useCatalogs } from "./hooks/useCatalogs.js";
import { readSessionValue, readSessionJson, writeSessionJson, SESSION_BOQ_RUN_KEY, SESSION_BOQ_INTAKE_KEY } from "./services/workspaceRequests.js";
import { computeActiveBannerError, usePipelineTriggers, computeRunActivityDisplay, useServerOfflinePolicy } from "./hooks/useWorkspaceRuns.js";
import { useAppHandlers } from "./hooks/useAppHandlers.js";
import { useTheme } from "./hooks/useTheme.js";

const SettingsDrawer = lazy(() => import("./components/SettingsDrawer"));
const NotebookRagDrawer = lazy(() => import("./components/NotebookRagDrawer"));

function AppDrawersHost({
  isRagOpen, setIsRagOpen, ragData, isQueryingRag, ragElapsedTime, handleSmartSearch, selectedChassis, catalogs, localOnly,
  isSettingsOpen, setIsSettingsOpen, theme, setTheme,
  isFeedbackDrawerOpen, setIsFeedbackDrawerOpen,
  isQuarantineOpen, setIsQuarantineOpen,
  selectedCardForFeedback, setSelectedCardForFeedback,
  showTraceabilityInspector, setShowTraceabilityInspector, evalResults
}) {
  return (
    <>
      <Suspense fallback={<p role="status" className="fixed bottom-4 right-4 z-50 surface-panel rounded-lg p-3">Loading panel…</p>}>
        {isRagOpen && <NotebookRagDrawer isOpen={isRagOpen} onClose={() => setIsRagOpen(false)} ragData={ragData} isQuerying={isQueryingRag} ragElapsedTime={ragElapsedTime} onQuerySubmit={handleSmartSearch} selectedChassis={selectedChassis} catalogs={catalogs} localOnly={localOnly} />}
        {isSettingsOpen && <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} theme={theme} onThemeChange={setTheme} />}
      </Suspense>
      <UserFeedbackDrawer localOnly={localOnly} isOpen={isFeedbackDrawerOpen} onClose={() => setIsFeedbackDrawerOpen(false)} />
      <QuarantineManagementDrawer isOpen={isQuarantineOpen} onClose={() => setIsQuarantineOpen(false)} />
      <FeedbackModal isOpen={!!selectedCardForFeedback} onClose={() => setSelectedCardForFeedback(null)} resolutionCard={selectedCardForFeedback} />
      <TraceabilityInspector isOpen={showTraceabilityInspector} onClose={() => setShowTraceabilityInspector(false)} traces={evalResults?.tracePayloads || []} />
    </>
  );
}

function useAppUiState() {
  const [activeTab, setActiveTab] = useState('orchestrator');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [omniboxRequest, setOmniboxRequest] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [showTraceabilityInspector, setShowTraceabilityInspector] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [actionError, setActionError] = useState(null);
  const [intakeTopologyData, setIntakeTopologyData] = useState(null);
  const [auditReport, setAuditReport] = useState(null);
  const [isQueryingRag, setIsQueryingRag] = useState(false);
  const [isRagOpen, setIsRagOpen] = useState(false);
  const [ragElapsedTime, setRagElapsedTime] = useState(0);
  const [ragData, setRagData] = useState({ answer: null, latencyMs: null, source: null });
  const [isFeedbackDrawerOpen, setIsFeedbackDrawerOpen] = useState(false);
  const [isQuarantineOpen, setIsQuarantineOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCardForFeedback, setSelectedCardForFeedback] = useState(null);
  return {
    activeTab, setActiveTab, mobileNavOpen, setMobileNavOpen, omniboxRequest, setOmniboxRequest,
    activeModal, setActiveModal, showTraceabilityInspector, setShowTraceabilityInspector,
    globalSearchTerm, setGlobalSearchTerm, actionError, setActionError,
    intakeTopologyData, setIntakeTopologyData, auditReport, setAuditReport,
    isQueryingRag, setIsQueryingRag, isRagOpen, setIsRagOpen, ragElapsedTime, setRagElapsedTime,
    ragData, setRagData, isFeedbackDrawerOpen, setIsFeedbackDrawerOpen,
    isQuarantineOpen, setIsQuarantineOpen, isSettingsOpen, setIsSettingsOpen,
    selectedCardForFeedback, setSelectedCardForFeedback
  };
}

export default function App() {
  const { catalogs, catalogData, isCatalogLoading, catalogError, selectedChassis, setSelectedChassis, refreshCatalogs } = useCatalogs(readSessionValue('dashboard.catalogProduct'));
  const [opsProduct, setOpsProduct] = useState('');
  useEffect(() => { writeSessionJson('dashboard.catalogProduct', selectedChassis); }, [selectedChassis]);
  const selectedChassisRef = useRef(selectedChassis);
  useEffect(() => { selectedChassisRef.current = selectedChassis; }, [selectedChassis]);

  const ui = useAppUiState();
  const { theme, setTheme, toggleTheme } = useTheme();
  const [logStream, setLogStream] = useState([]);
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [activeProgress, setActiveProgress] = useState(null);
  const [runActivity, setRunActivity] = useState(null);
  const [streamConnected, setStreamConnected] = useState(null);
  const [evalResults, setEvalResults] = useState(null);
  const [restoringEvaluation, setRestoringEvaluation] = useState(() => Boolean(readSessionValue(SESSION_BOQ_RUN_KEY)));

  const evalRef = useRef(null);
  const evaluationRunRef = useRef(readSessionValue(SESSION_BOQ_RUN_KEY));
  const activeRunRef = useRef(null);
  const runActivityRef = useRef(null);
  useEffect(() => { runActivityRef.current = runActivity; }, [runActivity]);
  const inputRef = useRef(readSessionJson(SESSION_BOQ_INTAKE_KEY));
  const evaluationEpoch = useRef(0);
  const searchEpoch = useRef(0);

  const [localOnlyPreference, setBoqLocalOnly] = useState(false);
  const serverOffline = useServerOfflinePolicy();
  const boqLocalOnly = serverOffline === true || localOnlyPreference;
  const currentCatObj = catalogs.find(c => c.id === selectedChassis);

  const triggers = usePipelineTriggers({ selectedChassis: opsProduct || selectedChassis, setActionError: ui.setActionError, setActiveTab: ui.setActiveTab, activeRunRef, runActivityRef });
  const handlers = useAppHandlers({
    catalogs, currentCatObj, selectedChassis, boqLocalOnly, evalResults, selectedChassisRef,
    activeRunRef, evaluationRunRef, evalRef, inputRef, evaluationEpoch, searchEpoch,
    setLogStream, setIsTaskRunning, setActiveProgress, refreshCatalogs, setRunActivity,
    setStreamConnected, setRestoringEvaluation, setEvalResults, ...ui
  });

  const activeBannerError = computeActiveBannerError(ui.actionError, catalogError);
  const { isEvalWorkspaceTab, showRunActivityBanner, bannerRun } = computeRunActivityDisplay({
    activeTab: ui.activeTab, runActivity, streamConnected, isTaskRunning
  });
  const dispatchOmniboxQuery = (queryText, preview = false) => {
    ui.setActiveTab('orchestrator');
    ui.setOmniboxRequest({ id: `omni-${Date.now()}`, query: queryText, preview });
  };

  return (
    <AppWorkspaceShell
      {...ui} {...triggers} {...handlers}
      catalogs={catalogs} catalogData={catalogData} isCatalogLoading={isCatalogLoading}
      selectedChassis={selectedChassis} setSelectedChassis={setSelectedChassis}
      refreshCatalogs={refreshCatalogs} currentCatObj={currentCatObj}
      opsProduct={opsProduct} setOpsProduct={setOpsProduct}
      theme={theme} toggleTheme={toggleTheme} boqLocalOnly={boqLocalOnly}
      setBoqLocalOnly={setBoqLocalOnly} serverOffline={serverOffline}
      logStream={logStream} isTaskRunning={isTaskRunning} activeProgress={activeProgress}
      runActivity={runActivity} streamConnected={streamConnected} evalResults={evalResults}
      setEvalResults={setEvalResults} restoringEvaluation={restoringEvaluation}
      activeBannerError={activeBannerError} isEvalWorkspaceTab={isEvalWorkspaceTab}
      showRunActivityBanner={showRunActivityBanner} bannerRun={bannerRun}
      dispatchOmniboxQuery={dispatchOmniboxQuery}
      drawersHost={(
        <AppDrawersHost
          {...ui} handleSmartSearch={handlers.handleSmartSearch}
          selectedChassis={selectedChassis} catalogs={catalogs} localOnly={boqLocalOnly}
          theme={theme} setTheme={setTheme} evalResults={evalResults}
        />
      )}
    />
  );
}
