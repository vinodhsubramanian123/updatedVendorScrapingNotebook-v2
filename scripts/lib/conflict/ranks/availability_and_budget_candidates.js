'use strict';
/**
 * scripts/lib/conflict/ranks/availability_and_budget_candidates.js — Fast-Ship Availability & Rank 5 Budget Optimization
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../../catalog/sku.js');
const { analyzeRetirementDate } = require('../../catalog/lifecycle.js');
const { getMandatorySkusForChassis } = require('../../catalog/catalog_rules.js');
const { extractWorkloadDna } = require('../workload_dna.js');
const { extractComponentAttributes, scoreReplacementCandidate, compareAvailabilityReplacement, isActiveCatalogOption } = require('../least_delta_combinator.js');
const {
  AVAILABILITY_TARGET_DAYS,
  MAX_AVAILABILITY_VALIDATIONS,
  UNAVAILABLE_SUPPLY,
  REPLACEMENT_SUPPLY_UNKNOWN,
  _catalogSupplyAttributes,
  _isHardwareSupplyItem,
  _partSupplyAttributes,
  calculateSupplyMetrics
} = require('./supply_and_pricing.js');
const { computeBomFingerprint } = require('./candidate_revalidator.js');

function _isAvailableCatalogOption(item) {
  const row = item?.skuData;
  if (!row || item.lifecycleState?.isNonActive) return false;
  if (/\binactive\b/i.test(item.lifecycleStatus)) return false;
  const retired = [row['Discontinued Date'], row['Obsolete Date'], row.discontinuedDate, row.obsoleteDate]
    .some(date => date && analyzeRetirementDate(date).isPast);
  return !retired && !UNAVAILABLE_SUPPLY.test(_catalogSupplyAttributes(item).availability);
}

function _compareAvailabilityMatches(a, b) {
  return Number(a.matchType === 'UPGRADE') - Number(b.matchType === 'UPGRADE') ||
    b.attributeScore - a.attributeScore ||
    a.leadTimeDays - b.leadTimeDays ||
    a.sku.localeCompare(b.sku);
}

function findCatalogAvailabilityMatches(part, originalDays, catalogIndex) {
  const cleanSku = cleanBaseSKU(part.sku);
  const original = catalogIndex.get(cleanSku);
  const description = original?.skuData?.Description || original?.skuData?.description || part.description || '';
  const originalAttrs = extractComponentAttributes(description, cleanSku, part.category);
  const matches = [];
  for (const [sku, item] of catalogIndex) {
    if (sku === cleanSku || !_isAvailableCatalogOption(item)) continue;
    if (/conditional/i.test(item.skuData.visibilityState || '') || item.skuData.selectorTriggerSku) continue;
    const supply = _catalogSupplyAttributes(item);
    if (supply.leadTimeDays === null || supply.leadTimeDays >= originalDays) continue;
    const candidateDesc = item.skuData.Description || item.skuData.description || '';
    const matchType = compareAvailabilityReplacement(description, originalAttrs, candidateDesc, sku);
    if (!matchType) continue;
    const attributeScore = scoreReplacementCandidate({ sku, description: candidateDesc }, originalAttrs, 0, description);
    if (attributeScore >= 0) matches.push({ sku, description: candidateDesc, ...supply, matchType, attributeScore });
  }
  return matches.sort(_compareAvailabilityMatches);
}

function _applyAvailabilityReplacement(part, replacement, originalDays, getPrice, substitutions) {
  const price = getPrice(replacement.sku);
  const priceKnown = typeof getPrice.hasPrice === 'function' ? getPrice.hasPrice(replacement.sku) : Number.isFinite(price);
  substitutions.push({
    originalSku: cleanBaseSKU(part.sku),
    originalDescription: part.description,
    originalLeadTimeDays: originalDays,
    replacementSku: replacement.sku,
    replacementDescription: replacement.description,
    replacementLeadTimeDays: replacement.leadTimeDays,
    quantity: part.quantity ?? 1,
    daysSaved: originalDays - replacement.leadTimeDays,
    matchType: replacement.matchType,
    attributeScore: replacement.attributeScore,
    priceDeltaUsd: priceKnown && part.priceKnown !== false && Number.isFinite(part.unitPriceUsd) ? price - part.unitPriceUsd : null
  });
  return {
    ...part,
    sku: replacement.sku,
    description: replacement.description,
    unitPriceUsd: priceKnown ? price : null,
    extendedPriceUsd: priceKnown ? price * (part.quantity ?? 1) : null,
    priceKnown,
    availability: replacement.availability,
    leadTime: replacement.leadTime,
    leadTimeDays: replacement.leadTimeDays,
    isFastShipSubstituted: true
  };
}

function _findOcpSlotACableInCatalog(catalogIndex, mandatory) {
  const prefSku = mandatory?.OCP_BOX12_CABLE?.sku ? cleanBaseSKU(mandatory.OCP_BOX12_CABLE.sku) : null;
  if (prefSku && catalogIndex.has(prefSku)) {
    const item = catalogIndex.get(prefSku);
    return { sku: prefSku, description: item.skuData?.Description || item.entry?.description || mandatory.OCP_BOX12_CABLE.name };
  }
  for (const [sku, item] of catalogIndex.entries()) {
    const d = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
    if (d.includes('rear ocp slota') && d.includes('controller cable')) return { sku, description: item.skuData?.Description || item.entry?.description };
  }
  return mandatory?.OCP_BOX12_CABLE?.sku
    ? { sku: cleanBaseSKU(mandatory.OCP_BOX12_CABLE.sku), description: mandatory.OCP_BOX12_CABLE.name }
    : null;
}

function _isPcieBackplaneSignalCablePart(part) {
  const s = cleanBaseSKU(part?.sku);
  const d = (part?.description || '').toLowerCase();
  return ['P72604-B21', 'P72602-B21', 'P76456-B21', 'P76453-B21', 'P48832-B21'].includes(s) ||
    (d.includes('pcie') && (d.includes('controller cable') || d.includes('ctrl cable') || d.includes('splitter cable')));
}

function _countOcp3Adapters(parts) {
  let count = 0;
  for (const p of parts) {
    const d = (p.description || '').toLowerCase();
    if (d.includes('cable') || d.includes('backplane') || d.includes('enablement')) continue;
    if (d.includes('ocp3') || d.includes('ocp 3') || /\b(mr|sr)\d{3}i-o\b/i.test(d)) count += (p.quantity || 1);
  }
  return count;
}

function _applyFastShipTopologyTransitions(candidateParts, substitutedItems, catalogIndex, chassisInfo, getPrice) {
  const hasPcieToOcpCtrl = substitutedItems.some(sub =>
    (/\b(mr|sr)\d{3}i-p\b/i.test(sub.originalDescription || '') || /\bp74775\b/i.test(sub.originalSku || '')) &&
    (/\b(mr|sr)\d{3}i-o\b/i.test(sub.replacementDescription || '') || /\bp58335\b/i.test(sub.replacementSku || ''))
  );
  if (!hasPcieToOcpCtrl) return [];

  const mandatory = getMandatorySkusForChassis(chassisInfo);
  const transitions = [];
  const ocpSignalCable = _findOcpSlotACableInCatalog(catalogIndex, mandatory);
  if (ocpSignalCable) {
    const idx = candidateParts.findIndex(_isPcieBackplaneSignalCablePart);
    if (idx !== -1) {
      const prev = candidateParts[idx];
      const sigPrice = getPrice(ocpSignalCable.sku);
      const qty = prev.quantity || 1;
      candidateParts[idx] = {
        ...prev,
        ...REPLACEMENT_SUPPLY_UNKNOWN,
        sku: ocpSignalCable.sku,
        description: ocpSignalCable.description,
        unitPriceUsd: sigPrice,
        extendedPriceUsd: sigPrice * qty,
        isFastShipTopologyCable: true
      };
      transitions.push({ action: 'REPLACE_SIGNAL_CABLE', fromSku: cleanBaseSKU(prev.sku), toSku: ocpSignalCable.sku, quantity: qty });
    }
  }

  const baseChassisQty = candidateParts.find(p => /configure-to-order|cto\s+server/i.test(p.description || ''))?.quantity || 1;
  const ocpPerNode = _countOcp3Adapters(candidateParts) / baseChassisQty;
  const hasSlotBCable = candidateParts.some(p => {
    const s = cleanBaseSKU(p.sku);
    const d = (p.description || '').toLowerCase();
    return s === cleanBaseSKU(mandatory?.CPU1_OCP_CABLE?.sku || 'P72203-B21') || (d.includes('cpu1') && d.includes('ocp') && d.includes('slotb'));
  });
  if (ocpPerNode >= 2 && !hasSlotBCable) {
    const slotBSku = cleanBaseSKU(mandatory?.CPU1_OCP_CABLE?.sku || 'P72203-B21');
    const slotBDesc = mandatory?.CPU1_OCP_CABLE?.name || catalogIndex.get(slotBSku)?.skuData?.Description || 'CPU1 to Rear OCP SlotB x8 Cable Kit';
    const slotBPrice = getPrice(slotBSku);
    candidateParts.push({
      sku: slotBSku,
      description: slotBDesc,
      quantity: baseChassisQty,
      unitPriceUsd: slotBPrice,
      extendedPriceUsd: slotBPrice * baseChassisQty,
      isFastShipTopologyCable: true,
      category: 'OCP Networking Enablement'
    });
    transitions.push({ action: 'ENABLE_OCP_SLOT_B', sku: slotBSku, quantity: baseChassisQty });
  }
  return transitions;
}

function _buildDeliveryScheduleSummary(baseline, candidate, deliveryDaysSaved, liveEdt) {
  const originalEdt = baseline.solutionEdtDays;
  const newEdt = candidate.solutionEdtDays;
  const componentEstimate = {
    originalMaxComponentDays: baseline.maxLeadTimeDays,
    fastShipMaxComponentDays: candidate.maxLeadTimeDays,
    complete: Number.isFinite(originalEdt) && Number.isFinite(newEdt),
    deliveryDaysSaved,
    scope: 'COMPONENT_ESTIMATE_ONLY',
    label: 'Longest known component lead times. Factory build and transit require a solution estimate.'
  };
  const fastShipRange = liveEdt?.fastShipRange || (Array.isArray(liveEdt?.candidateEdtDaysRange) ? `${liveEdt.candidateEdtDaysRange[0]}–${liveEdt.candidateEdtDaysRange[1]} days` : null);
  const baselineRange = liveEdt?.baselineRange || (Array.isArray(liveEdt?.baselineEdtDaysRange) ? `${liveEdt.baselineEdtDaysRange[0]}–${liveEdt.baselineEdtDaysRange[1]} days` : null);
  if (fastShipRange && baselineRange) {
    const startSaved = liveEdt.startWindowDaysSaved ?? liveEdt.daysSavedStart;
    const endSaved = liveEdt.endWindowDaysSaved ?? liveEdt.daysSavedEnd;
    return {
      componentEstimate,
      liveSolutionEdt: { ...liveEdt, fastShipRange, baselineRange, label: 'LIVE_HPE_OCA_SOLUTION_EDT' },
      deliveryImpact: `Live HPE OCA Solution EDT: ${fastShipRange} vs. ${baselineRange}` +
        (startSaved && endSaved ? ` (cuts start by ${startSaved}d and end by ${endSaved}d)` : '') +
        `. Longest known component estimate ${candidate.maxLeadTimeDays} vs. ${baseline.maxLeadTimeDays} days.`
    };
  }
  return {
    componentEstimate,
    liveSolutionEdt: null,
    deliveryImpact: deliveryDaysSaved === null
      ? `Some lead times are missing. The longest known component falls from ${baseline.maxLeadTimeDays} to ${candidate.maxLeadTimeDays} days.`
      : `The component lead-time estimate falls by ${deliveryDaysSaved} days, from ${originalEdt} to ${newEdt} days. Live OCA delivery confirmation is pending.`
  };
}

function _isProtectedCustomerFastShipPart(part, options = {}) {
  if (!_isHardwareSupplyItem(part) || part.quantityScope === 'global') return true;
  const preserve = new Set((options.preserveRoles || ['FC_HBA']).map(r => String(r).toUpperCase()));
  const d = (part.description || '').toLowerCase();
  const role = extractComponentAttributes(d, part.sku, (part.category || '').toLowerCase()).componentCategory;
  if (role === 'FC_HBA') return preserve.has(role) && !options.allowFcHbaSubstitution;
  return preserve.has(role) || /\b(?:cto|configure[\s-]to[\s-]order)\b/.test(d);
}

function _compareClosestAvailability(a, b) {
  return a.upgradeCount - b.upgradeCount ||
    Number(a.maxDays > AVAILABILITY_TARGET_DAYS) - Number(b.maxDays > AVAILABILITY_TARGET_DAYS) ||
    a.changeCount - b.changeCount || b.attributeScore - a.attributeScore || a.maxDays - b.maxDays;
}

function _compareFastestAvailability(a, b) {
  return a.maxDays - b.maxDays || _compareClosestAvailability(a, b);
}

function _availabilityPlan({ maxDays, choices }) {
  return {
    choices,
    maxDays,
    changeCount: choices.size,
    upgradeCount: [...choices.values()].filter(match => match.matchType === 'UPGRADE').length,
    attributeScore: [...choices.values()].reduce((sum, match) => sum + match.attributeScore, 0)
  };
}

function _planAvailabilityAtCeiling(pacing, ceiling, plans) {
  const required = pacing.filter(item => item.originalDays > ceiling);
  const eligible = required.map(item => item.matches.filter(match => match.leadTimeDays <= ceiling).slice(0, 3));
  if (!required.length || eligible.some(matches => matches.length === 0)) return;
  const firstChoices = new Map(required.map((item, i) => [item.sku, eligible[i][0]]));
  const add = choices => {
    const key = JSON.stringify([...choices].map(([sku, match]) => [sku, match.sku]));
    if (!plans.has(key)) plans.set(key, _availabilityPlan({ maxDays: ceiling, choices }));
  };
  add(firstChoices);
  for (const [i, item] of required.entries()) {
    for (const match of eligible[i].slice(1)) add(new Map(firstChoices).set(item.sku, match));
  }
}

function _findAvailabilityPlans(parts, originalMax, resolveSupply, catalogIndex, options) {
  const threshold = options.prioritizeFastShipAsRank2 ? 20 : AVAILABILITY_TARGET_DAYS;
  const pacingBySku = new Map();
  let untouchedMax = 0;
  for (const part of parts) {
    const days = _partSupplyAttributes(part, resolveSupply).leadTimeDays;
    if (days === null) continue;
    if (days <= threshold || _isProtectedCustomerFastShipPart(part, options)) {
      untouchedMax = Math.max(untouchedMax, days);
      continue;
    }
    const sku = cleanBaseSKU(part.sku);
    if (!pacingBySku.has(sku) || days > pacingBySku.get(sku).originalDays) pacingBySku.set(sku, { sku, part, originalDays: days });
  }
  const pacing = [...pacingBySku.values()];
  const ceilings = new Set(pacing.map(item => item.originalDays));
  for (const item of pacing) {
    item.matches = findCatalogAvailabilityMatches(item.part, item.originalDays, catalogIndex);
    for (const match of item.matches) ceilings.add(match.leadTimeDays);
  }
  const plans = new Map();
  for (const ceiling of [...ceilings, untouchedMax].sort((a, b) => a - b)) {
    if (ceiling >= untouchedMax && ceiling < originalMax) _planAvailabilityAtCeiling(pacing, ceiling, plans);
  }
  const closest = [...plans.values()].sort(_compareClosestAvailability);
  const fastest = [...plans.values()].sort(_compareFastestAvailability);
  return [...new Set(closest.slice(0, MAX_AVAILABILITY_VALIDATIONS / 2).flatMap((plan, i) => [plan, fastest[i]]))];
}

function _preservesAvailabilityPlan(before, after) {
  const quantities = parts => {
    const result = new Map();
    for (const part of parts) {
      const sku = cleanBaseSKU(part.sku);
      result.set(sku, (result.get(sku) || 0) + Number(part.quantity ?? 1));
    }
    return result;
  };
  const validated = quantities(after);
  return [...quantities(before)].every(([sku, count]) => (validated.get(sku) || 0) >= count);
}

function _validateAvailabilityPlan(plan, context) {
  const { parts, baseline, catalogIndex, chassisInfo, getPrice, revalidateCached, resolveSupply } = context;
  const substitutedItems = [];
  const candidateParts = parts.map(part => {
    const replacement = plan.choices.get(cleanBaseSKU(part.sku));
    if (!replacement || _isProtectedCustomerFastShipPart(part, context.options)) return { ...part };
    const originalDays = _partSupplyAttributes(part, resolveSupply).leadTimeDays;
    if (originalDays === null || originalDays <= replacement.leadTimeDays) return { ...part };
    return _applyAvailabilityReplacement(part, replacement, originalDays, getPrice, substitutedItems);
  });
  const topologyTransitions = _applyFastShipTopologyTransitions(candidateParts, substitutedItems, catalogIndex, chassisInfo, getPrice);
  const revalidated = revalidateCached(candidateParts);
  if (revalidated.physicalMathClean !== true || revalidated.aspectErrors?.length) return null;
  if (!_preservesAvailabilityPlan(candidateParts, revalidated.parts)) return null;
  const originalSkus = new Set(parts.map(part => cleanBaseSKU(part.sku)));
  if (revalidated.parts.filter(part => !originalSkus.has(cleanBaseSKU(part.sku))).some(part => !_isAvailableCatalogOption(catalogIndex.get(cleanBaseSKU(part.sku))))) return null;
  const newSupplyMetrics = calculateSupplyMetrics([...revalidated.parts, ...context.globalItems], resolveSupply);
  if (newSupplyMetrics.maxLeadTimeDays === null || newSupplyMetrics.maxLeadTimeDays >= baseline.maxLeadTimeDays) return null;
  const baselineUnknown = new Set(baseline.unknownLeadTimeSkus || []);
  if (newSupplyMetrics.unknownLeadTimeSkus.some(sku => !baselineUnknown.has(sku))) return null;
  return { ...plan, maxDays: newSupplyMetrics.maxLeadTimeDays, revalidated, newSupplyMetrics, topologyTransitions, substitutedItems };
}

function _resolveStrategyPortalStatus(options = {}) {
  const source = options?.liveClicValidation || options?.clicValidation || options?.clicStatusSummary || null;
  if (!source) return 'PORTAL VALIDATION PENDING';
  const isBomSummary = source === options?.clicStatusSummary;
  const unbuildables = Number(source.unbuildablesCount ?? source.unbuildables ?? source.unbuildableCount ?? 0);
  const errors = Number(source.errorsCount ?? source.errors ?? source.errorCount ?? 0);
  const processControl = Number(source.processControlCount ?? source.processControl ?? 0);
  const warnings = Number(source.warningsCount ?? source.warnings ?? source.warningCount ?? 0);
  if (isBomSummary && !source.portalValidatedFromBom && unbuildables === 0 && errors === 0 && processControl === 0) return 'PORTAL VALIDATION PENDING';
  if (unbuildables > 0 || errors > 0 || processControl > 0) return 'PORTAL_VALIDATION_FAILED';
  return warnings > 0 ? 'PORTAL_VALIDATED_WITH_WARNINGS' : 'PORTAL_VALIDATED';
}

function _buildAvailabilityCandidate(solution, baseline, preference, options) {
  const { revalidated, newSupplyMetrics, topologyTransitions, substitutedItems } = solution;
  const originalEdt = baseline.solutionEdtDays;
  const newEdt = newSupplyMetrics.solutionEdtDays;
  const deliveryDaysSaved = Number.isFinite(originalEdt) && Number.isFinite(newEdt) ? originalEdt - newEdt : null;
  const bomFingerprint = computeBomFingerprint(revalidated.parts);
  const liveEdt = options.liveSolutionEdt?.candidateBomFingerprint === bomFingerprint ? options.liveSolutionEdt : null;
  const liveClic = options.liveClicValidation?.bomFingerprint === bomFingerprint ? options.liveClicValidation : null;
  const scheduleInfo = _buildDeliveryScheduleSummary(baseline, newSupplyMetrics, deliveryDaysSaved, liveEdt);
  const clicStatus = _resolveStrategyPortalStatus({ liveClicValidation: liveClic });
  const title = preference === 'CLOSEST_MATCH' ? 'Closest Faster-Availability Match' : 'Fastest Catalog Availability';

  return {
    rank: '1S',
    subRank: '1S',
    validationStatus: clicStatus === 'PORTAL VALIDATION PENDING' ? 'DOCUMENT_AND_PORTAL_VALIDATION_PENDING' : clicStatus,
    portalValidationStatus: clicStatus,
    liveClicValidation: liveClic,
    requiresRequirementReview: true,
    availabilityPreference: preference,
    name: title,
    tierTitle: title,
    skuPartsList: revalidated.parts,
    bomFingerprint,
    estimatedCostUsd: revalidated.totalCost,
    budgetBreakdown: { baseBomCost: revalidated.totalCost, fixCost: 0, strategyAddonCost: 0, totalBudgetUsd: revalidated.totalCost },
    physicalMathClean: revalidated.physicalMathClean,
    isMathClean: revalidated.physicalMathClean,
    aspectErrors: revalidated.aspectErrors || [],
    injectedCascadingFixes: revalidated.injectedFixes || [],
    supplyMetrics: newSupplyMetrics,
    deliveryDaysSaved,
    originalEdtDays: originalEdt,
    fastShipEdtDays: newEdt,
    componentLeadTimeEstimate: scheduleInfo.componentEstimate,
    liveSolutionEdt: scheduleInfo.liveSolutionEdt,
    topologyTransitions,
    substitutedPacingItems: substitutedItems,
    tradeoffMetrics: {
      intentAlignment: 'Catalog-matched substitutions passed local checks. Customer requirements review pending.',
      deliveryImpact: scheduleInfo.deliveryImpact,
      skuModifications: `${substitutedItems.length} bottleneck substitution(s)${topologyTransitions.length ? `, ${topologyTransitions.length} topology cable update(s)` : ''}`
    },
    reasoning: `Pacing-item substitutions and dependent parts passed local configuration checks. ${scheduleInfo.deliveryImpact}`
  };
}

function synthesizeAvailabilityAlternatives(parts, baseline, catalog, chassisInfo, getPrice, revalidateCached, resolveSupply, options = {}) {
  const threshold = options.prioritizeFastShipAsRank2 ? 20 : AVAILABILITY_TARGET_DAYS;
  if (!Number.isFinite(baseline?.maxLeadTimeDays) || baseline.maxLeadTimeDays <= threshold) return [];
  const catalogIndex = buildCatalogSkuIndex(catalog);
  const supplyResolver = resolveSupply || (sku => _catalogSupplyAttributes(catalogIndex.get(cleanBaseSKU(sku))));
  const globalItems = options.availabilityGlobalItems || [];
  const plans = _findAvailabilityPlans([...parts, ...globalItems], baseline.maxLeadTimeDays, supplyResolver, catalogIndex, options);
  const context = { parts, baseline, catalogIndex, chassisInfo, getPrice, revalidateCached, resolveSupply: supplyResolver, options, globalItems };
  const validated = plans.map(plan => _validateAvailabilityPlan(plan, context)).filter(Boolean);
  if (!validated.length) return [];
  const closest = validated.sort(_compareClosestAvailability)[0];
  const fastest = validated.sort(_compareFastestAvailability)[0];
  const result = [_buildAvailabilityCandidate(closest, baseline, 'CLOSEST_MATCH', options)];
  if (fastest.maxDays < closest.maxDays) result.push(_buildAvailabilityCandidate(fastest, baseline, 'FASTEST', options));
  return result;
}

function synthesizeFastShipAlternative(parts, baseline, catalog, chassisInfo, getPrice, revalidateCached, resolveSupply, options = {}) {
  return synthesizeAvailabilityAlternatives(parts, baseline, catalog, chassisInfo, getPrice, revalidateCached, resolveSupply, options)[0] || null;
}

function _tryBudgetMemorySubstitution(parts, aspectCompute, getPrice) {
  const isSilverOrLowTdp = (aspectCompute.maxCpuTdpWatts && aspectCompute.maxCpuTdpWatts <= 165) ||
    parts.some(p => { const d = (p.description || '').toLowerCase(); return (d.includes('silver') || d.includes('4410') || d.includes('4510')) && (d.includes('processor') || d.includes('xeon')); });
  if (!isSilverOrLowTdp) return false;
  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const d = (p.description || '').toLowerCase();
    if ((d.includes('5600') || p.sku === 'P73300-B21' || p.sku === 'P64707-B21') && (d.includes('memory') || d.includes('rdimm'))) {
      const altSku = 'P43328-B21';
      const altPrice = getPrice(altSku);
      const curPrice = p.unitPriceUsd ?? getPrice(p.sku) ?? null;
      if (altPrice !== null && altPrice > 0 && curPrice !== null && altPrice < curPrice) {
        parts[i] = { ...p, ...REPLACEMENT_SUPPLY_UNKNOWN, sku: altSku, description: 'HPE 32GB 2Rx8 DDR5-4800 Smart Memory', unitPriceUsd: altPrice, extendedPriceUsd: altPrice * (p.quantity || 1), isStrategyAddon: true, category: 'Budget Optimized Memory' };
        changed = true;
      }
    }
  }
  return changed;
}

function _tryBudgetPowerSubstitution(parts, aspectPower, getPrice) {
  if ((aspectPower.estimatedNodeWattage || 350) >= 450 || (aspectPower.maxPsuWattage || 800) < 1600) return false;
  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const d = (p.description || '').toLowerCase();
    if ((d.includes('power supply') || d.includes('psu') || p.category === 'Power Supply') && (d.includes('1600w') || d.includes('1800w') || d.includes('2200w'))) {
      const altSku = 'P38995-B21';
      const altPrice = getPrice(altSku);
      const curPrice = p.unitPriceUsd ?? getPrice(p.sku) ?? null;
      if (altPrice !== null && altPrice > 0 && curPrice !== null && altPrice < curPrice) {
        parts[i] = { ...p, ...REPLACEMENT_SUPPLY_UNKNOWN, sku: altSku, description: 'HPE 800W Flex Slot Platinum Hot Plug Power Supply', unitPriceUsd: altPrice, extendedPriceUsd: altPrice * (p.quantity || 1), isStrategyAddon: true, category: 'Budget Optimized Power' };
        changed = true;
      }
    }
  }
  return changed;
}

function _tryBudgetThermalSubstitution(parts, aspectCompute, aspectPcie, getPrice) {
  const maxCpuTdp = aspectCompute.maxCpuTdpWatts || 0;
  if ((aspectPcie?.gpuCount || 0) > 0 || maxCpuTdp <= 0 || maxCpuTdp > 270) return false;
  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (String(p.sku || '').trim().toUpperCase().startsWith('P74794-B21') || (p.description || '').toLowerCase().includes('max performance heat sink')) {
      const altSku = 'P74792-B21';
      const altPrice = getPrice(altSku);
      const unitPriceUsd = (altPrice !== null && altPrice > 0) ? altPrice : null;
      const extendedPriceUsd = unitPriceUsd !== null ? unitPriceUsd * (p.quantity || 1) : null;
      parts[i] = { ...p, ...REPLACEMENT_SUPPLY_UNKNOWN, sku: altSku, description: 'HPE ProLiant Compute DL380 Gen12 2U High Performance Heat Sink Kit', unitPriceUsd, extendedPriceUsd, isStrategyAddon: true, category: 'Budget Optimized Thermal' };
      changed = true;
    }
  }
  return changed;
}

const CERTIFIED_STORAGE_DOWNTIER_MAP = {
  '800GB_MU_BC': { sku: 'P40542-B21', desc: 'HPE 960GB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 960, refPrice: 320.0 },
  '960GB_MU_BC': { sku: 'P40542-B21', desc: 'HPE 960GB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 960, refPrice: 320.0 },
  '1.6TB_MU_BC': { sku: 'P40543-B21', desc: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 1920, refPrice: 450.0 },
  '1.92TB_MU_BC': { sku: 'P40543-B21', desc: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 1920, refPrice: 450.0 },
  '3.2TB_MU_BC': { sku: 'P40544-B21', desc: 'HPE 3.84TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 3840, refPrice: 850.0 },
  '3.84TB_MU_BC': { sku: 'P40544-B21', desc: 'HPE 3.84TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 3840, refPrice: 850.0 },
  '6.4TB_MU_BC': { sku: 'P40545-B21', desc: 'HPE 7.68TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 7680, refPrice: 1600.0 },
  '7.68TB_MU_BC': { sku: 'P40545-B21', desc: 'HPE 7.68TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 7680, refPrice: 1600.0 }
};

function _isWriteIntensiveStorageWorkload(dna, parts) {
  const rx = /\b(write intensive|write-intensive|db logging|transaction log|write-heavy|wal|redo log|sap hana|hana|oltp|redis|aof|cassandra|commitlog|commit log|kafka|journal)\b/i;
  return dna?.storageWorkload === 'WRITE_INTENSIVE' || dna?.isWriteIntensive === true ||
    rx.test((dna?.workloadDescription || '').replace(/_/g, ' ')) ||
    rx.test((dna?.primaryWorkload || '').replace(/_/g, ' ')) ||
    parts.some(p => rx.test((p.description || '').replace(/_/g, ' ')));
}

function _isCandidateMixedUseNvme(p) {
  const desc = (p.description || '').toLowerCase();
  if (desc.includes('controller') || desc.includes('cable') || desc.includes('cage') || desc.includes('backplane') || desc.includes('battery') || desc.includes('blank')) return false;
  const isNvme = desc.includes('nvme');
  const isMixedUse = desc.includes('mixed use') || desc.includes(' mu ') || desc.includes(' mu') || /\bmu\b/i.test(desc) || desc.includes('high performance');
  return isNvme && isMixedUse && !desc.includes('read intensive') && !desc.includes(' ri ') && !desc.includes(' ri');
}

function _resolveCatalogDesc(item) {
  return String(item?.skuData?.Description || item?.entry?.description || item?.description || '');
}

function _resolveCatalogPrice(candSku, item, safeGetPrice) {
  const resolved = safeGetPrice(candSku);
  if (resolved !== null && resolved > 0) return resolved;
  const raw = [item?.unitPriceUsd, item?.listPrice, item?.entry?.unitPriceUsd, item?.entry?.listPrice, item?.skuData?.['GPL ($)'], item?.skuData?.listPrice]
    .map(Number)
    .find(v => Number.isFinite(v) && v > 0);
  return raw ?? null;
}

function _extractCatalogReplacementCandidate(candSku, item, origCapGb, isBc, curPrice, safeGetPrice) {
  const isMockEntry = Boolean(item && !item.skuData && (item.description || item.entry?.description));
  if (!isMockEntry && !isActiveCatalogOption(item)) return null;
  const desc = _resolveCatalogDesc(item);
  const cDesc = desc.toLowerCase();
  if (!cDesc.includes('ssd') || !cDesc.includes('nvme') || !cDesc.includes('read intensive')) return null;
  if (isBc && !cDesc.includes(' bc') && !cDesc.includes('basic carrier')) return null;

  const cTb = cDesc.match(/(\d+(?:\.\d+)?)\s*tb/i);
  const cGb = cDesc.match(/(\d+)\s*gb/i);
  const candCapGb = cTb ? Math.round(parseFloat(cTb[1]) * 1000) : (cGb ? parseInt(cGb[1], 10) : 0);
  if (candCapGb < origCapGb || candCapGb > Math.round(origCapGb * 1.5)) return null;

  const candPrice = _resolveCatalogPrice(candSku, item, safeGetPrice);
  if (candPrice === null || candPrice >= curPrice) return null;
  return { sku: candSku, desc, price: candPrice };
}

function _findCatalogStorageReplacement(catIndex, origCapGb, isBc, curPrice, safeGetPrice) {
  if (!catIndex) return null;
  for (const [candSku, item] of catIndex.entries()) {
    const match = _extractCatalogReplacementCandidate(candSku, item, origCapGb, isBc, curPrice, safeGetPrice);
    if (match) return match;
  }
  return null;
}

function _findFallbackStorageReplacement(origCapGb, curPrice, safeGetPrice) {
  const key = origCapGb <= 960 ? '800GB_MU_BC' : (origCapGb <= 1920 ? '1.6TB_MU_BC' : (origCapGb <= 3840 ? '3.2TB_MU_BC' : '6.4TB_MU_BC'));
  const mapping = CERTIFIED_STORAGE_DOWNTIER_MAP[key];
  if (!mapping) return null;
  const candPrice = safeGetPrice(mapping.sku);
  return (candPrice !== null && candPrice > 0 && candPrice < curPrice) ? { sku: mapping.sku, desc: mapping.desc, price: candPrice } : null;
}

function _tryBudgetStorageSubstitution(parts, workloadDna, loadedCatalog, getPrice) {
  if (!Array.isArray(parts) || parts.length === 0) return false;
  const safeGetPrice = typeof getPrice === 'function' ? getPrice : () => null;
  const dna = workloadDna || extractWorkloadDna(parts);
  if (_isWriteIntensiveStorageWorkload(dna, parts)) return false;

  let changed = false;
  const catIndex = loadedCatalog ? buildCatalogSkuIndex(loadedCatalog) : null;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!_isCandidateMixedUseNvme(p)) continue;
    const desc = (p.description || '').toLowerCase();
    const tbMatch = desc.match(/(\d+(?:\.\d+)?)\s*tb/i);
    const gbMatch = desc.match(/(\d+)\s*gb/i);
    const origCapGb = tbMatch ? Math.round(parseFloat(tbMatch[1]) * 1000) : (gbMatch ? parseInt(gbMatch[1], 10) : 1920);
    const isBc = desc.includes(' bc') || desc.includes('basic carrier') || !desc.includes(' sc');
    const curPrice = p.unitPriceUsd || safeGetPrice(p.sku) || 999999;

    let replacement = _findCatalogStorageReplacement(catIndex, origCapGb, isBc, curPrice, safeGetPrice);
    if (!replacement) replacement = _findFallbackStorageReplacement(origCapGb, p.unitPriceUsd || safeGetPrice(p.sku) || (850 * 1.6), safeGetPrice);
    if (replacement && cleanBaseSKU(replacement.sku) !== cleanBaseSKU(p.sku)) {
      parts[i] = { ...p, ...REPLACEMENT_SUPPLY_UNKNOWN, sku: replacement.sku, description: replacement.desc, unitPriceUsd: replacement.price, extendedPriceUsd: replacement.price * (p.quantity || 1), isStrategyAddon: true, category: 'Budget Optimized Storage' };
      changed = true;
    }
  }
  return changed;
}

function synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached, options = {}) {
  const parts = v1.parts.map(p => ({ ...p }));
  const aspectCompute = evalResults.evalSummary?.compute || evalResults.aspects?.compute || {};
  const aspectPower = evalResults.evalSummary?.power || evalResults.aspects?.power || {};
  const aspectPcie = evalResults.evalSummary?.pcie || evalResults.aspects?.pcie || {};
  const workloadDna = evalResults.workloadDna || evalResults.dna || options.dna || extractWorkloadDna(parts);

  const mChanged = _tryBudgetMemorySubstitution(parts, aspectCompute, getPrice);
  const pChanged = _tryBudgetPowerSubstitution(parts, aspectPower, getPrice);
  const tChanged = _tryBudgetThermalSubstitution(parts, aspectCompute, aspectPcie, getPrice);
  const sChanged = _tryBudgetStorageSubstitution(parts, workloadDna, loadedCatalog, getPrice);

  if (mChanged || pChanged || tChanged || sChanged) {
    const reval = revalidateCached(parts);
    const mathAcceptable = reval.physicalMathClean === true;
    if (mathAcceptable && reval.totalCost < v1.totalCost) {
      return { parts: reval.parts, totalCost: reval.totalCost, injectedFixes: reval.injectedFixes, physicalMathClean: reval.physicalMathClean, aspectErrors: reval.aspectErrors, isAlternativeAvailable: true, deltaUsd: v1.totalCost - reval.totalCost };
    }
  }

  return {
    parts: v1.parts.map(p => ({ ...p, category: p.isFixInjected ? 'Aspect Rule Fix' : 'Minimal CapEx Baseline' })),
    totalCost: v1.totalCost,
    injectedFixes: v1.injectedFixes,
    physicalMathClean: v1.physicalMathClean,
    aspectErrors: v1.aspectErrors,
    isAlternativeAvailable: false,
    deltaUsd: 0
  };
}

module.exports = {
  CERTIFIED_STORAGE_DOWNTIER_MAP,
  findCatalogAvailabilityMatches,
  synthesizeAvailabilityAlternatives,
  synthesizeFastShipAlternative,
  _tryBudgetStorageSubstitution,
  synthesizeBudgetMinimizationCandidate
};
