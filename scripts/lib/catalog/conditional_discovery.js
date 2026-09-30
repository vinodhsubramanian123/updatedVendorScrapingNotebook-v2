'use strict';
const { cleanBaseSKU } = require('./sku.js');
function applyConditionalDiscovery(entries, observations = []) {
  const rules = [];
  for (const observation of observations) {
    const sku = cleanBaseSKU(observation.sku);
    if (!sku) continue;
    const ambient = observation.conditionType === 'AMBIENT_GATE' && Number.isFinite(observation.thresholdDegC);
    const rule = { level: 'CHASSIS', ruleType: 'CONDITIONAL_VISIBILITY', affectedSkus: [sku],
      conditionType: ambient ? 'AMBIENT_GATE' : 'UNKNOWN_PORTAL_CONDITION',
      conditionKey: ambient ? 'ambientTempC' : 'portalSelection',
      conditionOperator: ambient ? observation.operator : 'unknown',
      thresholdValue: ambient ? observation.thresholdDegC : null, portalVerificationRequired: true,
      rule: ambient ? `${sku} conditional visibility: ambient temperature ${observation.operator === 'lte' ? '<=' : '>='} ${observation.thresholdDegC} C; PORTAL_CONDITIONAL`
        : `${sku} conditional visibility: unresolved portal selector; PORTAL_CONDITIONAL` };
    for (const entry of entries) {
      const matched = (entry.skus || []).filter(row => cleanBaseSKU(row.sku || row['Product #']) === sku);
      if (!matched.length) continue;
      rule.parentCategory = entry.parentCategory; rule.subCategory = entry.subCategory;
      entry.rules = [...new Set([...(entry.rules || []), rule.rule])];
      for (const row of matched) Object.assign(row, { visibilityState: 'PORTAL_CONDITIONAL', conditionType: rule.conditionType,
        thresholdValue: rule.thresholdValue, conditionOperator: rule.conditionOperator, conditionKey: rule.conditionKey });
    }
    rules.push(rule);
  }
  return rules;
}
module.exports = { applyConditionalDiscovery };
