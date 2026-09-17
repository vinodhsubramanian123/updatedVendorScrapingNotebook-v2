'use strict';
const crypto = require('crypto');

function solutionManifest(evaluation) {
  const candidates = evaluation.conflictGraph?.recommendedSolutions || evaluation.conflictGraph?.rankedSolutions || [];
  return candidates.map(candidate => ({
    rank: candidate.rank,
    nodeCount: evaluation.clusterSizing?.totalNodes || evaluation.serverCount || 1,
    parts: (candidate.skuPartsList || candidate.skuList || []).map(part => ({ sku: String(part.sku || part['Product #'] || '').trim(), quantity: Number(part.quantity ?? part.qty) })).sort((a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity)
  })).sort((a, b) => String(a.rank).localeCompare(String(b.rank)));
}

function solutionFingerprint(evaluation) {
  const baseline = (evaluation.items || []).map(part => ({
    sku: String(part.sku || part['Product #'] || '').trim(),
    quantity: Number(part.quantity ?? part.qty),
    description: part.description || ''
  })).sort((a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity);
  return crypto.createHash('sha256').update(JSON.stringify({
    chassis: evaluation.chassis || evaluation.chassisVariant || evaluation.targetChassis || evaluation.detectedChassis || null,
    baseline,
    requirements: evaluation.requirementResolution || null,
    candidates: solutionManifest(evaluation)
  })).digest('hex');
}

function candidateReviewCurrent(evaluation) {
  const review = evaluation.ephemeralSourceValidation;
  const manifest = solutionManifest(evaluation);
  const valid = manifest.length > 0 && manifest.every(candidate => Number.isSafeInteger(candidate.nodeCount) && candidate.nodeCount > 0 && candidate.parts.length > 0 && candidate.parts.every(part => part.sku && Number.isSafeInteger(part.quantity) && part.quantity > 0));
  return valid && review?.success === true && review.manifestSha256 === solutionFingerprint(evaluation);
}

function candidateDelta(baseline, candidate) {
  const quantities = parts => {
    const map = new Map();
    for (const part of parts) {
      const sku = String(part.sku || part['Product #'] || '').trim();
      map.set(sku, (map.get(sku) || 0) + Number(part.quantity ?? part.qty ?? 0));
    }
    return map;
  };
  const before = quantities(baseline);
  const after = quantities(candidate.skuPartsList || candidate.skuList || []);
  return [...new Set([...before.keys(), ...after.keys()])].sort().map(sku => ({ sku, before: before.get(sku) || 0, after: after.get(sku) || 0 })).filter(row => row.before !== row.after);
}
module.exports = { solutionManifest, solutionFingerprint, candidateReviewCurrent, candidateDelta };
