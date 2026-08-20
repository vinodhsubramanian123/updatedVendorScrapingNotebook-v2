import React from 'react';
import { Sparkles, BookOpen, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function ReconciliationActionPanel({
  humanReasoning,
  setHumanReasoning,
  ruleConstraint,
  setRuleConstraint,
  scopeTaxonomy,
  setScopeTaxonomy,
  onCrossVerifyRAG,
  isRagVerifying,
  ragVerificationResult,
  onSubmitDelta,
  isSubmittingDelta,
  deltaSyncSuccess
}) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
      <div>
        <span className="badge badge-purple mb-1">Human Engineer Feedback &amp; Delta Learning</span>
        <h4 className="font-bold text-slate-900 text-sm">Explain Discrepancy &amp; Teach Knowledge Engine</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Record portal behavior to automatically generate new deterministic rules and sync to Gemini NotebookLM.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Rule Constraint Statement:
          </label>
          <input
            type="text"
            value={ruleConstraint}
            onChange={e => setRuleConstraint(e.target.value)}
            placeholder="e.g. 'MR416i controller requires P76453-B21 Cable Kit'"
            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Rule Scope Taxonomy:
          </label>
          <select
            value={scopeTaxonomy}
            onChange={e => setScopeTaxonomy(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="CHASSIS_SPECIFIC">Chassis Specific (e.g. DL380 Gen12 only)</option>
            <option value="FAMILY_GEN_SPECIFIC">Family &amp; Generation Wide (All Gen12 ProLiant)</option>
            <option value="UNIVERSAL_HPE">Universal Vendor Rule (All HPE Servers)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Human Explanation &amp; Architecture Rationale:
        </label>
        <textarea
          value={humanReasoning}
          onChange={e => setHumanReasoning(e.target.value)}
          placeholder="Explain why this vendor discrepancy exists (e.g. 'Vendor portal requires Box 1/2 Storage Cable Kit to route SAS signals to front drive cage')."
          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 h-16 outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={onCrossVerifyRAG}
          disabled={isRagVerifying || (!humanReasoning.trim() && !ruleConstraint.trim())}
          className="btn-secondary text-xs flex items-center gap-1.5 text-amber-900 border-amber-300 hover:bg-amber-50"
        >
          {isRagVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
          {isRagVerifying ? 'Grounding in NotebookLM...' : 'Verify with Gemini NotebookLM'}
        </button>

        <button
          type="button"
          onClick={onSubmitDelta}
          disabled={isSubmittingDelta || (!humanReasoning.trim() && !ruleConstraint.trim())}
          className="btn-primary text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
        >
          {isSubmittingDelta ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
          {isSubmittingDelta ? 'Syncing to Registry...' : 'Commit Delta & Sync to NotebookLM'}
        </button>
      </div>

      {ragVerificationResult && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            NotebookLM RAG Grounding Second Opinion:
          </div>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            {ragVerificationResult.answer || ragVerificationResult.text || JSON.stringify(ragVerificationResult)}
          </p>
        </div>
      )}

      {deltaSyncSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Knowledge Delta successfully committed to registry and synchronized!</span>
        </div>
      )}
    </div>
  );
}
