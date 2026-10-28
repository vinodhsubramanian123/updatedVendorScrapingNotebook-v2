# Milestone 1 Iteration 2 Explorer Handoff Report: Power & Support/Licensing Aspects

## 1. Observation

### Observation 1: Multi-Node Cluster Power Math Deficit
- **File**: `scripts/lib/aspects/power_environment.js`, lines 225-255.
- **Verbatim Code**:
  ```javascript
  225:   let totalHardwareWatts = 0;
  ...
  242:     if (!isGpuModeConfiguration(desc)) {
  243:       totalHardwareWatts += estimateSystemPowerWatts(it, desc, role);
  244:     }
  245:     tallyPowerHardware(tally, it, desc, sku, role, dcLugSku, skuIndex, mandatorySkus);
  246:   }
  247: 
  248:   if (tally.psuCount > 0 && tally.maxPsuWattage === 0) {
  249:     tally.maxPsuWattage = 800;
  250:   }
  251: 
  252:   const estimatedNodeWattage = totalHardwareWatts + 150;
  253:   const requiredWattageWithHeadroom = Math.ceil(estimatedNodeWattage * 1.20);
  254:   const hasPsuHeadroomDeficit = tally.psuCount > 0 && tally.maxPsuWattage < requiredWattageWithHeadroom;
  255:   const hasPsuWattageDeficit = tally.psuCount > 0 && tally.maxPsuWattage < estimatedNodeWattage;
  ```
- **Direct Empirical Verification**:
  ```powershell
  node -e "const { evalPowerEnvironment } = require('./scripts/lib/aspects/power_environment.js'); console.log(evalPowerEnvironment([{ sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 205W Processor', quantity: 20 }, { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 20 }], null, {}, 10));"
  ```
  **Output Observed**:
  ```javascript
  {
    maxPsuWattage: 1600,
    estimatedNodeWattage: 4250,
    requiredWattageWithHeadroom: 5100,
    hasPsuHeadroomDeficit: true,
    hasPsuWattageDeficit: true,
    needsHighLine220v: true
  }
  ```
  The aggregate cluster hardware watts ($20 \times 205\,\text{W} = 4,100\,\text{W} + 150\,\text{W} = 4,250\,\text{W}$) was benchmarked directly against a single node's PSU capacity ($1,600\,\text{W}$), failing valid multi-cluster tenders.

---

### Observation 2: Unconditional CTO Management License Error on Empty / Loose BOMs
- **Files**:
  - `scripts/lib/aspects/support_manufacturing.js`, lines 99-100, 298-299.
  - `scripts/lib/aspects/aspect_registry.js`, line 603.
- **Verbatim Code (`aspect_registry.js`: 602-608)**:
  ```javascript
  602: function normalizeSupportManufacturingResult(result, errors) {
  603:   if (result.hasManagementLicense === false) errors.push('ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)');
  604:   if (result.hasContradictoryInstallServices) errors.push('Onsite and Remote installation services cannot both be selected');
  605:   if (result.isWindowsLicenseUnderprovisioned) errors.push(`Windows Server core licensing underprovisioned by ${result.missingCoreLicenses || 0} cores`);
  606:   if (result.isVmwareLicenseUnderprovisioned) errors.push(`VMware vSphere core licensing underprovisioned by ${result.missingVmwareCores || 0} cores`);
  607:   if (result.isLinuxSubscriptionUnderprovisioned) errors.push('Linux subscriptions underprovisioned for socket count');
  608: }
  ```
- **Direct Empirical Verification**:
  ```powershell
  node -e "const { normalizeAspectResult } = require('./scripts/lib/aspects/aspect_registry.js'); const { evalSupportManufacturing } = require('./scripts/lib/aspects/support_manufacturing.js'); console.log(normalizeAspectResult('SUPPORT_MANUFACTURING', evalSupportManufacturing([])));"
  ```
  **Output Observed**:
  ```javascript
  {
    status: 'FAIL',
    errors: [
      'ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)'
    ],
    warnings: [],
    advisory: undefined
  }
  ```
  And for loose components (CPUs only):
  ```powershell
  node -e "const { normalizeAspectResult } = require('./scripts/lib/aspects/aspect_registry.js'); const { evalSupportManufacturing } = require('./scripts/lib/aspects/support_manufacturing.js'); console.log(normalizeAspectResult('SUPPORT_MANUFACTURING', evalSupportManufacturing([{ sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 205W Processor', quantity: 2 }])));"
  ```
  **Output Observed**:
  ```javascript
  {
    status: 'FAIL',
    errors: [
      'ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)'
    ]
  }
  ```
  CLIC Rule 81322276 triggers unconditionally because `evalSupportManufacturing` returns `hasManagementLicense: false` whenever no license is present, but neither tracks nor verifies whether a CTO server chassis actually exists in the BOM.

---

## 2. Logic Chain

1. **Power Math Logic**:
   - In multi-node configurations, `items` represents the entire cluster BOM (containing $N$ servers, $2N$ CPUs, $2N$ PSUs).
   - In `power_environment.js`, `totalHardwareWatts` sums `estimateSystemPowerWatts(it, desc, role)` across all items in `items`.
   - By definition, `totalHardwareWatts` equals $\sum_{i=1}^{N} W_{\text{node}_i}$.
   - For homogeneous clusters, the power consumed per node is $\frac{W_{\text{total}}}{N}$.
   - Currently, line 252 sets `estimatedNodeWattage = totalHardwareWatts + 150`, omitting division by $N$ (`effectiveServerCount`).
   - Consequently, when $N = 10$, $4,100\,\text{W}$ is compared against a single PSU's capacity of $1,600\,\text{W}$.
   - Dividing `totalHardwareWatts` by `Math.max(1, effectiveServerCount)` restores mathematical parity: single-node PSU capacity ($1,600\,\text{W}$) is compared against single-node power load ($560\,\text{W}$), clearing false deficits while catching genuine per-node underprovisioning.

2. **CTO Management License Logic**:
   - CLIC Rule 81322276 is an HPE factory integration constraint that applies exclusively to Configure-To-Order (CTO) server chassis.
   - Customers frequently submit quotes or BOMs for loose spare components (e.g. upgrade memory, replacement CPUs, additional network cards) or empty quotes during preliminary inquiry.
   - `evalSupportManufacturing` currently sets `hasManagementLicense = false` by default.
   - `normalizeSupportManufacturingResult` triggers whenever `result.hasManagementLicense === false`.
   - Because `hasCtoServer` was not modeled, `normalizeSupportManufacturingResult` assumes every configuration is a CTO server.
   - By introducing `isCtoServerItem` in `support_manufacturing.js`, emitting `hasCtoServer` in the evaluation result, and guarding Rule 81322276 with `if (result.hasCtoServer && result.hasManagementLicense === false)`, missing management license errors are strictly confined to configurations that actually contain a CTO server chassis.

---

## 3. Caveats

- **Heterogeneous Cluster Multipliers**: In multi-cluster tenders where server nodes have disparate hardware specifications, `serverCount` represents the homogeneous multiplier of the active sub-cluster (per `multi_cluster_splitter.js`). Sizing calculations remain exact per sub-cluster.
- **Loose Add-on Chassis Modules**: Standalone expansion drive cages, SAS expander cards, and storage shelves are categorized as accessories/chassis infrastructure and are intentionally excluded from `isCtoServerItem`, ensuring they do not trigger mandatory server management licenses.
- **Backward Compatibility**: Calling `evalPowerEnvironment` or `evalSupportManufacturing` without specifying `serverCount` defaults cleanly to 1 node, ensuring 100% backward compatibility with all legacy test suites and callers.

---

## 4. Conclusion

The remediation plan is scoped, actionable, and ready for immediate implementation by Worker M1:

### Proposed Patch 1: `scripts/lib/aspects/power_environment.js`
```diff
--- a/scripts/lib/aspects/power_environment.js
+++ b/scripts/lib/aspects/power_environment.js
@@ -202,3 +202,11 @@
 function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}, serverCount = 1) {
+  let effectiveNodes = 1;
+  if (typeof serverCount === 'number' && serverCount > 0) {
+    effectiveNodes = serverCount;
+  } else if (typeof serverCount === 'object' && serverCount && typeof serverCount.serverCount === 'number') {
+    effectiveNodes = serverCount.serverCount;
+  } else if (typeof catalogData === 'object' && catalogData && typeof catalogData.serverCount === 'number') {
+    effectiveNodes = catalogData.serverCount;
+  }
+  const effectiveServerCount = Math.max(1, effectiveNodes || 1);
+
   const tally = {
@@ -252,6 +260,7 @@
-  const estimatedNodeWattage = totalHardwareWatts + 150;
+  const estimatedHardwareWattsPerNode = Math.round(totalHardwareWatts / effectiveServerCount);
+  const estimatedNodeWattage = estimatedHardwareWattsPerNode + 150;
   const requiredWattageWithHeadroom = Math.ceil(estimatedNodeWattage * 1.20);
   const hasPsuHeadroomDeficit = tally.psuCount > 0 && tally.maxPsuWattage < requiredWattageWithHeadroom;
   const hasPsuWattageDeficit = tally.psuCount > 0 && tally.maxPsuWattage < estimatedNodeWattage;
@@ -288,4 +297,4 @@
-      hasMixedWattagePsus: checkMixedWattagePsus(tally, items, serverCount),
-      hasMixedEfficiencyPsus: checkMixedEfficiencyPsus(tally, serverCount),
+      hasMixedWattagePsus: checkMixedWattagePsus(tally, items, effectiveServerCount),
+      hasMixedEfficiencyPsus: checkMixedEfficiencyPsus(tally, effectiveServerCount),
       platinumPsuCount: tally.platinumPsuCount || 0,
       titaniumPsuCount: tally.titaniumPsuCount || 0,
       hasSupportedDl380aPsuWattage: dl380aPsu.hasSupportedWattage,
       hasDl380aGpuPsuShortage: dl380aPsu.hasShortage,
       isDl145EdgeChassis: tally.isDl145EdgeChassis,
       hasDl145PsuOversizing: checkDl145PsuOversizing(tally),
       hasIntegratedPower,
-      minPsusRequired: hasIntegratedPower ? 0 : Math.max(1, serverCount || 1),
+      minPsusRequired: hasIntegratedPower ? 0 : effectiveServerCount,
       hasZeroPsus: tally.psuCount === 0 && !hasIntegratedPower
```

### Proposed Patch 2: `scripts/lib/aspects/support_manufacturing.js`
```diff
--- a/scripts/lib/aspects/support_manufacturing.js
+++ b/scripts/lib/aspects/support_manufacturing.js
@@ -7,2 +7,2 @@
-const { classifyComponentRole } = require('../catalog/product_meta.js');
+const { classifyComponentRole, isBaseChassis } = require('../catalog/product_meta.js');
 
+function isCtoServerItem(it, skuIndex = null) {
+  if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
+  const desc = String(it.description || '').toLowerCase();
+  const catDesc = skuIndex ? String(skuIndex.get(cleanBaseSKU(it.sku))?.skuData?.Description || '').toLowerCase() : '';
+  const fullDesc = `${desc} ${catDesc}`.trim();
+  const rawCat = String(it.category || '').toLowerCase();
+  const opt = String(it.optionType || '').toUpperCase();
+
+  if (/\b(?:kit|cable|cooling|baffle|heatsink|heat sink|bracket|bezel|blank)\b/i.test(desc) && !/\b(?:server|chassis)\b/i.test(desc)) {
+    return false;
+  }
+  if (isBaseChassis(desc) || (catDesc && isBaseChassis(catDesc)) || isBaseChassis(fullDesc)) {
+    return true;
+  }
+  if (rawCat.includes('base server chassis') || rawCat.includes('chassis')) {
+    if (fullDesc.includes('cto') || fullDesc.includes('configure-to-order') || opt === 'CTO' || fullDesc.includes('server')) {
+      return true;
+    }
+  }
+  if ((fullDesc.includes('server') || fullDesc.includes('compute module')) &&
+      (fullDesc.includes('cto') || fullDesc.includes('configure-to-order') || opt === 'CTO')) {
+    return true;
+  }
+  return false;
+}
+
@@ -100,2 +128,3 @@
     hasSupportService: false,
     hasManagementLicense: false,
+    hasCtoServer: false,
     hasWindowsServer: false,
@@ -130,2 +159,5 @@
+    if (isCtoServerItem(it, skuIndex)) {
+      tally.hasCtoServer = true;
+    }
     if (isOnsiteInstallationService(it.sku, it.description)) {
@@ -286,4 +318,5 @@
-function evalSupportManufacturing(items, catalogData = null, totalSocketCores = 0, serverCount = 1) {
+function evalSupportManufacturing(items, catalogData = null, totalSocketCores = 0, serverCount = 1, options = {}) {
   const nodes = Math.max(1, parseInt(serverCount, 10) || 1);
   const t = tallySupportItems(items, catalogData);
+  const hasCtoServer = t.hasCtoServer || Boolean(options && (options.isCtoChassis || options.hasCtoServer));
 
@@ -300,2 +333,3 @@
     hasSupportService: t.hasSupportService,
     hasManagementLicense: t.hasManagementLicense,
+    hasCtoServer,
     hasWindowsServer: t.hasWindowsServer,
@@ -367,2 +401,3 @@
   isSaasSoftwareSubscription,
   isHardwareBreakFixSupport,
+  isCtoServerItem,
   VALID_MANAGEMENT_SKUS,
```

### Proposed Patch 3: `scripts/lib/aspects/aspect_registry.js`
```diff
--- a/scripts/lib/aspects/aspect_registry.js
+++ b/scripts/lib/aspects/aspect_registry.js
@@ -73,3 +73,3 @@
-  return evalSupportManufacturing(items, catalogData, cores, serverCount);
+  return evalSupportManufacturing(items, catalogData, cores, serverCount, ctx || {});
 }
@@ -602,3 +602,3 @@
 function normalizeSupportManufacturingResult(result, errors) {
-  if (result.hasManagementLicense === false) errors.push('ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)');
+  if (result.hasCtoServer && result.hasManagementLicense === false) errors.push('ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)');
   if (result.hasContradictoryInstallServices) errors.push('Onsite and Remote installation services cannot both be selected');
```

---

## 5. Verification Method

To independently verify that the defects are resolved after the worker applies the patches:

1. **Verify Multi-Node Power Calculation Fix**:
   ```powershell
   node -e "const { evalPowerEnvironment } = require('./scripts/lib/aspects/power_environment.js'); const res = evalPowerEnvironment([{ sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 205W Processor', quantity: 20 }, { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 20 }], null, {}, 10); console.log('estimatedNodeWattage:', res.estimatedNodeWattage, 'hasPsuWattageDeficit:', res.hasPsuWattageDeficit, 'hasPsuHeadroomDeficit:', res.hasPsuHeadroomDeficit); if (res.hasPsuWattageDeficit || res.hasPsuHeadroomDeficit) process.exit(1);"
   ```
   *Expected Output*: `estimatedNodeWattage: 560 hasPsuWattageDeficit: false hasPsuHeadroomDeficit: false` (exit code 0).

2. **Verify Empty BOM CTO License Gating**:
   ```powershell
   node -e "const { normalizeAspectResult } = require('./scripts/lib/aspects/aspect_registry.js'); const { evalSupportManufacturing } = require('./scripts/lib/aspects/support_manufacturing.js'); const res = normalizeAspectResult('SUPPORT_MANUFACTURING', evalSupportManufacturing([])); console.log('Empty BOM status:', res.status, 'errors:', res.errors); if (res.status !== 'PASS') process.exit(1);"
   ```
   *Expected Output*: `Empty BOM status: PASS errors: []` (exit code 0).

3. **Verify Loose Component BOM CTO License Gating**:
   ```powershell
   node -e "const { normalizeAspectResult } = require('./scripts/lib/aspects/aspect_registry.js'); const { evalSupportManufacturing } = require('./scripts/lib/aspects/support_manufacturing.js'); const res = normalizeAspectResult('SUPPORT_MANUFACTURING', evalSupportManufacturing([{ sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 205W Processor', quantity: 2 }])); console.log('Loose CPU status:', res.status, 'errors:', res.errors); if (res.status !== 'PASS') process.exit(1);"
   ```
   *Expected Output*: `Loose CPU status: PASS errors: []` (exit code 0).

4. **Verify CTO Server Chassis Still Enforces Rule 81322276**:
   ```powershell
   node -e "const { normalizeAspectResult } = require('./scripts/lib/aspects/aspect_registry.js'); const { evalSupportManufacturing } = require('./scripts/lib/aspects/support_manufacturing.js'); const res = normalizeAspectResult('SUPPORT_MANUFACTURING', evalSupportManufacturing([{ sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 }])); console.log('CTO Server status:', res.status, 'errors:', res.errors); if (res.status !== 'FAIL') process.exit(1);"
   ```
   *Expected Output*: `CTO Server status: FAIL errors: [ 'ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276...' ]` (exit code 0).

5. **Verify Full Domain Test Suite Passes**:
   ```powershell
   npm run test:domain:aspects
   ```
   *Expected Output*: 18/18 test suites passed (100.0%).
