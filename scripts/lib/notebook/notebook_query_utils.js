'use strict';
/**
 * scripts/lib/notebook_query_utils.js — Centralized Gemini Notebook Query Coordinator
 *
 * Coordinates query sanitization, execution via nlm CLI, async job tracking,
 * and result post-processing.
 *
 * Refactored into modular subcomponents:
 * - scripts/lib/notebook/query_sanitizer.js
 * - scripts/lib/notebook/query_diagnostics.js
 * - scripts/lib/notebook/job_manager.js
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const {
  SCRIPTING_PATTERNS,
  classifyQueryScenario,
  stripAnsi,
  sanitizeNotebookQuery,
  getSanitizationBreakdown
} = require('./query_sanitizer.js');

const {
  postProcessNotebookResult,
  diagnoseNotebookFailure
} = require('./query_diagnostics.js');

const {
  startAsyncNotebookQueryJob: startJob,
  getAsyncNotebookQueryJobStatus,
  activeQueryJobs
} = require('./job_manager.js');

// Fast in-memory & disk cache for repeated RAG queries within and across workflow steps
const queryCache = new Map();
const RAG_CACHE_FILE = path.join(__dirname, '..', '..', 'outputs', 'history', 'rag_cache.json');

try {
  if (fs.existsSync(RAG_CACHE_FILE)) {
    const rawDisk = JSON.parse(fs.readFileSync(RAG_CACHE_FILE, 'utf-8'));
    if (typeof rawDisk === 'object' && rawDisk !== null) {
      for (const [k, v] of Object.entries(rawDisk)) {
        queryCache.set(k, v);
      }
    }
  }
} catch (_) {}

function persistRagCache() {
  try {
    const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
    const obj = {};
    for (const [k, v] of queryCache.entries()) {
      obj[k] = v;
    }
    safeWriteJsonAtomic(RAG_CACHE_FILE, obj);
  } catch (_) {}
}

/**
 * Safely execute Gemini Notebook query via nlm CLI using child_process.execFile.
 * Pre-processes the prompt and post-processes the result.
 * @param {string} notebookId 
 * @param {string} rawQuery 
 * @param {object} [options] 
 * @returns {Promise<object>} Normalized result { query, answer, citations, source }
 */
function executeNotebookQuery(notebookId, rawQuery, options = {}) {
  return new Promise((resolve) => {
    const { queryLocalKnowledgeBase } = require('../rag/local_rag_search.js');
    const logger = require('../system/pipeline_logger.js');
    const sanitizedQuery = sanitizeNotebookQuery(rawQuery, options.context);
    const timeoutMs = options.timeout || 120000;

    const cacheKey = `${notebookId || 'default'}:${sanitizedQuery.trim()}`;
    if (!options.bypassCache && queryCache.has(cacheKey)) {
      logger.info('NOTEBOOK_QUERY', `RAG query cache hit for key [${cacheKey.slice(0, 40)}...]`);
      return resolve({
        ...queryCache.get(cacheKey),
        cached: true
      });
    }

    if (process.env.USE_LOCAL_RAG_ONLY === '1' || process.env.LOCAL_EVAL_ONLY === '1') {
      const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
      return resolve({
        ...localRes,
        source: 'LOCAL_RAG_FALLBACK',
        fallbackReason: 'Local evaluation mode explicitly configured (USE_LOCAL_RAG_ONLY/LOCAL_EVAL_ONLY)'
      });
    }

    const envPath = process.env.PATH || '';
    const homeBin = path.join(process.env.HOME || '', '.local', 'bin');
    const nvmBin = path.join(process.env.HOME || '', '.nvm', 'versions', 'node', 'v22.12.0', 'bin');
    const extendedPath = `${nvmBin}:${homeBin}:${envPath}`;

    // Resolve nlm binary path
    const nlmUserPath = path.join(homeBin, 'nlm');
    let hasNlm = fs.existsSync(nlmUserPath);

    if (!hasNlm) {
      const isWin = process.platform === 'win32';
      const binaryName = isWin ? 'nlm.cmd' : 'nlm';
      const searchDirs = extendedPath.split(path.delimiter).filter(Boolean);
      hasNlm = searchDirs.some(dir => {
        try {
          return fs.existsSync(path.join(dir, binaryName));
        } catch (_) {
          return false;
        }
      });
    }

    if (!hasNlm) {
      logger.warn('NOTEBOOK_QUERY', 'nlm CLI executable not found in PATH (~/.local/bin/nlm). Falling back to Local RAG.');
      const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
      return resolve({
        ...localRes,
        source: 'LOCAL_RAG_FALLBACK',
        fallbackReason: 'NLM CLI executable not installed in environment'
      });
    }

    const nlmExecutable = fs.existsSync(nlmUserPath) ? nlmUserPath : 'nlm';

    execFile(nlmExecutable, ['notebook', 'query', notebookId, sanitizedQuery, '--json'], {
      timeout: timeoutMs,
      env: { ...process.env, PATH: extendedPath },
      maxBuffer: 10 * 1024 * 1024
    }, (err, stdout, stderr) => {
      if (err) {
        logger.warn('NOTEBOOK_QUERY', `Live NotebookLM Cloud query failed (${err.message || 'Execution error'}). Falling back to Local RAG.`, { stderr });
        try {
          const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
          return resolve({
            ...localRes,
            source: 'LOCAL_RAG_FALLBACK',
            fallbackReason: `Live Cloud Query Error: ${err.message || 'Execution error'}`
          });
        } catch (localErr) {
          return resolve({
            query: sanitizedQuery,
            answer: `NotebookLM RAG Query Error: ${err.message || 'Execution error'}`,
            citations: [],
            source: 'FALLBACK_ERROR',
            error: err.message
          });
        }
      }

      let processed = postProcessNotebookResult(stdout, sanitizedQuery);
      if (!processed || !processed.answer || processed.answer.includes('No response returned')) {
        try {
          const { queryLocalKnowledgeBase } = require('../rag/local_rag_search.js');
          const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
          processed = {
            ...localRes,
            source: 'LOCAL_RAG_FALLBACK',
            fallbackReason: 'Empty response from NotebookLM'
          };
        } catch (e) {}
      }
      if (processed && processed.answer) {
        queryCache.set(cacheKey, processed);
        persistRagCache();
      }
      resolve(processed);
    });
  });
}

function startAsyncNotebookQueryJob(notebookId, rawQuery, options = {}) {
  return startJob(notebookId, rawQuery, options, executeNotebookQuery);
}

const {
  extractKnowledgeFromRagAnswer,
  extractAndPersistLearnedDeltas
} = require('./knowledge_extractor.js');

module.exports = {
  SCRIPTING_PATTERNS,
  sanitizeNotebookQuery,
  getSanitizationBreakdown,
  classifyQueryScenario,
  stripAnsi,
  postProcessNotebookResult,
  executeNotebookQuery,
  startAsyncNotebookQueryJob,
  getAsyncNotebookQueryJobStatus,
  diagnoseNotebookFailure,
  activeQueryJobs,
  extractKnowledgeFromRagAnswer,
  extractAndPersistLearnedDeltas
};
