import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, AlertTriangle, CheckCircle2, RefreshCw, X, Copy, Sparkles, BookOpen, Layers, CheckCircle, HelpCircle, MessageSquare } from 'lucide-react';

const getCategoryStyle = (cat = '') => {
  const c = String(cat).toLowerCase();
  if (c.includes('processor') || c.includes('cpu')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (c.includes('memory') || c.includes('ram') || c.includes('dimm')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (c.includes('power') || c.includes('psu') || c.includes('dc')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (c.includes('storage controller') || c.includes('raid') || c.includes('cache')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (c.includes('drive') || c.includes('ssd') || c.includes('hdd') || c.includes('nvme')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (c.includes('cooling') || c.includes('thermal') || c.includes('fan')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (c.includes('network') || c.includes('ocp') || c.includes('adapter')) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (c.includes('chassis') || c.includes('base')) return 'bg-slate-100 text-slate-800 border-slate-300';
  if (c.includes('fix') || c.includes('aspect')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

export default function VendorBomVerificationModal({ isOpen, onClose, selectedRank, selectedChassis, evalResults }) {
  const [vendorText, setVendorText] = useState('');
  const [file, setFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isScraping, setIsScraping] = useState(false);

  // Reconciliation & Reasoning States
  const [humanReasoning, setHumanReasoning] = useState('');
  const [ruleConstraint, setRuleConstraint] = useState('');
  const [scopeTaxonomy, setScopeTaxonomy] = useState('CHASSIS_SPECIFIC');
  const [isRagVerifying, setIsRagVerifying] = useState(false);
  const [ragVerificationResult, setRagVerificationResult] = useState(null);
  const [isSubmittingDelta, setIsSubmittingDelta] = useState(false);
  const [deltaSyncSuccess, setDeltaSyncSuccess] = useState(null);
  const [copyStatus, setCopyStatus] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = async (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setIsOcrProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('boqFile', uploadedFile);
      const uploadRes = await fetch('/api/upload-boq', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();

      const preRes = await fetch('/api/preprocess-boq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: uploadData.filepath, chassisDir: selectedChassis })
      });
      const preData = await preRes.json();

      if (preData.status === 'SUCCESS' && preData.preflightData) {
        const rawLines = preData.preflightData.variations[0]?.items.map(i => `${i.sku}, ${i.quantity}, ${i.description}`).join('\n') || '';
        setVendorText(rawLines);
      } else {
        setErrorMessage(preData.error || 'Failed to extract SKUs from uploaded file.');
      }
    } catch (err) {
      setErrorMessage(`Upload error: ${err.message}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!vendorText.trim()) return;
    setIsVerifying(true);
    setAuditReport(null);
    setErrorMessage(null);
    setRagVerificationResult(null);
    setDeltaSyncSuccess(null);

    try {
      let items = [];
      try {
        items = JSON.parse(vendorText);
      } catch (_) {
        const lines = vendorText.split('\n');
        lines.forEach(line => {
          const match = line.match(/\b([A-Z0-9]{5,6}-[A-Z0-9]{2,3})\b/i);
          if (match) {
            const sku = match[1].toUpperCase();
            const qtyMatch = line.match(/\b(\d+)\b/);
            const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            items.push({ sku, quantity, description: line.trim() });
          }
        });
      }

      if (items.length === 0) {
        setErrorMessage('No valid HPE SKUs (e.g., P47777-B21) detected in uploaded input.');
        setIsVerifying(false);
        return;
      }

      const proposedRankSolution = evalResults?.conflictGraph?.rankedSolutions?.find(s => s.rank === (selectedRank || 1)) || {
        rank: selectedRank || 1,
        skuList: (evalResults?.items || []).map(it => ({ sku: it.sku, quantity: it.quantity, description: it.description }))
      };

      const res = await fetch('/api/verify-vendor-bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorItems: items,
          proposedRankSolution,
          chassisDir: evalResults?.chassisDir
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAuditReport(data);
        // Pre-fill default rule constraint if discrepancies exist
        if (data.discrepancies?.addedByVendor?.length > 0) {
          const firstAdded = data.discrepancies.addedByVendor[0];
          setRuleConstraint(`HPE Partner Portal validation auto-inserted SKU ${firstAdded.sku} (${firstAdded.description}).`);
          setHumanReasoning(`Customer quote requires ${firstAdded.sku} for Partner Portal compliance on ${data.chassisModel || ' DL380 Gen12'}.`);
        }
      } else {
        setErrorMessage(data.error || 'Failed to verify Vendor BOM');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCrossVerifyWithNotebookRAG = async () => {
    if (!humanReasoning.trim() && !ruleConstraint.trim()) {
      alert('Please enter your human explanation or rule constraint before verifying with NotebookLM.');
      return;
    }
    setIsRagVerifying(true);
    setRagVerificationResult(null);

    const query = `Verify hardware requirement in QuickSpecs for ${auditReport?.chassisModel || selectedChassis || 'DL380 Gen12'}: ${ruleConstraint}. User rationale: "${humanReasoning}". Is this a physical dependency or temporary supply restriction?`;

    try {
      const res = await fetch('/api/notebook-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          chassis: auditReport?.chassisModel || selectedChassis || 'HPE ProLiant DL380 Gen12 SFF'
        })
      });
      const data = await res.json();
      setRagVerificationResult(data);
    } catch (err) {
      setRagVerificationResult({
        answer: `NotebookLM verification fallback: ${err.message}`,
        citations: []
      });
    } finally {
      setIsRagVerifying(false);
    }
  };

  const handleSubmitKnowledgeDelta = async () => {
    if (!ruleConstraint.trim()) {
      alert('Please enter a valid rule constraint description.');
      return;
    }
    setIsSubmittingDelta(true);
    setDeltaSyncSuccess(null);

    try {
      const affectedSku = auditReport?.discrepancies?.addedByVendor?.[0]?.sku || null;
      const res = await fetch('/api/resolve-ambiguity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleUpdate: ruleConstraint,
          chassis: auditReport?.chassisModel || selectedChassis || 'DL380_Gen12_SFF',
          affectedSku,
          humanReasoning: humanReasoning || ruleConstraint,
          scopeTaxonomy,
          solutionType: 'Partner Portal Reconciled BOM'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDeltaSyncSuccess({
          deltaId: data.deltaId,
          scopeTaxonomy: data.scopeTaxonomy,
          message: 'Learned Knowledge Delta logged to catalog_deltas.json and synchronized to Gemini NotebookLM payload note!'
        });
      } else {
        alert(`Failed to log knowledge delta: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      alert(`Error submitting knowledge delta: ${err.message}`);
    } finally {
      setIsSubmittingDelta(false);
    }
  };

  const handleCopyVendorBom = () => {
    if (!auditReport) return;
    const items = auditReport.discrepancies?.exactMatches || [];
    const added = auditReport.discrepancies?.addedByVendor || [];
    const lines = [
      `OFFICIAL HPE VENDOR PORTAL RECONCILED BOM`,
      `Chassis: ${auditReport.chassisModel}`,
      `Total SKUs: ${auditReport.totalVendorSkus}`,
      `Status: ${auditReport.is100PercentMatch ? '100% Match Certified' : 'Portal Deltas Reconciled'}`,
      `--------------------------------------------------`,
      `SKU\t\tQty\tDescription / Reason`,
      ...items.map(i => `${i.sku}\t${i.vendorQty}\tExact Match`),
      ...added.map(a => `${a.sku}\t${a.quantity}\t[Portal Auto-Added] ${a.description || ''}`),
      `--------------------------------------------------`,
      `Reconciled and Verified by HPE ProLiant AI Studio Engine`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2500);
  };

  const handleTriggerFreshScrape = async () => {
    setIsScraping(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'solution' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger scrape');
      alert(`Fresh CDP catalog scrape initiated for the active OCA tab. Watch logs in Dashboard timeline. Task ID: ${data.taskId || data.runId}`);
    } catch (err) {
      alert(`Failed to launch fresh scrape: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold border border-indigo-200">
              <ShieldCheck className="w-5 h-5 text-indigo-900 stroke-[2.25px]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Partner Portal Vendor BOM Reconciliation &amp; Closed-Loop Learning</h2>
              <p className="text-xs text-slate-600">Cross-verify official HPE Partner Portal Quote BOM against Rank {selectedRank || 1} proposal &amp; auto-learn QuickSpecs rules</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-200">
            <X className="w-5 h-5 stroke-[2.25px]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {!auditReport ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-700 font-medium">
                Upload or paste the official quote BOM exported from the HPE Partner Portal (OCA/CLIC). Supports Excel, CSV, text, and screenshot images (.png, .jpg, .pdf) with Gemini Multimodal OCR extraction.
              </p>

              {/* Drag and drop / image upload zone */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors text-center cursor-pointer">
                <input
                  type="file"
                  id="vendorBomFileInput"
                  className="hidden"
                  accept=".xlsx,.csv,.json,.txt,.png,.jpg,.jpeg,.webp,.pdf"
                  onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <label htmlFor="vendorBomFileInput" className="cursor-pointer block">
                  {isOcrProcessing ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-800 font-bold text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-700" />
                      Extracting tabular SKUs via Gemini Vision OCR...
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-indigo-700 mx-auto mb-1 stroke-[2.25px]" />
                      <p className="text-xs font-bold text-slate-900">
                        {file ? file.name : 'Upload quote file or image screenshot'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Supports .xlsx, .csv, .json, .png, .jpg, .pdf</p>
                    </>
                  )}
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-2">Vendor Quote BOM Text / Extracted SKUs</label>
                <textarea
                  value={vendorText}
                  onChange={e => setVendorText(e.target.value)}
                  placeholder={`P47777-B21, 1, HPE MR416i-p Gen11 Storage Controller\nP76471-B21, 1, HPE Riser Cable Kit\nP38997-B21, 2, HPE 1600W Power Supply`}
                  className="w-full h-36 font-mono text-xs p-3 border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0 stroke-[2.25px]" />
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={isVerifying || !vendorText.trim()}
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Cross-Verifying Vendor BOM...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.25px]" /> Reconcile Against Rank {selectedRank || 1} Solution
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Audit Report Results & Reconciliation View */
            <div className="space-y-6">
              {/* Summary Status Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                auditReport.is100PercentMatch
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-center gap-3">
                  {auditReport.is100PercentMatch ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-700 stroke-[2.25px]" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-700 stroke-[2.25px]" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {auditReport.is100PercentMatch ? '100% Match Certified' : 'Vendor Portal Discrepancies Reconciled'}
                    </h3>
                    <p className="text-xs text-slate-700">
                      Chassis: {auditReport.chassisModel} | Proposed: {auditReport.totalProposedSkus} SKUs | Vendor Quote: {auditReport.totalVendorSkus} SKUs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyVendorBom}
                    className="btn-secondary text-[11px] py-1 px-2.5 bg-white hover:bg-slate-100 flex items-center gap-1 font-semibold text-slate-700 border border-slate-300"
                    title="Copy formatted BOM text for Partner Portal offline assembly"
                  >
                    {copyStatus ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Copy for Partner Portal</span>
                      </>
                    )}
                  </button>
                  <span className={`badge ${auditReport.is100PercentMatch ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold' : 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'}`}>
                    {auditReport.is100PercentMatch ? 'VERIFIED_CLEAN' : 'DELTAS_LEARNED'}
                  </span>
                </div>
              </div>

              {/* Uncataloged SKUs Warning Banner */}
              {auditReport.requiresFreshScrape && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 text-rose-950">
                    <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0 stroke-[2.25px]" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Uncataloged Live SKUs Detected in Vendor Quote</h4>
                      <p className="text-[11px] text-rose-800">Vendor portal returned SKUs missing from local catalog JSON. Fresh CDP scrape recommended.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTriggerFreshScrape}
                    disabled={isScraping}
                    className="btn-primary bg-rose-700 hover:bg-rose-800 text-xs py-1.5 px-3 flex items-center gap-1.5 text-white"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                    {isScraping ? 'Scraping...' : 'Trigger CDP Scrape'}
                  </button>
                </div>
              )}

              {/* Added By Vendor */}
              {auditReport.discrepancies.addedByVendor.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-700 stroke-[2.25px]" /> Auto-Inserted SKUs by HPE Partner Portal ({auditReport.discrepancies.addedByVendor.length})
                  </h4>
                  <div className="border border-indigo-200 rounded-xl overflow-hidden text-xs bg-indigo-50/30">
                    <table className="w-full text-left">
                      <thead className="bg-indigo-100/70 text-indigo-950 font-bold border-b border-indigo-200">
                        <tr>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Description / Portal Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100">
                        {auditReport.discrepancies.addedByVendor.map((item, idx) => {
                          const styleClass = getCategoryStyle(item.description);
                          return (
                            <tr key={idx} className="hover:bg-indigo-50/50">
                              <td className="px-3 py-2 font-mono font-bold text-indigo-900">{item.sku}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">{item.quantity}</td>
                              <td className="px-3 py-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${styleClass}`}>
                                  Portal Auto-Insert
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-800 font-medium">{item.reason || item.description}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Price Deltas */}
              {auditReport.discrepancies.priceDeltas.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 stroke-[2.25px]" /> List Price Variances ({auditReport.discrepancies.priceDeltas.length})
                  </h4>
                  <div className="border border-amber-200 rounded-xl overflow-hidden text-xs bg-amber-50/30">
                    <table className="w-full text-left">
                      <thead className="bg-amber-100/70 text-amber-950 font-bold border-b border-amber-200">
                        <tr>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Proposed Price</th>
                          <th className="px-3 py-2">Vendor Quote Price</th>
                          <th className="px-3 py-2">Price Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {auditReport.discrepancies.priceDeltas.map((item, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{item.sku}</td>
                            <td className="px-3 py-2 text-slate-800">${item.proposedPriceUsd}</td>
                            <td className="px-3 py-2 font-bold text-amber-900">${item.vendorPriceUsd}</td>
                            <td className="px-3 py-2 text-amber-800 font-bold">{item.percentChange} (${item.priceDeltaUsd})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Interactive Closed-Loop Auto-Learning & RAG Verification Form */}
              <div className="p-5 border-2 border-indigo-200 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-slate-50 to-purple-50/40 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-indigo-600 stroke-[2.25px]" />
                    <span>Closed-Loop Rule Learning &amp; RAG Verification</span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                    Taxonomy Scoped
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Human Rationale &amp; Explanations (Why was this discrepancy introduced?)</span>
                    </label>
                    <textarea
                      value={humanReasoning}
                      onChange={e => setHumanReasoning(e.target.value)}
                      placeholder="e.g., Customer requested 10GbE networking because their switch is SFP+, which triggered Partner Portal auto-insertion of PCIe riser kit."
                      className="w-full h-18 p-2.5 font-sans text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Learned Rule Constraint Statement</span>
                    </label>
                    <input
                      type="text"
                      value={ruleConstraint}
                      onChange={e => setRuleConstraint(e.target.value)}
                      placeholder="e.g., If P47777-B21 storage controller is present, P76471-B21 riser cable is mandatory."
                      className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {/* Taxonomy Scope Selection */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Rule Taxonomy Scope (Prevents Cross-Generation Pollution)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className={`p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer flex items-center gap-2 transition-all ${
                        scopeTaxonomy === 'CHASSIS_SPECIFIC'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}>
                        <input
                          type="radio"
                          name="scopeTaxonomy"
                          value="CHASSIS_SPECIFIC"
                          checked={scopeTaxonomy === 'CHASSIS_SPECIFIC'}
                          onChange={e => setScopeTaxonomy(e.target.value)}
                          className="hidden"
                        />
                        <span>🎯 Chassis Specific</span>
                        <span className="text-[9px] opacity-80 block font-normal">({auditReport?.chassisModel || 'DL380 Gen12'})</span>
                      </label>

                      <label className={`p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer flex items-center gap-2 transition-all ${
                        scopeTaxonomy === 'FAMILY_GEN'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}>
                        <input
                          type="radio"
                          name="scopeTaxonomy"
                          value="FAMILY_GEN"
                          checked={scopeTaxonomy === 'FAMILY_GEN'}
                          onChange={e => setScopeTaxonomy(e.target.value)}
                          className="hidden"
                        />
                        <span>🏛️ Product Family / Gen</span>
                        <span className="text-[9px] opacity-80 block font-normal">(ProLiant Gen12)</span>
                      </label>

                      <label className={`p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer flex items-center gap-2 transition-all ${
                        scopeTaxonomy === 'UNIVERSAL_VENDOR'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}>
                        <input
                          type="radio"
                          name="scopeTaxonomy"
                          value="UNIVERSAL_VENDOR"
                          checked={scopeTaxonomy === 'UNIVERSAL_VENDOR'}
                          onChange={e => setScopeTaxonomy(e.target.value)}
                          className="hidden"
                        />
                        <span>🌐 Universal HPE Vendor</span>
                        <span className="text-[9px] opacity-80 block font-normal">(All HPE Server Lines)</span>
                      </label>
                    </div>
                  </div>

                  {/* Actions for RAG & Delta */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={handleCrossVerifyWithNotebookRAG}
                      disabled={isRagVerifying}
                      className="btn-secondary py-2 px-3 text-xs bg-white hover:bg-slate-100 font-bold text-indigo-900 border border-indigo-300 flex items-center gap-1.5"
                    >
                      {isRagVerifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          Consulting NotebookLM RAG...
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600 stroke-[2.25px]" />
                          Cross-Verify Explanation with NotebookLM RAG
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSubmitKnowledgeDelta}
                      disabled={isSubmittingDelta || !ruleConstraint.trim()}
                      className="btn-primary py-2 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5"
                    >
                      {isSubmittingDelta ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Logging &amp; Syncing Payload...
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5 stroke-[2.25px]" />
                          Log Knowledge Delta &amp; Sync NotebookLM
                        </>
                      )}
                    </button>
                  </div>

                  {/* NotebookLM Verification Result Box */}
                  {ragVerificationResult && (
                    <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> NotebookLM RAG QuickSpecs Audit Response
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                          QuickSpecs Grounded
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {ragVerificationResult.answer}
                      </p>
                      {ragVerificationResult.citations?.length > 0 && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Source Citations: {ragVerificationResult.citations.map(c => c.text || c).join('; ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Success Banner for Delta Sync */}
                  {deltaSyncSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span>Knowledge Delta <code className="font-mono">{deltaSyncSuccess.deltaId}</code> Logged &amp; Synchronized!</span>
                          <p className="text-[10px] text-emerald-700 font-normal">
                            Scope: {deltaSyncSuccess.scopeTaxonomy} | Updated catalog_deltas.json &amp; NotebookLM Markdown Payload
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setAuditReport(null);
                    setRagVerificationResult(null);
                    setDeltaSyncSuccess(null);
                  }}
                  className="btn-secondary text-xs text-slate-800 font-bold"
                >
                  Verify Another BOM
                </button>
                <button
                  onClick={onClose}
                  className="btn-primary text-xs text-white font-bold bg-slate-900 hover:bg-slate-800"
                >
                  Close &amp; Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
