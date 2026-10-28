# Architectural & Code Specification: Milestone 1, Sub-area A (Thermal & Memory Aspect Normalization)

**Working Directory:** `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m1_1`  
**Explorer:** Explorer M1_1 (`teamwork_preview_explorer`)  
**Parent / Caller:** `06cb5c88-e2a4-407d-9438-e05cab02c2f3`  
**Date:** 2026-10-27  
**Scope:** Milestone 1, Sub-area A — Thermal & Memory Physical Aspect Normalization (`scripts/lib/aspects/compute_thermal.js`, `scripts/lib/aspects/memory_channel.js`, `scripts/lib/aspects/aspect_registry.js`, and associated test suites).

---

## 1. Executive Summary

In Milestone 1 of the HPE Solution Evaluator & Conflict Resolution Engine Epistemic Hardening project, Sub-area A addresses critical mathematical and epistemic disconnects in the physical rule engine for **Compute & Thermal** (`compute_thermal.js`) and **Memory & Channel Symmetry** (`memory_channel.js`).

### Systemic Issues Identified:
1. **Disconnected Property Names in `aspect_registry.js`**:
   - `aspect_registry.js` explicitly checks `result.needsHeatsink` and `result.needsDirectLiquidCooling` in `normalizeAspectResult()`, but **neither property is ever computed or returned by `compute_thermal.js`**. As a result, both evaluate to `undefined` (falsy), allowing headless CPU heatsink omissions and air-cooled 360W+ thermal violations to pass silently.
   - `aspect_registry.js` checks `result.isInvalidChannelConfiguration`, but **`memory_channel.js` never computes or returns `isInvalidChannelConfiguration`**.
   - `compute_thermal.js` computes `fanKitUnderPopulated` (line 116), but **`aspect_registry.js` completely ignores it**, allowing under-populated modular fan configurations (e.g. 2 fans on an AMD dual-socket server requiring 6 fans) to pass as valid.
2. **Optimistic False-Pass on 0 Heatsinks When CPUs are Present**:
   - `compute_thermal.js` line 77: `const hasHeatsinks = highPerfHeatsinkSku ? items.some(isHeatsinkItem) : true;`. When `highPerfHeatsinkSku` is not specified in `mandatorySkus`, `hasHeatsinks` unconditionally defaults to `true`. A server with 2 CPUs and 0 heatsinks passes thermal evaluation with `status: 'PASS'`.
3. **Optimistic False-Pass on 0 RAM Modules When CPUs are Present**:
   - In `memory_channel.js`, if `memoryCount === 0`, `isSupportedPopulation` is `false`. However, in `aspect_registry.js` line 288: `if (result.memoryCount > 0 && result.isSupportedPopulation === false) errors.push(...)`. The guard `result.memoryCount > 0` bypasses the check, allowing a server with 2 CPUs and 0 RAM modules to pass memory evaluation with `status: 'PASS'`.
4. **Hardcoded CPU Multiplier Assumption**:
   - `memory_channel.js` line 82: `if (cpuCount === 0) cpuCount = 2;`. If no processor is identified in `items` or passed via `passedCpuCount`, the engine assumes 2 CPUs, corrupting single-socket (DL325, DL345, DL110, DL145) and 4-socket channel population math.
5. **Dropped Physical Incompatibility Flags**:
   - `memory_channel.js` computes `hasMixedDdrGeneration` (mixing DDR4 and DDR5) and `hasMixedMemoryTypes` (mixing RDIMM, LRDIMM, MRDIMM), but **neither flag is evaluated in `aspect_registry.js`**.

---

## 2. In-Depth Analysis & Code Fix Specification: Compute & Thermal (`compute_thermal.js`)

### 2.1 Problem Analysis
In `scripts/lib/aspects/compute_thermal.js`:
- **Lines 65–76**: The `isHeatsinkItem(it)` filter checks whether an item is a heatsink by matching known SKUs (`['P74792-B21', 'P74794-B21', 'P49145-B21', 'P48818-B21', 'P58459-B21']`), description keywords (`'heat sink'`, `'heatsink'`), component role, or catalog role.
- **Line 71**: The list of known SKUs omits `'P48809-B21'` (`HPE ProLiant DL380 2U High Performance Heat Sink`, used in `test_aspect_registry.js` sampleServerBOM).
- **Line 77**: `const hasHeatsinks = highPerfHeatsinkSku ? items.some(isHeatsinkItem) : true;`
  - When `highPerfHeatsinkSku` is not provided (which is true whenever `mandatorySkus` is empty or omitted), `hasHeatsinks` evaluates to `true`.
- **Missing `needsHeatsink`**: When `cpuCount > 0 && !hasHeatsinks`, `needsHeatsink` must be `true`.
- **Missing `needsDirectLiquidCooling`**: Enterprise server chassis (DL380 Gen11/Gen12, Cray EX, Apollo) have air-cooling thermal limits of 350W. Processors exceeding 350W TDP (e.g. AMD EPYC 9754 / 9654 at 360W, or Xeon 6980P at 500W) or options with `requiresDlc: true` require Direct Liquid Cooling (DLC). If no DLC module is present, `needsDirectLiquidCooling` must evaluate to `true`.

### 2.2 Proposed Implementation in `scripts/lib/aspects/compute_thermal.js`

#### Target Location: Lines 70–78
**Existing Code:**
```javascript
    if (highPerfHeatsinkSku && sku === cleanBaseSKU(highPerfHeatsinkSku)) return true;
    if (['P74792-B21', 'P74794-B21', 'P49145-B21', 'P48818-B21', 'P58459-B21'].includes(sku)) return true;
    if (d.includes('heat sink') || d.includes('heatsink') || classifyComponentRole('', d) === 'Heatsink') return true;
    const catItem = skuIndex.get(sku);
    if (catItem && (catItem.skuData?.['Component Role'] === 'Heatsink' || (catItem.skuData?.Description || '').toLowerCase().includes('heatsink') || (catItem.skuData?.Description || '').toLowerCase().includes('heat sink'))) return true;
    return false;
  };
  const hasHeatsinks = highPerfHeatsinkSku ? items.some(isHeatsinkItem) : true;
```

**Replacement Code:**
```javascript
    if (highPerfHeatsinkSku && sku === cleanBaseSKU(highPerfHeatsinkSku)) return true;
    if (['P74792-B21', 'P74794-B21', 'P49145-B21', 'P48818-B21', 'P58459-B21', 'P48809-B21'].includes(sku)) return true;
    if (d.includes('heat sink') || d.includes('heatsink') || classifyComponentRole('', d) === 'Heatsink') return true;
    const catItem = skuIndex.get(sku);
    if (catItem && (catItem.skuData?.['Component Role'] === 'Heatsink' || (catItem.skuData?.Description || '').toLowerCase().includes('heatsink') || (catItem.skuData?.Description || '').toLowerCase().includes('heat sink'))) return true;
    return false;
  };
  const hasHeatsinks = items.some(isHeatsinkItem);
  const needsHeatsink = cpuCount > 0 && !hasHeatsinks;

  const hasDirectLiquidCooling = items.some(it => {
    if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
    const d = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    return d.includes('liquid cooling') || d.includes('direct liquid') || d.includes('dlc') ||
      d.includes('cold plate') || d.includes('coolant') || ['P74796-B21', 'P60000-B21'].includes(sku);
  }) || Boolean(options?.hasDirectLiquidCooling);

  // Processors > 350W TDP exceed air-cooling thermal envelope in standard enterprise servers and require Direct Liquid Cooling (DLC)
  const isDlcMandated = maxCpuTdpWatts > 350 || Boolean(options?.requiresDlc);
  const needsDirectLiquidCooling = isDlcMandated && !hasDirectLiquidCooling;
```

#### Target Location: Lines 130–145 (Return Object)
**Add to return object:**
```javascript
    hasHeatsinks,
    needsHeatsink,
    hasDirectLiquidCooling,
    needsDirectLiquidCooling,
    hasMaxPerfHeatsink,
    hasOverprovisionedMaxHeatsink,
```

---

## 3. In-Depth Analysis & Code Fix Specification: Memory Channel (`memory_channel.js`)

### 3.1 Problem Analysis
In `scripts/lib/aspects/memory_channel.js`:
- **Line 82**: `if (cpuCount === 0) cpuCount = 2;`
  - Artificially forces `cpuCount = 2` when no CPU is installed or passed, corrupting single-socket calculations and masking missing CPUs.
- **Lines 84–90**:
  - `dimmsPerCpu = cpuCount > 0 ? (memoryCount / cpuCount) : 0;`
  - `isSupportedPopulation = memoryCount > 0 && (memoryCount % cpuCount === 0) && [1, 2, 4, 6, 8, 12, 16].includes(dimmsPerCpu);`
  - When `cpuCount === 0`, `memoryCount % cpuCount` yields `NaN` (or `0 % 0 = NaN`).
  - `isInvalidChannelConfiguration` is never computed or returned.
  - `needsMemory` (when `cpuCount > 0 && memoryCount === 0`) is never computed or returned.
  - `cpuCount` itself is never returned in the return object.

### 3.2 Proposed Implementation in `scripts/lib/aspects/memory_channel.js`

#### Target Location: Lines 81–110
**Existing Code:**
```javascript
  if (cpuCount === 0) cpuCount = 2;

  const dimmsPerCpu = cpuCount > 0 ? (memoryCount / cpuCount) : 0;
  // Supported per-socket DIMM populations per Intel Xeon / AMD EPYC QuickSpecs: 1, 2, 4, 6, 8, 12, 16
  const isSupportedPopulation = memoryCount > 0 && (memoryCount % cpuCount === 0) && [1, 2, 4, 6, 8, 12, 16].includes(dimmsPerCpu);
  const isBalancedChannel = memoryCount > 0 && (memoryCount % cpuCount === 0) && ((memoryCount / cpuCount) % chWidth === 0);
  const hasMixedDdrGeneration = hasDdr4Memory && hasDdr5Memory;
  const hasMixedMemoryTypes = (hasRdimm && (hasLrdimm || hasMrdimm)) || (hasLrdimm && hasMrdimm);

  return {
    memoryCount,
    totalMemoryGb,
    channelsPerCpu: chWidth,
    dimmsPerCpu,
    isSupportedPopulation,
    isBalancedChannel,
    btoMemoryViolations,
    hasBtoMemoryInCto: btoMemoryViolations.length > 0,
    hasDdr4Memory,
    hasDdr5Memory,
    hasMixedDdrGeneration,
    hasRdimm,
    hasLrdimm,
    hasMrdimm,
    hasMixedMemoryTypes,
    memoryItems
  };
```

**Replacement Code:**
```javascript
  // Strictly match installed or detected CPU count (remove hardcoded cpuCount = 2)
  const dimmsPerCpu = cpuCount > 0 ? (memoryCount / cpuCount) : 0;
  // Supported per-socket DIMM populations per Intel Xeon / AMD EPYC QuickSpecs: 1, 2, 4, 6, 8, 12, 16
  const isSupportedPopulation = cpuCount > 0 && memoryCount > 0 && (memoryCount % cpuCount === 0) && [1, 2, 4, 6, 8, 12, 16].includes(dimmsPerCpu);
  const isBalancedChannel = cpuCount > 0 && memoryCount > 0 && (memoryCount % cpuCount === 0) && ((memoryCount / cpuCount) % chWidth === 0);
  const hasMixedDdrGeneration = hasDdr4Memory && hasDdr5Memory;
  const hasMixedMemoryTypes = (hasRdimm && (hasLrdimm || hasMrdimm)) || (hasLrdimm && hasMrdimm);
  const isInvalidChannelConfiguration = (memoryCount > 0 && cpuCount > 0 && !isSupportedPopulation) || (memoryCount > 0 && cpuCount === 0);
  const needsMemory = cpuCount > 0 && memoryCount === 0;

  return {
    cpuCount,
    memoryCount,
    totalMemoryGb,
    channelWidth: chWidth,
    channelsPerCpu: chWidth,
    dimmsPerCpu,
    isSupportedPopulation,
    isBalancedChannel,
    isInvalidChannelConfiguration,
    needsMemory,
    btoMemoryViolations,
    hasBtoMemoryInCto: btoMemoryViolations.length > 0,
    hasDdr4Memory,
    hasDdr5Memory,
    hasMixedDdrGeneration,
    hasRdimm,
    hasLrdimm,
    hasMrdimm,
    hasMixedMemoryTypes,
    memoryItems
  };
```

---

## 4. In-Depth Analysis & Code Fix Specification: Aspect Registry (`aspect_registry.js`)

### 4.1 Problem Analysis
In `scripts/lib/aspects/aspect_registry.js`:
- In `normalizeAspectResult()` for `COMPUTE_THERMAL` (lines 277–283):
  `fanKitUnderPopulated` is never checked. An under-populated modular fan configuration passes without error.
- In `normalizeAspectResult()` for `MEMORY_CHANNEL` (lines 285–290):
  - `needsMemory` (0 RAM modules when CPUs present) is never checked.
  - `hasMixedDdrGeneration` is never checked.
  - `hasMixedMemoryTypes` is never checked.
  - `isInvalidChannelConfiguration` and `isSupportedPopulation === false` are checked side by side without mutual exclusion, potentially causing duplicate errors.

### 4.2 Proposed Implementation in `scripts/lib/aspects/aspect_registry.js`

#### Target Location: Lines 276–291
**Existing Code:**
```javascript
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
```

**Replacement Code:**
```javascript
  switch (id) {
    case 'COMPUTE_THERMAL':
      if (result.needsHeatsink) errors.push('Missing required processor heatsink');
      if (result.hasMixedCpuModels) errors.push('Dual processor models or stepping mismatch (mixed CPU models)');
      if (result.needsDirectLiquidCooling) errors.push('Direct Liquid Cooling required for high-TDP processor');
      if (result.needsHighPerfCooling) errors.push('High-TDP processor (>185W) requires High-Performance Fan Kit');
      if (result.fanKitExceedsMax) errors.push('Fan kit quantity exceeds maximum chassis capacity (CLIC Rule 81354654: max 1 fan kit per server)');
      if (result.fanKitUnderPopulated) errors.push('Insufficient modular fan kits for installed processor count');
      break;

    case 'MEMORY_CHANNEL':
      if (result.hasBtoMemoryInCto) errors.push('Standalone BTO memory SKU is restricted in CTO base server');
      if (result.needsMemory || (result.cpuCount > 0 && result.memoryCount === 0)) errors.push('Missing required system memory (0 RAM modules installed for server CPU)');
      if (result.hasMixedDdrGeneration) errors.push('DDR4 and DDR5 memory generations cannot be mixed in the same server');
      if (result.hasMixedMemoryTypes) errors.push('RDIMM, LRDIMM, and MRDIMM memory types cannot be mixed across channels or sockets');
      if (result.isInvalidChannelConfiguration) errors.push('Invalid memory channel population');
      else if (result.memoryCount > 0 && result.isSupportedPopulation === false) errors.push('Unsupported asymmetric memory DIMM population');
      if (result.memoryCount > 0 && result.isBalancedChannel === false) warnings.push('Unbalanced memory channel interleaving bandwidth');
      break;
```

---

## 5. Test Suite Updates & Regression Proof

### 5.1 Updates to Existing Tests

#### `tests/unit/test_aspect_checkers_comprehensive.js`:
- **Line 24**: Previously asserted `assert.strictEqual(result.hasHeatsinks, true); // True by default if mandatory SKU not provided`.
  - Update to:
    ```javascript
    assert.strictEqual(result.hasHeatsinks, false);
    assert.strictEqual(result.needsHeatsink, true);
    ```
- **Line 50**: Previously asserted `assert.strictEqual(result.hasHeatsinks, true);` for `evalComputeThermal([])`.
  - Update to:
    ```javascript
    assert.strictEqual(result.hasHeatsinks, false);
    assert.strictEqual(result.needsHeatsink, false);
    ```

### 5.2 New Boundary Tests to Add

#### A. In `tests/unit/test_aspect_compute_thermal.js` (Test Group 8):
```javascript
console.log(`\n🔹 Test Group 8: Heatsink & Direct Liquid Cooling (DLC) Normalization`);
// 8A: 0 Heatsinks with CPU present produces needsHeatsink: true
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2 }
];
result = evalComputeThermal(items);
assert(result.hasHeatsinks === false, `Identified 0 heatsinks for 2 CPUs`);
assert(result.needsHeatsink === true, `Flagged needsHeatsink: true when CPUs are present without heatsinks`);

// 8B: Valid heatsinks installed produces needsHeatsink: false
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2 },
  { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 }
];
result = evalComputeThermal(items);
assert(result.hasHeatsinks === true, `Identified installed heatsinks`);
assert(result.needsHeatsink === false, `needsHeatsink is false when heatsinks are present`);

// 8C: CPU <= 350W does not mandate Direct Liquid Cooling
items = [
  { sku: 'P11223-B21', description: 'Intel Xeon Platinum 8490H 1.9GHz 60-core 350W Processor', quantity: 2 }
];
result = evalComputeThermal(items);
assert(result.needsDirectLiquidCooling === false, `350W CPU does not require DLC (air-cooling supported)`);

// 8D: CPU > 350W without DLC mandates Direct Liquid Cooling
items = [
  { sku: 'P44556-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor', quantity: 1 }
];
result = evalComputeThermal(items);
assert(result.needsDirectLiquidCooling === true, `360W CPU mandates Direct Liquid Cooling (needsDirectLiquidCooling: true)`);

// 8E: CPU > 350W with DLC installed satisfies requirement
items = [
  { sku: 'P44556-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor', quantity: 1 },
  { sku: 'P74796-B21', description: 'HPE ProLiant Direct Liquid Cooling Module', quantity: 1 }
];
result = evalComputeThermal(items);
assert(result.needsDirectLiquidCooling === false, `360W CPU with DLC module satisfies cooling requirement`);

// 8F: Under-populated modular fan kit detection
items = [
  { sku: 'P53712-B21', description: 'AMD EPYC 9334 32-core Processor for HPE', quantity: 2 },
  { sku: 'P58465-B21', description: 'HPE ProLiant DL3X5 Gen11 2U Performance Fan Kit', quantity: 2 }
];
result = evalComputeThermal(items, null, {}, 1);
assert(result.fanKitUnderPopulated === true, `2 modular fan kits for 2P server correctly flagged as fanKitUnderPopulated`);
```

#### B. In `tests/unit/test_aspect_memory_channel.js` (Test Group 7):
```javascript
console.log(`\n🔹 Test Group 7: Missing Memory & Channel Configuration Error Flags`);
// 7A: 0 RAM modules with CPUs present
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2 }
];
result = evalMemoryChannel(items);
assert(result.memoryCount === 0, `Detected 0 memory modules`);
assert(result.needsMemory === true, `Flagged needsMemory: true for CPU without RAM`);

// 7B: Asymmetric DIMMs per socket
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2 },
  { sku: 'P54321-B21', description: 'HPE 32GB DDR5 Smart Memory Kit', quantity: 7 }
];
result = evalMemoryChannel(items);
assert(result.isSupportedPopulation === false, `7 DIMMs across 2 CPUs is unsupported`);
assert(result.isInvalidChannelConfiguration === true, `7 DIMMs across 2 CPUs flagged as isInvalidChannelConfiguration: true`);

// 7C: Unsupported DIMMs per socket (5 per CPU)
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2 },
  { sku: 'P54321-B21', description: 'HPE 32GB DDR5 Smart Memory Kit', quantity: 10 }
];
result = evalMemoryChannel(items);
assert(result.isSupportedPopulation === false, `5 DIMMs per CPU is unsupported`);
assert(result.isInvalidChannelConfiguration === true, `10 DIMMs across 2 CPUs flagged as isInvalidChannelConfiguration: true`);

// 7D: Strict CPU count matching (no CPU in items, passedCpuCount = 0)
items = [
  { sku: 'P54321-B21', description: 'HPE 32GB DDR5 Smart Memory Kit', quantity: 8 }
];
result = evalMemoryChannel(items);
assert(result.cpuCount === 0, `Strictly detected 0 CPUs without assuming 2`);
assert(result.isInvalidChannelConfiguration === true, `RAM without CPU flagged as isInvalidChannelConfiguration: true`);
```

#### C. In `tests/unit/test_aspect_registry.js`:
```javascript
test('AspectRegistry — Evaluates COMPUTE_THERMAL needsHeatsink, needsDirectLiquidCooling, and fanKitUnderPopulated', () => {
  const { normalizeAspectResult } = require('../../scripts/lib/aspects/aspect_registry.js');

  const heatsinkRes = normalizeAspectResult('COMPUTE_THERMAL', { needsHeatsink: true });
  assert.strictEqual(heatsinkRes.status, 'FAIL');
  assert.ok(heatsinkRes.errors.some(e => e.includes('Missing required processor heatsink')));

  const dlcRes = normalizeAspectResult('COMPUTE_THERMAL', { needsDirectLiquidCooling: true });
  assert.strictEqual(dlcRes.status, 'FAIL');
  assert.ok(dlcRes.errors.some(e => e.includes('Direct Liquid Cooling required')));

  const fanUnderRes = normalizeAspectResult('COMPUTE_THERMAL', { fanKitUnderPopulated: true });
  assert.strictEqual(fanUnderRes.status, 'FAIL');
  assert.ok(fanUnderRes.errors.some(e => e.includes('Insufficient modular fan kits')));
});

test('AspectRegistry — Evaluates MEMORY_CHANNEL needsMemory, hasMixedDdrGeneration, and hasMixedMemoryTypes', () => {
  const { normalizeAspectResult } = require('../../scripts/lib/aspects/aspect_registry.js');

  const zeroMemRes = normalizeAspectResult('MEMORY_CHANNEL', { cpuCount: 2, memoryCount: 0, needsMemory: true });
  assert.strictEqual(zeroMemRes.status, 'FAIL');
  assert.ok(zeroMemRes.errors.some(e => e.includes('Missing required system memory')));

  const mixedDdrRes = normalizeAspectResult('MEMORY_CHANNEL', { hasMixedDdrGeneration: true });
  assert.strictEqual(mixedDdrRes.status, 'FAIL');
  assert.ok(mixedDdrRes.errors.some(e => e.includes('DDR4 and DDR5 memory generations cannot be mixed')));

  const mixedTypeRes = normalizeAspectResult('MEMORY_CHANNEL', { hasMixedMemoryTypes: true });
  assert.strictEqual(mixedTypeRes.status, 'FAIL');
  assert.ok(mixedTypeRes.errors.some(e => e.includes('RDIMM, LRDIMM, and MRDIMM memory types cannot be mixed')));

  const invalidPopRes = normalizeAspectResult('MEMORY_CHANNEL', { isInvalidChannelConfiguration: true });
  assert.strictEqual(invalidPopRes.status, 'FAIL');
  assert.ok(invalidPopRes.errors.some(e => e.includes('Invalid memory channel population')));
});
```

---

## 6. Verification Criteria & Invariants

1. **Test Matrix Verification**:
   - `npm run test:domain:aspects` must pass with 16/16 suites passed (100.0%).
   - `npm run test:smoke` must pass cleanly.
2. **Linter Gate**:
   - `npm run lint:core` must report 0 warnings and 0 errors (95 rules).
3. **Complexity Gate**:
   - `npm run lint:complexity` must verify all functions remain $\le 135$ CC. Specifically, `evalComputeThermal` (currently CC 116) will remain $\le 120$.
4. **Epistemic Invariant Compliance**:
   - Zero optimistic passes on missing mandatory hardware (CPUs without heatsinks, CPUs without RAM).
   - Strict physical enforcement of Direct Liquid Cooling boundary (>350W TDP).
   - Preservation of dual-brain architecture without synthetic data bypasses.
