'use strict';
/**
 * scripts/lib/feedback/post_run_reflection.js — Automated Post-Execution Reflection & Learning Queue (INV-279)
 *
 * Inspects verified execution outcomes (aspect misses, QuickSpecs RAG discrepancies, verified
 * counterfactual repair wins, uncataloged HPE SKUs) while rejecting unverified Tier-0 claims (INV-24).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic, safeWriteTextAtomic, withFileLock } = require('../system/fs_compat.js');
const { isValidHpeSKU, cleanBaseSKU } = require('../catalog/sku.js');
const { SKU_BLACKLIST } = require('./quarantined_deltas.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_IMPROVEMENT_QUEUE_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'learning', 'instruction_improvement_queue.json');
const DEFAULT_ACTIVE_DIGEST_PATH = path.join(PROJECT_ROOT, '.agents', 'ACTIVE_LEARNINGS_DIGEST.md');

const UNTRUSTED_TERM_RE = /\b(customer\s*(?:boq|quote|tender|upload)|unverified\s*(?:rfp|claim)|partner\s*bom)\b/i;

function _resolveChassisName(context = {}, responseData = {}, analysis = {}) {
  return context.chassisName ||
    analysis?.contextClassification?.platform ||
    responseData?.chassis ||
    (context.chassisDir ? path.basename(context.chassisDir) : null) ||
    'UNSPECIFIED_PLATFORM';
}

function _isValidTargetSku(rawSku) {
  if (!rawSku) return true;
  const clean = cleanBaseSKU(rawSku);
  return isValidHpeSKU(clean) && !SKU_BLACKLIST.has(clean.toUpperCase());
}

function _isTier0Contaminated(candidate, analysis, responseData) {
  if (!candidate || typeof candidate !== 'object') return true;
  const text = `${candidate.summary || ''} ${candidate.ruleUpdate || ''} ${candidate.source || ''}`;
  if (UNTRUSTED_TERM_RE.test(text)) return true;
  if (!_isValidTargetSku(candidate.affectedSku) || !_isValidTargetSku(candidate.targetSku)) return true;

  const isDeterministicSource = ['DETERMINISTIC_ASPECT_EVALUATION', 'SELF_CORRECTION_WIN', 'CATALOG_COVERAGE_GAP'].includes(candidate.sourceType);
  const tier = analysis?.epistemicIntegrity?.tier || 'TIER_0_UNTRUSTED_CLAIM';
  if (tier === 'TIER_0_UNTRUSTED_CLAIM' && !isDeterministicSource) return true;
  if (candidate.sourceType === 'DETERMINISTIC_ASPECT_EVALUATION' && responseData?.aspectChecksCompleted === false) return true;
  return false;
}

function _pushMissingDepCandidates(missingDeps, chassis, candidates) {
  for (const dep of missingDeps) {
    const sku = cleanBaseSKU(dep?.affectedSku || dep?.triggerSku || '');
    const targetSku = cleanBaseSKU(dep?.key || dep?.sku || '');
    const summary = String(dep?.reason || dep?.detail || dep?.name || targetSku || 'Missing mandatory kit').trim();
    if (!summary) continue;
    candidates.push({
      category: 'MANDATORY_DEPENDENCY',
      sourceType: 'DETERMINISTIC_ASPECT_EVALUATION',
      chassis,
      affectedSku: sku || null,
      targetSku: targetSku || null,
      summary,
      ruleUpdate: targetSku ? `Require ${targetSku} when condition applies (${summary})` : summary,
      verifiedPortalOrHumanReceipt: false
    });
  }
}

function _pushDiscrepancyCandidates(discrepancies, chassis, candidates) {
  for (const disc of discrepancies) {
    const summary = String(disc?.detail || disc?.message || disc?.reason || '').trim();
    if (!summary) continue;
    candidates.push({
      category: 'RAG_DISCREPANCY',
      sourceType: 'RAG_DISCREPANCY',
      chassis,
      affectedSku: cleanBaseSKU(disc?.sku || '') || null,
      targetSku: null,
      summary,
      ruleUpdate: `Reconcile QuickSpecs rule delta: ${summary}`,
      verifiedPortalOrHumanReceipt: Boolean(disc?.officialSourceId)
    });
  }
}

function _pushSelfCorrectionCandidates(trail, chassis, candidates) {
  for (const step of trail) {
    if (step?.status !== 'RESOLVED' || step?.verifiedBuildable !== true) continue;
    const actionText = String(step.selfCorrectionAction || step.contestedResourceType || 'Topology pivot').trim();
    candidates.push({
      category: 'SELF_CORRECTION_WIN',
      sourceType: 'SELF_CORRECTION_WIN',
      chassis,
      affectedSku: cleanBaseSKU(step?.pivotFromSku || '') || null,
      targetSku: cleanBaseSKU(step?.pivotToSku || '') || null,
      summary: actionText,
      ruleUpdate: `Prefer verified pivot rule: ${actionText}`,
      verifiedPortalOrHumanReceipt: false
    });
  }
}

function _pushUncatalogedCandidates(uncatalogedSkus, chassis, candidates) {
  for (const gap of uncatalogedSkus) {
    const sku = cleanBaseSKU(typeof gap === 'string' ? gap : (gap?.sku || ''));
    if (!sku || !isValidHpeSKU(sku)) continue;
    candidates.push({
      category: 'CATALOG_COVERAGE_GAP',
      sourceType: 'CATALOG_COVERAGE_GAP',
      chassis,
      affectedSku: sku,
      targetSku: null,
      summary: `Valid HPE SKU ${sku} absent from scraped snapshot for ${chassis}`,
      ruleUpdate: `Queue targeted catalog refresh for missing HPE option SKU ${sku} on ${chassis}`,
      verifiedPortalOrHumanReceipt: false
    });
  }
}

function _extractCandidatesFromRun({ responseData = {}, analysis = {}, context = {} }) {
  const candidates = [];
  const chassis = _resolveChassisName(context, responseData, analysis);
  const missingDeps = responseData.missingDependencies || responseData.evaluation?.missingDependencies || [];
  _pushMissingDepCandidates(missingDeps, chassis, candidates);
  _pushDiscrepancyCandidates(responseData.opinionDiscrepancies || [], chassis, candidates);
  _pushSelfCorrectionCandidates(analysis?.selfCorrectionTrail || responseData.selfCorrectionTrail || [], chassis, candidates);
  _pushUncatalogedCandidates(responseData.uncatalogedSkus || [], chassis, candidates);
  return candidates;
}

function _buildRuleKey(candidate) {
  const canonical = [
    candidate.chassis,
    candidate.category,
    candidate.affectedSku || '',
    candidate.targetSku || '',
    candidate.ruleUpdate.toLowerCase().replace(/\s+/g, ' ').trim()
  ].join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

function _loadQueueUnlocked(queuePath) {
  if (fs.existsSync(queuePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      if (parsed && Array.isArray(parsed.entries)) return parsed;
    } catch { /* fall through to empty queue */ }
  }
  return { version: '1.0.0', lastUpdated: new Date().toISOString(), entries: [] };
}

function _upsertQueueEntries(queue, acceptedCandidates, traceId) {
  const now = new Date().toISOString();
  let enqueuedCount = 0;
  let updatedCount = 0;

  for (const cand of acceptedCandidates) {
    const ruleKey = _buildRuleKey(cand);
    const existing = queue.entries.find(e => e.ruleKey === ruleKey && e.status !== 'RETRACTED');
    if (existing) {
      if (!Array.isArray(existing.distinctTraces)) existing.distinctTraces = [];
      if (!existing.distinctTraces.includes(traceId)) {
        existing.distinctTraces.push(traceId);
        existing.authoritativeObservationCount = existing.distinctTraces.length;
        updatedCount++;
      }
      if (cand.verifiedPortalOrHumanReceipt) existing.verifiedPortalOrHumanReceipt = true;
      existing.readyForPromotion = Boolean(existing.verifiedPortalOrHumanReceipt || existing.authoritativeObservationCount >= 3);
      existing.lastObservedAt = now;
    } else {
      const obsCount = 1;
      queue.entries.push({
        proposalId: `LEARN-${ruleKey.slice(0, 10).toUpperCase()}`,
        ruleKey,
        status: 'PENDING',
        category: cand.category,
        sourceType: cand.sourceType,
        chassis: cand.chassis,
        affectedSku: cand.affectedSku,
        targetSku: cand.targetSku,
        summary: cand.summary,
        ruleUpdate: cand.ruleUpdate,
        distinctTraces: [traceId],
        authoritativeObservationCount: obsCount,
        verifiedPortalOrHumanReceipt: Boolean(cand.verifiedPortalOrHumanReceipt),
        readyForPromotion: Boolean(cand.verifiedPortalOrHumanReceipt || obsCount >= 3),
        firstObservedAt: now,
        lastObservedAt: now
      });
      enqueuedCount++;
    }
  }
  queue.lastUpdated = now;
  return { enqueuedCount, updatedCount };
}

function refreshActiveLearningsDigest(queue, digestPath = DEFAULT_ACTIVE_DIGEST_PATH) {
  const entries = Array.isArray(queue?.entries) ? queue.entries : [];
  const pending = entries.filter(e => e.status === 'PENDING');
  const ready = pending.filter(e => e.readyForPromotion);
  const promoted = entries.filter(e => e.status === 'PROMOTED');

  const lines = [
    '# Active Learnings Digest',
    '',
    '> Auto-updated summary of certified repository rules, active product deltas, and pending reflection queue items (`INV-279`). Run `npm run learn:promote -- --dry-run` to inspect promotable learnings.',
    '',
    '- **Portfolio Baseline**: `17` active live-scraped HPE product lines (`CLOUD_VERIFIED`) + `2` quarantined legacy stubs (`Alletra_Storage_System`, `GX5000_General_RACK`).',
    '- **Two-Lane Reflection**: Non-test CLI and Dashboard evaluations emit `PostRunReflectionReceipt` proposals to `outputs/history/learning/instruction_improvement_queue.json` without trusting unverified customer claims (`INV-24`).',
    '- **Promotion Rule**: Only items with `>= 3` independent authoritative observations (`INV-225`) or verified portal/human receipts promote into `Catalog_Rules.json` and `master_knowledge_registry.json`, gated by `validate_skills_integrity.js` and `evaluate_solution_intelligence_quality.js`.',
    '',
    '## Reflection Queue Status',
    `- **Pending Proposals**: ${pending.length} (${ready.length} ready for promotion)`,
    `- **Promoted Instructions / Rules**: ${promoted.length}`,
    `- **Last Updated**: ${queue?.lastUpdated || new Date().toISOString()}`
  ];

  if (pending.length > 0) {
    lines.push('', '## Pending Reflection Proposals (Top 10)');
    for (const item of pending.slice(0, 10)) {
      lines.push(`- \`${item.proposalId}\` [${item.chassis}] (${item.authoritativeObservationCount} obs${item.readyForPromotion ? ', READY' : ''}): ${item.summary}`);
    }
  }

  safeWriteTextAtomic(digestPath, `${lines.join('\n')}\n`);
  return digestPath;
}

function _shouldSkipReflectionPersistence(context = {}, options = {}, queuePath) {
  const isDefaultQueue = path.resolve(queuePath) === path.resolve(DEFAULT_IMPROVEMENT_QUEUE_PATH);
  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
  if (context.persistLedger === false || context.isolatedMode === true || Boolean(process.env.SKILL_ISOLATION_ROOT)) {
    return !(options.forceReflection === true && !isDefaultQueue);
  }
  if (isTestEnv) {
    return !(options.forceReflection === true && !isDefaultQueue);
  }
  return false;
}

function runPostExecutionReflection({
  context = {},
  responseData = {},
  analysis = {},
  traceId = null,
  options = {}
} = {}) {
  const queuePath = path.resolve(options.queuePath || DEFAULT_IMPROVEMENT_QUEUE_PATH);
  const digestPath = path.resolve(options.digestPath || DEFAULT_ACTIVE_DIGEST_PATH);
  const effectiveTraceId = traceId || analysis?.traceId || responseData?.traceId || `TRC-${Date.now()}`;

  const rawCandidates = _extractCandidatesFromRun({ responseData, analysis, context });
  const accepted = [];
  let rejectedTier0Count = 0;

  for (const cand of rawCandidates) {
    if (_isTier0Contaminated(cand, analysis, responseData)) {
      rejectedTier0Count++;
    } else {
      accepted.push(cand);
    }
  }

  if (_shouldSkipReflectionPersistence(context, options, queuePath)) {
    return {
      status: 'SKIPPED_ISOLATED_OR_TEST',
      traceId: effectiveTraceId,
      inspectedCount: rawCandidates.length,
      acceptedCount: accepted.length,
      rejectedTier0Count,
      enqueuedCount: 0,
      updatedCount: 0,
      queuePath: null
    };
  }

  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  const outcome = withFileLock(queuePath, () => {
    const queue = _loadQueueUnlocked(queuePath);
    const { enqueuedCount, updatedCount } = _upsertQueueEntries(queue, accepted, effectiveTraceId);
    safeWriteJsonAtomic(queuePath, queue);
    if (options.refreshDigest !== false) {
      refreshActiveLearningsDigest(queue, digestPath);
    }
    return { enqueuedCount, updatedCount, queueSize: queue.entries.length };
  });

  return {
    status: (outcome.enqueuedCount + outcome.updatedCount) > 0 ? 'REFLECTION_QUEUED' : 'AUDITED_NO_NEW_DELTAS',
    traceId: effectiveTraceId,
    inspectedCount: rawCandidates.length,
    acceptedCount: accepted.length,
    rejectedTier0Count,
    ...outcome,
    queuePath,
    digestPath: options.refreshDigest !== false ? digestPath : null
  };
}

module.exports = {
  runPostExecutionReflection,
  refreshActiveLearningsDigest,
  DEFAULT_IMPROVEMENT_QUEUE_PATH,
  DEFAULT_ACTIVE_DIGEST_PATH
};
