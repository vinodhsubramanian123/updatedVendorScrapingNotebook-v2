import React, { useState } from 'react';
import { HelpCircle, BrainCircuit, Sparkles, PlusCircle, CheckCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function AmbiguityInbox({ evalResults, chassisContext, onReEvaluate }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isQuerying, setIsQuerying] = useState(false);
  const [notebookResponse, setNotebookResponse] = useState('');
  const [notebookMeta, setNotebookMeta] = useState(null);
  
  // Resolution form state
  const [ruleUpdate, setRuleUpdate] = useState('');
  const [humanReasoning, setHumanReasoning] = useState('');
  const [scopeTaxonomy, setScopeTaxonomy] = useState('CHASSIS_SPECIFIC');
  const [affectedSku, setAffectedSku] = useState('');
  const [requiredDependencySku, setRequiredDependencySku] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [evidenceType, setEvidenceType] = useState('OFFICIAL_QUICKSPECS');
  const [evidenceId, setEvidenceId] = useState('');
  const [confirmedVerified, setConfirmedVerified] = useState(false);
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
  const partResolutions = evalResults.requirementResolution?.resolutions || [];

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
    setNotebookMeta(null);
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
      setNotebookMeta(data);
      if (data.learningEligible && data.citations?.length > 0) {
        const firstCitation = data.citations[0];
        setEvidenceType('NOTEBOOKLM_CITATION');
        setEvidenceId(typeof firstCitation === 'string' ? firstCitation : (firstCitation.id || firstCitation.url || firstCitation.title || ''));
      }

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
        requiredDependencySku,
        reviewer,
        confirmedVerified,
        evidence: [{ type: evidenceType, id: evidenceId }]
      };
      
      const res = await fetch('/api/resolve-ambiguity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus({ type: data.promoted ? 'success' : 'warning', msg: data.promoted ? `Verified rule promoted [${data.deltaId}]` : `Held in quarantine [${data.quarantineId || data.deltaId}]` });
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
        <button aria-expanded={isOpen} aria-label={isOpen ? "Collapse Inbox" : "Expand Inbox"} className="text-amber-900 hover:bg-amber-200 p-1 rounded transition-colors">
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

            {partResolutions.length > 0 && (
              <div className="pt-2 border-t border-amber-300/80 space-y-2">
                <div className="font-bold text-amber-950 text-xs">Requirement-led part/category review:</div>
                {partResolutions.map((resolution, idx) => (
                  <div key={`${resolution.suspectedSku || 'requirement'}-${idx}`} className="rounded-lg border border-amber-200 bg-white p-2.5 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-mono font-bold text-rose-800">{resolution.suspectedSku || 'No valid part number'}</span>
                      <span className="text-slate-500">→ expected category</span>
                      <span className="font-bold text-indigo-800">{resolution.expectedRole || 'Unresolved'}</span>
                      <span className="ml-auto font-mono text-amber-900">{Math.round((resolution.confidence || 0) * 100)}% confidence</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(resolution.candidates || []).map(candidate => (
                        <button
                          type="button"
                          key={candidate.sku}
                          onClick={() => {
                            setAffectedSku(resolution.suspectedSku || 'ATTRIBUTE_REQUIREMENT');
                            setRequiredDependencySku(candidate.sku);
                            setRuleUpdate(`For ${chassisContext}, replace ${resolution.suspectedSku || 'the unresolved requirement'} with ${candidate.sku} (${candidate.description}) after confirming category ${resolution.expectedRole}.`);
                          }}
                          className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50"
                          title={candidate.description}
                        >
                          {candidate.sku} · {Math.round(candidate.score * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="pt-2 border-t border-amber-300 text-[11px] text-slate-700">
              No canned SKU fix is applied here. Every decision must identify the exact product generation, evidence, reviewer, and reasoning.
            </p>
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
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-950 font-medium whitespace-pre-wrap space-y-2">
                <div className={`text-[10px] uppercase tracking-wider font-bold ${notebookMeta?.learningEligible ? 'text-emerald-800' : 'text-amber-900'}`}>
                  {notebookMeta?.learningEligible ? 'Cloud grounded with traceable citations' : 'Advisory only — not eligible for learning'}
                </div>
                <div>{notebookResponse}</div>
                {notebookMeta?.citations?.length > 0 && <div className="text-[11px] text-slate-700">Citations: {notebookMeta.citations.map(c => typeof c === 'string' ? c : (c.title || c.id || c.url)).filter(Boolean).join('; ')}</div>}
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-800 stroke-[2.25px]" /> Step 2: Submit Evidence-Backed Human Decision
            </h4>
            <p className="text-[11px] text-slate-600 mb-4">NotebookLM output is advisory. A rule is activated only after an engineer records independent reasoning and traceable evidence; unresolved conflicts remain quarantined.</p>
            
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
                  required
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
                    <option value="UNIVERSAL_VENDOR">Universal Vendor (All HPE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Affected SKU</label>
                  <input
                    required
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Reviewer</label>
                  <input required value={reviewer} onChange={e => setReviewer(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg shadow-2xs bg-white" placeholder="Engineer name or ID" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Evidence Type</label>
                  <select value={evidenceType} onChange={e => setEvidenceType(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg shadow-2xs bg-white [color-scheme:light]">
                    <option value="OFFICIAL_QUICKSPECS">Official QuickSpecs</option>
                    <option value="OFFICIAL_VENDOR_PORTAL">Official Vendor Portal</option>
                    <option value="CERTIFIED_CATALOG">Certified Catalog</option>
                    <option value="NOTEBOOKLM_CITATION">NotebookLM Citation</option>
                    <option value="TESTED_BUILD">Tested OCA/CLIC Build</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Evidence ID / URL / Rule ID</label>
                  <input required value={evidenceId} onChange={e => setEvidenceId(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg shadow-2xs bg-white" placeholder="Source ID, URL, portal rule, or test trace" />
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" required checked={confirmedVerified} onChange={e => setConfirmedVerified(e.target.checked)} className="mt-0.5" />
                <span>I independently verified this rule for the exact product generation and confirm the evidence is authoritative. I understand conflicting rules will remain quarantined until supersession is documented.</span>
              </label>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !ruleUpdate || !humanReasoning || !affectedSku || !reviewer || !evidenceId || !confirmedVerified}
                  className="btn-primary text-xs text-white font-bold bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? 'Validating...' : 'Submit Verified Human Decision'}
                </button>
                
                {submitStatus && (
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold flex items-center gap-1 ${submitStatus.type === 'success' ? 'text-emerald-800' : submitStatus.type === 'warning' ? 'text-amber-900' : 'text-rose-800'}`}>
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
