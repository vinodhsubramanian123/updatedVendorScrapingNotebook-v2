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

function parseAgyNdjsonLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || !trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed);
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
    return {
      type: obj.type || 'event',
      conversationId,
      text,
      isResult: obj.type === 'result'
    };
  } catch (_) {
    return null;
  }
}

function buildAgyEscalationPrompt({ query, deterministicResult, copilotSummary }) {
  const detSummary = deterministicResult
    ? JSON.stringify({
      intent: deterministicResult.classification?.intent,
      status: deterministicResult.result?.status,
      missingRequirements: deterministicResult.result?.missingRequirements,
      message: deterministicResult.result?.message || deterministicResult.result?.error
    }).slice(0, 1200)
    : 'none';
  return [
    'You are assisting the HPE ProLiant AI Presales Studio with a deep customer query escalation.',
    'Keep physical truthfulness strict: never fabricate SKUs, prices, or portal CLIC acceptance.',
    `User Query: ${String(query || '').trim()}`,
    `Tier-1 Deterministic Output: ${detSummary}`,
    copilotSummary ? `Tier-2 Gemini Copilot Summary: ${String(copilotSummary).slice(0, 1500)}` : '',
    'Provide a concise, grounded, customer-ready architectural answer noting any unresolved dependencies or required customer inputs.'
  ].filter(Boolean).join('\n\n');
}

function _buildAgyArgs({ prompt, conversationId }) {
  const args = ['--print', '--output-format', 'stream-json', '--mode', 'plan'];
  if (conversationId) args.push('--conversation', String(conversationId));
  args.push(prompt);
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

function _resolveAgyStatus({ code, timedOut, aborted, answer }) {
  if (aborted) return 'CANCELLED';
  if (timedOut) return 'TIMEOUT';
  return code === 0 && answer ? 'SUCCESS' : 'UNAVAILABLE';
}

function _executeAgySpawn({ binPath, args, conversationId, signal, timeoutMs, startedAt, spawnFn }) {
  return new Promise((resolve) => {
    const proc = spawnFn(binPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let lastConversationId = conversationId || null;
    let finalResultText = '';
    const chunks = [];
    let stderrText = '';

    proc.stderr?.on('data', (c) => { stderrText += c.toString('utf8'); });
    proc.on('error', (err) => {
      resolve({
        status: 'UNAVAILABLE',
        answer: null,
        conversationId: lastConversationId,
        durationMs: Date.now() - startedAt,
        error: err.message
      });
    });

    _wireProcessLifecycle(proc, {
      signal,
      timeoutMs,
      onLine: (line) => {
        const evt = parseAgyNdjsonLine(line);
        if (!evt) return;
        if (evt.conversationId) lastConversationId = evt.conversationId;
        if (evt.isResult && evt.text) finalResultText = evt.text;
        else if (evt.text) chunks.push(evt.text);
      },
      onFinish: ({ code, timedOut, aborted }) => {
        const answer = (finalResultText || chunks.join('\n')).trim();
        const status = _resolveAgyStatus({ code, timedOut, aborted, answer });
        resolve({
          status,
          answer: answer || null,
          conversationId: lastConversationId,
          durationMs: Date.now() - startedAt,
          error: status === 'SUCCESS' ? null : (stderrText.trim() || `agy exited with code ${code}`)
        });
      }
    });
  });
}

function runAgyEscalation({
  query,
  deterministicResult = null,
  copilotSummary = null,
  conversationId = null,
  offline = false,
  effectivePolicy = null,
  signal = null,
  timeoutMs = 90000,
  onLog = null,
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

  const prompt = buildAgyEscalationPrompt({ query, deterministicResult, copilotSummary });
  const args = _buildAgyArgs({ prompt, conversationId });
  onLog?.(`🚀 [AGY_DEEP] Escalating complex query to Antigravity (${path.basename(binPath)})...`);

  return _executeAgySpawn({ binPath, args, conversationId, signal, timeoutMs, startedAt, spawnFn: _spawnFn });
}

module.exports = {
  checkAgyAvailability,
  parseAgyNdjsonLine,
  buildAgyEscalationPrompt,
  runAgyEscalation
};
