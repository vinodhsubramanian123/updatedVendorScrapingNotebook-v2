'use strict';
/**
 * scripts/lib/conflict/least_delta/catalog_alternative_finder.js
 *
 * Extracted from least_delta_combinator.js:
 * Ambient visibility inspection, chassis dual fallbacks, catalog-backed controller
 * / memory / generational CPU upgrade finders.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, classifyLifecycleState } = require('../../catalog/sku.js');
const logger = require('../../system/pipeline_logger.js');

function isSkuVisibleAtDefaultAmbient(sku, catalogDir) {
  if (!sku || !catalogDir) return { isVisible: true, conditionType: null, thresholdDegC: null };

  try {
    const cleanSku = cleanBaseSKU(sku);
    const conditionalSkusPath = path.join(catalogDir, 'raw_data', 'conditional_skus.json');
    if (fs.existsSync(conditionalSkusPath)) {
      const conditionalData = JSON.parse(fs.readFileSync(conditionalSkusPath, 'utf-8'));
      const match = (conditionalData.skus || []).find(s => cleanBaseSKU(s.sku) === cleanSku);
      if (match) {
        return {
          isVisible: false,
          conditionType: match.conditionType || 'AMBIENT_GATE',
          thresholdDegC: match.thresholdDegC || null,
          operator: match.operator || 'lte',
          evidence: match.evidence || 'Conditional SKU — hidden at default portal ambient temperature'
        };
      }
    }

    if (fs.existsSync(catalogDir)) {
      const files = fs.readdirSync(catalogDir);
      const rulesFile = files.find(f => f.endsWith('Catalog_Rules.json'));
      if (rulesFile) {
        const rulesData = JSON.parse(fs.readFileSync(path.join(catalogDir, rulesFile), 'utf-8'));
        const condRule = (rulesData.rules || []).find(r =>
          (r.ruleType === 'CONDITIONAL_VISIBILITY' || r.conditionType === 'AMBIENT_GATE' || r.conditionType === 'TDP_GATE') &&
          (r.affectedSkus || []).some(s => cleanBaseSKU(s) === cleanSku)
        );
        if (condRule) {
          return {
            isVisible: false,
            conditionType: condRule.conditionType || 'AMBIENT_GATE',
            thresholdDegC: condRule.thresholdValue || null,
            operator: condRule.conditionOperator || 'lte',
            evidence: condRule.rule || 'Conditional SKU — gated behind portal condition'
          };
        }
      }
    }

    return { isVisible: true, conditionType: null, thresholdDegC: null };
  } catch (err) {
    logger.warn('LEAST_DELTA', `Failed to inspect portal visibility for ${sku}: ${err.message}`);
    return { isVisible: false, conditionType: 'VISIBILITY_CHECK_ERROR', thresholdDegC: null, error: err.message };
  }
}

let cachedChassisMap = null;
function getChassisMap() {
  if (!cachedChassisMap) {
    try {
      const chassisMapPath = path.resolve(__dirname, '../../../config/chassis_map.json');
      if (fs.existsSync(chassisMapPath)) {
        cachedChassisMap = JSON.parse(fs.readFileSync(chassisMapPath, 'utf8'));
      }
    } catch (err) {
      logger.warn('LEAST_DELTA', `Failed loading chassis_map.json: ${err.message}`);
      cachedChassisMap = {};
    }
  }
  return cachedChassisMap || {};
}

function _selectBestVisibleCandidate(cands, catalogDir) {
  if (!cands || cands.length === 0) return null;
  const visible = cands.find(c => isSkuVisibleAtDefaultAmbient(c.sku, catalogDir).isVisible);
  return visible || cands[0];
}

function _isDl360Family(chassisInfo) {
  const txt = `${chassisInfo?.model || ''} ${chassisInfo?.chassis || ''} ${chassisInfo?.id || ''}`.toLowerCase();
  return txt.includes('dl360');
}

function _resolveContestedPcieFallback(duals, isGen12, chassisInfo) {
  const pcieAlt = duals.pcie;
  if (pcieAlt?.sku) return { sku: pcieAlt.sku, description: pcieAlt.description };
  if (_isDl360Family(chassisInfo)) {
    return isGen12
      ? { sku: 'P74775-B21', description: 'HPE MR408i-p Gen11 x8 Lanes 4GB Cache PCI SPDM Plug-in Storage Controller' }
      : { sku: 'P47777-B21', description: 'HPE MR416i-p x16 Lanes 8GB Cache PCIe Storage Controller' };
  }
  return {
    sku: isGen12 ? 'P75750-B21' : 'P47777-B21',
    description: 'HPE MR416i-p x16 Lanes 8GB Cache PCIe Storage Controller'
  };
}

function _findFallbackAlternative(roleType, constraints, duals, isGen12, chassisInfo) {
  const { getMandatorySkusForChassis } = require('../../catalog/catalog_rules.js');
  const mandatory = getMandatorySkusForChassis(chassisInfo || {});
  if (roleType === 'STORAGE_EXPANDER_CASCADE') {
    const expCtrl = mandatory.HIGH_PORT_CONTROLLER;
    return expCtrl?.sku
      ? { sku: expCtrl.sku, description: expCtrl.name }
      : { sku: 'P55415-B21', description: 'HPE Broadcom MR416i-o x16 Lanes 8GB Cache Tri-Mode Storage Controller' };
  }
  if (roleType === 'CONTESTED_OCP_SLOT_COLLISION') {
    if (duals?.pcie?.sku) return { sku: duals.pcie.sku, description: duals.pcie.description };
    const pcieCtrl = mandatory.PCIE_STORAGE_CONTROLLER;
    if (pcieCtrl?.sku) return { sku: pcieCtrl.sku, description: pcieCtrl.name };
    return _resolveContestedPcieFallback(duals, isGen12, chassisInfo);
  }
  if (roleType === 'MEMORY_BUS_SPEED_BOTTLENECK') {
    const targetCapacity = constraints.targetCapacityGb || 32;
    const mem64 = mandatory.DDR5_64GB;
    const mem32 = mandatory.DDR5_32GB;
    return targetCapacity >= 64
      ? { sku: mem64?.sku || 'P43331-B21', description: mem64?.name || 'HPE 64GB 2Rx4 DDR5-4800 Registered Smart Memory Kit' }
      : { sku: mem32?.sku || 'P43328-B21', description: mem32?.name || 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' };
  }
  return null;
}

function isActiveCatalogOption(item) {
  if (!item) return true;
  const lc = classifyLifecycleState(
    item.lifecycleStatus || item.skuData?.['Lifecycle Status'] || item.entry?.lifecycleStatus || '',
    item.diffStatus || '',
    item.sku || item.skuData?.['Product #'] || '',
    item.skuData?.Description || item.entry?.description,
    item.skuData?.vendorSupplyStatus
  );
  return !lc.isBlockedForProduction && !lc.isDirectShip && !lc.isConstrainedSupply;
}

function _findStorageExpanderAlternative(skuIndex, catalogDir) {
  const candidates = [];
  for (const [sku, item] of skuIndex.entries()) {
    if (!isActiveCatalogOption(item)) continue;
    const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
    if ((desc.includes('controller') || desc.includes('raid')) &&
        (desc.includes('16-port') || desc.includes('x16') || desc.includes('416i')) &&
        desc.includes('tri-mode')) {
      candidates.push({
        sku,
        description: item.skuData?.Description || item.entry?.description || '16-Port Tri-Mode Storage Controller'
      });
    }
  }
  const chosen = _selectBestVisibleCandidate(candidates, catalogDir);
  return chosen || {
    sku: 'P55415-B21',
    description: 'HPE Broadcom MR416i-o x16 Lanes 8GB Cache Tri-Mode Storage Controller'
  };
}

function _findContestedOcpSlotAlternative(skuIndex, catalogDir, duals, isGen12, chassisInfo) {
  const candidates = [];
  for (const [sku, item] of skuIndex.entries()) {
    if (!isActiveCatalogOption(item)) continue;
    const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
    if ((desc.includes('controller') || desc.includes('raid')) &&
        (desc.includes('pcie') || desc.includes('-p') || desc.includes('416i-p') || desc.includes('216i-p')) &&
        !desc.includes('-o') && !desc.includes('ocp')) {
      candidates.push({
        sku,
        description: item.skuData?.Description || item.entry?.description || 'PCIe Standup Storage Controller'
      });
    }
  }
  const chosen = _selectBestVisibleCandidate(candidates, catalogDir);
  if (chosen) return chosen;
  return _resolveContestedPcieFallback(duals, isGen12, chassisInfo);
}

function _findMemoryBusSpeedAlternative(skuIndex, catalogDir, constraints) {
  const targetCapacity = constraints.targetCapacityGb || 32;
  const candidates = [];
  for (const [sku, item] of skuIndex.entries()) {
    if (!isActiveCatalogOption(item)) continue;
    const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
    if ((desc.includes('memory') || desc.includes('dimm') || desc.includes('smart memory')) &&
        desc.includes('4800') &&
        desc.includes(`${targetCapacity}gb`)) {
      candidates.push({
        sku,
        description: item.skuData?.Description || item.entry?.description || `HPE ${targetCapacity}GB DDR5-4800 Registered Smart Memory Kit`
      });
    }
  }
  const chosen = _selectBestVisibleCandidate(candidates, catalogDir);
  if (chosen) return chosen;
  return targetCapacity >= 64
    ? { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 DDR5-4800 Registered Smart Memory Kit' }
    : { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' };
}

function findBestAlternativeInCatalog(roleType, currentSku, constraints = {}, catalogData = null, chassisInfo = {}) {
  const { buildCatalogSkuIndex } = require('../../catalog/sku.js');
  if (roleType === 'GENERATIONAL_CPU_OBSOLESCENCE') {
    return findGenerationalCpuUpgrade(currentSku, constraints.originalDesc || '', catalogData, chassisInfo);
  }
  if (roleType === 'GENERATIONAL_MEMORY_COUPLING') {
    return findDdr5_5600MemoryUpgrade(currentSku, constraints.originalDesc || '', catalogData, chassisInfo, constraints.isCto !== false);
  }

  const isGen12 = (chassisInfo?.gen || '').includes('12') || (chassisInfo?.model || '').includes('Gen12');
  const genKey = isGen12 ? 'Gen12' : 'Gen11';
  const cmap = getChassisMap();
  const duals = cmap.form_factor_duals?.[genKey]?.storage_controller || {};

  if (!catalogData || !Array.isArray(catalogData.entries) || catalogData.entries.length === 0) {
    return _findFallbackAlternative(roleType, constraints, duals, isGen12, chassisInfo);
  }

  const skuIndex = buildCatalogSkuIndex(catalogData);
  const catalogDir = chassisInfo?.catalogDir || null;

  if (roleType === 'STORAGE_EXPANDER_CASCADE') return _findStorageExpanderAlternative(skuIndex, catalogDir);
  if (roleType === 'CONTESTED_OCP_SLOT_COLLISION') return _findContestedOcpSlotAlternative(skuIndex, catalogDir, duals, isGen12, chassisInfo);
  if (roleType === 'MEMORY_BUS_SPEED_BOTTLENECK') return _findMemoryBusSpeedAlternative(skuIndex, catalogDir, constraints);
  return null;
}

function _extractCpuUpgradeCandidates(catalogData) {
  const candidates = [];
  catalogData.entries.forEach(e => {
    (e.skus || []).forEach(s => {
      const d = (s.Description || s.description || '').toLowerCase();
      const sku = cleanBaseSKU(s['Product #'] || s.sku);
      const status = s['Lifecycle Status'] || 'ACTIVE';
      if (/obsolete|eol/i.test(status)) return;
      const cpuMatch = d.match(/intel\s+xeon[^\d]+(\d)5\d{2}([a-z+]?)/i);
      if (cpuMatch) {
        const cCoreMatch = d.match(/(\d+)\s*-?\s*core/i);
        const cCores = cCoreMatch ? parseInt(cCoreMatch[1], 10) : 0;
        const cTdpMatch = d.match(/(\d{2,3})\s*w/i);
        const cTdp = cTdpMatch ? parseInt(cTdpMatch[1], 10) : 0;
        const cIs1P = d.includes('1p') || /\b\d{4}u\b/i.test(d);
        const price = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || '0').replace(/[$,]/g, '')) || 0;
        candidates.push({ sku, description: s.Description || s.description, cores: cCores, tdp: cTdp, is1P: cIs1P, price });
      }
    });
  });
  return candidates;
}

function _scoreCpuUpgradeCandidate(c, cores, is1P, tdp, catalogDir) {
  let score = 0;
  if (c.cores === cores) score += 100;
  else if (c.cores > cores) score += 50 - (c.cores - cores);
  else score -= 100;

  if (!is1P && c.is1P) score -= 200;
  if (is1P && !c.is1P) score += 20;
  score -= Math.abs(c.tdp - tdp) * 0.5;

  const visibility = isSkuVisibleAtDefaultAmbient(c.sku, catalogDir);
  if (!visibility.isVisible) score -= 150;
  return { ...c, score, isVisible: visibility.isVisible };
}

function findGenerationalCpuUpgrade(currentSku, currentDesc, catalogData = null, chassisInfo = {}) {
  const descLower = (currentDesc || '').toLowerCase();
  const coreMatch = descLower.match(/(\d+)\s*-?\s*core/i);
  const cores = coreMatch ? parseInt(coreMatch[1], 10) : 0;
  const tdpMatch = descLower.match(/(\d{2,3})\s*w/i);
  const tdp = tdpMatch ? parseInt(tdpMatch[1], 10) : 0;
  const is1P = descLower.includes('1p') || /\b\d{4}u\b/i.test(descLower);

  if (!catalogData || !Array.isArray(catalogData.entries) || catalogData.entries.length === 0) {
    return (cores >= 56 || descLower.includes('8480'))
      ? { sku: 'P67087-B21', description: 'Intel Xeon-Platinum 8570 2.1GHz 56-core 350W Processor for HPE' }
      : { sku: 'P67082-B21', description: 'Intel Xeon-Gold 6548Y+ 2.5GHz 32-core 250W Processor for HPE' };
  }

  const candidates = _extractCpuUpgradeCandidates(catalogData);
  const catalogDir = chassisInfo?.catalogDir || null;
  const scored = candidates.map(c => _scoreCpuUpgradeCandidate(c, cores, is1P, tdp, catalogDir));
  scored.sort((a, b) => b.score - a.score);

  if (scored[0]) return { sku: scored[0].sku, description: scored[0].description };
  return (cores >= 56 || descLower.includes('8480'))
    ? { sku: 'P67087-B21', description: 'Intel Xeon-Platinum 8570 2.1GHz 56-core 350W Processor for HPE' }
    : { sku: 'P67082-B21', description: 'Intel Xeon-Gold 6548Y+ 2.5GHz 32-core 250W Processor for HPE' };
}

function _extractMemoryUpgradeCandidates(catalogData) {
  const candidates = [];
  catalogData.entries.forEach(e => {
    (e.skus || []).forEach(s => {
      const d = (s.Description || s.description || '').toLowerCase();
      const sku = cleanBaseSKU(s['Product #'] || s.sku);
      const status = s['Lifecycle Status'] || 'ACTIVE';
      if (/obsolete|eol/i.test(status)) return;
      if (d.includes('5600') && (d.includes('smart memory') || d.includes('rdimm') || d.includes('fio memory') || d.includes('registered'))) {
        const cCapMatch = d.match(/(\d+)\s*gb/i);
        const cCap = cCapMatch ? parseInt(cCapMatch[1], 10) : 0;
        const isFio = sku.endsWith('-F21') || d.includes('fio') || d.includes('factory integrated');
        const price = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || '0').replace(/[$,]/g, '')) || 0;
        candidates.push({ sku, description: s.Description || s.description, capacity: cCap, isFio, price });
      }
    });
  });
  return candidates;
}

function _pickBestMemoryCandidate(candidates, capacity, isCto) {
  const matchingCap = candidates.filter(c => c.capacity === capacity);
  if (matchingCap.length > 0) {
    if (isCto) {
      const fio = matchingCap.find(c => c.isFio);
      if (fio) return { sku: fio.sku, description: fio.description };
    }
    const bto = matchingCap.find(c => !c.isFio);
    if (bto) return { sku: bto.sku, description: bto.description };
    return { sku: matchingCap[0].sku, description: matchingCap[0].description };
  }
  return null;
}

function _defaultMemoryFallback(capacity, isCto) {
  if (capacity >= 128) {
    return {
      sku: isCto ? 'P69976-F21' : 'P69976-B21',
      description: 'HPE 128GB (1x128GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
    };
  }
  if (capacity >= 64) {
    return {
      sku: isCto ? 'P64707-F21' : 'P64707-B21',
      description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
    };
  }
  return {
    sku: isCto ? 'P64706-F21' : 'P64706-B21',
    description: 'HPE 32GB (1x32GB) Dual Rank x8 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
  };
}

function findDdr5_5600MemoryUpgrade(currentSku, currentDesc, catalogData = null, chassisInfo = {}, isCto = true) {
  const descLower = (currentDesc || '').toLowerCase();
  const capMatch = descLower.match(/(\d+)\s*gb/i);
  const capacity = capMatch ? parseInt(capMatch[1], 10) : 32;

  if (!catalogData || !Array.isArray(catalogData.entries) || catalogData.entries.length === 0) {
    return _defaultMemoryFallback(capacity, isCto);
  }

  const candidates = _extractMemoryUpgradeCandidates(catalogData);
  const best = _pickBestMemoryCandidate(candidates, capacity, isCto);
  return best || _defaultMemoryFallback(capacity, isCto);
}

module.exports = {
  isSkuVisibleAtDefaultAmbient,
  getChassisMap,
  isActiveCatalogOption,
  findBestAlternativeInCatalog,
  findGenerationalCpuUpgrade,
  findDdr5_5600MemoryUpgrade
};
