export const EXPLANATIONS = {
  INPUT_AMBIGUITY: ['Unresolved customer requirements', 'Confirm the platform, quantities, and missing requirements in the evaluation inbox.'],
  CATALOG_GAP: ['Missing or uncataloged SKU evidence', 'Verify the SKU in the exact product catalog and queue a scoped refresh if it is missing.'],
  PHYSICAL_VIOLATION: ['Physical constraints or required components', 'Open the affected run and correct the failed hardware checks before re-evaluating.'],
  RAG_DISCREPANCY: ['Catalog checks and NotebookLM disagree', 'Compare the exact product evidence with the conflicting rule before accepting the result.'],
  BUDGET_OVERRUN: ['Price exceeds the target budget', 'Review the priced BOM and confirm any unpublished prices before changing the design.'],
  ADVISORY_WARNING: ['Evaluation advisories', 'Review the warnings in the affected run and confirm whether any apply to the requested build.'],
  CLEAN_BUILD: ['Clean builds', 'Review the affected run’s confidence details and evidence for any remaining open checks.']
};

const EMPTY_EVALUATION_INSIGHTS = {
  evaluations: ['No evaluation history in the current window.', 'Run a BOQ evaluation to populate the ledger.'],
  confidence: ['No low-confidence runs in the current window.', 'Open an individual run to review its score and any outstanding confirmations.'],
  violations: ['No critical violations in the current window.', 'Open a run’s aspect checks to review any remaining warnings.']
};

function mostFrequent(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = key(item);
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0] || [];
}

export function isLowConfidenceRun(entry) {
  const score = entry.confidenceScore ?? entry.confidence;
  return entry.isHitlTriggered === true || (Number.isFinite(score) && score < (score > 1 ? 85 : 0.85));
}

export function formatConfidence(score) {
  return Number.isFinite(score) ? `${Math.round(score > 1 ? score : score * 100)}%` : 'Unmeasured';
}

export function evaluationInsight(rows, metric) {
  if (!rows.length) {
    const [why, action] = EMPTY_EVALUATION_INSIGHTS[metric];
    return { why, action };
  }
  const [cause, count] = mostFrequent(rows, row => row.rootCauseAttribution);
  const explanation = EXPLANATIONS[cause];
  return explanation
    ? { why: `Most frequent recorded cause is ${explanation[0].toLowerCase()} (${count} of ${rows.length} runs shown).`, action: explanation[1] }
    : { why: 'These runs have no recorded cause attribution.', action: 'Open the affected run and inspect its decision trace and blockers.' };
}

export function learningInsight(deltas) {
  const pending = deltas.filter(delta => ['QUARANTINED', 'PENDING_REVIEW'].includes(delta.governanceStatus));
  const [rule, count] = mostFrequent(pending, delta => [delta.errorType, delta.chassis, delta.affectedSku].filter(Boolean).join(' · '));
  if (rule) {
    return {
      why: `${pending.length} logged observations are pending review. Most frequent is ${rule} (${count}).`,
      action: 'Open the quarantine review, confirm the exact vendor evidence and product scope, then approve or reject the rule.'
    };
  }
  const [category, frequency] = mostFrequent(deltas, delta => delta.errorType);
  return {
    why: category ? `${category} is the most frequent recorded rule category (${frequency}).` : 'No rule observations are recorded.',
    action: 'Review provenance for a recorded rule or submit an exact, evidence-backed portal observation if the conflict recurs.'
  };
}

const STAGE_LABELS = {
  stage1ParsingMs: 'BOQ parsing',
  stage2AspectMathMs: 'Hardware checks',
  stage3RAGConsultationMs: 'NotebookLM grounding',
  stage4GeminiVerificationMs: 'Agentic verification',
  stage5ResolutionMatrixMs: 'Resolution matrix'
};

export function durationInsight(history) {
  const averages = Object.entries(STAGE_LABELS).flatMap(([key, label]) => {
    const samples = history.map(row => row.stageTimingsMeasured === false ? null : row.stageBreakdown?.[key]).filter(value => Number.isFinite(value) && value > 0);
    if (!samples.length) return [];
    return [{ label, average: samples.reduce((total, value) => total + value, 0) / samples.length }];
  });
  const slowest = averages.sort((a, b) => b.average - a.average)[0];
  return {
    why: slowest ? `${slowest.label} has the highest recorded average (${Math.round(slowest.average)} ms).` : 'No stage timings are available in the current window.',
    action: slowest ? `Check ${slowest.label.toLowerCase()} in the slowest run’s execution trace.` : 'Run an evaluation with stage profiling enabled.'
  };
}

export function exportInsight({ totalExports, exportHistory = [] }) {
  const latest = exportHistory[0];
  if (latest) {
    return {
      why: `The latest recorded export is ${latest.filename || 'a workbook'}${latest.rank ? ` from Rank ${latest.rank}` : ''}.`,
      action: 'Match its run and candidate digests to the evaluation before sharing the workbook.'
    };
  }
  return {
    why: totalExports > 0 ? `${totalExports} exports are recorded without recent workbook details in telemetry.` : 'Telemetry has no recorded workbook exports or export failure causes.',
    action: 'Open the export ledger. For a missing workbook, inspect delivery blockers on the source evaluation.'
  };
}

