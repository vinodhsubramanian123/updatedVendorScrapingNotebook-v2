'use strict';
/**
 * scripts/lib/notebook/query_diagnostics.js — NotebookLM Query Diagnostics & Post-Processing
 *
 * Provides root-cause diagnosis for CLI/RAG failures and formats output citations.
 */

const { stripAnsi } = require('./query_sanitizer.js');

function postProcessNotebookResult(stdout, originalQuery = '', context = {}) {
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
    return validateGroundingCitations(result, context);
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

  // Parse inline citations if structured citations are empty
  if ((!result.citations || result.citations.length === 0) && result.answer) {
    const inlineMatches = [];
    const regex = /\[(?:cite:\s*(\d+)|source:\s*([^\]]+)|ref(?:erence)?\s*(\d+)|(\d+))\]/gi;
    let m;
    while ((m = regex.exec(result.answer)) !== null) {
      const index = m[1] || m[3] || m[4];
      const text = m[2];
      if (index) {
        const ref = (result.references || []).find(r => String(r.source_id) === String(index) || String(r.index) === String(index));
        inlineMatches.push({
          index,
          sourceId: ref?.source_id || index,
          title: ref?.title || ref?.cited_text || `Source ${index}`
        });
      } else if (text) {
        inlineMatches.push({
          index: String(inlineMatches.length + 1),
          sourceId: text.trim(),
          title: text.trim()
        });
      }
    }
    if (inlineMatches.length > 0) {
      result.citations = inlineMatches;
    }
  }

  return validateGroundingCitations(result, context);
}

const FORBIDDEN_SOURCE_PATTERN = /(?:customer|quote|proposal|tender|rfp|partner.*bom|boq|procurement)/i;
const AUTHORITATIVE_SOURCE_PATTERN = /(?:quickspecs|quick\s*specs|c0\d{5,}|oca[_\s-]*catalog|master[_\s-]*catalog|sku[_\s-]*catalog|universal[_\s-]*knowledge[_\s-]*charter|verified[_\s-]*knowledge[_\s-]*delta)/i;

/**
 * Validate that citations and sources used by NotebookLM reference ground-truth
 * documents (QuickSpecs, Catalogs, Payload Charters) and strictly forbid customer BOQs (INV-24).
 * @param {object} processedResult - Output from postProcessNotebookResult
 * @param {object} [context] - Context containing chassis / product info
 * @returns {object} Updated result with groundingTier and verificationStatus
 */
function validateGroundingCitations(processedResult, context = {}) {
  if (!processedResult) return processedResult;

  const citations = processedResult.citations || [];
  const sourcesUsed = processedResult.sourcesUsed || [];
  const references = processedResult.references || [];

  // Check for forbidden sources (customer BOQs, quotes, BOMs)
  const sourceText = value => typeof value === 'string'
    ? value
    : (value?.title || value?.name || value?.cited_text || value?.url || '');
  const sourceId = value => typeof value === 'object' && value
    ? (value.sourceId || value.source_id || value.id || '')
    : '';
  const allSources = [...citations, ...references, ...sourcesUsed];
  const allSourceTexts = allSources.map(sourceText).filter(Boolean);
  const citedSourceIds = allSources.map(sourceId).filter(Boolean).map(String);
  const authoritativeSourceIds = new Set((context.authoritativeSourceIds || []).filter(Boolean).map(String));

  // A vetted vendor source may discuss customer requirements or quotations.
  // Source identity takes precedence over keywords inside a cited passage.
  // Unknown/customer source IDs retain the fail-closed contamination gate.
  const hasForbiddenSource = allSources.some(value => !authoritativeSourceIds.has(String(sourceId(value))) && FORBIDDEN_SOURCE_PATTERN.test(sourceText(value)));

  if (hasForbiddenSource) {
    processedResult.groundingVerification = 'REJECTED_FORBIDDEN_SOURCE';
    processedResult.isCloudGrounded = false;
    processedResult.groundingTier = 'UNVERIFIED_FORBIDDEN_SOURCE';
    processedResult.warning = 'Citations referenced customer quote/BOQ sources, violating INV-24 isolation. Grounding demoted.';
    return processedResult;
  }

  // Verify authoritative source match
  const hasAuthoritativeSource = authoritativeSourceIds.size > 0
    ? citations.some(citation => authoritativeSourceIds.has(String(sourceId(citation))))
    : allSourceTexts.some(txt => AUTHORITATIVE_SOURCE_PATTERN.test(txt));

  if (citations.length > 0 && hasAuthoritativeSource) {
    processedResult.groundingVerification = 'VERIFIED_GROUNDED';
    processedResult.isCloudGrounded = true;
    processedResult.groundingTier = 'TIER_1_LIVE_CLOUD_GROUNDED';
  } else if (citations.length > 0 && !hasAuthoritativeSource) {
    // Citations exist but none matched authoritative pattern
    processedResult.groundingVerification = 'UNVERIFIED_NON_AUTHORITATIVE';
    processedResult.isCloudGrounded = false;
    processedResult.groundingTier = 'TIER_2_UNCITED_ADVISORY';
    processedResult.warning = 'Citations do not match certified vendor QuickSpecs or catalog sources.';
  } else {
    processedResult.groundingVerification = 'UNCITED_ADVISORY';
    processedResult.isCloudGrounded = false;
    processedResult.groundingTier = 'TIER_2_UNCITED_ADVISORY';
  }

  return processedResult;
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
  validateGroundingCitations,
  diagnoseNotebookFailure
};
