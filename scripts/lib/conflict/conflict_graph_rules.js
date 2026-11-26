'use strict';
/**
 * scripts/lib/conflict/conflict_graph_rules.js
 *
 * Category-level mutual exclusion validators, learned knowledge delta loader,
 * and typed ConstraintResult / feasibility diagnostic builders for conflict_graph.js.
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { loadActiveKnowledgeRules } = require('../catalog/active_knowledge_router.js');
const { createConstraintResult, adaptAspectChecksToConstraints } = require('./constraints/constraint_results.js');
const { diagnoseInfeasibility } = require('./constraints/conflict_explanations.js');
const { auditOpticalLinkEndpoints } = require('../aspects/networking_ocp.js');
const logger = require('../system/pipeline_logger.js');

function loadLearnedKnowledgeDeltas(resolvedTargetDir, chassisVariant = '') {
  try {
    const rules = loadActiveKnowledgeRules(chassisVariant, resolvedTargetDir);
    return rules.physicalRules.map(rule => ({
      ...rule.rawDelta,
      ruleId: rule.ruleId,
      affectedSku: rule.affectedSku,
      requiredDependencySku: rule.requiredDependencySku,
      ruleType: rule.ruleType
    }));
  } catch (err) {
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

  const hasDdr4 = memoryItems.some(item => descriptions(item).includes('ddr4'));
  const hasDdr5 = memoryItems.some(item => descriptions(item).includes('ddr5'));
  if (hasDdr4 && hasDdr5) {
    const error = 'Mixing of DDR4 and DDR5 memory modules is physically incompatible.';
    conflicts.push({ level: 'CATEGORY', type: 'MUTUAL_EXCLUSION', message: error });
    recordAudit('CATEGORY', 'Mixing of DDR4 and DDR5 memory is not allowed', 'FAIL', error);
  } else {
    recordAudit('CATEGORY', 'Mixing of DDR4 and DDR5 memory is not allowed', 'PASS', 'Memory technology is uniform.');
  }

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

function _conflictToConstraintResult(conflict, idx) {
  const hint = conflict.diagnosticHint || {};
  const refs = Array.isArray(conflict.clicRuleIds) ? conflict.clicRuleIds : (hint.deltaId ? [hint.deltaId] : []);
  return createConstraintResult({
    constraintId: `CONSTR-GRAPH-${String(conflict.level || 'RULE').toUpperCase()}-${idx + 1}`,
    domain: String(conflict.level || 'conflict_graph').toLowerCase(),
    owner: conflict.sku || 'solution:graph',
    predicate: { subject: String(conflict.type || 'GRAPH_RULE'), operator: 'NO_CONFLICT', target: true, unit: 'boolean' },
    inputs: { conflictPresent: { value: true, unit: 'boolean' } },
    status: 'FAIL',
    hardness: 'HARD',
    evidenceRefs: refs,
    detail: conflict.message || 'Graph conflict detected'
  });
}

function _contentionToConstraintResult(con, idx) {
  return createConstraintResult({
    constraintId: `CONSTR-CONTENTION-${String(con.resourceType || 'RESOURCE').toUpperCase()}-${idx + 1}`,
    domain: 'contested_resource',
    owner: String(con.resourceType || 'shared_resource').toLowerCase(),
    predicate: { subject: String(con.resourceType || 'resource'), operator: 'LTE', target: con.maxCapacity ?? null, unit: 'slots' },
    inputs: {
      maxCapacity: { value: con.maxCapacity ?? null, unit: 'slots' },
      requestedDemands: { value: con.requestedDemands ?? null, unit: 'slots' }
    },
    status: 'FAIL',
    hardness: 'HARD',
    evidenceRefs: con.branchId ? [con.branchId] : [],
    detail: con.tradeoffSummary || con.detectedFailure || 'Shared resource contention detected'
  });
}

function _summarizeUnevaluatedChassisRules(rulesEvaluated) {
  if (!Array.isArray(rulesEvaluated) || rulesEvaluated.length === 0) return null;
  const uneval = rulesEvaluated.filter(r => r && r.status === 'UNEVALUATED');
  if (uneval.length === 0) return null;
  const samples = uneval
    .slice(0, 5)
    .map(r => String(r.ruleText || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('; ')
    .slice(0, 220);
  const detail = `${uneval.length} unevaluated chassis rule(s)${samples ? `: ${samples}` : ''}`.slice(0, 280);
  return createConstraintResult({
    constraintId: 'CONSTR-CHASSIS-RULES-UNEVAL-SUMMARY',
    domain: 'chassis',
    owner: 'chassis:rules',
    predicate: { subject: 'chassisRule', operator: 'EVALUATED', target: 0, unit: 'rules' },
    inputs: { unevaluatedRuleCount: { value: uneval.length, unit: 'rules' } },
    status: 'NOT_EVALUATED',
    hardness: 'PREFERENCE',
    detail
  });
}

function _collectGraphLevelConstraints(conflicts, unresolvedConflicts, arbitrationResults, rulesEvaluated) {
  const out = [];
  conflicts.forEach((c, idx) => out.push(_conflictToConstraintResult(c, idx)));
  unresolvedConflicts.forEach((u, idx) => out.push(createConstraintResult({
    constraintId: `CONSTR-UNRESOLVED-${idx + 1}`,
    domain: 'conflict_graph',
    owner: u.sku || 'solution:graph',
    predicate: { subject: String(u.type || 'DEPENDENCY_RESOLUTION'), operator: 'RESOLVED', target: true, unit: 'boolean' },
    status: 'FAIL',
    hardness: 'HARD',
    detail: u.reason || u.message || 'Unresolved conflict'
  })));
  const contentions = arbitrationResults?.contentions || [];
  contentions.forEach((con, idx) => out.push(_contentionToConstraintResult(con, idx)));
  const unevalSummary = _summarizeUnevaluatedChassisRules(rulesEvaluated);
  if (unevalSummary) out.push(unevalSummary);
  return out;
}

function _resolveDiagnosticOpticalAudit(fullBomList, options) {
  if (options?.opticalAudit) return options.opticalAudit;
  const audit = auditOpticalLinkEndpoints(fullBomList);
  const hasOpticalParts = audit.opticalNics.length > 0 || audit.transceivers.length > 0;
  return hasOpticalParts ? audit : null;
}

function _isMissingDomainOrChassisProfile(chassisInfo, options) {
  return Boolean(chassisInfo?.unknown === true || options?.domainProfileAvailable === false);
}

function _buildMissingProfileConstraint(chassisInfo, options) {
  const domain = options?.domain || chassisInfo?.family || 'unknown_domain';
  return createConstraintResult({
    constraintId: 'CONSTR-DOMAIN-PROFILE',
    domain,
    owner: chassisInfo?.baseSku || 'solution:domain',
    predicate: { subject: 'domainProfile', operator: 'EXISTS', target: true, unit: 'profile' },
    inputs: { domainProfile: { value: null, unit: 'profile' } },
    missingInputs: ['domainProfile'],
    status: 'NOT_EVALUATED',
    hardness: 'HARD',
    domainProfileAvailable: false,
    evidenceRefs: ['DOMAIN_PROFILE_REGISTRY'],
    detail: `Unrecognized or unprofiled chassis/domain (${chassisInfo?.model || domain}); physical constraints remain NOT_EVALUATED.`
  });
}

function _buildBaselineConsistencyConstraint(chassisInfo, conflicts, unresolvedConflicts) {
  return createConstraintResult({
    constraintId: 'CONSTR-GRAPH-CONSISTENCY',
    domain: 'conflict_graph',
    owner: chassisInfo?.baseSku || 'chassis',
    predicate: { subject: 'graphCategoryAndVendorRules', operator: 'EQ', target: 0, unit: 'conflicts' },
    inputs: {
      conflictCount: { value: conflicts.length, unit: 'conflicts' },
      unresolvedCount: { value: unresolvedConflicts.length, unit: 'conflicts' }
    },
    status: 'PASS',
    hardness: 'HARD',
    detail: 'All evaluated 5-level graph category, vendor, and chassis checks passed.'
  });
}

function _adaptDiagnosticInputs(options, opticalAudit, missingProfile) {
  const domainProfileAvailable = missingProfile ? false : options?.domainProfileAvailable;
  if (options?.aspectChecks) {
    return adaptAspectChecksToConstraints(options.aspectChecks, {
      domain: options.domain,
      domainProfileAvailable,
      opticalAudit
    });
  }
  return opticalAudit ? adaptAspectChecksToConstraints([], { opticalAudit }) : [];
}

function buildConstraintDiagnostics({ fullBomList, chassisInfo, catalogData, conflicts, unresolvedConflicts, arbitrationResults, rulesEvaluated, options }) {
  const missingProfile = _isMissingDomainOrChassisProfile(chassisInfo, options);
  const opticalAudit = _resolveDiagnosticOpticalAudit(fullBomList, options);
  const adapted = _adaptDiagnosticInputs(options, opticalAudit, missingProfile);
  const graphConstraints = _collectGraphLevelConstraints(conflicts, unresolvedConflicts, arbitrationResults, rulesEvaluated);
  const constraintResults = [...adapted, ...graphConstraints];

  if (missingProfile && !constraintResults.some(c => c.status === 'NOT_EVALUATED')) {
    constraintResults.push(_buildMissingProfileConstraint(chassisInfo, options));
  } else if (constraintResults.length === 0) {
    constraintResults.push(_buildBaselineConsistencyConstraint(chassisInfo, conflicts, unresolvedConflicts));
  }

  const feasibilityDiagnosis = diagnoseInfeasibility(constraintResults, {
    product: chassisInfo?.model || chassisInfo?.id || 'UNKNOWN_PRODUCT',
    catalogRevision: catalogData?.sourceFile || 'UNSPECIFIED',
    checkFeasibleSubsetFn: options?.checkFeasibleSubsetFn,
    searchSpaceExhaustive: false
  });
  return { constraintResults, feasibilityDiagnosis };
}

module.exports = {
  loadLearnedKnowledgeDeltas,
  validateCategoryRules,
  buildConstraintDiagnostics
};
