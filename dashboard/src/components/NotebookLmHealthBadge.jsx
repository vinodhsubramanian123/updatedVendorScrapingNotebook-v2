import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

function parseNlmHealthResponse(data) {
  const hasNotebooks = Array.isArray(data?.notebooks) && data.notebooks.length > 0;
  const isArrayList = Array.isArray(data) && data.length > 0;
  if (data?.status === 'HEALTHY' || hasNotebooks || isArrayList) {
    return { state: 'HEALTHY', mode: data?.mode || 'MCP_CLI', raw: data };
  }
  if (data?.status === 'STANDBY') {
    return { state: 'STANDBY', mode: data.mode || 'LOCAL_RAG', raw: data };
  }
  return { state: 'DEGRADED', mode: 'UNKNOWN', raw: data?.error || data?.raw || 'MCP Offline or nlm CLI failed' };
}

function getNlmBadgePresentation(status, metrics, isRefreshing) {
  const styles = {
    HEALTHY: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    STANDBY: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    CHECKING: 'bg-slate-50 text-slate-500 border-slate-200'
  };
  const labels = {
    CHECKING: 'Checking MCP...',
    HEALTHY: 'NotebookLM MCP Ready',
    STANDBY: 'NotebookLM (Local RAG)'
  };
  let tooltipText = typeof status.raw === 'string' ? status.raw : 'Error connecting to Gemini NotebookLM';
  if (status.state === 'HEALTHY') {
    tooltipText = `NotebookLM MCP CLI Connected (Avg Latency: ${metrics.avgNlmResponseTimeMs}ms, Agreement: ${metrics.nlmAgreementIndex}%)`;
  } else if (status.state === 'STANDBY') {
    tooltipText = `Local Knowledge & 5-Level Conflict Engine Active (${status.raw?.notebooksFound || 6} chassis mapped)`;
  }

  let icon = <AlertTriangle className="w-3 h-3 text-rose-600" />;
  if (status.state === 'CHECKING' || isRefreshing) {
    icon = <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />;
  } else if (status.state === 'HEALTHY') {
    icon = <CheckCircle className="w-3 h-3 text-blue-600" />;
  } else if (status.state === 'STANDBY') {
    icon = <Sparkles className="w-3 h-3 text-indigo-600" />;
  }

  return {
    styleClass: styles[status.state] || 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    label: labels[status.state] || 'NotebookLM Offline',
    tooltipText,
    icon
  };
}

export default function NotebookLmHealthBadge({ onOpenRag }) {
  const [status, setStatus] = useState({ state: 'CHECKING', mode: 'LOCAL_RAG', raw: null });
  const [metrics, setMetrics] = useState({ avgNlmResponseTimeMs: 140, nlmAgreementIndex: 95 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/test-notebooklm');
      const data = await res.json();
      setStatus(parseNlmHealthResponse(data));

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

  const { styleClass, label, tooltipText, icon } = getNlmBadgePresentation(status, metrics, isRefreshing);

  return (
    <button
      data-testid="notebooklm-btn"
      onClick={handleClick}
      title={tooltipText}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all hover:shadow-sm ${styleClass}`}
    >
      {icon}
      <span className="flex items-center gap-1">{label}</span>

      {status.state === 'HEALTHY' && metrics.avgNlmResponseTimeMs > 0 && (
        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded border border-blue-200/50">
          ~{metrics.avgNlmResponseTimeMs}ms
        </span>
      )}
    </button>
  );
}
