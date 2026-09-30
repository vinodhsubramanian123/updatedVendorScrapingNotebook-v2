'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cleanBaseSKU } = require('../catalog/sku');
const { resolveProductIdentity } = require('../catalog/product_scope');
const notebooks = require('../../config/notebooks.json');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
const digest = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const skuOf = row => String(row.sku || row['Product #'] || '').trim().toUpperCase();

function loadEvidence(targetDir) {
  const result = { observations: [], rules: [], gaps: [] };
  if (!targetDir) return result;
  for (const [relative, kind] of [
    ['raw_data/conditional_skus.json', 'observations'],
    [`${path.basename(targetDir)}_Catalog_Rules.json`, 'rules']
  ]) {
    const file = path.join(targetDir, relative);
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      result[kind] = Array.isArray(data) ? data : (data.skus || data.conditionalSKUs || data.rules || []);
      if (!Array.isArray(result[kind])) throw new Error('Expected evidence array');
    } catch (_) {
      result[kind] = [];
      result.gaps.push(`UNREADABLE_EVIDENCE:${relative}`);
    }
  }
  return result;
}

/** Cheap deterministic planning only: never mutate a portal or infer orderability.
 * Preserve configuration ownership, exact SKU suffixes and quantities in the hash.
 * Catalog base-SKU lookup is a discovery hint, never an acceptance receipt. */
function buildRuntimeDiscoveryPlan(evaluation = {}, options = {}) {
  const targetDir = options.targetDir || options.catalogDir || '';
  let catalog = options.catalogData || evaluation.catalogData;
  let catalogReadFailed = false;
  if (!catalog && targetDir) {
    try { catalog = JSON.parse(fs.readFileSync(path.join(targetDir, `${path.basename(targetDir)}_Catalog.json`), 'utf8')); }
    catch (_) { catalogReadFailed = true; }
  }
  catalog = catalog || {};
  const product = options.productId || (targetDir ? path.basename(targetDir) : '') ||
    catalog.metadata?.model || evaluation.chassis || evaluation.conflictGraph?.chassisInfo?.id || '';
  const identity = resolveProductIdentity(product, notebooks);
  const evidence = loadEvidence(targetDir);
  if (catalogReadFailed) evidence.gaps.push('SCOPED_CATALOG_UNAVAILABLE');
  let services = options.servicesData || {};
  const serviceFile = targetDir && path.join(targetDir, `${path.basename(targetDir)}_Services.json`);
  if (!options.servicesData && serviceFile && fs.existsSync(serviceFile)) {
    try { services = JSON.parse(fs.readFileSync(serviceFile, 'utf8')); }
    catch (_) { evidence.gaps.push('SCOPED_SERVICES_UNREADABLE'); }
  }
  const catalogRows = [...(catalog.entries || []), ...(services.entries || [])]
    .flatMap(entry => (entry.skus || []).map(row => ({ ...row, parentCategory: entry.parentCategory })));
  const index = new Map();
  for (const row of catalogRows) {
    const key = cleanBaseSKU(skuOf(row));
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(row);
  }
  const catalogSha256 = digest({ catalog, services, observations: evidence.observations, rules: evidence.rules });
  const conditional = [...evidence.observations, ...evidence.rules.filter(rule => rule.ruleType === 'CONDITIONAL_VISIBILITY')];
  const groups = [{ rank: 'BASELINE', parts: evaluation.items || [] },
    ...(evaluation.conflictGraph?.rankedSolutions || evaluation.rankedSolutions || []).map((rank, i) => ({
      rank: String(rank.rank || rank.id || `CANDIDATE_${i + 1}`), parts: rank.skuPartsList || rank.skuList || []
    }))];
  const configurations = [];
  for (const group of groups) {
    const partitions = new Map();
    for (const row of group.parts) {
      const id = String(row.configurationId || row.ownerId || 'UNASSIGNED');
      if (!partitions.has(id)) partitions.set(id, []);
      partitions.get(id).push(row);
    }
    for (const [configurationId, rows] of partitions) {
      const manifest = rows.map(row => ({ sku: skuOf(row), quantity: Number(row.quantity ?? row.qty ?? row['Current Qty']),
        quantityScope: row.quantityScope || 'UNSPECIFIED', configurationMultiplier: row.configurationMultiplier ?? null }))
        .sort((a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity);
      const reasons = [];
      const probes = [];
      const baseSkus = [];
      for (const row of rows) {
        const sku = skuOf(row);
        const base = cleanBaseSKU(sku);
        const matches = index.get(base) || [];
        if (matches.some(item => item.parentCategory === 'Chassis' || item['Option Type'] === 'CTO') || /configure.to.order|\bcto\b/i.test(row.description || '')) baseSkus.push(sku);
        const gates = conditional.filter(gate => cleanBaseSKU(gate.sku) === base || (gate.affectedSkus || []).some(affected => cleanBaseSKU(affected) === base));
        const tagged = [...matches, row].filter(item => item.visibilityState === 'PORTAL_CONDITIONAL' || item.conditionalStatus === 'PORTAL_CONDITIONAL');
        if (!matches.length) probes.push({ sku, reason: 'ABSENT_FROM_CAPTURE_NOT_PROOF_OF_UNSUPPORTED', conditions: [] });
        if (gates.length || tagged.length) probes.push({ sku, reason: 'PORTAL_CONDITIONAL', conditions: [...gates, ...tagged].map(gate => ({
          conditionKey: gate.conditionKey || gate.trigger?.conditionKey || (gate.conditionType === 'AMBIENT_GATE' ? 'ambientTempC' : 'UNKNOWN'),
          conditionOperator: gate.conditionOperator || gate.operator || gate.trigger?.conditionOperator || 'unknown',
          thresholdValue: gate.thresholdValue ?? gate.thresholdDegC ?? gate.trigger?.thresholdValue ?? null,
          evidenceBaseSku: gate.baseSku || null
        })) });
      }
      if (!identity) reasons.push('PRODUCT_IDENTITY_UNRESOLVED');
      if (new Set(baseSkus).size !== 1) reasons.push('EXACT_BASE_SKU_UNRESOLVED');
      if (manifest.some(row => !row.sku || !Number.isSafeInteger(row.quantity) || row.quantity <= 0)) reasons.push('MANIFEST_QUANTITY_UNRESOLVED');
      reasons.push(...evidence.gaps);
      const selectors = options.selectorsByConfiguration?.[configurationId] || {};
      const scope = { identity, productId: product, configurationId, baseSkus: [...new Set(baseSkus)].sort(), manifest, selectors, catalogSha256 };
      configurations.push({ rank: group.rank, ...scope, manifestSha256: digest(scope),
        status: reasons.length ? 'DISCOVERY_INPUT_INCOMPLETE' : 'PORTAL_VALIDATION_PENDING',
        blockers: reasons, probes,
        requiredChecks: ['EXACT_VENDOR_PRODUCT_BASE_AND_OWNER', 'IMPORT_AND_READ_BACK_FULL_MANIFEST',
          'BOQ_RELEVANT_SELECTOR_STATES_AND_HIDDEN_SKUS', 'COMPLETE_CLIC_DEPENDENCIES_CONFLICTS',
          'OWNER_QUALIFIED_SUPPORT_AND_PRICES', 'RESTORE_REQUESTED_STATE_AND_REVALIDATE'] });
    }
  }
  return { schemaVersion: 1, status: configurations.length ? 'RUNTIME_DISCOVERY_REQUIRED' : 'NO_MANIFEST',
    coverage: 'BOQ_SCOPED_ONLY_NOT_FULL_PRODUCT_COVERAGE', configurations,
    uniqueProbeManifests: new Set(configurations.map(config => config.manifestSha256)).size,
    unattendedSelectorExecution: 'NOT_IMPLEMENTED_USE_LIVE_AGENT_WORKFLOW',
    workflow: 'docs/RUNTIME_CONDITIONAL_DISCOVERY.md' };
}

function formatRuntimeDiscoveryPlan(plan) {
  if (!plan?.configurations?.length) return '';
  const lines = ['## BOQ-scoped runtime portal checks', '',
    'Catalog discovery does not prove every combination. Validate each exact base, owner, SKU/quantity manifest and requested selector state in the live portal. Hidden presence does not prove orderability.', ''];
  for (const config of plan.configurations) {
    lines.push(`- ${config.rank} / ${config.configurationId}: ${config.status}; base ${config.baseSkus.join(', ') || 'unresolved'}; ${config.probes.length} targeted SKU investigations.`);
    for (const probe of config.probes) lines.push(`  - ${probe.sku}: ${probe.reason}; conditions ${JSON.stringify(probe.conditions)}`);
    if (config.blockers.length) lines.push(`  - Resolve: ${config.blockers.join(', ')}.`);
  }
  lines.push('', 'Run the live-agent procedure in docs/RUNTIME_CONDITIONAL_DISCOVERY.md; re-evaluate after any change. No all-combinations or live-acceptance claim is made by this plan.');
  return lines.join('\n');
}

module.exports = { buildRuntimeDiscoveryPlan, formatRuntimeDiscoveryPlan };
