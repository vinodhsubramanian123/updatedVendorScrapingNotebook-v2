'use strict';
/**
 * scripts/lib/rag/agy_escalation_bridge.js — Tier-3 Antigravity CLI (`agy`) Escalation Bridge
 *
 * Invokes `agy --print --output-format stream-json --mode plan` for deep architectural
 * queries when Tier-1 deterministic routing & Tier-2 Gemini Copilot remain below confidence
 * thresholds or explicit `AGY_DEEP` mode is requested. Strictly blocked in OFFLINE_MODE.
 */

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { isServerOffline } = require('../system/policy_resolver.js');

function checkAgyAvailability() {
  const candidates = [
    process.env.AGY_BIN,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'agy', 'bin', 'agy.exe') : null,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local', 'agy', 'bin', 'agy.exe') : null
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { available: true, binPath: candidate };
    }
  }

  try {
    const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
    const out = execFileSync(cmd, ['agy'], { timeout: 2000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const first = String(out || '').split(/\r?\n/).map(s => s.trim()).find(Boolean);
    if (first && fs.existsSync(first)) return { available: true, binPath: first };
  } catch (_) {}

  return { available: false, binPath: null };
}

function _extractTextFromContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map(part => (typeof part === 'string' ? part : (part?.text || part?.content || '')))
    .filter(Boolean)
    .join('\n');
}

function _parseStepUpdateEvent(obj) {
  const su = obj.step_update || {};
  const convId = su.conversation_id || null;
  if (su.step_type === 'tool') {
    const toolName = su.tool_info?.name || su.tool_name || 'tool';
    return {
      type: 'step_update',
      stepType: 'tool',
      state: su.state || 'ACTIVE',
      toolName,
      durationMs: su.duration_seconds ? Math.round(su.duration_seconds * 1000) : undefined,
      error: su.tool_info?.error?.message || null,
      conversationId: convId,
      text: '',
      isResult: false
    };
  }
  return {
    type: 'step_update',
    stepType: su.step_type || 'event',
    state: su.state || null,
    conversationId: convId,
    text: '',
    textDelta: su.step_type === 'agent_response' ? (su.text_delta || '') : '',
    isResult: false
  };
}

function _parseLegacyAgyEvent(obj) {
  const conversationId = obj.conversation_id || obj.conversationId || obj.session_id || null;
  let text = '';
  if (obj.type === 'result' && typeof obj.result === 'string') {
    text = obj.result;
  } else if (obj.type === 'assistant' && obj.message) {
    text = _extractTextFromContent(obj.message.content);
  } else if (typeof obj.text === 'string') {
    text = obj.text;
  } else if (obj.delta && typeof obj.delta.text === 'string') {
    text = obj.delta.text;
  } else if (obj.content) {
    text = _extractTextFromContent(obj.content);
  }
  return { type: obj.type || 'event', conversationId, text, isResult: obj.type === 'result' };
}

function parseAgyNdjsonLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || !trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (obj.event === 'init') {
      return { type: 'init', conversationId: obj.conversation_id || obj.init?.conversation_id || null, text: '', isResult: false };
    }
    if (obj.event === 'step_update') return _parseStepUpdateEvent(obj);
    if (obj.event === 'result') {
      const res = obj.result || {};
      return {
        type: 'result',
        conversationId: res.conversation_id || null,
        status: res.status || 'SUCCESS',
        text: typeof res.response === 'string' ? res.response : _extractTextFromContent(res.response),
        deniedActions: Array.isArray(res.denied_actions) ? res.denied_actions : [],
        isResult: true
      };
    }
    return _parseLegacyAgyEvent(obj);
  } catch (_) {
    return null;
  }
}

function buildAgyEscalationPrompt({ query, deterministicResult, copilotSummary, priorTurns = [] }) {
  const detSummary = deterministicResult
    ? JSON.stringify({
      intent: deterministicResult.classification?.intent,
      status: deterministicResult.result?.status,
      missingRequirements: deterministicResult.result?.missingRequirements,
      message: deterministicResult.result?.message || deterministicResult.result?.error
    }).slice(0, 1200)
    : 'none';
  const turnsBlock = Array.isArray(priorTurns) && priorTurns.length > 0
    ? `Prior Conversation:\n${priorTurns.slice(-3).map((t, i) => `Q${i + 1}: ${String(t.query || '').slice(0, 160)} -> ${String(t.summary || t.answer || '').slice(0, 220)}`).join('\n')}`
    : '';
  return [
    'You are assisting the HPE ProLiant AI Presales Studio with a read-only deep customer query or feedback investigation.',
    'STRICT READ-ONLY MODE: Do NOT modify, create, or delete any repository files or artifacts. Answer directly in concise markdown.',
    'FAST TARGETED LOOKUP: Answer directly from the supplied Tier-1/Tier-2 evidence when sufficient, or inspect at most 1–2 targeted scripts/config/products/<platform>.json files without running broad repo-wide searches.',
    'Keep physical truthfulness strict: never fabricate SKUs, prices, lead times, or portal CLIC acceptance (keep PORTAL VALIDATION PENDING when unverified).',
    turnsBlock,
    `User Query: ${String(query || '').trim()}`,
    `Tier-1 Deterministic Output: ${detSummary}`,
    copilotSummary ? `Tier-2 Gemini Copilot Summary: ${String(copilotSummary).slice(0, 1500)}` : '',
    'If critical inputs or user confirmation is needed before concluding, add a "Confirmation Needed:" bulleted list with options.'
  ].filter(Boolean).join('\n\n');
}

function _buildAgyArgs({ prompt, conversationId, mode = null, effort = 'medium' }) {
  const args = [
    '--output-format', 'stream-json',
    '--effort', String(effort || 'medium'),
    '--disable-slash-commands',
    '--dangerously-skip-permissions'
  ];
  if (mode === 'plan' || mode === 'accept-edits') args.push('--mode', mode);
  if (conversationId) args.push('--conversation', String(conversationId));
  args.push(`--print=${prompt}`);
  return args;
}

function _wireProcessLifecycle(proc, { signal, timeoutMs, onLine, onFinish }) {
  let buffer = '';
  let timedOut = false;
  let aborted = false;

  const timer = timeoutMs > 0 ? setTimeout(() => {
    timedOut = true;
    try { proc.kill(); } catch (_) {}
  }, timeoutMs) : null;

  const onAbort = () => {
    aborted = true;
    try { proc.kill(); } catch (_) {}
  };
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  proc.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) onLine(line);
  });

  proc.on('close', (code) => {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
    if (buffer.trim()) onLine(buffer);
    onFinish({ code, timedOut, aborted });
  });
}

function _resolveAgyStatus({ code, resultStatus, timedOut, aborted, answer }) {
  if (aborted) return 'CANCELLED';
  if (timedOut) return 'TIMEOUT';
  return (code === 0 || resultStatus === 'SUCCESS') && answer ? 'SUCCESS' : 'UNAVAILABLE';
}

function _emitAgyStepEvent(evt, onEvent, onLog) {
  if (evt.type !== 'step_update' || evt.stepType !== 'tool') return;
  if (evt.state === 'ACTIVE') {
    onEvent?.({ type: 'TOOL_CALL', tool: `agy:${evt.toolName}`, summary: `Running ${evt.toolName}` });
    onLog?.(`🛠️ [AGY_DEEP] Tool call: ${evt.toolName}`);
  } else if (evt.state === 'DONE' || evt.state === 'ERROR') {
    onEvent?.({
      type: 'TOOL_RESULT',
      tool: `agy:${evt.toolName}`,
      durationMs: evt.durationMs,
      summary: evt.error ? `Error: ${evt.error}` : `Completed ${evt.toolName}`
    });
  }
}

function _executeAgySpawn({ binPath, args, conversationId, signal, timeoutMs, startedAt, spawnFn, onEvent, onLog }) {
  return new Promise((resolve) => {
    const proc = spawnFn(binPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const state = {
      conversationId: conversationId || null,
      resultStatus: null,
      finalResultText: '',
      deltaText: '',
      chunks: [],
      deniedActions: [],
      stderrText: ''
    };

    proc.stderr?.on('data', (c) => { state.stderrText += c.toString('utf8'); });
    proc.on('error', (err) => {
      resolve({ status: 'UNAVAILABLE', answer: null, conversationId: state.conversationId, durationMs: Date.now() - startedAt, error: err.message });
    });

    _wireProcessLifecycle(proc, {
      signal,
      timeoutMs,
      onLine: (line) => {
        const evt = parseAgyNdjsonLine(line);
        if (!evt) return;
        if (evt.conversationId) state.conversationId = evt.conversationId;
        _emitAgyStepEvent(evt, onEvent, onLog);
        if (evt.isResult) {
          state.resultStatus = evt.status || 'SUCCESS';
          if (evt.text) state.finalResultText = evt.text;
          if (Array.isArray(evt.deniedActions)) state.deniedActions.push(...evt.deniedActions);
        } else if (evt.textDelta) {
          state.deltaText += evt.textDelta;
        } else if (evt.text) {
          state.chunks.push(evt.text);
        }
      },
      onFinish: ({ code, timedOut, aborted }) => {
        const answer = (state.finalResultText || state.deltaText || state.chunks.join('\n')).trim();
        const status = _resolveAgyStatus({ code, resultStatus: state.resultStatus, timedOut, aborted, answer });
        const deniedMsg = state.deniedActions.length > 0 ? `Denied tools: ${state.deniedActions.map(d => d.display_name || d.action).join(', ')}` : '';
        resolve({
          status,
          answer: answer || null,
          conversationId: state.conversationId,
          durationMs: Date.now() - startedAt,
          error: status === 'SUCCESS' ? null : (state.stderrText.trim() || deniedMsg || `agy exited with code ${code}`)
        });
      }
    });
  });
}

function runAgyEscalation({
  query,
  deterministicResult = null,
  copilotSummary = null,
  priorTurns = [],
  conversationId = null,
  offline = false,
  effectivePolicy = null,
  signal = null,
  effort = 'medium',
  timeoutMs = 120000,
  onLog = null,
  onEvent = null,
  _spawnFn = spawn
} = {}) {
  const startedAt = Date.now();
  if (offline || effectivePolicy?.offline || isServerOffline()) {
    return Promise.resolve({
      status: 'BLOCKED_OFFLINE',
      answer: null,
      conversationId: conversationId || null,
      durationMs: 0,
      error: 'agy escalation blocked under OFFLINE_MODE policy'
    });
  }

  const { available, binPath } = checkAgyAvailability();
  if (!available || !binPath) {
    return Promise.resolve({
      status: 'UNAVAILABLE',
      answer: null,
      conversationId: conversationId || null,
      durationMs: 0,
      error: 'agy CLI binary not found on workstation'
    });
  }

  const prompt = buildAgyEscalationPrompt({ query, deterministicResult, copilotSummary, priorTurns });
  const args = _buildAgyArgs({ prompt, conversationId, effort });
  onLog?.(`🚀 [AGY_DEEP] Escalating complex query to Antigravity (${path.basename(binPath)})...`);

  return _executeAgySpawn({ binPath, args, conversationId, signal, timeoutMs, startedAt, spawnFn: _spawnFn, onEvent, onLog });
}

module.exports = {
  checkAgyAvailability,
  parseAgyNdjsonLine,
  buildAgyEscalationPrompt,
  _buildAgyArgs,
  runAgyEscalation
};
