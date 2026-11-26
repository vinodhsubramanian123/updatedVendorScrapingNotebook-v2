import React from 'react';
import { BookOpen, Sparkles, AlertTriangle, ShieldCheck, Terminal, Clock } from 'lucide-react';

export function formatQueryString(val) {
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    return val.query || val.rawQuery || val.sanitizedQuery || JSON.stringify(val);
  }
  return String(val || '');
}

function isRagFallbackData(ragData) {
  if (!ragData) return false;
  const fallbackSources = new Set(['FALLBACK', 'LOCAL_FALLBACK', 'LOCAL_RAG_FALLBACK']);
  if (fallbackSources.has(ragData.source) || ragData.isCloudGrounded === false || ragData.cloudUnavailableReason) {
    return true;
  }
  return Boolean(ragData.answer && ragData.answer.toLowerCase().includes('fallback'));
}

export function RagHistoryTabView({ historyList }) {
  return (
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
                <span className="badge badge-emerald font-semibold tabular-nums">
                  {Math.round((entry.agreementScore || 0.95) * 100)}% Match
                </span>
              </div>
              <p className="font-semibold text-slate-800 line-clamp-2">"{formatQueryString(entry.query)}"</p>
              <p className="text-slate-600 line-clamp-3 text-[11px] leading-relaxed bg-white p-2 rounded border border-slate-100">
                {entry.answer}
              </p>
              {entry.citations?.length > 0 && (
                <div className="text-[10px] text-blue-600 font-medium">
                  {entry.citations.length} citation(s) grounded against QuickSpecs
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SanitizationDetailsBox({ sanitization, rawQueryFallback }) {
  if (!sanitization) return null;
  return (
    <div className="mt-2 text-[10px] terminal-console space-y-2">
      <div>
        <span className="text-indigo-400 font-bold">Raw Input:</span>
        <p className="text-slate-300 break-words">{formatQueryString(sanitization.rawQuery || rawQueryFallback)}</p>
      </div>
      <div>
        <span className="text-emerald-400 font-bold">Sanitized Query Sent to NotebookLM:</span>
        <p className="text-emerald-200 break-words">{sanitization.sanitizedQuery}</p>
      </div>
      {sanitization.extractedSkus?.length > 0 && (
        <div>
          <span className="text-amber-400 font-bold">Extracted HPE SKUs:</span>
          <p className="text-amber-200">{sanitization.extractedSkus.join(', ')}</p>
        </div>
      )}
      {sanitization.sanitizationSteps && (
        <div>
          <span className="text-sky-400 font-bold">Pre-processing Pipeline Steps:</span>
          <ul className="list-disc pl-3 text-slate-300 space-y-0.5">
            {sanitization.sanitizationSteps.map((step, sIdx) => <li key={sIdx}>{step}</li>)}
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
  );
}

export function RagResultCard({ ragData, showSanitizationDetails, onToggleSanitization }) {
  const isFallback = isRagFallbackData(ragData);
  const latencyLabel = ragData.durationMs
    ? (ragData.durationMs < 1000 ? `${ragData.durationMs}ms` : `${(ragData.durationMs / 1000).toFixed(2)}s`)
    : null;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/70 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Input Query
          </div>
          {latencyLabel && (
            <span className="badge badge-blue tabular-nums">Latency: {latencyLabel}</span>
          )}
        </div>
        <p className="text-xs text-blue-800 italic font-medium">"{formatQueryString(ragData.query)}"</p>

        {ragData.scenario && (
          <div className="flex items-center gap-2 pt-1 border-t border-blue-200/60">
            <span className="text-[10px] font-bold text-blue-900 uppercase">Scenario:</span>
            <span className="badge badge-slate font-mono">{ragData.scenario}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleSanitization}
          className="text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
        >
          <Terminal className="w-3 h-3" />
          {showSanitizationDetails ? 'Hide Sanitization & Payload Details' : 'Inspect Sanitization & CLI Payload'}
        </button>

        {showSanitizationDetails && (
          <SanitizationDetailsBox sanitization={ragData?.sanitizationDetails} rawQueryFallback={formatQueryString(ragData.query)} />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            {isFallback ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
            {isFallback ? 'Fallback Answer (Local Conflict Engine)' : 'Grounded RAG Answer & Spec Rationale'}
          </h4>
          {isFallback && <span className="badge badge-amber">LOCAL RAG FALLBACK</span>}
        </div>
        <div className={`text-xs space-y-2 leading-relaxed p-4 rounded-xl border whitespace-pre-line ${
          isFallback ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}>
          {ragData.cloudUnavailableReason && (
            <div className="font-semibold text-[11px] text-amber-900 bg-amber-100/80 border border-amber-300 rounded px-2 py-1">
              Cloud grounding unavailable: {ragData.cloudUnavailableReason}
            </div>
          )}
          {ragData.answer}
        </div>
      </div>

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

      {ragData.citations?.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> QuickSpecs Citations & References
          </h4>
          <div className="space-y-2">
            {ragData.citations.map((cite, i) => (
              <div key={i} className="text-[11px] p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  {cite.source || `QuickSpecs Citation ${i + 1}`}
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
  );
}
