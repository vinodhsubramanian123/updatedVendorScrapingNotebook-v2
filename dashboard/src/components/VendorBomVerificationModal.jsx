import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, RefreshCw, X } from 'lucide-react';
import VendorMatchTable from './reconciliation/VendorMatchTable';
import ReconciliationActionPanel from './reconciliation/ReconciliationActionPanel';
import { getCategoryStyle } from '../utils/categoryStyles';

export default function VendorBomVerificationModal({
  rankSolution,
  selectedChassis,
  onClose,
  onApplyReconciliation,
  isOpen = true
}) {
  const [vendorText, setVendorText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [humanReasoning, setHumanReasoning] = useState('');
  const [ruleConstraint, setRuleConstraint] = useState('');
  const [scopeTaxonomy, setScopeTaxonomy] = useState('CHASSIS_SPECIFIC');
  const [isRagVerifying, setIsRagVerifying] = useState(false);
  const [ragVerificationResult, setRagVerificationResult] = useState(null);
  const [isSubmittingDelta, setIsSubmittingDelta] = useState(false);
  const [deltaSyncSuccess, setDeltaSyncSuccess] = useState(null);

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
        const rawLines = preData.preflightData.configVariations?.[0]?.items?.map(i => `${i.sku}, ${i.quantity}, ${i.description}`)?.join('\n') || '';
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
      } catch {
        const lines = vendorText.split('\n');
        lines.forEach(line => {
          const match = line.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[HURS][A-Z0-9]{4,10})\b/i);
          if (match) {
            const sku = match[1].toUpperCase().replace(/(CTO|BTO|FIO)$/i, '');
            const qtyMatch = line.match(/\b(\d+)\b/);
            const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            items.push({ sku, quantity, description: line.trim() });
          }
        });
      }

      if (items.length === 0) {
        setErrorMessage('No valid HPE SKUs detected in uploaded input.');
        setIsVerifying(false);
        return;
      }

      const proposedRankSolution = rankSolution || {
        rank: 1,
        skuList: []
      };

      const res = await fetch('/api/verify-vendor-bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorItems: items,
          proposedRankSolution,
          chassisDir: selectedChassis
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAuditReport(data);
        if (data.discrepancies?.addedByVendor?.length > 0) {
          const firstAdded = data.discrepancies.addedByVendor[0];
          setRuleConstraint(`HPE Partner Portal validation auto-inserted SKU ${firstAdded.sku} (${firstAdded.description}).`);
          setHumanReasoning(`Customer quote requires ${firstAdded.sku} for Partner Portal compliance on ${data.chassisModel || selectedChassis || 'DL380 Gen12'}.`);
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
    if (!humanReasoning.trim() && !ruleConstraint.trim()) return;

    setIsRagVerifying(true);
    setRagVerificationResult(null);

    try {
      const prompt = `Verification Query for ${selectedChassis}: Rule constraint: "${ruleConstraint}". Human reasoning: "${humanReasoning}". Does this comply with official QuickSpecs and OCA rules?`;
      const res = await fetch('/api/notebook-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassisId: selectedChassis || 'DL380_Gen12_SFF',
          query: prompt
        })
      });
      const data = await res.json();
      setRagVerificationResult(data);
    } catch (err) {
      setRagVerificationResult({ answer: `RAG consultation unavailable: ${err.message}` });
    } finally {
      setIsRagVerifying(false);
    }
  };

  const handleSubmitDelta = async () => {
    if (!humanReasoning.trim() && !ruleConstraint.trim()) return;

    setIsSubmittingDelta(true);
    setDeltaSyncSuccess(null);

    try {
      const res = await fetch('/api/feedback-rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassis: selectedChassis || 'DL380_Gen12_SFF',
          rawRejectionText: `${ruleConstraint} — ${humanReasoning}`,
          scopeTaxonomy,
          humanReasoning
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDeltaSyncSuccess(data);
        if (onApplyReconciliation) onApplyReconciliation(data);
      }
    } catch (err) {
      setErrorMessage(`Failed to record knowledge delta: ${err.message}`);
    } finally {
      setIsSubmittingDelta(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-bom-modal-title"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-200 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-emerald">Vendor BOM Cross-Verification</span>
              <span className="text-xs text-slate-500 font-mono">Partner Portal Audit</span>
            </div>
            <h3 id="vendor-bom-modal-title" className="text-base font-bold text-slate-900 mt-1">
              Cross-Verify Against Official Vendor / Partner Quote
            </h3>
            <p className="text-xs text-slate-500">
              Audit internal proposed solution against external partner vendor BOM to detect pricing drift and missing accessories.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Paste Vendor Quote SKU Lines or Upload Excel / PDF Quote:
              </label>
              <input
                type="file"
                id="vendor-file-input"
                className="hidden"
                accept=".xlsx,.xls,.csv,.pdf,.txt"
                onChange={e => e.target.files && handleFileUpload(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => document.getElementById('vendor-file-input')?.click()}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                {isOcrProcessing ? 'Extracting SKUs...' : 'Upload Quote File'}
              </button>
            </div>

            <textarea
              value={vendorText}
              onChange={e => setVendorText(e.target.value)}
              placeholder="Paste vendor SKU lines e.g.:&#10;1x P73282-B21 HPE ProLiant DL380 Gen12 8SFF CTO Server&#10;2x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor&#10;1x P76453-B21 HPE ProLiant DL380 Gen12 Box 1/2 Storage Cable Kit"
              className="w-full text-xs border border-slate-300 rounded-lg p-3 h-28 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex justify-end">
              <button
                onClick={handleVerify}
                disabled={isVerifying || !vendorText.trim()}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {isVerifying ? 'Cross-Auditing...' : 'Run Cross-Verification Audit'}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <strong>Error: </strong>{errorMessage}
            </div>
          )}

          <VendorMatchTable
            auditReport={auditReport}
            getCategoryStyle={getCategoryStyle}
          />

          {auditReport && (
            <ReconciliationActionPanel
              humanReasoning={humanReasoning}
              setHumanReasoning={setHumanReasoning}
              ruleConstraint={ruleConstraint}
              setRuleConstraint={setRuleConstraint}
              scopeTaxonomy={scopeTaxonomy}
              setScopeTaxonomy={setScopeTaxonomy}
              onCrossVerifyRAG={handleCrossVerifyWithNotebookRAG}
              isRagVerifying={isRagVerifying}
              ragVerificationResult={ragVerificationResult}
              onSubmitDelta={handleSubmitDelta}
              isSubmittingDelta={isSubmittingDelta}
              deltaSyncSuccess={deltaSyncSuccess}
            />
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
