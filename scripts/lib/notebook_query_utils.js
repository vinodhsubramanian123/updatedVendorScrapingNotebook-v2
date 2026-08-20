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
} = require('./notebook/query_sanitizer.js');

const {
  postProcessNotebookResult,
  diagnoseNotebookFailure
} = require('./notebook/query_diagnostics.js');

const {
  startAsyncNotebookQueryJob: startJob,
  getAsyncNotebookQueryJobStatus,
  activeQueryJobs
} = require('./notebook/job_manager.js');

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
    const { queryLocalKnowledgeBase } = require('./local_rag_search.js');
    const logger = require('./pipeline_logger.js');
    const sanitizedQuery = sanitizeNotebookQuery(rawQuery, options.context);
    const timeoutMs = options.timeout || 60000;

    const envPath = process.env.PATH || '';
    const homeBin = path.join(process.env.HOME || '', '.local', 'bin');
    const nvmBin = path.join(process.env.HOME || '', '.nvm', 'versions', 'node', 'v22.12.0', 'bin');
    const extendedPath = `${nvmBin}:${homeBin}:${envPath}`;

    // Resolve nlm binary path
    const nlmUserPath = path.join(homeBin, 'nlm');
    let hasNlm = fs.existsSync(nlmUserPath);

    if (!hasNlm) {
      try {
        const { execSync } = require('child_process');
        execSync('which nlm', { env: { ...process.env, PATH: extendedPath }, stdio: 'ignore' });
        hasNlm = true;
      } catch (_) {
        hasNlm = false;
      }
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

      const processed = postProcessNotebookResult(stdout, sanitizedQuery);
      resolve(processed);
    });
  });
}

function startAsyncNotebookQueryJob(notebookId, rawQuery, options = {}) {
  return startJob(notebookId, rawQuery, options, executeNotebookQuery);
}

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
  activeQueryJobs
};
