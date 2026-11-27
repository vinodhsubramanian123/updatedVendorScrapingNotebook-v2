import React, { useState } from 'react';
import { ThumbsUp, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { postJson } from '../../services/api.js';

export default function InlineOutcomeFeedback({ envelope, localOnly }) {
  const [open, setOpen] = useState(false);
  const [helpfulSent, setHelpfulSent] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!envelope) return null;
  const chassis = envelope.result?.chassis || envelope.result?.targetChassis || envelope.classification?.scope?.products?.[0]?.id || '';
  const offline = Boolean(localOnly || envelope.effectivePolicy?.offline);

  const sendHelpful = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await postJson('/api/feedback-submit', {
        text: `[Helpful outcome] Query: ${envelope.query || 'Presales query'} · Tier: ${envelope.modeUsed || 'DETERMINISTIC'}`,
        category: 'helpful_outcome',
        context: { runId: envelope.runId, chassis }
      });
      setHelpfulSent(true);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const analyzeWithAgent = async (confirmation) => {
    if (!feedbackText.trim() || offline) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await postJson('/api/feedback/analyze-with-agent', {
        feedbackText, offline,
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

  const submitFeedback = async (delta) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      if (delta) {
        await postJson('/api/feedback/rule-proposal', {
          runId: envelope.runId, chassis: delta.chassis || chassis, ruleUpdate: delta.ruleUpdate,
          affectedSku: delta.affectedSku, requiredDependencySku: delta.requiredDependencySku
        });
      } else {
        await postJson('/api/feedback-submit', {
          text: feedbackText, category: 'outcome_correction', context: { runId: envelope.runId, chassis }
        });
      }
      setFeedbackText('');
      setAnalysis(null);
      setReplyText('');
      setStatusMsg({ type: 'success', text: delta ? 'Rule proposal queued in Quarantined Deltas.' : 'Feedback saved for review.' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
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
            disabled={busy || helpfulSent}
            className="btn-secondary text-[11px] py-1 px-2.5 disabled:opacity-60"
          >
            <ThumbsUp className="w-3 h-3 text-emerald-600" />
            <span>{helpfulSent ? 'Feedback saved' : 'Helpful'}</span>
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

      {statusMsg && (
        <p role={statusMsg.type === 'error' ? 'alert' : 'status'} className="text-xs">
          {statusMsg.text}
        </p>
      )}
      {open && (
        <div className="surface-panel rounded-xl p-3 space-y-2.5">
          <textarea
            rows={2}
            value={feedbackText}
            disabled={busy}
            onChange={e => { setFeedbackText(e.target.value); setAnalysis(null); setReplyText(''); setStatusMsg(null); }}
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
              onClick={() => submitFeedback(null)}
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
                      <button key={idx} type="button" disabled={busy || offline} onClick={() => analyzeWithAgent(opt)} className="px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-semibold">
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply to confirm..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                    <button type="button" disabled={busy || offline || !replyText.trim()} onClick={() => analyzeWithAgent(replyText)} className="btn-primary text-[11px] py-1 px-2">Reply</button>
                  </div>
                </div>
              )}
              {analysis.proposedDelta && (
                <button type="button" disabled={busy} onClick={() => submitFeedback(analysis.proposedDelta)} className="btn-primary text-[11px] py-1 px-2.5">
                  <CheckCircle2 className="w-3 h-3" /> Confirm &amp; Queue Rule Delta
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
