import React, { useState } from 'react';
import { HelpCircle, BrainCircuit, Sparkles, PlusCircle, CheckCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function AmbiguityInbox({ evalResults, chassisContext, onReEvaluate }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isQuerying, setIsQuerying] = useState(false);
  const [notebookResponse, setNotebookResponse] = useState('');
  
  // Resolution form state
  const [ruleUpdate, setRuleUpdate] = useState('');
  const [humanReasoning, setHumanReasoning] = useState('');
  const [scopeTaxonomy, setScopeTaxonomy] = useState('CHASSIS_SPECIFIC');
  const [affectedSku, setAffectedSku] = useState('');
  const [requiredDependencySku, setRequiredDependencySku] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  if (!evalResults) return null;

  // Extract confidence score across all possible result schemas
  const rawScore = evalResults.confidence?.score 
    ?? evalResults.confidenceScore 
    ?? evalResults.conflictGraph?.quantitativeConfidenceScore 
    ?? (evalResults.errors?.length > 0 ? 0.2 : 0.95);
  const score = typeof rawScore === 'number' ? rawScore : parseFloat(rawScore) || 0.5;

  const ctoAnomalies = evalResults.preprocessing?.variations?.[0]?.ctoAnomalies 
    || evalResults.ctoAnomalies 
    || [];

  // Trigger if score < 0.85, or errors exist, or chassis confirmation needed, or CTO quantity anomalies detected
  const isTriggered = score < 0.85 
    || (evalResults.errors && evalResults.errors.length > 0)
    || evalResults.requiresUserChassisConfirmation
    || evalResults.confidence?.isHitlTriggered
    || ctoAnomalies.length > 0;

  if (!isTriggered) return null;

  const handleQueryNotebookLM = async () => {
    setIsQuerying(true);
    setNotebookResponse('');
    setSubmitStatus(null);
    try {
      const errorsStr = evalResults.errors?.join('\n') || 'Unknown conflict';
      const prompt = `I have a hardware configuration conflict for ${chassisContext} that I need to resolve. The evaluation failed with these errors:\n${errorsStr}\n\nBased on your QuickSpecs knowledge, what is the exact physical rule missing here? Does one SKU require another? Return a concise technical rule.`;
      
      const res = await fetch('/api/ask-notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, chassis: chassisContext })
      });
      const data = await res.json();
      setNotebookResponse(data.answer || 'No response received.');
      
      const skuRegex = /[A-Z0-9]{5,6}-[A-Z0-9]{2,3}/g;
      const foundSkus = data.answer?.match(skuRegex) || [];
      if (foundSkus.length > 0) setAffectedSku(foundSkus[0]);
      if (foundSkus.length > 1) setRequiredDependencySku(foundSkus[1]);
      
      setRuleUpdate(data.answer);
      setHumanReasoning(`Validated via NotebookLM QuickSpecs grounding for ${chassisContext}`);

    } catch (err) {
      setNotebookResponse(`Error querying NotebookLM: ${err.message}`);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      const payload = {
        ruleUpdate,
        humanReasoning,
        scopeTaxonomy,
        chassis: chassisContext,
        affectedSku,
        requiredDependencySku
      };
      
      const res = await fetch('/api/resolve-ambiguity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus({ type: 'success', msg: `Resolution logged [${data.deltaId}]` });
      } else {
        setSubmitStatus({ type: 'error', msg: data.error });
      }
    } catch (err) {
      setSubmitStatus({ type: 'error', msg: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card border-amber-300 shadow-xs mb-6 overflow-hidden">
      <div 
        className="bg-amber-100/70 p-4 border-b border-amber-300 flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-amber-950">
          <HelpCircle className="w-5 h-5 text-amber-900 stroke-[2.25px]" />
          <h3 className="font-bold text-slate-900">Ambiguity & Anomaly Resolution Inbox</h3>
          <span className="badge bg-amber-200 text-amber-950 font-bold border border-amber-300 ml-2">Human-In-The-Loop Required</span>
        </div>
        <button aria-label={isOpen ? "Collapse Inbox" : "Expand Inbox"} className="text-amber-900 hover:bg-amber-200 p-1 rounded transition-colors">
          {isOpen ? <ChevronUp className="w-5 h-5 stroke-[2.25px]" /> : <ChevronDown className="w-5 h-5 stroke-[2.25px]" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-5 space-y-6 bg-white">
          <div className="text-xs text-slate-800 bg-amber-50 p-3.5 rounded-xl border border-amber-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950">Quantitative Evaluation Confidence: <span className="font-mono text-amber-900">{Math.round(score * 100)}% ({score.toFixed(2)} / 1.00)</span></span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300">Low Confidence Guardrail</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">
              {evalResults.confidence?.summary || evalResults.goldenRuleSummary || 'Hardware rule ambiguity, missing dependency, or non-integer CTO divisor detected.'}
            </p>

            {/* Non-integer CTO Divisor Anomaly Warnings */}
            {ctoAnomalies.length > 0 && (
              <div className="pt-2 border-t border-amber-300/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-700 stroke-[2.25px]" />
                  CTO Multi-Unit Quantity Anomaly Detected:
                </div>
                {ctoAnomalies.map((anom, idx) => (
                  <p key={idx} className="text-[11px] text-rose-800 font-mono pl-5">
                    • SKU {anom.sku}: {anom.rawQuantity} total units across {anom.chassisCount} server chassis yields non-integer atomic quantity ({anom.atomicQuantity.toFixed(2)} per server).
                  </p>
                ))}
              </div>
            )}

            {/* Quick Verification Questions */}
            <div className="pt-2 border-t border-amber-300 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-700 uppercase">Quick Verification Fixes:</span>
              <button
                type="button"
                onClick={() => {
                  setRuleUpdate('Intel Xeon processors with TDP > 240W require High Performance Fan Kit P48820-B21 on Selected Chassis.');
                  setAffectedSku('P74573-B21');
                  setRequiredDependencySku('P48820-B21');
                  setHumanReasoning('Confirmed 250W high thermal dissipation requirement for Selected Chassis.');
                }}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 text-[10px] font-bold rounded-lg border border-amber-300 transition-colors shadow-2xs"
              >
                + Inject High-TDP Fan Rule (P48820-B21)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRuleUpdate('-48VDC Power Supplies (P17023-B21) require DC Power Cable Lug Kit P36877-B21.');
                  setAffectedSku('P17023-B21');
                  setRequiredDependencySku('P36877-B21');
                  setHumanReasoning('Confirmed DC power feed lug terminal requirement.');
                }}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 text-[10px] font-bold rounded-lg border border-amber-300 transition-colors shadow-2xs"
              >
                + Inject DC Lug Kit Rule (P36877-B21)
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-800 stroke-[2.25px]" /> Step 1: Consult NotebookLM MCP
            </h4>
            <p className="text-[11px] text-slate-600 mb-3">Query the Gemini Notebook agent directly to interpret the unresolved errors using the grounded QuickSpecs documents.</p>
            
            <button 
              onClick={handleQueryNotebookLM}
              disabled={isQuerying}
              className="btn-secondary w-full sm:w-auto text-xs bg-white hover:bg-purple-50 text-slate-900 font-bold border-slate-300 transition-all"
            >
              {isQuerying ? <><Sparkles className="w-3.5 h-3.5 animate-spin text-purple-700" /> Querying MCP...</> : <><Sparkles className="w-3.5 h-3.5 text-purple-800 stroke-[2.25px]" /> Auto-Query NotebookLM</>}
            </button>

            {notebookResponse && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-950 font-medium whitespace-pre-wrap">
                {notebookResponse}
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-800 stroke-[2.25px]" /> Step 2: Inject Learned Rule
            </h4>
            <p className="text-[11px] text-slate-600 mb-4">Validate the resolution and inject it into the pipeline's Master Knowledge Registry. It will automatically apply to future BOQs.</p>
            
            <form onSubmit={handleResolve} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Rule Update / Technical Rule</label>
                <textarea 
                  required
                  value={ruleUpdate}
                  onChange={e => setRuleUpdate(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  rows="2"
                  placeholder="e.g. Storage Controller MR416i-p requires P76453-B21 Box 1/2 Cable Kit..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Human Engineer Reasoning & Context</label>
                <input 
                  type="text"
                  value={humanReasoning}
                  onChange={e => setHumanReasoning(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  placeholder="Explain why this fix is necessary (e.g. Controller backplane SAS expander routing requirement)..."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Scope Taxonomy</label>
                  <select 
                    value={scopeTaxonomy}
                    onChange={e => setScopeTaxonomy(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-lg shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 bg-white [color-scheme:light]"
                  >
                    <option value="CHASSIS_SPECIFIC">Chassis Specific (e.g. Selected Chassis)</option>
                    <option value="FAMILY_GEN">Family & Gen (e.g. ProLiant Gen12)</option>
                    <option value="SOLUTION_TYPE">Solution Type (e.g. Storage / Multi-Node)</option>
                    <option value="UNIVERSAL_VENDOR">Universal Vendor (All HPE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Affected SKU</label>
                  <input 
                    type="text"
                    value={affectedSku}
                    onChange={e => setAffectedSku(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-lg shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 bg-white font-mono"
                    placeholder="P47777-B21"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Required Dependency SKU</label>
                  <input 
                    type="text"
                    value={requiredDependencySku}
                    onChange={e => setRequiredDependencySku(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-lg shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 bg-white font-mono"
                    placeholder="P76453-B21"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !ruleUpdate}
                  className="btn-primary text-xs text-white font-bold bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? 'Saving...' : 'Resolve & Learn Rule'}
                </button>
                
                {submitStatus && (
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold flex items-center gap-1 ${submitStatus.type === 'success' ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {submitStatus.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-700 stroke-[2.25px]" /> : null}
                      {submitStatus.msg}
                    </span>
                    {submitStatus.type === 'success' && onReEvaluate && (
                      <button
                        type="button"
                        onClick={() => onReEvaluate()}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Re-Evaluate BOQ with Learned Rule
                      </button>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
          
        </div>
      )}
    </div>
  );
}

