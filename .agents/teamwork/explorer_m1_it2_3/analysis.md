# Detailed Code Fix Specification — Milestone 1 Iteration 2 (PCIe Riser & Storage Tri-Mode)

**Author:** Explorer M1_It2_3 (teamwork_preview_explorer)  
**Date:** 2026-10-27  
**Scope:** Remediation of physical aspect modeling gaps in:
1. `scripts/lib/aspects/pcie_riser.js`
2. `scripts/lib/aspects/storage_tri_mode.js`

---

## 1. Executive Summary & Defect Manifest

During Milestone 1 review, Challenger M1_1, Challenger M1_2, and Reviewer M1_1 uncovered critical physical aspect modeling vulnerabilities where invalid, unbuildable hardware manifests were falsely validated as buildable, and legitimate storage arrays were rejected:

| Defect ID | Target File & Function | Root Cause | Real-World Impact | Remediation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **VULN-PCIE-01** | `scripts/lib/aspects/pcie_riser.js`<br>`tallyRiserCards(tally, desc, sku, qty, role)` (line 158) | `desc.includes('riser')` matches primary & secondary riser cable kits (`P56073-B21`, `P56074-B21`) without excluding cable kits, incrementing `primaryRiserCount` and calculating 3 active slots. | A quote with only a cable kit and NO physical riser card passes with `needsPrimaryRiser = false` and `activeSlotsAvailable = 3`. Customer receives internal wire harness but no physical slot board. | Decompose cable/accessory exclusion into helper `isRiserCableOrAccessory` to exclude cable kits (`role === 'Cable Kit'`, `role === 'PCIe Riser Cable'`, `desc.includes('cable')`, `desc.includes('cbl')`, `desc.includes('cord')`, `sku === 'P56073-B21'`, `sku === 'P56074-B21'`) and blanks/brackets/baffles (`desc.includes('blank')`, `desc.includes('bracket')`, `desc.includes('baffle')`) at entry of `tallyRiserCards`. |
| **VULN-STOR-01** | `scripts/lib/aspects/storage_tri_mode.js`<br>`tallyStorageCablingAndBatteries(...)` (lines 117-122) | Smart Storage Battery kits (`P01366-B21`, `P01367-B21`, `with 145mm cable`, `with 260mm cable`) were included in `hasOcpCable = true`. | Presence of a Smart Storage Battery falsely satisfies `hasControllerCable`, suppressing `needsCableKit` when mandatory backplane cable (`P76700-B21`/`P48918-B21`) is missing. Also permanently silences CLIC Rule 81354652 (`needsCapacitorCable`). | Decouple `P01366-B21`, `P01367-B21`, `with 145mm cable`, `with 260mm cable` from `hasOcpCable`. Explicitly add `sku === 'P48918-B21'` to `hasOcpCable`. |
| **VULN-STOR-02** | `scripts/lib/aspects/storage_tri_mode.js`<br>`tallyRaidControllers(...)` (line 89) & line 351 | `isHardwareStorageController` excludes `!desc.includes('node controller')` but fails to exclude `controller node` or `node pair` (e.g. `HPE Alletra 6000 Controller Node Pair`). Line 351 does not check `isServerChassis`. | Authentic enterprise storage arrays (Alletra 6000) are misclassified as ProLiant servers with Tri-Mode RAID controllers and fail validation demanding a ProLiant Smart Storage Battery. | Exclude `!desc.includes('controller node')`, `!desc.includes('node pair')`, and `!desc.includes('alletra')` in `isHardwareStorageController`. In line 351, scope `needsSmartStorageBattery` to `Boolean(cabling.isServerChassis && t.hasStorageController && !t.hasSmartBattery)`. |

---

## 2. Deep Technical Analysis & Evidence Chains

### 2.1 PCIe Riser: Cable Kit Tallying Defect (`pcie_riser.js`)

#### Observed Code Flow (`pcie_riser.js:158-173`)
```javascript
function tallyRiserCards(tally, desc, sku, qty, role) {
  if (role === 'PCIe Riser' || desc.includes('riser') || desc.includes('rear fio kit') || (desc.includes('pcie rear') && desc.includes('kit'))) {
    const parsedSlots = parseRiserSlotCount(desc);
    const position = desc.includes('secondary') || desc.includes('sec riser')
      ? 'SECONDARY'
      : (desc.includes('tertiary') || desc.includes('tert riser') ? 'TERTIARY' : 'PRIMARY');
    tally.riserEvidence.push({ sku, description: desc, position, quantity: qty, slotsPerRiser: parsedSlots.slots, evidence: parsedSlots.evidence });
    if (position === 'PRIMARY') {
      tally.primaryRiserCount += qty;
...
```

#### Logical Derivation
1. `P56073-B21` is titled `"HPE ProLiant DL380 Gen11 Primary Riser Cable Kit"`.
2. `desc.includes('riser')` evaluates to `true`.
3. `tallyRiserCards` executes, assigning `position = 'PRIMARY'`.
4. `parseRiserSlotCount(desc)` returns `{ slots: 3, evidence: 'LEGACY_POSITION_FALLBACK' }`.
5. `tally.primaryRiserCount += 1`.
6. In `calculatePcieSlots`:
   - `perNodePrimaryRiser = 1`.
   - `activePrimarySlots = (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 3 : 2) : 0) = 3`.
   - `needsPrimaryRiser = !isDl380a && perNodeCards > 0 && perNodePrimaryRiser === 0 = false`.
7. **Empirical Failure**: A BOM containing 1x NIC (`P08443-B21`) and 1x Primary Riser Cable Kit (`P56073-B21`) evaluates to `needsPrimaryRiser: false` and `activeSlotsAvailable: 3`, passing validation despite lacking any physical riser board.

#### Proposed Exact Diff in `scripts/lib/aspects/pcie_riser.js`
```diff
--- a/scripts/lib/aspects/pcie_riser.js
+++ b/scripts/lib/aspects/pcie_riser.js
@@ -156,7 +156,17 @@ function tallyPcieCardDemand(tally, desc, qty, role, isDl380a = false) {
 }
 
+function isRiserCableOrAccessory(role, desc, sku) {
+  if (role === 'Cable Kit' || role === 'PCIe Riser Cable') return true;
+  if (desc.includes('cable') || desc.includes('cbl') || desc.includes('cord')) return true;
+  if (sku === 'P56073-B21' || sku === 'P56074-B21') return true;
+  if (desc.includes('blank') || desc.includes('bracket') || desc.includes('baffle')) return true;
+  return false;
+}
+
 function tallyRiserCards(tally, desc, sku, qty, role) {
+  if (isRiserCableOrAccessory(role, desc, sku)) return;
   if (role === 'PCIe Riser' || desc.includes('riser') || desc.includes('rear fio kit') || (desc.includes('pcie rear') && desc.includes('kit'))) {
     const parsedSlots = parseRiserSlotCount(desc);
     const position = desc.includes('secondary') || desc.includes('sec riser')
```

---

### 2.2 Storage Tri-Mode: Smart Storage Battery Cable Conflation (`storage_tri_mode.js`)

#### Observed Code Flow (`storage_tri_mode.js:117-122`)
```javascript
  if (desc.includes('storage controller enablement cable') || desc.includes('controller enablement cable') || desc.includes('controller enablement kit') ||
      desc.includes('tri-mode pcie fio cable kit') || desc.includes('nvme to tri-mode') || sku === 'P76700-B21' || sku === 'P01367-B21' || sku === 'P01366-B21' ||
      desc.includes('with 260mm cable') || desc.includes('with 145mm cable') ||
      (mandatorySkus?.CONTROLLER_CABLE_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.CONTROLLER_CABLE_KIT.sku))) {
    tally.hasOcpCable = true;
  }
```

#### Logical Derivation
1. `P01366-B21` is `"HPE 96W Smart Storage Battery with 145mm Cable Kit"`. It contains a battery and battery-to-systemboard power cable, NOT a controller backplane data enablement cable (`P76700-B21` / `P48918-B21`).
2. Inclusion in line 118 sets `tally.hasOcpCable = true`.
3. In `validateStorageCablingAndBackplane`:
   - `hasControllerCable = t.hasOcpCable || (t.hasYCable && !t.hasIncompatibleYCable)` evaluates to `true`.
   - `needsCableKit = Boolean(isServerChassis && t.hasStorageController && !hasControllerCable)` evaluates to `false`.
   - `needsCapacitorCable = Boolean(isServerChassis && t.hasSmartBattery && !t.hasOcpCable)` evaluates to `false` because `t.hasOcpCable` is `true`.
4. **Empirical Failure**:
   - A server with an `MR416i-o` controller and a `P01366-B21` battery with NO backplane cable evaluates to `needsCableKit: false`.
   - HPE CLIC Rule 81354652 (`needsCapacitorCable`) becomes unreachable dead code whenever `P01366-B21` is present.

#### Proposed Exact Diff in `scripts/lib/aspects/storage_tri_mode.js` (Lines 117-122)
```diff
--- a/scripts/lib/aspects/storage_tri_mode.js
+++ b/scripts/lib/aspects/storage_tri_mode.js
@@ -116,9 +116,8 @@ function tallyStorageCablingAndBatteries(tally, it, desc, sku, role, batterySku
   }
   if (desc.includes('storage controller enablement cable') || desc.includes('controller enablement cable') || desc.includes('controller enablement kit') ||
-      desc.includes('tri-mode pcie fio cable kit') || desc.includes('nvme to tri-mode') || sku === 'P76700-B21' || sku === 'P01367-B21' || sku === 'P01366-B21' ||
-      desc.includes('with 260mm cable') || desc.includes('with 145mm cable') ||
+      desc.includes('tri-mode pcie fio cable kit') || desc.includes('nvme to tri-mode') || sku === 'P76700-B21' || sku === 'P48918-B21' ||
       (mandatorySkus?.CONTROLLER_CABLE_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.CONTROLLER_CABLE_KIT.sku))) {
     tally.hasOcpCable = true;
   }
```

---

### 2.3 Storage Tri-Mode: Alletra Storage Array Misclassification (`storage_tri_mode.js`)

#### Observed Code Flow (`storage_tri_mode.js:86-93, 295-306, 351`)
```javascript
  const isHardwareStorageController = ((desc.includes('controller') || /\b(mr|sr)\d{3}i/i.test(desc) || desc.includes('smart array')) &&
    !isBootController &&
    !isVroc &&
    !desc.includes('node controller') &&
    !desc.includes('network controller') &&
    !desc.includes('ethernet controller'));
...
  needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
```

#### Logical Derivation
1. HPE Alletra 6000 storage array quotes provide dual active-active controller nodes titled `"HPE Alletra 6000 Controller Node Pair"` (`R0Q36A`).
2. Line 89 excludes `'node controller'`, but does NOT exclude `'controller node'`, `'node pair'`, or `'alletra'`.
3. Consequently, `isHardwareStorageController` matches `R0Q36A` (`desc.includes('controller')` is true).
4. `tally.hasStorageController` becomes `true`.
5. In `evalStorageTriMode:351`:
   - `needsSmartStorageBattery = t.hasStorageController && !t.hasSmartBattery = true`.
6. `normalizeAspectResult('STORAGE_TRI_MODE', res)` emits error:
   `'Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup'`.
7. **Empirical Failure**: Legitimate enterprise SAN/NAS storage arrays fail validation with a false error requiring a ProLiant server battery.

#### Proposed Exact Diff in `scripts/lib/aspects/storage_tri_mode.js` (Lines 86-93, 295-306, 351)
```diff
--- a/scripts/lib/aspects/storage_tri_mode.js
+++ b/scripts/lib/aspects/storage_tri_mode.js
@@ -87,6 +87,9 @@ function tallyRaidControllers(tally, desc, sku) {
     !isBootController &&
     !isVroc &&
     !desc.includes('node controller') &&
+    !desc.includes('controller node') &&
+    !desc.includes('node pair') &&
+    !desc.includes('alletra') &&
     !desc.includes('network controller') &&
     !desc.includes('ethernet controller'));
@@ -302,6 +305,7 @@ function validateStorageCablingAndBackplane(t, serverCount = 1) {
     needsCableKit,
     isBackplaneCapacityExceeded,
-    backplaneCapacity
+    backplaneCapacity,
+    isServerChassis
   };
 }
@@ -348,7 +352,7 @@ function evalStorageTriMode(items, catalogData = null, mandatorySkus = {}, serve
     needsDriveCageForController: cabling.needsDriveCageForController,
     hasControllerNoDriveConflict: cabling.hasControllerNoDriveConflict,
-    needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
+    needsSmartStorageBattery: Boolean(cabling.isServerChassis && t.hasStorageController && !t.hasSmartBattery),
     needsCapacitorCable: cabling.needsCapacitorCable,
     needsCableKit: cabling.needsCableKit,
```

---

## 3. Test Suite Alignment & Regression Updates

Once the worker implements these fixes, the following test suites must be updated to transition from defect detection to remediation verification:

### 3.1 `tests/chaos/test_m1_aspect_adversarial_stress.js`
In lines 226-246 (`Adversarial 6B`) and lines 311-330 (`Adversarial 7d`):
```diff
--- a/tests/chaos/test_m1_aspect_adversarial_stress.js
+++ b/tests/chaos/test_m1_aspect_adversarial_stress.js
@@ -226,7 +226,7 @@ test('Adversarial 6A: Storage controller without controller enablement cable MUS
-test('Adversarial 6B: DEFECT VERIFICATION — P01366-B21 Smart Storage Battery falsely masks missing controller cable kit', () => {
+test('Adversarial 6B: REMEDIATION VERIFICATION — P01366-B21 Smart Storage Battery must not mask missing controller cable kit', () => {
   // Real enterprise configuration flaw:
   // Presales engineer adds P01366-B21 Smart Storage Battery and MR416i-o controller,
   // but OMITS the mandatory P76700-B21 controller backplane cable kit.
@@ -237,13 +237,9 @@ test('Adversarial 6B: DEFECT VERIFICATION — P01366-B21 Smart Storage Battery fal
   const rawStorage = evalStorageTriMode(items, null, {}, 1);
-  // EMPIRICAL BUG REPRODUCTION:
-  // In storage_tri_mode.js lines 118-119, P01366-B21 / "with 145mm cable" sets tally.hasOcpCable = true!
-  // This causes hasOcpCable to be true, needsCableKit to be FALSE, and silences CLIC Rule 81354652.
-  const isDefectPresent = (rawStorage.hasOcpCable === true && rawStorage.needsCableKit === false && rawStorage.needsCapacitorCable === false);
-  assert.ok(
-    isDefectPresent,
-    'EMPIRICAL DEFECT CONFIRMED: P01366-B21 Smart Storage Battery falsely sets hasOcpCable=true, silencing needsCableKit and Rule 81354652'
-  );
+  assert.strictEqual(rawStorage.hasOcpCable, false, 'Battery kit must NOT satisfy hasOcpCable');
+  assert.strictEqual(rawStorage.needsCableKit, true, 'needsCableKit MUST be true when controller enablement cable is missing');
+  assert.strictEqual(rawStorage.needsCapacitorCable, true, 'needsCapacitorCable (Rule 81354652) MUST be true when controller enablement cable is missing');
 });
@@ -311,7 +307,7 @@ test('Adversarial 7c: StoreEver tape storage missing Mini-SAS HD cable MUST fail
-test('Adversarial 7d: DEFECT VERIFICATION — Alletra "Controller Node Pair" falsely triggers server Smart Storage Battery error', () => {
+test('Adversarial 7d: REMEDIATION VERIFICATION — Alletra "Controller Node Pair" must not trigger server Smart Storage Battery error', () => {
   // An authentic Alletra storage array:
   // Base chassis + Controller Node Pair (2 nodes) + NVMe SSDs
   const items = [
@@ -321,12 +317,10 @@ test('Adversarial 7d: DEFECT VERIFICATION — Alletra "Controller Node Pair" false
   const rawStorage = evalStorageTriMode(items, null, {}, 1);
-  // EMPIRICAL BUG REPRODUCTION:
-  // In storage_tri_mode.js line 89, isHardwareStorageController excludes !desc.includes('node controller'),
-  // but fails to exclude !desc.includes('controller node').
-  // As a result, Alletra controller nodes are treated as ProLiant Tri-Mode RAID controllers,
-  // triggering needsSmartStorageBattery: true and failing an authentic storage array.
-  const isDefectPresent = (rawStorage.hasStorageController === true && rawStorage.needsSmartStorageBattery === true);
-  assert.ok(
-    isDefectPresent,
-    'EMPIRICAL DEFECT CONFIRMED: Alletra controller node pair falsely triggers hasStorageController and needsSmartStorageBattery'
-  );
+  assert.strictEqual(rawStorage.hasStorageController, false, 'Alletra controller nodes must NOT be treated as server storage controllers');
+  assert.strictEqual(rawStorage.needsSmartStorageBattery, false, 'Alletra array must NOT require ProLiant Smart Storage Battery');
+  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
+  assert.ok(
+    !normalized.errors.some(e => e.includes('Smart Storage Battery')),
+    'Alletra array must NOT have battery error'
+  );
 });
```

### 3.2 `tests/unit/test_aspect_adversarial_m1.js`
In lines 284-298 (`Attack 1: Riser Cable Kit Subversion`):
```diff
--- a/tests/unit/test_aspect_adversarial_m1.js
+++ b/tests/unit/test_aspect_adversarial_m1.js
@@ -288,6 +288,10 @@ console.log('🔹 Attack 1: Riser Cable Kit Subversion in pcie_riser.js');
 const cableOnlyRes = evalPcieRiserSlots(cableOnlyBOM);
 
+assert(cableOnlyRes.primaryRiserCount === 0, 'Primary riser count is 0 when only cable kit is present');
+assert(cableOnlyRes.needsPrimaryRiser === true, 'needsPrimaryRiser is true when only cable kit is present');
+assert(cableOnlyRes.activeSlotsAvailable === 0, 'activeSlotsAvailable is 0 without physical riser card');
+
 if (cableOnlyRes.primaryRiserCount > 0 && cableOnlyRes.needsPrimaryRiser === false) {
   recordVulnerability(
     'VULN-PCIE-01',
```

---

## 4. Verification Command Matrix

| Test Domain | Command | Expected Outcome |
| :--- | :--- | :--- |
| **Simulated Fix Harness** | `node .agents/teamwork/explorer_m1_it2_3/test_simulated_fixes.js` | All 4 test cases pass with 100% mathematical accuracy. |
| **PCIE Riser Unit Tests** | `node tests/unit/test_aspect_pcie_riser.js` | 27/27 PASS (100%) |
| **Storage Tri-Mode Unit Tests** | `node tests/unit/test_aspect_storage_tri_mode.js` | 20/20 PASS (100%) |
| **Adversarial Chaos Stress Suite** | `node tests/chaos/test_m1_aspect_adversarial_stress.js` | 14/14 PASS (100%) |
| **Adversarial M1 Harness** | `node tests/unit/test_aspect_adversarial_m1.js` | 0 vulnerabilities detected for VULN-PCIE-01. |
| **Full Aspect Domain Matrix** | `npm run test:domain:aspects` | 18/18 suites passed (100%) |
| **Core Linter Gate** | `npm run lint:core` | 0 warnings, 0 errors across 532+ files |
| **Complexity Gate** | `npm run lint:complexity` | 0 breaches; all functions <= 135 CC; decomposed helpers <= 10 CC |
