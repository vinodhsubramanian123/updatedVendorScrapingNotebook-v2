import React, { useState } from 'react';
import { MessageCircleQuestion, Send } from 'lucide-react';

export default function ClarificationPromptCard({
  prompt,
  requiresClarification,
  missingReqs,
  onRespond,
  busy = false
}) {
  const [replyText, setReplyText] = useState('');
  if (!prompt && !requiresClarification) return null;

  const options = Array.isArray(prompt?.options) && prompt.options.length > 0
    ? prompt.options
    : (Array.isArray(missingReqs) ? missingReqs : []);
  const questionText = prompt?.question || (
    Array.isArray(missingReqs) && missingReqs.length > 0
      ? `Sizing requirements are incomplete or ambiguous (Missing: ${missingReqs.join(', ')}). Confirm missing details below.`
      : 'Confirm platform or requirement details to continue evaluation.'
  );

  const sendReply = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || !onRespond || busy) return;
    setReplyText('');
    onRespond(trimmed);
  };

  return (
    <div
      role="alert"
      data-testid="clarification-prompt-card"
      className="text-xs bg-amber-50 p-3 rounded-xl border border-amber-300 space-y-2.5"
    >
      <div className="flex items-start gap-2 text-amber-950">
        <MessageCircleQuestion className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Human Clarification Required</p>
          <p className="text-amber-900 leading-relaxed">{questionText}</p>
        </div>
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-6">
          {options.map((opt, idx) => (
            <button
              key={`${opt}-${idx}`}
              type="button"
              disabled={busy || !onRespond}
              onClick={() => sendReply(opt)}
              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 cursor-pointer disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {onRespond && (
        <form
          onSubmit={(e) => { e.preventDefault(); sendReply(replyText); }}
          className="flex gap-2 pl-6"
        >
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Confirm choice or add workload details..."
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button
            type="submit"
            disabled={busy || !replyText.trim()}
            className="btn-primary text-[11px] py-1 px-2.5 shrink-0"
          >
            <Send className="w-3 h-3" /> Confirm
          </button>
        </form>
      )}
    </div>
  );
}
