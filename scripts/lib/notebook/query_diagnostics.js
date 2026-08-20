'use strict';
/**
 * scripts/lib/notebook/query_diagnostics.js — NotebookLM Query Diagnostics & Post-Processing
 *
 * Provides root-cause diagnosis for CLI/RAG failures and formats output citations.
 */

const { stripAnsi } = require('./query_sanitizer.js');

function postProcessNotebookResult(stdout, originalQuery = '') {
  const result = {
    query: originalQuery,
    answer: '',
    citations: [],
    sourcesUsed: [],
    source: 'NOTEBOOK_LM_CLOUD'
  };

  if (!stdout) {
    result.answer = 'No response returned from Gemini Notebook.';
    result.source = 'LOCAL_RAG_FALLBACK';
    result.fallbackReason = 'Empty response from NotebookLM';
    return result;
  }

  if (typeof stdout === 'object') {
    result.answer = stdout.answer || stdout.response || JSON.stringify(stdout);
    result.citations = Array.isArray(stdout.citations) ? stdout.citations : Object.entries(stdout.citations || {}).map(([k, v]) => ({ index: k, sourceId: v }));
    result.sourcesUsed = stdout.sources_used || [];
    return result;
  }

  const cleanStdout = stripAnsi(stdout).trim();

  try {
    const parsed = JSON.parse(cleanStdout);
    result.answer = parsed.answer || parsed.response || parsed.result || cleanStdout;
    result.sourcesUsed = parsed.sources_used || [];
    
    if (Array.isArray(parsed.citations)) {
      result.citations = parsed.citations;
    } else if (parsed.citations && typeof parsed.citations === 'object') {
      result.citations = Object.entries(parsed.citations).map(([k, v]) => ({
        index: k,
        sourceId: v,
        title: (parsed.references && parsed.references.find(r => r.source_id === v)?.cited_text) || `Source ${v}`
      }));
    }
    if (parsed.references && Array.isArray(parsed.references)) {
      result.references = parsed.references;
    }
  } catch (_) {
    result.answer = cleanStdout;
  }

  if (result.answer.startsWith('{') && result.answer.endsWith('}')) {
    try {
      const inner = JSON.parse(result.answer);
      if (inner.answer) result.answer = inner.answer;
    } catch (_) {}
  }

  return result;
}

function diagnoseNotebookFailure(notebookId, err) {
  const diagnostic = {
    errorType: 'UNKNOWN_FAILURE',
    rootCause: err ? err.message : 'Timeout or execution failure',
    remediationAction: 'Check network connectivity and nlm CLI auth state.'
  };

  if (!err) return diagnostic;

  const errMsg = err.message || '';
  if (errMsg.includes('ENOENT') || errMsg.includes('not found')) {
    diagnostic.errorType = 'CLI_NOT_INSTALLED';
    diagnostic.rootCause = 'nlm CLI binary not detected in PATH (~/.local/bin/nlm).';
    diagnostic.remediationAction = 'Run `uv tool install notebooklm-mcp-cli` to install nlm CLI.';
  } else if (errMsg.includes('401') || errMsg.includes('UNAUTHENTICATED') || errMsg.includes('auth')) {
    diagnostic.errorType = 'AUTH_EXPIRED';
    diagnostic.rootCause = 'NotebookLM session token expired or unauthenticated.';
    diagnostic.remediationAction = 'Run `nlm login` in terminal to refresh Google Auth credentials.';
  } else if (errMsg.includes('ETIMEDOUT') || errMsg.includes('timeout')) {
    diagnostic.errorType = 'QUERY_TIMEOUT';
    diagnostic.rootCause = 'NotebookLM response exceeded wait window due to heavy source processing.';
    diagnostic.remediationAction = 'Use async non-blocking polling mode via startAsyncNotebookQueryJob.';
  } else if (errMsg.includes('NOT_FOUND') || errMsg.includes('404')) {
    diagnostic.errorType = 'INVALID_NOTEBOOK_ID';
    diagnostic.rootCause = `Target Notebook ID '${notebookId}' not found in Google account.`;
    diagnostic.remediationAction = 'Verify notebooks.json mapping or run `nlm notebook list`.';
  }

  return diagnostic;
}

module.exports = {
  postProcessNotebookResult,
  diagnoseNotebookFailure
};
