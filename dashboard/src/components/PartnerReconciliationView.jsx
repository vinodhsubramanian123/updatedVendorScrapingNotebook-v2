import React, { useState } from 'react';
import { ShieldCheck, Upload, AlertTriangle, CheckCircle2, RefreshCw, FileText, Sparkles } from 'lucide-react';

export default function PartnerReconciliationView({ evalResults, selectedChassis, onTriggerScrape, auditReport: parentAuditReport, onAuditReportChange }) {
  const [vendorText, setVendorText] = useState('');
  const [selectedRank, setSelectedRank] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [localAuditReport, setLocalAuditReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isScraping, setIsScraping] = useState(false);

  const auditReport = parentAuditReport || localAuditReport;

  const setReport = (report) => {
    setLocalAuditReport(report);
    if (onAuditReportChange) onAuditReportChange(report);
  };

  const handleVerify = async () => {
    if (!vendorText.trim()) return;
    setIsVerifying(true);
    setReport(null);
    setErrorMessage(null);

    try {
      let items = [];
      try {
        items = JSON.parse(vendorText);
      } catch {
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

      const proposedRankSolution = evalResults?.conflictGraph?.rankedSolutions?.find(s => s.rank === selectedRank) || {
        rank: selectedRank,
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
        setReport(data);
      } else {
        setErrorMessage(data.error || 'Failed to verify Vendor BOM');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTriggerFreshScrape = async () => {
    setIsScraping(true);
    try {
      if (onTriggerScrape) {
        await onTriggerScrape('solution');
      } else {
        await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'solution' })
        });
        alert(`Fresh CDP catalog scrape initiated for the active OCA tab.`);
      }
    } catch (err) {
      alert(`Failed to launch fresh scrape: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-card p-6 bg-gradient-to-r from-indigo-900/90 via-slate-900 to-blue-950 text-white rounded-2xl border border-indigo-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
              <h2 className="text-lg font-bold tracking-tight">HPE Partner Portal Quote Reconciliation &amp; Learning Loop</h2>
            </div>
            <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
              Upload or paste quotes directly exported from HPE OCA / CLIC Partner Portal. The engine performs bi-directional delta calculations, classifies discrepancies into <strong className="text-amber-300">TEMPORARY_SUPPLY</strong> or <strong className="text-emerald-300">PERMANENT_PHYSICAL_DEPENDENCY</strong>, writes atomic <strong className="text-indigo-200">KnowledgeDelta</strong> logs, and synchronizes learnings with NotebookLM.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-950/80 p-3 rounded-xl border border-indigo-500/30 text-xs">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="block font-bold text-indigo-200">Bi-Directional Learning</span>
              <span className="text-[11px] text-indigo-300/70">Auto-updates rules for chassis {selectedChassis || 'Unknown Chassis'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reconciliation Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1/3: Input & Settings */}
        <div className="glass-card p-5 space-y-4 lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" /> 1. Upload Vendor Quote
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Candidate Solution to Compare Against</label>
            <select
              value={selectedRank}
              onChange={e => setSelectedRank(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light]"
            >
              <option value={1}>Rank 1: Intent-Preserving Solution</option>
              <option value={2}>Rank 2: Standardized Baseline</option>
              <option value={3}>Rank 3: Performance Boosted</option>
              <option value={4}>Rank 4: Max Channel Headroom</option>
              <option value={5}>Rank 5: Budget Minimized</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paste Quote Content (CSV / JSON / SKU Lines)</label>
            <textarea
              value={vendorText}
              onChange={e => setVendorText(e.target.value)}
              placeholder={`P47777-B21, 1, HPE MR416i-p Controller\nP48820-B21, 1, HPE High Perf Fan Kit\nP36877-B21, 1, HPE -48VDC Lug Kit`}
              className="w-full h-56 font-mono text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={isVerifying || !vendorText.trim()}
            className="w-full btn-primary py-2.5 justify-center text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          >
            {isVerifying ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Cross-Verifying Quote...</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Execute Reconciliation</>
            )}
          </button>
        </div>

        {/* Right 2/3: Reconciliation Report & Learning Output */}
        <div className="glass-card p-5 lg:col-span-2 space-y-5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> 2. Reconciliation Audit Report
          </h3>

          {!auditReport ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Active Reconciliation Audit Loaded</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Paste the quote BOM from HPE Partner Portal on the left and click "Execute Reconciliation" to audit deltas, price variances, and sync knowledge deltas.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Status Header */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                auditReport.is100PercentMatch
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-3">
                  {auditReport.is100PercentMatch ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {auditReport.is100PercentMatch ? '100% Match Certified with HPE Partner Portal' : 'Partner Portal Discrepancies Detected'}
                    </h4>
                    <p className="text-xs opacity-80">
                      Chassis: {auditReport.chassisModel} | Proposed: {auditReport.totalProposedSkus} SKUs | Vendor Quote: {auditReport.totalVendorSkus} SKUs
                    </p>
                  </div>
                </div>
                <span className={`badge ${auditReport.is100PercentMatch ? 'badge-emerald' : 'badge-amber'}`}>
                  {auditReport.is100PercentMatch ? 'VERIFIED_CLEAN' : 'DELTAS_LEARNED'}
                </span>
              </div>

              {/* Fresh Scrape Trigger Warning */}
              {auditReport.requiresFreshScrape && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 text-rose-900">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs">Uncataloged Live SKUs Detected</h5>
                      <p className="text-[11px] text-rose-700">Quote contains live SKUs missing from local JSON catalog. Initiate CDP scrape to update catalog.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTriggerFreshScrape}
                    disabled={isScraping}
                    className="btn-primary bg-rose-600 hover:bg-rose-700 text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                    {isScraping ? 'Scraping...' : 'Trigger CDP Scrape'}
                  </button>
                </div>
              )}

              {/* Added By Vendor Table */}
              {auditReport.discrepancies?.addedByVendor?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 text-indigo-700 flex items-center gap-1.5">
                    <Upload className="w-4 h-4" /> Auto-Inserted SKUs by HPE OCA ({auditReport.discrepancies.addedByVendor.length})
                  </h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                        <tr>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Auto-Addition Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditReport.discrepancies.addedByVendor.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-indigo-700">{item.sku}</td>
                            <td className="px-3 py-2 font-semibold">{item.quantity}</td>
                            <td className="px-3 py-2 text-slate-600">{item.reason || item.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Price Deltas Table */}
              {auditReport.discrepancies?.priceDeltas?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> List Price Variances ({auditReport.discrepancies.priceDeltas.length})
                  </h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                        <tr>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Engine Price</th>
                          <th className="px-3 py-2">Partner Portal Price</th>
                          <th className="px-3 py-2">Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditReport.discrepancies.priceDeltas.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">{item.sku}</td>
                            <td className="px-3 py-2">${item.proposedPriceUsd}</td>
                            <td className="px-3 py-2 font-bold text-amber-700">${item.vendorPriceUsd}</td>
                            <td className="px-3 py-2 text-amber-600 font-semibold">{item.percentChange} (${item.priceDeltaUsd})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>KnowledgeDelta written atomically to <code className="text-slate-700 font-mono">outputs/catalog_deltas.json</code></span>
                <button onClick={() => setReport(null)} className="btn-secondary text-xs">
                  Verify Another Quote
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
