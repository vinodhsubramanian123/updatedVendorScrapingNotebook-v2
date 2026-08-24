import React, { useState, useEffect } from 'react';
import { BookOpen, X, Sparkles, AlertTriangle, Search, RefreshCw, Thermometer, Zap, Database, Cpu, Layers, ShieldCheck, Terminal, Code, Clock } from 'lucide-react';

const HARDCODED_SCENARIOS = [
  {
    id: 'THERMAL_TDP',
    title: 'Thermal Fan Check',
    icon: Thermometer,
    query: 'Does an Intel Xeon Platinum 8480+ (350W TDP) processor require High Performance Fan Kits and Heatsinks on DL380 Gen12?',
    badge: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'TELCO_DC',
    title: 'Telco -48VDC Lug Kit',
    icon: Zap,
    query: 'When selecting 800W -48VDC Flex Slot Power Supplies on DL360 Gen12, is the DC power cable lug kit mandatory?',
    badge: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'STORAGE_CACHE',
    title: 'Storage Cache Battery',
    icon: Database,
    query: 'Does the HPE Smart Array P408i-a SR Gen10 Controller require an HPE Smart Storage Hybrid Capacitor or Battery Backup Kit?',
    badge: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'MEMORY_SYMMETRY',
    title: 'Memory Channel Balance',
    icon: Cpu,
    query: 'What are the DIMM interleaving and channel symmetry rules when installing 12x 64GB DDR5 DIMMs across 2 sockets?',
    badge: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'PROCESSOR_SPECS',
    title: '64+ Core CPU Rules',
    icon: Sparkles,
    query: 'What are the power supply, memory speed, and thermal fan rules for 64-core processors in DL380 Gen12?',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'PCIE_EXPANSION',
    title: 'PCIe Slot & Risers',
    icon: Layers,
    query: 'Can Primary Riser 1 and Secondary Riser 2 be populated simultaneously with GPU cards without a second CPU?',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'AMBIGUITY_HITL',
    title: 'Code Strip & Ambiguity',
    icon: Code,
    query: 'const fs = require("fs"); function check() { return process.env; } Is P49025-B21 compatible with P76453-B21 on DL380 Gen12?',
    badge: 'bg-slate-100 text-slate-700 border-slate-300'
  }
];

export default function NotebookRagDrawer({ isOpen, onClose, ragData, isQuerying, onQuerySubmit, selectedChassis, ragElapsedTime }) {
  const [drawerQuery, setDrawerQuery] = useState('');
  const [showSanitizationDetails, setShowSanitizationDetails] = useState(false);
  const [scenariosList, setScenariosList] = useState(HARDCODED_SCENARIOS);
  const [activeTab, setActiveTab] = useState('QUERY'); // 'QUERY' | 'HISTORY'
  const [historyList, setHistoryList] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch telemetry history and scenario templates
      fetch('/api/notebooklm-consultations')
        .then(res => res.json())
        .then(data => {
          if (data.log) setHistoryList(data.log);
        })
        .catch(() => {});

      fetch('/api/notebook-scenarios')
        .then(res => res.json())
        .then(data => {
          if (data.scenarios && data.scenarios.length > 0) {
            const mapped = data.scenarios.map(s => {
              const matchedIcon = s.id === 'THERMAL_TDP' ? Thermometer :
                s.id === 'TELCO_DC' ? Zap :
                s.id === 'STORAGE_CACHE' ? Database :
                s.id === 'MEMORY_SYMMETRY' ? Cpu :
                s.id === 'PCIE_EXPANSION' ? Layers :
                s.id === 'AMBIGUITY_HITL' ? Code : Sparkles;
              return { ...s, icon: matchedIcon };
            });
            setScenariosList(mapped);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInlineSearch = (e) => {
    if (e) e.preventDefault();
    if (!drawerQuery.trim() || !onQuerySubmit) return;
    onQuerySubmit(drawerQuery);
  };

  const handleScenarioClick = (scenarioQuery) => {
    setDrawerQuery(scenarioQuery);
    if (onQuerySubmit) onQuerySubmit(scenarioQuery);
  };

  const isFallback = ragData && (
    ragData.source === 'FALLBACK' ||
    ragData.source === 'LOCAL_FALLBACK' ||
    (ragData.answer && ragData.answer.toLowerCase().includes('fallback'))
  );

  const sanitization = ragData?.sanitizationDetails;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 p-6 overflow-y-auto transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              Gemini NotebookLM RAG Engine
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono font-bold">
                Traceable RAG
              </span>
            </h3>
            {selectedChassis && (
              <p className="text-[11px] font-medium text-slate-500">Active Chassis Scope: {selectedChassis}</p>
            )}
          </div>
        </div>
        <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => setActiveTab('QUERY')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'QUERY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          RAG Query & Scenarios
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'HISTORY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Consultation History Ledger
          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full text-[10px]">
            {historyList.length}
          </span>
        </button>
      </div>

      {activeTab === 'HISTORY' ? (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> Past NotebookLM RAG Consultations
          </h4>
          {historyList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No historical RAG consultations logged in current session.
            </div>
          ) : (
            <div className="space-y-2">
              {historyList.map((entry, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className="badge badge-emerald font-semibold">
                      {Math.round((entry.agreementScore || 0.95) * 100)}% Match
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 line-clamp-2">"{entry.query}"</p>
                  <p className="text-slate-600 line-clamp-3 text-[11px] leading-relaxed bg-white p-2 rounded border border-slate-100">
                    {entry.answer}
                  </p>
                  {entry.citations && entry.citations.length > 0 && (
                    <div className="text-[10px] text-blue-600 font-medium">
                      {entry.citations.length} citation(s) grounded against QuickSpecs
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Inline RAG Query Input */}
          <form onSubmit={handleInlineSearch} className="mb-4">
            <div className="relative flex items-center">
              <input
                type="text"
                value={drawerQuery}
                onChange={(e) => setDrawerQuery(e.target.value)}
                placeholder={`Ask NotebookLM about ${selectedChassis || 'chassis rules'}...`}
                className="w-full pl-8 pr-20 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
              <button
                type="submit"
                disabled={isQuerying || !drawerQuery.trim()}
                className="absolute right-1 px-3 py-1.5 text-[11px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 disabled:opacity-50 shadow-sm"
              >
                {isQuerying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Ask RAG</span>
              </button>
            </div>
          </form>

          {/* Quick Scenario Preset Chips */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> One-Click Scenario Evaluation Presets:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {scenariosList.map((sc) => {
                const IconComponent = sc.icon || Sparkles;
                return (
                  <button
                    key={sc.id}
                    onClick={() => handleScenarioClick(sc.query)}
                    disabled={isQuerying}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 hover:scale-[1.02] ${
                      sc.badge || 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title={sc.description || sc.query}
                  >
                    <IconComponent className="w-3 h-3 shrink-0" />
                    <span>{sc.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isQuerying ? (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold animate-pulse">
                  <Sparkles className="w-4 h-4" /> Querying NotebookLM RAG via nlm CLI...
                </div>
                {ragElapsedTime > 0 && (
                  <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {ragElapsedTime.toFixed(1)}s elapsed
                  </div>
                )}
              </div>
              <div className="h-6 skeleton w-3/4 rounded-lg"></div>
              <div className="h-24 skeleton w-full rounded-xl"></div>
              <div className="h-12 skeleton w-5/6 rounded-lg"></div>
            </div>
          ) : ragData ? (
            <div className="space-y-4">
              {/* Timing & Latency Breakdown Banner */}
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Input Query
                  </div>
                  {ragData.durationMs && (
                    <div className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200/60">
                      Total Latency: {ragData.durationMs < 1000 ? `${ragData.durationMs}ms` : `${(ragData.durationMs / 1000).toFixed(2)}s`}
                    </div>
                  )}
                </div>
                <p className="text-xs text-blue-800 italic font-medium">"{ragData.query}"</p>

                {ragData.scenario && (
                  <div className="flex items-center gap-2 pt-1 border-t border-blue-100">
                    <span className="text-[10px] font-bold text-blue-900 uppercase">Scenario:</span>
                    <span className="bg-blue-200/60 text-blue-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      {ragData.scenario}
                    </span>
                  </div>
                )}

                {/* Toggle Sanitization Transparency Details */}
                <button
                  onClick={() => setShowSanitizationDetails(!showSanitizationDetails)}
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 pt-1 underline"
                >
                  <Terminal className="w-3 h-3" />
                  {showSanitizationDetails ? 'Hide Sanitization & Payload Details' : 'Inspect Sanitization & CLI Payload'}
                </button>

                {showSanitizationDetails && sanitization && (
                  <div className="mt-2 text-[10px] bg-slate-900 text-slate-100 p-3 rounded-lg font-mono space-y-2 overflow-x-auto">
                    <div>
                      <span className="text-indigo-400 font-bold">Raw Input:</span>
                      <p className="text-slate-300 break-words">{sanitization.rawQuery || ragData.query}</p>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold">Sanitized Query Sent to NotebookLM:</span>
                      <p className="text-emerald-200 break-words">{sanitization.sanitizedQuery}</p>
                    </div>
                    {sanitization.extractedSkus && sanitization.extractedSkus.length > 0 && (
                      <div>
                        <span className="text-amber-400 font-bold">Extracted HPE SKUs:</span>
                        <p className="text-amber-200">{sanitization.extractedSkus.join(', ')}</p>
                      </div>
                    )}
                    {sanitization.sanitizationSteps && (
                      <div>
                        <span className="text-sky-400 font-bold">Pre-processing Pipeline Steps:</span>
                        <ul className="list-disc pl-3 text-slate-300 space-y-0.5">
                          {sanitization.sanitizationSteps.map((step, sIdx) => (
                            <li key={sIdx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sanitization.cliCommandPreview && (
                      <div className="pt-1 border-t border-slate-800">
                        <span className="text-purple-400 font-bold">CLI Execution Payload:</span>
                        <p className="text-slate-400 break-all">{sanitization.cliCommandPreview}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Answer Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    {isFallback ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {isFallback ? 'Fallback Answer (Local Conflict Engine):' : 'Grounded RAG Answer & Spec Rationale:'}
                  </h4>
                  {isFallback && (
                    <span className="badge badge-amber text-[10px]">Local Conflict Engine</span>
                  )}
                </div>
                <div className={`text-xs space-y-2 leading-relaxed p-4 rounded-xl border whitespace-pre-line shadow-sm ${
                  isFallback ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  {ragData.answer}
                </div>
              </div>

              {/* Diagnostic Remediation Panel if Fallback or Diagnostic exists */}
              {ragData.diagnostic && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1 text-rose-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Diagnostic Classification: {ragData.diagnostic.errorType}
                  </div>
                  <p className="text-[11px] text-rose-800">{ragData.diagnostic.rootCause}</p>
                  <div className="bg-white p-2 rounded border border-rose-200 text-[10px] font-mono font-semibold text-slate-800">
                    Remediation: {ragData.diagnostic.remediationAction}
                  </div>
                </div>
              )}

              {/* Citations & QuickSpecs Grounding References */}
              {ragData.citations && ragData.citations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" /> QuickSpecs Citations & References:
                  </h4>
                  <div className="space-y-2">
                    {ragData.citations.map((cite, i) => (
                      <div key={i} className="text-[11px] p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 space-y-1 shadow-sm">
                        <p className="font-bold text-slate-900 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                          {cite.source || `QuickSpecs Citation ${i+1}`}
                        </p>
                        <p className="text-slate-600 text-[11px] leading-relaxed italic bg-white p-2 rounded border border-slate-100">
                          "{cite.snippet || cite.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Gemini NotebookLM RAG Ready</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Type a question above or click one of the preset scenario chips to evaluate QuickSpecs configuration rules.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </div>
  );
}
