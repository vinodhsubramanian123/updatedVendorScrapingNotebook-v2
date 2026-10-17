import React, { useState } from 'react';

/**
 * PlatformDisambiguationCard.jsx — Human-in-the-Loop Platform Selection Card
 *
 * Renders an interactive disambiguation card when the evaluator returns
 * status: 'ACTION_REQUIRED' with code: 'PLATFORM_CLARIFICATION_REQUIRED'.
 * Allows presales engineers to select target chassis candidates with 1 click.
 */
export default function PlatformDisambiguationCard({ evalResults, onSelectCandidate, onDismiss }) {
  const candidates = evalResults?.clarificationCandidates || [];
  const [selected, setSelected] = useState(candidates[0] || '');

  if (!evalResults?.clarificationRequired || candidates.length === 0) return null;

  return (
    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-sm space-y-4 animate-tab-enter">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-amber-100 rounded-xl text-amber-700 text-lg">🧭</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-amber text-xs">HITL Required</span>
              <span className="text-xs font-semibold text-amber-900 tracking-wide uppercase">Platform Clarification</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {evalResults.clarificationQuestion?.question || 'Multiple hardware product candidates match your query'}
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              {evalResults.error || evalResults.message || 'Please specify the target platform generation to continue automated deterministic evaluation and CLIC validation.'}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
        {candidates.map((cand) => (
          <label
            key={cand}
            className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
              selected === cand
                ? 'bg-amber-100/60 border-amber-400 text-amber-950 ring-2 ring-amber-300/40 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="platformCandidate"
              value={cand}
              checked={selected === cand}
              onChange={() => setSelected(cand)}
              className="text-amber-600 focus:ring-amber-500"
            />
            <span className="font-mono">{cand}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-amber-200/50">
        <span className="text-[11px] text-slate-500">
          Selected platform will be locked into session context and evaluation restarted automatically.
        </span>
        <button
          onClick={() => onSelectCandidate(selected)}
          disabled={!selected}
          className="btn btn-primary text-xs px-4 py-2"
        >
          Confirm & Re-Evaluate →
        </button>
      </div>
    </div>
  );
}
