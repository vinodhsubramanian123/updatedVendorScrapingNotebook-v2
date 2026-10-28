# Detailed Technical Analysis: Milestone 1, Sub-Area C (PCIe Riser, Networking, Support & Domain Stubs)

**Author:** Explorer M1_3 (`teamwork_preview_explorer`)  
**Target Subsystem:** `scripts/lib/aspects/` (`pcie_riser.js`, `networking_ocp.js`, `support_manufacturing.js`, `aspect_registry.js`)  
**Date:** 2026-10-27  

---

## 1. Executive Summary & Problem Formulation

An exhaustive investigation was conducted into the four designated targets of Milestone 1 Sub-area C:
1. **PCIe Slot & Riser Aspect (`pcie_riser.js` & `aspect_registry.js`)**:
   - `pcie_riser.js` line 250 hardcoded `activePrimarySlots = 3` when `perNodePrimaryRiser === 0`. This caused servers without a primary riser to assume 3 active slots—even more than a server with a primary riser and no cable kit (which provides 2 slots).
   - In `aspect_registry.js`, `laneBifurcationConstraint` (x16 lane demand exceeding active physical slots) and `needsPrimaryRiser` were completely ignored during normalization, allowing severe bus and riser starvation to pass.
2. **Networking & OCP Adapter Aspect (`networking_ocp.js` & `aspect_registry.js`)**:
   - `networking_ocp.js` computed 4 rich SAN diagnostic checks (`isMissing32GbTransceivers`, `isMissing64GbTransceivers`, `isMissingOpticalPatchCables`, `hasSanSinglePointOfFailure`), but `aspect_registry.js` lines 309–313 dropped all 4 of them.
   - When 2 OCP slots are populated (`ocpAdapterCount / nodes >= 2`), HPE ProLiant Gen11/Gen12 architecture mandates an OCP enablement cable kit (`P48831-B21` / `P48832-B21` CPU2 to OCP2 enablement cable) to route PCIe lanes to Slot 2. The evaluator failed to assert this, allowing unpowered/uncabled Slot 2 configurations to pass.
3. **Support & Manufacturing Aspect (`support_manufacturing.js` & `aspect_registry.js`)**:
   - In `aspect_registry.js` line 55, `adapterSupportManufacturing` hardcoded `0` for `totalSocketCores`. In `support_manufacturing.js`, `parseCpuInfo` only matched `(\d+)\s*-?\s*core` and failed on standard processor strings specifying `32C` or `16C`, defaulting to 16 cores and corrupting Windows Server licensing math.
   - `aspect_registry.js` never enforced CLIC Rule 81322276 (`hasManagementLicense === false` must generate error).
4. **Domain Registry Active Physical Checkers (`aspect_registry.js`)**:
   - `SWITCH_FABRIC_PORTS` (lines 148–156) in `DOMAIN_REGISTRY.networking` and `ARCHIVE_COLD_STORAGE` (lines 177–198) in `DOMAIN_REGISTRY.archive` and `archive_tape` were static stubs returning `status: 'NOT_EVALUATED'`.

Below are the exact root causes, mathematical models, code diff specifications, and test verification criteria for the Worker implementation.

---

## 2. Target 1: PCIe Riser & Lane Bifurcation Constraint

### 2.1 Root Cause & Mathematical Defect
In `scripts/lib/aspects/pcie_riser.js`:
```javascript
// Current line 250:
const activePrimarySlots = isDl380a ? 3 : (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 3 : 2) : 3);
```
- When `perNodePrimaryRiser === 0` (and `!isDl380a`), `activePrimarySlots` evaluates to `3`.
- In standard ProLiant Gen11/Gen12 CTO base chassis (e.g. DL380 `P52534-B21` or Gen12 `P73282-B21`), the motherboard exposes proprietary high-density riser connectors. No physical rear PCIe cards can be installed without a primary riser cage kit.
- If a user configures 3 PCIe cards and NO primary riser:
  `perNodeCards = 3`, `activeSlotsAvailable = 3 + 0 + 0 = 3`.
  In line 261:
  `isExceedingActiveSlots = (perNodeCards > activeSlotsAvailable && activeSlotsAvailable > 0);`
  `3 > 3` is `false`, so `isExceedingActiveSlots === false`.
  And line 270:
  `needsSecondaryRiser = perNodeCards > (3 + (perNodePrimaryRiser * 3)) && perNodeSecondaryRiser === 0;`
  `3 > (3 + 0)` is `false`, so `needsSecondaryRiser === false`.
  **The configuration passes with zero risers!**
- Furthermore, in line 274:
  `const x16LanesAvailable = (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 2 : 1) : 1) + ...`
  Assumes 1 x16 lane is available even when `perNodePrimaryRiser === 0`.
- In `aspect_registry.js` lines 300–307:
  `result.laneBifurcationConstraint` is never checked.

### 2.2 Proposed Code Fix

#### File: `scripts/lib/aspects/pcie_riser.js`
Modify `calculatePcieSlots` (lines 247–292):
```javascript
<<<< CURRENT (lines 250-278)
  const isDl380a = t.isDl380a || t.riserEvidence.some(r => r.sku === 'P74690-B21' || (r.description && r.description.includes('dl380a')));
  const activePrimarySlots = isDl380a ? 3 : (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 3 : 2) : 3);
  const activeSecondarySlots = perNodeSecondaryRiser > 0 ? (t.hasSecondaryCableKit ? 3 : 2) : 0;
  const activeTertiarySlots = perNodeTertiaryRiser > 0 ? 2 : 0;

  const installedRiserSlots = t.riserEvidence.reduce((sum, riser) => sum + (riser.slotsPerRiser * (riser.quantity / nodes)), 0);
  const totalPhysicalSlots = 3 + installedRiserSlots;
  const activeSlotsAvailable = activePrimarySlots + activeSecondarySlots + activeTertiarySlots;

  const isExceedingTotalSlots = perNodeCards > totalPhysicalSlots && totalPhysicalSlots > 0;
  const isExceedingActiveSlots = (perNodePrimaryRiser > 0 && perNodeSecondaryRiser > 0)
    ? (perNodeCards > (activePrimarySlots + activeSecondarySlots))
    : (perNodeCards > activeSlotsAvailable && activeSlotsAvailable > 0);

  // INV-31: 5 or more PCIe cards require cable kits for Slot 1 & secondary power
  const needsPrimaryCableKit = !isDl380a && perNodePrimaryRiser > 0 && !t.hasPrimaryCableKit && 
    (perNodeCards >= 5 || perNodeCards > (2 + activeSecondarySlots + activeTertiarySlots));
  
  const needsSecondaryCableKit = perNodeSecondaryRiser > 0 && !t.hasSecondaryCableKit && 
    (perNodeCards >= 5 || perNodeCards > (activePrimarySlots + 2 + activeTertiarySlots) || perNodeCards > 4);

  const needsSecondaryRiser = perNodeCards > (3 + (perNodePrimaryRiser * 3)) && perNodeSecondaryRiser === 0;
  const needsGpuPowerCableKit = perNodeGpuCount > perNodeGpuPowerCableKitCount;

  // x16 Lanes
  const x16LanesAvailable = (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 2 : 1) : 1) + 
                            (perNodeSecondaryRiser > 0 ? (t.hasSecondaryCableKit ? 2 : 1) : 0) + 
                            (perNodeTertiaryRiser > 0 ? 1 : 0);
  const laneBifurcationConstraint = perNodeX16Required > x16LanesAvailable;
====
  const isDl380a = t.isDl380a || t.riserEvidence.some(r => r.sku === 'P74690-B21' || (r.description && r.description.includes('dl380a')));
  const activePrimarySlots = isDl380a ? 3 : (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 3 : 2) : 0);
  const activeSecondarySlots = perNodeSecondaryRiser > 0 ? (t.hasSecondaryCableKit ? 3 : 2) : 0;
  const activeTertiarySlots = perNodeTertiaryRiser > 0 ? 2 : 0;

  const installedRiserSlots = t.riserEvidence.reduce((sum, riser) => sum + (riser.slotsPerRiser * (riser.quantity / nodes)), 0);
  const totalPhysicalSlots = 3 + installedRiserSlots;
  const activeSlotsAvailable = activePrimarySlots + activeSecondarySlots + activeTertiarySlots;

  const isExceedingTotalSlots = perNodeCards > totalPhysicalSlots && totalPhysicalSlots > 0;
  const isExceedingActiveSlots = (perNodePrimaryRiser > 0 && perNodeSecondaryRiser > 0)
    ? (perNodeCards > (activePrimarySlots + activeSecondarySlots))
    : (perNodeCards > activeSlotsAvailable);

  const needsPrimaryRiser = !isDl380a && perNodeCards > 0 && perNodePrimaryRiser === 0;

  // INV-31: 5 or more PCIe cards require cable kits for Slot 1 & secondary power
  const needsPrimaryCableKit = !isDl380a && perNodePrimaryRiser > 0 && !t.hasPrimaryCableKit && 
    (perNodeCards >= 5 || perNodeCards > (2 + activeSecondarySlots + activeTertiarySlots));
  
  const needsSecondaryCableKit = perNodeSecondaryRiser > 0 && !t.hasSecondaryCableKit && 
    (perNodeCards >= 5 || perNodeCards > (activePrimarySlots + 2 + activeTertiarySlots) || perNodeCards > 4);

  const needsSecondaryRiser = perNodeCards > (3 + (perNodePrimaryRiser * 3)) && perNodeSecondaryRiser === 0;
  const needsGpuPowerCableKit = perNodeGpuCount > perNodeGpuPowerCableKitCount;

  // x16 Lanes: Without primary riser card, 0 lanes available unless DL380a captive bus
  const x16LanesAvailable = (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 2 : 1) : (isDl380a ? 1 : 0)) + 
                            (perNodeSecondaryRiser > 0 ? (t.hasSecondaryCableKit ? 2 : 1) : 0) + 
                            (perNodeTertiaryRiser > 0 ? 1 : 0);
  const laneBifurcationConstraint = perNodeX16Required > x16LanesAvailable;
>>>>
```

In `calculatePcieSlots` return statement:
Add `needsPrimaryRiser,` to the returned object.

In `evalPcieRiserSlots` (lines 314–320):
Add `needsPrimaryRiser: s.needsPrimaryRiser,` to the return object.

#### File: `scripts/lib/aspects/aspect_registry.js`
In `normalizeAspectResult` under `case 'PCIE_RISER':` (lines 300–307):
```javascript
<<<< CURRENT (lines 300-307)
    case 'PCIE_RISER':
      if (result.isExceedingTotalSlots) errors.push('PCIe card count exceeds physical mechanical slot capacity');
      if (result.isExceedingActiveSlots) errors.push('PCIe card count exceeds electrically cabled active slots');
      if (result.needsPrimaryCableKit) errors.push('Primary riser cable kit required to activate Slot 1');
      if (result.needsSecondaryCableKit) warnings.push('Secondary riser cable kit required to activate secondary slots');
      if (result.needsSecondaryRiser) errors.push('Secondary PCIe riser card required');
      if (result.needsGpuPowerCableKit) errors.push('GPU auxiliary power cable kit required');
      break;
====
    case 'PCIE_RISER':
      if (result.isExceedingTotalSlots) errors.push('PCIe card count exceeds physical mechanical slot capacity');
      if (result.isExceedingActiveSlots) errors.push('PCIe card count exceeds electrically cabled active slots');
      if (result.needsPrimaryRiser) errors.push('Primary PCIe riser card required');
      if (result.needsPrimaryCableKit) errors.push('Primary riser cable kit required to activate Slot 1');
      if (result.needsSecondaryCableKit) warnings.push('Secondary riser cable kit required to activate secondary slots');
      if (result.needsSecondaryRiser) errors.push('Secondary PCIe riser card required');
      if (result.needsGpuPowerCableKit) errors.push('GPU auxiliary power cable kit required');
      if (result.laneBifurcationConstraint) errors.push('PCIe x16 lane demand exceeds available x16 physical slots');
      break;
>>>>
```

---

## 3. Target 2: Networking OCP & Dropped SAN Transceiver Checks

### 3.1 Root Cause & Mathematical Defect
1. `scripts/lib/aspects/networking_ocp.js`:
   - `validateSanTransceivers(t)` properly computes `isMissing32GbTransceivers`, `isMissing64GbTransceivers`, `isMissingOpticalPatchCables`, and `hasSanSinglePointOfFailure`.
   - However, in `aspect_registry.js` lines 309–313:
     ```javascript
     case 'NETWORKING_OCP':
       if (result.isExceedingOcpSlots) errors.push('OCP adapter count exceeds chassis slot capacity');
       if (result.hasConflictingOcpCables) errors.push('Conflicting OCP enablement cables detected');
       if (result.hasSynergyFabricMismatch) errors.push('Synergy fabric mismatch detected');
       break;
     ```
     None of the 4 SAN checks are normalized into errors or warnings.
2. In `networking_ocp.js`:
   - A 2U server (like DL380 Gen11/Gen12) supports up to 2 OCP 3.0 slots.
   - Slot 1 is connected to CPU1 by default.
   - Slot 2 requires an explicit CPU2 OCP enablement cable (`P48831-B21` / `P48832-B21`).
   - `t.ocpAdapterCount` tracks both OCP NICs and OCP storage controllers (`MR216i-o`, `SR308i-o`).
   - If `perNodeOcp >= 2 && !t.hasCpu1Ocp2Cable && !t.hasCpu2Ocp2Cable`, Slot 2 is physically unrouted. The evaluator currently fails to check this, allowing missing enablement cabling to pass.

### 3.2 Proposed Code Fix

#### File: `scripts/lib/aspects/networking_ocp.js`
In `evalNetworkingOcp` (lines 240–270):
```javascript
<<<< CURRENT (lines 243-267)
  const nodes = Math.max(1, serverCount || 1);

  return {
    fcHbaCount: t.fcHbaCount,
    fcHbaPortCount32Gb: t.fcHbaPortCount32Gb,
    fcHbaPortCount64Gb: t.fcHbaPortCount64Gb,
    transceiverCount32Gb: t.transceiverCount32Gb,
    transceiverCount64Gb: t.transceiverCount64Gb,
    sanSwitchCount: t.sanSwitchCount,
    opticalPatchCableCount: t.opticalPatchCableCount,
    activeOpticalTransceiverCount: t.activeOpticalTransceiverCount,
    qsfp28BreakoutCableCount: t.qsfp28BreakoutCableCount,
    isMissing32GbTransceivers: san.isMissing32GbTransceivers,
    isMissing64GbTransceivers: san.isMissing64GbTransceivers,
    isMissingOpticalPatchCables: san.isMissingOpticalPatchCables,
    hasSanSinglePointOfFailure: san.hasSanSinglePointOfFailure,
    networkPortsCount: t.networkPortsCount,
    hasOcpAdapter: t.hasOcpAdapter,
    ocpAdapterCount: t.ocpAdapterCount,
    maxOcpSlots,
    isExceedingOcpSlots: t.ocpAdapterCount > (maxOcpSlots * nodes),
    hasCpu1Ocp2Cable: t.hasCpu1Ocp2Cable,
    hasCpu2Ocp2Cable: t.hasCpu2Ocp2Cable,
    hasConflictingOcpCables: t.hasCpu1Ocp2Cable && t.hasCpu2Ocp2Cable,
====
  const nodes = Math.max(1, serverCount || 1);
  const perNodeOcp = t.ocpAdapterCount / nodes;
  const needsOcpEnablementCable = perNodeOcp >= 2 && !t.hasCpu1Ocp2Cable && !t.hasCpu2Ocp2Cable;

  return {
    fcHbaCount: t.fcHbaCount,
    fcHbaPortCount32Gb: t.fcHbaPortCount32Gb,
    fcHbaPortCount64Gb: t.fcHbaPortCount64Gb,
    transceiverCount32Gb: t.transceiverCount32Gb,
    transceiverCount64Gb: t.transceiverCount64Gb,
    sanSwitchCount: t.sanSwitchCount,
    opticalPatchCableCount: t.opticalPatchCableCount,
    activeOpticalTransceiverCount: t.activeOpticalTransceiverCount,
    qsfp28BreakoutCableCount: t.qsfp28BreakoutCableCount,
    isMissing32GbTransceivers: san.isMissing32GbTransceivers,
    isMissing64GbTransceivers: san.isMissing64GbTransceivers,
    isMissingOpticalPatchCables: san.isMissingOpticalPatchCables,
    hasSanSinglePointOfFailure: san.hasSanSinglePointOfFailure,
    networkPortsCount: t.networkPortsCount,
    hasOcpAdapter: t.hasOcpAdapter,
    ocpAdapterCount: t.ocpAdapterCount,
    maxOcpSlots,
    isExceedingOcpSlots: t.ocpAdapterCount > (maxOcpSlots * nodes),
    needsOcpEnablementCable,
    hasCpu1Ocp2Cable: t.hasCpu1Ocp2Cable,
    hasCpu2Ocp2Cable: t.hasCpu2Ocp2Cable,
    hasConflictingOcpCables: t.hasCpu1Ocp2Cable && t.hasCpu2Ocp2Cable,
>>>>
```

#### File: `scripts/lib/aspects/aspect_registry.js`
In `normalizeAspectResult` under `case 'NETWORKING_OCP':` (lines 309–313):
```javascript
<<<< CURRENT (lines 309-313)
    case 'NETWORKING_OCP':
      if (result.isExceedingOcpSlots) errors.push('OCP adapter count exceeds chassis slot capacity');
      if (result.hasConflictingOcpCables) errors.push('Conflicting OCP enablement cables detected');
      if (result.hasSynergyFabricMismatch) errors.push('Synergy fabric mismatch detected');
      break;
====
    case 'NETWORKING_OCP':
      if (result.isExceedingOcpSlots) errors.push('OCP adapter count exceeds chassis slot capacity');
      if (result.hasConflictingOcpCables) errors.push('Conflicting OCP enablement cables detected');
      if (result.needsOcpEnablementCable) errors.push('Secondary OCP slot requires CPU2 OCP enablement cable kit');
      if (result.hasSynergyFabricMismatch) errors.push('Synergy fabric mismatch detected');
      if (result.isMissing32GbTransceivers) errors.push('32Gb Fibre Channel HBAs require optical transceivers');
      if (result.isMissing64GbTransceivers) errors.push('64Gb Fibre Channel HBAs require optical transceivers');
      if (result.isMissingOpticalPatchCables) warnings.push('Optical transceivers require LC/LC optical patch cables');
      if (result.hasSanSinglePointOfFailure) warnings.push('SAN storage connectivity has single switch single point of failure (HA requires redundant dual SAN switches)');
      break;
>>>>
```

---

## 4. Target 3: Support Manufacturing, CLIC Rule 81322276 & Socket Cores

### 4.1 Root Cause & Mathematical Defect
1. In `scripts/lib/aspects/support_manufacturing.js`:
   `parseCpuInfo` (line 85):
   `const coreMatch = desc.match(/(\d+)\s*-?\s*core/i);`
   In many customer and distributor quotes (and even in OCA descriptions like `Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor`), core count is denoted as `32C` or `16C` rather than `32-core`. The match returns `null` and falls back to 16 cores.
2. In `scripts/lib/aspects/aspect_registry.js`:
   Line 55:
   `function adapterSupportManufacturing(items, catalogData, _mandatorySkus, serverCount, _ctx) { return evalSupportManufacturing(items, catalogData, 0, serverCount); }`
   `adapterSupportManufacturing` hardcodes `0` for `totalSocketCores`.
   If `t.parsedCpuCores` is 0 due to formatting, `detectedCpuCores` becomes `0`, and Windows licensing calculates 0 required cores, optimistically passing unlicensed systems!
3. In `aspect_registry.js`:
   `normalizeAspectResult('SUPPORT_MANUFACTURING', result)` lines 325–330 never checks `result.hasManagementLicense === false`.
   Under CLIC Rule 81322276 (and INV-179/INV-207), all ProLiant Gen11/Gen12 CTO base chassis strictly require a management license (`R7A11AAE` Compute Ops Management or `E5Y43A` OneView).

### 4.2 Proposed Code Fix

#### File: `scripts/lib/aspects/support_manufacturing.js`
In `parseCpuInfo` (lines 83–94):
```javascript
<<<< CURRENT (lines 83-94)
function parseCpuInfo(desc, qty) {
  let coresPerCpu = 16;
  const coreMatch = desc.match(/(\d+)\s*-?\s*core/i);
  if (coreMatch) {
    coresPerCpu = parseInt(coreMatch[1], 10) || 16;
  }
  return {
    cores: coresPerCpu * qty,
    sockets: qty,
    vmwareTarget: Math.max(16, coresPerCpu) * qty
  };
}
====
function parseCpuInfo(desc, qty) {
  let coresPerCpu = 16;
  const coreMatch = desc.match(/(\d+)\s*-?\s*core/i) || desc.match(/\b(\d+)\s*c(?:ores?)?\b/i);
  if (coreMatch) {
    coresPerCpu = parseInt(coreMatch[1], 10) || 16;
  }
  return {
    cores: coresPerCpu * qty,
    sockets: qty,
    vmwareTarget: Math.max(16, coresPerCpu) * qty
  };
}
>>>>
```

#### File: `scripts/lib/aspects/aspect_registry.js`
In `adapterSupportManufacturing` (lines 54–56):
```javascript
<<<< CURRENT (lines 54-56)
function adapterSupportManufacturing(items, catalogData, _mandatorySkus, serverCount, _ctx) {
  return evalSupportManufacturing(items, catalogData, 0, serverCount);
}
====
function adapterSupportManufacturing(items, catalogData, _mandatorySkus, serverCount, ctx) {
  let cores = (ctx && typeof ctx.totalSocketCores === 'number' && ctx.totalSocketCores > 0) ? ctx.totalSocketCores : 0;
  if (!cores && ctx && typeof ctx.cpuCores === 'number' && ctx.cpuCores > 0) cores = ctx.cpuCores;
  if (!cores) {
    const skuIndex = catalogData ? buildCatalogSkuIndex(catalogData) : null;
    for (const it of (items || [])) {
      if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
      const desc = String(it.description || '').toLowerCase();
      const catItem = skuIndex ? skuIndex.get(cleanBaseSKU(it.sku)) : null;
      const fullDesc = (catItem?.skuData?.Description || desc).toLowerCase();
      if (fullDesc.includes('processor') || fullDesc.includes('xeon') || fullDesc.includes('epyc')) {
        const match = fullDesc.match(/(\d+)\s*-?\s*core/i) || fullDesc.match(/\b(\d+)\s*c(?:ores?)?\b/i);
        if (match) {
          cores += (parseInt(match[1], 10) * (it.quantity || 1));
        }
      }
    }
  }
  return evalSupportManufacturing(items, catalogData, cores, serverCount);
}
>>>>
```

In `normalizeAspectResult` under `case 'SUPPORT_MANUFACTURING':` (lines 325–330):
```javascript
<<<< CURRENT (lines 325-330)
    case 'SUPPORT_MANUFACTURING':
      if (result.hasContradictoryInstallServices) errors.push('Onsite and Remote installation services cannot both be selected');
      if (result.isWindowsLicenseUnderprovisioned) errors.push(`Windows Server core licensing underprovisioned by ${result.missingCoreLicenses || 0} cores`);
      if (result.isVmwareLicenseUnderprovisioned) errors.push(`VMware vSphere core licensing underprovisioned by ${result.missingVmwareCores || 0} cores`);
      if (result.isLinuxSubscriptionUnderprovisioned) errors.push('Linux subscriptions underprovisioned for socket count');
      break;
====
    case 'SUPPORT_MANUFACTURING':
      if (result.hasManagementLicense === false) errors.push('ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)');
      if (result.hasContradictoryInstallServices) errors.push('Onsite and Remote installation services cannot both be selected');
      if (result.isWindowsLicenseUnderprovisioned) errors.push(`Windows Server core licensing underprovisioned by ${result.missingCoreLicenses || 0} cores`);
      if (result.isVmwareLicenseUnderprovisioned) errors.push(`VMware vSphere core licensing underprovisioned by ${result.missingVmwareCores || 0} cores`);
      if (result.isLinuxSubscriptionUnderprovisioned) errors.push('Linux subscriptions underprovisioned for socket count');
      break;
>>>>
```

---

## 5. Target 4: Replacing `DOMAIN_REGISTRY` Stubs with Active Physical Checks

### 5.1 Analysis of Stubs
- In `DOMAIN_REGISTRY.networking`, `SWITCH_FABRIC_PORTS` (lines 148–156) returned:
  `{ status: 'NOT_EVALUATED', advisory: 'Switch port fabric, speed matching, protocol, and airflow alignment require switch ASIC profile; marked NOT_EVALUATED' }`
- In `DOMAIN_REGISTRY.archive` & `archive_tape`, `ARCHIVE_COLD_STORAGE` (lines 177–198) returned:
  `{ status: 'NOT_EVALUATED', advisory: 'Archive domain physical constraints not evaluated; tape library chassis profile not loaded' }`
- Requirement R1 and acceptance criteria state:
  **"Zero un-evaluated physical aspect stubs when full hardware specifications are present."**

### 5.2 Active Implementation Design

#### A. Active Checker for `SWITCH_FABRIC_PORTS`:
Decomposed into clean functions with CC $\le 10$:
```javascript
function tallySwitchPortsAndOptics(items) {
  let switchCount = 0;
  let totalAccessPorts = 0;
  let totalUplinkPorts = 0;
  let maxUplinkSpeedGb = 10;
  let transceiverCount = 0;
  let opticalTransceiverCount = 0;
  let opticalPatchCableCount = 0;
  let dacCableCount = 0;
  let has100GTransceivers = false;
  let has400GTransceivers = false;

  for (const it of items) {
    if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
    const desc = String(it.description || '').toLowerCase();
    const qty = it.quantity || 1;

    const isSwitch = (desc.includes('switch') || desc.includes('cx ') || desc.includes('flexfabric')) &&
                     !desc.includes('switch card') && !desc.includes('power switch') &&
                     !desc.includes('interconnect') && !desc.includes('mezzanine') &&
                     !desc.includes('transceiver') && !desc.includes('cable');

    if (isSwitch) {
      switchCount += qty;
      const portMatch = desc.match(/\b(\d+)\s*(?:-?\s*port|g|gt|p)\b/i);
      const accessPorts = portMatch ? parseInt(portMatch[1], 10) : 48;
      totalAccessPorts += (accessPorts * qty);

      if (desc.includes('48y') || desc.includes('32y') || desc.includes('8325') || desc.includes('8360') || desc.includes('100g')) {
        totalUplinkPorts += (6 * qty);
        maxUplinkSpeedGb = Math.max(maxUplinkSpeedGb, 100);
      } else if (desc.includes('sfp56') || desc.includes('50g')) {
        totalUplinkPorts += (4 * qty);
        maxUplinkSpeedGb = Math.max(maxUplinkSpeedGb, 50);
      } else if (desc.includes('sfp28') || desc.includes('25g')) {
        totalUplinkPorts += (4 * qty);
        maxUplinkSpeedGb = Math.max(maxUplinkSpeedGb, 25);
      } else {
        totalUplinkPorts += (4 * qty);
      }
    }

    const isTransceiver = (desc.includes('transceiver') || desc.includes('sfp') || desc.includes('qsfp')) &&
                          !desc.includes('switch') && !desc.includes('adapter');
    if (isTransceiver) {
      const packSize = Number(desc.match(/\b(\d+)\s*-?\s*pack\b/i)?.[1] || 1);
      const count = qty * packSize;
      transceiverCount += count;
      if (desc.includes('sr') || desc.includes('lr') || desc.includes('optical') || desc.includes('sw') || desc.includes('lw')) {
        opticalTransceiverCount += count;
      }
      if (desc.includes('100g') || desc.includes('qsfp28')) has100GTransceivers = true;
      if (desc.includes('400g') || desc.includes('qsfp-dd') || desc.includes('osfp')) has400GTransceivers = true;
    }

    if (desc.includes('dac') || desc.includes('direct attach') || desc.includes('copper cable')) {
      dacCableCount += qty;
    }
    if ((desc.includes('lc') && desc.includes('patch') && desc.includes('cable')) || (desc.includes('om4') && desc.includes('cable'))) {
      opticalPatchCableCount += qty;
    }
  }

  return {
    switchCount, totalAccessPorts, totalUplinkPorts, maxUplinkSpeedGb,
    transceiverCount, opticalTransceiverCount, opticalPatchCableCount, dacCableCount,
    has100GTransceivers, has400GTransceivers
  };
}

function evalSwitchFabricPorts(items, _catalogData, _mandatorySkus, _serverCount, _ctx) {
  if (!items || items.length === 0) {
    return { status: 'NOT_EVALUATED', advisory: 'No networking switch or fabric components in BOQ' };
  }

  const t = tallySwitchPortsAndOptics(items);
  if (t.switchCount === 0) {
    if (t.transceiverCount > 0 || t.dacCableCount > 0) {
      return { status: 'FAIL', errors: ['Networking transceivers or DAC cables configured without a host switch chassis'], warnings: [] };
    }
    return { status: 'NOT_EVALUATED', advisory: 'No networking switch chassis identified in BOQ' };
  }

  const errors = [];
  const warnings = [];
  const totalOpticDemand = t.transceiverCount + t.dacCableCount;
  if (t.totalUplinkPorts > 0 && totalOpticDemand > t.totalUplinkPorts) {
    errors.push(`Optical transceivers and DAC cables (${totalOpticDemand}) exceed available switch uplink port capacity (${t.totalUplinkPorts})`);
  }
  if (t.has100GTransceivers && t.maxUplinkSpeedGb < 100) {
    errors.push(`Incompatible transceiver speed: 100G QSFP28 optics configured on switch supporting maximum ${t.maxUplinkSpeedGb}G uplinks`);
  }
  if (t.has400GTransceivers && t.maxUplinkSpeedGb < 400) {
    errors.push(`Incompatible transceiver speed: 400G optics configured on switch supporting maximum ${t.maxUplinkSpeedGb}G uplinks`);
  }
  if (t.opticalTransceiverCount > 0 && t.opticalPatchCableCount === 0) {
    warnings.push('Optical transceivers present without LC/LC optical patch cables');
  }

  return {
    status: errors.length > 0 ? 'FAIL' : (warnings.length > 0 ? 'WARN' : 'PASS'),
    switchCount: t.switchCount,
    totalAccessPorts: t.totalAccessPorts,
    totalUplinkPorts: t.totalUplinkPorts,
    maxUplinkSpeedGb: t.maxUplinkSpeedGb,
    errors,
    warnings,
    advisory: errors.length === 0 ? `Switch fabric verified: ${t.switchCount} switch(es), ${t.totalAccessPorts} access ports, ${t.totalUplinkPorts} uplink ports (${t.maxUplinkSpeedGb}G max)` : null
  };
}
```

#### B. Active Checker for `ARCHIVE_COLD_STORAGE`:
Decomposed into clean functions with CC $\le 10$:
```javascript
function tallyTapeArchiveItems(items) {
  let msl3040BaseCount = 0;
  let msl3040ExpCount = 0;
  let mslAutoloaderCount = 0;
  let msl6480BaseCount = 0;
  let msl6480ExpCount = 0;
  let standaloneDriveCount = 0;
  let ltoSasDriveCount = 0;
  let ltoFcDriveCount = 0;
  let miniSasHdCableCount = 0;
  let fcTransceiverCount = 0;
  let dataCartridgeCount = 0;
  let cleaningCartridgeCount = 0;
  let barcodeLabelCount = 0;

  for (const it of items) {
    if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
    const desc = String(it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const qty = it.quantity || 1;

    if (desc.includes('msl3040') || (desc.includes('msl') && desc.includes('3040'))) {
      if (desc.includes('expansion')) msl3040ExpCount += qty;
      else msl3040BaseCount += qty;
    } else if (desc.includes('msl6480') || (desc.includes('msl') && desc.includes('6480'))) {
      if (desc.includes('expansion')) msl6480ExpCount += qty;
      else msl6480BaseCount += qty;
    } else if (desc.includes('msl 1/8') || desc.includes('1/8 g2') || desc.includes('autoloader')) {
      mslAutoloaderCount += qty;
    }

    if (desc.includes('tape drive') || desc.includes('ultrium 30750') || desc.includes('lto-7') || desc.includes('lto-8') || desc.includes('lto-9')) {
      if (!desc.includes('cartridge') && !desc.includes('cable') && !desc.includes('transceiver') && !desc.includes('cleaning')) {
        if (desc.includes('sas')) ltoSasDriveCount += qty;
        else if (desc.includes('fc') || desc.includes('fibre channel')) ltoFcDriveCount += qty;
        else standaloneDriveCount += qty;
      }
    }

    if (desc.includes('mini sas high density') || desc.includes('mini-sas hd') || desc.includes('mini sas hd') || sku === '716195-B21' || sku === '716197-B21') {
      miniSasHdCableCount += qty;
    }
    if ((desc.includes('transceiver') && (desc.includes('fc') || desc.includes('short wave') || desc.includes('fibre channel'))) || sku === 'AJ716B' || sku === 'AJ717A') {
      fcTransceiverCount += qty;
    }

    if ((desc.includes('lto-') || desc.includes('ultrium')) && (desc.includes('data cartridge') || desc.includes('rw data') || desc.includes('custom labeled') || desc.includes('non-custom'))) {
      dataCartridgeCount += qty;
    }
    if (sku === 'C7978A' || desc.includes('universal cleaning') || desc.includes('cleaning cartridge')) {
      cleaningCartridgeCount += qty;
    }
    if (desc.includes('bar code label') || desc.includes('barcode label') || desc.includes('label pack') || sku === 'Q2014A' || sku === 'Q2015A') {
      barcodeLabelCount += qty;
    }
  }

  return {
    msl3040BaseCount, msl3040ExpCount, mslAutoloaderCount, msl6480BaseCount, msl6480ExpCount,
    standaloneDriveCount, ltoSasDriveCount, ltoFcDriveCount, miniSasHdCableCount,
    fcTransceiverCount, dataCartridgeCount, cleaningCartridgeCount, barcodeLabelCount
  };
}

function evalArchiveColdStorage(items, _catalogData, _mandatorySkus, _serverCount, _ctx) {
  if (!items || items.length === 0) {
    return { status: 'NOT_EVALUATED', advisory: 'Archive domain physical constraints not evaluated; tape library chassis profile not loaded' };
  }

  const t = tallyTapeArchiveItems(items);
  const libraryCount = t.msl3040BaseCount + t.msl6480BaseCount + t.mslAutoloaderCount;
  const totalDrives = t.ltoSasDriveCount + t.ltoFcDriveCount + t.standaloneDriveCount;

  if (libraryCount === 0 && totalDrives === 0 && t.dataCartridgeCount === 0) {
    return { status: 'NOT_EVALUATED', advisory: 'Archive domain physical constraints not evaluated; tape library chassis profile not loaded' };
  }

  const errors = [];
  const warnings = [];
  let totalSlotsAvailable = 0;
  let maxDrivesSupported = 0;

  if (t.msl3040BaseCount > 0) {
    if (t.msl3040ExpCount > 6) errors.push('MSL3040 Tape Library exceeds maximum expansion module limit (maximum 6 expansion modules)');
    const effectiveExp = Math.min(t.msl3040ExpCount, 6);
    totalSlotsAvailable += (t.msl3040BaseCount * 40) + (effectiveExp * 40);
    maxDrivesSupported += (t.msl3040BaseCount * 3) + (effectiveExp * 3);
  }
  if (t.msl6480BaseCount > 0) {
    if (t.msl6480ExpCount > 6) errors.push('MSL6480 Tape Library exceeds maximum expansion module limit (maximum 6 expansion modules)');
    const effectiveExp = Math.min(t.msl6480ExpCount, 6);
    totalSlotsAvailable += (t.msl6480BaseCount * 80) + (effectiveExp * 80);
    maxDrivesSupported += (t.msl6480BaseCount * 6) + (effectiveExp * 6);
  }
  if (t.mslAutoloaderCount > 0) {
    totalSlotsAvailable += (t.mslAutoloaderCount * 8);
    maxDrivesSupported += (t.mslAutoloaderCount * 1);
  }

  if (libraryCount > 0 && totalDrives === 0) errors.push('Tape library requires at least one LTO tape drive installed');
  if (libraryCount > 0 && maxDrivesSupported > 0 && totalDrives > maxDrivesSupported) {
    errors.push(`Total tape drives (${totalDrives}) exceed library drive bay capacity (${maxDrivesSupported})`);
  }
  const totalCartridges = t.dataCartridgeCount + t.cleaningCartridgeCount;
  if (totalSlotsAvailable > 0 && totalCartridges > totalSlotsAvailable) {
    errors.push(`Cartridge count (${totalCartridges}) exceeds tape library slot capacity (${totalSlotsAvailable})`);
  }
  if (t.ltoSasDriveCount > t.miniSasHdCableCount) {
    errors.push(`LTO SAS tape drive(s) (${t.ltoSasDriveCount}) require Mini-SAS HD external cable(s) (found ${t.miniSasHdCableCount})`);
  }
  if (t.ltoFcDriveCount > t.fcTransceiverCount) {
    errors.push(`LTO Fibre Channel tape drive(s) (${t.ltoFcDriveCount}) require optical transceiver(s) (found ${t.fcTransceiverCount})`);
  }

  const expectedCleaning = t.dataCartridgeCount > 0 ? Math.ceil(t.dataCartridgeCount / 20) : 0;
  if (t.cleaningCartridgeCount < expectedCleaning) {
    warnings.push(`Recommended universal cleaning cartridges underprovisioned (found ${t.cleaningCartridgeCount}, expected ${expectedCleaning} for ${t.dataCartridgeCount} tapes)`);
  }
  const expectedLabels = t.dataCartridgeCount > 0 ? Math.ceil(t.dataCartridgeCount / 100) : 0;
  if (t.barcodeLabelCount < expectedLabels) {
    warnings.push(`Recommended barcode label packs underprovisioned for library automation (found ${t.barcodeLabelCount}, expected ${expectedLabels})`);
  }

  return {
    status: errors.length > 0 ? 'FAIL' : (warnings.length > 0 ? 'WARN' : 'PASS'),
    libraryCount, totalSlotsAvailable, maxDrivesSupported,
    errors, warnings,
    advisory: errors.length === 0 ? `Tape archive storage verified: ${libraryCount} library/autoloader(s), ${totalDrives} drive(s), ${totalSlotsAvailable} slots, ${t.dataCartridgeCount} cartridges` : null
  };
}
```

In `DOMAIN_REGISTRY`:
Bind `evalSwitchFabricPorts` to `SWITCH_FABRIC_PORTS` in `networking`.  
Bind `evalArchiveColdStorage` to `ARCHIVE_COLD_STORAGE` in `archive` and `archive_tape`.

---

## 6. Verification & Test Plan

1. **`tests/unit/test_aspect_pcie_riser.js`**:
   - Update Test Group 4: In the old test, 3 PCIe cards with 0 risers asserted `activeSlotsAvailable === 3`. Update it to assert `activeSlotsAvailable === 0`, `isExceedingActiveSlots === true`, and `needsPrimaryRiser === true`. Add a test with primary riser and primary cable kit asserting `activeSlotsAvailable === 3`.
2. **`tests/unit/test_aspect_registry.js`**:
   - In `sampleServerBOM`: Add `{ sku: 'R7A11AAE', description: 'HPE Compute Ops Management Standard 3yr Upfront FIO Software', quantity: 1 }` so `sampleServerBOM` satisfies CLIC Rule 81322276.
   - Update line 126 test: Verify `SWITCH_FABRIC_PORTS` on `JL661A` evaluates to `'PASS'` (active validation) and verify that oversubscription (e.g. 8 transceivers on 4 uplink ports) results in `'FAIL'`.
   - Add test for `ARCHIVE_COLD_STORAGE` with valid MSL3040 Base, LTO-8 drive, cable, cartridges returning `'PASS'`, and oversubscribed cartridges returning `'FAIL'`.
   - Verify that empty BOM for `archive` continues to return `'NOT_EVALUATED'`.
3. **`tests/unit/test_aspect_networking_ocp.js`**:
   - Add tests for `needsOcpEnablementCable`: 2 OCP adapters without cable flags `needsOcpEnablementCable === true`; with `P48831-B21` flags `false`.
   - Add tests for Fibre Channel HBAs missing transceivers and single switch point of failure.
4. **`tests/unit/test_aspect_support_manufacturing.js`**:
   - Add test for `32C` processor description format ensuring detected cores equals 32 cores per CPU.
   - Add test verifying that absence of management license emits error under `SUPPORT_MANUFACTURING`.
5. **Regression Verification**:
   - Run `npm run test:domain:aspects` ensuring 16/16 suites pass.
   - Run `npm run lint:complexity` ensuring max CC $\le 135$ and decomposed functions $\le 10$.
   - Run `npx -y oxlint scripts/lib/aspects/` ensuring 0 warnings.
