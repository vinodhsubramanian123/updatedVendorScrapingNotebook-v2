import Tooltip from './Tooltip';
import React, { useState, useEffect } from 'react';
import TaskStatusBadge from './TaskStatusBadge';
import { Play, RefreshCw, Terminal, Download, Server, Sparkles, Loader, Square, ShieldAlert, CheckCircle, Navigation, KeyRound } from 'lucide-react';
import VendorScraperProgress from './VendorScraperProgress';
import ScrapingHistorySection from './ScrapingHistorySection';


export default function ScraperTriggerCard({ logStream, isTaskRunning, onTriggerScrape, onTriggerRebuild, onTriggerDownloadPdf, onTriggerSyncKnowledge, onTriggerKillTask, onTriggerNavigate }) {
  const [scrapeMode, setScrapeMode] = useState('solution');
  const [cdpState, setCdpState] = useState({ status: 'CHECKING', message: 'Probing browser...' });
  const [logFilter, setLogFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Poll CDP state every 3 seconds if no task is running
    let interval;
    const checkCDP = async () => {
      try {
        const res = await fetch('/api/cdp-status');
        const data = await res.json();
        setCdpState(data);
      } catch {
        setCdpState({ status: 'DISCONNECTED', error: 'Backend unreachable' });
      }
    };
    
    checkCDP();
    if (!isTaskRunning) {
      interval = setInterval(checkCDP, 3000);
    }
    return () => clearInterval(interval);
  }, [isTaskRunning]);

  // Determine Scrape button state based on CDP
  const canScrape = cdpState.status === 'READY';

  return (
    <div className="space-y-6">
      {/* Control Actions Header Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-600 stroke-[2.25px]" />
              Live CDP Scraper &amp; Pipeline Controls
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute live browser scrapes, rebuild catalogs offline, or fetch QuickSpecs PDFs over port 9222.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isTaskRunning && (
              <Tooltip content="Cancel running task"><button
                onClick={onTriggerKillTask}
                className="flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-all"
                
              >
                <Square className="w-3 h-3 text-rose-600 fill-rose-600" /> Cancel Task
              </button></Tooltip>
            )}
            <TaskStatusBadge 
              status={isTaskRunning ? 'Running' : 'Pending'} 
              size="md"
            />
          </div>
        </div>

        {/* CDP Handshake Banner */}
        {!isTaskRunning && (
          <div className={`p-3 rounded-lg border mb-5 flex items-center justify-between text-xs font-medium ${
            cdpState.status === 'READY' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : cdpState.status === 'AUTHENTICATING'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              {cdpState.status === 'READY' ? <CheckCircle className="w-4 h-4 text-emerald-600" />
               : cdpState.status === 'AUTHENTICATING' ? <KeyRound className="w-4 h-4 text-amber-600" />
               : cdpState.status === 'DISCONNECTED' ? <ShieldAlert className="w-4 h-4 text-rose-500" />
               : <Navigation className="w-4 h-4 text-slate-500 animate-pulse" />}
               
              <span>
                <strong>Browser State:</strong> {
                  cdpState.status === 'READY' ? `Ready on ${(cdpState.title || 'OCA Portal Page').substring(0, 40)}...`
                  : cdpState.status === 'AUTHENTICATING' ? 'Waiting for HPE Partner Login...'
                  : cdpState.status === 'NAVIGATING' ? 'Navigate to an OCA Solution or Chassis page...'
                  : cdpState.status === 'DISCONNECTED' ? 'CDP Disconnected (Port 9222 closed)'
                  : 'Probing...'
                }
              </span>
            </div>
            {cdpState.status === 'READY' && !cdpState.isSolutionRoot && (
               <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-700">Sub-Menu Detected</span>
            )}
            {cdpState.status === 'READY' && cdpState.isSolutionRoot && (
               <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-700 font-bold">Solution Root Detected</span>
            )}
          </div>
        )}

        {/* Real-Time Visual Vendor Scraper Progress Bar */}
        <VendorScraperProgress
          logStream={logStream}
          isTaskRunning={isTaskRunning}
          onCancelTask={onTriggerKillTask}
          className="mb-6"
        />

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Live Scrape Action */}
          <div className={`rounded-xl p-4 border transition-all ${canScrape ? 'bg-blue-50/50 border-blue-200/80 shadow-sm ring-1 ring-blue-50' : 'bg-slate-50/80 border-slate-200/80 opacity-60'}`}>
            <h4 className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
              <Server className={`w-4 h-4 ${canScrape ? 'text-blue-600' : 'text-slate-400'}`} /> Live Scrape Portal
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">Target active OCA browser session to extract full SKU catalog.</p>
            
            <div className="flex items-center gap-2 mb-3">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="scrapeMode"
                  value="solution"
                  checked={scrapeMode === 'solution'}
                  onChange={() => setScrapeMode('solution')}
                  disabled={!canScrape}
                />
                Server E2E
              </label>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="scrapeMode"
                  value="storage"
                  checked={scrapeMode === 'storage'}
                  onChange={() => setScrapeMode('storage')}
                  disabled={!canScrape}
                />
                Storage Wizard
              </label>
            </div>

            {!canScrape && cdpState.status === 'DISCONNECTED' && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg mb-2">
                <strong className="block text-rose-900 text-[11px] font-bold mb-1.5">Chrome CDP Port 9222 Offline</strong>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/launch-browser', { method: 'POST' });
                    } catch (e) {
                      console.error('Failed to launch browser', e);
                    }
                  }}
                  className="w-full justify-center text-xs btn-primary bg-rose-600 hover:bg-rose-500 py-1.5 mb-1.5"
                >
                  <Server className="w-3.5 h-3.5 inline mr-1" /> Launch Scraper Browser
                </button>
                <div className="text-[10px] text-rose-700 leading-tight">
                  Note: After launch, you must log in at partner.hpe.com and click the OCA Configurator link manually.
                </div>
              </div>
            )}
            
            {!canScrape && cdpState.status !== 'DISCONNECTED' && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 mb-2 leading-relaxed">
                <strong className="block text-amber-900 font-bold mb-0.5">Browser is on a non-OCA page.</strong>
                1. Ensure you have completed SSO login.<br/>
                2. Click the 'OCA Configurator' link manually in the browser.<br/>
                3. Wait for the OCA portal to fully load.
              </div>
            )}

            <button
              onClick={() => {
                if (!canScrape) {
                  alert("❌ Chrome CDP Port 9222 is not attached to the HPE OCA portal page.\n\nPlease ensure Chrome is started with --remote-debugging-port=9222 and navigated to the HPE OCA portal, or use 'Rebuild Catalogs Offline' below.");
                  return;
                }
                onTriggerScrape(scrapeMode);
              }}
              disabled={isTaskRunning}
              className={`w-full justify-center text-xs mb-2 ${canScrape ? 'btn-primary' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 font-semibold py-2 px-4 rounded-lg cursor-pointer'}`}
              title={canScrape ? "Start Scraping" : "Click for connection instructions"}
            >
              {isTaskRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {canScrape ? 'Start Scrape' : 'Live Scrape Disabled (CDP Port Unattached)'}
            </button>
            
            {/* FB-5: Auto-Navigate Button */}
            {!canScrape && cdpState.status !== 'DISCONNECTED' && (
              <button
                onClick={onTriggerNavigate}
                disabled={isTaskRunning}
                className="w-full justify-center text-xs btn-secondary"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-600" /> Auto-Navigate to OCA
              </button>
            )}
          </div>

          {/* Offline Rebuild Action */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80">
            <h4 className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-blue-600" /> Rebuild Catalogs Offline
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Re-parse existing raw JSON extractions into fresh Excel catalogs.</p>
            
            <button
              onClick={onTriggerRebuild}
              disabled={isTaskRunning}
              className="w-full btn-secondary justify-center text-xs disabled:opacity-50"
            >
              {isTaskRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
              Rebuild All
            </button>
          </div>

          {/* Download QuickSpecs PDF */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80">
            <h4 className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-amber-600" /> Download QuickSpecs PDF
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Fetch official QuickSpecs PDF documentation for active chassis.</p>
            
            <button
              onClick={onTriggerDownloadPdf}
              disabled={isTaskRunning}
              className="w-full btn-secondary justify-center text-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              Fetch PDF
            </button>
          </div>

          {/* Knowledge Sync */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-blue-200/80 col-span-full md:col-span-1">
            <h4 className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" /> Sync Knowledge to NotebookLM
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Push all learned KnowledgeDeltas and catalog updates to your Gemini Notebooks for RAG queries.</p>
            
            <button
              onClick={onTriggerSyncKnowledge}
              disabled={isTaskRunning}
              className="w-full btn-primary justify-center text-xs disabled:opacity-50"
            >
              {isTaskRunning
                ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Running...</>
                : <><Sparkles className="w-3.5 h-3.5" /> Sync Knowledge</>
              }
            </button>
          </div>

        </div>
      </div>

      {/* Real-Time SSE Log Terminal */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-600" /> Real-Time Terminal Output Stream (SSE)
            </h3>
            <span className="mono text-[11px] text-slate-400">Streamed via /api/stream-logs</span>
          </div>
          
          {/* FB-4: Interactive Logger Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-2 pr-6 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 p-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-700 focus:outline-none [color-scheme:light]"
            >
              <option value="ALL">All Logs</option>
              <option value="ERROR">Errors/Fails</option>
              <option value="INFO">Info</option>
              <option value="PASS">Pass/Success</option>
            </select>
            <button
              onClick={() => {
                const blob = new Blob([logStream.map(l => `[${l.timestamp}] ${l.text}`).join('\n')], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `pipeline_logs_${Date.now()}.txt`;
                a.click();
              }}
              className="btn-secondary text-[10px] px-2 py-1 h-auto min-h-0"
              
            >
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>

        <div className="terminal-view">
          {logStream.length === 0 ? (
            <p className="text-slate-500 italic">Terminal ready. Trigger an action above to view live logs...</p>
          ) : (
            logStream
              .filter(log => {
                const text = log.text || '';
                if (searchQuery && !text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                
                const isPass = log.level === 'pass' || log.level === 'success' || /\b(PASS|SUCCESS)\b/.test(text) || text.includes('✅');
                const isErr = log.level === 'error' || log.stream === 'stderr' || /\b(FAIL|ERROR|FAILED)\b/.test(text) || text.includes('❌');
                const isInfo = log.level === 'info' || /\b(NAV|STEP|BUILD|AUDIT)\b/.test(text) || text.includes('⚡') || text.includes('⏳');
                
                if (logFilter === 'ERROR' && !isErr) return false;
                if (logFilter === 'PASS' && !isPass) return false;
                if (logFilter === 'INFO' && !isInfo) return false;
                
                return true;
              })
              .map((log, i) => {
              const text = log.text || '';
              const isPass = log.level === 'pass' || log.level === 'success' || /\b(PASS|SUCCESS)\b/.test(text) || text.includes('✅');
              const isErr = log.level === 'error' || log.stream === 'stderr' || /\b(FAIL|ERROR|FAILED)\b/.test(text) || text.includes('❌');
              const isInfo = log.level === 'info' || /\b(NAV|STEP|BUILD|AUDIT)\b/.test(text) || text.includes('⚡') || text.includes('⏳');

              return (
                <div key={i} className={`terminal-line ${isPass ? 'pass' : isErr ? 'error' : isInfo ? 'info' : ''}`}>
                  {text}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Persisted Scraping History Section */}
      <ScrapingHistorySection
        onTriggerScrape={onTriggerScrape}
        onTriggerRebuild={onTriggerRebuild}
        isTaskRunning={isTaskRunning}
      />
    </div>
  );
}
