# Milestone 1 Empirical Challenge & Adversarial Analysis Report

**Investigator**: Challenger M1_2 (Adversarial Critic & Domain Specialist)  
**Date**: 2026-10-27  
**Scope**: Milestone 1 Implementation — Storage Tri-Mode, Power Environment, and Active Domain Stubs  
**Test Harness**: `tests/chaos/test_m1_aspect_adversarial_stress.js`  
**Verdict**: **`CHALLENGE_FAILED`** (Two critical empirical defects discovered in `scripts/lib/aspects/storage_tri_mode.js`)

---

## 1. Executive Summary & Verdict

Milestone 1 successfully implemented and verified several key physical constraints:
- Power Environment zero-PSU assertions, integrated power detection (Alletra, StoreEver, Aruba), PSU wattage deficits, and electrical headroom warnings (<20%).
- Backplane drive capacity overflow detection (`isBackplaneCapacityExceeded`).
- Drive/cage form factor mismatches (LFF in SFF).
- Active domain checks in `aspect_registry.js` for networking switch uplink oversubscription (`SWITCH_FABRIC_PORTS`) and cold archive tape library slot/module capacity (`ARCHIVE_COLD_STORAGE`).

However, adversarial stress testing revealed **two critical empirical defects** in `scripts/lib/aspects/storage_tri_mode.js` that break core presales validation and compromise CLIC rule fidelity:

1. **Defect 1: Controller Enablement Cable Check Masked by Smart Storage Battery (`P01366-B21`)**
   - **File & Lines**: `scripts/lib/aspects/storage_tri_mode.js:118-119`
   - **Root Cause**: `P01366-B21`, `P01367-B21`, `'with 145mm cable'`, and `'with 260mm cable'` were mistakenly added to the condition that sets `tally.hasOcpCable = true`.
   - **Impact**: In enterprise servers with hardware RAID controllers (`MR416i-o`, `MR216i-o`, `MR408i-o`) and battery-backed cache, adding the required battery (`P01366-B21`) falsely sets `hasOcpCable = true`. This erroneously satisfies `hasControllerCable`, causing `needsCableKit` to evaluate to `false` even when the mandatory controller backplane enablement cable (`P76700-B21` or `P48918-B21`) is completely omitted from the BOQ. Furthermore, CLIC Rule 81354652 (`needsCapacitorCable`) is rendered permanently unreachable/silent.

2. **Defect 2: Authentic Alletra Storage Array Falsely Demands ProLiant Server Battery**
   - **File & Lines**: `scripts/lib/aspects/storage_tri_mode.js:86-93, 351`
   - **Root Cause**: `isHardwareStorageController` checks `!desc.includes('node controller')`, but fails to exclude `!desc.includes('controller node')`. Furthermore, `needsSmartStorageBattery` does not guard on `isServerChassis`.
   - **Impact**: Authentic HPE Alletra Storage Arrays (e.g., `HPE Alletra 6000 Controller Node Pair`) are falsely categorized as ProLiant Tri-Mode RAID controllers (`tally.hasStorageController = true`), triggering `needsSmartStorageBattery = true` and failing 100% valid storage array BOQs with:
     `'Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup'`.

Because these defects directly compromise physical buildability and presales quote accuracy, Milestone 1 cannot be approved in its current state. The explicit verdict is **`CHALLENGE_FAILED`**.

---

## 2. Test Harness Specification

Test suite: `tests/chaos/test_m1_aspect_adversarial_stress.js`  
Execution command: `node --test tests/chaos/test_m1_aspect_adversarial_stress.js`

### Tested Scenarios
1. **Zero PSUs on standard server chassis**: DL380 Gen12 8SFF server with 0 PSUs. Must fail with `'Power supply required: 0 power supplies configured in BOQ'`.
2. **Integrated power chassis with 0 PSUs**: Alletra 6000, StoreEver MSL3040, and Aruba CX 6300M switch with 0 PSUs. Must pass power check without false 0-PSU errors.
3. **PSU wattage deficit**: Dual 280W CPUs + 2x NVIDIA A100 GPUs (peak ~1510W) configured with 500W PSUs. Must fail with `'Power supply wattage deficit: estimated peak consumption (1510W) exceeds total active PSU supply (500W)'`.
4. **PSU headroom deficit (<20% safety margin)**: Estimated load 744W with 800W Titanium PSUs (headroom required: 893W). Must generate warning `'Power supply headroom deficit: estimated load (744W) violates safe 80% electrical headroom limit (893W)'`.
5. **Drive count exceeding backplane capacity**: Standard 8SFF chassis with 12 drives installed. Must fail `isBackplaneCapacityExceeded: true` and emit `'Installed drives (12) exceed backplane drive capacity (8)'`.
6. **Storage controller cable kit & battery entanglement (Adversarial 6A & 6B)**:
   - 6A: Controller without cable kit and without battery must fail `needsCableKit: true`.
   - 6B: Controller with battery `P01366-B21` without cable kit `P76700-B21` — empirically proves `hasOcpCable` falsely masks missing cable kit.
7. **Chassis drive compatibility & Alletra controller node (Adversarial 7a - 7d)**:
   - 7a: LFF 3.5in drives in SFF chassis must fail `'LFF 3.5-inch drives cannot be installed in SFF chassis'`.
   - 7b: Alletra array with 1 controller node must fail `'Alletra storage array requires exactly two active controller nodes'`.
   - 7c: StoreEver tape library with LTO SAS drive without Mini-SAS HD cable must fail `'StoreEver LTO SAS tape drive requires Mini-SAS HD cable'`.
   - 7d: Clean Alletra array with "Controller Node Pair" — empirically proves false positive ProLiant Smart Storage Battery requirement.
8. **SWITCH_FABRIC_PORTS port oversubscription**: Aruba CX 6300M 4-uplink switch with 8 optical transceivers. Must fail with `'Optical transceivers and DAC cables (8) exceed available switch uplink port capacity (4)'` and speed mismatch (100G QSFP28 optics on 10G/25G switch).
9. **ARCHIVE_COLD_STORAGE tape slot & expansion limit**: MSL3040 Base module (40 slots) with 60 LTO-9 data cartridges must fail with `'Cartridge count (63) exceeds library slot capacity (40)'`, and >6 expansion modules must fail with expansion limit error.
10. **Boundary stress and multi-node scaling**: ServerCount = 4 with 48 drives across 32 bays; transceivers with 0 switches; tape library with 0 drives.

---

## 3. Empirical Test Execution Log

```
> node --test tests/chaos/test_m1_aspect_adversarial_stress.js

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

ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 164.0507
```

---

## 4. Deep Forensic Analysis of Identified Defects

### Defect 1: P01366-B21 Masking Controller Cable Kit

#### Code Location: `scripts/lib/aspects/storage_tri_mode.js:117-122`
```javascript
  if (desc.includes('storage controller enablement cable') || desc.includes('controller enablement cable') || desc.includes('controller enablement kit') ||
      desc.includes('tri-mode pcie fio cable kit') || desc.includes('nvme to tri-mode') || sku === 'P76700-B21' || sku === 'P01367-B21' || sku === 'P01366-B21' ||
      desc.includes('with 260mm cable') || desc.includes('with 145mm cable') ||
      (mandatorySkus?.CONTROLLER_CABLE_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.CONTROLLER_CABLE_KIT.sku))) {
    tally.hasOcpCable = true;
  }
```

#### The Problem:
`P01366-B21` is the **HPE 96W Smart Storage Lithium-ion Battery with 145mm Cable Kit**. The 145mm cable included with this battery connects the battery to the server motherboard's battery power connector. It is **NOT** the storage controller enablement cable (`P76700-B21` on Gen12, `P48918-B21` on Gen11) which connects the storage controller (MR416i-o) to the drive cage backplane!

When an enterprise build includes an `MR416i-o` controller and a `P01366-B21` battery:
1. `tally.hasOcpCable` becomes `true` due to line 118.
2. In `validateStorageCablingAndBackplane` (line 291):
   `const hasControllerCable = t.hasOcpCable || (t.hasYCable && !t.hasIncompatibleYCable);`
   `hasControllerCable` evaluates to `true`.
3. In line 292:
   `const needsCableKit = Boolean(isServerChassis && t.hasStorageController && !hasControllerCable);`
   `needsCableKit` evaluates to `false`!
   **Result**: The server is built with a RAID controller having NO physical cable to the drive cage backplane, but the engine reports `PASS`!
4. In line 299:
   `needsCapacitorCable: Boolean(isServerChassis && t.hasSmartBattery && !t.hasOcpCable)`
   Because `t.hasOcpCable` is `true`, `!t.hasOcpCable` is `false`.
   **Result**: CLIC Rule 81354652 (`Smart Storage Battery requires controller enablement cable kit`) is dead code and never fires.

#### Recommended Remediation for Worker M1:
1. Remove `sku === 'P01367-B21' || sku === 'P01366-B21' || desc.includes('with 260mm cable') || desc.includes('with 145mm cable')` from `hasOcpCable`.
2. Add explicit SKU `P48918-B21` (Gen11 controller enablement cable kit) and `P76700-B21` (Gen12 controller enablement cable kit) to `hasOcpCable`.
3. Track battery cable separately (`hasBatteryCable`) or recognize that `P01366-B21` includes its own internal battery cable but still requires `P48918-B21` / `P76700-B21` for the controller power link per CLIC Rule 81354652.

---

### Defect 2: Alletra Storage Array Falsely Demanding ProLiant Cache Battery

#### Code Location: `scripts/lib/aspects/storage_tri_mode.js:86-93, 351`
```javascript
  const isHardwareStorageController = ((desc.includes('controller') || /\b(mr|sr)\d{3}i/i.test(desc) || desc.includes('smart array')) &&
    !isBootController &&
    !isVroc &&
    !desc.includes('node controller') &&
    !desc.includes('network controller') &&
    !desc.includes('ethernet controller'));
```
And line 351:
```javascript
  needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
```

#### The Problem:
Line 89 excludes `!desc.includes('node controller')`, but fails to exclude `!desc.includes('controller node')`.
In HPE Alletra quotes and catalogs, the component is titled:
`"HPE Alletra 6000 Controller Node Pair"` or `"HPE Alletra 9000 4-way Controller Node"`.
Because `controller node` is not excluded:
1. `desc.includes('controller')` matches.
2. `tally.hasStorageController` is set to `true`.
3. In line 351: `needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery`.
   Notice there is no `isServerChassis` check here!
4. In `normalizeAspectResult`:
   `if (result.needsSmartStorageBattery) errors.push('Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup');`
   **Result**: Every legitimate Alletra storage array evaluation is rejected with a false error demanding a ProLiant server battery.

#### Recommended Remediation for Worker M1:
1. In `isHardwareStorageController` (line 89):
   Add `!desc.includes('controller node') && !desc.includes('alletra')`.
2. In line 351:
   Scope `needsSmartStorageBattery` to server chassis:
   `needsSmartStorageBattery: Boolean(isServerChassis && t.hasStorageController && !t.hasSmartBattery)`.

---

## 5. Verification Commands for Worker M1

To verify the test suite and reproduce the defects:
```powershell
# Run the adversarial stress harness
node --test tests/chaos/test_m1_aspect_adversarial_stress.js

# Run code quality gates
npm run lint:core
npm run lint:complexity
```
