'use strict';
/**
 * scripts/lib/gemini_rotator.js — Intelligent Gemini API Key Rotation & Quota Manager
 *
 * Implements a deterministic FIFO queue key selection strategy:
 * 1. Always uses the active Head key at the top of the queue.
 * 2. On 429 / Quota Exhaustion / Daily Limit: marks key as exhausted, demotes it to the bottom of the queue.
 * 3. The next active key immediately pops up to the top.
 * 4. Automatic Next-Day Restoration: As soon as the UTC calendar day rolls over (or exhaustedUntil expires),
 *    exhausted keys automatically reset to active and rejoin the queue.
 * 5. Safe atomic state persistence via safeWriteJsonAtomic to outputs/history/gemini_keys_state.json.
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenAI, Type } = require('@google/genai');
const { safeWriteJsonAtomic } = require('./fs_compat.js');
const logger = require('./pipeline_logger.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const STATE_FILE = path.join(PROJECT_ROOT, 'outputs', 'history', 'gemini_keys_state.json');

class ApiQuotaExhaustedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApiQuotaExhaustedError';
  }
}

// Standard recommended models per GEMINI.md directives
const DEFAULT_MODEL = process.env.GEMINI_MODEL_NAME || 'gemini-3.6-flash';
const REASONING_MODEL = process.env.GEMINI_MODEL_NAME || 'gemini-3.6-flash';

/**
 * Mask API key for logs and audit reports.
 * @param {string} key
 * @returns {string}
 */
function maskKey(key) {
  if (!key || typeof key !== 'string') return 'N/A';
  if (key.length <= 10) return key.slice(0, 3) + '...';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

/**
 * Get current UTC date string YYYY-MM-DD.
 * @returns {string}
 */
function getUtcDateString(d = new Date()) {
  return d.toISOString().split('T')[0];
}

/**
 * Calculate milliseconds until next midnight UTC.
 * @returns {number}
 */
function getMsUntilMidnightUtc() {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 5, 0 // 5 seconds grace after midnight
  ));
  return Math.max(1000, nextMidnight.getTime() - now.getTime());
}

/**
 * Key Rotator Engine Class
 */
class GeminiKeyRotator {
  constructor(options = {}) {
    this.stateFile = options.stateFile || STATE_FILE;
    this.rawKeysString = options.rawKeysString || process.env.GEMINI_API_KEY || '';
    this.state = this._loadState();
  }

  /**
   * Parse environment keys list
   * @returns {string[]}
   */
  _getEnvKeys() {
    const raw = this.rawKeysString || process.env.GEMINI_API_KEY || '';
    return raw
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
  }

  /**
   * Load and harmonize persisted state with current environment keys.
   * @private
   */
  _loadState() {
    const envKeys = this._getEnvKeys();
    let state = {
      lastUpdated: new Date().toISOString(),
      currentUtcDate: getUtcDateString(),
      queue: [],
      keys: {}
    };

    if (fs.existsSync(this.stateFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        if (raw && typeof raw === 'object' && Array.isArray(raw.queue)) {
          state = raw;
        }
      } catch {
        logger.warn('GEMINI_ROTATOR', `Could not read state file ${this.stateFile}, creating fresh state.`);
      }
    }

    // Harmonize keys: deduplicate and add any new env keys
    const seen = new Set();
    const cleanQueue = [];

    // Keep existing queue order for keys that are still in env
    for (const key of state.queue) {
      if (envKeys.includes(key) && !seen.has(key)) {
        cleanQueue.push(key);
        seen.add(key);
      }
    }

    // Append newly added env keys to the tail
    for (const key of envKeys) {
      if (!seen.has(key)) {
        cleanQueue.push(key);
        seen.add(key);
      }
    }

    state.queue = cleanQueue;

    // Initialize key metadata objects if missing
    for (const key of cleanQueue) {
      if (!state.keys[key]) {
        state.keys[key] = {
          fingerprint: maskKey(key),
          status: 'active',
          exhaustedUntil: 0,
          exhaustedDate: null,
          totalCallsToday: 0,
          totalSuccess: 0,
          totalFailures: 0,
          consecutiveErrors: 0,
          lastUsed: null,
          lastError: null
        };
      }
    }

    this._autoResetExhaustedKeys(state);
    return state;
  }

  /**
   * Save state to disk atomically.
   * @private
   */
  _saveState() {
    try {
      this.state.lastUpdated = new Date().toISOString();
      this.state.currentUtcDate = getUtcDateString();
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      safeWriteJsonAtomic(this.stateFile, this.state, { rejectInvalid: false });
    } catch (err) {
      logger.warn('GEMINI_ROTATOR', `Failed to persist key state: ${err.message}`);
    }
  }

  /**
   * Auto-reset keys whose daily limit expired or cooldown passed.
   * @private
   */
  _autoResetExhaustedKeys(state = this.state) {
    const today = getUtcDateString();
    const now = Date.now();
    let stateChanged = false;

    // Daily rollover check
    if (state.currentUtcDate && state.currentUtcDate !== today) {
      logger.info('GEMINI_ROTATOR', `New UTC calendar day detected (${today}). Resetting all daily quota counters.`);
      state.currentUtcDate = today;
      for (const key of state.queue) {
        if (state.keys[key]) {
          state.keys[key].totalCallsToday = 0;
          if (state.keys[key].status === 'exhausted_daily') {
            state.keys[key].status = 'active';
            state.keys[key].exhaustedDate = null;
            state.keys[key].exhaustedUntil = 0;
            state.keys[key].lastError = null;
            stateChanged = true;
          }
        }
      }
    }

    // Individual timer check
    for (const key of state.queue) {
      const info = state.keys[key];
      if (!info) continue;

      if (info.status !== 'active') {
        const isTimeExpired = info.exhaustedUntil && now >= info.exhaustedUntil;
        const isDateExpired = info.exhaustedDate && info.exhaustedDate < today;

        if (isTimeExpired || isDateExpired) {
          logger.info('GEMINI_ROTATOR', `Restoring key ${info.fingerprint} to ACTIVE status (Cooldown/Day rollover complete).`);
          info.status = 'active';
          info.exhaustedDate = null;
          info.exhaustedUntil = 0;
          info.lastError = null;
          stateChanged = true;
        }
      }
    }

    return stateChanged;
  }

  /**
   * Get the primary active key at the head of the queue.
   * @returns {{ apiKey: string, fingerprint: string, index: number, totalActive: number } | null}
   */
  getActiveKey() {
    this._autoResetExhaustedKeys();

    if (this.state.queue.length === 0) {
      const freshKeys = this._getEnvKeys();
      if (freshKeys.length > 0) {
        this.state = this._loadState();
      }
    }

    if (this.state.queue.length === 0) {
      return null;
    }

    // Find the first active key in queue order
    for (let i = 0; i < this.state.queue.length; i++) {
      const key = this.state.queue[i];
      const info = this.state.keys[key];
      if (info && info.status === 'active') {
        const totalActive = this.state.queue.filter(k => this.state.keys[k] && this.state.keys[k].status === 'active').length;
        return {
          apiKey: key,
          fingerprint: info.fingerprint,
          index: i,
          totalActive,
          totalKeys: this.state.queue.length
        };
      }
    }

    // If all keys are exhausted, check if any has the earliest expiry
    let earliestKey = null;
    let earliestTime = Infinity;
    for (const key of this.state.queue) {
      const info = this.state.keys[key];
      if (info && info.exhaustedUntil && info.exhaustedUntil < earliestTime) {
        earliestTime = info.exhaustedUntil;
        earliestKey = key;
      }
    }

    return {
      apiKey: earliestKey || this.state.queue[0],
      fingerprint: maskKey(earliestKey || this.state.queue[0]),
      index: -1,
      totalActive: 0,
      totalKeys: this.state.queue.length,
      allExhausted: true,
      nextAvailableMs: Math.max(0, earliestTime - Date.now())
    };
  }

  /**
   * Mark a key as exhausted (daily limit or transient cooldown) and push it to the bottom of the queue.
   * @param {string} key
   * @param {Error|string} error
   * @param {object} options
   */
  markKeyExhausted(key, error = '', options = {}) {
    if (!key) return;
    this._autoResetExhaustedKeys();

    const errStr = typeof error === 'string' ? error : (error?.message || String(error));
    const isDailyLimit = options.isDailyLimit !== undefined 
      ? options.isDailyLimit 
      : /quota|resource_exhausted|daily|429/i.test(errStr);

    const now = Date.now();
    const today = getUtcDateString();

    if (!this.state.keys[key]) {
      this.state.keys[key] = {
        fingerprint: maskKey(key),
        totalCallsToday: 0,
        totalSuccess: 0,
        totalFailures: 0,
        consecutiveErrors: 0
      };
    }

    const info = this.state.keys[key];
    info.totalFailures = (info.totalFailures || 0) + 1;
    info.consecutiveErrors = (info.consecutiveErrors || 0) + 1;
    info.lastError = errStr;

    if (isDailyLimit) {
      const msUntilNextDay = getMsUntilMidnightUtc();
      info.status = 'exhausted_daily';
      info.exhaustedDate = today;
      info.exhaustedUntil = now + msUntilNextDay;
      const hoursLeft = (msUntilNextDay / (1000 * 60 * 60)).toFixed(1);
      logger.warn('GEMINI_ROTATOR', `⛔ Daily Quota Exhausted for Key ${info.fingerprint}. Demoting to bottom of queue (Locked for ~${hoursLeft}h until next UTC day).`);
    } else {
      const cooldownMs = options.cooldownMs || 60000;
      info.status = 'cooling_down';
      info.exhaustedDate = null;
      info.exhaustedUntil = now + cooldownMs;
      logger.warn('GEMINI_ROTATOR', `⚠️ Rate Limit (RPM/TPM) hit for Key ${info.fingerprint}. Demoting to bottom of queue (Cooling down for ${cooldownMs / 1000}s).`);
    }

    // Demote to bottom of queue (FIFO rotation)
    const qIdx = this.state.queue.indexOf(key);
    if (qIdx !== -1) {
      this.state.queue.splice(qIdx, 1);
      this.state.queue.push(key);
    }

    this._saveState();
  }

  /**
   * Mark a key invocation as successful.
   * @param {string} key
   */
  markKeySuccess(key) {
    if (!key) return;
    if (!this.state.keys[key]) {
      this.state.keys[key] = {
        fingerprint: maskKey(key),
        status: 'active',
        totalCallsToday: 0,
        totalSuccess: 0,
        totalFailures: 0,
        consecutiveErrors: 0
      };
    }
    const info = this.state.keys[key];
    info.status = 'active';
    info.lastUsed = new Date().toISOString();
    info.totalCallsToday = (info.totalCallsToday || 0) + 1;
    info.totalSuccess = (info.totalSuccess || 0) + 1;
    info.consecutiveErrors = 0;
    info.lastError = null;
    this._saveState();
  }

  /**
   * Get an instantiated GoogleGenAI client with the active key.
   * @param {object} clientOptions
   * @returns {{ ai: GoogleGenAI, apiKey: string, fingerprint: string }}
   */
  getClient(clientOptions = {}) {
    const active = this.getActiveKey();
    if (!active || !active.apiKey) {
      throw new Error('No GEMINI_API_KEY available in pool.');
    }
    const ai = new GoogleGenAI({
      apiKey: active.apiKey,
      ...clientOptions
    });
    return {
      ai,
      apiKey: active.apiKey,
      fingerprint: active.fingerprint,
      allExhausted: !!active.allExhausted
    };
  }

  /**
   * Execute an operation with automatic smart key rotation & retry on rate limits.
   * @param {Function} operationFn Function receiving ({ ai, apiKey, fingerprint, GoogleGenAI, Type })
   * @param {object} options { maxRetries, model, timeoutMs }
   * @returns {Promise<any>}
   */
  async executeWithSmartRotation(operationFn, options = {}) {
    this._autoResetExhaustedKeys();
    const envKeys = this._getEnvKeys();
    const totalKeys = Math.max(1, envKeys.length);
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : totalKeys;

    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;
      const active = this.getActiveKey();

      if (!active || !active.apiKey) {
        throw new Error('No GEMINI_API_KEY configured in environment or .env file.');
      }

      if (active.allExhausted) {
        const waitSec = Math.ceil((active.nextAvailableMs || 5000) / 1000);
        logger.warn('GEMINI_ROTATOR', `All keys currently exhausted/cooling down. Earliest available key in ~${waitSec}s.`);
      }

      const client = new GoogleGenAI({
        apiKey: active.apiKey,
        ...options.clientOptions
      });

      try {
        const result = await operationFn({
          ai: client,
          apiKey: active.apiKey,
          fingerprint: active.fingerprint,
          GoogleGenAI,
          Type,
          model: options.model || DEFAULT_MODEL
        });

        this.markKeySuccess(active.apiKey);
        return result;
      } catch (err) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const status = err?.status || (err?.response ? err.response.status : null);
        const isRateLimit = status === 429 || /quota|resource_exhausted|rate limit|429/i.test(errMessage);

        if (isRateLimit) {
          logger.warn('GEMINI_ROTATOR', `Rate limit / quota error on key ${active.fingerprint}: ${errMessage.slice(0, 120)}`);
          this.markKeyExhausted(active.apiKey, err, { isDailyLimit: true });
          
          if (attempt < maxRetries) {
            logger.info('GEMINI_ROTATOR', `Rotating to next active key in pool (Attempt ${attempt + 1}/${maxRetries})...`);
            continue;
          }
          throw new ApiQuotaExhaustedError(`All keys exhausted. Operation failed after ${attempt} attempts across Gemini key pool: ${errMessage}`);
        }

        // For non-rate-limit errors or after retries exhausted, throw
        throw err;
      }
    }

    throw lastError || new ApiQuotaExhaustedError(`Operation failed after ${attempt} attempts across Gemini key pool.`);
  }

  /**
   * Get complete status and telemetry of all keys in pool.
   * @returns {object}
   */
  getPoolStatus() {
    this._autoResetExhaustedKeys();
    const now = Date.now();
    const statusReport = this.state.queue.map((key, index) => {
      const info = this.state.keys[key] || {};
      let timeRemainingSec = 0;
      if (info.exhaustedUntil && info.exhaustedUntil > now) {
        timeRemainingSec = Math.ceil((info.exhaustedUntil - now) / 1000);
      }

      return {
        queuePosition: index + 1,
        fingerprint: info.fingerprint || maskKey(key),
        status: info.status || 'active',
        isHead: index === 0,
        totalCallsToday: info.totalCallsToday || 0,
        totalSuccess: info.totalSuccess || 0,
        totalFailures: info.totalFailures || 0,
        lastUsed: info.lastUsed || 'never',
        timeUntilResetSec: timeRemainingSec,
        lastError: info.lastError ? info.lastError.slice(0, 80) : null
      };
    });

    const activeCount = statusReport.filter(k => k.status === 'active').length;

    return {
      totalKeys: statusReport.length,
      activeKeys: activeCount,
      exhaustedKeys: statusReport.length - activeCount,
      currentUtcDate: this.state.currentUtcDate,
      lastUpdated: this.state.lastUpdated,
      keys: statusReport
    };
  }
}

// Singleton global instance for the application process
const globalRotator = new GeminiKeyRotator();

module.exports = {
  GeminiKeyRotator,
  globalRotator,
  DEFAULT_MODEL,
  REASONING_MODEL,
  maskKey,
  ApiQuotaExhaustedError,
  getActiveKey: () => globalRotator.getActiveKey(),
  getClient: (opts) => globalRotator.getClient(opts),
  markKeyExhausted: (key, err, opts) => globalRotator.markKeyExhausted(key, err, opts),
  markKeySuccess: (key) => globalRotator.markKeySuccess(key),
  executeWithSmartRotation: (fn, opts) => globalRotator.executeWithSmartRotation(fn, opts),
  getPoolStatus: () => globalRotator.getPoolStatus()
};
