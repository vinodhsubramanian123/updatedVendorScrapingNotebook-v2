import { postJson, requestJson, uploadBoqFile } from '../services/api.js';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, RefreshCw, X } from 'lucide-react';
import VendorMatchTable from './reconciliation/VendorMatchTable';
import ReconciliationActionPanel from './reconciliation/ReconciliationActionPanel';
import { getCategoryStyle } from '../utils/categoryStyles';

async function parseModalVendorInput(vendorText) {
  const data = await postJson('/api/parse-vendor-quote', { rawText: vendorText });
  return data.items;
}

async function uploadAndPreprocessVendorFile(uploadedFile, selectedChassis, offline = true) {
  const uploadData = await uploadBoqFile(uploadedFile);


  return requestJson('/api/preprocess-boq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filepath: uploadData.filepath, chassisDir: selectedChassis, offline })
  });

}

function buildAddedVendorDefaultRules(data, selectedChassis) {
  const firstAdded = data.discrepancies?.addedByVendor?.[0];
  if (!firstAdded) return null;
  const targetModel = data.chassisModel || selectedChassis || 'DL380 Gen12';
  return {
    ruleConstraint: `HPE Partner Portal validation auto-inserted SKU ${firstAdded.sku} (${firstAdded.description}).`,
    humanReasoning: `Customer quote requires ${firstAdded.sku} for Partner Portal compliance on ${targetModel}.`
  };
}

function VendorQuoteInputBox({
  vendorText,
  setVendorText,
  isOcrProcessing,
  isVerifying,
  onFileUpload,
  onVerify,
  localOnly,
  setLocalOnly
}) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">
          Paste Vendor Quote SKU Lines or Upload Excel / PDF Quote:
        </label>
        <input
          type="file"
          id="vendor-file-input"
          className="hidden"
          accept=".xlsx,.xls,.csv,.pdf,.txt,.png,.jpg,.jpeg,.webp"
          onChange={e => e.target.files && onFileUpload(e.target.files[0])}
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

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" checked={localOnly} onChange={e => setLocalOnly(e.target.checked)} />
          Use local catalog only
        </label>
        <button
          onClick={onVerify}
          disabled={isVerifying || !vendorText.trim()}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {isVerifying ? 'Cross-Auditing...' : 'Run Cross-Verification Audit'}
        </button>
      </div>
    </div>
  );
}

function appendVendorRemediation(message, remediationAction, fallback) {
  const base = String(message || fallback);
  return remediationAction && !base.includes(remediationAction) ? `${base} ${remediationAction}` : base;
}

export default function VendorBomVerificationModal({
  rankSolution,
  selectedChassis,
  onClose,
  onApplyReconciliation,
  isOpen = true
}) {
  const [vendorText, setVendorText] = useState('');
  const [_file, setFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [humanReasoning, setHumanReasoning] = useState('');
  const [ruleConstraint, setRuleConstraint] = useState('');
  const [localOnly, setLocalOnly] = useState(true);
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

  const targetChassis = selectedChassis || 'DL380_Gen12';

  const handleFileUpload = async (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setIsOcrProcessing(true);
    setErrorMessage(null);
    try {
      const preData = await uploadAndPreprocessVendorFile(uploadedFile, selectedChassis, localOnly);
      if (preData.status === 'SUCCESS' && preData.preflightData) {
        const itemsList = preData.preflightData.configVariations?.[0]?.items || [];
        setVendorText(itemsList.map(i => `${i.sku}, ${i.quantity}, ${i.description}`).join('\n'));
      } else {
        setErrorMessage(appendVendorRemediation(preData.error, preData.remediationAction, 'Failed to extract SKUs from uploaded file.'));
      }
    } catch (err) {
      setErrorMessage(appendVendorRemediation(`Upload error: ${err.message}`, err.remediationAction));
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
      const items = await parseModalVendorInput(vendorText);
      if (items.length === 0) {
        setErrorMessage('No valid HPE SKUs detected in uploaded input.');
        return;
      }
      const res = await fetch('/api/verify-vendor-bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorItems: items,
          proposedRankSolution: rankSolution || { rank: 1, skuList: [] },
          chassisDir: selectedChassis
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to verify Vendor BOM');
        return;
      }
      setAuditReport(data);
      const defaults = buildAddedVendorDefaultRules(data, selectedChassis);
      if (defaults) {
        setRuleConstraint(defaults.ruleConstraint);
        setHumanReasoning(defaults.humanReasoning);
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
        body: JSON.stringify({ chassis: targetChassis, query: prompt, offline: localOnly })
      });
      setRagVerificationResult(await res.json());
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
      const res = await fetch('/api/simulate-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassis: targetChassis,
          errorMessage: `${ruleConstraint} — ${humanReasoning}`
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
            aria-label="Close"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          <VendorQuoteInputBox
            vendorText={vendorText}
            setVendorText={setVendorText}
            isOcrProcessing={isOcrProcessing}
            isVerifying={isVerifying}
            onFileUpload={handleFileUpload}
            onVerify={handleVerify}
            localOnly={localOnly}
            setLocalOnly={setLocalOnly}
          />

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
