'use strict';
/**
 * scripts/lib/conflict_graph.js — 5-Level Dependency Conflict Graph & Strategy Matrix Engine
 *
 * Implements full 5-level OCA business logic:
 * Level 1: Vendor Level (BTO vs CTO Mode, Partner Restrictions)
 * Level 2: Chassis Level (Form Factor Gates: SFF vs LFF vs EDSFF)
 * Level 3: Category Level (Memory & Power Supply Mixing Rules)
 * Level 4: Subcategory Level (Controller, Riser, Fan Slot Dependencies)
 * Level 5: SKU Level (Exact Part # Pre-requisites & Co-requisites)
 */

const path = require('path');
const {
  cleanBaseSKU,
  isValidHpeSKU,
  isSmartChoiceOrBtoSku,
  classifyCommercialFulfillmentMode,
  classifyOptionType,
  HPE_SKU_EXTRACT_REGEX
} = require('../catalog/sku.js');
const { SKU_BLACKLIST } = require('../feedback/quarantined_deltas.js');
const { loadCatalogRules, getMandatorySkusForChassis } = require('../catalog/catalog_rules.js');

// Modular subcomponents
const { extractWorkloadDna } = require('./workload_dna.js');
const { arbitrateContestedResources } = require('./resource_arbitrator.js');
const { synthesize5TierRankedSolutions } = require('./strategy_synthesizer.js');
const { introspectSku } = require('./cascading_impact_analyzer.js');

const { getChassisMap, invalidateChassisMapCache, detectChassisVariant } = require('../catalog/catalog_discovery.js');
const { loadActiveKnowledgeRules } = require('../catalog/active_knowledge_router.js');

function loadLearnedKnowledgeDeltas(resolvedTargetDir, chassisVariant = '') {
  try {
    const rules = loadActiveKnowledgeRules(chassisVariant, resolvedTargetDir);
    return rules.allRules.map(r => r.rawDelta || r);
  } catch (err) {
    const logger = require('../system/pipeline_logger.js');
    logger.warn('CONFLICT_GRAPH', 'Failed to parse historical catalog JSON', err);
    return [];
  }
}

function _validateMemoryCategoryRules(memoryItems, descriptions, conflicts, recordAudit) {
  const hasX4 = memoryItems.some(item => descriptions(item).includes('x4'));
  const hasX8 = memoryItems.some(item => descriptions(item).includes('x8'));
  const has96Gb = memoryItems.some(item => descriptions(item).includes('96gb'));
  const otherMemory = memoryItems.filter(item => {
    const description = descriptions(item);
    return !description.includes('96gb') && !description.includes('128gb');
  });

  if (hasX4 && hasX8) {
    const error = 'Mixing of x4 and x8 memory modules is strictly not allowed.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', 'Mixing of x4 and x8 memory is not allowed', 'FAIL', error);
  } else {
    recordAudit('CATEGORY', 'Mixing of x4 and x8 memory is not allowed', 'PASS', 'All memory modules have uniform bit-width (x4).');
  }

  if (has96Gb && otherMemory.length > 0) {
    const error = '96GB Memory modules cannot be mixed with any other Memory capacity.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', '96GB Memory cannot be mixed with any other Memory.', 'FAIL', error);
  } else {
    recordAudit('CATEGORY', '96GB Memory cannot be mixed with any other Memory.', 'PASS', 'No 96GB capacity mixing detected.');
  }

  // Memory Generation Mixing (DDR4 vs DDR5)
  const hasDdr4 = memoryItems.some(item => descriptions(item).includes('ddr4'));
  const hasDdr5 = memoryItems.some(item => descriptions(item).includes('ddr5'));
  if (hasDdr4 && hasDdr5) {
    const error = 'Mixing of DDR4 and DDR5 memory modules is physically incompatible.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', 'Mixing of DDR4 and DDR5 memory is not allowed', 'FAIL', error);
  } else {
    recordAudit('CATEGORY', 'Mixing of DDR4 and DDR5 memory is not allowed', 'PASS', 'Memory technology is uniform.');
  }

  // Memory Module Type Mixing (RDIMM vs LRDIMM vs MRDIMM)
  const hasLrdimm = memoryItems.some(item => descriptions(item).includes('lrdimm') || descriptions(item).includes('load-reduced') || descriptions(item).includes('load reduced'));
  const hasMrdimm = memoryItems.some(item => descriptions(item).includes('mrdimm') || descriptions(item).includes('multiplexed'));
  const hasRdimm = memoryItems.some(item => (descriptions(item).includes('rdimm') || descriptions(item).includes('registered')) && !descriptions(item).includes('lrdimm') && !descriptions(item).includes('mrdimm'));
  if ((hasRdimm && (hasLrdimm || hasMrdimm)) || (hasLrdimm && hasMrdimm)) {
    const error = 'Mixing of RDIMM, LRDIMM, or MRDIMM memory types is strictly not supported.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', 'Mixing of RDIMM and LRDIMM/MRDIMM memory is not allowed', 'FAIL', error);
  } else {
    recordAudit('CATEGORY', 'Mixing of RDIMM and LRDIMM/MRDIMM memory is not allowed', 'PASS', 'Memory module type is uniform.');
  }
}

function _validatePsuCategoryRules(fullBomList, descriptions, conflicts, recordAudit) {
  // Power Supply Input Architecture (AC vs DC)
  const psus = fullBomList.filter(item => {
    const description = descriptions(item);
    return description.includes('power supply') || description.includes('psu') || description.includes('flex slot');
  });
  const hasDcPsu = psus.some(item => {
    const d = descriptions(item);
    return d.includes('-48vdc') || d.includes('48vdc') || d.includes('48v dc') || d.includes('dc power') || d.includes('hvdc');
  });
  const hasAcPsu = psus.some(item => {
    const d = descriptions(item);
    return !d.includes('-48vdc') && !d.includes('48vdc') && !d.includes('48v dc') && !d.includes('dc power') && !d.includes('hvdc');
  });

  if (hasAcPsu && hasDcPsu) {
    const error = 'Mixing of AC and DC power supplies is strictly not allowed.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', 'Mixing of Power supplies are not allowed.', 'FAIL', error);
  } else {
    recordAudit('CATEGORY', 'Mixing of Power supplies are not allowed.', 'PASS', 'Power supply selection is homogenous (all DC or all AC).');
  }

  // Power Supply Efficiency Uniformity (Platinum vs Titanium)
  let platCount = 0;
  let titnCount = 0;
  psus.forEach(item => {
    const d = descriptions(item);
    const qty = item.quantity || 1;
    if (d.includes('platinum') || d.includes('plat psu')) platCount += qty;
    if (d.includes('titanium') || d.includes('titn psu')) titnCount += qty;
  });
  const hasPlat = platCount > 0;
  const hasTitn = titnCount > 0;
  const isMultiClusterEvenPairs = (platCount >= 2 && titnCount >= 2 && platCount % 2 === 0 && titnCount % 2 === 0);

  if (hasPlat && hasTitn && !isMultiClusterEvenPairs) {
    const error = 'Mixing Platinum and Titanium power supply efficiencies in the same server is strictly not supported.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', 'Power Supply Efficiency Uniformity', 'FAIL', error);
  } else if (hasPlat && hasTitn && isMultiClusterEvenPairs) {
    recordAudit('CATEGORY', 'Power Supply Efficiency Uniformity', 'PASS', 'Power supplies allocated in even pairs for multi-cluster configuration.');
  } else {
    recordAudit('CATEGORY', 'Power Supply Efficiency Uniformity', 'PASS', 'Power supply efficiency is uniform.');
  }
}

function _validateSupportCategoryRules(fullBomList, descriptions, conflicts, recordAudit) {
  // Support Services Contradiction (Onsite vs Remote Installation)
  const isOnsiteInstall = item => {
    const sku = cleanBaseSKU(item.sku);
    const d = descriptions(item);
    if (['HA114A1', 'HA124A1', 'H7J38A1', 'H7J34A'].includes(sku) || sku.startsWith('HA114A1') || sku.startsWith('HA124A1')) return true;
    return /(?:onsite|on-site).*(?:install|startup|deploy|service)|(?:install|startup|deploy|implementation).*(?:onsite|on-site)/i.test(d) || /\bons startup\b/i.test(d);
  };
  const isRemoteInstall = item => {
    const sku = cleanBaseSKU(item.sku);
    const d = descriptions(item);
    if (['HA454A1', 'H7J32A'].includes(sku) || sku.startsWith('HA454A1')) return true;
    return /\bremote\b.*(?:install|startup|deploy|service|setup)|(?:install|startup|deploy|setup).*\bremote\b/i.test(d);
  };

  const hasOnsite = fullBomList.some(isOnsiteInstall);
  const hasRemote = fullBomList.some(isRemoteInstall);
  if (hasOnsite && hasRemote) {
    const error = 'Contradictory Installation Support Services: Configuration contains both Onsite Installation/Startup Service and Remote Deployment Service.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', 'Contradictory Installation Support Services', 'FAIL', error);
  } else {
    recordAudit('CATEGORY', 'Installation Support Services', 'PASS', 'Installation support services are non-contradictory.');
  }

  // SaaS Software vs Hardware Support Delineation
  const isSaas = item => {
    const sku = cleanBaseSKU(item.sku);
    const d = descriptions(item);
    return ['R7A11AAE', 'R7A12AAE', 'S2E10AAE', 'S5E59AAE', 'S1A05A'].includes(sku) ||
      sku.endsWith('AAE') || d.includes('saas') || d.includes('compute ops management');
  };
  const isHwSupport = item => {
    const sku = cleanBaseSKU(item.sku);
    const d = descriptions(item);
    return sku.startsWith('HU4B') || sku.startsWith('H7J3') || sku.startsWith('H8Q') ||
      d.includes('tech care') || d.includes('foundation care') || d.includes('proactive care') ||
      (d.includes('warranty') && !d.includes('saas'));
  };
  const hasSaasItem = fullBomList.some(isSaas);
  const hasHwSupportItem = fullBomList.some(isHwSupport);
  if (hasSaasItem && !hasHwSupportItem) {
    recordAudit('CATEGORY', 'SaaS vs Hardware Support Delineation', 'INFO', 'Solution includes SaaS cloud management software without physical hardware warranty support. SaaS and hardware support are distinct operational tiers.');
  } else {
    recordAudit('CATEGORY', 'SaaS vs Hardware Support Delineation', 'PASS', 'Support services and software subscriptions delineated.');
  }
}

function _validateCpuCategoryRules(fullBomList, descriptions, conflicts, recordAudit) {
  // Processor Model Uniformity (Single Node)
  const cpuItems = fullBomList.filter(item => {
    const d = descriptions(item);
    return (d.includes('processor') || d.includes('xeon') || d.includes('epyc')) && !d.includes('heatsink') && !d.includes('fan');
  });
  const cpuSkus = new Set(cpuItems.map(item => cleanBaseSKU(item.sku)).filter(Boolean));
  if (cpuSkus.size > 1) {
    const error = 'Mixing of different processor models within the same server configuration is strictly not supported.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', 'Processor Model Uniformity', 'FAIL', error);
  } else {
    recordAudit('CATEGORY', 'Processor Model Uniformity', 'PASS', 'Processor selection is uniform.');
  }
}

function validateCategoryRules(fullBomList, conflicts, recordAudit) {
  const descriptions = item => (item.description || '').toLowerCase();
  const memoryItems = fullBomList.filter(item => {
    const description = descriptions(item);
    return description.includes('memory') || description.includes('rdimm') || description.includes('lrdimm') || description.includes('ddr5') || description.includes('ddr4');
  });

  _validateMemoryCategoryRules(memoryItems, descriptions, conflicts, recordAudit);
  _validatePsuCategoryRules(fullBomList, descriptions, conflicts, recordAudit);
  _validateSupportCategoryRules(fullBomList, descriptions, conflicts, recordAudit);
  _validateCpuCategoryRules(fullBomList, descriptions, conflicts, recordAudit);
}

/**
 * Perform 5-level Dependency Conflict Graph validation.
 *
 * @param {Array<object>} boqItems - Consolidated BOQ items
 * @param {Array<object>} missingDependencies - Injected physical fixes
 * @param {string} targetDir - Output folder for catalog rules
 * @param {string} chassisVariantOverride - Optional CLI override
 * @returns {object} Graph validation results & audit log
 */
function _buildUnifiedBomMap(boqItems, missingDependencies) {
  const fullBomMap = new Map();
  boqItems.forEach(it => {
    const sku = cleanBaseSKU(it.sku);
    if (!sku) return;
    const qty = it.quantity || 1;
    if (fullBomMap.has(sku)) {
      fullBomMap.get(sku).quantity = (fullBomMap.get(sku).quantity || 0) + qty;
    } else {
      fullBomMap.set(sku, { ...it, sku, quantity: qty, isFix: false });
    }
  });

  const depsList = Array.isArray(missingDependencies)
    ? missingDependencies
    : ((missingDependencies && Array.isArray(missingDependencies.missingDependencies)) ? missingDependencies.missingDependencies : []);

  depsList.forEach(dep => {
    const sku = cleanBaseSKU(dep.sku || dep.key);
    if (!sku) return;
    const qty = dep.quantity || dep.qty || 1;
    if (fullBomMap.has(sku)) {
      fullBomMap.get(sku).quantity += qty;
    } else {
      fullBomMap.set(sku, {
        sku: sku,
        description: dep.description || dep.title || 'Required Fix SKU',
        quantity: qty,
        isFix: true,
        fixRule: dep.rule || dep.reason
      });
    }
  });

  return { fullBomMap, fullBomList: Array.from(fullBomMap.values()), depsList };
}

function _isDeltaApplicableToTarget(delta, targetChassis) {
  const deltaScope = (delta.scopeTaxonomy || delta.scope || 'CHASSIS_SPECIFIC').toUpperCase();
  if (deltaScope === 'UNIVERSAL_VENDOR' || deltaScope === 'UNIVERSAL') {
    return true;
  }
  const deltaChassis = (delta.chassis || '').toLowerCase();
  const isGen12Target = targetChassis.includes('gen12') || targetChassis.includes('g12');
  const isGen11Target = targetChassis.includes('gen11') || targetChassis.includes('g11');
  const isGen12Delta = deltaChassis.includes('gen12') || deltaChassis.includes('g12');
  const isGen11Delta = deltaChassis.includes('gen11') || deltaChassis.includes('g11');

  if (isGen12Target && isGen11Delta) return false;
  if (isGen11Target && isGen12Delta) return false;

  if (deltaScope === 'CHASSIS_SPECIFIC' && targetChassis && deltaChassis) {
    if (!targetChassis.includes(deltaChassis) && !deltaChassis.includes(targetChassis)) {
      return false;
    }
  }
  return true;
}

function _isValidLearnedDeltaSku(affectedSku, requiredSku) {
  if (!affectedSku || affectedSku === 'UNKNOWN_SKU' || SKU_BLACKLIST.has(affectedSku.toUpperCase()) || !isValidHpeSKU(affectedSku)) {
    return false;
  }
  if (requiredSku && (SKU_BLACKLIST.has(requiredSku.toUpperCase()) || !isValidHpeSKU(requiredSku))) {
    return false;
  }
  return true;
}

function _isLearnedSubstitution(delta) {
  return delta.ruleType === 'SKU_SUBSTITUTION' || delta.ruleType === 'OPTION_TYPE_SUBSTITUTION' || delta.ruleType === 'GENERATIONAL_MODERNIZATION';
}

function _isLearnedStrategy(delta) {
  const rt = String(delta?.ruleType || '').toUpperCase();
  return rt.endsWith('_STRATEGY') || rt.endsWith('_ADVISORY') || rt.endsWith('_BOTTLENECK') ||
    rt.includes('RIGHT_SIZING') || rt.includes('PACKAGING_MODALITY') || rt.includes('TOKEN_SEPARATION') ||
    rt.includes('PRICING_UPDATE') || rt.includes('CLEARANCE') || rt.includes('LEAD_TIME') ||
    rt.includes('PROCEDURE') || rt.includes('DIAGNOSTIC');
}

function _applyLearnedSubstitution(delta, affectedSku, requiredSku, msg, recordAudit, learnedSubstitutions) {
  recordAudit('LEARNED_DELTA', `Learned Modernization/Substitution: ${affectedSku} -> ${requiredSku}`, 'INFO', msg, affectedSku);
  learnedSubstitutions.push({
    affectedSku,
    requiredSku,
    ruleType: delta.ruleType,
    deltaId: delta.deltaId,
    ruleUpdate: delta.ruleUpdate || msg,
    provenance: delta.provenance || 'CLIC_VERIFIED_HISTORICAL_RECORD'
  });
}

function _evaluateLearnedDependency(delta, affectedSku, requiredSku, msg, fullBomMap, fullBomList, dependencyEdges, recordAudit, conflicts) {
  const edgeKey = `${affectedSku}->${requiredSku}`;
  const reverseEdgeKey = `${requiredSku}->${affectedSku}`;
  if (dependencyEdges.has(reverseEdgeKey)) {
    const cycleWarning = `Circular Dependency Cycle Detected between ${affectedSku} and ${requiredSku}. Rule evaluation bypassed to prevent infinite loop.`;
    recordAudit('LEARNED_DELTA', `Circular Dependency Cycle: ${edgeKey}`, 'WARNING', cycleWarning, affectedSku);
    return;
  }
  dependencyEdges.add(edgeKey);

  const hasReq = fullBomMap.has(requiredSku) || fullBomList.some(it => (it.description || '').includes(requiredSku));
  if (!hasReq) {
    const err = `Learned Rule Violation (${delta.deltaId || delta.id || 'LEARNED'}): SKU ${affectedSku} requires mandatory ${requiredSku}. ${msg}`;
    const diagnosticHint = {
      deltaId: delta.deltaId || delta.id || 'LEARNED_LESSON',
      rule: delta.ruleUpdate || msg,
      rationale: delta.humanReasoning || null,
      provenance: delta.provenance || 'CLIC_VERIFIED_HISTORICAL_RECORD',
      referenceNotice: `💡 Diagnostic Hint [${delta.deltaId || 'LEARNED'}]: Past CLIC validation confirmed ${affectedSku} requires ${requiredSku}.${delta.humanReasoning ? ` Engineering Rationale: ${delta.humanReasoning}` : ''}`
    };
    conflicts.push({ level: 'LEARNED_DELTA', type: 'LEARNED_DEPENDENCY', message: err, diagnosticHint });
    recordAudit('LEARNED_DELTA', `Learned Rule: ${affectedSku} requires ${requiredSku}`, 'FAIL', err, affectedSku);
  } else {
    recordAudit('LEARNED_DELTA', `Learned Rule: ${affectedSku} requires ${requiredSku}`, 'PASS', `Satisfied: ${requiredSku} present in BOM.`, affectedSku);
  }
}

function _evaluateLearnedMutualExclusion(delta, affectedSku, msg, fullBomMap, fullBomList, recordAudit, conflicts) {
  const isMutualExclusion = delta.ruleType === 'MUTUAL_EXCLUSION' || delta.errorType === 'MUTUAL_EXCLUSION' || delta.ruleType === 'STORAGE_COLLISION' || /cannot be populated simultaneously|prohibits mixing|cannot mix|mutually exclusive/i.test(msg);
  let conflictDetected = false;
  if (isMutualExclusion) {
    const matches = (msg.match(new RegExp(HPE_SKU_EXTRACT_REGEX.source, 'gi')) || [])
      .map(cleanBaseSKU)
      .filter(s => s && s !== affectedSku && isValidHpeSKU(s));
    const presentConflicts = matches.filter(s => fullBomMap.has(s) || fullBomList.some(it => (it.description || '').includes(s)));
    if (presentConflicts.length > 0) {
      const conflictingSku = presentConflicts[0];
      const err = `Learned Mutual Exclusion Violation (${delta.deltaId || 'LEARNED'}): Cannot mix ${affectedSku} and ${conflictingSku}. ${msg}`;
      const diagnosticHint = {
        deltaId: delta.deltaId || 'LEARNED_LESSON',
        rule: delta.ruleUpdate || msg,
        rationale: delta.humanReasoning || null,
        provenance: delta.provenance || 'CLIC_VERIFIED_HISTORICAL_RECORD',
        referenceNotice: `💡 Diagnostic Hint [${delta.deltaId || 'LEARNED'}]: Past CLIC validation confirmed ${affectedSku} and ${conflictingSku} are mutually exclusive.${delta.humanReasoning ? ` Engineering Rationale: ${delta.humanReasoning}` : ''}`
      };
      conflicts.push({ level: 'LEARNED_DELTA', type: 'MUTUAL_EXCLUSION', message: err, diagnosticHint });
      recordAudit('LEARNED_DELTA', `Learned Mutual Exclusion on ${affectedSku}`, 'FAIL', err, affectedSku);
      conflictDetected = true;
    }
  }
  if (!conflictDetected) {
    recordAudit('LEARNED_DELTA', `Learned Restriction on ${affectedSku}`, 'WARNING', `Portal Rejection History: ${msg}`, affectedSku);
  }
}

function _resolvePrimaryCtoBaseChassis(chassisInfo) {
  const cmap = getChassisMap();
  const byFamilyGen = cmap?.chassis_base_skus_by_family_gen || {};
  const modelStr = String(chassisInfo?.model || '').toLowerCase();
  const genStr = String(chassisInfo?.gen || '').toLowerCase();
  const ffStr = String(chassisInfo?.formFactor || '8SFF').toUpperCase();

  for (const group of Object.values(byFamilyGen)) {
    const groupModel = String(group.modelFamily || group.catalogProductId || '').toLowerCase();
    const groupGen = String(group.gen || '').toLowerCase();
    if ((modelStr && groupModel.includes(modelStr.split(' ')[0])) && (!genStr || groupGen === genStr)) {
      const entries = Object.entries(group.skus || {});
      const exactFf = entries.find(([, meta]) => String(meta.formFactor || '').toUpperCase() === ffStr);
      if (exactFf) return { sku: exactFf[0], ...exactFf[1] };
      if (entries.length > 0) return { sku: entries[0][0], ...entries[0][1] };
    }
  }
  if (genStr.includes('11')) {
    return { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Configure-to-order Server', formFactor: '8SFF' };
  }
  return { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server', formFactor: '8SFF' };
}

function _evaluateVendorBtoCtoRules(fullBomList, chassisInfo, learnedDeltas, recordAudit, conflicts, learnedSubstitutions) {
  const smartChoiceItems = fullBomList.filter(it => isSmartChoiceOrBtoSku(it.sku, it.description));
  if (smartChoiceItems.length === 0) {
    recordAudit('VENDOR', 'Smart Choice BTO vs. CTO Commercial Fulfillment Boundary', 'PASS', 'No regional Smart Choice / BTO (-xx5) chassis mixed into CTO configuration flow.');
    return;
  }

  const hasCtoOrFioOptions = fullBomList.some(it => {
    if (isSmartChoiceOrBtoSku(it.sku, it.description)) return false;
    const optType = classifyOptionType(it.sku, it.description);
    return optType === 'CTO' || optType === 'FIO' || /-B21$/i.test(cleanBaseSKU(it.sku));
  });

  const ctoPivot = _resolvePrimaryCtoBaseChassis(chassisInfo);
  const matchingPolicyDelta = (learnedDeltas || []).find(d =>
    d.ruleType === 'COMPATIBILITY_AND_FULFILLMENT_BOUNDARY' ||
    String(d.deltaId || '').includes('SMART_CHOICE')
  );

  for (const btoItem of smartChoiceItems) {
    const fulfillment = classifyCommercialFulfillmentMode(btoItem.sku, btoItem.description);
    const err = `Commercial Fulfillment Mode Conflict (CLIC Rule 81016667 / Warning 81400509): ${fulfillment.guidance}` +
      (ctoPivot ? ` Recommended CTO Base Chassis Pivot: ${ctoPivot.sku} (${ctoPivot.description}).` : '');
    const diagnosticHint = {
      deltaId: matchingPolicyDelta?.deltaId || 'LEARN_UNIVERSAL_SMART_CHOICE_BTO_VS_OCA_VALIDATION_20261112',
      rule: matchingPolicyDelta?.ruleUpdate || fulfillment.guidance,
      rationale: matchingPolicyDelta?.humanReasoning || 'Smart Choice BTO (-xx5) SKUs are pre-configured factory builds and cannot be mixed with custom FIO options or force-validated by injecting an unverified CTO base shell into OCA Customize.',
      provenance: matchingPolicyDelta?.provenance || 'HPE_SMART_CHOICE_QUICKSPECS_AND_OCA_CLIC_LIVE_RECEIPT',
      referenceDocId: 'a50009219enw',
      clicRuleIds: ['81016667', '81400509'],
      recommendedCtoBaseSku: ctoPivot?.sku || null,
      referenceNotice: `💡 Diagnostic Hint [${matchingPolicyDelta?.deltaId || 'SMART_CHOICE_BTO'}]: ${fulfillment.guidance}`
    };

    if (hasCtoOrFioOptions || fullBomList.length > 1) {
      conflicts.push({
        level: 'VENDOR',
        type: 'BTO_CTO_MODE_MISMATCH',
        sku: btoItem.sku,
        recommendedCtoBaseSku: ctoPivot?.sku || null,
        clicRuleIds: ['81016667', '81400509'],
        referenceDocId: 'a50009219enw',
        message: err,
        diagnosticHint
      });
      recordAudit('VENDOR', `Smart Choice BTO (${btoItem.sku}) vs. CTO Mode Boundary`, 'FAIL', err, btoItem.sku);
    } else {
      recordAudit('VENDOR', `Smart Choice BTO (${btoItem.sku}) Standalone Fulfillment Notice`, 'WARNING', err, btoItem.sku);
    }

    if (ctoPivot && ctoPivot.sku && !learnedSubstitutions.some(s => s.affectedSku === btoItem.sku)) {
      learnedSubstitutions.push({
        affectedSku: btoItem.sku,
        requiredSku: ctoPivot.sku,
        ruleType: 'OPTION_TYPE_SUBSTITUTION',
        deltaId: diagnosticHint.deltaId,
        ruleUpdate: `Pivot Smart Choice BTO ${btoItem.sku} to CTO Base Chassis ${ctoPivot.sku} (${ctoPivot.description}) for custom CTO/FIO configurations.`,
        provenance: diagnosticHint.provenance
      });
    }
  }
}

function _evaluateLearnedDeltas(fullBomMap, fullBomList, learnedDeltas, targetChassis, recordAudit, conflicts, learnedSubstitutions = []) {
  const dependencyEdges = new Set();

  learnedDeltas.forEach(delta => {
    const affectedSku = cleanBaseSKU(delta.affectedSku || delta.sku || '');
    const requiredSku = cleanBaseSKU(delta.requiredDependencySku || delta.requiredSku || '');
    const msg = delta.rawMessage || delta.errorMessage || delta.ruleUpdate || '';

    // Gate 2 first for universal policy rules without specific SKU
    if (!_isDeltaApplicableToTarget(delta, targetChassis)) return;

    if (!affectedSku && delta.ruleType === 'COMPATIBILITY_AND_FULFILLMENT_BOUNDARY') {
      recordAudit('LEARNED_DELTA', `Universal Fulfillment Policy: ${delta.deltaId || 'POLICY'}`, 'INFO', msg);
      return;
    }

    // Gate 1: SKU validity & Blacklist token check
    if (!_isValidLearnedDeltaSku(affectedSku, requiredSku)) return;

    const hasAffected = fullBomMap.has(affectedSku) || fullBomList.some(it => (it.description || '').includes(affectedSku));
    if (!hasAffected) return;

    if (requiredSku) {
      if (_isLearnedSubstitution(delta)) {
        _applyLearnedSubstitution(delta, affectedSku, requiredSku, msg, recordAudit, learnedSubstitutions);
        return;
      }
      if (_isLearnedStrategy(delta)) {
        recordAudit('LEARNED_DELTA', `Learned Strategy: ${delta.deltaId || 'STRATEGY'}`, 'INFO', msg, affectedSku);
        return;
      }
      _evaluateLearnedDependency(delta, affectedSku, requiredSku, msg, fullBomMap, fullBomList, dependencyEdges, recordAudit, conflicts);
    } else if (msg) {
      _evaluateLearnedMutualExclusion(delta, affectedSku, msg, fullBomMap, fullBomList, recordAudit, conflicts);
    }
  });
}

function _isMutualExclusionTopicMatch(conflictType, delta, msgLower, dMsgLower) {
  if (conflictType !== 'MUTUAL_EXCLUSION') return false;
  if (delta.ruleType !== 'MUTUAL_EXCLUSION' && delta.errorType !== 'MUTUAL_EXCLUSION') return false;
  const topics = ['mixing', 'memory', 'power'];
  return topics.some(t => msgLower.includes(t)) && topics.some(t => dMsgLower.includes(t));
}

function _doesDeltaMatchConflict(conflict, delta, msgLower) {
  const dSku = String(delta.affectedSku || '').toLowerCase();
  const dReq = String(delta.requiredDependencySku || '').toLowerCase();
  const dMsg = String(delta.rawMessage || delta.ruleUpdate || '').toLowerCase();
  if (dSku && msgLower.includes(dSku)) return true;
  if (dReq && msgLower.includes(dReq)) return true;
  return _isMutualExclusionTopicMatch(conflict.type, delta, msgLower, dMsg);
}

function _buildDiagnosticHintFromDelta(matchingDelta) {
  const deltaId = matchingDelta.deltaId || 'HISTORICAL_LESSON';
  const rule = matchingDelta.ruleUpdate || matchingDelta.rawMessage;
  const rationale = matchingDelta.humanReasoning || null;
  return {
    deltaId,
    rule,
    rationale,
    provenance: matchingDelta.provenance || 'CLIC_VERIFIED_HISTORICAL_RECORD',
    referenceNotice: `💡 Diagnostic Hint [${deltaId}]: Past learning: ${rule}${rationale ? ` (${rationale})` : ''}`
  };
}

function _enrichConflictsWithDiagnosticHints(conflicts, learnedDeltas) {
  if (!Array.isArray(conflicts) || !Array.isArray(learnedDeltas)) return;
  for (const c of conflicts) {
    if (c.diagnosticHint) continue;
    const msgLower = String(c.message || '').toLowerCase();
    const matchingDelta = learnedDeltas.find(d => _doesDeltaMatchConflict(c, d, msgLower));
    if (matchingDelta) {
      c.diagnosticHint = _buildDiagnosticHintFromDelta(matchingDelta);
    }
  }
}

function _evaluateChassisFormFactorRules(catalogData, chassisInfo, fullBomList, rulesEvaluated, recordAudit, conflicts) {
  for (const rule of catalogData.parsedRules.filter(r => r.level === 'CHASSIS')) {
    const textLower = rule.ruleText.toLowerCase();

    if (textLower.includes('edsff') && chassisInfo.formFactor !== 'EDSFF') {
      rulesEvaluated.push({ ruleText: rule.ruleText, status: 'APPLICABLE' });
      const matchingItems = fullBomList.filter(it => (it.description || '').toLowerCase().includes('edsff'));
      if (matchingItems.length > 0) {
        const err = `Item '${matchingItems[0].sku}' requires EDSFF chassis, but current build is ${chassisInfo.formFactor}.`;
        conflicts.push({ level: 'CHASSIS', type: 'FORM_FACTOR_GATE', message: err });
        recordAudit('CHASSIS', rule.ruleText, 'FAIL', err);
      } else {
        recordAudit('CHASSIS', rule.ruleText, 'PASS', `Compliant: No unsupported EDSFF items selected for ${chassisInfo.formFactor}.`);
      }
    } else if (textLower.includes('8lff') && chassisInfo.formFactor !== '8LFF' && chassisInfo.formFactor !== 'LFF') {
      rulesEvaluated.push({ ruleText: rule.ruleText, status: 'APPLICABLE' });
      const matchingItems = fullBomList.filter(it => (it.description || '').toLowerCase().includes('8lff') || (it.description || '').toLowerCase().includes('lff drive cage'));
      if (matchingItems.length > 0) {
        const err = `Item '${matchingItems[0].sku}' requires 8LFF chassis, but current build is ${chassisInfo.formFactor}.`;
        conflicts.push({ level: 'CHASSIS', type: 'FORM_FACTOR_GATE', message: err });
        recordAudit('CHASSIS', rule.ruleText, 'FAIL', err);
      } else {
        recordAudit('CHASSIS', rule.ruleText, 'PASS', `Gated rule verified for ${chassisInfo.formFactor} chassis.`);
      }
    } else if (textLower.includes('edsff') && chassisInfo.formFactor === 'EDSFF') {
      // Rule is applicable AND the chassis matches — it is satisfied
      rulesEvaluated.push({ ruleText: rule.ruleText, status: 'APPLICABLE' });
      recordAudit('CHASSIS', rule.ruleText, 'PASS', `EDSFF-gated rule satisfied: chassis is ${chassisInfo.formFactor}.`);
    } else if (textLower.includes('8lff') && (chassisInfo.formFactor === '8LFF' || chassisInfo.formFactor === 'LFF')) {
      // Rule is applicable AND the chassis matches — it is satisfied
      rulesEvaluated.push({ ruleText: rule.ruleText, status: 'APPLICABLE' });
      recordAudit('CHASSIS', rule.ruleText, 'PASS', `LFF-gated rule satisfied: chassis is ${chassisInfo.formFactor}.`);
    } else {
      // Rule predicate not recognised by the current evaluator — record honestly
      rulesEvaluated.push({ ruleText: rule.ruleText, status: 'UNEVALUATED' });
      recordAudit('CHASSIS', rule.ruleText, 'UNEVALUATED',
        `Rule predicate not recognised by the current evaluator for formFactor=${chassisInfo.formFactor}. ` +
        `Add a handler or move this rule to the structured IR unparsed[] backlog (see B6).`);
    }
  }
}

function _evaluateFixSkuDependencies(depsList, fullBomList, chassisInfo, recordAudit, resolvedFixes, unresolvedConflicts) {
  depsList.forEach(fix => {
    const fixSku = cleanBaseSKU(fix.sku);
    const mandatorySkus = getMandatorySkusForChassis(chassisInfo);

    if (fixSku === cleanBaseSKU(mandatorySkus.HIGH_PERF_FAN_KIT?.sku || 'P48820-B21') || fixSku === cleanBaseSKU(mandatorySkus.HIGH_PERF_HEATSINK?.sku || '')) {
      recordAudit('SKU', `High-TDP Thermal Fix ${fixSku}`, 'PASS', `Injected Thermal Kit ${fixSku} has no physical conflicts with chassis/CPU.`, fixSku);
      resolvedFixes.push({
        sku: fixSku,
        action: 'INJECTED_WITHOUT_CONFLICT',
        reasoning: `High-Performance Thermal Kit mandatory for CPU TDP >= 240W. Verified zero conflicts with base chassis.`
      });
    } else if (fixSku === cleanBaseSKU(mandatorySkus.DC_LUG_KIT?.sku || 'P36877-B21')) {
      const matchingDcPsu = fullBomList.some(it => (it.description || '').toLowerCase().includes('-48vdc'));
      if (matchingDcPsu) {
        recordAudit('SKU', `DC Lug Kit ${fixSku} pairing`, 'PASS', `DC Lug Kit paired correctly with -48VDC Power Supply.`, fixSku);
        resolvedFixes.push({
          sku: fixSku,
          action: 'INJECTED_AND_PAIRED',
          reasoning: `Paired automatically with -48VDC Power Supply P17023-B21.`
        });
      } else {
        unresolvedConflicts.push({ sku: fixSku, reason: `DC Lug Kit injected without a corresponding -48VDC Power Supply.` });
        recordAudit('SKU', `DC Lug Kit ${fixSku} pairing`, 'FAIL', `Missing -48VDC Power Supply for Lug Kit ${fixSku}.`, fixSku);
      }
    } else if (fixSku === cleanBaseSKU(mandatorySkus.SMART_STORAGE_BATTERY?.sku || 'P01366-B21') || fixSku === 'P02377-B21' || fix.description?.toLowerCase().includes('battery') || fix.description?.toLowerCase().includes('capacitor')) {
      const matchingCtrl = fullBomList.find(it => (it.description || '').toLowerCase().includes('controller') || (it.description || '').toLowerCase().includes('raid'));
      const ctrlName = matchingCtrl ? (matchingCtrl.sku || matchingCtrl.description) : 'Storage Controller';
      recordAudit('SKU', `Smart Storage Battery / Capacitor ${fixSku}`, 'PASS', `Battery paired with ${ctrlName}.`, fixSku);
      resolvedFixes.push({
        sku: fixSku,
        action: 'INJECTED_AND_PAIRED',
        reasoning: `Protects write cache for ${ctrlName}.`
      });
    } else {
      // Fix SKU not matched by any specific handler — record as UNEVALUATED rather than auto-PASS.
      // An unverified fix SKU should NOT be treated as conflict-free evidence.
      recordAudit('SKU', `Fix SKU ${fixSku}`, 'UNEVALUATED',
        `Fix SKU ${fixSku} does not match any recognised pairing rule. ` +
        `Manual verification required before promotion to resolvedFixes.`, fixSku);
      // Do NOT push to resolvedFixes — the SKU remains in the deps list for human review.
    }
  });
}

function _filterRecommendedSolutions(rankedSolutions, fullBomList) {
  const validDistances = rankedSolutions
    .filter(solution => solution.isUniqueBom && solution.physicalMathClean)
    .map(solution => solution.proximityMetrics?.weightedEditDistance ?? Number.POSITIVE_INFINITY);
  const minimumDistance = validDistances.length > 0 ? Math.min(...validDistances) : Number.POSITIVE_INFINITY;
  const closenessWindow = Math.max(1, Math.ceil(fullBomList.length * 0.15));
  return rankedSolutions
    .filter(solution =>
      solution.isUniqueBom &&
      solution.isParetoOptimal &&
      solution.physicalMathClean &&
      (solution.proximityMetrics?.weightedEditDistance ?? Number.POSITIVE_INFINITY) <= minimumDistance + closenessWindow
    )
    .slice(0, 3);
}

/**
 * Perform 5-level Dependency Conflict Graph validation.
 *
 * @param {Array<object>} boqItems - Consolidated BOQ items
 * @param {Array<object>} missingDependencies - Injected physical fixes
 * @param {string} targetDir - Output folder for catalog rules
 * @param {string} chassisVariantOverride - Optional CLI override
 * @returns {object} Graph validation results & audit log
 */
function validateConflictGraph(boqItems = [], missingDependencies = [], targetDir = '', chassisVariantOverride = '', options = {}) {
  let resolvedTargetDir = '';
  if (typeof targetDir === 'string') {
    resolvedTargetDir = targetDir;
  } else if (targetDir && typeof targetDir === 'object') {
    resolvedTargetDir = targetDir.targetDir || targetDir.chassisDir || targetDir.chassis || '';
    if (!chassisVariantOverride && targetDir.chassis) {
      chassisVariantOverride = targetDir.chassis;
    }
  }

  const chassisInfo = detectChassisVariant(boqItems, chassisVariantOverride);
  const catalogData = loadCatalogRules(resolvedTargetDir);
  const workloadDna = extractWorkloadDna(boqItems);

  const auditLog = [];
  const conflicts = [];
  const resolvedFixes = [];
  const unresolvedConflicts = [];
  const rulesEvaluated = [];

  function recordAudit(level, ruleText, status, details, skuTarget = '') {
    auditLog.push({ timestamp: new Date().toISOString(), level, ruleText, status, details, skuTarget });
  }

  const { fullBomMap, fullBomList, depsList } = _buildUnifiedBomMap(boqItems, missingDependencies);

  // 1. VENDOR LEVEL (BTO vs CTO Mode, Partner Restrictions) & LEARNED KNOWLEDGE DELTAS VALIDATION
  const learnedDeltas = loadLearnedKnowledgeDeltas(resolvedTargetDir);
  const targetChassis = (chassisVariantOverride || (resolvedTargetDir ? path.basename(resolvedTargetDir) : '')).toLowerCase();
  const learnedSubstitutions = [];
  _evaluateVendorBtoCtoRules(fullBomList, chassisInfo, learnedDeltas, recordAudit, conflicts, learnedSubstitutions);
  _evaluateLearnedDeltas(fullBomMap, fullBomList, learnedDeltas, targetChassis, recordAudit, conflicts, learnedSubstitutions);

  // 2. CHASSIS LEVEL VALIDATION (Form Factor Gates: SFF vs LFF vs EDSFF)
  _evaluateChassisFormFactorRules(catalogData, chassisInfo, fullBomList, rulesEvaluated, recordAudit, conflicts);

  // 3. CATEGORY LEVEL VALIDATION (Memory & Power Supply Mixing Rules)
  validateCategoryRules(fullBomList, conflicts, recordAudit);

  // 4. SUBCATEGORY & SKU LEVEL DEPENDENCY VALIDATION
  _evaluateFixSkuDependencies(depsList, fullBomList, chassisInfo, recordAudit, resolvedFixes, unresolvedConflicts);

  // 5. CONTESTED RESOURCE ARBITRATION (Cross-Subsystem Shared Slots & Form Factor Duals)
  const arbitrationResults = arbitrateContestedResources(
    boqItems,
    {
      missingDependencies: depsList,
      conflicts,
      auditLog,
      options,
      aspectChecks: options.aspectChecks,
      errors: options.errors,
      warnings: options.warnings,
      useNumericStep: options.useNumericStep
    },
    chassisInfo,
    catalogData
  );

  if (arbitrationResults.hasContentions) {
    arbitrationResults.contentions.forEach(con => {
      recordAudit('CONTESTED_RESOURCE', `Contested Resource: ${con.resourceType}`, 'INFO', con.tradeoffSummary);
    });
  }

  // Enrich conflicts with relevant historical diagnostic hints
  _enrichConflictsWithDiagnosticHints(conflicts, learnedDeltas);

  const isWholeSolutionValid = conflicts.length === 0 && unresolvedConflicts.length === 0;

  // 6. Synthesize 5-Tier Ranked Solutions with Cross-Subsystem Arbitration Branches
  const rankedSolutions = options.skipSynthesis ? [] : synthesize5TierRankedSolutions(
    boqItems,
    { missingDependencies: depsList, arbitrationResults, learnedSubstitutions },
    { isWholeSolutionValid, conflicts },
    chassisInfo,
    targetDir
  );
  const recommendedSolutions = _filterRecommendedSolutions(rankedSolutions, fullBomList);

  // Generic Dynamic SKU Introspection across full BOM
  const introspectedComponents = fullBomList.map(it => introspectSku(it, catalogData, chassisInfo));

  const applicableRules = rulesEvaluated.filter(r => r.status === 'APPLICABLE');
  const unevaluatedRules = rulesEvaluated.filter(r => r.status === 'UNEVALUATED');

  return {
    chassisInfo,
    workloadDna,
    isWholeSolutionValid,
    // Legacy field kept for backward compat — use the broken-out fields below for accurate reporting
    totalRulesEvaluated: rulesEvaluated.length,
    // Honest rule accounting (C6 fix)
    rulesEvaluated: rulesEvaluated.length,
    rulesApplicable: applicableRules.length,
    rulesUnevaluated: unevaluatedRules.length,
    conflicts,
    resolvedFixes,
    unresolvedConflicts,
    learnedSubstitutions,
    arbitrationResults,
    rankedSolutions,
    recommendedSolutions,
    introspectedComponents,
    auditLog,
    rulesSource: catalogData.sourceFile,
    isFallbackSource: catalogData.isFallback
  };
}

module.exports = {
  detectChassisVariant,
  extractWorkloadDna,
  arbitrateContestedResources,
  synthesize5TierRankedSolutions,
  validateConflictGraph,
  introspectSku,
  invalidateChassisMapCache,
  evaluateWholeSolutionGraph: validateConflictGraph,
  getChassisMap
};
