import React, { useState } from 'react';
import { X, Activity, Search, Database, Cpu, ChevronRight, FileJson, Copy, CheckCircle2 } from 'lucide-react';

export default function TraceabilityInspector({ traces = [], isOpen, onClose }) {
  const [activeTraceIndex, setActiveTraceIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (payload) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTrace = traces[activeTraceIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Traceability Payload Inspector
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">Observability</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Deep observability into Agentic MCP calls, RAG Context, and Rule Engine JSON data.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Timeline Sidebar */}
          <div className="w-1/3 min-w-[250px] bg-slate-900/30 border-r border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Execution Traces</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {traces.length === 0 ? (
                <div className="text-center p-6 text-slate-500 text-xs">No traces available for this run.</div>
              ) : (
                traces.map((trace, idx) => {
                  const isActive = idx === activeTraceIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveTraceIndex(idx)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                        isActive 
                          ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                          : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                          {trace.stage.includes('Rule') ? <Cpu className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isActive ? 'text-indigo-100' : 'text-slate-300'}`}>
                            {trace.stage}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">
                            {new Date(trace.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-indigo-400 translate-x-1' : 'text-slate-600'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Payload View */}
          <div className="flex-1 flex flex-col bg-[#0d1117]">
            {activeTrace ? (
              <>
                <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono text-slate-300">Payload Request/Response Object</span>
                  </div>
                  <button 
                    onClick={() => handleCopy(activeTrace.payload)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 text-[13px] font-mono leading-relaxed text-slate-300">
                  <pre className="p-4 rounded-xl bg-[#090c10] border border-slate-800/60 overflow-x-auto shadow-inner">
                    <code className="language-json">
                      {JSON.stringify(activeTrace.payload, null, 2)}
                    </code>
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Search className="w-12 h-12 text-slate-700" />
                <p className="text-sm">Select a trace to view its payload</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
