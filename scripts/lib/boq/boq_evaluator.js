'use strict';
/**
 * scripts/lib/boq/boq_evaluator.js — Multi-Aspect Physical Validation & Rule Engine
 *
 * Thin modular orchestrator delegating input parsing, domain rules, and aspect summary
 * construction to scripts/lib/boq/evaluators/*.
 */

const path = require('path');
const { cleanBaseSKU } = require('../catalog/sku.js');
const { getMandatorySkusForChassis, DEFAULT_MANDATORY_SKUS } = require('../catalog/catalog_rules.js');
const { detectChassisVariant, validateConflictGraph, getChassisMap } = require('../conflict/conflict_graph.js');
const { setPhysicalMathValidator } = require('../conflict/strategy_synthesizer.js');
const { resolveRequirementIntent } = require('./requirement_intent_resolver.js');
const { extractRequirementRecords } = require('./requirements/requirement_records.js');
const { attachCandidateDispositions } = require('./requirements/coverage.js');
const { resolveSolutionTopology, evaluateUnprofiledTopology } = require('./solution_topology');
const { normalizeConfiguration, applyConfigurationContext } = require('./configuration_context');
const { evaluateBundleComposition } = require('./bundle_composition');
const { buildRuntimeDiscoveryPlan } = require('./runtime_discovery_plan');
const { evaluateSanSwitch } = require('./san_switch_evaluator');
const { evaluateDomainAspects } = require('../aspects/aspect_registry.js');
const { evaluateGenericDomainRules } = require('../catalog/generic_domain_templates.js');
const { autoDetectChassisDir } = require('../catalog/catalog_discovery.js');

const { evalComputeThermal } = require('../aspects/compute_thermal.js');
const { evalMemoryChannel } = require('../aspects/memory_channel.js');
const { evalStorageTriMode } = require('../aspects/storage_tri_mode.js');
const { evalNetworkingOcp } = require('../aspects/networking_ocp.js');
const { evalPcieRiserSlots, resolveGpuCableCapacity } = require('../aspects/pcie_riser.js');
const { evalPowerEnvironment } = require('../aspects/power_environment.js');
const { evalSupportManufacturing } = require('../aspects/support_manufacturing.js');
const { evalSupportServices } = require('../aspects/support_services.js');
const { generateLifecycleRecommendations } = require('../conflict/resolution_matrix.js');
const { analyzeCategoryDependencies, getCategoryDependencyMatrix, queryLocalGraphifyNeighborhood } = require('../catalog/category_dependencies.js');

const {
  emitProgress,
  _readWorkbookWithCoverNotes,
  readBoqLines,
  _resolveBoqInputPath,
  parseAndConsolidateBOQDetailed,
  parseAndConsolidateBOQ
} = require('./evaluators/boq_input_reader.js');
const {
  validateNetworkingRules,
  validatePCIeRules,
  validateThermalRules,
  validateStorageRules
} = require('./evaluators/compute_storage_rules.js');
const {
  getCachedChassisMap,
  _checkMixedPowerTypes,
  _checkDcLugKit,
  _checkPsuRedundancy,
  _checkGpuPowerCables,
  _checkMultiGpuTitanium,
  _checkSpecialtyChassisPower,
  _checkHighLineAndLot9,
  validateSupportRules,
  validateBaseChassisRules,
  validateAlletraRules,
  validateStoreEverRules,
  validateMemoryRules,
  collectChassisDefaultAdvisories
} = require('./evaluators/power_memory_support_rules.js');
const {
  buildAspectChecks,
  buildArchitecturalRationale,
  _dispatchSpecializedDomainEvaluator
} = require('./evaluators/aspect_summary_builders.js');

const HIGH_TDP_THRESHOLD_WATTS = 240;

function buildCtoBaseSkus() {
  const set = new Set();
  try {
    const cmap = getChassisMap();
    if (cmap.chassis_base_skus_by_family_gen) {
      for (const fam of Object.values(cmap.chassis_base_skus_by_family_gen)) {
        if (fam && fam.skus) for (const sku of Object.keys(fam.skus)) set.add(cleanBaseSKU(sku));
      }
    }
    if (cmap.chassis_base_skus) {
      for (const sku of Object.keys(cmap.chassis_base_skus)) set.add(cleanBaseSKU(sku));
    }
  } catch (_) {}
  return set;
}

const CTO_BASE_SKUS = buildCtoBaseSkus();

// Kept contiguous for tests/unit/test_gpu_cable_ownership_and_remedy.js VM slice.
function validatePowerRules(ctx) {
  const { power, pcie, serverCount, mandatorySkus, errors, warnings, mathDeductions, missingDependencies, items, chassisInfo, cleanBaseSKU } = ctx;

  if (typeof _checkMixedPowerTypes === 'function') {
    _checkMixedPowerTypes(power, serverCount, errors, mathDeductions);
    _checkDcLugKit(power, serverCount, mandatorySkus, errors, mathDeductions, missingDependencies);
    _checkPsuRedundancy(power, serverCount, mandatorySkus, warnings, missingDependencies, items, chassisInfo, cleanBaseSKU);
    _checkGpuPowerCables(pcie, power, serverCount, mandatorySkus, warnings, missingDependencies, items, chassisInfo);
    _checkMultiGpuTitanium(power, pcie, serverCount, items, warnings, missingDependencies);
    _checkSpecialtyChassisPower(power, errors, mathDeductions);
    _checkHighLineAndLot9(power, serverCount, mandatorySkus, warnings, missingDependencies);
    return;
  }

  // Sandboxed fallback for isolated testing of GPU power cable remedy
  if (pcie && pcie.needsGpuPowerCableKit) {
    const isGen12 = chassisInfo && (chassisInfo.gen === 'Gen12' || chassisInfo.generation === 'Gen12');
    const gpuCableSku = (mandatorySkus && mandatorySkus.GPU_POWER_CABLE_KIT && mandatorySkus.GPU_POWER_CABLE_KIT.sku) || (power && power.isDl380aGpuChassis ? 'P74700-B21' : (isGen12 ? 'P83526-B21' : 'P53424-B21'));
    const gpuCableDesc = (mandatorySkus && mandatorySkus.GPU_POWER_CABLE_KIT && mandatorySkus.GPU_POWER_CABLE_KIT.name) || (power && power.isDl380aGpuChassis ? 'HPE ProLiant Compute DL380a Gen12 GPU 16-pin FIO Cable Kit' : (isGen12 ? 'HPE ProLiant DL380 Gen12 GPU Auxiliary Power Cable Kit' : 'HPE ProLiant DL380 Gen11 GPU Power Cable Kit'));
    const cableCapacity = typeof resolveGpuCableCapacity === 'function' ? resolveGpuCableCapacity(gpuCableSku, gpuCableDesc, mandatorySkus) : 1;
    const requiredKitsPerNode = Math.ceil(((pcie.gpuCount || 0) - (pcie.gpuPowerCableKitCount || 0)) / cableCapacity);
    const requiredTotalKits = Math.ceil((pcie.gpuCount || 0) / cableCapacity);
    const ratioNote = cableCapacity > 1 ? `, 1 kit per ${cableCapacity} GPUs` : '';

    let reason;
    if (power && power.isDl380aGpuChassis) {
      reason = `GPU Power Math: ${pcie.gpuCount} front-bay GPU accelerator(s) detected on DL380a Gen12. Requires ${requiredTotalKits} GPU 16-pin FIO Cable Kits (${gpuCableSku}${ratioNote}). Existing cable capacity covers ${pcie.gpuPowerCableKitCount} GPU(s).`;
    } else if (cableCapacity > 1) {
      reason = `GPU Power Math: ${pcie.gpuCount} PCIe GPU accelerator(s) detected. Requires ${requiredTotalKits} GPU Auxiliary Power Cable Kit(s) (${gpuCableSku}${ratioNote}) to connect to power distribution board. Existing cable capacity covers ${pcie.gpuPowerCableKitCount} GPU(s).`;
    } else {
      reason = `GPU Power Math: ${pcie.gpuCount} PCIe GPU accelerator(s) detected. Requires ${pcie.gpuCount} GPU Auxiliary Power Cable Kit(s) (${gpuCableSku}) to connect to power distribution board. Found ${pcie.gpuPowerCableKitCount}.`;
    }

    warnings.push(reason);
    missingDependencies.push({
      key: 'GPU_AUX_POWER_CABLE_KIT',
      rule: 'GPU Accelerator Auxiliary Power Rule',
      sku: gpuCableSku,
      description: gpuCableDesc,
      quantity: requiredKitsPerNode * (serverCount || 1),
      reasoning: reason
    });
  }
}

function _handleTopologyAndScaling(items, catalogData, targetDir, options) {
  const topologyItems = Array.isArray(items) ? items : [];
  const detectedChassis = detectChassisVariant(topologyItems);
  const topology = resolveSolutionTopology(topologyItems, detectedChassis, catalogData);
  if (topologyItems.length && (topology.domain !== 'server' && !(topology.domain === 'networking' && detectedChassis.family === 'SAN'))) {
    const specialized = _dispatchSpecializedDomainEvaluator(topologyItems, catalogData, targetDir, topology, detectedChassis, options);
    return { isHandled: true, result: specialized || evaluateUnprofiledTopology(items, topology, detectedChassis) };
  }
  if (Array.isArray(items) && items.length && !options.baseConfigurationOnly) {
    const alreadyNormalized = items.every(it => it.quantityBasis === 'base' || it.quantityScope === 'global');
    if (!alreadyNormalized) {
      try {
        const context = normalizeConfiguration(items);
        const baseItems = context.items.filter(it => it.quantityScope !== 'global');
        const result = evaluatePhysicalMath(baseItems, catalogData, targetDir, {
          ...options, baseConfigurationOnly: true, availabilityGlobalItems: context.items.filter(it => it.quantityScope === 'global')
        });
        const applied = applyConfigurationContext(result, context);
        if (applied.evalSummary && applied.clusterSizing && context.multiplier > 1) {
          const m = context.multiplier;
          const es = applied.evalSummary;
          if (Number.isFinite(es.cpuCount)) es.cpuCount = es.cpuCount * m;
          if (Number.isFinite(es.memoryCount)) es.memoryCount = es.memoryCount * m;
          if (Number.isFinite(es.totalMemoryGb)) es.totalMemoryGb = es.totalMemoryGb * m;
          es.clusterSizing = applied.clusterSizing;
        }
        return { isHandled: true, result: applied };
      } catch (err) {
        if (err.code !== 'CONFIGURATION_OWNERSHIP_AMBIGUOUS') throw err;
        const result = evaluatePhysicalMath(items, catalogData, targetDir, { ...options, baseConfigurationOnly: true });
        result.ownershipAmbiguous = true;
        result.ownershipAmbiguityReason = err.message;
        return { isHandled: true, result };
      }
    }
  }
  return { isHandled: false, topology, detectedChassis };
}

function _buildEmptyBoqResult() {
  const reason = 'Empty BOQ: No SKUs or line items detected.';
  return {
    isMathClean: false, isGraphClean: false, criticalViolationsCount: 1,
    confidence: { score: 0.0, isHitlTriggered: true, confidenceReasons: [`[CRITICAL_MATH] ${reason}`] },
    errors: [reason], warnings: [], missingDependencies: [], mathDeductions: [reason], evalSummary: {}, aspectChecks: [],
    conflictGraph: { isWholeSolutionValid: false, conflicts: [{ level: 'BOQ', type: 'EMPTY_INPUT', message: reason }], resolvedFixes: [], unresolvedConflicts: [], rankedSolutions: [] }
  };
}

function _detectServerAndRailCount(items, chassisInfo) {
  let serverCount = 1;
  let railKitCount = 0;
  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const clean = cleanBaseSKU(it.sku);
    if (desc.includes('configure-to-order') || desc.includes('cto server') || desc.includes('base server') || clean === chassisInfo.baseSku || CTO_BASE_SKUS.has(clean)) {
      serverCount = Math.max(1, parseInt(it.quantity, 10) || 1);
    }
    if (desc.includes('rack rail') || desc.includes('rail kit') || clean === 'P52341-B21') {
      railKitCount += parseInt(it.quantity, 10) || 1;
    }
  }
  return { serverCount, railKitCount };
}

function _evaluateCoreAspects(items, catalogData, mandatorySkus, serverCount, options) {
  emitProgress(2, 10, 'Compute & Thermal Profiling', 'in_progress', `Analyzing ${items.length} SKUs for high-TDP processor constraints and heatsink counts.`);
  const compute = evalComputeThermal(items, catalogData, mandatorySkus, serverCount, options);
  emitProgress(3, 10, 'Memory Channel Math', 'in_progress', 'Validating 1DPC / 2DPC symmetry and balanced memory population.');
  const memory = evalMemoryChannel(items, compute.cpuCount, catalogData);
  emitProgress(4, 10, 'Storage Tri-Mode Validation', 'in_progress', 'Verifying NVMe/SAS/SATA drive cages, controllers, and backplane capacities.');
  const storage = evalStorageTriMode(items, catalogData, mandatorySkus, serverCount);
  emitProgress(5, 10, 'Networking & PCIe Constraints', 'in_progress', 'Analyzing OCP NICs and PCIe Riser slot math.');
  const network = evalNetworkingOcp(items, catalogData, mandatorySkus, serverCount);
  const pcie = evalPcieRiserSlots(items, catalogData, mandatorySkus, serverCount);
  if (pcie.slotLayout) {
    const perNodeDemand = pcie.requiredPcieCards / serverCount;
    pcie.slotLayout.perNodeDemand = { pcieCards: perNodeDemand, gpuCards: pcie.gpuCount / serverCount, remainingMechanicalSlots: Math.max(0, pcie.totalSlotsAvailable - perNodeDemand), remainingActiveSlots: Math.max(0, pcie.activeSlotsAvailable - perNodeDemand) };
    pcie.slotLayout.clusterTotals = { serverCount, pcieCardDemand: pcie.requiredPcieCards, gpuCardDemand: pcie.gpuCount, mechanicalSlotCapacity: pcie.totalSlotsAvailable * serverCount, electricallyActiveSlotCapacity: pcie.activeSlotsAvailable * serverCount, x16SlotCapacity: pcie.x16LanesAvailable * serverCount };
  }
  emitProgress(6, 10, 'Power & Infrastructure Checking', 'in_progress', 'Verifying DC power lug kits and redundancy.');
  const power = evalPowerEnvironment(items, catalogData, mandatorySkus, serverCount, options);
  const support = evalSupportManufacturing(items, catalogData, 0, serverCount);
  const lifecycle = (options.skipLifecycle || options.skipGraphValidation) ? { hasObsoleteRisk: false, hasEolWarning: false, obsoleteSkus: [], eolSkus: [], nearExpirySkus: [] } : evalSupportServices(items, catalogData, options.lifecycle || {});
  const lifecycleRecommendations = (options.skipLifecycle || options.skipGraphValidation) ? [] : generateLifecycleRecommendations(items, catalogData, options.lifecycle || {});
  return { compute, memory, storage, network, pcie, power, support, lifecycle, lifecycleRecommendations };
}

function _evaluateDomainAudits(items, catalogData, chassisInfo, topology, mandatorySkus, serverCount, memory, hasBaseChassis, options) {
  let genericDomainAudit = null;
  if (!options.skipGraphValidation) {
    try {
      genericDomainAudit = evaluateGenericDomainRules(items, { domain: topology.domain.toUpperCase(), catalog: catalogData, chassisProfile: (chassisInfo.model || '').toLowerCase().includes('dl145') ? 'EDGE' : 'ENTERPRISE' });
    } catch (genErr) {
      console.warn('[BOQ_EVALUATOR] Generic domain rules evaluation advisory:', genErr.message);
    }
  }
  let domainAspectAudit = null;
  const domainErrors = [];
  const domainWarnings = [];
  try {
    domainAspectAudit = evaluateDomainAspects(topology.domain, items, catalogData, mandatorySkus, serverCount, { chassisInfo, channelWidth: memory?.channelWidth || 8, isCtoChassis: hasBaseChassis, options });
    if (Array.isArray(domainAspectAudit?.errors) && domainAspectAudit.errors.length > 0) domainErrors.push(...domainAspectAudit.errors);
    if (Array.isArray(domainAspectAudit?.warnings) && domainAspectAudit.warnings.length > 0) domainWarnings.push(...domainAspectAudit.warnings);
  } catch (aspectErr) {
    const errDetail = `Aspect Registry Evaluation Failure [${topology.domain}]: ${aspectErr.message}`;
    console.error('[BOQ_EVALUATOR]', errDetail);
    domainErrors.push(errDetail);
  }
  return { genericDomainAudit, domainAspectAudit, domainErrors, domainWarnings };
}

function _computeClusterSizing(serverCount, formFactorRU, power, catalogData, railKitCount) {
  let recRailSku = 'P52341-B21';
  let recRailDesc = 'HPE ProLiant Easy Install Rail Kit';
  if (catalogData?.entries) {
    for (const entry of catalogData.entries) {
      const match = entry.skus?.find(s => /Rail\s*Kit/i.test(s.Description || s.description || ''));
      if (match) { recRailSku = match.sku || match['Product #'] || recRailSku; recRailDesc = match.Description || match.description || recRailDesc; break; }
    }
  }
  return {
    serverCount,
    totalRackUnits: formFactorRU > 0 ? serverCount * formFactorRU : null,
    standard42uRacksRequired: formFactorRU > 0 ? Math.ceil((serverCount * formFactorRU) / 42) : null,
    totalFacilityPowerKw: Number(((serverCount * (power.maxPsuWattage || 800)) / 1000).toFixed(1)),
    estimatedNodeWattage: power.estimatedNodeWattage,
    railKitCoverage: { required: serverCount, recommendedSku: recRailSku, description: recRailDesc, providedCount: railKitCount || 0, isCompliant: (railKitCount || 0) >= serverCount },
    needsHighLine220v: power.needsHighLine220v
  };
}

function _assessCompositeRelationships(relChecks, compositeStatus, compositeChecks, errors, warnings, aspectChecks, conflictGraphResults) {
  if (relChecks.length === 0) return;
  const failedRelChecks = compositeChecks.filter(c => c.status === 'FAIL');
  if (failedRelChecks.length > 0) {
    const detail = `Composite relationship violation: ${failedRelChecks.map(c => c.detail).join('; ')}`;
    errors.push(detail);
    aspectChecks.push({ id: 'CROSS_COMPONENT_DEPENDENCIES', name: 'Enclosure and fabric relationships', status: 'FAIL', detail });
    conflictGraphResults.isWholeSolutionValid = false;
    conflictGraphResults.unresolvedConflicts = [...(conflictGraphResults.unresolvedConflicts || []), { type: 'COMPOSITE_RELATIONSHIP_VIOLATION', message: detail }];
    for (const candidate of conflictGraphResults.rankedSolutions || []) { candidate.validationScope = 'COMPUTE_COMPONENT_ONLY'; candidate.relationshipValidationStatus = 'EVALUATED_FAIL'; candidate.physicalMathClean = false; candidate.isMathClean = false; }
  } else if (compositeStatus === 'EVALUATED_PASS') {
    aspectChecks.push({ id: 'CROSS_COMPONENT_DEPENDENCIES', name: 'Enclosure and fabric relationships', status: 'PASS', detail: 'All composite enclosure bay, adapter-to-fabric, and shared power/cooling relationships verified cleanly.' });
    for (const candidate of conflictGraphResults.rankedSolutions || []) { candidate.validationScope = 'COMPOSITE_SOLUTION_VERIFIED'; candidate.relationshipValidationStatus = 'EVALUATED_PASS'; }
  } else {
    const detail = 'Compute component checks do not validate its enclosure, bay, fabric, shared power or endpoint relationships. Resolve the owning solution before whole-solution certification.';
    warnings.push(detail);
    aspectChecks.push({ id: 'CROSS_COMPONENT_DEPENDENCIES', name: 'Enclosure and fabric relationships', status: 'NOT_EVALUATED', detail });
    conflictGraphResults.isWholeSolutionValid = false;
    conflictGraphResults.unresolvedConflicts = [...(conflictGraphResults.unresolvedConflicts || []), { type: 'TOPOLOGY_CONTEXT_REQUIRED', message: detail }];
    for (const candidate of conflictGraphResults.rankedSolutions || []) { candidate.validationScope = 'COMPUTE_COMPONENT_ONLY'; candidate.relationshipValidationStatus = 'NOT_EVALUATED'; candidate.physicalMathClean = false; candidate.isMathClean = false; }
  }
}

function _computeConfidenceObject(isMathClean, isGraphClean, areRelationshipsClean, _hasUnknownOrFailAspect, errors, warnings, conflictGraphResults, aspectChecks, criticalViolationsCount) {
  let confidenceScore = 1.0;
  if (!isMathClean) confidenceScore -= (errors.length * 0.15);
  if (!isGraphClean) confidenceScore -= (conflictGraphResults.conflicts.length * 0.10);
  if (warnings.length > 0) confidenceScore -= (warnings.length * 0.05);
  confidenceScore = Math.max(0.1, parseFloat(confidenceScore.toFixed(2)));
  if (!areRelationshipsClean || _hasUnknownOrFailAspect) confidenceScore = Math.min(confidenceScore, 0.74);

  const confidenceReasons = [...errors.map(e => `[CRITICAL_MATH] ${e}`), ...conflictGraphResults.conflicts.map(c => `[CONFLICT_GRAPH] ${c.message}`), ...warnings.map(w => `[WARNING] ${w}`)];
  if (confidenceReasons.length === 0) {
    const unknownAspects = aspectChecks.filter(a => a.status === 'UNKNOWN');
    confidenceReasons.push(unknownAspects.length > 0 ? `${unknownAspects.length} aspect(s) returned UNKNOWN due to absent subsystem data: ${unknownAspects.map(a => a.name).join(', ')}.` : 'All 7 physical aspects passed deterministic evaluation and graph rules.');
  }
  return { score: confidenceScore, isHitlTriggered: confidenceScore < 0.75 || criticalViolationsCount > 0, confidenceReasons };
}

function _assessConfidenceAndCleanliness(errors, warnings, topology, aspectChecks, domainAspectAudit, conflictGraphResults) {
  const relChecks = topology?.relationshipChecks || [];
  const compositeStatus = topology?.relationshipStatus;
  _assessCompositeRelationships(relChecks, compositeStatus, topology?.compositeChecks || [], errors, warnings, aspectChecks, conflictGraphResults);
  const _hasUnknownOrFailAspect = !aspectChecks.length || aspectChecks.some(a => !['PASS', 'WARN', 'NOT_APPLICABLE'].includes(a.status));
  const isDomainClean = !domainAspectAudit || (domainAspectAudit.hasFailures !== true && (!domainAspectAudit.errors || domainAspectAudit.errors.length === 0));
  const areRelationshipsClean = relChecks.length === 0 || compositeStatus === 'EVALUATED_PASS';
  const isMathClean = errors.length === 0 && areRelationshipsClean && !_hasUnknownOrFailAspect && isDomainClean;
  const isGraphClean = conflictGraphResults.isWholeSolutionValid;
  const criticalViolationsCount = errors.length + (conflictGraphResults.conflicts ? conflictGraphResults.conflicts.length : 0);
  const confidence = _computeConfidenceObject(isMathClean, isGraphClean, areRelationshipsClean, _hasUnknownOrFailAspect, errors, warnings, conflictGraphResults, aspectChecks, criticalViolationsCount);
  return { isMathClean, isGraphClean, criticalViolationsCount, confidenceScore: confidence.score, confidence };
}

function _runAllAspectRules(ctx) {
  validateNetworkingRules(ctx);
  validatePCIeRules(ctx);
  validateThermalRules(ctx);
  validateStorageRules(ctx);
  validatePowerRules(ctx);
  validateSupportRules(ctx);
  validateBaseChassisRules(ctx);
  validateAlletraRules(ctx);
  validateStoreEverRules(ctx);
  validateMemoryRules(ctx);
}

function _determineChassisFormFactorRU(chassisInfo) {
  const is4U = chassisInfo.formFactor === '4U' || /DL380a|DL384|DL580|4U/i.test(chassisInfo.model || '') || /DL380a|DL384/i.test(chassisInfo.id || '') || /8DW/i.test(chassisInfo.formFactor || '');
  const is1U = chassisInfo.formFactor === '1U' || /DL360|1U/i.test(chassisInfo.model || '') || /DL360/i.test(chassisInfo.id || '');
  const isBlade = /blade|compute module/i.test(chassisInfo.formFactor || '') || /SY480|SY100Gb/i.test(chassisInfo.model || '');
  return Number.isFinite(chassisInfo.uHeight) ? chassisInfo.uHeight : (isBlade ? 0 : is1U ? 1 : is4U ? 4 : 2);
}

function _resolvePortalValidationState(options = {}) {
  const liveClic = options.liveClicValidation || options.clicValidation || null;
  const bomClic = options.clicStatusSummary || null;
  const hasBomEvidence = Boolean(bomClic?.portalValidatedFromBom || (bomClic?.hasClicStatusColumn && (bomClic.unbuildableCount > 0 || bomClic.errorCount > 0 || bomClic.processControlCount > 0)));
  if (!liveClic && !hasBomEvidence) return { portalValidationStatus: 'PORTAL VALIDATION PENDING', liveClicValidation: null, clicStatusSummary: bomClic };
  const source = liveClic || bomClic;
  const unbuildables = Number(source?.unbuildablesCount ?? source?.unbuildables ?? source?.unbuildableCount ?? 0);
  const errors = Number(source?.errorsCount ?? source?.errors ?? source?.errorCount ?? 0);
  const processControl = Number(source?.processControlCount ?? source?.processControl ?? 0);
  const warnings = Number(source?.warningsCount ?? source?.warnings ?? source?.warningCount ?? 0);
  const portalValidationStatus = (unbuildables > 0 || errors > 0 || processControl > 0) ? 'PORTAL_VALIDATION_FAILED' : (warnings > 0 ? 'PORTAL_VALIDATED_WITH_WARNINGS' : 'PORTAL_VALIDATED');
  return { portalValidationStatus, liveClicValidation: liveClic, clicStatusSummary: bomClic };
}

function evaluatePhysicalMath(items, catalogData = null, targetDir = '', options = {}) {
  const scaled = _handleTopologyAndScaling(items, catalogData, targetDir, options);
  if (scaled.isHandled) return scaled.result;
  const { topology } = scaled;
  if (!items || !Array.isArray(items) || items.length === 0) return _buildEmptyBoqResult();

  const chassisInfo = detectChassisVariant(items);
  if (chassisInfo.family === 'SAN') return { ...evaluateSanSwitch(items, catalogData, targetDir, chassisInfo, getCachedChassisMap().product_bundle_compositions || [], options), solutionTopology: topology };
  const mandatorySkus = getMandatorySkusForChassis(chassisInfo);
  const { serverCount, railKitCount } = _detectServerAndRailCount(items, chassisInfo);
  const aspects = _evaluateCoreAspects(items, catalogData, mandatorySkus, serverCount, options);
  const { compute, memory, storage, network, pcie, power, support, lifecycle, lifecycleRecommendations } = aspects;
  const hasBaseChassis = items.some(it => { const clean = cleanBaseSKU(it.sku); return clean === chassisInfo.baseSku || CTO_BASE_SKUS.has(clean); });
  const { genericDomainAudit, domainAspectAudit, domainErrors, domainWarnings } = _evaluateDomainAudits(items, catalogData, chassisInfo, topology, mandatorySkus, serverCount, memory, hasBaseChassis, options);

  const errors = [...domainErrors];
  const warnings = [...domainWarnings];
  const missingDependencies = [];
  const mathDeductions = [];
  const { chassisDefaults, redundantDefaults } = collectChassisDefaultAdvisories(items, chassisInfo, warnings, options.skipGraphValidation);
  if (lifecycle.hasObsoleteRisk) warnings.push('Lifecycle Risk: Obsolete (OB) component(s) detected in BOM. Upgrade recommendations generated.');
  if (lifecycle.hasEolWarning) warnings.push('Lifecycle Advisory: 90-Day EOL component(s) detected in BOM. Advance migration recommended.');

  const ocpSlotsClusterMax = network.maxOcpSlots * serverCount;
  const pcieSlotsClusterMax = pcie.totalSlotsAvailable * serverCount;
  const activePcieSlotsClusterMax = pcie.activeSlotsAvailable * serverCount;
  const hasDriveCageKit = storage.hasDriveCage || items.some(it => (it.description || '').toLowerCase().includes('drive cage') || (it.description || '').toLowerCase().includes('cage kit') || (mandatorySkus?.GENERIC_CAGE?.sku && cleanBaseSKU(it.sku) === cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku)));

  const ctx = {
    items, serverCount, compute, memory, storage, network, pcie, power, support, lifecycle, catalogData,
    chassisInfo, mandatorySkus, CTO_BASE_SKUS, HIGH_TDP_THRESHOLD_WATTS,
    errors, warnings, mathDeductions, missingDependencies, cleanBaseSKU, hasDriveCageKit, hasBaseChassis,
    ocpSlotsClusterMax, pcieSlotsClusterMax, activePcieSlotsClusterMax,
    isExceedingOcp: network.ocpAdapterCount > ocpSlotsClusterMax, isExceedingPcie: pcie.requiredPcieCards > pcieSlotsClusterMax, isExceedingActivePcie: pcie.requiredPcieCards > activePcieSlotsClusterMax,
    psuPerServer: power.psuCount / serverCount, cpusPerServer: compute.cpuCount / serverCount, options, topology
  };

  _runAllAspectRules(ctx);
  const aspectChecks = buildAspectChecks(ctx);
  const bundleComposition = evaluateBundleComposition(items, getCachedChassisMap().product_bundle_compositions || [], path.basename(targetDir));
  const architecturalRationale = buildArchitecturalRationale(ctx);
  const clusterSizing = _computeClusterSizing(serverCount, _determineChassisFormFactorRU(chassisInfo), power, catalogData, railKitCount);
  const evalSummary = {
    cpuCount: compute.cpuCount, maxCpuTdpWatts: compute.maxCpuTdpWatts, memoryCount: memory.memoryCount, totalMemoryGb: memory.totalMemoryGb,
    isBalancedChannel: memory.isBalancedChannel, isSupportedPopulation: memory.isSupportedPopulation, dimmsPerCpu: memory.dimmsPerCpu,
    driveCount: storage.driveCount, hasStorageController: storage.hasStorageController, hasSmartBattery: storage.hasSmartBattery, hasNoDriveKit: storage.hasNoDriveKit,
    hasHighPerfFans: compute.hasHighPerfFans, hasHeatsinks: compute.hasHeatsinks, hasDcPowerSupply: power.hasDcPowerSupply, hasDcLugKit: power.hasDcLugKit,
    hasOcpAdapter: network.hasOcpAdapter, networkPortsCount: network.networkPortsCount, requiredPcieCards: pcie.requiredPcieCards, totalPcieSlotsAvailable: pcie.totalSlotsAvailable,
    architecturalRationale, hasSupportService: support.hasSupportService, lifecycleRisks: lifecycle, lifecycleRecommendations,
    compute, memory, storage, networking: network, pcie, power, support, needsActions: missingDependencies.map(d => d.key || d.sku),
    clusterSizing, errors, warnings, mathDeductions, missingDependencies, chassisDefaults, redundantDefaults, aspectChecks, genericDomainAudit, domainAspectAudit, bundleComposition
  };

  let conflictGraphResults = { isWholeSolutionValid: true, conflicts: [], resolvedFixes: [], unresolvedConflicts: [], rankedSolutions: [] };
  if (!options.skipGraphValidation) {
    emitProgress(7, 10, 'Validating Conflict Graph', 'in_progress', 'Resolving dependencies and checking for architectural conflicts.');
    const resolvedDir = targetDir || autoDetectChassisDir(items);
    conflictGraphResults = validateConflictGraph(items, missingDependencies, resolvedDir, '', {
      skipSynthesis: options.skipSynthesis === true, aspectChecks, errors, warnings, useNumericStep: true,
      availabilityGlobalItems: options.availabilityGlobalItems,
      ...(options.prioritizeFastShipAsRank2 !== undefined ? { prioritizeFastShipAsRank2: options.prioritizeFastShipAsRank2 } : {}),
      ...(options.liveSolutionEdt ? { liveSolutionEdt: options.liveSolutionEdt } : {}),
      ...(options.liveClicValidation ? { liveClicValidation: options.liveClicValidation } : {}),
      ...(options.clicStatusSummary ? { clicStatusSummary: options.clicStatusSummary } : {}),
      ...(options.preserveRoles ? { preserveRoles: options.preserveRoles } : {}),
      ...(options.allowFcHbaSubstitution !== undefined ? { allowFcHbaSubstitution: options.allowFcHbaSubstitution } : {})
    });
  }

  const { isMathClean, isGraphClean, criticalViolationsCount, confidence } = _assessConfidenceAndCleanliness(errors, warnings, topology, aspectChecks, domainAspectAudit, conflictGraphResults);
  const portalState = _resolvePortalValidationState(options);

  return {
    isMathClean, portalValidationStatus: portalState.portalValidationStatus, liveClicValidation: portalState.liveClicValidation, clicStatusSummary: portalState.clicStatusSummary,
    runtimeDiscoveryPlan: buildRuntimeDiscoveryPlan({ items, conflictGraph: conflictGraphResults }, { catalogData, targetDir, selectorsByConfiguration: options.selectorsByConfiguration }),
    solutionTopology: topology, isGraphClean, criticalViolationsCount, confidence, errors, warnings, missingDependencies, mathDeductions,
    evalSummary, architecturalRationale: evalSummary.architecturalRationale, clusterSizing: evalSummary.clusterSizing, aspectChecks,
    genericDomainAudit, bundleComposition, selfCorrectionTrail: conflictGraphResults?.arbitrationResults?.selfCorrectionTrail || [], conflictGraph: conflictGraphResults
  };
}

function formatNotebookQueryPayload(items, evalResults, rankedSolutions = []) {
  const chassisInfo = evalResults.conflictGraph?.chassisInfo || detectChassisVariant(items);
  const issues = [...(evalResults.errors || []), ...(evalResults.conflictGraph?.conflicts || []).map(c => c.message)];
  const fixes = evalResults.missingDependencies || [];
  const skuManifest = (items || []).map(i => `${i.sku || 'SKU'} (x${i.quantity || 1})`).join(', ');
  let queryText = `Validate complete BOQ configuration compatibility for ${chassisInfo.model || chassisInfo.id || 'Server'}.\nBOM Manifest: ${skuManifest}.`;
  if (issues.length > 0) queryText += `\nDetected Physical Checks / Conflicts (${issues.length}): ${issues.join('; ')}.`;
  if (fixes.length > 0) queryText += `\nProposed Auxiliary Fixes: ${fixes.map(f => f.sku).join(', ')}.`;
  if (evalResults.bundleComposition?.length) queryText += `\nBundle accounting: ${JSON.stringify(evalResults.bundleComposition)}. Confirm exact base and upgrade inclusions from official sources; distinguish installed optics from spares or remote endpoints. Never add server components to a fixed SAN switch.`;
  if (rankedSolutions && rankedSolutions.length > 0) queryText += `\nRanked Solution Options: ${rankedSolutions.slice(0, 3).map(r => `Rank ${r.rank} (${r.tierTitle}): $${r.estimatedCapex || 0}`).join(' | ')}.`;
  const requirementResolution = evalResults.requirementResolution || null;
  const pcieLayout = evalResults.evalSummary?.pcie?.slotLayout || null;
  if (requirementResolution?.resolutions?.length > 0) {
    queryText += `\nRequirement-category resolution: ${requirementResolution.resolutions.map(r => `${r.expectedRole}: ${r.status} (${(r.candidates || []).map(c => c.sku).join(', ')})`).join('; ')}.`;
  }
  if (pcieLayout) queryText += `\nPCIe topology context: ${pcieLayout.totalMechanicalSlots} mechanical slots, ${pcieLayout.electricallyActiveSlots} active slots, ${pcieLayout.inputDemandPcieCards} PCIe cards required, base primary slots: ${pcieLayout.platformBaseMechanicalSlots}.`;

  return {
    chassis: chassisInfo.id || chassisInfo.model, query: queryText,
    context: {
      itemsCount: items.length, detectedTdp: evalResults.evalSummary?.maxCpuTdpWatts, memoryTotalGb: evalResults.evalSummary?.totalMemoryGb,
      issuesCount: issues.length, skuManifest, requestedRoles: requirementResolution?.intent?.requestedRoles || [],
      requirementClarificationRequired: requirementResolution?.requiresHumanClarification || false, pcieLayout
    }
  };
}

function _attachEvaluationRequirementCoverage(result, requirementAccounting, baselineItems, options) {
  const ctx = { baselineItems: baselineItems || [], evalSummary: result.evalSummary, nodeCount: result.clusterSizing?.serverCount || result.configurationContext?.multiplier || undefined, waivers: options.requirementWaivers || [] };
  const ranked = result.conflictGraph?.rankedSolutions;
  if (Array.isArray(ranked) && ranked.length > 0) attachCandidateDispositions(ranked, requirementAccounting, ctx);
  const recommended = result.conflictGraph?.recommendedSolutions;
  if (Array.isArray(recommended) && recommended.length > 0) attachCandidateDispositions(recommended.filter(c => !c?.requirementCoverage), requirementAccounting, ctx);
}

function _checkMultiAspectFreshness(options) {
  try {
    const { evaluateCatalogFreshness } = require('../catalog/catalog_freshness_guard.js');
    const dir = options.targetDir || options.catalogDir || null;
    if (!dir) return null;
    const catalogFreshness = evaluateCatalogFreshness(dir, { maxAgeHours: 72 });
    if (!catalogFreshness.isFresh) {
      console.warn(`[WARN] [FRESHNESS] ${catalogFreshness.reason}`);
      if (!options.context) options.context = {};
      options.context.staleCatalogWarning = catalogFreshness.status === 'STALE';
      options.context.catalogFreshness = catalogFreshness;
    }
    return catalogFreshness;
  } catch (_) {
    return null;
  }
}

function _prepareMultiAspectRequirements(parsed, sourceFilePath, options) {
  const coverNoteRecords = parsed.coverNoteRecords || [];
  const requirementResolution = options.catalogData
    ? resolveRequirementIntent({ items: parsed.items, unresolvedRequirements: parsed.unresolvedRequirements, rawLines: parsed.rawLines, coverNoteRecords, filePath: sourceFilePath, catalogData: options.catalogData, productConfirmed: Boolean(options.productConfirmed || options.targetDir) })
    : { status: 'NOT_RUN_NO_EXACT_CATALOG', resolvedItems: parsed.items, resolutions: [], requiresHumanClarification: false, learningEligible: false };
  const requirementAccounting = requirementResolution.requirementAccounting || extractRequirementRecords({ rawLines: parsed.rawLines || [], coverNoteRecords, unresolvedRequirements: parsed.unresolvedRequirements || [], items: parsed.items || [], file: sourceFilePath });
  return { requirementResolution, requirementAccounting };
}

function evaluateBOQMultiAspect(filePathOrText, options = {}) {
  const catalogFreshness = _checkMultiAspectFreshness(options);
  const parsed = parseAndConsolidateBOQDetailed(filePathOrText, options.filePath || '', options.targetSheet || null);
  const sourceFilePath = _resolveBoqInputPath(filePathOrText, options.filePath || '') || null;
  const { requirementResolution, requirementAccounting } = _prepareMultiAspectRequirements(parsed, sourceFilePath, options);
  const items = requirementResolution.resolvedItems;
  const resolvedTargetDir = options.targetDir || options.chassisDir || '';
  const result = evaluatePhysicalMath(items, options.catalogData, resolvedTargetDir, { ...options, clicStatusSummary: options.clicStatusSummary || parsed.clicStatusSummary || null });
  if (requirementResolution.requiresHumanClarification) {
    result.confidence.isHitlTriggered = true;
    result.confidence.score = Math.min(result.confidence.score, 0.74);
    result.confidence.confidenceReasons.push('[REQUIREMENT_AMBIGUITY] One or more requested components require human category/part confirmation.');
  }
  _attachEvaluationRequirementCoverage(result, requirementAccounting, parsed.items, options);
  const effectiveItems = result.items || items;
  let valueEngineering = null;
  try { valueEngineering = require('./deal_optimizer.js').analyzeDealValueEngineering(effectiveItems, result, options.catalogData, resolvedTargetDir); } catch (_) {}
  return { ...result, items: effectiveItems, requirementResolution, requirementAccounting, valueEngineering, catalogFreshness };
}

setPhysicalMathValidator((items, catalogData, targetDir, options = {}) => evaluatePhysicalMath(items, catalogData, targetDir, { ...options, baseConfigurationOnly: true, skipGraphValidation: true, skipLifecycle: true }));

module.exports = {
  HIGH_TDP_THRESHOLD_WATTS,
  DEFAULT_MANDATORY_SKUS,
  CTO_BASE_SKUS,
  parseAndConsolidateBOQ,
  parseAndConsolidateBOQDetailed,
  evaluatePhysicalMath,
  evaluateBOQMultiAspect,
  formatNotebookQueryPayload,
  evalComputeThermal,
  evalMemoryChannel,
  evalStorageTriMode,
  evalNetworkingOcp,
  evalPcieRiserSlots,
  evalPowerEnvironment,
  evalSupportManufacturing,
  evalSupportServices,
  getMandatorySkusForChassis,
  analyzeCategoryDependencies,
  getCategoryDependencyMatrix,
  queryLocalGraphifyNeighborhood,
  _assessConfidenceAndCleanliness,
  _readWorkbookWithCoverNotes,
  readBoqLines
};
