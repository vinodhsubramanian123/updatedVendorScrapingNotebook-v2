# Handoff Report: Milestone 1, Sub-area B
## Storage Tri-Mode & Power Environment Normalization

**Working Directory:** `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m1_2`  
**Explorer:** Explorer M1_2 (`teamwork_preview_explorer`)  
**Parent Agent:** `06cb5c88-e2a4-407d-9438-e05cab02c2f3`  
**Date:** 2026-10-27  
**Status:** Hard Handoff (Investigation Complete & Ready for Worker Implementation)

---

## 1. Observation

Direct code observations from files under `scripts/lib/aspects/` and test suites:

### Observation 1.1: Dropped Property Returns in `storage_tri_mode.js`
In `scripts/lib/aspects/aspect_registry.js` lines 292–298:
```javascript
292:     case 'STORAGE_TRI_MODE':
293:       if (result.hasIncompatibleYCable) errors.push('Tri-Mode Splitter Cable Kit is incompatible with standard cages');
294:       if (result.needsSasExpander) errors.push('SAS Expander required for configuration exceeding 8 drives');
295:       if (result.needsCableKit) errors.push('Storage controller cable kit required');
296:       if (result.needsSmartStorageBattery) errors.push('Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup');
297:       if (result.isBackplaneCapacityExceeded) errors.push('Drive count exceeds chassis backplane capacity');
298:       break;
```
In `scripts/lib/aspects/storage_tri_mode.js` lines 310–317:
```javascript
310:     needsSasExpander: cabling.needsSasExpander,
311:     needsDriveCageForController: cabling.needsDriveCageForController,
312:     hasControllerNoDriveConflict: cabling.hasControllerNoDriveConflict,
313:     needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
314:     needsCapacitorCable: cabling.needsCapacitorCable,
315:     controllerDirectCapacity: cabling.controllerDirectCapacity,
316:     conflictingCableItems: t.conflictingCableItems,
```
**Finding:** `needsCableKit` and `isBackplaneCapacityExceeded` are checked by `aspect_registry.js` on lines 295 and 297, but are **never returned or exported** by `evalStorageTriMode`.

### Observation 1.2: 16 Dropped Diagnostic Checks in `aspect_registry.js`
In `scripts/lib/aspects/storage_tri_mode.js` lines 325–342:
`evalStorageTriMode` computes and exports:
- `hasMissingControllerNode` (line 325)
- `hasAsymmetricHbas` (line 326)
- `missingDaisyChainCables` (line 327)
- `insufficientRaid6Drives` (line 328)
- `insufficientRaid10Drives` (line 329)
- `hasD3940ConnectivityError` (line 330)
- `needsMiniSasHdCable` (line 333)
- `needsFcTransceiver` (line 334)
- `exceedsMaxMsl3040Slots` (line 336)
- `exceedsSlotCapacity` (line 337)
- `hasLffDrivesInSffChassis` (line 340)
- `hasDriveCageMixingConflict` (line 341)
- `hasMr216iORaid56Risk` (line 342)
- `needsDriveCageForController` (line 311)
- `hasControllerNoDriveConflict` (line 312)
- `needsCapacitorCable` (line 314)

**Finding:** `aspect_registry.js` lines 292–298 **drops all 16 of these diagnostic checks**. Severely conflicted configurations (e.g. LFF drives in Sff chassis, Alletra single node, tape missing transceiver, controller with No Drive kit) evaluate as `PASS`.

### Observation 1.3: Hardcoded 800W PSU Initialization in `power_environment.js`
In `scripts/lib/aspects/power_environment.js` line 204:
```javascript
194: function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}, serverCount = 1) {
195:   const tally = {
...
203:     psuCount: 0,
204:     maxPsuWattage: 800,
205:     psuWattages: new Set(),
```
And in `tallyPsuAndCabling` lines 103–106:
```javascript
103:     if (psuWMatch) {
104:       const w = parseInt(psuWMatch[1], 10);
105:       if (w > tally.maxPsuWattage) tally.maxPsuWattage = w;
106:       tally.psuWattages.add(w);
107:     }
```
**Finding:** If 0 PSUs exist, `maxPsuWattage` is 800W. If 500W PSUs exist, $500 \ngtr 800$, so `maxPsuWattage` remains 800W, masking undersized power supplies.

### Observation 1.4: Dropped Wattage and Headroom Deficit Checks
In `scripts/lib/aspects/power_environment.js` lines 241–242:
```javascript
241:   const hasPsuHeadroomDeficit = tally.psuCount > 0 && tally.maxPsuWattage < requiredWattageWithHeadroom;
242:   const hasPsuWattageDeficit = tally.psuCount > 0 && tally.maxPsuWattage < estimatedNodeWattage;
```
In `scripts/lib/aspects/aspect_registry.js` lines 315–323:
```javascript
315:     case 'POWER_ENVIRONMENT':
316:       if (result.hasMixedAcDcPower) errors.push('AC and -48VDC power supplies cannot be mixed');
317:       if (result.hasMixedWattagePsus) errors.push('Power supplies must have matching wattages in redundant pairs');
318:       if (result.hasMixedEfficiencyPsus) errors.push('Platinum and Titanium PSU efficiencies cannot be mixed');
319:       if (result.hasDl380aGpuPsuShortage) errors.push('GPU configuration lacks the profile-required redundant power supplies');
320:       if (result.hasSynergyRedundantPowerError) errors.push('Synergy frame requires 6 Titanium PSUs for N+N redundancy');
321:       if (result.hasDcPowerSupply && !result.hasDcLugKit) errors.push('-48VDC Power Supply requires DC Power Cable Lug Kit');
322:       if (result.needsCeRemovalKit) warnings.push('EU ErP Lot 9 requires CE Mark Removal Kit for 94% Platinum PSUs');
323:       break;
```
**Finding:** `hasPsuWattageDeficit` and `hasPsuHeadroomDeficit` are never inspected in `aspect_registry.js`. A server requiring 1400W with dual 500W PSUs evaluates as `status: 'PASS'`. Moreover, if `psuCount === 0`, all checks evaluate to false, resulting in an optimistic `status: 'PASS'` for a server with 0 power supplies.

---

## 2. Logic Chain

1. **Storage Tri-Mode Return Contract Binding**:
   - `aspect_registry.js` already checks `result.needsCableKit` and `result.isBackplaneCapacityExceeded` (Obs 1.1).
   - In `storage_tri_mode.js`, a server hardware storage controller connects to front cages via a controller enablement cable kit or Tri-Mode Y-cable. If `isServerChassis && t.hasStorageController && !hasControllerCable`, `needsCableKit` must be `true`.
   - In `storage_tri_mode.js`, drive cages provide discrete physical slot capacities (8 SFF per standard cage, 4 per DL380a cage, 4/12 per LFF cage). When `perNodeDrives > perNodeBackplaneCapacity`, `isBackplaneCapacityExceeded` must be `true`.
   - Returning both properties from `evalStorageTriMode` directly satisfies lines 295 & 297 in `aspect_registry.js`.

2. **Diagnostic Error Aggregation Binding**:
   - All 16 diagnostic checks are already computed in `storage_tri_mode.js` (Obs 1.2).
   - Binding each check into `normalizeStorageTriModeResult` with clear, unambiguous domain diagnostic messages (e.g. `'LFF 3.5-inch drives cannot be installed in SFF chassis'`) prevents silent invalid configurations from passing.
   - Decomposing this into `normalizeStorageEnterpriseDiagnostics` keeps cyclomatic complexity $\le 10$.

3. **Power Environment Deficit & Headroom Binding**:
   - Setting `maxPsuWattage: 0` initially (Obs 1.3) allows 500W PSUs to register accurately and ensures 0-PSU configurations reflect 0W capacity.
   - Falling back to 800W only when `tally.psuCount > 0 && tally.maxPsuWattage === 0` preserves graceful handling of unparsed PSU descriptions while preventing 0-PSU masking.
   - Checking `result.psuCount === 0 && !result.hasIntegratedPower` in `aspect_registry.js` (Obs 1.4) enforces mandatory power supply existence while allowing integrated storage platforms (Alletra, StoreEver) to pass.
   - Checking `result.hasPsuWattageDeficit` emits an `ERROR` when PSU capacity is below estimated system power.
   - Checking `result.hasPsuHeadroomDeficit` emits a `WARNING` when installed wattage provides $<20\%$ safety headroom above peak load.

---

## 3. Caveats

1. **Integrated Storage Enclosures**: Alletra 9000/6000 storage arrays and StoreEver tape libraries feature factory-integrated power supplies in their base controller enclosures; they do not require standalone Flex Slot PSU line items. The implementation detects `hasIntegratedPower = Boolean(tally.isAlletraStorage || tally.isStoreEverTape)` to avoid false-positive PSU shortage rejections.
2. **`sampleServerBOM` in `test_aspect_registry.js`**: The existing test `test_aspect_registry.js` lines 40–46 specified a sample BOM containing 2 CPUs, 16 DIMMs, 1 fan kit, 2 heatsinks, but **0 power supplies**. Under the mandatory component non-zero assertion, this test must be updated to include 2x 800W Platinum PSUs (`P03178-B21`) so that the baseline server BOM evaluates as buildable.

---

## 4. Conclusion & Exact Recommended Changes

### Recommended Change 1: `scripts/lib/aspects/storage_tri_mode.js`

#### Diff Recommendation 1.1: Tally Cage Capacity in `tallyCagesAndDrives`
**Target File:** `scripts/lib/aspects/storage_tri_mode.js`  
**Lines:** 36–62  
```javascript
<<<<
  // Drive Cage & Backplane Kits
  const isGenericCage = desc.includes('drive cage') || desc.includes('sff cage') || desc.includes('lff cage') || 
      desc.includes('cage kit') || desc.includes('box 1') || desc.includes('box 2') || 
      desc.includes('backplane') || desc.includes('backplane kit') ||
      (mandatorySkus?.GENERIC_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku));
  if (isGenericCage && !desc.includes('premium') && !desc.includes('u.3 prem')) {
    tally.hasDriveCage = true;
  }
  if (desc.includes('u.3 prem') || desc.includes('premium kit') || desc.includes('premium cage') || 
      (mandatorySkus?.PREMIUM_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.PREMIUM_CAGE.sku))) {
    tally.hasDriveCage = true;
    tally.hasPremiumCage = true;
  }
  // DL380a drive cage tracking (Rule 81016788)
  if ((desc.includes('4sff') && desc.includes('dl380a')) || (mandatorySkus?.GENERIC_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku) && desc.includes('4sff'))) {
    tally.has4SffCage = true;
    tally.hasDriveCage = true;
  }
  if ((desc.includes('4edsff') && desc.includes('dl380a')) || (mandatorySkus?.PREMIUM_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.PREMIUM_CAGE.sku) && desc.includes('4edsff'))) {
    tally.has4EdsffCage = true;
    tally.hasDriveCage = true;
  }
  if (desc.includes('12lff') || desc.includes('4lff') || desc.includes('8lff') || (role === 'Chassis' && desc.includes('lff'))) {
    tally.isLffChassis = true;
    tally.hasDriveCage = true;
  }
====
  // Drive Cage & Backplane Kits
  const isGenericCage = desc.includes('drive cage') || desc.includes('sff cage') || desc.includes('lff cage') || 
      desc.includes('cage kit') || desc.includes('box 1') || desc.includes('box 2') || 
      desc.includes('backplane') || desc.includes('backplane kit') ||
      (mandatorySkus?.GENERIC_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku));
  if (isGenericCage && !desc.includes('premium') && !desc.includes('u.3 prem')) {
    tally.hasDriveCage = true;
    tally.cageCapacity = (tally.cageCapacity || 0) + (8 * qty);
  }
  if (desc.includes('u.3 prem') || desc.includes('premium kit') || desc.includes('premium cage') || 
      (mandatorySkus?.PREMIUM_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.PREMIUM_CAGE.sku))) {
    tally.hasDriveCage = true;
    tally.hasPremiumCage = true;
    tally.cageCapacity = (tally.cageCapacity || 0) + (8 * qty);
  }
  // DL380a drive cage tracking (Rule 81016788)
  if ((desc.includes('4sff') && desc.includes('dl380a')) || (mandatorySkus?.GENERIC_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku) && desc.includes('4sff'))) {
    tally.has4SffCage = true;
    tally.hasDriveCage = true;
    tally.cageCapacity = (tally.cageCapacity || 0) + (4 * qty);
  }
  if ((desc.includes('4edsff') && desc.includes('dl380a')) || (mandatorySkus?.PREMIUM_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.PREMIUM_CAGE.sku) && desc.includes('4edsff'))) {
    tally.has4EdsffCage = true;
    tally.hasDriveCage = true;
    tally.cageCapacity = (tally.cageCapacity || 0) + (4 * qty);
  }
  if (desc.includes('12lff') || desc.includes('4lff') || desc.includes('8lff') || (role === 'Chassis' && desc.includes('lff'))) {
    tally.isLffChassis = true;
    tally.hasDriveCage = true;
    const lffBays = desc.includes('12lff') ? 12 : (desc.includes('8lff') ? 8 : 4);
    tally.cageCapacity = (tally.cageCapacity || 0) + (lffBays * qty);
  }
  if ((role === 'Chassis' || desc.includes('cto server') || desc.includes('base system') || desc.includes('chassis')) && desc.includes('8sff')) {
    tally.hasDriveCage = true;
    tally.cageCapacity = (tally.cageCapacity || 0) + (8 * qty);
  }
>>>>
```

#### Diff Recommendation 1.2: Add `calculateBackplaneCapacity` and Update `validateStorageCablingAndBackplane`
**Target File:** `scripts/lib/aspects/storage_tri_mode.js`  
**Lines:** 255–268  
```javascript
<<<<
function validateStorageCablingAndBackplane(t, serverCount = 1) {
  const nodes = Math.max(1, serverCount || 1);
  const perNodeDrives = t.driveCount / nodes;
  const controllerDirectCapacity = t.hasStorageController ? (t.has16PortController ? 16 : 8) : 0;
  const isServerChassis = !t.isAlletraArray && !t.ltoSasDriveCount && !t.ltoFcDriveCount && !t.msl3040BaseModuleCount;
  return {
    controllerDirectCapacity,
    needsSasExpander: t.hasStorageController && perNodeDrives > controllerDirectCapacity && !t.hasSasExpander && !t.hasTriModeSwitch,
    hasIncompatibleYCable: t.hasYCable && (!t.hasPcieController || !t.hasPremiumCage),
    needsCapacitorCable: t.hasSmartBattery && !t.hasOcpCable,
    needsDriveCageForController: isServerChassis && !t.isLffChassis && t.hasStorageController && !t.hasDriveCage && !t.has4SffCage && !t.has4EdsffCage,
    hasControllerNoDriveConflict: isServerChassis && t.hasStorageController && t.hasNoDriveKit
  };
}
====
function calculateBackplaneCapacity(t, serverCount = 1) {
  const nodes = Math.max(1, serverCount || 1);
  if (t.isAlletraArray) {
    return (24 + (t.expansionShelfCount * 24)) * nodes;
  }
  if (t.has4SffCage || t.has4EdsffCage) {
    return 4 * nodes;
  }
  if (t.isLffChassis) {
    return (t.cageCapacity > 0 ? t.cageCapacity : 12) * nodes;
  }
  if (t.cageCapacity > 0) {
    return t.cageCapacity;
  }
  return 8 * nodes;
}

function validateStorageCablingAndBackplane(t, serverCount = 1) {
  const nodes = Math.max(1, serverCount || 1);
  const perNodeDrives = t.driveCount / nodes;
  const controllerDirectCapacity = t.hasStorageController ? (t.has16PortController ? 16 : 8) : 0;
  const isServerChassis = !t.isAlletraArray && !t.ltoSasDriveCount && !t.ltoFcDriveCount && !t.msl3040BaseModuleCount;
  const backplaneCapacity = calculateBackplaneCapacity(t, nodes);
  const perNodeBackplaneCapacity = backplaneCapacity / nodes;

  const hasControllerCable = t.hasOcpCable || (t.hasYCable && !t.hasIncompatibleYCable);
  const needsCableKit = Boolean(isServerChassis && t.hasStorageController && !hasControllerCable);
  const isBackplaneCapacityExceeded = Boolean(isServerChassis && perNodeDrives > perNodeBackplaneCapacity);

  return {
    controllerDirectCapacity,
    needsSasExpander: t.hasStorageController && perNodeDrives > controllerDirectCapacity && !t.hasSasExpander && !t.hasTriModeSwitch,
    hasIncompatibleYCable: t.hasYCable && (!t.hasPcieController || !t.hasPremiumCage),
    needsCapacitorCable: t.hasSmartBattery && !t.hasOcpCable,
    needsDriveCageForController: isServerChassis && !t.isLffChassis && t.hasStorageController && !t.hasDriveCage && !t.has4SffCage && !t.has4EdsffCage,
    hasControllerNoDriveConflict: isServerChassis && t.hasStorageController && t.hasNoDriveKit,
    needsCableKit,
    isBackplaneCapacityExceeded,
    backplaneCapacity
  };
}
>>>>
```

#### Diff Recommendation 1.3: Export `needsCableKit` and `isBackplaneCapacityExceeded` from `evalStorageTriMode`
**Target File:** `scripts/lib/aspects/storage_tri_mode.js`  
**Lines:** 310–317  
```javascript
<<<<
    needsSasExpander: cabling.needsSasExpander,
    needsDriveCageForController: cabling.needsDriveCageForController,
    hasControllerNoDriveConflict: cabling.hasControllerNoDriveConflict,
    needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
    needsCapacitorCable: cabling.needsCapacitorCable,
    controllerDirectCapacity: cabling.controllerDirectCapacity,
    conflictingCableItems: t.conflictingCableItems,
====
    needsSasExpander: cabling.needsSasExpander,
    needsDriveCageForController: cabling.needsDriveCageForController,
    hasControllerNoDriveConflict: cabling.hasControllerNoDriveConflict,
    needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
    needsCapacitorCable: cabling.needsCapacitorCable,
    needsCableKit: cabling.needsCableKit,
    isBackplaneCapacityExceeded: cabling.isBackplaneCapacityExceeded,
    backplaneCapacity: cabling.backplaneCapacity,
    controllerDirectCapacity: cabling.controllerDirectCapacity,
    conflictingCableItems: t.conflictingCableItems,
>>>>
```

---

### Recommended Change 2: `scripts/lib/aspects/power_environment.js`

#### Diff Recommendation 2.1: Detect Integrated Storage / Tape Power
**Target File:** `scripts/lib/aspects/power_environment.js`  
**Lines:** 80–85  
```javascript
<<<<
  if (fullDesc.includes('synergy') && fullDesc.includes('12000') && (fullDesc.includes('frame') || fullDesc.includes('configure-to-order'))) {
    tally.isSynergy12000Frame = true;
  }
====
  if (fullDesc.includes('synergy') && fullDesc.includes('12000') && (fullDesc.includes('frame') || fullDesc.includes('configure-to-order'))) {
    tally.isSynergy12000Frame = true;
  }
  if (fullDesc.includes('alletra')) {
    tally.isAlletraStorage = true;
  }
  if (fullDesc.includes('storeever') || fullDesc.includes('msl3040')) {
    tally.isStoreEverTape = true;
  }
>>>>
```

#### Diff Recommendation 2.2: Line 204 Fix & Fallback
**Target File:** `scripts/lib/aspects/power_environment.js`  
**Lines:** 203–205 and 237–239  
```javascript
<<<<
    psuCount: 0,
    maxPsuWattage: 800,
    psuWattages: new Set(),
====
    psuCount: 0,
    maxPsuWattage: 0,
    psuWattages: new Set(),
>>>>
```
And right after the items processing loop (around line 238):
```javascript
<<<<
    tallyPowerHardware(tally, it, desc, sku, role, dcLugSku, skuIndex, mandatorySkus);
  }

  const estimatedNodeWattage = totalHardwareWatts + 150;
====
    tallyPowerHardware(tally, it, desc, sku, role, dcLugSku, skuIndex, mandatorySkus);
  }

  if (tally.psuCount > 0 && tally.maxPsuWattage === 0) {
    tally.maxPsuWattage = 800;
  }

  const estimatedNodeWattage = totalHardwareWatts + 150;
>>>>
```

#### Diff Recommendation 2.3: Export `hasIntegratedPower` and `minPsusRequired`
**Target File:** `scripts/lib/aspects/power_environment.js`  
**Lines:** 280–283  
```javascript
<<<<
    isDl145EdgeChassis: tally.isDl145EdgeChassis,
    hasDl145PsuOversizing: checkDl145PsuOversizing(tally)
  };
====
    isDl145EdgeChassis: tally.isDl145EdgeChassis,
    hasDl145PsuOversizing: checkDl145PsuOversizing(tally),
    hasIntegratedPower: Boolean(tally.isAlletraStorage || tally.isStoreEverTape),
    minPsusRequired: Math.max(1, serverCount || 1),
    hasZeroPsus: tally.psuCount === 0
  };
>>>>
```

---

### Recommended Change 3: `scripts/lib/aspects/aspect_registry.js`

#### Diff Recommendation 3.1: Add Decomposed Normalizers and Bind 16 Checks + Power Deficits
**Target File:** `scripts/lib/aspects/aspect_registry.js`  
**Lines:** 271–324  
```javascript
<<<<
  switch (id) {
    case 'COMPUTE_THERMAL':
      if (result.needsHeatsink) errors.push('Missing required processor heatsink');
      if (result.hasMixedCpuModels) errors.push('Dual processor models or stepping mismatch (mixed CPU models)');
      if (result.needsDirectLiquidCooling) errors.push('Direct Liquid Cooling required for high-TDP processor');
      if (result.needsHighPerfCooling) errors.push('High-TDP processor (>185W) requires High-Performance Fan Kit');
      if (result.fanKitExceedsMax) errors.push('Fan kit quantity exceeds maximum chassis capacity (CLIC Rule 81354654: max 1 fan kit per server)');
      break;

    case 'MEMORY_CHANNEL':
      if (result.hasBtoMemoryInCto) errors.push('Standalone BTO memory SKU is restricted in CTO base server');
      if (result.isInvalidChannelConfiguration) errors.push('Invalid memory channel population');
      if (result.memoryCount > 0 && result.isSupportedPopulation === false) errors.push('Unsupported asymmetric memory DIMM population');
      if (result.memoryCount > 0 && result.isBalancedChannel === false) warnings.push('Unbalanced memory channel interleaving bandwidth');
      break;

    case 'STORAGE_TRI_MODE':
      if (result.hasIncompatibleYCable) errors.push('Tri-Mode Splitter Cable Kit is incompatible with standard cages');
      if (result.needsSasExpander) errors.push('SAS Expander required for configuration exceeding 8 drives');
      if (result.needsCableKit) errors.push('Storage controller cable kit required');
      if (result.needsSmartStorageBattery) errors.push('Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup');
      if (result.isBackplaneCapacityExceeded) errors.push('Drive count exceeds chassis backplane capacity');
      break;

    case 'PCIE_RISER':
      if (result.isExceedingTotalSlots) errors.push('PCIe card count exceeds physical mechanical slot capacity');
      if (result.isExceedingActiveSlots) errors.push('PCIe card count exceeds electrically cabled active slots');
      if (result.needsPrimaryCableKit) errors.push('Primary riser cable kit required to activate Slot 1');
      if (result.needsSecondaryCableKit) warnings.push('Secondary riser cable kit required to activate secondary slots');
      if (result.needsSecondaryRiser) errors.push('Secondary PCIe riser card required');
      if (result.needsGpuPowerCableKit) errors.push('GPU auxiliary power cable kit required');
      break;

    case 'NETWORKING_OCP':
      if (result.isExceedingOcpSlots) errors.push('OCP adapter count exceeds chassis slot capacity');
      if (result.hasConflictingOcpCables) errors.push('Conflicting OCP enablement cables detected');
      if (result.hasSynergyFabricMismatch) errors.push('Synergy fabric mismatch detected');
      break;

    case 'POWER_ENVIRONMENT':
      if (result.hasMixedAcDcPower) errors.push('AC and -48VDC power supplies cannot be mixed');
      if (result.hasMixedWattagePsus) errors.push('Power supplies must have matching wattages in redundant pairs');
      if (result.hasMixedEfficiencyPsus) errors.push('Platinum and Titanium PSU efficiencies cannot be mixed');
      if (result.hasDl380aGpuPsuShortage) errors.push('GPU configuration lacks the profile-required redundant power supplies');
      if (result.hasSynergyRedundantPowerError) errors.push('Synergy frame requires 6 Titanium PSUs for N+N redundancy');
      if (result.hasDcPowerSupply && !result.hasDcLugKit) errors.push('-48VDC Power Supply requires DC Power Cable Lug Kit');
      if (result.needsCeRemovalKit) warnings.push('EU ErP Lot 9 requires CE Mark Removal Kit for 94% Platinum PSUs');
      break;
====
function normalizeStorageEnterpriseDiagnostics(result, errors, warnings) {
  if (result.hasMissingControllerNode) errors.push('Alletra storage array requires exactly two active controller nodes');
  if (result.hasAsymmetricHbas) errors.push('Alletra host bus adapters must be symmetric across controller nodes');
  if (result.missingDaisyChainCables) errors.push('Alletra expansion shelf requires redundant SAS daisy chain cables');
  if (result.insufficientRaid6Drives) errors.push('RAID 6 configuration requires at least 6 SSDs');
  if (result.insufficientRaid10Drives) errors.push('RAID 10 configuration requires at least 4 SSDs');
  if (result.hasD3940ConnectivityError) errors.push('Synergy D3940 storage module requires SAS Mezzanine card and SAS Connection Module');
  if (result.needsMiniSasHdCable) errors.push('StoreEver LTO SAS tape drive requires Mini-SAS HD cable');
  if (result.needsFcTransceiver) errors.push('StoreEver LTO Fibre Channel tape drive requires optical transceiver');
  if (result.exceedsMaxMsl3040Slots) errors.push('StoreEver MSL3040 tape library exceeds maximum limit of 6 expansion modules');
  if (result.exceedsSlotCapacity) errors.push('Data cartridge count exceeds available tape library slot capacity');
  if (result.hasLffDrivesInSffChassis) errors.push('LFF 3.5-inch drives cannot be installed in SFF chassis');
  if (result.hasDriveCageMixingConflict) errors.push('Cannot mix 4SFF and 4EDSFF drive cages in DL380a chassis (CLIC Rule 81016788)');
  if (result.hasMr216iORaid56Risk) warnings.push('MR216i-o controller lacks write cache; RAID 5/6 or write-intensive workloads require Smart Storage Battery');
  if (result.needsDriveCageForController) errors.push('Hardware storage controller requires physical drive cage and backplane cabling');
  if (result.hasControllerNoDriveConflict) errors.push('Hardware storage controller cannot be installed with No Drive FIO Kit');
  if (result.needsCapacitorCable) errors.push('Smart Storage Battery requires controller enablement cable kit (CLIC Rule 81354652)');
}

function normalizeStorageTriModeResult(result, errors, warnings) {
  if (result.hasIncompatibleYCable) errors.push('Tri-Mode Splitter Cable Kit is incompatible with standard cages');
  if (result.needsSasExpander) errors.push('SAS Expander required for configuration exceeding 8 drives');
  if (result.needsCableKit) errors.push('Storage controller cable kit required');
  if (result.needsSmartStorageBattery) errors.push('Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup');
  if (result.isBackplaneCapacityExceeded) errors.push('Drive count exceeds chassis backplane capacity');
  normalizeStorageEnterpriseDiagnostics(result, errors, warnings);
}

function normalizePowerEnvironmentResult(result, errors, warnings) {
  if (result.psuCount === 0 && !result.hasIntegratedPower) {
    errors.push('Power supply required: zero power supplies configured in BOQ');
  }
  if (result.minPsusRequired && result.psuCount > 0 && result.psuCount < result.minPsusRequired) {
    errors.push(`Insufficient power supplies: found ${result.psuCount}, required at least ${result.minPsusRequired}`);
  }
  if (result.hasPsuWattageDeficit) {
    errors.push(`Power supply wattage deficit: maximum PSU wattage (${result.maxPsuWattage || 0}W) is less than estimated system consumption (${result.estimatedNodeWattage || 0}W)`);
  }
  if (result.hasPsuHeadroomDeficit) {
    warnings.push(`Power supply headroom deficit: maximum PSU wattage (${result.maxPsuWattage || 0}W) provides less than 20% safety headroom above peak load (${result.requiredWattageWithHeadroom || 0}W)`);
  }
  if (result.hasMixedAcDcPower) errors.push('AC and -48VDC power supplies cannot be mixed');
  if (result.hasMixedWattagePsus) errors.push('Power supplies must have matching wattages in redundant pairs');
  if (result.hasMixedEfficiencyPsus) errors.push('Platinum and Titanium PSU efficiencies cannot be mixed');
  if (result.hasDl380aGpuPsuShortage) errors.push('GPU configuration lacks the profile-required redundant power supplies');
  if (result.hasSynergyRedundantPowerError) errors.push('Synergy frame requires 6 Titanium PSUs for N+N redundancy');
  if (result.hasDcPowerSupply && !result.hasDcLugKit) errors.push('-48VDC Power Supply requires DC Power Cable Lug Kit');
  if (result.needsCeRemovalKit) warnings.push('EU ErP Lot 9 requires CE Mark Removal Kit for 94% Platinum PSUs');
}

  switch (id) {
    case 'COMPUTE_THERMAL':
      if (result.needsHeatsink) errors.push('Missing required processor heatsink');
      if (result.hasMixedCpuModels) errors.push('Dual processor models or stepping mismatch (mixed CPU models)');
      if (result.needsDirectLiquidCooling) errors.push('Direct Liquid Cooling required for high-TDP processor');
      if (result.needsHighPerfCooling) errors.push('High-TDP processor (>185W) requires High-Performance Fan Kit');
      if (result.fanKitExceedsMax) errors.push('Fan kit quantity exceeds maximum chassis capacity (CLIC Rule 81354654: max 1 fan kit per server)');
      break;

    case 'MEMORY_CHANNEL':
      if (result.hasBtoMemoryInCto) errors.push('Standalone BTO memory SKU is restricted in CTO base server');
      if (result.isInvalidChannelConfiguration) errors.push('Invalid memory channel population');
      if (result.memoryCount > 0 && result.isSupportedPopulation === false) errors.push('Unsupported asymmetric memory DIMM population');
      if (result.memoryCount > 0 && result.isBalancedChannel === false) warnings.push('Unbalanced memory channel interleaving bandwidth');
      break;

    case 'STORAGE_TRI_MODE':
      normalizeStorageTriModeResult(result, errors, warnings);
      break;

    case 'PCIE_RISER':
      if (result.isExceedingTotalSlots) errors.push('PCIe card count exceeds physical mechanical slot capacity');
      if (result.isExceedingActiveSlots) errors.push('PCIe card count exceeds electrically cabled active slots');
      if (result.needsPrimaryCableKit) errors.push('Primary riser cable kit required to activate Slot 1');
      if (result.needsSecondaryCableKit) warnings.push('Secondary riser cable kit required to activate secondary slots');
      if (result.needsSecondaryRiser) errors.push('Secondary PCIe riser card required');
      if (result.needsGpuPowerCableKit) errors.push('GPU auxiliary power cable kit required');
      break;

    case 'NETWORKING_OCP':
      if (result.isExceedingOcpSlots) errors.push('OCP adapter count exceeds chassis slot capacity');
      if (result.hasConflictingOcpCables) errors.push('Conflicting OCP enablement cables detected');
      if (result.hasSynergyFabricMismatch) errors.push('Synergy fabric mismatch detected');
      break;

    case 'POWER_ENVIRONMENT':
      normalizePowerEnvironmentResult(result, errors, warnings);
      break;
>>>>
```

---

### Recommended Change 4: `tests/unit/test_aspect_registry.js`

#### Diff Recommendation 4.1: Update `sampleServerBOM` with PSUs
**Target File:** `tests/unit/test_aspect_registry.js`  
**Lines:** 40–46  
```javascript
<<<<
  const sampleServerBOM = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor', quantity: 2 },
    { sku: 'P73300-B21', description: 'HPE 64GB 2Rx8 DDR5-5600 Smart Memory FIO Kit', quantity: 16 },
    { sku: 'P48820-B21', description: 'HPE DL380 Gen11 High Performance Fan Kit', quantity: 1 },
    { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 }
  ];
====
  const sampleServerBOM = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor', quantity: 2 },
    { sku: 'P73300-B21', description: 'HPE 64GB 2Rx8 DDR5-5600 Smart Memory FIO Kit', quantity: 16 },
    { sku: 'P48820-B21', description: 'HPE DL380 Gen11 High Performance Fan Kit', quantity: 1 },
    { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 },
    { sku: 'P03178-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Power Supply Kit', quantity: 2 }
  ];
>>>>
```

#### Diff Recommendation 4.2: Add Sub-area B Tests
**Target File:** `tests/unit/test_aspect_registry.js`  
**Lines:** Add after line 137  
```javascript
test('AspectRegistry — Sub-area B: Server BOM with 0 PSUs fails POWER_ENVIRONMENT', () => {
  const psuLessBOM = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor', quantity: 2 }
  ];
  const evalResult = evaluateDomainAspects('server', psuLessBOM, null, {}, 1);
  const powerAspect = evalResult.checks.find(c => c.id === 'POWER_ENVIRONMENT');
  assert.ok(powerAspect);
  assert.strictEqual(powerAspect.status, 'FAIL');
  assert.ok(powerAspect.errors.some(e => e.includes('zero power supplies')));
});

test('AspectRegistry — Sub-area B: Power environment catches wattage deficit and headroom deficit', () => {
  const wattageDeficitRes = normalizeAspectResult('POWER_ENVIRONMENT', {
    psuCount: 2,
    maxPsuWattage: 500,
    estimatedNodeWattage: 800,
    requiredWattageWithHeadroom: 960,
    hasPsuWattageDeficit: true,
    hasPsuHeadroomDeficit: true
  });
  assert.strictEqual(wattageDeficitRes.status, 'FAIL');
  assert.ok(wattageDeficitRes.errors.some(e => e.includes('wattage deficit')));
  assert.ok(wattageDeficitRes.warnings.some(w => w.includes('headroom deficit')));
});

test('AspectRegistry — Sub-area B: Storage Tri-Mode identifies needsCableKit and isBackplaneCapacityExceeded', () => {
  const storageRes = normalizeAspectResult('STORAGE_TRI_MODE', {
    needsCableKit: true,
    isBackplaneCapacityExceeded: true
  });
  assert.strictEqual(storageRes.status, 'FAIL');
  assert.ok(storageRes.errors.some(e => e.includes('cable kit required')));
  assert.ok(storageRes.errors.some(e => e.includes('backplane capacity')));
});

test('AspectRegistry — Sub-area B: Binds 16 storage and tape enterprise diagnostics', () => {
  const diagRes = normalizeAspectResult('STORAGE_TRI_MODE', {
    hasMissingControllerNode: true,
    hasAsymmetricHbas: true,
    missingDaisyChainCables: true,
    insufficientRaid6Drives: true,
    insufficientRaid10Drives: true,
    hasD3940ConnectivityError: true,
    needsMiniSasHdCable: true,
    needsFcTransceiver: true,
    exceedsMaxMsl3040Slots: true,
    exceedsSlotCapacity: true,
    hasLffDrivesInSffChassis: true,
    hasDriveCageMixingConflict: true,
    hasMr216iORaid56Risk: true,
    needsDriveCageForController: true,
    hasControllerNoDriveConflict: true,
    needsCapacitorCable: true
  });
  assert.strictEqual(diagRes.status, 'FAIL');
  assert.strictEqual(diagRes.errors.length, 15);
  assert.strictEqual(diagRes.warnings.length, 1);
  assert.ok(diagRes.warnings.some(w => w.includes('MR216i-o')));
  assert.ok(diagRes.errors.some(e => e.includes('LFF 3.5-inch drives')));
  assert.ok(diagRes.errors.some(e => e.includes('Alletra storage array')));
  assert.ok(diagRes.errors.some(e => e.includes('StoreEver LTO SAS')));
});
```

---

## 5. Verification Method

To independently verify the implementation:

1. **Aspect Domain Regression Test:**
   ```powershell
   npm run test:domain:aspects
   ```
   **Acceptance Criteria:** All 16 suites pass (100.0% PASS), 0 failures.

2. **Target Subsystem Unit Tests:**
   ```powershell
   node --test tests/unit/test_aspect_registry.js
   node --test tests/unit/test_aspect_storage_tri_mode.js
   node --test tests/unit/test_aspect_power_environment.js
   ```
   **Acceptance Criteria:** All 4 test suites pass with 0 failures, validating the new sub-area B boundary assertions.

3. **Chaos & Composable Tests:**
   ```powershell
   node --test tests/chaos/test_storage_expander_tri_mode_chaos.js
   node --test tests/chaos/test_storage_array_controller_pair_chaos.js
   node --test tests/chaos/test_storeever_tape_automation_chaos.js
   node --test tests/integration/test_storage_composable_cross_aspects.js
   ```
   **Acceptance Criteria:** All chaos boundary tests pass without regression.

4. **Code Complexity & OxLint Cleanliness:**
   ```powershell
   node --test tests/unit/test_circular_and_complexity.js
   npm run lint
   ```
   **Acceptance Criteria:** `evalStorageTriMode` and `evalPowerEnvironment` maintain $CC \le 20$; decomposed normalizer functions maintain $CC \le 10$; OxLint reports 0 errors and 0 warnings.

5. **Invalidation Conditions:**
   - Any test suite failing in `npm run test:domain:aspects`.
   - `evalPowerEnvironment([])` throwing or returning non-zero `maxPsuWattage`.
   - A server with 0 PSUs evaluating as `PASS`.
   - `STORAGE_TRI_MODE` ignoring missing controller cable kits or backplane over-subscription.

---

**Delivered to:** `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m1_2\handoff.md`
