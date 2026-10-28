# Handoff Report: Milestone 1, Sub-Area C (PCIe Riser, Networking, Support & Domain Stubs)

**Agent:** Explorer M1_3 (`teamwork_preview_explorer`)  
**Target Recipient:** Worker / Orchestrator  
**Status:** Hard Handoff (Investigation & Specification Complete)  
**Date:** 2026-10-27  

---

## 1. Observation

Direct line-by-line observations in the codebase:

1. **`scripts/lib/aspects/pcie_riser.js`**:
   - Line 250:
     ```javascript
     const activePrimarySlots = isDl380a ? 3 : (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 3 : 2) : 3);
     ```
     When `perNodePrimaryRiser === 0` and `!isDl380a`, `activePrimarySlots` evaluates to `3`. If a server has no primary riser installed, the checker assumes 3 active slots exist.
   - Line 261:
     ```javascript
     isExceedingActiveSlots = (perNodePrimaryRiser > 0 && perNodeSecondaryRiser > 0)
       ? (perNodeCards > (activePrimarySlots + activeSecondarySlots))
       : (perNodeCards > activeSlotsAvailable && activeSlotsAvailable > 0);
     ```
     `&& activeSlotsAvailable > 0` causes `isExceedingActiveSlots` to evaluate to `false` when `activeSlotsAvailable === 0` even when `perNodeCards > 0`.
   - Line 274:
     ```javascript
     const x16LanesAvailable = (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 2 : 1) : 1) + ...
     ```
     Assumes 1 x16 lane is available even when `perNodePrimaryRiser === 0`.
   - Line 277: `laneBifurcationConstraint` is computed (`perNodeX16Required > x16LanesAvailable`), but never checked in `aspect_registry.js`.
2. **`scripts/lib/aspects/networking_ocp.js`**:
   - Lines 184–193: `validateSanTransceivers` computes:
     `isMissing32GbTransceivers`, `isMissing64GbTransceivers`, `isMissingOpticalPatchCables`, `hasSanSinglePointOfFailure`.
     All 4 checks are returned by `evalNetworkingOcp`, but completely dropped in `aspect_registry.js` lines 309–313.
   - When `t.ocpAdapterCount / nodes >= 2`, no check is made for `t.hasCpu1Ocp2Cable || t.hasCpu2Ocp2Cable` (mandatory OCP Slot 2 enablement cable).
3. **`scripts/lib/aspects/support_manufacturing.js`**:
   - Line 85: `parseCpuInfo` matches only `desc.match(/(\d+)\s*-?\s*core/i)`. Fails to match standard `32C` or `16C` strings (e.g. `Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor`), defaulting `coresPerCpu = 16`.
4. **`scripts/lib/aspects/aspect_registry.js`**:
   - Line 55: `adapterSupportManufacturing` hardcodes `0` for `totalSocketCores`:
     ```javascript
     function adapterSupportManufacturing(items, catalogData, _mandatorySkus, serverCount, _ctx) {
       return evalSupportManufacturing(items, catalogData, 0, serverCount);
     }
     ```
   - Lines 325–330: `normalizeAspectResult` never checks `result.hasManagementLicense === false` (CLIC Rule 81322276).
   - Lines 148–156: `SWITCH_FABRIC_PORTS` is a static stub returning `status: 'NOT_EVALUATED'`.
   - Lines 177–198: `ARCHIVE_COLD_STORAGE` is a static stub returning `status: 'NOT_EVALUATED'`.

---

## 2. Logic Chain

1. **PCIe Slot Fallback Failure**:
   From Observation 1: When `perNodePrimaryRiser === 0`, `activePrimarySlots` defaults to 3. If a CTO server has 3 PCIe cards and no primary riser cage, `activeSlotsAvailable = 3`, `isExceedingActiveSlots = false`, and `needsSecondaryRiser = false`. Thus, a CTO configuration missing a physical primary riser passes without error. Changing `activePrimarySlots` to evaluate to `0` when `perNodePrimaryRiser === 0 && !isDl380a`, removing `&& activeSlotsAvailable > 0`, and emitting `needsPrimaryRiser` prevents this optimistic bypass.
2. **x16 Lane Deficit**:
   From Observation 1: High-throughput adapters (GPUs, 200G/400G InfiniBand) require x16 physical lanes. If a user populates 4 x16 cards on a configuration providing only 2 x16 slots, `laneBifurcationConstraint` is `true`. Because `aspect_registry.js` never checks this property, bus bandwidth starvation is ignored. Binding `result.laneBifurcationConstraint` into errors enforces physical lane limits.
3. **Dropped SAN Transceiver & OCP Enablement Violations**:
   From Observation 2: `evalNetworkingOcp` correctly computes missing 32Gb/64Gb transceivers and missing optical patch cables, but because `aspect_registry.js` does not normalize them, a user quoting FC HBAs without optics receives an unverified `PASS`. Similarly, Slot 2 on DL380 requires a CPU2 OCP cable kit (`P48831-B21`); omitting this check leaves the second OCP card uncabled. Binding these checks ensures hardware completeness.
4. **Licensing & Socket Core Math**:
   From Observation 3 & 4: In modern vendor quotes, processor descriptions often designate core counts as `32C` or `64C`. `parseCpuInfo` fails to extract the core count, defaulting to 16 cores. Moreover, `adapterSupportManufacturing` passes `0` as `totalSocketCores`. Consequently, a 64-core dual-socket server appears to have 32 cores, resulting in under-provisioned Windows Server core licenses passing validation. Furthermore, ProLiant Gen11/Gen12 CTO servers require a management license (`R7A11AAE` / `E5Y43A`) per CLIC Rule 81322276; failing to check `hasManagementLicense === false` violates portal submission constraints.
5. **Elimination of Static Domain Stubs**:
   From Observation 4: `SWITCH_FABRIC_PORTS` and `ARCHIVE_COLD_STORAGE` were placeholders returning `NOT_EVALUATED`. By implementing active physical inspection (port count/speed matching for networking; drive bay capacity, slot capacity, cabling, and consumables for tape libraries), full hardware specifications can be actively validated without un-evaluated stubs (satisfying R1).

---

## 3. Caveats

1. **Chassis Profile for Riserless Architecture**: On platforms where rear PCIe slots are captive or built-in (specifically `DL380a Gen12` via rear FIO kit `P74690-B21`), all 3 rear slots are native and active. The logic preserves `isDl380a ? 3 : ...`.
2. **Optical Patch Cable Diagnostics**: Missing optical patch cables (`isMissingOpticalPatchCables`) and single SAN switch topologies (`hasSanSinglePointOfFailure`) are normalized as warnings (`WARN`) rather than hard errors (`FAIL`), consistent with standard enterprise presales practices where customers may provide existing patch cabling or dual fabrics externally.
3. **Empty BOQ Handling in Domain Stubs**: When `items` is empty (`items.length === 0`), `SWITCH_FABRIC_PORTS` and `ARCHIVE_COLD_STORAGE` return `status: 'NOT_EVALUATED'`. This preserves backward compatibility with zero-item domain contract tests (`test_aspect_registry.js` line 118).
4. **Existing Test Alignment**: `test_aspect_pcie_riser.js` Test Group 4 and `test_aspect_registry.js` line 126 will need minor updates to align with the new honest behavior (see Section 5).

---

## 4. Conclusion

All 4 target areas in Milestone 1 Sub-area C have been thoroughly investigated and have exact, drop-in replacement specifications:
- `scripts/lib/aspects/pcie_riser.js`: Eliminate 3-active-slot assumption when `perNodePrimaryRiser === 0`; compute `needsPrimaryRiser`.
- `scripts/lib/aspects/networking_ocp.js`: Implement `needsOcpEnablementCable` when `ocpAdapterCount / nodes >= 2`.
- `scripts/lib/aspects/support_manufacturing.js`: Expand `parseCpuInfo` regex to parse `32C`/`16C`.
- `scripts/lib/aspects/aspect_registry.js`:
  - In `adapterSupportManufacturing`: derive socket cores from `ctx` or processor items.
  - In `normalizeAspectResult`: bind `laneBifurcationConstraint`, `needsPrimaryRiser`, `needsOcpEnablementCable`, `isMissing32GbTransceivers`, `isMissing64GbTransceivers`, `isMissingOpticalPatchCables`, `hasSanSinglePointOfFailure`, and `hasManagementLicense === false` (CLIC Rule 81322276).
  - In `DOMAIN_REGISTRY`: replace static `NOT_EVALUATED` stubs with active physical checkers `evalSwitchFabricPorts` and `evalArchiveColdStorage`.

---

## 5. Verification Method for Worker

### 5.1 Test Commands to Run
1. `npm run test:domain:aspects` (Must achieve 16/16 PASSED, 100%).
2. `npm run lint:core` (Must achieve 0 oxlint warnings/errors across `scripts/` and `tests/`).
3. `npm run lint:complexity` (Must verify all functions $\le 10$ and max CC $\le 135$).

### 5.2 Specific Worker Verification Criteria
1. **PCIe Riser Verification**:
   - In `tests/unit/test_aspect_pcie_riser.js`:
     Test Group 4 currently asserts that 3 PCIe cards without any riser card in `items` have `activeSlotsAvailable === 3`. Update Test Group 4 to assert `activeSlotsAvailable === 0`, `isExceedingActiveSlots === true`, and `needsPrimaryRiser === true`. Add a test with `{ sku: 'P48803-B21', description: 'Primary Riser Kit', quantity: 1 }` and `{ sku: 'P56073-B21', description: 'Primary Riser Cable Kit', quantity: 1 }` asserting `activeSlotsAvailable === 3`.
   - In `tests/unit/test_aspect_registry.js`:
     Add `{ sku: 'R7A11AAE', description: 'HPE Compute Ops Management Standard 3yr Upfront FIO Software', quantity: 1 }` to `sampleServerBOM` so it passes Rule 81322276.
2. **Domain Stubs Verification**:
   - In `tests/unit/test_aspect_registry.js`:
     Update line 126 (`Networking domain marks switch fabric NOT_EVALUATED`) to verify that `JL661A` evaluates actively to `status === 'PASS'`. Add a test with 8 transceivers on `JL661A` verifying that `status === 'FAIL'` with `'Optical transceivers and DAC cables (8) exceed available switch uplink port capacity (4)'`.
   - Add a test for `ARCHIVE_COLD_STORAGE`:
     A BOQ with MSL3040 Base, LTO-8 SAS drive, Mini-SAS HD cable, and 20 cartridges evaluates to `status === 'PASS'`.
     A BOQ with 50 cartridges on an 8-slot MSL 1/8 autoloader evaluates to `status === 'FAIL'` with `'Cartridge count (50) exceeds tape library slot capacity (8)'`.
3. **Networking & OCP Verification**:
   - In `tests/unit/test_aspect_networking_ocp.js`:
     Add a test with 2 OCP adapters without cable asserting `needsOcpEnablementCable === true`.
     Add a test with `P48831-B21` cable asserting `needsOcpEnablementCable === false`.
4. **Support & Manufacturing Verification**:
   - In `tests/unit/test_aspect_support_manufacturing.js`:
     Add a test with `Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor` asserting `detectedCpuCores === 32` (or 64 for 2 CPUs).
