import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function RagPlayground() {
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleRagQuery = async () => {
    if (!ragQuery.trim()) return;
    setIsQuerying(true);
    setRagResult(null);
    try {
      const res = await fetch('/api/notebook-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery, chassisId: 'general-playground' })
      });
      const data = await res.json();
      setRagResult(data);
    } catch (err) {
      setRagResult({ error: err.message });
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50/30">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-600" /> Gemini NotebookLM RAG Playground
      </h3>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={ragQuery}
          onChange={(e) => setRagQuery(e.target.value)}
          placeholder="Ask NotebookLM a general question about the catalog..."
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => { if (e.key === 'Enter') handleRagQuery(); }}
        />
        <button
          onClick={handleRagQuery}
          disabled={isQuerying || !ragQuery.trim()}
          className="btn-primary text-xs shrink-0 disabled:opacity-50"
        >
          {isQuerying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isQuerying ? 'Querying...' : 'Run Search'}
        </button>
      </div>
      {ragResult && (
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-700 max-h-64 overflow-y-auto">
          {ragResult.error ? (
            <div className="text-rose-600 font-semibold">{ragResult.error}</div>
          ) : (
            <>
              <div className="font-semibold text-slate-900 mb-2 border-b border-slate-100 pb-2 flex justify-between items-center">
                <span>RAG Answer</span>
                {ragResult.source && <span className="badge badge-amber">Source: {ragResult.source}</span>}
              </div>
              <div className="leading-relaxed space-y-2 whitespace-pre-wrap">{ragResult.answer}</div>
              {ragResult.citations && ragResult.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="font-bold text-slate-900 mb-2">Citations:</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500">
                    {ragResult.citations.map((c, i) => (
                      <li key={i}>{c.source || 'QuickSpecs'} — {c.snippet}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
