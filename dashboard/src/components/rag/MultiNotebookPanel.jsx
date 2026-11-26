import React, { useState, useRef, useEffect } from 'react';
import { Layers, Loader, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { postJson } from '../../services/api.js';

const DEFAULT_PLATFORMS = ['DL380_Gen12', 'DL360_Gen12', 'DL380a_Gen12', 'Alletra_MP_B10000'];

const STATUS_BADGE_MAP = {
  VERIFIED_GROUNDED: 'badge-emerald',
  LOCAL_FALLBACK: 'badge-amber',
  UNMAPPED: 'badge-slate',
  UNAVAILABLE: 'badge-rose'
};

export default function MultiNotebookPanel({ availablePlatforms = DEFAULT_PLATFORMS, initialChassis, localOnly = false }) {
  const [selected, setSelected] = useState(() => {
    const initial = initialChassis ? [initialChassis] : [];
    const merged = [...new Set([...initial, 'DL380_Gen12', 'DL360_Gen12'])];
    return merged.slice(0, 3);
  });
  const [query, setQuery] = useState('Verify PCIe riser, OCP 3.0 slot limits, and thermal fan rules');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const togglePlatform = (id) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id].slice(0, 5)));
  };

  const handleFanOut = async (e) => {
    e.preventDefault();
    if (!query.trim() || selected.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const domains = selected.map(productKey => ({ productKey, query: `${query.trim()} for ${productKey}` }));
      const data = await postJson('/api/multi-notebook-query', { domains, offline: localOnly }, { signal: controller.signal, timeoutMs: 120000 });
      if (!controller.signal.aborted) setReport(data);
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleFanOut} className="space-y-3">
        <div>
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
            Select QuickSpecs Notebooks (up to 5)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availablePlatforms.map(id => {
              const active = selected.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  disabled={!active && selected.length >= 5}
                  onClick={() => togglePlatform(id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                    active ? 'badge-emerald' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {id.replaceAll('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Compare QuickSpecs rules across selected notebooks..."
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            type="submit"
            disabled={loading || !query.trim() || selected.length === 0}
            className="btn-primary text-xs shrink-0"
          >
            {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Fan-Out Query</span>
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Multi-Notebook Grounding ({report.verifiedCount}/{report.totalDomains} Cloud Grounded)</span>
            </div>
            <span className={`badge ${report.allGrounded ? 'badge-emerald' : 'badge-amber'}`}>
              {report.allGrounded ? 'ALL DOMAINS GROUNDED' : 'PARTIAL / FALLBACK'}
            </span>
          </div>

          <div className="space-y-2">
            {(report.results || []).map((item, idx) => (
              <div key={`${item.productKey}-${idx}`} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{item.productKey.replaceAll('_', ' ')}</span>
                  <span className={`badge ${STATUS_BADGE_MAP[item.status] || 'badge-slate'}`}>
                    {item.isCloudGrounded ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {item.status}
                  </span>
                </div>
                {item.answer && <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">{item.answer}</p>}
                {item.error && <p className="text-[11px] text-rose-700">{item.error}</p>}
                {item.citations?.length > 0 && (
                  <p className="text-[10px] text-slate-500 font-mono">{item.citations.length} citation(s)</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
