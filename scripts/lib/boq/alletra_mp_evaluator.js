'use strict';

/**
 * scripts/lib/boq/alletra_mp_evaluator.js
 *
 * Dedicated evidence-backed domain evaluator for HPE Alletra Storage MP
 * (Alletra_MP_B10000 Switchless B10100 / Switched B10200 & Alletra_MP_X10000).
 *
 * Enforces INV-265 through INV-268, consuming raw_data/ninja_online_sizing_catalog.json
 * when present, preserving null prices honestly, and emitting portalValidationStatus: 'PENDING'
 * until a live HPE Ninja Online OCA JSON export + HPE OCA CLIC receipt is bound.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU } = require('../catalog/sku.js');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');

const B10100_BASE_SKUS = new Set(['S0B84A', 'S0U38A', 'S3V89A', 'S3V90A', 'S5S38A', 'S5S39A']);
const B10200_BASE_SKUS = new Set(['S1R06A', 'S1R07A', 'S3V91A', 'S3V92A', 'S5S40A', 'S5S41A']);
const X10000_BASE_SKUS = new Set(['S3L12A', 'S7Z87A', 'S7Z88A', 'S6W29A']);

const B10100_NODE_SKUS = new Set([
  'S0S38A', 'S0S40A', 'S0R21A', 'S0R21B', 'S0S41A', 'S4V66A', 'S4V66B', 'S4V67A',
  'S0S39A', 'S3V95A', 'S3V96A', 'S3V97A', 'S3V98A', 'S3V99A', 'S3W00A'
]);
const B10120_NODE_SKUS = new Set(['S0S38A', 'S0S40A', 'S3V95A', 'S3V96A']);
const B10200_NODE_SKUS = new Set([
  'R7D02A', 'R7D02B', 'S0S42A', 'R7D03A', 'R7D03B', 'S0R20A',
  'S3W01A', 'S3W02A', 'S3W03A', 'S3W04A'
]);
const X10000_NODE_SKUS = new Set(['R7C71A', 'R7C71B']);

const CHASSIS_2U_SKUS = new Set(['R7C75A', 'S0U32A', 'S3V93A', 'S3V94A']);
const JBOF_SKUS = new Set(['S1J10A', 'S0S46A']);
const BACKEND_SWITCH_BUNDLE_SKUS = new Set(['S1R08A', 'S6L90A', 'S1S69A']);
const SWITCH_INSTALL_KIT_SKUS = new Set(['S0A95A']);
const HBA_SKUS = new Set(['S2S64A', 'R7C90A', 'S4V68A', 'R7C82A', 'S2A68A']);
const AC_PSU_SKUS = new Set(['R7C76A', 'R9Z97A', 'R7C77A']);
const DC_PSU_SKUS = new Set(['R7C78A']);
const QLC_DRIVE_SKUS = new Set(['S3L73A', 'S3L74A']);
const TLC_DRIVE_SKUS = new Set([
  'R9H66A', 'R9H67A', 'R9H68A', 'R9H69A', 'S1Z68A',
  'R9H70A', 'R9H71A', 'R9H72A', 'R9H73A', 'S4P49A',
  'R9H70B', 'R9H71B', 'R9H72B', 'R9H73B',
  'S7P26A', 'S7P27A', 'S7P28A', 'S7P29A',
  'S0Q02B', 'S0Q03B', 'S0Q04B'
]);
const OPTIC_OR_CABLE_SKUS = new Set([
  'Q2P65A', 'Q2P64B', 'Q2P62A', 'R0R41B', 'S3N85A', 'S4V69A',
  'S2T35A', 'S2T38A', 'S2T39A', 'S2T40A', 'S2T41A',
  'R9F76A', 'R9F77A', 'R9F79A', 'R9F80A', 'R9F81A',
  'JL271A', 'Q2F19A', 'R0Z25A', 'R0Z27A', 'R8M59A'
]);

const ALL_ALLETRA_MP_SKUS = new Set([
  ...B10100_BASE_SKUS, ...B10200_BASE_SKUS, ...X10000_BASE_SKUS,
  ...B10100_NODE_SKUS, ...B10200_NODE_SKUS, ...X10000_NODE_SKUS,
  ...CHASSIS_2U_SKUS, ...JBOF_SKUS, ...BACKEND_SWITCH_BUNDLE_SKUS, 'S7U66A'
]);

function _hasNonAlletraBaseHardware(items = []) {
  for (const item of items) {
    const desc = String(item.description || '');
    if (/\b(?:proliant|dl\d{3}[a-z]?|synergy\s*(?:12000|480|660)|sy480|msl\s*\d+|storeever|alletra\s*(?:9000|6000|5000))\b/i.test(desc)) {
      return true;
    }
  }
  return false;
}

/**
 * Determine if items represent a scoped Alletra MP (B10000 or X10000) solution
 * without unrelated ProLiant/Synergy/Tape/legacy Alletra appliances mixed in.
 */
function isAlletraMpItems(items = [], chassisInfo = {}, targetDir = '') {
  if (!Array.isArray(items) || items.length === 0) return false;
  if (_hasNonAlletraBaseHardware(items)) return false;

  const dirMatch = /Alletra_MP_(?:B10000|X10000)/i.test(String(targetDir || ''));
  const infoMatch = /Alletra_MP_(?:B10000|X10000)|Alletra\s+(?:Storage\s+)?MP\b/i.test(
    `${chassisInfo?.productId || ''} ${chassisInfo?.model || ''} ${chassisInfo?.id || ''}`
  );
  const itemMatch = items.some(it => {
    const sku = cleanBaseSKU(it.sku);
    const desc = String(it.description || '');
    return ALL_ALLETRA_MP_SKUS.has(sku)
      || /\balletra\s*(?:storage\s*)?mp\b|\bb10[12]00\b|\bb101[234]0\b|\bb102[34]0\b|\bx10000\b|\bx10250\b/i.test(desc);
  });

  return Boolean(itemMatch || dirMatch || infoMatch);
}

/**
 * Load HPE Ninja Online sizing telemetry JSON for Alletra_MP_B10000 / Alletra_MP_X10000 when present.
 */
function loadNinjaOnlineSizingCatalog(productKey = 'Alletra_MP_B10000', targetDir = '') {
  const candidates = [];
  if (targetDir) {
    candidates.push(path.join(targetDir, 'raw_data', 'ninja_online_sizing_catalog.json'));
  }
  candidates.push(path.join(ROOT_DIR, 'outputs', 'Alletra', 'Storage', productKey, 'raw_data', 'ninja_online_sizing_catalog.json'));

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return { loaded: true, path: filePath, data: parsed };
      }
    } catch (_) {
      // Missing or unreadable optional telemetry falls back cleanly.
    }
  }
  return { loaded: false, path: null, data: null };
}

function _buildNinjaLookupSets(ninjaData) {
  const nodeMap = new Map();
  const driveMap = new Map();
  const cat = ninjaData?.catalog || {};

  for (const n of (Array.isArray(cat.nodes) ? cat.nodes : [])) {
    const sku = cleanBaseSKU(n.partNumber || n.sku);
    if (sku) nodeMap.set(sku, n);
  }
  for (const d of (Array.isArray(cat.drives) ? cat.drives : [])) {
    const sku = cleanBaseSKU(d.partNumber || d.sku);
    if (sku) driveMap.set(sku, d);
  }

  return {
    nodeMap,
    driveMap,
    x10kMaxBounds: cat.maxBounds || null,
    x10kPerfGrids: cat.performanceGrids || null
  };
}

function _tallyBaseAndNodes(sku, desc, qty, ninja, tally) {
  if (/\b(?:tech\s*care|pointnext|complete\s*care|foundation\s*care|support\s+svc|hardware\s+support)\b/i.test(desc) || /^H[A-Z0-9]{5,7}(?:#|$)/.test(sku)) {
    return false;
  }
  const ninjaNode = ninja.nodeMap.get(sku);
  if (B10100_BASE_SKUS.has(sku) || /\bb10100\b/i.test(desc)) tally.b10100BaseCount += qty;
  if (B10200_BASE_SKUS.has(sku) || /\bb10200\b/i.test(desc)) tally.b10200BaseCount += qty;
  if (X10000_BASE_SKUS.has(sku) || /\bx10000\b.*(?:base|config|ksa)/i.test(desc)) tally.x10000BaseCount += qty;

  if (B10100_NODE_SKUS.has(sku) || /\bb101[234]0\b.*(?:controller|node)/i.test(desc) || (ninjaNode && ninjaNode.cluster === false && ninjaNode.nodeType === 'Controller')) {
    tally.b10100NodeCount += qty;
    tally.nodeCount += qty;
    if (B10120_NODE_SKUS.has(sku) || /\bb10120\b/i.test(desc)) tally.hasB10120Node = true;
    return true;
  }
  if (B10200_NODE_SKUS.has(sku) || /\bb102[34]0\b.*(?:controller|node)/i.test(desc) || (ninjaNode && ninjaNode.cluster === true && ninjaNode.nodeType === 'Controller')) {
    tally.b10200NodeCount += qty;
    tally.nodeCount += qty;
    return true;
  }
  if (X10000_NODE_SKUS.has(sku) || /\bx10250\b.*(?:controller|node)/i.test(desc) || /\bx10000\b.*controller\s+node/i.test(desc)) {
    tally.x10000NodeCount += qty;
    tally.nodeCount += qty;
    return true;
  }
  if (/\balletra\b.*\bcontroller\s+node\b/i.test(desc)) {
    tally.nodeCount += qty;
    return true;
  }
  return false;
}

function _tallyEnclosuresAndSwitches(sku, desc, qty, tally) {
  if (CHASSIS_2U_SKUS.has(sku) || /\balletra\b.*\b2u\s+chassis\b/i.test(desc)) {
    tally.chassis2uCount += qty;
    return true;
  }
  if (JBOF_SKUS.has(sku) || /\b(?:10001|jbof|nvme\s+(?:configure-to-order\s+)?expansion\s+shelf)\b/i.test(desc)) {
    tally.jbofCount += qty;
    return true;
  }
  if (BACKEND_SWITCH_BUNDLE_SKUS.has(sku) || /\balletra\b.*switch\s+bundle\b/i.test(desc)) {
    tally.backendSwitchBundleCount += qty;
    tally.backendSwitchCount += qty * 2;
    return true;
  }
  if (SWITCH_INSTALL_KIT_SKUS.has(sku)) {
    tally.hasSwitchInstallKit = true;
    return true;
  }
  if (/\b(?:back-?end|nvme-?of|aruba.*8325|aruba.*8360|9300-32d)\b.*switch\b/i.test(desc) && !/cable|transceiver|cord|kit/i.test(desc)) {
    tally.backendSwitchCount += qty;
    return true;
  }
  return false;
}

function _tallyDrivesAndHbas(sku, desc, qty, ninja, tally) {
  const ninjaDrive = ninja.driveMap.get(sku);
  if (QLC_DRIVE_SKUS.has(sku) || (ninjaDrive && ninjaDrive.driveClass === 'QLC') || (/\bqlc\b/i.test(desc) && /\b(?:ssd|nvme|drive)\b/i.test(desc))) {
    tally.driveCount += qty;
    tally.qlcDriveCount += qty;
    return true;
  }
  if (TLC_DRIVE_SKUS.has(sku) || ninjaDrive || (/\bnvme\b/i.test(desc) && /\b(?:ssd|drive)\b/i.test(desc) && !/expansion\s+shelf|chassis/i.test(desc))) {
    tally.driveCount += qty;
    tally.tlcDriveCount += qty;
    return true;
  }
  if (HBA_SKUS.has(sku) || /\b(?:host\s+bus\s+adapter|ocp\s+host\s+bus|fc\s+hba|100gbe\s+2-port|10\/25gbe\s+4-port)\b/i.test(desc)) {
    tally.hbaCount += qty;
    if (/fc|fibre\s+channel/i.test(desc) || ['S2S64A', 'R7C90A', 'S4V68A'].includes(sku)) tally.fcHbaCount += qty;
    if (/100gbe|25gbe|10\/25gbe|iscsi|nvme-?tcp/i.test(desc) || ['R7C82A', 'S2A68A'].includes(sku)) tally.ethHbaCount += qty;
    return true;
  }
  return false;
}

function _tallyPsusOpticsAndSupport(sku, desc, qty, tally) {
  if (AC_PSU_SKUS.has(sku) || (/\bpower\s+supply\b|\bac\s+ps\b/i.test(desc) && !/-?48v?dc/i.test(desc) && !/cord/i.test(desc))) {
    tally.acPsuCount += qty;
    return;
  }
  if (DC_PSU_SKUS.has(sku) || (/-?48v?dc\b/i.test(desc) && /\bpower\s+supply\b|\bps\b/i.test(desc) && !/cable|switch/i.test(desc))) {
    tally.dcPsuCount += qty;
    return;
  }
  if (OPTIC_OR_CABLE_SKUS.has(sku) || /\b(?:transceiver|xcvr|sfp28|sfp56|qsfp28|active\s+optical\s+cable|direct\s+attach\s+copper|\baoc\b|\bdac\b)\b/i.test(desc)) {
    tally.opticAndCableCount += qty;
    return;
  }
  if (/\b(?:tech\s*care|pointnext|complete\s*care|foundation\s*care)\b/i.test(desc) || /^H[A-Z0-9]{5,7}(?:#|$)/.test(sku)) {
    tally.hardwareSupportLines += qty;
    return;
  }
  if (/\b(?:greenlake.*os|operating\s+system\s+upgrade|e-ltu|saas)\b/i.test(desc) || /^S[378][A-Z0-9]{4}AAE$/.test(sku)) {
    tally.saasLicenseLines += qty;
  }
}

function _tallyDrivesHbasPsusAndSupport(sku, desc, qty, ninja, tally) {
  if (_tallyDrivesAndHbas(sku, desc, qty, ninja, tally)) return;
  _tallyPsusOpticsAndSupport(sku, desc, qty, tally);
}

function _tallyAlletraMpItems(items, ninja) {
  const tally = {
    b10100BaseCount: 0, b10200BaseCount: 0, x10000BaseCount: 0,
    b10100NodeCount: 0, b10200NodeCount: 0, x10000NodeCount: 0,
    hasB10120Node: false, nodeCount: 0,
    chassis2uCount: 0, jbofCount: 0,
    backendSwitchBundleCount: 0, backendSwitchCount: 0, hasSwitchInstallKit: false,
    driveCount: 0, tlcDriveCount: 0, qlcDriveCount: 0,
    hbaCount: 0, fcHbaCount: 0, ethHbaCount: 0,
    acPsuCount: 0, dcPsuCount: 0,
    opticAndCableCount: 0,
    hardwareSupportLines: 0, saasLicenseLines: 0
  };

  for (const item of (items || [])) {
    const sku = cleanBaseSKU(item.sku);
    const desc = String(item.description || '');
    const qty = Math.max(0, Number(item.quantity ?? 1) || 0);
    if (qty === 0) continue;

    if (_tallyBaseAndNodes(sku, desc, qty, ninja, tally)) continue;
    if (_tallyEnclosuresAndSwitches(sku, desc, qty, tally)) continue;
    _tallyDrivesHbasPsusAndSupport(sku, desc, qty, ninja, tally);
  }
  return tally;
}

function _detectAlletraMpVariant(tally, targetDir, chassisInfo) {
  const isX10k = tally.x10000BaseCount > 0 || tally.x10000NodeCount > 0
    || /X10000/i.test(`${targetDir || ''} ${chassisInfo?.productId || ''} ${chassisInfo?.model || ''}`);
  const hasB10100 = tally.b10100BaseCount > 0 || tally.b10100NodeCount > 0;
  const hasB10200 = tally.b10200BaseCount > 0 || tally.b10200NodeCount > 0;

  if (isX10k && !hasB10100 && !hasB10200) {
    return { productKey: 'Alletra_MP_X10000', variant: 'X10000', hasMixedVariants: false };
  }
  if (hasB10100 && hasB10200) {
    return { productKey: 'Alletra_MP_B10000', variant: 'MIXED_B10100_B10200', hasMixedVariants: true };
  }
  if (isX10k && (hasB10100 || hasB10200)) {
    return { productKey: 'Alletra_MP_B10000', variant: 'MIXED_B10000_X10000', hasMixedVariants: true };
  }
  if (hasB10200) {
    return { productKey: 'Alletra_MP_B10000', variant: 'B10200_SWITCHED', hasMixedVariants: false };
  }
  if (hasB10100) {
    return { productKey: 'Alletra_MP_B10000', variant: 'B10100_SWITCHLESS', hasMixedVariants: false };
  }
  return { productKey: 'Alletra_MP_B10000', variant: 'B10000_UNSPECIFIED', hasMixedVariants: false };
}

function _checkTopologySeparation(variantInfo, tally, ninja) {
  const errors = [];
  const warnings = [];
  const { variant, hasMixedVariants } = variantInfo;

  if (hasMixedVariants) {
    errors.push(`INV-266 Mutual Exclusion Violation: Cannot mix Switchless B10100 (S0B84A), Switched B10200 (S1R06A), or X10000 (S3L12A) components in the same Alletra MP array (${variant}).`);
  }
  if (variant === 'B10100_SWITCHLESS') {
    if (tally.backendSwitchCount > 0 || tally.hasSwitchInstallKit) {
      errors.push(`INV-266 Switchless B10100 Violation: Switchless B10100 (S0B84A) forbids backend NVMe-oF switches (found ${tally.backendSwitchCount} switch(es)). Upgrade to Switched B10200 (S1R06A) for switched topologies.`);
    }
    const maxJbof = tally.hasB10120Node ? 1 : 3;
    if (tally.jbofCount > maxJbof) {
      errors.push(`INV-266 Switchless B10100 JBOF Limit Exceeded: ${tally.hasB10120Node ? 'B10120' : 'B10100'} supports 0-${maxJbof} JBOF expansion shelf(s); found ${tally.jbofCount}.`);
    }
  } else if (variant === 'B10200_SWITCHED') {
    if (tally.jbofCount < 1 || tally.jbofCount > 8) {
      errors.push(`INV-266 Switched B10200 JBOF Mandate: Switched B10200 (S1R06A) has 0 internal drives and mandates 1-8 JBOF expansion shelves (S1J10A); found ${tally.jbofCount}.`);
    }
    if (tally.backendSwitchCount < 2) {
      errors.push(`INV-266 Switched B10200 Backend Fabric Mandate: Switched B10200 (S1R06A) requires redundant backend NVMe-oF switches (minimum 2 switches / 1x switch bundle S1R08A or S6L90A); found ${tally.backendSwitchCount}.`);
    }
  } else if (variant === 'X10000') {
    const maxJbofStd = ninja.x10kMaxBounds?.jbofs || 12;
    if (tally.jbofCount < 1) {
      errors.push('INV-265 Alletra MP X10000 JBOF Mandate: X10000 (S3L12A) requires at least 1 JBOF NVMe expansion enclosure (S1J10A); found 0.');
    } else if (tally.jbofCount > 16) {
      errors.push(`INV-265 Alletra MP X10000 JBOF Ceiling Exceeded: Maximum 16 JBOFs supported; found ${tally.jbofCount}.`);
    } else if (tally.jbofCount > maxJbofStd) {
      warnings.push(`Alletra MP X10000 JBOF count (${tally.jbofCount}) exceeds Ninja Online standard single-rack bound (${maxJbofStd} JBOFs); verify scale-out topology in HPE Ninja Online.`);
    }
    if (tally.backendSwitchCount < 2) {
      errors.push(`INV-265 Alletra MP X10000 Backend Switch Mandate: X10000 requires redundant backend NVMe-oF switches (minimum 2 switches / 1x switch bundle S1R08A or S6L90A); found ${tally.backendSwitchCount}.`);
    }
  } else if (variant === 'B10000_UNSPECIFIED') {
    warnings.push('Alletra MP B10000 variant (Switchless B10100 S0B84A vs Switched B10200 S1R06A) is not explicitly identified in the BOM.');
  }

  return {
    id: 'ALLETRA_MP_TOPOLOGY_SEPARATION',
    name: 'Alletra MP Switchless/Switched Topology & JBOF Separation',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || warnings[0] || `Verified ${variant} topology (${tally.jbofCount} JBOF(s), ${tally.backendSwitchCount} backend NVMe-oF switch(es)).`
  };
}

function _checkControllerRedundancy(variantInfo, tally, ninja) {
  const errors = [];
  const warnings = [];
  const { variant } = variantInfo;

  if (variant === 'X10000') {
    const maxNodesStd = ninja.x10kMaxBounds?.nodes || 8;
    if (tally.nodeCount < 3) {
      errors.push(`Alletra MP X10000 Controller Node Minimum: X10000 requires at least 3 controller nodes (R7C71A) for distributed erasure/quorum; found ${tally.nodeCount}.`);
    } else if (tally.nodeCount > 16) {
      errors.push(`Alletra MP X10000 Controller Node Ceiling: Maximum 16 controller nodes supported; found ${tally.nodeCount}.`);
    } else if (tally.nodeCount > maxNodesStd) {
      warnings.push(`Alletra MP X10000 node count (${tally.nodeCount}) exceeds Ninja Online standard single-rack bound (${maxNodesStd} nodes); confirm scale-out sizing in Ninja Online.`);
    }
  } else {
    if (tally.nodeCount < 2) {
      errors.push(`INV-267 Alletra MP Controller Pair Mandate: Active-active storage requires controller node pairs (2/4/6/8 nodes); found ${tally.nodeCount}.`);
    } else if (tally.nodeCount % 2 !== 0) {
      errors.push(`INV-267 Alletra MP Controller Pair Violation: Controller nodes must be configured in symmetric pairs (2/4/6/8); found odd count ${tally.nodeCount}.`);
    } else if (variant === 'B10100_SWITCHLESS' && tally.nodeCount > 2) {
      errors.push(`INV-266 Switchless B10100 Node Limit: Switchless B10100 supports exactly 2 controller nodes in 1 base chassis; found ${tally.nodeCount}. Use Switched B10200 (S1R06A) for 4-8 nodes.`);
    } else if (tally.nodeCount > 8) {
      errors.push(`INV-267 Alletra MP B10000 Node Ceiling: Maximum 8 controller nodes (4 pairs) supported; found ${tally.nodeCount}.`);
    }
  }

  return {
    id: 'ALLETRA_MP_CONTROLLER_REDUNDANCY',
    name: 'Alletra MP Controller Node Redundancy',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || warnings[0] || `Verified ${tally.nodeCount} redundant controller node(s) for ${variant}.`
  };
}

function _checkDriveMediaEnvelope(variantInfo, tally) {
  const errors = [];
  const warnings = [];
  const { variant } = variantInfo;

  let internalSlots = 0;
  let maxDrives = 384;
  if (variant === 'B10100_SWITCHLESS') {
    internalSlots = 24;
    maxDrives = tally.hasB10120Node ? 24 : 72;
  } else if (variant === 'B10200_SWITCHED') {
    internalSlots = 0;
    maxDrives = 384;
  } else if (variant === 'X10000') {
    internalSlots = 0;
    maxDrives = 384;
  }

  const physicalBayCapacity = internalSlots + (tally.jbofCount * 24);
  if (tally.driveCount === 0) {
    warnings.push('No NVMe SSD drive SKUs detected in Alletra MP BOM; confirm whether this is a controller-only upgrade or missing storage media.');
  } else {
    if (tally.driveCount > maxDrives) {
      errors.push(`INV-266 Drive Limit Exceeded: ${tally.driveCount} NVMe drives exceed ${variant} maximum (${maxDrives} drives).`);
    }
    if (tally.driveCount > physicalBayCapacity) {
      errors.push(`Physical Drive Bay Overflow: ${tally.driveCount} NVMe drives exceed available bay capacity (${physicalBayCapacity} bays = ${internalSlots} internal + ${tally.jbofCount}x24 JBOF bays).`);
    }
    if (tally.driveCount < 8) {
      errors.push(`Alletra MP Minimum Drive Increment: Base array requires at least 8 NVMe SSDs; found ${tally.driveCount}.`);
    } else if (tally.driveCount % 2 !== 0) {
      errors.push(`Alletra MP Drive Increment Violation: NVMe drives must be populated in even increments (2-drive or 4-drive packs); found odd count ${tally.driveCount}.`);
    }
    if (tally.tlcDriveCount > 0 && tally.qlcDriveCount > 0) {
      errors.push(`Alletra MP Media Tier Conflict: Mixing TLC (${tally.tlcDriveCount}) and QLC (${tally.qlcDriveCount}) NVMe SSDs within the same enclosure/envelope is unsupported without verified multi-tier Ninja Online sizing.`);
    }
  }

  const mediaClass = tally.qlcDriveCount > 0 && tally.tlcDriveCount === 0
    ? 'QLC'
    : (tally.tlcDriveCount > 0 && tally.qlcDriveCount === 0 ? 'TLC' : (tally.driveCount > 0 ? 'MIXED_TLC_QLC' : 'NONE'));

  return {
    id: 'ALLETRA_MP_DRIVE_MEDIA_ENVELOPE',
    name: 'Alletra MP Drive Bay Capacity & TLC/QLC Media Envelope',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    mediaClass,
    physicalBayCapacity,
    detail: errors[0] || warnings[0] || `Verified ${tally.driveCount} ${mediaClass} NVMe drive(s) within ${physicalBayCapacity} bay capacity (max ${maxDrives}).`
  };
}

function _checkHostFabricSymmetry(variantInfo, tally) {
  const errors = [];
  const warnings = [];
  const maxHbaPerNode = variantInfo.variant === 'X10000' ? 3 : 2;

  if (tally.nodeCount > 0 && tally.hbaCount === 0) {
    warnings.push('No host interface cards (FC / 10-25GbE iSCSI / 100GbE NVMe-TCP HBAs) detected in Alletra MP BOM.');
  } else if (tally.nodeCount > 0 && tally.hbaCount > 0) {
    if (tally.hbaCount % tally.nodeCount !== 0) {
      errors.push(`INV-267 Symmetric HBA Violation: Host interface cards (${tally.hbaCount}) must distribute evenly across ${tally.nodeCount} controller node(s).`);
    } else if ((tally.hbaCount / tally.nodeCount) > maxHbaPerNode) {
      errors.push(`Alletra MP HBA Slot Limit Exceeded: ${tally.hbaCount / tally.nodeCount} HBAs/node exceeds maximum ${maxHbaPerNode} OCP host interface cards per controller node.`);
    }
  }

  if ((variantInfo.variant === 'B10200_SWITCHED' || variantInfo.variant === 'X10000') && tally.backendSwitchCount >= 2 && tally.opticAndCableCount === 0) {
    warnings.push('Switched NVMe-oF backend fabric lacks 100GbE/400GbE QSFP28 AOC/DAC cables or optical transceivers (e.g., R9F76A, S2T35A).');
  } else if (tally.hbaCount > 0 && tally.opticAndCableCount === 0) {
    warnings.push('Host interface cards present without optical transceivers (SFP28/SFP56/QSFP28) or DAC/AOC cables.');
  }

  return {
    id: 'ALLETRA_MP_HOST_FABRIC_SYMMETRY',
    name: 'Alletra MP Symmetric Host HBAs & Optical Cabling',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || warnings[0] || `Verified ${tally.hbaCount} symmetric HBA(s) across ${tally.nodeCount} node(s) with ${tally.opticAndCableCount} transceiver/cable unit(s).`
  };
}

function _checkPowerRedundancy(tally) {
  const errors = [];
  const warnings = [];
  const totalPsus = tally.acPsuCount + tally.dcPsuCount;
  const controllerChassis = tally.chassis2uCount > 0 ? tally.chassis2uCount : Math.ceil(tally.nodeCount / 2);
  const totalEnclosures = Math.max(1, controllerChassis + tally.jbofCount);
  const requiredPsus = totalEnclosures * 2;

  if (tally.acPsuCount > 0 && tally.dcPsuCount > 0) {
    errors.push(`Power Architecture Conflict: Cannot mix AC PSUs (${tally.acPsuCount}) and -48VDC PSUs (${tally.dcPsuCount}) in the same Alletra MP storage array.`);
  }
  if (totalPsus === 0) {
    warnings.push(`No explicit power supply SKUs (R7C76A/R9Z97A/R7C78A) listed for ${totalEnclosures} enclosure(s); verify 2x redundant PSUs per chassis/JBOF in OCA.`);
  } else if (totalPsus < requiredPsus) {
    errors.push(`Alletra MP Power Redundancy Deficit: ${totalEnclosures} enclosure(s) require ${requiredPsus} redundant PSUs (2 per chassis/JBOF); found ${totalPsus}.`);
  } else if (totalPsus % 2 !== 0) {
    errors.push(`Alletra MP Power Supply Symmetry Violation: Found odd PSU count (${totalPsus}); power supplies must be provisioned in redundant pairs.`);
  }

  return {
    id: 'ALLETRA_MP_POWER_REDUNDANCY',
    name: 'Alletra MP Enclosure Power Redundancy',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || warnings[0] || `Verified ${totalPsus} redundant PSU(s) covering ${totalEnclosures} enclosure(s).`
  };
}

function _checkSupportAndPortalGate(variantInfo, tally, ninjaResult) {
  const warnings = [];
  if (tally.hardwareSupportLines === 0) {
    warnings.push('Missing HPE Tech Care / Pointnext hardware support SKU (default policy: product-qualified 3-year Tech Care Basic via OCA Services -> Edit). GreenLake OS LTUs do not substitute for hardware support.');
  }
  const ninjaNote = ninjaResult.loaded
    ? `Ninja Online telemetry loaded (${variantInfo.productKey}).`
    : 'Ninja Online sizing telemetry JSON not present on disk; validated with canonical INV-265..268 rules.';
  warnings.push(`INV-268 Tier 3 Gate: Core Alletra MP sizing requires HPE Ninja Online OCA JSON export + live HPE OCA CLIC validation receipt (${ninjaNote})`);

  return {
    id: 'ALLETRA_MP_SUPPORT_AND_PORTAL_GATE',
    name: 'Alletra MP Per-Icon Support & Ninja Online / OCA CLIC Gate',
    status: 'WARN',
    errors: [],
    warnings,
    detail: warnings[0]
  };
}

function _buildAlletraPartsWithNullablePrices(items, catalogData) {
  const index = new Map();
  for (const entry of (catalogData?.entries || [])) {
    for (const s of (entry.skus || [])) {
      const k = cleanBaseSKU(s.sku || s['Product #']);
      if (k && !index.has(k)) index.set(k, s);
    }
  }

  return (items || []).map(item => {
    const clean = cleanBaseSKU(item.sku);
    const rec = index.get(clean);
    const rawCatalogPrice = Number(rec?.listPrice ?? rec?.priceUsd ?? rec?.['Unit Price (USD)'] ?? rec?.['List Price (USD)']);
    const hasCatalogPrice = Number.isFinite(rawCatalogPrice) && rawCatalogPrice > 0;
    const inputPrice = Number(item.unitPriceUsd);
    const hasInputPrice = Number.isFinite(inputPrice) && inputPrice > 0;
    const unitPriceUsd = hasCatalogPrice ? rawCatalogPrice : (hasInputPrice ? inputPrice : null);
    const qty = Number(item.quantity ?? 1) || 1;
    return {
      ...item,
      unitPriceUsd,
      extendedPriceUsd: unitPriceUsd !== null ? Number((unitPriceUsd * qty).toFixed(2)) : null,
      priceStatus: unitPriceUsd !== null ? (hasCatalogPrice ? 'OCA_CAPTURED' : 'INPUT_QUOTED') : 'UNRESOLVED',
      portalStatus: 'PORTAL VALIDATION PENDING'
    };
  });
}

/**
 * Evaluate an Alletra MP B10000 / X10000 BOM end-to-end.
 */
function evaluateAlletraMp(items = [], catalogData = null, targetDir = '', chassisInfo = {}, options = {}) {
  const provisionalVariant = _detectAlletraMpVariant(_tallyAlletraMpItems(items, { nodeMap: new Map(), driveMap: new Map() }), targetDir, chassisInfo);
  const ninjaResult = loadNinjaOnlineSizingCatalog(provisionalVariant.productKey, targetDir);
  const ninja = _buildNinjaLookupSets(ninjaResult.data);
  const tally = _tallyAlletraMpItems(items, ninja);
  const variantInfo = _detectAlletraMpVariant(tally, targetDir, chassisInfo);

  const aspectChecks = [
    _checkTopologySeparation(variantInfo, tally, ninja),
    _checkControllerRedundancy(variantInfo, tally, ninja),
    _checkDriveMediaEnvelope(variantInfo, tally),
    _checkHostFabricSymmetry(variantInfo, tally),
    _checkPowerRedundancy(tally),
    _checkSupportAndPortalGate(variantInfo, tally, ninjaResult)
  ];

  const errors = aspectChecks.flatMap(c => c.errors || []);
  const warnings = aspectChecks.flatMap(c => c.warnings || []);
  const isMathClean = errors.length === 0;
  const parts = _buildAlletraPartsWithNullablePrices(items, catalogData);
  const unresolvedPriceSkus = parts.filter(p => p.unitPriceUsd === null).map(p => p.sku);
  const knownSubtotal = parts.reduce((sum, p) => sum + (p.extendedPriceUsd || 0), 0);

  const candidate = {
    chassis: variantInfo.productKey,
    variant: variantInfo.variant,
    rank: 1,
    name: `${variantInfo.productKey} (${variantInfo.variant})`,
    tierTitle: 'Alletra MP Domain-Verified Baseline',
    skuPartsList: parts,
    estimatedCostUsd: unresolvedPriceSkus.length ? null : Number(knownSubtotal.toFixed(2)),
    pricingComplete: unresolvedPriceSkus.length === 0,
    unresolvedPriceSkus,
    knownPriceSubtotalUsd: Number(knownSubtotal.toFixed(2)),
    physicalMathClean: isMathClean,
    isMathClean,
    portalValidationStatus: 'PENDING',
    advisoryStatus: 'PORTAL_VALIDATION_PENDING',
    aspectErrors: errors,
    score: isMathClean ? 0.74 : 0.35
  };

  return {
    items,
    productType: 'ALLETRA_MP',
    productKey: variantInfo.productKey,
    alletraMpVariant: variantInfo.variant,
    ninjaOnlineTelemetry: {
      loaded: ninjaResult.loaded,
      source: ninjaResult.data?.source || null,
      capturedAt: ninjaResult.data?.capturedAt || null,
      sizerUrl: ninjaResult.data?.sizerUrl || null
    },
    isMathClean,
    isGraphClean: false,
    portalValidationStatus: 'PENDING',
    criticalViolationsCount: errors.length,
    errors,
    warnings,
    missingDependencies: [],
    mathDeductions: [...errors],
    aspectChecks,
    evalSummary: {
      productKey: variantInfo.productKey,
      alletraMpVariant: variantInfo.variant,
      tally,
      errors,
      warnings,
      missingDependencies: [],
      aspectChecks
    },
    confidence: {
      score: isMathClean ? 0.74 : Math.max(0.1, Number((0.74 - errors.length * 0.15).toFixed(2))),
      isHitlTriggered: true,
      confidenceReasons: [
        ...errors.map(e => `[CRITICAL_MATH] ${e}`),
        ...warnings.map(w => `[WARNING] ${w}`)
      ]
    },
    conflictGraph: {
      chassisInfo: { ...chassisInfo, productId: variantInfo.productKey, variant: variantInfo.variant },
      rulesSource: ninjaResult.loaded ? 'NINJA_ONLINE_AND_ALLETRA_MP_RULES' : 'ALLETRA_MP_DOMAIN_RULES',
      isFallbackSource: false,
      totalRulesEvaluated: aspectChecks.length,
      isWholeSolutionValid: false,
      conflicts: errors.map(message => ({ level: 'ALLETRA_MP', type: 'ALLETRA_MP_CONSTRAINT_VIOLATION', message })),
      resolvedFixes: [],
      unresolvedConflicts: errors.map(message => ({ type: 'ALLETRA_MP_CONSTRAINT_VIOLATION', message })),
      rankedSolutions: options.skipSynthesis ? [] : [candidate]
    }
  };
}

module.exports = {
  isAlletraMpItems,
  loadNinjaOnlineSizingCatalog,
  evaluateAlletraMp
};
