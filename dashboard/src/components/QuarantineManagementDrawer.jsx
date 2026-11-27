import { useModalFocus } from '../hooks/useModalFocus.js';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X, Check, Trash2, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

function QuarantinedDeltaCard({ delta, idx, actionInProgress, onReject, onPromote }) {
  const id = delta.quarantineId || delta.deltaId || delta.id || `RULE-${idx}`;
  const isBusy = actionInProgress === id;
  const affectedSku = delta.affectedSku || 'GLOBAL_RULE';
  const reasonLabel = delta.quarantineReasons?.join('; ') || delta.quarantineReason || delta.reason || 'UNVERIFIED';
  const ruleMessage = delta.rawMessage || delta.description || delta.ruleUpdate || 'No rule message provided.';

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
            {affectedSku}
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
          {reasonLabel}
        </span>
      </div>

      <div>
        <p className="text-xs text-slate-700 font-medium leading-relaxed">
          {ruleMessage}
        </p>
        {delta.chassis && (
          <p className="text-[10px] text-slate-400 mt-1">
            Chassis Scope: <strong className="text-slate-600">{delta.chassis}</strong>
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          onClick={() => onReject(id)}
          disabled={isBusy}
          className="btn-secondary text-xs px-3 py-1 text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Reject
        </button>
        <button
          onClick={() => onPromote(delta)}
          disabled={isBusy}
          className="btn-primary text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          {isBusy ? 'Promoting...' : 'Promote Rule'}
        </button>
      </div>
    </div>
  );
}

function ReflectionProposalCard({ proposal }) {
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-bold text-slate-900">{proposal.proposalId} · {proposal.chassis}</span>
        <span className={`badge ${proposal.readyForPromotion ? 'badge-emerald' : 'badge-amber'}`}>
          {proposal.status} ({proposal.authoritativeObservationCount || 1}/3)
        </span>
      </div>
      <p className="text-slate-700 font-medium">{proposal.ruleUpdate || proposal.summary}</p>
      <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
        <span>{proposal.category}</span>
        {proposal.affectedSku && <span>SKU: {proposal.affectedSku}</span>}
        {proposal.targetSku && <span>→ {proposal.targetSku}</span>}
      </div>
    </div>
  );
}

function ReflectionQueuePanel({ proposals, promoting, onPromoteAll }) {
  const readyCount = proposals.filter(p => p.status === 'PENDING' && p.readyForPromotion).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Run Reflection Proposals ({proposals.length})
        </span>
        {readyCount > 0 && (
          <button
            type="button"
            disabled={promoting}
            onClick={onPromoteAll}
            className="btn-primary text-xs px-3 py-1"
          >
            <Check className="w-3.5 h-3.5" />
            {promoting ? 'Promoting...' : `Promote Ready (${readyCount})`}
          </button>
        )}
      </div>
      {proposals.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 p-6 text-xs text-slate-500">
          No automated run-reflection proposals recorded yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {proposals.slice(0, 30).map((p, idx) => <ReflectionProposalCard key={p.proposalId || idx} proposal={p} />)}
        </div>
      )}
    </div>
  );
}

function useQuarantineAndReflectionState(isOpen, onClose) {
  const [activeTab, setActiveTab] = useState('QUARANTINE');
  const [quarantinedDeltas, setQuarantinedDeltas] = useState([]);
  const [reflectionProposals, setReflectionProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchQuarantineList = async () => {
    setIsLoading(true);
    try {
      const [qRes, rRes] = await Promise.all([
        fetch('/api/notebook/quarantined-deltas').then(r => r.json()).catch(() => []),
        fetch('/api/learning/proposals').then(r => r.json()).catch(() => ({ entries: [] }))
      ]);
      setQuarantinedDeltas(Array.isArray(qRes) ? qRes : (qRes.deltas || []));
      setReflectionProposals(Array.isArray(rRes?.entries) ? rRes.entries : []);
    } catch (err) {
      console.error('Failed to load quarantined deltas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchQuarantineList();
    setStatusMessage(null);
  }, [isOpen]);

  const dialogRef = useModalFocus(isOpen, onClose);
  return {
    activeTab, setActiveTab, quarantinedDeltas, reflectionProposals,
    isLoading, actionInProgress, setActionInProgress,
    statusMessage, setStatusMessage, fetchQuarantineList, dialogRef
  };
}

async function _runQuarantineMutation(url, method, body, successMsg, state) {
  state.setStatusMessage(null);
  try {
    const res = await fetch(url, {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
    });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || 'Operation failed');
    state.setStatusMessage({ type: 'success', text: typeof successMsg === 'function' ? successMsg(data) : successMsg });
    state.fetchQuarantineList();
  } catch (err) {
    state.setStatusMessage({ type: 'error', text: err.message });
  } finally {
    state.setActionInProgress(null);
  }
}

function QuarantineListSection({ isLoading, quarantinedDeltas, actionInProgress, onReject, onPromote }) {
  if (isLoading && quarantinedDeltas.length === 0) {
    return <div className="text-center py-12 text-slate-400 text-xs">Loading quarantined rules...</div>;
  }
  if (quarantinedDeltas.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-2">
        <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
        <h4 className="font-bold text-slate-800 text-sm">Quarantine Vault is Empty</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          All extracted knowledge rules have either been certified into the Master Knowledge Registry or pruned.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {quarantinedDeltas.map((delta, idx) => (
        <QuarantinedDeltaCard
          key={delta.quarantineId || delta.deltaId || delta.id || `RULE-${idx}`}
          delta={delta}
          idx={idx}
          actionInProgress={actionInProgress}
          onReject={onReject}
          onPromote={onPromote}
        />
      ))}
    </div>
  );
}

export default function QuarantineManagementDrawer({ isOpen, onClose }) {
  const s = useQuarantineAndReflectionState(isOpen, onClose);
  if (!isOpen) return null;

  const handlePromote = (delta) => {
    const ruleId = delta.quarantineId || delta.deltaId || delta.id;
    s.setActionInProgress(ruleId);
    return _runQuarantineMutation(
      `/api/quarantined-deltas/${encodeURIComponent(ruleId)}/promote`,
      'POST',
      { ruleId, delta, approver: 'SINGLE_USER_LEAD_ARCHITECT', humanReview: 'Promoted by human engineer via Quarantine Management UI' },
      `Rule ${ruleId} promoted to Master Knowledge Registry!`,
      s
    );
  };
  const handleReject = (ruleId) => {
    s.setActionInProgress(ruleId);
    return _runQuarantineMutation(`/api/quarantined-deltas/${encodeURIComponent(ruleId)}`, 'DELETE', null, `Rule ${ruleId} permanently rejected and pruned.`, s);
  };
  const handlePromoteProposals = () => {
    s.setActionInProgress('REFLECTION');
    return _runQuarantineMutation('/api/learning/promote', 'POST', { apply: true }, d => `Promoted ${d.promotedCount || 0} reflection rule(s). Status: ${d.status}`, s);
  };

  const drawer = (
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={s.dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="quarantine-drawer-title" className="w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20"><ShieldAlert className="w-5 h-5" /></div>
            <div>
              <h3 id="quarantine-drawer-title" className="font-extrabold text-slate-900 text-base">Knowledge Quarantine Management</h3>
              <p className="text-xs text-slate-500">Inspect, promote, or reject AI-extracted rules and run-reflection proposals.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close drawer" className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {s.statusMessage && (
            <div className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${s.statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
              {s.statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{s.statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center gap-4 border-b border-slate-200 pb-2 text-xs font-bold">
            <button type="button" onClick={() => s.setActiveTab('QUARANTINE')} className={`pb-1.5 border-b-2 cursor-pointer ${s.activeTab === 'QUARANTINE' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-500'}`}>
              Quarantined Rules ({s.quarantinedDeltas.length})
            </button>
            <button type="button" onClick={() => s.setActiveTab('REFLECTION')} className={`pb-1.5 border-b-2 cursor-pointer ${s.activeTab === 'REFLECTION' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>
              Auto-Reflection Queue ({s.reflectionProposals.length})
            </button>
            <button onClick={s.fetchQuarantineList} disabled={s.isLoading} className="ml-auto text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <RefreshCw className={`w-3.5 h-3.5 ${s.isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {s.activeTab === 'REFLECTION' ? (
            <ReflectionQueuePanel proposals={s.reflectionProposals} promoting={s.actionInProgress === 'REFLECTION'} onPromoteAll={handlePromoteProposals} />
          ) : (
            <QuarantineListSection
              isLoading={s.isLoading}
              quarantinedDeltas={s.quarantinedDeltas}
              actionInProgress={s.actionInProgress}
              onReject={handleReject}
              onPromote={handlePromote}
            />
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : drawer;
}
