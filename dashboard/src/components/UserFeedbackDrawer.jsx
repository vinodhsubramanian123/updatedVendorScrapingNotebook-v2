import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X, Send, CheckCircle2 } from 'lucide-react';
import { humanizeEnum } from '../utils/formatters';

function formatContextObject(obj) {
  if (!obj || typeof obj !== 'object') return '';
  if (obj.text || obj.message || obj.instruction) return String(obj.text || obj.message || obj.instruction);
  const parts = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? (v.text || v.name || v.id || '[details]') : String(v)}`);
  return parts.join(' · ') || 'Feedback item recorded';
}

function formatFeedbackText(val, context) {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '[object Object]') {
      return (context && typeof context === 'object' && Object.keys(context).length > 0)
        ? formatContextObject(context)
        : 'Feedback item recorded without descriptive text';
    }
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatContextObject(parsed);
      } catch (_) {}
    }
    return trimmed;
  }
  if (typeof val === 'object' && val !== null) {
    return val.text || val.message || val.instruction || val.feedback?.text || formatContextObject(val);
  }
  return String(val || '');
}

function deduplicateFeedbackItems(items) {
  if (!Array.isArray(items)) return [];
  const grouped = new Map();
  for (const item of items) {
    const formatted = formatFeedbackText(item.text, item.context);
    const key = `${item.status || 'PENDING'}::${formatted}`;
    if (grouped.has(key)) {
      grouped.get(key).duplicateCount += 1;
    } else {
      grouped.set(key, { ...item, displayText: formatted, duplicateCount: 1 });
    }
  }
  return Array.from(grouped.values());
}

export default function UserFeedbackDrawer({ isOpen, onClose }) {
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState('feature_request');
  const [queueItems, setQueueItems] = useState([]);
  const [copiedPrompt, setCopiedPrompt] = useState('');

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/feedback-list');
      const data = await res.json();
      setQueueItems(data);
    } catch (err) { console.error('Failed to mark feedback completed:', err); }
  };

  useEffect(() => {
    if (isOpen) fetchQueue();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const deduplicatedQueue = useMemo(() => deduplicateFeedbackItems(queueItems), [queueItems]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    try {
      const res = await fetch('/api/feedback-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: feedbackText, category })
      });
      const data = await res.json();
      setCopiedPrompt(data.agentPrompt);
      setFeedbackText('');
      fetchQueue();
    } catch (err) { console.error('Failed to submit feedback:', err); }
  };

  const handleMarkAllCompleted = async () => {
    try {
      await fetch('/api/feedback-mark-completed', { method: 'POST' });
      fetchQueue();
    } catch (err) { console.error('Failed to mark feedback completed:', err); }
  };

  const drawer = (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-drawer-title"
        className="w-full max-w-md bg-white shadow-2xl border-l border-slate-200 p-6 overflow-y-auto transition-all"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h3 id="feedback-drawer-title" className="font-bold text-slate-900 text-base">Feedback & Agent Task Dispatch</h3>
          </div>
          <button onClick={onClose} aria-label="Close drawer" title="Close drawer" className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Category:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 [color-scheme:light]"
          >
            <option value="feature_request">Feature Request</option>
            <option value="ui_tweak">UI / Aesthetic Tweak</option>
            <option value="bug_report">Data Bug Report</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Feedback & Instructions:</label>
          <textarea
            rows={4}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Type your dashboard feedback or requested feature here..."
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <button type="submit" className="w-full btn-primary justify-center text-xs">
          <Send className="w-3.5 h-3.5" /> Submit to Feedback Queue
        </button>
      </form>

      {copiedPrompt && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 mb-6 text-xs">
          <p className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Queued for Antigravity AI!
          </p>
          <p className="text-[11px] text-emerald-800">
            Task logged into <span className="mono">user_feedback_queue.json</span>.
          </p>
        </div>
      )}

      {/* Queue Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pending Tasks Queue:</h4>
          {queueItems.length > 0 && (
            <button
              onClick={handleMarkAllCompleted}
              className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 font-bold flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> Resolve All
            </button>
          )}
        </div>
        <div className="space-y-2">
          {deduplicatedQueue.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No feedback items in queue.</p>
          ) : (
            deduplicatedQueue.map(item => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="mono text-[10px] font-bold text-slate-700 truncate">{item.id}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.duplicateCount > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                        ×{item.duplicateCount}
                      </span>
                    )}
                    <span className="badge badge-amber text-[10px]">{humanizeEnum(item.status)}</span>
                  </div>
                </div>
                <p className="text-slate-700 font-medium break-words">{item.displayText}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : drawer;
}
