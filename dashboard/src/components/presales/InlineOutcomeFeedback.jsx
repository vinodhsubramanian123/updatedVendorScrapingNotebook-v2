import React, { useState } from 'react';
import { ThumbsUp, Sparkles, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { postJson } from '../../services/api.js';

export default function InlineOutcomeFeedback({ envelope }) {
  const [open, setOpen] = useState(false);
  const [helpfulSent, setHelpfulSent] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!envelope) return null;
  const chassis = envelope.result?.chassis || envelope.result?.targetChassis || envelope.classification?.scope?.products?.[0]?.id || '';
  const offline = Boolean(envelope.effectivePolicy?.offline);

  const sendHelpful = async () => {
    try {
      await postJson('/api/feedback-submit', {
        text: `[Positive Studio Verification] Query: ${envelope.query || 'Presales query'} · Tier: ${envelope.modeUsed || 'DETERMINISTIC'}`,
        category: 'verified_outcome',
        context: { runId: envelope.runId, chassis }
      });
      setHelpfulSent(true);
    } catch (_) {}
  };

  const analyzeWithAgent = async (confirmation) => {
    if (!feedbackText.trim() || offline) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await postJson('/api/feedback/analyze-with-agent', {
        feedbackText,
        category: 'outcome_correction',
        chassis,
        queryText: envelope.query,
        agyConversationId: analysis?.agyConversationId || undefined,
        userConfirmation: confirmation || undefined
      }, { timeoutMs: 120000 });
      setAnalysis(res);
      if (confirmation) setReplyText('');
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const queueRuleProposal = async () => {
    const delta = analysis?.proposedDelta;
    setBusy(true);
    try {
      const targetChassis = delta?.chassis || chassis || 'DL380_Gen12';
      await postJson('/api/simulate-error', {
        chassis: targetChassis,
        errorMessage: delta?.ruleUpdate || feedbackText
      });
      setStatusMsg({ type: 'success', text: `Rule delta queued for ${targetChassis}. Review or promote in Quarantined Deltas.` });
    } catch (err) {
      await postJson('/api/feedback-submit', {
        text: feedbackText,
        category: 'bug_report',
        context: { runId: envelope.runId, chassis, proposedDelta: delta }
      }).catch(() => {});
      setStatusMsg({ type: 'success', text: `Queued to Feedback Vault (${err.message}).` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-slate-200 pt-2.5 space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 font-medium">Outcome feedback &amp; continuous learning</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sendHelpful}
            disabled={helpfulSent}
            className="btn-secondary text-[11px] py-1 px-2.5 disabled:opacity-60"
          >
            <ThumbsUp className="w-3 h-3 text-emerald-600" />
            <span>{helpfulSent ? 'Verified & Logged' : 'Helpful'}</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="btn-secondary text-[11px] py-1 px-2.5"
          >
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>{open ? 'Hide Teach Studio' : 'Correct / Teach Studio'}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="surface-panel rounded-xl p-3 space-y-2.5">
          <textarea
            rows={2}
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="Describe what was wrong, missing, or should become a learned rule..."
            className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !feedbackText.trim() || offline}
              onClick={() => analyzeWithAgent('')}
              className="btn-primary text-[11px] py-1 px-2.5 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>{busy ? 'Analyzing...' : 'Analyze with Antigravity'}</span>
            </button>
            <button
              type="button"
              disabled={busy || !feedbackText.trim()}
              onClick={queueRuleProposal}
              className="btn-secondary text-[11px] py-1 px-2.5 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>Submit Feedback Only</span>
            </button>
            {offline && <span className="text-[11px] text-amber-700">Online mode required for Antigravity analysis.</span>}
          </div>

          {analysis && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800">Antigravity Assessment</span>
                <span className="badge badge-indigo">{analysis.disposition}</span>
              </div>
              <p className="text-[11px] text-slate-700 whitespace-pre-line">{analysis.summary}</p>
              {analysis.confirmationPrompt && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200">
                  <p className="font-semibold text-amber-800">{analysis.confirmationPrompt.question}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(analysis.confirmationPrompt.options || []).map((opt, idx) => (
                      <button key={idx} type="button" onClick={() => analyzeWithAgent(opt)} className="px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-semibold">
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply to confirm..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                    <button type="button" disabled={busy || !replyText.trim()} onClick={() => analyzeWithAgent(replyText)} className="btn-primary text-[11px] py-1 px-2">Reply</button>
                  </div>
                </div>
              )}
              {analysis.proposedDelta && (
                <button type="button" disabled={busy} onClick={queueRuleProposal} className="btn-primary text-[11px] py-1 px-2.5">
                  <CheckCircle2 className="w-3 h-3" /> Confirm &amp; Queue Rule Delta
                </button>
              )}
            </div>
          )}

          {statusMsg && (
            <p className={`text-[11px] flex items-center gap-1 ${statusMsg.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>
              {statusMsg.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{statusMsg.text}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
