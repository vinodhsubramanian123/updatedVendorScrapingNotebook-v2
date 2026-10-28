# Milestone 1 Handoff Report: Adversarial Empirical Challenge

**Agent**: Challenger M1_2 (teamwork_preview_challenger)  
**Role**: Empirical Critic & Domain Specialist  
**Assigned Working Directory**: `.agents/teamwork/challenger_m1_2/`  
**Verdict**: **`CHALLENGE_FAILED`**  

---

## 1. Observation

Adversarial stress-testing of Milestone 1 physical aspect checkers (`storage_tri_mode.js`, `power_environment.js`, and `aspect_registry.js`) was executed via the newly authored stress suite `tests/chaos/test_m1_aspect_adversarial_stress.js`.

### Tool Execution: Adversarial Test Suite
```powershell
node --test tests/chaos/test_m1_aspect_adversarial_stress.js
```
**Output**:
```
✔ Adversarial 1: Zero PSUs on standard server chassis MUST fail (15.5425ms)
✔ Adversarial 2: Integrated power chassis (Alletra, StoreEver, Switch) with 0 PSUs MUST pass power check (0.9428ms)
✔ Adversarial 3: PSU wattage deficit (high-power hardware vs small PSU) MUST fail (0.5825ms)
✔ Adversarial 4: PSU headroom deficit (<20% safety margin) MUST produce warning (0.4468ms)
✔ Adversarial 5: Drive count exceeding backplane capacity MUST fail isBackplaneCapacityExceeded (0.408ms)
✔ Adversarial 6A: Storage controller without controller enablement cable MUST fail needsCableKit (0.7329ms)
✔ Adversarial 6B: DEFECT VERIFICATION — P01366-B21 Smart Storage Battery falsely masks missing controller cable kit (0.281ms)
✔ Adversarial 7a: LFF 3.5in drives in SFF chassis MUST fail (0.3184ms)
✔ Adversarial 7b: Alletra storage array with missing controller node MUST fail (0.6447ms)
✔ Adversarial 7c: StoreEver tape storage missing Mini-SAS HD cable MUST fail (0.608ms)
✔ Adversarial 7d: DEFECT VERIFICATION — Alletra "Controller Node Pair" falsely triggers server Smart Storage Battery error (0.5291ms)
✔ Adversarial 8: SWITCH_FABRIC_PORTS port oversubscription on networking switches MUST fail (1.0704ms)
✔ Adversarial 9: ARCHIVE_COLD_STORAGE cartridge count exceeding tape library capacity MUST fail (0.6689ms)
✔ Adversarial 10: Multi-node scaling and edge-case boundary fuzzing (0.9263ms)
ℹ tests 14 | suites 0 | pass 14 | fail 0 | cancelled 0 | skipped 0 | todo 0 | duration_ms 164.0507
```

### Direct Empirical Observations & Code Locations

1. **Defect 1: Smart Storage Battery Masks Missing Storage Controller Backplane Cable Kit**
   - **File**: `scripts/lib/aspects/storage_tri_mode.js`
   - **Lines 117-122**:
     ```javascript
     if (desc.includes('storage controller enablement cable') || desc.includes('controller enablement cable') || desc.includes('controller enablement kit') ||
         desc.includes('tri-mode pcie fio cable kit') || desc.includes('nvme to tri-mode') || sku === 'P76700-B21' || sku === 'P01367-B21' || sku === 'P01366-B21' ||
         desc.includes('with 260mm cable') || desc.includes('with 145mm cable') ||
         (mandatorySkus?.CONTROLLER_CABLE_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.CONTROLLER_CABLE_KIT.sku))) {
       tally.hasOcpCable = true;
     }
     ```
   - **Observation**: `P01366-B21` is titled `"HPE 96W Smart Storage Battery with 145mm Cable Kit"`. It is a battery with an internal motherboard battery power harness, **not** the controller-to-backplane enablement cable (`P76700-B21` / `P48918-B21`).
   - When tested with `{ sku: 'P06367-B21', desc: 'MR416i-o' }` and `{ sku: 'P01366-B21', desc: 'Battery with 145mm Cable' }`:
     ```javascript
     evalStorageTriMode(items) => { hasOcpCable: true, needsCableKit: false, needsCapacitorCable: false }
     ```
     `hasOcpCable` is set to `true`. This causes `needsCableKit` (line 292) to evaluate to `false`, allowing an un-cabled controller without backplane connection to pass as valid!
   - Furthermore, line 299 sets `needsCapacitorCable: Boolean(isServerChassis && t.hasSmartBattery && !t.hasOcpCable)`. Because `P01366-B21` itself set `hasOcpCable = true`, `!t.hasOcpCable` is `false`, rendering HPE CLIC Rule 81354652 (`needsCapacitorCable`) dead code and unreachable.

2. **Defect 2: Authentic Alletra Storage Array Falsely Demands ProLiant Server Battery**
   - **File**: `scripts/lib/aspects/storage_tri_mode.js`
   - **Lines 86-93**:
     ```javascript
     const isHardwareStorageController = ((desc.includes('controller') || /\b(mr|sr)\d{3}i/i.test(desc) || desc.includes('smart array')) &&
       !isBootController &&
       !isVroc &&
       !desc.includes('node controller') &&
       !desc.includes('network controller') &&
       !desc.includes('ethernet controller'));
     ```
   - **Line 351**:
     ```javascript
     needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
     ```
   - **Observation**: Line 89 excludes `!desc.includes('node controller')`, but does not exclude `!desc.includes('controller node')`. In HPE Alletra quotes and catalogs, controller nodes are titled `"HPE Alletra 6000 Controller Node Pair"`.
   - When tested with clean Alletra array items (`R0Q35A` base, `R0Q36A` Controller Node Pair, `R0Q37A` NVMe SSDs):
     ```javascript
     evalStorageTriMode(items) => { hasStorageController: true, needsSmartStorageBattery: true }
     normalizeAspectResult('STORAGE_TRI_MODE', res).errors => [
       'Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup'
     ]
     ```
     A legitimate enterprise storage array fails validation because it is falsely classified as a ProLiant Tri-Mode RAID controller requiring a server Smart Storage Battery.

3. **Confirmed Passing Baseline Features**:
   - Zero PSUs on standard server chassis correctly fails (`POWER_ENVIRONMENT`).
   - Integrated power on Alletra, StoreEver, and Aruba switches with 0 PSUs correctly passes with no false errors.
   - PSU wattage deficit (>1400W peak with 500W PSUs) correctly fails.
   - PSU headroom deficit (<20% safety margin) correctly issues a non-blocking warning.
   - Installed drive count exceeding backplane capacity (e.g., 12 drives in 8-bay chassis) correctly fails `isBackplaneCapacityExceeded`.
   - LFF 3.5in drives in SFF chassis correctly fails `'LFF 3.5-inch drives cannot be installed in SFF chassis'`.
   - Alletra storage array with 1 node correctly fails `'Alletra storage array requires exactly two active controller nodes'`.
   - StoreEver tape storage with LTO SAS drive lacking Mini-SAS HD cable correctly fails `'StoreEver LTO SAS tape drive requires Mini-SAS HD cable'`.
   - Networking switch with 8 optical transceivers on 4 uplink ports correctly fails `'Optical transceivers and DAC cables (8) exceed available switch uplink port capacity (4)'` under `SWITCH_FABRIC_PORTS`.
   - Tape library with 63 cartridges on 40 slots correctly fails `'Cartridge count (63) exceeds library slot capacity (40)'` under `ARCHIVE_COLD_STORAGE`.

---

## 2. Logic Chain

1. *Pre-requisite for Buildability*: A physical server configuration cannot be declared 100% buildable if a hardware RAID controller (`MR416i-o`) is missing its physical backplane enablement cable. Without this cable, the controller cannot communicate with or power the drive cages.
2. *Causal Mechanism for Defect 1*:
   - Worker M1 added `P01366-B21` (a battery) and `'with 145mm cable'` to `storage_tri_mode.js:118-119`.
   - Any realistic server quote with an `MR416i-o` controller includes a battery (`P01366-B21`).
   - Adding `P01366-B21` sets `tally.hasOcpCable = true`.
   - `hasControllerCable` becomes `true`.
   - `needsCableKit` evaluates to `false`.
   - Therefore, omitting the mandatory backplane cable kit (`P76700-B21` or `P48918-B21`) goes completely undetected by the validator.
   - In addition, CLIC Rule 81354652 (`needsCapacitorCable`) checks `!t.hasOcpCable`. Because `P01366-B21` set `hasOcpCable`, Rule 81354652 is silenced and will never fire for `P01366-B21`.
3. *Causal Mechanism for Defect 2*:
   - HPE Alletra Storage Arrays feature active-active controller nodes titled `"HPE Alletra 6000 Controller Node Pair"`.
   - In `storage_tri_mode.js:89`, `isHardwareStorageController` excludes `node controller`, but fails to exclude `controller node` or `alletra`.
   - Consequently, `tally.hasStorageController` is set to `true`.
   - In line 351, `needsSmartStorageBattery` evaluates `t.hasStorageController && !t.hasSmartBattery` without restricting to `isServerChassis`.
   - Legitimate Alletra arrays fail with a bogus error demanding a ProLiant Smart Storage Battery.
4. *Conclusion from Logic Chain*: Both defects directly compromise quotation accuracy and physical verification integrity. Milestone 1 cannot be approved until both defects are remediated.

---

## 3. Caveats

- Challenger M1_2 is strictly review-only and did not modify implementation code in `scripts/lib/aspects/`.
- The adversarial stress suite `tests/chaos/test_m1_aspect_adversarial_stress.js` was written and executed to provide permanent regression coverage. It is fully integrated with `node --test` and passes 14/14 tests while asserting the presence of these exact bugs.
- No caveats regarding test reproducibility: both defects were reproduced via one-line direct script evaluations and unit assertions.

---

## 4. Conclusion & Actionable Remediation

**Final Verdict**: **`CHALLENGE_FAILED`**

### Required Remediation for Worker M1:
1. **Fix Defect 1 (`storage_tri_mode.js:118-119`)**:
   - Remove `sku === 'P01367-B21' || sku === 'P01366-B21' || desc.includes('with 260mm cable') || desc.includes('with 145mm cable')` from `hasOcpCable`.
   - Explicitly add `sku === 'P48918-B21'` to `hasOcpCable`.
   - Ensure `P01366-B21` does not satisfy `hasOcpCable`, restoring both `needsCableKit` and CLIC Rule 81354652.
2. **Fix Defect 2 (`storage_tri_mode.js:89, 351`)**:
   - In `isHardwareStorageController` (line 89), add `!desc.includes('controller node') && !desc.includes('alletra')`.
   - In line 351, scope `needsSmartStorageBattery` to server chassis:
     `needsSmartStorageBattery: Boolean(isServerChassis && t.hasStorageController && !t.hasSmartBattery)`.

---

## 5. Verification Method

To independently reproduce the empirical findings:
1. **Run the adversarial stress suite**:
   ```powershell
   node --test tests/chaos/test_m1_aspect_adversarial_stress.js
   ```
2. **Reproduce Defect 1 via CLI**:
   ```powershell
   node -e "const { evalStorageTriMode } = require('./scripts/lib/aspects/storage_tri_mode.js'); const items = [{ sku: 'P73282-B21', description: 'DL380 Gen12 8SFF Server', quantity: 1 }, { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery with 145mm Cable Kit', quantity: 1 }, { sku: 'P06367-B21', description: 'HPE MR416i-o Gen11 Controller', quantity: 1 }, { sku: 'P40498-B21', description: '960GB SAS SSD', quantity: 4 }]; const res = evalStorageTriMode(items); console.log('hasOcpCable:', res.hasOcpCable, 'needsCableKit (BUG if false):', res.needsCableKit);"
   ```
   *Observed output*: `hasOcpCable: true needsCableKit (BUG if false): false`
3. **Reproduce Defect 2 via CLI**:
   ```powershell
   node -e "const { evalStorageTriMode } = require('./scripts/lib/aspects/storage_tri_mode.js'); const { normalizeAspectResult } = require('./scripts/lib/aspects/aspect_registry.js'); const items = [{ sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 }, { sku: 'R0Q36A', description: 'HPE Alletra 6000 Controller Node Pair', quantity: 2 }, { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 8 }]; const res = evalStorageTriMode(items); const norm = normalizeAspectResult('STORAGE_TRI_MODE', res); console.log('norm errors (BUG if battery demanded):', norm.errors);"
   ```
   *Observed output*: `norm errors (BUG if battery demanded): [ 'Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup' ]`
