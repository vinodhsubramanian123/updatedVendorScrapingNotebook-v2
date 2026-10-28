# Analysis Report — Milestone 1 Iteration 2: Power & Support/Licensing Aspects Remediation

## Executive Summary
This analysis details the root causes, empirical reproduction, mathematical proofs, and precise code modifications for two critical edge-case defects identified in Milestone 1 review:
1. **Multi-Node Cluster Power Math Deficit (`power_environment.js`)**: `totalHardwareWatts` was accumulating power across all cluster nodes without dividing by `serverCount` prior to computing `estimatedNodeWattage`, resulting in single-node PSU capacities being erroneously benchmarked against aggregate multi-node cluster wattages.
2. **Unconditional Management License Rejection (`support_manufacturing.js` & `aspect_registry.js`)**: CLIC Rule 81322276 was being asserted unconditionally whenever `hasManagementLicense === false`, rejecting valid empty BOMs and loose-component purchase requests where no CTO server chassis exists.

Both fixes preserve all existing invariants, maintain $CC \le 135$, and introduce zero lint warnings.

---

## 1. Multi-Node Cluster Power Math (`scripts/lib/aspects/power_environment.js`)

### 1.1 Problem Boundary & Direct Observation
- **File**: `scripts/lib/aspects/power_environment.js`
- **Location**: Lines 202, 225, 242-255
- **Current Code**:
  ```javascript
  function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}, serverCount = 1) {
    // ...
    let totalHardwareWatts = 0;
    // ...
    for (const it of items) {
      // ...
      if (!isGpuModeConfiguration(desc)) {
        totalHardwareWatts += estimateSystemPowerWatts(it, desc, role);
      }
      tallyPowerHardware(tally, it, desc, sku, role, dcLugSku, skuIndex, mandatorySkus);
    }

    if (tally.psuCount > 0 && tally.maxPsuWattage === 0) {
      tally.maxPsuWattage = 800;
    }

    const estimatedNodeWattage = totalHardwareWatts + 150;
    const requiredWattageWithHeadroom = Math.ceil(estimatedNodeWattage * 1.20);
    const hasPsuHeadroomDeficit = tally.psuCount > 0 && tally.maxPsuWattage < requiredWattageWithHeadroom;
    const hasPsuWattageDeficit = tally.psuCount > 0 && tally.maxPsuWattage < estimatedNodeWattage;
  ```

### 1.2 Mathematical Proof of Failure
Consider a 10-node cluster tender:
- 10x Server Nodes
- 20x Intel Xeon Gold 6330 Processors (2 per node, 205W TDP each)
- 20x 1600W Flex Slot Platinum Power Supplies (2 per node, 1+1 redundant)

**Calculated Values:**
- $W_{\text{hardware, total}} = 20 \times 205\,\text{W} = 4,100\,\text{W}$.
- Current buggy formula:
  $$\text{estimatedNodeWattage} = W_{\text{hardware, total}} + 150 = 4,100 + 150 = 4,250\,\text{W}$$
  $$\text{requiredWattageWithHeadroom} = \lceil 4,250 \times 1.20 \rceil = 5,100\,\text{W}$$
- Evaluated against single-node PSU rating:
  $$\text{maxPsuWattage} = 1,600\,\text{W}$$
  $$\text{hasPsuWattageDeficit} = (1,600 < 4,250) \implies \mathbf{TRUE}$$
  $$\text{hasPsuHeadroomDeficit} = (1,600 < 5,100) \implies \mathbf{TRUE}$$
  $$\text{needsHighLine220v} = (4,250 > 800 \land 1,600 \ge 1,600) \implies \mathbf{TRUE}$$

**Actual Physical Single-Node Load:**
- $W_{\text{hardware, per-node}} = \frac{4,100\,\text{W}}{10} = 410\,\text{W}$.
- Single-node estimated load:
  $$\text{estimatedNodeWattage} = 410 + 150 = 560\,\text{W}$$
  $$\text{requiredWattageWithHeadroom} = \lceil 560 \times 1.20 \rceil = 672\,\text{W}$$
- Against $1,600\,\text{W}$ PSU:
  $$\text{hasPsuWattageDeficit} = (1,600 < 560) \implies \mathbf{FALSE}$$
  $$\text{hasPsuHeadroomDeficit} = (1,600 < 672) \implies \mathbf{FALSE}$$

### 1.3 Proposed Code Specification
1. Normalize `serverCount` parameter handling to support both primitive integer and options object calling conventions (such as `{ serverCount: 40 }` passed as 2nd, 3rd, or 4th parameter):
   ```javascript
   let effectiveNodes = 1;
   if (typeof serverCount === 'number' && serverCount > 0) {
     effectiveNodes = serverCount;
   } else if (typeof serverCount === 'object' && serverCount && typeof serverCount.serverCount === 'number') {
     effectiveNodes = serverCount.serverCount;
   } else if (typeof catalogData === 'object' && catalogData && typeof catalogData.serverCount === 'number') {
     effectiveNodes = catalogData.serverCount;
   }
   const effectiveServerCount = Math.max(1, effectiveNodes || 1);
   ```
2. Divide `totalHardwareWatts` by `effectiveServerCount` before adding base chassis overhead (150W):
   ```javascript
   const estimatedHardwareWattsPerNode = Math.round(totalHardwareWatts / effectiveServerCount);
   const estimatedNodeWattage = estimatedHardwareWattsPerNode + 150;
   const requiredWattageWithHeadroom = Math.ceil(estimatedNodeWattage * 1.20);
   const hasPsuHeadroomDeficit = tally.psuCount > 0 && tally.maxPsuWattage < requiredWattageWithHeadroom;
   const hasPsuWattageDeficit = tally.psuCount > 0 && tally.maxPsuWattage < estimatedNodeWattage;
   ```
3. Pass `effectiveServerCount` consistently to:
   - `checkMixedWattagePsus(tally, items, effectiveServerCount)`
   - `checkMixedEfficiencyPsus(tally, effectiveServerCount)`
   - `minPsusRequired: hasIntegratedPower ? 0 : Math.max(1, effectiveServerCount)`

---

## 2. CTO Management License Gating (`support_manufacturing.js` & `aspect_registry.js`)

### 2.1 Problem Boundary & Direct Observation
- **Files**:
  - `scripts/lib/aspects/support_manufacturing.js` (lines 98-122, 286-356)
  - `scripts/lib/aspects/aspect_registry.js` (lines 55-74, 602-608)
- **Current Code in `aspect_registry.js`**:
  ```javascript
  function normalizeSupportManufacturingResult(result, errors) {
    if (result.hasManagementLicense === false) errors.push('ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)');
    // ...
  }
  ```
- **Observed Defect**:
  When evaluating an empty BOM `[]` or a loose-component BOM (e.g. 2x CPUs only), `evalSupportManufacturing` returns `{ hasManagementLicense: false }`.
  `normalizeSupportManufacturingResult` executes `if (result.hasManagementLicense === false)` and pushes a hard error:
  `'ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276...'`.
  This turns an empty BOM or loose-component procurement into an invalid `status: 'FAIL'` deliverable even though no CTO chassis exists.

### 2.2 Root Cause Analysis
CLIC Rule 81322276 is an HPE One Config Advanced (OCA) factory configurator rule applicable exclusively to Configure-To-Order (CTO) server chassis (e.g., DL380 Gen11/Gen12 CTO base models). It mandates that any factory-integrated server must include a management license (`R7A11AAE` Compute Ops Management or `E5Y43A` OneView Advanced). Loose field-upgrade components, accessories, or empty requests are not factory-integrated servers and must never trigger Rule 81322276.

### 2.3 Proposed Code Specification
1. In `scripts/lib/aspects/support_manufacturing.js`:
   - Import `isBaseChassis` from `../catalog/product_meta.js`.
   - Implement `isCtoServerItem(it, skuIndex)`:
     ```javascript
     function isCtoServerItem(it, skuIndex = null) {
       if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
       const desc = String(it.description || '').toLowerCase();
       const catDesc = skuIndex ? String(skuIndex.get(cleanBaseSKU(it.sku))?.skuData?.Description || '').toLowerCase() : '';
       const fullDesc = `${desc} ${catDesc}`.trim();
       const rawCat = String(it.category || '').toLowerCase();
       const opt = String(it.optionType || '').toUpperCase();

       if (/\b(?:kit|cable|cooling|baffle|heatsink|heat sink|bracket|bezel|blank)\b/i.test(desc) && !/\b(?:server|chassis)\b/i.test(desc)) {
         return false;
       }

       if (isBaseChassis(desc) || (catDesc && isBaseChassis(catDesc)) || isBaseChassis(fullDesc)) {
         return true;
       }

       if (rawCat.includes('base server chassis') || rawCat.includes('chassis')) {
         if (fullDesc.includes('cto') || fullDesc.includes('configure-to-order') || opt === 'CTO' || fullDesc.includes('server')) {
           return true;
         }
       }

       if ((fullDesc.includes('server') || fullDesc.includes('compute module')) &&
           (fullDesc.includes('cto') || fullDesc.includes('configure-to-order') || opt === 'CTO')) {
         return true;
       }

       return false;
     }
     ```
   - In `tallySupportItems(items, catalogData)`:
     Initialize `tally.hasCtoServer = false`.
     In the item iteration loop:
     ```javascript
     if (isCtoServerItem(it, skuIndex)) {
       tally.hasCtoServer = true;
     }
     ```
   - In `evalSupportManufacturing(items, catalogData = null, totalSocketCores = 0, serverCount = 1, options = {})`:
     ```javascript
     const hasCtoServer = t.hasCtoServer || Boolean(options && (options.isCtoChassis || options.hasCtoServer));
     ```
     Return `hasCtoServer` in the result payload.
   - Export `isCtoServerItem` in `module.exports`.

2. In `scripts/lib/aspects/aspect_registry.js`:
   - In `adapterSupportManufacturing`: pass `ctx || {}` as 5th argument to `evalSupportManufacturing`.
   - In `normalizeSupportManufacturingResult(result, errors)`:
     ```javascript
     function normalizeSupportManufacturingResult(result, errors) {
       if (result.hasCtoServer && result.hasManagementLicense === false) {
         errors.push('ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)');
       }
       if (result.hasContradictoryInstallServices) errors.push('Onsite and Remote installation services cannot both be selected');
       if (result.isWindowsLicenseUnderprovisioned) errors.push(`Windows Server core licensing underprovisioned by ${result.missingCoreLicenses || 0} cores`);
       if (result.isVmwareLicenseUnderprovisioned) errors.push(`VMware vSphere core licensing underprovisioned by ${result.missingVmwareCores || 0} cores`);
       if (result.isLinuxSubscriptionUnderprovisioned) errors.push('Linux subscriptions underprovisioned for socket count');
     }
     ```

---

## 3. Boundary Test Plan & Verification Matrix

### 3.1 New Unit Test Suite: Multi-Node Power Math
- **Case 1**: 10-node cluster with 20x 205W CPUs and 20x 1600W PSUs with `serverCount = 10`.
  - Expected: `hasPsuWattageDeficit: false`, `hasPsuHeadroomDeficit: false`, `estimatedNodeWattage: 560`.
- **Case 2**: 10-node cluster with genuine per-node wattage deficit (e.g. 8x 350W CPUs per node with single 500W PSU).
  - Expected: `hasPsuWattageDeficit: true`, `hasPsuHeadroomDeficit: true`.
- **Case 3**: Single-node backward compatibility check (`serverCount = 1` or default).
  - Expected: Identical behavior to baseline.

### 3.2 New Unit Test Suite: Scoped CTO Management License
- **Case 1**: Empty BOM `[]` evaluated through `normalizeAspectResult('SUPPORT_MANUFACTURING', evalSupportManufacturing([]))`.
  - Expected: `status: 'PASS'`, `errors: []`.
- **Case 2**: Loose-component BOM (e.g. CPUs only, no CTO chassis) evaluated through `normalizeAspectResult`.
  - Expected: `status: 'PASS'`, `errors: []`.
- **Case 3**: CTO Server chassis without management license (e.g. `P73282-B21` DL380 Gen12 CTO Server).
  - Expected: `status: 'FAIL'`, `errors: ['ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276...']`.
- **Case 4**: CTO Server chassis with valid management license (`R7A11AAE`).
  - Expected: `status: 'PASS'`, `errors: []`.
- **Case 5**: Cable kit with "CTO" in description (`P52560-B21` DL380 Gen11 CTO Cable Kit).
  - Expected: `hasCtoServer: false`, `status: 'PASS'`.
