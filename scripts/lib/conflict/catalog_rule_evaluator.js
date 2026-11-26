'use strict';
/**
 * scripts/lib/conflict/catalog_rule_evaluator.js
 *
 * Executable 5-Level Catalog Rule Intermediate Representation (IR) Evaluator.
 * Enforces CONDITIONAL_VISIBILITY, AMBIENT_GATE, TDP_GATE, QUANTITY_CONSTRAINT,
 * MUTUAL_EXCLUSION, REQUIRES, form-factor chassis gates, and Catalog.json subcategory min/max bounds.
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');

function _normalizeAffectedSkus(rule) {
  const list = [];
  if (Array.isArray(rule.affectedSkus)) list.push(...rule.affectedSkus);
  if (rule.affectedSku) list.push(rule.affectedSku);
  if (rule.sku) list.push(rule.sku);
  if (rule.targetSku) list.push(rule.targetSku);
  return [...new Set(list.map(cleanBaseSKU).filter(Boolean))];
}

function _buildItemQuantityMap(items) {
  const map = new Map();
  for (const it of (items || [])) {
    const clean = cleanBaseSKU(it?.sku || it?.['Product #']);
    if (!clean) continue;
    const cur = map.get(clean) || { quantity: 0, item: it };
    cur.quantity += Math.max(0, Number(it.quantity ?? it.qty ?? 1) || 0);
    map.set(clean, cur);
  }
  return map;
}

function _compareNumericGate(actual, operator, threshold) {
  if (!Number.isFinite(actual) || !Number.isFinite(threshold)) return true;
  const op = String(operator || 'lte').toLowerCase();
  if (op === 'lt' || op === '<') return actual < threshold;
  if (op === 'lte' || op === '<=') return actual <= threshold;
  if (op === 'gt' || op === '>') return actual > threshold;
  if (op === 'gte' || op === '>=') return actual >= threshold;
  if (op === 'eq' || op === '==' || op === '===') return actual === threshold;
  return actual <= threshold;
}

function _evaluateThresholdGate(rule, matchingSkus, actual, threshold, label, out) {
  if (!Number.isFinite(actual) || !Number.isFinite(threshold)) return false;
  if (_compareNumericGate(actual, rule.conditionOperator || 'lte', threshold)) return false;
  const msg = `${label}: ${matchingSkus.join(', ')} gated at <= ${threshold} (evaluated at ${actual}).`;
  out.violations.push({ level: rule.level || 'CHASSIS', ruleType: rule.conditionType, skus: matchingSkus, message: msg, ruleId: rule.ruleId || null });
  out.auditLog.push({ level: rule.level || 'CHASSIS', status: 'FAIL', ruleText: rule.rule || msg });
  return true;
}

function _evaluateGateRule(rule, matchingSkus, options, out) {
  const condType = String(rule.conditionType || '').toUpperCase();
  if (condType === 'AMBIENT_GATE') {
    const ambient = Number(options.ambientTempC ?? options.ambientTemp ?? 25);
    const limit = Number(rule.thresholdValue ?? 30);
    if (_evaluateThresholdGate(rule, matchingSkus, ambient, limit, 'Catalog Rule Ambient Gate Violated', out)) return;
  }
  if (condType === 'TDP_GATE') {
    const cpuTdp = Number(options.maxCpuTdpWatts ?? options.cpuTdpWatts);
    const limit = Number(rule.thresholdValue);
    if (_evaluateThresholdGate(rule, matchingSkus, cpuTdp, limit, 'Catalog Rule TDP Gate Violated', out)) return;
  }
  if (rule.ruleType === 'CONDITIONAL_VISIBILITY' || condType === 'PORTAL_CONDITIONAL_VIEW' || rule.portalVerificationRequired) {
    const msg = rule.rule || rule.ruleText || `${matchingSkus.join(', ')} requires OCA portal selector validation.`;
    out.conditionalGates.push({ level: rule.level || 'CHASSIS', conditionType: condType || 'PORTAL_CONDITIONAL_VIEW', skus: matchingSkus, ruleId: rule.ruleId || null, message: msg });
    out.auditLog.push({ level: rule.level || 'CHASSIS', status: 'PORTAL_CONDITIONAL', ruleText: msg });
  }
}

function _evaluateQuantityAndFormFactor(rule, matchingSkus, bomMap, items, chassisInfo, options, out) {
  const serverCount = Math.max(1, Number(options.serverCount || 1));
  const rawMax = Number(rule.maxQty);
  if (Number.isFinite(rawMax) && rawMax > 0 && matchingSkus.length > 0) {
    const allowed = rawMax * serverCount;
    for (const sku of matchingSkus) {
      const actual = bomMap.get(sku)?.quantity || 0;
      if (actual > allowed) {
        const msg = `Catalog Quantity Constraint Failed: SKU ${sku} qty ${actual} exceeds catalog max ${allowed} (${rawMax}/node x ${serverCount}).`;
        out.violations.push({ level: rule.level || 'SKU', ruleType: 'QUANTITY_CONSTRAINT', skus: [sku], message: msg });
        out.auditLog.push({ level: rule.level || 'SKU', status: 'FAIL', ruleText: msg });
      }
    }
  }

  const textLower = String(rule.ruleText || rule.rule || '').toLowerCase();
  const ff = String(chassisInfo?.formFactor || '').toUpperCase();
  if (textLower.includes('edsff') && ff && !ff.includes('EDSFF')) {
    const edsffItems = (items || []).filter(it => (it.description || '').toLowerCase().includes('edsff'));
    if (edsffItems.length > 0) {
      const msg = `Item '${edsffItems[0].sku}' requires EDSFF chassis support, but configured form factor is ${chassisInfo.formFactor}.`;
      out.violations.push({ level: 'CHASSIS', ruleType: 'FORM_FACTOR_GATE', skus: [cleanBaseSKU(edsffItems[0].sku)], message: msg });
      out.auditLog.push({ level: 'CHASSIS', status: 'FAIL', ruleText: msg });
    }
  } else if (textLower.includes('lff') && ff && ff.includes('SFF') && !ff.includes('LFF')) {
    const lffItems = (items || []).filter(it => /\blff\b/i.test(it.description || ''));
    if (lffItems.length > 0) {
      const msg = `Item '${lffItems[0].sku}' requires LFF bay support, incompatible with ${chassisInfo.formFactor} chassis.`;
      out.violations.push({ level: 'CHASSIS', ruleType: 'FORM_FACTOR_GATE', skus: [cleanBaseSKU(lffItems[0].sku)], message: msg });
      out.auditLog.push({ level: 'CHASSIS', status: 'FAIL', ruleText: msg });
    }
  }
}

function _evaluateDependencyAndExclusionRule(rule, matchingSkus, bomMap, out) {
  const ruleType = String(rule.ruleType || rule.type || '').toUpperCase();
  const excludes = (Array.isArray(rule.excludesSkus) ? rule.excludesSkus : []).map(cleanBaseSKU).filter(Boolean);
  const requires = (Array.isArray(rule.requiresSkus) ? rule.requiresSkus : []).map(cleanBaseSKU).filter(Boolean);

  if ((ruleType === 'MUTUAL_EXCLUSION' || excludes.length > 0) && matchingSkus.length > 0) {
    for (const ex of excludes) {
      if (bomMap.has(ex)) {
        const msg = `Catalog Mutual Exclusion Failed: ${matchingSkus[0]} cannot be co-configured with ${ex}.`;
        out.violations.push({ level: rule.level || 'SKU', ruleType: 'MUTUAL_EXCLUSION', skus: [matchingSkus[0], ex], message: msg });
        out.auditLog.push({ level: rule.level || 'SKU', status: 'FAIL', ruleText: msg });
      }
    }
  }
  if ((ruleType === 'REQUIRES' || requires.length > 0) && matchingSkus.length > 0) {
    for (const reqSku of requires) {
      if (!bomMap.has(reqSku)) {
        const msg = `Catalog Dependency Requirement Missing: ${matchingSkus[0]} requires ${reqSku}.`;
        out.missingRequirements.push({ sourceSku: matchingSkus[0], requiredSku: reqSku, level: rule.level || 'SKU', message: msg });
        out.violations.push({ level: rule.level || 'SKU', ruleType: 'REQUIRES', skus: [matchingSkus[0], reqSku], message: msg });
        out.auditLog.push({ level: rule.level || 'SKU', status: 'FAIL', ruleText: msg });
      }
    }
  }
}

function _tallySubcategoryQuantities(items, skuIndex) {
  const countsBySubcat = new Map();
  for (const it of (items || [])) {
    const clean = cleanBaseSKU(it?.sku || it?.['Product #']);
    if (!clean) continue;
    const catItem = skuIndex.get(clean);
    if (!catItem?.subCategory) continue;
    const key = `${catItem.parentCategory || ''}::${catItem.subCategory}`.toLowerCase();
    countsBySubcat.set(key, (countsBySubcat.get(key) || 0) + (Number(it.quantity ?? it.qty ?? 1) || 0));
  }
  return countsBySubcat;
}

function _checkSubcategoryBoundEntry(sc, countsBySubcat, nodes) {
  const name = sc.subCategory || sc.name || null;
  const key = `${sc.parentCategory || ''}::${name || ''}`.toLowerCase();
  const observed = countsBySubcat.get(key) || 0;
  const minReq = Number.isFinite(Number(sc.minQty)) ? Number(sc.minQty) * nodes : 0;
  const maxAllowed = Number.isFinite(Number(sc.maxQty)) && Number(sc.maxQty) > 0 ? Number(sc.maxQty) * nodes : null;
  if (observed > 0 && maxAllowed !== null && observed > maxAllowed) {
    return {
      parentCategory: sc.parentCategory || null,
      subCategory: name,
      observedQty: observed,
      maxAllowed,
      message: `Subcategory '${name}' quantity (${observed}) exceeds catalog maximum (${maxAllowed} for ${nodes} node(s)).`
    };
  }
  if (minReq > 0 && observed < minReq) {
    return {
      parentCategory: sc.parentCategory || null,
      subCategory: name,
      observedQty: observed,
      minRequired: minReq,
      message: `Subcategory '${name}' quantity (${observed}) is below catalog minimum (${minReq} for ${nodes} node(s)).`
    };
  }
  return null;
}

function evaluateSubcategoryQuantityBounds(items, catalogData, serverCount = 1) {
  const subcats = Array.isArray(catalogData?.subcategories) ? catalogData.subcategories : [];
  if (subcats.length === 0) return [];
  const countsBySubcat = _tallySubcategoryQuantities(items, buildCatalogSkuIndex(catalogData));
  const nodes = Math.max(1, Number(serverCount || 1));
  return subcats.map(sc => _checkSubcategoryBoundEntry(sc, countsBySubcat, nodes)).filter(Boolean);
}

function evaluateAllCatalogRules(items = [], catalogData = null, chassisInfo = {}, options = {}) {
  const rawRules = [
    ...(Array.isArray(catalogData?.parsedRules) ? catalogData.parsedRules : []),
    ...(Array.isArray(catalogData?.rules) ? catalogData.rules : [])
  ];
  const bomMap = _buildItemQuantityMap(items);
  const out = {
    evaluatedRulesCount: rawRules.length,
    applicableRulesCount: 0,
    violations: [],
    conditionalGates: [],
    missingRequirements: [],
    subcategoryBoundsViolations: [],
    auditLog: []
  };

  for (const rule of rawRules) {
    const affected = _normalizeAffectedSkus(rule);
    const matchingSkus = affected.filter(s => bomMap.has(s));
    if (matchingSkus.length > 0) {
      out.applicableRulesCount++;
      _evaluateGateRule(rule, matchingSkus, options, out);
      _evaluateDependencyAndExclusionRule(rule, matchingSkus, bomMap, out);
    }
    _evaluateQuantityAndFormFactor(rule, matchingSkus, bomMap, items, chassisInfo, options, out);
  }

  out.subcategoryBoundsViolations = evaluateSubcategoryQuantityBounds(items, catalogData, options.serverCount || 1);
  for (const sv of out.subcategoryBoundsViolations) {
    out.violations.push({ level: 'SUBCATEGORY', ruleType: 'SUBCATEGORY_BOUND', skus: [], message: sv.message });
    out.auditLog.push({ level: 'SUBCATEGORY', status: 'FAIL', ruleText: sv.message });
  }
  return out;
}

module.exports = {
  evaluateAllCatalogRules,
  evaluateSubcategoryQuantityBounds
};
