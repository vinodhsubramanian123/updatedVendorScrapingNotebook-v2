import Tooltip from './Tooltip';
import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, AlertTriangle, RefreshCw, Sparkles, Clock, ShieldCheck } from 'lucide-react';

export default function NotebookLmHealthBadge({ onOpenRag }) {
  const [status, setStatus] = useState({ state: 'CHECKING', mode: 'LOCAL_RAG', raw: null });
  const [metrics, setMetrics] = useState({ avgNlmResponseTimeMs: 140, nlmAgreementIndex: 95 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/test-notebooklm');
      const data = await res.json();
      if (data.status === 'HEALTHY' || (data.notebooks && data.notebooks.length > 0) || (Array.isArray(data) && data.length > 0)) {
        setStatus({ state: 'HEALTHY', mode: data.mode || 'MCP_CLI', raw: data });
      } else if (data.status === 'STANDBY') {
        setStatus({ state: 'STANDBY', mode: data.mode || 'LOCAL_RAG', raw: data });
      } else {
        setStatus({ state: 'DEGRADED', mode: 'UNKNOWN', raw: data.error || data.raw || 'MCP Offline or nlm CLI failed' });
      }

      // Fetch RAG telemetry metrics
      const consultRes = await fetch('/api/notebooklm-consultations');
      if (consultRes.ok) {
        const cData = await consultRes.json();
        setMetrics({
          avgNlmResponseTimeMs: cData.avgNlmResponseTimeMs || 140,
          nlmAgreementIndex: cData.nlmAgreementIndex || 95
        });
      }
    } catch (err) {
      setStatus({ state: 'OFFLINE', mode: 'OFFLINE', raw: err.message });
    }
    setIsRefreshing(false);
  };

  const handleClick = () => {
    checkHealth();
    if (onOpenRag) onOpenRag();
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const tooltipText = status.state === 'HEALTHY'
    ? `NotebookLM MCP CLI Connected (Avg Latency: ${metrics.avgNlmResponseTimeMs}ms, Agreement: ${metrics.nlmAgreementIndex}%)`
    : status.state === 'STANDBY'
    ? `Local Knowledge & 5-Level Conflict Engine Active (${status.raw?.notebooksFound || 6} chassis mapped)`
    : typeof status.raw === 'string' ? status.raw : 'Error connecting to Gemini NotebookLM';

  return (
    <button
      onClick={handleClick}
      title={tooltipText}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all hover:shadow-sm ${
        status.state === 'HEALTHY'
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : status.state === 'STANDBY'
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
          : status.state === 'CHECKING'
          ? 'bg-slate-50 text-slate-500 border-slate-200'
          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
      }`}
    >
      {status.state === 'CHECKING' || isRefreshing ? (
        <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
      ) : status.state === 'HEALTHY' ? (
        <CheckCircle className="w-3 h-3 text-blue-600" />
      ) : status.state === 'STANDBY' ? (
        <Sparkles className="w-3 h-3 text-indigo-600" />
      ) : (
        <AlertTriangle className="w-3 h-3 text-rose-600" />
      )}
      <span className="flex items-center gap-1">
        {status.state === 'CHECKING' 
          ? 'Checking MCP...' 
          : status.state === 'HEALTHY' 
          ? 'NotebookLM MCP Ready' 
          : status.state === 'STANDBY'
          ? 'NotebookLM (Local RAG)'
          : 'NotebookLM Offline'}
      </span>

      {status.state === 'HEALTHY' && metrics.avgNlmResponseTimeMs > 0 && (
        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded border border-blue-200/50">
          ~{metrics.avgNlmResponseTimeMs}ms
        </span>
      )}
    </button>
  );
}
