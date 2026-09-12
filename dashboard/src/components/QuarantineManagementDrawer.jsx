import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Check, Trash2, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function QuarantineManagementDrawer({ isOpen, onClose }) {
  const [quarantinedDeltas, setQuarantinedDeltas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchQuarantineList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notebook/quarantined-deltas');
      const data = await res.json();
      setQuarantinedDeltas(Array.isArray(data) ? data : (data.deltas || []));
    } catch (err) {
      console.error('Failed to load quarantined deltas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuarantineList();
      setStatusMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePromote = async (delta) => {
    const ruleId = delta.id || delta.deltaId;
    setActionInProgress(ruleId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/quarantined-deltas/${encodeURIComponent(ruleId)}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId,
          delta,
          approver: 'SINGLE_USER_LEAD_ARCHITECT',
          humanReview: 'Promoted by human engineer via Quarantine Management UI'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to promote rule');
      }
      setStatusMessage({ type: 'success', text: `Rule ${ruleId} promoted to Master Knowledge Registry!` });
      fetchQuarantineList();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Promotion failed: ${err.message}` });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (ruleId) => {
    setActionInProgress(ruleId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/quarantined-deltas/${encodeURIComponent(ruleId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject rule');
      }
      setStatusMessage({ type: 'success', text: `Rule ${ruleId} permanently rejected and pruned.` });
      fetchQuarantineList();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Rejection failed: ${err.message}` });
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Knowledge Quarantine Management
              </h3>
              <p className="text-xs text-slate-500">
                Single-User Mode: Inspect, promote, or reject AI-extracted rules before activation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quarantined Rules ({quarantinedDeltas.length})
            </span>
            <button
              onClick={fetchQuarantineList}
              disabled={isLoading}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isLoading && quarantinedDeltas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading quarantined rules...
            </div>
          ) : quarantinedDeltas.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Quarantine Vault is Empty</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All extracted knowledge rules have either been certified into the Master Knowledge Registry or pruned.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quarantinedDeltas.map((delta, idx) => {
                const id = delta.id || delta.deltaId || `RULE-${idx}`;
                const isBusy = actionInProgress === id;

                return (
                  <div
                    key={id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {delta.affectedSku || 'GLOBAL_RULE'}
                        </span>
                        {delta.requiredDependencySku && (
                          <>
                            <span className="text-xs text-slate-400 font-bold">→</span>
                            <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {delta.requiredDependencySku}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="badge badge-amber text-[9px] font-mono uppercase">
                        {delta.quarantineReason || delta.reason || 'UNVERIFIED'}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {delta.rawMessage || delta.description || delta.ruleUpdate || 'No rule message provided.'}
                      </p>
                      {delta.chassis && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Chassis Scope: <strong className="text-slate-600">{delta.chassis}</strong>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleReject(id)}
                        disabled={isBusy}
                        className="btn-secondary text-xs px-3 py-1 text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handlePromote(delta)}
                        disabled={isBusy}
                        className="btn-primary text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isBusy ? 'Promoting...' : 'Promote Rule'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
