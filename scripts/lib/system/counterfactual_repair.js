'use strict';
/** Catalog-scoped repair hypotheses. No proposal certifies a changed candidate. */
const fs = require('fs');
const path = require('path');
const { cleanBaseSKU } = require('../catalog/sku');
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

function _loadCatalogFromDisk(options, result, platform) {
  try {
    const rawDir = options.chassisDir || result.chassisDir || '';
    let dir = rawDir;
    if (!dir && platform) {
      const { resolveChassisDirectory } = require('../catalog/sku_versioning');
      dir = resolveChassisDirectory(platform);
    }
    if (!dir || !fs.existsSync(dir) || /history|tests[\\/]fixtures/i.test(dir)) return null;
    const baseName = path.basename(dir);
    const catFile = path.join(dir, `${baseName}_Catalog.json`);
    if (fs.existsSync(catFile)) {
      return JSON.parse(fs.readFileSync(catFile, 'utf8'));
    }
  } catch (_) {}
  return null;
}

function catalogScope(result, options) {
  let catalog = options.catalogData || result.catalogData;
  const platform = result.chassis || options.chassisName || options.platform || options.chassis;
  if (!catalog && platform) {
    catalog = _loadCatalogFromDisk(options, result, platform);
  }
  const identities = [catalog?.metadata?.model, catalog?.metadata?.chassis].filter(Boolean);
  if (!platform || !identities.some(id => normalize(id) === normalize(platform))) return { rows: [], platform: platform || null };
  const rows = [];
  for (const entry of catalog.entries || []) {
    for (const row of entry.skus || []) {
      const sku = cleanBaseSKU(row.sku || row['Product #']);
      if (!sku || /obsolete|discontinued|removed|end.of.life/i.test(String(row.lifecycleStatus || row['Lifecycle Status'] || ''))) continue;
      rows.push({ ...row, sku, description: row.description || row.Description || '',
        category: `${entry.parentCategory || ''} ${entry.subCategory || ''}`.trim() });
    }
  }
  return { rows, platform, catalogMetadata: catalog.metadata };
}

function unresolved(issueType, detail, category = 'HARDWARE_SELECTION') {
  return { issueType, rootCause: detail, requiredHardwareDeltas: [],
    requiredAction: { action: 'RESOLVE_SCOPED_CONSTRAINT', category },
    mathematicalProof: detail, resultingStatus: 'ACTION_REQUIRED' };
}

function proposal(issueType, detail, candidates, quantity, action, scope) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || candidates.length !== 1) {
    return { ...unresolved(issueType, detail), candidateSkus: [...new Set(candidates.map(row => row.sku))] };
  }
  const row = candidates[0];
  return { issueType, rootCause: detail,
    requiredHardwareDeltas: [{ action, sku: row.sku, description: row.description, quantity }],
    provenance: { platform: scope.platform, catalogBuiltAt: scope.catalogMetadata?.builtAt || null },
    mathematicalProof: `${detail} Catalog candidate only; full physical, topology, customer-intent and portal validation remain required.`,
    resultingStatus: 'PROPOSED_UNVALIDATED' };
}

function matching(scope, pattern) {
  const bySku = new Map();
  for (const row of scope.rows) if (pattern.test(`${row.category} ${row.description}`)) bySku.set(row.sku, row);
  return [...bySku.values()];
}

function _filterPsuCandidates(candidates, power) {
  const descRaw = String(power.installedPsuType || power.installedPsuDescription || power.description || '');
  const isDcRequested = /dc|-48v/i.test(descRaw);
  const isTitaniumRequested = /titanium/i.test(descRaw);
  return candidates.filter(row => {
    const desc = row.description.toLowerCase();
    const isDc = desc.includes('-48vdc') || desc.includes('dc power');
    if (isDcRequested && !isDc) return false;
    if (!isDcRequested && isDc) return false;
    return true;
  }).sort((a, b) => {
    if (isTitaniumRequested) {
      const aTit = a.description.toLowerCase().includes('titanium');
      const bTit = b.description.toLowerCase().includes('titanium');
      if (aTit !== bTit) return aTit ? -1 : 1;
    }
    return a.watts - b.watts || a.sku.localeCompare(b.sku);
  });
}

function powerRepair(power, scope, count, errors, proofs) {
  const missing = power.hasZeroPsus || power.psuCount === 0 && !power.hasIntegratedPower;
  if (!missing && !power.hasPsuWattageDeficit && !power.hasPsuHeadroomDeficit && !errors.some(e => /psu.*wattage|power.*headroom/i.test(e))) return;
  const type = missing ? 'POWER_PSU_MISSING' : 'POWER_WATTAGE_DEFICIT';
  const required = positive(power.requiredWattageWithHeadroom) ? power.requiredWattageWithHeadroom :
    positive(power.estimatedNodeWattage) ? Math.ceil(power.estimatedNodeWattage * 1.2) : null;
  if (!required) { proofs.push(unresolved(type, 'Node power requirement is unknown.')); return; }
  const allCandidates = matching(scope, /power suppl/i).map(row => ({ ...row,
    watts: Number(row.wattage || row.watts || row.description.match(/\b(\d+)\s*W\b/i)?.[1])
  })).filter(row => positive(row.watts));
  if (!allCandidates.length) { proofs.push(unresolved(type, `No rated PSU candidate in the exact product catalog for ${required}W.`)); return; }
  const candidates = _filterPsuCandidates(allCandidates, power);
  const feasible = candidates.filter(row => row.watts >= required);
  if (!feasible.length) {
    const max = candidates.length > 0 ? Math.max(...candidates.map(row => row.watts)) : Math.max(...allCandidates.map(row => row.watts));
    proofs.push({ ...unresolved(type, `${max}W >= ${required}W fails; ${required - max}W deficit remains in available catalog candidates.`), resultingStatus: 'REPAIR_INFEASIBLE' });
    return;
  }
  const target = feasible[0];
  const quantity = missing ? (Number.isSafeInteger(count) && count > 0 ? count * 2 : null) : power.psuCount;
  proofs.push(proposal(type, `${target.watts}W >= ${required}W for the proposed 1+1 power topology.`, [target], quantity, missing ? 'ADD' : 'SUBSTITUTE', scope));
}

function thermalRepairs(compute, scope, count, errors, proofs) {
  const cpus = compute.cpuCount;
  const tdp = compute.maxCpuTdpWatts;
  if (compute.needsHeatsink || errors.some(e => /heat\s*sink/i.test(e))) {
    const candidates = matching(scope, /heat\s*sink/i).filter(row => positive(row.thermalRatingWatts) && positive(tdp) && row.thermalRatingWatts >= tdp && positive(row.socketsPerKit));
    proofs.push(proposal('THERMAL_HEATSINK_MISSING', `Cooling must cover ${cpus ?? 'unknown'} sockets at ${tdp ?? 'unknown'}W/socket; rating and kit packaging require explicit catalog evidence.`, candidates,
      candidates.length === 1 && positive(cpus) ? Math.ceil(cpus / candidates[0].socketsPerKit) : null, 'ADD', scope));
  }
  if (compute.needsDirectLiquidCooling) proofs.push(unresolved('THERMAL_DLC_MANDATED', 'Validate the complete liquid cooling loop and facility dependencies against scoped thermal rules.'));
  if (compute.fanKitUnderPopulated || compute.hasHighPerfFans === false && positive(tdp) && errors.some(e => /fan/i.test(e))) {
    proofs.push(proposal('THERMAL_FANS_UNDERPOPULATED', 'Fan population and packaging require the exact product thermal rule.', [], count, 'ADD', scope));
  }
}

function memoryRepair(memory, scope, errors, proofs) {
  const missing = memory.needsMemory || memory.hasZeroMemory;
  const invalid = memory.isInvalidChannelConfiguration || memory.isBalancedChannel === false || errors.some(e => /unbalanced.*memory/i.test(e));
  if (!missing && !invalid) return;
  const type = missing ? 'MEMORY_MISSING' : 'MEMORY_UNBALANCED_CHANNELS';
  const cpus = memory.cpuCount;
  const channels = memory.channelWidth;
  const current = missing ? 0 : memory.memoryCount;
  if (![cpus, channels].every(n => Number.isSafeInteger(n) && n > 0) || !Number.isSafeInteger(current) || current < 0) {
    proofs.push(unresolved(type, 'CPU/channel counts and current DIMM population must be known.')); return;
  }
  const total = cpus * channels;
  const delta = Math.max(total, Math.ceil(current / total) * total) - current;
  const sample = cleanBaseSKU(memory.memoryItems?.[0]?.sku);
  const candidates = scope.rows.filter(row => row.sku === sample);
  proofs.push(proposal(type, `${current} DIMMs across ${total} channels; proposed increment ${delta}. Population rules and customer capacity limits require validation.`, candidates, delta, 'ADD', scope));
}

function otherRepairs(aspects, errors, proofs) {
  const { storage, pcie, selfCorrectionTrail } = aspects;
  const checks = [
    ['STORAGE_CABLE_KIT_MISSING', storage.needsCableKit, /storage.*splitter|cable kit.*controller/i],
    ['STORAGE_BATTERY_MISSING', storage.hasSmartBattery === false && storage.hasStorageController, /smart storage battery/i],
    ['GPU_POWER_CABLE_MISSING', pcie.needsGpuPowerCableKit, /gpu.*power cable|gpu.*aux/i],
    ['PCIE_SLOT_CAPACITY', pcie.isExceedingActiveSlots || pcie.needsPrimaryRiser || pcie.needsSecondaryRiser || pcie.needsPrimaryCableKit || pcie.needsSecondaryCableKit, /pcie slot|riser.*missing/i],
    ['CONTESTED_RESOURCE_COLLISION', selfCorrectionTrail.some(t => t.status !== 'RESOLVED' && /OCP/i.test(t.contestedResourceType || '')), /ocp.*collision|contested.*ocp/i]
  ];
  for (const [type, condition, pattern] of checks) if (condition || errors.some(e => pattern.test(e))) {
    proofs.push(unresolved(type, 'Resolve using exact product enablement rules, customer requirements and owning component; no generic part substitution is authorized.'));
  }
}

function supportRepair(support, scope, count, requirements, errors, proofs) {
  if (support.hasSupportService !== false && !support.needsSupportService && !errors.some(e => /tech care|pointnext.*support/i.test(e))) return;
  const level = String(requirements.supportSla || requirements.serviceLevel || requirements.supportLevel || 'Basic');
  const years = requirements.supportYears ?? 3;
  const candidates = matching(scope, /tech care/i).filter(row => {
    const desc = row.description.toLowerCase();
    return desc.includes(level.toLowerCase()) && Number(desc.match(/\b(\d+)\s*(?:year|yr)\b/i)?.[1]) === years;
  });
  proofs.push(proposal('SUPPORT_SERVICE_MISSING', `Select product-qualified ${years}-year ${level} support for each owning component.`, candidates, count, 'ADD', scope));
}

function blockerProposal(blocker, index) {
  const b = typeof blocker === 'string' ? { detail: blocker } : blocker || {};
  const detail = String(b.detail || b.name || b.id || 'Unspecified acceptance blocker');
  const id = String(b.id || `UNIDENTIFIED_${index + 1}`);
  const category = /GROUNDING|NOTEBOOKLM|CITATION|RECEIPT|PORTAL|CLIC|FRESHNESS|STALE/i.test(`${id} ${detail}`) ? 'EVIDENCE_DEFICIT' :
    /BUDGET|CUSTOMER_CONSTRAINT|MUTUALLY_EXCLUSIVE_SPEC/i.test(id) ? 'CUSTOMER_REQUIREMENT_CONFLICT' : 'GENERAL_BLOCKER';
  const result = unresolved(`BLOCKER_${id}_${index + 1}`, detail, category);
  result.blockerId = b.id || null;
  if (category === 'EVIDENCE_DEFICIT') {
    result.requiredEvidenceAction = { action: 'RESOLVE_EVIDENCE_CONTRACT', target: id };
    result.resultingStatus = 'ACTION_REQUIRED_EVIDENCE_PROBE';
  }
  // Prose mentions never authorize ADD/REMOVE, quantities, or substitutions.
  return result;
}

function generateCounterfactualRepairProofs(evalResults = {}, options = {}) {
  const result = evalResults || {};
  const opts = options || {};
  const summary = result.evalSummary || result;
  const errors = (result.errors || result.evaluation?.errors || []).map(e => typeof e === 'string' ? e : JSON.stringify(e));
  const scope = catalogScope(result, opts);
  const rawCount = opts.serverCount ?? result.serverCount ?? 1;
  const count = Number.isSafeInteger(rawCount) && rawCount > 0 ? rawCount : NaN;
  const proofs = [];
  powerRepair(summary.power || {}, scope, count, errors, proofs);
  thermalRepairs(summary.compute || {}, scope, count, errors, proofs);
  memoryRepair(summary.memory || {}, scope, errors, proofs);
  otherRepairs({ storage: summary.storage || {}, pcie: summary.pcie || {}, support: summary.support || {}, selfCorrectionTrail: result.selfCorrectionTrail || [] }, errors, proofs);
  supportRepair(summary.support || {}, scope, count, opts.customerRequirements || result.customerRequirements || {}, errors, proofs);
  const acceptance = result.acceptanceGate || {};
  const blockers = Array.isArray(acceptance.blockers) ? acceptance.blockers : [];
  blockers.forEach((b, i) => proofs.push(blockerProposal(b, i)));
  if (acceptance.blockersCount > blockers.length) proofs.push(unresolved('BLOCKER_DETAILS_MISSING', `${acceptance.blockersCount - blockers.length} acceptance blocker details are missing.`, 'GENERAL_BLOCKER'));
  return proofs;
}
module.exports = { generateCounterfactualRepairProofs };
