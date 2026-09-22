'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cleanBaseSKU } = require('../catalog/sku');

const ROOT = path.resolve(__dirname, '../../..');

function hasVerifiedEvidence(rule) {
  const evidence = rule.evidence;
  if (!evidence?.sourceId || !evidence.section || !/^[a-f0-9]{64}$/i.test(evidence.artifactSha256 || '')) return false;
  const artifact = path.resolve(ROOT, evidence.artifactPath || '');
  const relative = path.relative(ROOT, artifact);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex') === evidence.artifactSha256;
  } catch (_) { return false; }
}

/** Account for bundled resources separately from orderable SKU quantities.
 * Evidence is product-scoped and checked against the retained source artifact.
 * Excess supply is advisory: spares, replacement optics and remote endpoints
 * must never be silently deleted or treated as physically installed parts.
 */
function evaluateBundleComposition(items, rules = [], productId = '') {
  const results = [];
  for (const rule of rules) {
    if (rule.productId !== productId || !hasVerifiedEvidence(rule)) continue;
    const baseItems = items.filter(item => cleanBaseSKU(item.sku) === rule.baseSku);
    const baseCount = baseItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (!Number.isInteger(baseCount) || baseCount <= 0) continue;
    let activePorts = baseCount * rule.baseActivePorts;
    let bundledOptics = baseCount * rule.baseIncludedOptics;
    const standalone = [];
    for (const item of items) {
      const sku = cleanBaseSKU(item.sku);
      const qty = Number(item.quantity || 0);
      if (!Number.isInteger(qty) || qty <= 0) continue;
      const upgrade = rule.upgrades?.[sku];
      if (upgrade) {
        activePorts += qty * upgrade.activePorts;
        bundledOptics += qty * upgrade.includedOptics;
      }
      const pack = rule.opticsPacks?.[sku];
      if (pack) standalone.push({ sku, quantity: qty, opticsPerPack: pack,
        switchPortAllocation: /\b(?:base|active|switch|local)\s+(?:active\s+)?ports\b/i.test(item.purpose || ''),
        remote: /\b(remote|endpoint|host|server|storage)\b/i.test(item.purpose || ''),
        spare: item.isSpare === true || /\b(spare|replacement)\b/i.test(`${item.purpose || ''} ${item.description || ''}`) });
    }
    const capacity = baseCount * rule.physicalPorts;
    const extraOptics = standalone.reduce((sum, item) => sum + item.quantity * item.opticsPerPack, 0);
    const excessOptics = Math.max(0, bundledOptics + extraOptics - Math.min(activePorts, capacity));
    const warnings = [];
    if (activePorts > capacity) warnings.push(`Bundle capacity violation: ${activePorts} licensed ports exceed ${capacity} physical ports for ${rule.baseSku}.`);
    if (excessOptics && standalone.some(item => !item.spare)) {
      warnings.push(`Bundle billing review: ${rule.baseSku} and its upgrade kits already supply ${bundledOptics} optics for ${activePorts} licensed ports. Separate optics add ${extraOptics}, leaving ${excessOptics} beyond switch port demand. Remove redundant packs only when allocated to those same switch ports; retain documented spares, replacements or remote-endpoint optics. Source: ${rule.evidence.sourceId}, ${rule.evidence.section}.`);
    }
    results.push({ productId, baseSku: rule.baseSku, baseCount, physicalPorts: capacity,
      activePorts, bundledOptics, separatelyOrderedOptics: extraOptics, excessOptics,
      standalone, warnings, evidence: rule.evidence, portalValidation: 'PENDING' });
  }
  return results;
}

module.exports = { evaluateBundleComposition };
