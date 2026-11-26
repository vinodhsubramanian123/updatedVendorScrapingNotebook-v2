import React from 'react';
import { Sparkles, User, Cpu } from 'lucide-react';

const MODE_BADGE = {
  DETERMINISTIC: 'badge-emerald',
  GEMINI_AGENT: 'badge-indigo',
  AGY_DEEP: 'badge-purple'
};

function _buildSingleEnvelopeTurn(envelope) {
  const res = envelope.result || {};
  const query = envelope.query || envelope.inputDescriptor?.query || envelope.classification?.query;
  const summary = envelope.agentAnswer || res.groundedAnswer || null;
  if (!query && !summary && !envelope.modeUsed) return [];
  const modeUsed = envelope.modeUsed || 'DETERMINISTIC';
  return [{
    id: envelope.runId || 'latest',
    query: query || 'Autonomous Presales Query',
    summary: typeof summary === 'string' ? summary : null,
    modeUsed,
    tierTrail: envelope.tierTrail || [modeUsed],
    runId: envelope.runId || null
  }];
}

function _normalizeTurns(turns, envelope) {
  if (Array.isArray(turns) && turns.length > 0) return turns;
  if (!envelope || typeof envelope !== 'object') return [];
  if (Array.isArray(envelope.turns) && envelope.turns.length > 0) return envelope.turns;
  return _buildSingleEnvelopeTurn(envelope);
}

export default function AgentConversationThread({ turns = [], envelope = null }) {
  const items = _normalizeTurns(turns, envelope);
  if (items.length === 0) return null;

  return (
    <div data-testid="agent-conversation-thread" className="space-y-2 border-t border-slate-200 pt-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        <span>Autonomous Execution Summary ({items.length})</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {items.slice(-6).map((turn, idx) => {
          const mode = turn.modeUsed || 'DETERMINISTIC';
          const trail = Array.isArray(turn.tierTrail) ? turn.tierTrail.join(' → ') : mode;
          return (
            <div key={turn.id || idx} className="surface-panel rounded-lg p-2.5 space-y-1 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{turn.query}</span>
                </span>
                <span className={`badge ${MODE_BADGE[mode] || 'badge-slate'} shrink-0`}>{mode}</span>
              </div>
              {turn.summary && (
                <div className="pl-5 text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{turn.summary}</div>
              )}
              <div className="pl-5 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {trail}</span>
                {turn.runId && <span>· {turn.runId}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
