# Technical Analysis & Fix Specifications: Milestone 1, Sub-area B
## Storage Tri-Mode & Power Environment Normalization

**Working Directory:** `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m1_2`  
**Explorer:** Explorer M1_2 (`teamwork_preview_explorer`)  
**Date:** 2026-10-27  
**Scope:** Milestone 1, Sub-area B: `scripts/lib/aspects/storage_tri_mode.js`, `scripts/lib/aspects/power_environment.js`, and `scripts/lib/aspects/aspect_registry.js`.

---

## 1. Executive Summary

Milestone 1 addresses **Requirement R1 (Residual Intelligence & Epistemic Reasoning Review)** by closing validation gaps and heuristic shortcuts in physical aspect checkers. Sub-area B focuses on two critical hardware domains:
1. **Storage Tri-Mode Subsystem**:
   - `storage_tri_mode.js` was omitting `needsCableKit` and `isBackplaneCapacityExceeded` from its returned contract, even though `aspect_registry.js` already contained check handlers expecting them.
   - 16 rich physical diagnostic checks calculated across Alletra storage arrays, StoreEver tape automation, Synergy composable storage, and ProLiant drive cages were completely dropped by `aspect_registry.js`.
2. **Power & Environmental Subsystem**:
   - `power_environment.js` line 204 hardcoded `maxPsuWattage: 800` in the initial tally object, masking missing power supplies and corrupting wattage calculations for smaller PSUs (e.g. 500W PSUs remained tracked as 800W).
   - Configurations with **0 power supplies** optimistically passed evaluation as `status: 'PASS'`.
   - `hasPsuWattageDeficit` and `hasPsuHeadroomDeficit` were computed in `power_environment.js` but completely dropped during result normalization in `aspect_registry.js`.

This document delivers exact line-by-line code fix specifications, cyclomatic complexity management strategies, and concrete verification test cases for the Worker agent.

---

## 2. In-Depth Technical Analysis

### 2.1 Storage Tri-Mode Normalization (`storage_tri_mode.js` & `aspect_registry.js`)

#### A. Missing Property Contract: `needsCableKit` and `isBackplaneCapacityExceeded`
In `scripts/lib/aspects/aspect_registry.js` lines 295 and 297:
```javascript
case 'STORAGE_TRI_MODE':
  if (result.hasIncompatibleYCable) errors.push('Tri-Mode Splitter Cable Kit is incompatible with standard cages');
  if (result.needsSasExpander) errors.push('SAS Expander required for configuration exceeding 8 drives');
  if (result.needsCableKit) errors.push('Storage controller cable kit required');
  if (result.needsSmartStorageBattery) errors.push('Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup');
  if (result.isBackplaneCapacityExceeded) errors.push('Drive count exceeds chassis backplane capacity');
  break;
```
However, in `scripts/lib/aspects/storage_tri_mode.js` lines 295–345, `evalStorageTriMode` returns an object that **never defined or exported `needsCableKit` or `isBackplaneCapacityExceeded`**. Consequently, `result.needsCableKit` and `result.isBackplaneCapacityExceeded` were always `undefined` (falsy), meaning missing controller cables and backplane oversubscription were silently ignored.

#### B. Mathematical & Physical Derivation of `needsCableKit`
In HPE ProLiant Gen10+, Gen11, and Gen12 servers, hardware Tri-Mode storage controllers (e.g. MR416i, SR932i, MR408i) do not connect directly to the motherboard; they require explicit controller enablement cable kits (e.g., `P48918-B21`, `P76456-B21`, `P76700-B21`) or Tri-Mode Y-cable splitters (`P48832-B21`) to cable into front drive cages / backplanes.
- A cable kit is required when:
  1. The chassis is a standard server (`isServerChassis === true`, i.e., not an Alletra storage array, StoreEver tape library, or Synergy frame).
  2. A physical hardware storage controller is present (`t.hasStorageController === true`).
  3. No valid controller enablement cable kit is installed (`!t.hasOcpCable && !(t.hasYCable && !cabling.hasIncompatibleYCable)`).
- **Formula**:
  $$\text{needsCableKit} = \text{isServerChassis} \land \text{hasStorageController} \land \neg \text{hasControllerCable}$$

#### C. Mathematical & Physical Derivation of `isBackplaneCapacityExceeded`
Physical drive cages provide discrete physical bay capacity per server node:
- Standard 2U ProLiant CTO chassis: 8 SFF bays base (Box 3).
- Additional 8SFF Cage kits (`P48813-B21`, `P48814-B21`, `P75741-B21`): $+8$ bays per kit $\times$ quantity.
- DL380a 4SFF or 4EDSFF Cage kits (`P74710-B21`): 4 bays per kit.
- LFF chassis / cages: 4 bays or 12 bays.
- Alletra storage array: 24 NVMe bays base $+$ 24 bays per J2000 expansion shelf.
- When per-node drive demand exceeds the provisioned physical backplane bays:
  $$\text{isBackplaneCapacityExceeded} = \text{isServerChassis} \land \left(\frac{\text{driveCount}}{\text{nodes}} > \frac{\text{backplaneCapacity}}{\text{nodes}}\right)$$

#### D. The 16 Dropped Diagnostic Checks in `aspect_registry.js`
`storage_tri_mode.js` already calculates rich sub-validations (`alletra`, `storeEver`, `cabling`, `compat`), but `aspect_registry.js` never inspected them. Below is the complete catalog of all 16 dropped checks, their exact physical rules, severity, and normalized diagnostic messages:

| # | Property Name | Source Subsystem | Physical Failure Mode | Severity | Normalized Message in `aspect_registry.js` |
|---|---------------|------------------|-----------------------|----------|---------------------------------------------|
| 1 | `hasMissingControllerNode` | `alletra` | Alletra requires exactly 2 active controller nodes for active-active quorum | ERROR | `'Alletra storage array requires exactly two active controller nodes'` |
| 2 | `hasAsymmetricHbas` | `alletra` | Alletra PCIe FC/iSCSI HBAs must be balanced evenly across both nodes | ERROR | `'Alletra host bus adapters must be symmetric across controller nodes'` |
| 3 | `missingDaisyChainCables` | `alletra` | Expansion shelves require 2 SAS daisy-chain cables per shelf for redundancy | ERROR | `'Alletra expansion shelf requires redundant SAS daisy chain cables'` |
| 4 | `insufficientRaid6Drives` | `alletra` | RAID 6 storage volume requires $\ge 6$ SSDs | ERROR | `'RAID 6 configuration requires at least 6 SSDs'` |
| 5 | `insufficientRaid10Drives` | `alletra` | RAID 10 storage volume requires $\ge 4$ SSDs | ERROR | `'RAID 10 configuration requires at least 4 SSDs'` |
| 6 | `hasD3940ConnectivityError` | `compat` | Synergy D3940 storage module requires both SAS Mezzanine card & SAS Connection Module | ERROR | `'Synergy D3940 storage module requires SAS Mezzanine card and SAS Connection Module'` |
| 7 | `needsMiniSasHdCable` | `storeEver` | StoreEver LTO SAS tape drives require Mini-SAS HD external cables | ERROR | `'StoreEver LTO SAS tape drive requires Mini-SAS HD cable'` |
| 8 | `needsFcTransceiver` | `storeEver` | StoreEver LTO FC tape drives require optical Fibre Channel transceivers | ERROR | `'StoreEver LTO Fibre Channel tape drive requires optical transceiver'` |
| 9 | `exceedsMaxMsl3040Slots` | `storeEver` | MSL3040 tape library hardware max is 6 expansion modules (280 slots total) | ERROR | `'StoreEver MSL3040 tape library exceeds maximum limit of 6 expansion modules'` |
| 10 | `exceedsSlotCapacity` | `storeEver` | Number of data cartridges exceeds physical slot capacity of library | ERROR | `'Data cartridge count exceeds available tape library slot capacity'` |
| 11 | `hasLffDrivesInSffChassis` | `compat` | 3.5" LFF drives physically cannot mount into 2.5" SFF chassis backplanes | ERROR | `'LFF 3.5-inch drives cannot be installed in SFF chassis'` |
| 12 | `hasDriveCageMixingConflict` | `compat` | Mixing 4SFF and 4EDSFF cages on DL380a is prohibited (CLIC Rule 81016788) | ERROR | `'Cannot mix 4SFF and 4EDSFF drive cages in DL380a chassis (CLIC Rule 81016788)'` |
| 13 | `hasMr216iORaid56Risk` | `compat` | Cacheless MR216i-o controller attempting RAID 5/6 or $>2$ drives without battery | WARNING | `'MR216i-o controller lacks write cache; RAID 5/6 or write-intensive workloads require Smart Storage Battery'` |
| 14 | `needsDriveCageForController` | `cabling` | Internal RAID controller installed in server chassis without drive cages | ERROR | `'Hardware storage controller requires physical drive cage and backplane cabling'` |
| 15 | `hasControllerNoDriveConflict` | `cabling` | Hardware RAID controller paired with No Drive FIO Kit | ERROR | `'Hardware storage controller cannot be installed with No Drive FIO Kit'` |
| 16 | `needsCapacitorCable` | `cabling` | Smart Storage Battery installed without controller cable kit (Rule 81354652) | ERROR | `'Smart Storage Battery requires controller enablement cable kit (CLIC Rule 81354652)'` |

---

### 2.2 Power & Environmental Normalization (`power_environment.js` & `aspect_registry.js`)

#### A. Root-Cause Analysis of Line 204: `maxPsuWattage: 800`
In `scripts/lib/aspects/power_environment.js` lines 194–205:
```javascript
function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}, serverCount = 1) {
  const tally = {
    hasAcPowerSupply: false,
    hasDcPowerSupply: false,
    acPsuCount: 0,
    dcPsuCount: 0,
    hasDcLugKit: false,
    hasPlatinumPsu: false,
    hasTitaniumPsu: false,
    hasCeRemovalKit: false,
    psuCount: 0,
    maxPsuWattage: 800, // <--- DEFECT
    psuWattages: new Set(),
```
And in `tallyPsuAndCabling` lines 104–105:
```javascript
const w = parseInt(psuWMatch[1], 10);
if (w > tally.maxPsuWattage) tally.maxPsuWattage = w;
```
**Two Critical Bugs Resulting from this Initialization:**
1. If a configuration has **0 power supplies**, `tally.maxPsuWattage` defaults to `800W`. Downstream checks treat the server as if an 800W PSU was present.
2. If a customer configures **500W power supplies** (e.g. `P38995-B21` HPE 500W Flex Slot Platinum), `w = 500`. Because $500 \ngtr 800$, `tally.maxPsuWattage` remains `800W`! The checker over-reports PSU capacity by 300W and allows an undersized 500W PSU to pass on a 700W server load.

**Fix:**
Initialize `maxPsuWattage: 0`.
When `psuCount > 0` and PSU wattage is unparsed from description, apply fallback `800W`. When `psuCount === 0`, `maxPsuWattage` strictly remains `0`.

#### B. Enforcing Mandatory Component Assertion: Rejecting 0 PSUs
When `psuCount === 0`:
Currently, `power_environment.js` checks:
- `hasMixedAcDcPower = false`
- `hasMixedWattagePsus = false`
- `hasMixedEfficiencyPsus = false`
- `hasDl380aGpuPsuShortage = false`
Because all mismatch checks evaluate to `false`, `POWER_ENVIRONMENT` returned 0 errors and 0 warnings, emitting an optimistic `status: 'PASS'` for a server with **zero power supplies**.

**Fix:**
Assert `psuCount >= minPsusRequired` (where $\text{minPsusRequired} = \max(1, \text{serverCount})$).
For platforms with factory-integrated power supplies (Alletra storage enclosures, StoreEver tape libraries), `hasIntegratedPower` is detected so external Flex Slot PSUs are not falsely mandated.
For server and AI cluster domains:
$$\text{psuCount} = 0 \land \neg \text{hasIntegratedPower} \implies \text{ERROR: 'Power supply required: zero power supplies configured in BOQ'}$$

#### C. Evaluating `hasPsuWattageDeficit` and `hasPsuHeadroomDeficit` in `aspect_registry.js`
In `power_environment.js` lines 239–243:
```javascript
const estimatedNodeWattage = totalHardwareWatts + 150;
const requiredWattageWithHeadroom = Math.ceil(estimatedNodeWattage * 1.20);
const hasPsuHeadroomDeficit = tally.psuCount > 0 && tally.maxPsuWattage < requiredWattageWithHeadroom;
const hasPsuWattageDeficit = tally.psuCount > 0 && tally.maxPsuWattage < estimatedNodeWattage;
```
`aspect_registry.js` was completely ignoring both boolean properties!
- `hasPsuWattageDeficit`: When the largest installed PSU wattage cannot even meet the estimated node wattage ($W_{\text{PSU}} < W_{\text{node}}$), this is a fatal build blocker.
  $\rightarrow$ Emit `errors.push('Power supply wattage deficit: maximum PSU wattage (X W) is less than estimated system consumption (Y W)')`.
- `hasPsuHeadroomDeficit`: When the installed PSU wattage is sufficient for base load but provides less than the standard 20% safety headroom ($W_{\text{node}} \le W_{\text{PSU}} < 1.20 \times W_{\text{node}}$).
  $\rightarrow$ Emit `warnings.push('Power supply headroom deficit: maximum PSU wattage (X W) provides less than 20% safety headroom above peak load (Y W)')`.

---

## 3. Cyclomatic Complexity & Code Layout Discipline

To maintain the repository certified benchmark ($CC \le 135$, decomposed helper functions $\le 10$, 0 OxLint warnings):
- Do NOT inflate `normalizeAspectResult` with an inline 25-condition `switch` block.
- Decompose normalizers into dedicated helper functions in `aspect_registry.js`:
  1. `normalizeStorageTriModeResult(result, errors, warnings)` ($CC \le 10$ across split helpers)
  2. `normalizePowerEnvironmentResult(result, errors, warnings)` ($CC \le 10$)
- In `storage_tri_mode.js`:
  `calculateBackplaneCapacity(t, serverCount)` has $CC = 6$, leaving `validateStorageCablingAndBackplane` at $CC = 4$ and `evalStorageTriMode` at $CC \le 6$ (well under the threshold of 20 tested in `test_circular_and_complexity.js`).
- In `power_environment.js`:
  `evalPowerEnvironment` complexity remains $\le 8$ (well under the threshold of 20).

---

## 4. Concrete File Fix Specifications

### 4.1 Target File 1: `scripts/lib/aspects/storage_tri_mode.js`

#### Edit Chunk 1: Cage Capacity Tracking in `tallyCagesAndDrives`
**Location:** lines 36–62  
**Action:** Track `tally.cageCapacity` whenever drive cages or base CTO chassis are encountered.
```javascript
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
```

#### Edit Chunk 2: Add `calculateBackplaneCapacity` and Update `validateStorageCablingAndBackplane`
**Location:** lines 255–268  
**Action:** Compute `needsCableKit` and `isBackplaneCapacityExceeded`.
```javascript
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
```

#### Edit Chunk 3: Export `needsCableKit` and `isBackplaneCapacityExceeded` from `evalStorageTriMode`
**Location:** lines 310–318 in `evalStorageTriMode` return object  
**Action:** Export both properties and backplane capacity.
```javascript
    needsSasExpander: cabling.needsSasExpander,
    needsDriveCageForController: cabling.needsDriveCageForController,
    hasControllerNoDriveConflict: cabling.hasControllerNoDriveConflict,
    needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
    needsCapacitorCable: cabling.needsCapacitorCable,
    needsCableKit: cabling.needsCableKit,
    isBackplaneCapacityExceeded: cabling.isBackplaneCapacityExceeded,
    backplaneCapacity: cabling.backplaneCapacity,
    controllerDirectCapacity: cabling.controllerDirectCapacity,
```

---

### 4.2 Target File 2: `scripts/lib/aspects/power_environment.js`

#### Edit Chunk 1: Detect Integrated Storage / Tape Power in `tallyChassisFormFactor`
**Location:** lines 74–97  
**Action:** Set `tally.isAlletraStorage` and `tally.isStoreEverTape`.
```javascript
  if (fullDesc.includes('alletra')) {
    tally.isAlletraStorage = true;
  }
  if (fullDesc.includes('storeever') || fullDesc.includes('msl3040')) {
    tally.isStoreEverTape = true;
  }
```

#### Edit Chunk 2: Line 204 Fix & Fallback in `evalPowerEnvironment`
**Location:** lines 194–205 and lines 236–239  
**Action:** Initialize `maxPsuWattage: 0`, and apply fallback only if `psuCount > 0`.
```javascript
function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}, serverCount = 1) {
  const tally = {
    hasAcPowerSupply: false,
    hasDcPowerSupply: false,
    acPsuCount: 0,
    dcPsuCount: 0,
    hasDcLugKit: false,
    hasPlatinumPsu: false,
    hasTitaniumPsu: false,
    hasCeRemovalKit: false,
    psuCount: 0,
    maxPsuWattage: 0,
    psuWattages: new Set(),
...
```
And right after the items processing loop (around line 238):
```javascript
  if (tally.psuCount > 0 && tally.maxPsuWattage === 0) {
    tally.maxPsuWattage = 800;
  }
```

#### Edit Chunk 3: Export `hasIntegratedPower` and `minPsusRequired`
**Location:** lines 248–283 in `evalPowerEnvironment` return object  
**Action:** Export metadata for aspect registry validation.
```javascript
  const hasIntegratedPower = Boolean(tally.isAlletraStorage || tally.isStoreEverTape);
  const minPsusRequired = Math.max(1, serverCount || 1);

  return {
    hasAcPowerSupply: tally.hasAcPowerSupply,
...
    hasIntegratedPower,
    minPsusRequired,
    hasZeroPsus: tally.psuCount === 0,
```

---

### 4.3 Target File 3: `scripts/lib/aspects/aspect_registry.js`

#### Edit Chunk 1: Decomposed Normalizers for Storage and Power
**Location:** lines 265–275 (before `normalizeAspectResult`)  
**Action:** Define `normalizeStorageTriModeResult` and `normalizePowerEnvironmentResult`.
```javascript
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
```

#### Edit Chunk 2: Delegate from `switch (id)` in `normalizeAspectResult`
**Location:** lines 292–324  
**Action:** Replace inline cases with calls to decomposed normalizers.
```javascript
    case 'STORAGE_TRI_MODE':
      normalizeStorageTriModeResult(result, errors, warnings);
      break;

    case 'POWER_ENVIRONMENT':
      normalizePowerEnvironmentResult(result, errors, warnings);
      break;
```

---

### 4.4 Target File 4: `tests/unit/test_aspect_registry.js`

#### Edit Chunk 1: Update `sampleServerBOM`
**Location:** lines 40–46  
**Action:** Add redundant 800W Platinum PSUs so the baseline server BOM is buildable and complete.
```javascript
  const sampleServerBOM = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor', quantity: 2 },
    { sku: 'P73300-B21', description: 'HPE 64GB 2Rx8 DDR5-5600 Smart Memory FIO Kit', quantity: 16 },
    { sku: 'P48820-B21', description: 'HPE DL380 Gen11 High Performance Fan Kit', quantity: 1 },
    { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 },
    { sku: 'P03178-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Power Supply Kit', quantity: 2 }
  ];
```

#### Edit Chunk 2: Add Sub-area B Regression & Boundary Test Cases
**Location:** end of `tests/unit/test_aspect_registry.js` (after line 137)  
**Action:** Add dedicated tests asserting:
1. Server BOM with 0 PSUs fails `POWER_ENVIRONMENT`.
2. Storage Tri-Mode binds all 16 enterprise diagnostics into errors/warnings.
3. Power environment catches `hasPsuWattageDeficit` and `hasPsuHeadroomDeficit`.
4. Storage Tri-Mode identifies `needsCableKit` and `isBackplaneCapacityExceeded`.

---

## 5. Verification Commands

1. **Aspect Domain Test Suite:**
   ```powershell
   npm run test:domain:aspects
   ```
   *Expected:* 16/16 test suites PASS (100.0%).

2. **Specific Unit Tests:**
   ```powershell
   node --test tests/unit/test_aspect_registry.js
   node --test tests/unit/test_aspect_storage_tri_mode.js
   node --test tests/unit/test_aspect_power_environment.js
   node --test tests/chaos/test_storage_expander_tri_mode_chaos.js
   node --test tests/chaos/test_storage_array_controller_pair_chaos.js
   node --test tests/chaos/test_storeever_tape_automation_chaos.js
   ```
   *Expected:* All unit and chaos tests pass cleanly.

3. **Code Complexity & OxLint Cleanliness:**
   ```powershell
   node --test tests/unit/test_circular_and_complexity.js
   npm run lint
   ```
   *Expected:* All function complexities $\le 10$ (or $\le 20$ for main module functions); 0 OxLint errors/warnings.

---

**Delivered to:** `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m1_2\analysis.md`
