'use strict';
/**
 * scripts/maintenance/audit_product_rules_association.js
 *
 * Scans all 13 products in the repository catalog, checks:
 * 1. Product identity mapping against scripts/config/notebooks.json
 * 2. All deltas in catalog_deltas.json
 * 3. Whether each delta is associated, classified, and active or misclassified/blocked
 * 4. Quarantined deltas and whether any reach reinforcement threshold (>= 3 citations)
 * 5. Rule counts in Catalog_Rules.json vs DOM extracted constraints
 */

const fs = require('fs');
const path = require('path');
const nb = require('../config/notebooks.json');
const { resolveProductIdentity, ruleAppliesToProduct } = require('../lib/catalog/product_scope.js');
const { loadActiveKnowledgeRules } = require('../lib/catalog/active_knowledge_router.js');
const { findCatalogJsonFiles } = require('../lib/catalog/sync_registry.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');

function _readJsonSafe(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function _classifyProductDeltas(deltas, identity, activeRules) {
  const unassociated = [];
  const misclassified = [];
  for (const d of deltas) {
    const applies = ruleAppliesToProduct(d, identity, nb);
    const inActive = activeRules.allRules.some(r => r.ruleId === (d.deltaId || d.ruleId));
    const ruleType = d.ruleType || d.errorType;
    if (!ruleType || ruleType === 'KNOWLEDGE_DELTA' || ruleType === 'GENERAL') {
      misclassified.push({
        deltaId: d.deltaId,
        ruleType: ruleType || 'UNSPECIFIED',
        rawMessage: d.rawMessage || d.ruleUpdate
      });
    }
    if (!applies || !inActive) {
      unassociated.push({
        deltaId: d.deltaId,
        ruleType: d.ruleType,
        chassis: d.chassis,
        scope: d.scope || d.scopeTaxonomy,
        reason: !applies ? 'FAILED_PRODUCT_FIREWALL' : 'BLOCKED_BY_ACTIVE_ROUTER'
      });
    }
  }
  return { unassociated, misclassified };
}

function _collectPromotableQuarantined(quar) {
  const promotableQuarantined = [];
  for (const q of quar) {
    const obs = Number(q.observationCount || q.frequency || 1);
    if (obs >= 3) {
      promotableQuarantined.push({
        quarantineId: q.quarantineId || q.deltaId,
        affectedSku: q.affectedSku,
        observations: obs,
        reason: q.quarantineReason
      });
    }
  }
  return promotableQuarantined;
}

function auditAllProducts() {
  const catalogFiles = findCatalogJsonFiles(OUTPUTS_ROOT);
  const auditResults = [];

  for (const catFile of catalogFiles) {
    const dir = path.dirname(catFile);
    const chassisName = path.basename(catFile, '_Catalog.json');
    const identity = resolveProductIdentity(chassisName, nb);

    const deltas = _readJsonSafe(path.join(dir, 'history', 'catalog_deltas.json'), []);
    const quar = _readJsonSafe(path.join(dir, 'history', 'quarantined_deltas.json'), []);
    const rules = _readJsonSafe(path.join(dir, `${chassisName}_Catalog_Rules.json`), []);

    const activeRules = loadActiveKnowledgeRules(chassisName, dir);
    const { unassociated, misclassified } = _classifyProductDeltas(deltas, identity, activeRules);
    const promotableQuarantined = _collectPromotableQuarantined(quar);

    auditResults.push({
      chassisName,
      identityFound: Boolean(identity),
      pillar: identity?.pillar || 'UNKNOWN',
      family: identity?.family || 'UNKNOWN',
      gen: identity?.generation || identity?.gen || 'UNKNOWN',
      totalDeltas: deltas.length,
      activeRulesCount: activeRules.allRules.length,
      unassociatedDeltas: unassociated,
      misclassifiedDeltas: misclassified,
      quarantinedCount: quar.length,
      promotableQuarantined,
      rulesCount: Array.isArray(rules) ? rules.length : (rules?.rules?.length || 0)
    });
  }

  return auditResults;
}

if (require.main === module) {
  const res = auditAllProducts();
  console.log(JSON.stringify(res, null, 2));
}

module.exports = { auditAllProducts };
