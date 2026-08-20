import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import CatalogExplorer from './components/CatalogExplorer';
import ScraperTriggerCard from './components/ScraperTriggerCard';
import BoqUploader from './components/BoqUploader';
import WorkloadDnaCard from './components/WorkloadDnaCard';
import ResolutionMatrix from './components/ResolutionMatrix';
import NotebookRagDrawer from './components/NotebookRagDrawer';
import ArtifactInspector from './components/ArtifactInspector';
import TelemetryCard from './components/TelemetryCard';
import AmbiguityInbox from './components/AmbiguityInbox';
import UserFeedbackDrawer from './components/UserFeedbackDrawer';
import FeedbackModal from './components/FeedbackModal';
import SettingsDrawer from './components/SettingsDrawer';
import PartnerReconciliationView from './components/PartnerReconciliationView';
import GlobalLoadingState from './components/GlobalLoadingState';
import MacroOrchestratorFlow from './components/MacroOrchestratorFlow';
import TraceabilityInspector from './components/TraceabilityInspector';

// Build structured aspectChecks array from individual eval fields when not provided
function buildAspectChecksFromEval(evalData) {
  if (!evalData || Object.keys(evalData).length === 0) return [];
  return [
    { id: 1, name: 'Compute & Thermal', status: evalData.hasHighPerfFans !== false ? 'PASS' : 'FAIL', detail: `${evalData.cpuCount || 0} CPUs (Max TDP: ${evalData.maxCpuTdpWatts || 0}W) | High-Perf Fans: ${evalData.hasHighPerfFans ? '✅' : '❌'}` },
    { id: 2, name: 'Memory & Channels', status: evalData.isBalancedChannel !== false ? 'PASS' : 'FAIL', detail: `${evalData.memoryCount || 0} DIMMs (${evalData.totalMemoryGb || 0} GB Total)` },
    { id: 3, name: 'Storage & Tri-Mode', status: evalData.hasSmartBattery !== false ? 'PASS' : 'FAIL', detail: `${evalData.driveCount || 0} Drives | Battery: ${evalData.hasSmartBattery ? '✅' : '❌'}` },
    { id: 4, name: 'PCIe Expansion', status: (evalData.requiredPcieCards || 0) <= (evalData.totalPcieSlotsAvailable || 8) ? 'PASS' : 'FAIL', detail: `${evalData.requiredPcieCards || 0} Cards / ${evalData.totalPcieSlotsAvailable || 8} Slots` },
    { id: 5, name: 'Networking & OCP', status: 'PASS', detail: `OCP Adapter: ${evalData.hasOcpAdapter ? '✅' : '⚠️ Optional'}` },
    { id: 6, name: 'Power & Ambient', status: (!evalData.hasDcPowerSupply || evalData.hasDcLugKit) ? 'PASS' : 'FAIL', detail: `DC PSU: ${evalData.hasDcPowerSupply ? 'YES' : 'NO'} | Lug Kit: ${evalData.hasDcLugKit ? '✅' : '❌'}` },
    { id: 7, name: 'Support Services', status: 'PASS', detail: `Tech Care: ${evalData.hasSupportService ? '✅' : '⚠️ Optional'}` },
  ];
}

// Generic Modal Wrapper Component
function ToolModal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-backdrop"
    >
      <div className="bg-slate-50 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/90 animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [catalogs, setCatalogs] = useState([]);
  const [selectedChassis, setSelectedChassis] = useState('DL380_Gen12_SFF');
  const [catalogData, setCatalogData] = useState(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('orchestrator');
  const [activeModal, setActiveModal] = useState(null); // 'boqUploader', 'resolutionMatrix', 'reconciliation'
  const [showTraceabilityInspector, setShowTraceabilityInspector] = useState(false);
  
  // Real-time SSE Log Stream State
  const [logStream, setLogStream] = useState([]);
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [_taskHistory, setTaskHistory] = useState([]);
  const [activeProgress, setActiveProgress] = useState(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const pollIntervalsRef = useRef(new Set());

  useEffect(() => {
    const intervals = pollIntervalsRef.current;
    return () => {
      intervals.forEach(clearInterval);
    };
  }, []);

  const handleSearchLocal = (query) => {
    setGlobalSearchTerm(query);
    setActiveTab('catalog');
  };
  
  // BOQ & Evaluation State
  const [evalResults, setEvalResults] = useState(null);
  const [auditReport, setAuditReport] = useState(null);
  
  // NotebookLM RAG Drawer State
  const [isRagOpen, setIsRagOpen] = useState(false);
  const [ragData, setRagData] = useState(null);
  const [ragElapsedTime, setRagElapsedTime] = useState(0);
  const [isQueryingRag, setIsQueryingRag] = useState(false);
  
  // Agent Feedback Queue Drawer State
  const [isFeedbackDrawerOpen, setIsFeedbackDrawerOpen] = useState(false);

  // Settings Drawer State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Portal Feedback Modal State
  const [selectedCardForFeedback, setSelectedCardForFeedback] = useState(null);

  const selectedChassisRef = useRef(selectedChassis);
  useEffect(() => {
    selectedChassisRef.current = selectedChassis;
  }, [selectedChassis]);

  // 1. Fetch available catalogs on mount
  const fetchAvailableCatalogs = async () => {
    try {
      const res = await fetch('/api/available-catalogs');
      const data = await res.json();
      setCatalogs(data.catalogs || []);
      if (data.catalogs && data.catalogs.length > 0 && !selectedChassis) {
        setSelectedChassis(data.catalogs[0].id);
      }
    } catch (err) {
      console.error('Error fetching catalogs:', err);
    }
  };

  const fetchRunHistory = async () => {
    try {
      const res = await fetch('/api/history/runs');
      const runs = await res.json();
      if (Array.isArray(runs) && runs.length > 0) {
        setTaskHistory(runs.map(r => ({
          type: r.taskType || 'PIPELINE_ACTION',
          status: r.exitCode === 0 ? 'COMPLETED' : 'FAILED',
          timestamp: r.startTime || new Date().toISOString()
        })).slice(0, 15));
      }
    } catch (err) {
      console.error('Error fetching run history:', err);
    }
  };

  useEffect(() => {
    fetchAvailableCatalogs();
    fetchRunHistory();
  }, []);

  // 2. Fetch active catalog JSON data when selectedChassis changes
  //    Also clear stale eval/RAG state (Fix G8: prevents ProLiant results showing on Alletra)
  useEffect(() => {
    if (!selectedChassis) return;
    setEvalResults(null);
    setRagData(null);
    setLogStream([]);
    const cat = catalogs.find(c => c.id === selectedChassis);
    if (cat && cat.jsonPath) {
      setIsCatalogLoading(true);
      setCatalogData(null); // Clear old catalog to trigger loading skeleton and prevent data mismatches
      fetch(`/api/catalog-data?path=${encodeURIComponent(cat.jsonPath)}`)
        .then(res => {
          if (!res.ok) throw new Error('Catalog data fetch failed');
          return res.json();
        })
        .then(data => {
          setCatalogData(data);
          setIsCatalogLoading(false);
        })
        .catch(err => {
          console.error('Error fetching catalog data:', err);
          setIsCatalogLoading(false);
        });
    }
  }, [selectedChassis, catalogs]);

  // 3. Connect to Server-Sent Events (SSE) Stream
  useEffect(() => {
    const eventSource = new EventSource('/api/stream-logs');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'TASK_STARTED') {
          setIsTaskRunning(true);
          setActiveProgress({ task: payload.task, currentStep: 0, totalSteps: 0, action: 'Starting...', status: 'started' });
        } else if (payload.type === 'TASK_COMPLETED') {
          setIsTaskRunning(false);
          setActiveProgress(null);
          fetchAvailableCatalogs(); // Refresh catalog registry after scrape/rebuild
          setTaskHistory(prev => [{
            type: payload.task || 'PIPELINE_ACTION',
            status: payload.code === 0 ? 'COMPLETED' : 'FAILED',
            timestamp: new Date().toISOString()
          }, ...prev.slice(0, 15)]);
          if (payload.task?.includes('SCRAPE') || payload.task?.includes('REBUILD')) {
            setActiveTab('catalog'); // G2+G3: Auto-navigate to Master Catalog tab
          }
        } else if (payload.type === 'PROGRESS') {
          setActiveProgress({
            task: payload.task || 'RUNNING',
            currentStep: payload.step,
            totalSteps: payload.total,
            action: payload.action,
            status: payload.status,
            detail: payload.detail
          });
          setLogStream(prev => [...prev.slice(-200), payload]);
        } else if (payload.type === 'LOG') {
          setLogStream(prev => [...prev.slice(-200), payload]);
        } else if (payload.type === 'EVAL_RESULT') {
          console.log('[App.jsx:SSE] EVAL_RESULT received:', payload);
          // The async BOQ evaluation completed successfully!
          setIsTaskRunning(false);
          setActiveProgress(null);
          
          if (payload.data) {
            // Flatten: hoist inner evalResults fields to top-level so UI components 
            // can access .errors, .confidence, .aspectChecks, .missingDependencies directly
            const inner = payload.data.evalResults || {};
            const flatEval = {
              ...payload.data,
              // Hoist inner eval fields to top level for component backward compat
              errors: inner.errors ?? payload.data.errors ?? [],
              warnings: inner.warnings ?? payload.data.warnings ?? [],
              missingDependencies: inner.missingDependencies ?? payload.data.missingDependencies ?? [],
              confidence: inner.confidence ?? payload.data.confidence ?? { score: 0, summary: '' },
              cpuCount: inner.cpuCount ?? payload.data.cpuCount,
              maxCpuTdpWatts: inner.maxCpuTdpWatts ?? payload.data.maxCpuTdpWatts,
              memoryCount: inner.memoryCount ?? payload.data.memoryCount,
              totalMemoryGb: inner.totalMemoryGb ?? payload.data.totalMemoryGb,
              driveCount: inner.driveCount ?? payload.data.driveCount,
              hasHighPerfFans: inner.hasHighPerfFans ?? payload.data.hasHighPerfFans,
              hasSmartBattery: inner.hasSmartBattery ?? payload.data.hasSmartBattery,
              hasDcPowerSupply: inner.hasDcPowerSupply ?? payload.data.hasDcPowerSupply,
              hasDcLugKit: inner.hasDcLugKit ?? payload.data.hasDcLugKit,
              hasOcpAdapter: inner.hasOcpAdapter ?? payload.data.hasOcpAdapter,
              hasSupportService: inner.hasSupportService ?? payload.data.hasSupportService,
              agenticExplanation: inner.agenticExplanation ?? payload.data.agenticExplanation,
              // Preserve conflictGraph and rankedSolutions for easy access
              conflictGraph: payload.data.conflictGraph ?? inner.conflictGraph ?? {},
              rankedSolutions: payload.data.conflictGraph?.rankedSolutions ?? inner.conflictGraph?.rankedSolutions ?? payload.data.rankedSolutions ?? [],
              workloadDna: payload.data.conflictGraph?.workloadDna ?? payload.data.workloadDna,
              // Generate aspectChecks from inner eval data for components that need it
              aspectChecks: inner.aspectChecks ?? buildAspectChecksFromEval(inner),
            };
            setEvalResults(flatEval);
            // Stay on orchestrator to view matrix
            
            // Decoupled RAG: Dispatch parallel RAG query now that matrix is rendered
            if (payload.data.notebookPayload) {
              fetch('/api/notebook-query-async', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: payload.data.notebookPayload, chassis: selectedChassisRef.current })
              })
              .then(res => res.json())
              .then(jobInfo => {
                if (jobInfo.status === 'COMPLETED') {
                  const finalAns = jobInfo.result?.answer || jobInfo.answer;
                  setEvalResults(prev => ({...prev, ragAnswer: finalAns, ragData: jobInfo.result || jobInfo}));
                } else if (jobInfo.jobId) {
                  // Poll for matrix RAG result
                  let polls = 0;
                  const maxPolls = 60; // 120 seconds max
                  const matrixPoll = setInterval(async () => {
                    pollIntervalsRef.current.add(matrixPoll);
                    polls++;
                    if (polls > maxPolls) {
                      clearInterval(matrixPoll);
                      pollIntervalsRef.current.delete(matrixPoll);
                      setEvalResults(prev => ({...prev, ragAnswer: '⚠️ NotebookLM Query Timeout: RAG verification took too long.'}));
                      return;
                    }
                    try {
                      const stRes = await fetch(`/api/notebook-query-status/${jobInfo.jobId}`);
                      const stData = await stRes.json();
                      if (stData.status === 'COMPLETED') {
                        clearInterval(matrixPoll);
                      pollIntervalsRef.current.delete(matrixPoll);
                      const finalAns = stData.result?.answer || stData.answer;
                        setEvalResults(prev => ({...prev, ragAnswer: finalAns, ragData: typeof stData !== "undefined" ? stData.result || stData : jobInfo.result || jobInfo}));
                      } else if (stData.status === 'FAILED') {
                        clearInterval(matrixPoll);
                      pollIntervalsRef.current.delete(matrixPoll);
                      setEvalResults(prev => ({...prev, ragAnswer: `⚠️ NotebookLM Query Failed: ${stData.error}`}));
                      }
                    } catch (e) {
                      console.error('Matrix RAG poll error:', e);
                    }
                  }, 2000);
                }
              })
              .catch(err => console.error('Failed to dispatch background RAG query:', err));
            }
            
          } else if (payload.error) {
            setEvalResults({ status: 'ERROR', error: payload.error.error || 'Evaluation failed' });
          }
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    return () => eventSource.close();
  }, []);

  // Handler: Smart Search (FlexSearch + NotebookLM RAG)
  const handleSmartSearch = async (query) => {
    if (!query || !query.trim()) return;

    setIsRagOpen(true);
    setIsQueryingRag(true);
    setRagElapsedTime(0);
    setRagData({ query, answer: 'Querying Gemini NotebookLM RAG... Consulting QuickSpecs notebook.', citations: [], source: 'PENDING' });

    try {
      const initRes = await fetch('/api/notebook-query-async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chassis: selectedChassis })
      });
      const jobInfo = await initRes.json();
      
      if (jobInfo.status === 'COMPLETED') {
        const finalData = jobInfo.result || jobInfo;
        setRagData(finalData);
        setIsQueryingRag(false);
        return;
      }

      const jobId = jobInfo.jobId;
      let pollCount = 0;
      const maxPolls = 60; // 120 seconds limit
      
      const pollInterval = setInterval(async () => {
        pollIntervalsRef.current.add(pollInterval);
        pollCount++;
        setRagElapsedTime(pollCount * 1.5);
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
                      pollIntervalsRef.current.delete(pollInterval);
          setRagData({ query, answer: '⚠️ NotebookLM Query Timeout: No response received after 120 seconds.', citations: [], source: 'ERROR' });
          setIsQueryingRag(false);
          return;
        }
        try {
          const statusRes = await fetch(`/api/notebook-query-status/${jobId}`);
          const statusData = await statusRes.json();
          
          if (statusData.status === 'COMPLETED') {
            clearInterval(pollInterval);
                      pollIntervalsRef.current.delete(pollInterval);
                      const finalData = statusData.result || statusData;
            setRagData(finalData);
            setIsQueryingRag(false);
          } else if (statusData.status === 'FAILED') {
            clearInterval(pollInterval);
                      pollIntervalsRef.current.delete(pollInterval);
                      setRagData({ query, answer: `NotebookLM Query Failed: ${statusData.error || 'Execution error'}`, citations: [], source: 'ERROR' });
            setIsQueryingRag(false);
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 1500); // Poll every 1.5 seconds
      
    } catch (err) {
      setRagData({ query, answer: `Failed to initiate RAG Query: ${err.message || 'Network error'}`, citations: [], source: 'ERROR' });
      setIsQueryingRag(false);
    }
  };

  // Handler: Trigger Scrape
  const handleTriggerScrape = async (mode) => {
    setLogStream([]);
    setActiveTab('scraper');
    setEvalResults(null); // Clear stale cache
    try {
      await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Trigger Rebuild
  const handleTriggerRebuild = async () => {
    setLogStream([]);
    setActiveTab('scraper');
    setEvalResults(null); // Clear stale cache
    try {
      await fetch('/api/rebuild', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Sync Knowledge to NotebookLM
  const handleTriggerSyncKnowledge = async () => {
    setLogStream([]);
    setActiveTab('scraper');
    setEvalResults(null); // Clear stale cache
    try {
      await fetch('/api/sync-knowledge', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Download QuickSpecs PDF (Fix B4)
  const handleTriggerDownloadPdf = async () => {
    setLogStream([]);
    setActiveTab('scraper');
    setEvalResults(null);
    try {
      await fetch('/api/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chassisId: selectedChassis })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Kill Active Task (Enhancement U3)
  const handleTriggerKillTask = async () => {
    try {
      await fetch('/api/kill-task', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Auto-Navigate to OCA
  const handleTriggerNavigate = async () => {
    setLogStream([]);
    setActiveTab('scraper');
    setEvalResults(null);
    try {
      await fetch('/api/navigate-oca', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Evaluate BOQ (Now Async SSE Driven)
  const handleEvaluateBoq = async (boqInput) => {
    console.log('[App.jsx] handleEvaluateBoq called with input:', boqInput);
    setLogStream([]);
    setEvalResults(null);
    try {
      const currentCat = catalogs.find(c => c.id === selectedChassis);
      console.log('[App.jsx] Selected chassis:', selectedChassis, 'chassisDir:', currentCat?.chassisDir);
      const res = await fetch('/api/eval-boq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...boqInput, chassisDir: currentCat?.chassisDir || currentCat?.id })
      });
      
      const data = await res.json();
      console.log('[App.jsx] /api/eval-boq response status:', res.status, 'data:', data);
      if (!res.ok) {
        setEvalResults({ status: 'ERROR', error: data.error });
        return { error: data.error };
      }
      // If ok (202), we don't return data immediately. The SSE stream will broadcast EVAL_RESULT.
      return { status: 'ACCEPTED' };
    } catch (err) {
      console.error('[App.jsx] handleEvaluateBoq error:', err);
      setEvalResults({ status: 'ERROR', error: err.message });
      return { error: err.message };
    }
  };

  const currentCatObj = catalogs.find(c => c.id === selectedChassis);

  return (
    <div className="min-h-screen pb-16">
      {/* Header Bar */}
      <Header
        catalogs={catalogs}
        catalogData={catalogData}
        selectedChassis={selectedChassis}
        onSelectChassis={setSelectedChassis}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSmartSearch={handleSmartSearch}
        onSearchLocal={handleSearchLocal}
        onOpenRag={() => setIsRagOpen(true)}
        onOpenFeedbackDrawer={() => setIsFeedbackDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isTaskRunning={isTaskRunning}
        isCatalogLoading={isCatalogLoading}
      />

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        
        {/* Global Pending Loading State Indicator & Skeleton Wireframes */}
        <GlobalLoadingState
          isTaskRunning={isTaskRunning}
          isQueryingRag={isQueryingRag}
          activeProgress={activeProgress}
          mode="banner"
        />

        {/* The Macro Flow Engine (Default View) */}
        {activeTab === 'orchestrator' && (
          <div key="orchestrator" className="animate-tab-enter">
            <MacroOrchestratorFlow
              evalResults={evalResults}
              auditReport={auditReport}
              isTaskRunning={isTaskRunning}
              activeProgress={activeProgress}
              selectedChassis={selectedChassis}
              logStream={logStream}
              onOpenTool={(tool) => {
                if (tool === 'traceability') {
                  setShowTraceabilityInspector(true);
                } else {
                  setActiveModal(tool);
                }
              }}
              onTriggerSyncKnowledge={handleTriggerSyncKnowledge}
              onNavigateTab={setActiveTab}
            />
          </div>
        )}

        {/* Data Ingestion & Scraping Tab */}
        {activeTab === 'scraper' && (
          <div key="scraper" className="animate-tab-enter">
            <ScraperTriggerCard
              logStream={logStream}
              isTaskRunning={isTaskRunning}
              onTriggerScrape={handleTriggerScrape}
              onTriggerRebuild={handleTriggerRebuild}
              onTriggerDownloadPdf={handleTriggerDownloadPdf}
              onTriggerSyncKnowledge={handleTriggerSyncKnowledge}
              onTriggerKillTask={handleTriggerKillTask}
              onTriggerNavigate={handleTriggerNavigate}
            />
          </div>
        )}

        {/* Master Excel Catalog Explorer */}
        {activeTab === 'catalog' && (
          <div key="catalog" className="animate-tab-enter">
            <CatalogExplorer
              catalogData={catalogData}
              catalogs={catalogs}
              selectedChassis={selectedChassis}
              onSelectChassis={setSelectedChassis}
              chassisName={currentCatObj?.chassis}
              isCatalogLoading={isCatalogLoading}
              globalSearchTerm={globalSearchTerm}
              onClearSearch={() => setGlobalSearchTerm('')}
              onOpenRag={() => setIsRagOpen(true)}
              onRagQuery={handleSmartSearch}
            />
          </div>
        )}

        {/* Artifacts & Quality Audit Tab */}
        {activeTab === 'artifacts' && (
          <div key="artifacts" className="animate-tab-enter">
            <ArtifactInspector
              currentCatalog={currentCatObj}
              onAuditCatalog={() => {}}
            />
          </div>
        )}

        {/* System Telemetry & Observability Tab */}
        {activeTab === 'telemetry' && (
          <div key="telemetry" className="animate-tab-enter">
            <TelemetryCard />
          </div>
        )}

      </main>

      {/* Tool Modals triggered from Macro Flow */}
      <ToolModal 
        isOpen={activeModal === 'boqUploader'} 
        onClose={() => setActiveModal(null)}
        title="Stage 1: BOQ Quote Ingestion & 6-Aspect Math Engine"
      >
        <BoqUploader 
          onEvaluateBoq={handleEvaluateBoq} 
          evalResults={evalResults} 
          logStream={logStream}
          chassisDir={currentCatObj?.chassisDir}
          isTaskRunning={isTaskRunning}
          onOpenMatrix={() => setActiveModal('resolutionMatrix')}
          onOpenReconciliation={() => setActiveModal('reconciliation')}
        />
        {evalResults && (
          <div className="mt-6 space-y-6 animate-fade-in">
            <AmbiguityInbox 
              evalResults={evalResults} 
              chassisContext={selectedChassis || 'Unknown Chassis'} 
              onReEvaluate={(extraText) => handleEvaluateBoq({ rawText: extraText || '' })}
            />
            <WorkloadDnaCard dnaData={evalResults.workloadDna} />
          </div>
        )}
      </ToolModal>

      <ToolModal 
        isOpen={activeModal === 'resolutionMatrix'} 
        onClose={() => setActiveModal(null)}
        title="Stage 1.5: 5-Tier Strategic Resolution Matrix"
      >
        <ResolutionMatrix
          evalResults={evalResults}
          onOpenPortalFeedback={setSelectedCardForFeedback}
          selectedChassis={selectedChassis}
          onTriggerDemoBoq={handleEvaluateBoq}
        />
      </ToolModal>

      <ToolModal 
        isOpen={activeModal === 'reconciliation'} 
        onClose={() => setActiveModal(null)}
        title="Stage 3: Partner Quote Reconciliation"
      >
        <PartnerReconciliationView
          evalResults={evalResults}
          selectedChassis={selectedChassis}
          onTriggerScrape={handleTriggerScrape}
          auditReport={auditReport}
          onAuditReportChange={setAuditReport}
        />
      </ToolModal>

      {/* Drawers & General Modals */}
      <NotebookRagDrawer
        isOpen={isRagOpen}
        onClose={() => setIsRagOpen(false)}
        ragData={ragData}
        isQuerying={isQueryingRag}
        ragElapsedTime={ragElapsedTime}
        onQuerySubmit={handleSmartSearch}
        selectedChassis={selectedChassis}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <UserFeedbackDrawer
        isOpen={isFeedbackDrawerOpen}
        onClose={() => setIsFeedbackDrawerOpen(false)}
      />

      <FeedbackModal
        isOpen={!!selectedCardForFeedback}
        onClose={() => setSelectedCardForFeedback(null)}
        resolutionCard={selectedCardForFeedback}
      />

      <TraceabilityInspector
        isOpen={showTraceabilityInspector}
        onClose={() => setShowTraceabilityInspector(false)}
        traces={evalResults?.tracePayloads || []}
      />
    </div>
  );
}
