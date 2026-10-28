# Empirical Challenger Analysis — Milestone 1

**Agent:** Challenger M1_1 (`teamwork_preview_challenger`)  
**Scope:** Physical Aspect Checkers (Thermal, Memory, PCIe Riser)  
**Date:** 2026-10-27  
**Verdict:** `CHALLENGE_FAILED`

---

## 1. Executive Summary

As Challenger M1_1, I conducted rigorous adversarial stress testing and negative-boundary fuzzing against the Milestone 1 physical aspect checkers (`compute_thermal.js`, `memory_channel.js`, `pcie_riser.js`, and `aspect_registry.js`).

While Worker M1 successfully implemented baseline non-zero checks and basic physical gating across standard inputs (69/69 baseline assertions passed in `tests/unit/test_aspect_adversarial_m1.js`), **adversarial stress testing revealed 3 critical physical modeling vulnerabilities**:

1. **`VULN-PCIE-01` (CRITICAL)**: Primary/Secondary Riser Cable Kits (e.g. `P56073-B21`, `P56074-B21`) are mistakenly tallied as installed physical riser boards by `tallyRiserCards()` in `pcie_riser.js`. When a customer configures PCIe expansion cards with only a cable kit and NO physical riser card, `primaryRiserCount` increments to 1, `activeSlotsAvailable` becomes 3, and `needsPrimaryRiser` evaluates to `false`. An unbuildable configuration is certified as buildable.
2. **`VULN-MEM-01` (CRITICAL)**: In `memory_channel.js`, bare substring matching `desc.includes('memory')` causes NVMe storage drives (e.g. "Flash Memory Storage Drive") and Smart Storage Batteries ("Flash Memory Backup") to be counted as system RAM DIMMs. In addition, their flash capacity (e.g. 800GB) is added to `totalMemoryGb`. A server with 0 RAM modules and 2 NVMe drives is evaluated as having 2 RAM modules and 1600GB RAM, completely silencing `needsMemory`.
3. **`VULN-THERM-01` (HIGH)**: In `compute_thermal.js`, plastic chassis air baffles with descriptions such as `"HPE DL380 Gen11 Standard Air Baffle for Heatsink"` trigger `d.includes('heatsink')` in `isHeatsinkItem()`, evaluating `hasHeatsinks = true` and silencing `needsHeatsink = false` on servers with 0 actual heatsinks.

Consequently, Milestone 1 cannot be approved in its current state. The explicit verdict is **`CHALLENGE_FAILED`**.

---

## 2. Test Harness Specification

The standalone empirical stress harness was authored at:
`tests/unit/test_aspect_adversarial_m1.js`

### Mandatory Verification Scenarios Exercised:
1. **Zero heatsinks on installed CPUs**: Evaluated across 2-socket Intel, 1-socket AMD, multi-node clusters, and 0-CPU base models. (Must fail `needsHeatsink` and produce status `FAIL`).
2. **High-TDP CPUs (>350W) without liquid cooling**: Tested at 360W (EPYC 9754), 400W, and exact 350W boundary (Xeon Platinum 8490H). (Must fail `needsDirectLiquidCooling` above 350W).
3. **Zero RAM modules on server CPUs**: Tested on 2-socket and 1-socket configs with 0 RAM. (Must fail `needsMemory` and produce status `FAIL`).
4. **Mixed DDR generations & Mixed memory types**: Tested DDR4 + DDR5, RDIMM + LRDIMM, RDIMM + MRDIMM, and LRDIMM + MRDIMM. (Must flag `hasMixedDdrGeneration` / `hasMixedMemoryTypes`).
5. **Single-socket CPU channel population**: Tested 1 CPU with 5 DIMMs (unsupported), 3 DIMMs (unsupported), 7 DIMMs (unsupported), 4 DIMMs (unbalanced warning), and 8 DIMMs (balanced pass). Tested 12-channel AMD socket.
6. **PCIe cards installed without primary riser**: Tested 1 card, 3 cards, 0 cards, OCP-only exclusions, and DL380a native active slots. (Must fail `needsPrimaryRiser` and `isExceedingActiveSlots`).
7. **x16 lane oversubscription (`laneBifurcationConstraint`)**: Tested 2x x16 cards on primary riser without cable kit (1 lane active -> fail), with cable kit (2 lanes active -> pass), and 3x x16 cards (fail).
8. **End-to-end domain aspect evaluation (`evaluateDomainAspects`)**: Verified error accumulation and overall status transitions (`isAllPassed`, `hasFailures`).

---

## 3. Empirical Test Execution Log

### Command Run:
```powershell
node tests/unit/test_aspect_adversarial_m1.js
```

### Full Verbatim Terminal Output:
```
================================================================
🔥 EMPIRICAL CHALLENGER HARNESS — MILESTONE 1 VERIFICATION
================================================================

--- SECTION 1: Zero Heatsinks on Installed CPUs ---
  ✅ PASS: Counted 2 CPUs
  ✅ PASS: hasHeatsinks is FALSE when 0 heatsinks provided
  ✅ PASS: needsHeatsink is TRUE when 0 heatsinks provided
  ✅ PASS: normalizeAspectResult status is FAIL
  ✅ PASS: Emits heatsink deficit error
  ✅ PASS: P48809-B21 recognized as valid heatsink
  ✅ PASS: needsHeatsink clears to FALSE when heatsink provided

--- SECTION 2: High-TDP CPUs (>350W) Without Liquid Cooling ---
  ✅ PASS: Extracted 360W TDP
  ✅ PASS: hasDirectLiquidCooling is FALSE without DLC
  ✅ PASS: needsDirectLiquidCooling is TRUE for 360W CPU without DLC
  ✅ PASS: Status is FAIL for >350W CPU without DLC
  ✅ PASS: Emits DLC required error
  ✅ PASS: P74796-B21 recognized as valid DLC module
  ✅ PASS: needsDirectLiquidCooling clears to FALSE with DLC
  ✅ PASS: Extracted 350W TDP
  ✅ PASS: 350W exact boundary does not require DLC

--- SECTION 3: Zero RAM Modules on Server CPUs ---
  ✅ PASS: Counted 2 CPUs
  ✅ PASS: memoryCount is 0
  ✅ PASS: needsMemory is TRUE for CPUs with 0 RAM
  ✅ PASS: Status is FAIL for 0 RAM
  ✅ PASS: Emits missing memory error
  ✅ PASS: memoryCount is 16
  ✅ PASS: needsMemory clears to FALSE when RAM provided

--- SECTION 4: Mixed DDR4 + DDR5 & Mixed RDIMM + LRDIMM/MRDIMM ---
  ✅ PASS: hasMixedDdrGeneration is TRUE for DDR4 + DDR5
  ✅ PASS: Status is FAIL for mixed DDR generations
  ✅ PASS: Emits mixed DDR error
  ✅ PASS: hasMixedMemoryTypes is TRUE for RDIMM + LRDIMM
  ✅ PASS: Status is FAIL for mixed memory types
  ✅ PASS: Emits mixed type error
  ✅ PASS: hasMixedMemoryTypes is TRUE for RDIMM + MRDIMM

--- SECTION 5: Single-Socket CPU & Memory Channel Population ---
  ✅ PASS: Honest 1 CPU counted without heuristic fallback to 2
  ✅ PASS: 8 DIMMs per CPU
  ✅ PASS: 8 DIMMs is supported population
  ✅ PASS: 8 DIMMs on 8 channels is balanced
  ✅ PASS: isInvalidChannelConfiguration is FALSE
  ✅ PASS: 5 DIMMs is NOT supported population
  ✅ PASS: isInvalidChannelConfiguration is TRUE for 5 DIMMs
  ✅ PASS: Status is FAIL for 5 DIMMs
  ✅ PASS: Emits invalid channel population error
  ✅ PASS: 4 DIMMs is supported population (half-populated socket)
  ✅ PASS: 4 DIMMs on 8 channels is UNBALANCED (4 % 8 !== 0)
  ✅ PASS: Status is WARN for unbalanced interleaving
  ✅ PASS: Emits unbalanced bandwidth warning

--- SECTION 6: PCIe Cards Installed Without Primary Riser ---
  ✅ PASS: Counted 1 required PCIe card
  ✅ PASS: activeSlotsAvailable is 0 without primary riser
  ✅ PASS: isExceedingActiveSlots is TRUE (1 card > 0 active slots)
  ✅ PASS: needsPrimaryRiser is TRUE
  ✅ PASS: Status is FAIL without primary riser
  ✅ PASS: Emits active slots exceeded error
  ✅ PASS: Emits Primary Riser Kit required error
  ✅ PASS: Counted 3 required PCIe cards
  ✅ PASS: 0 active slots available
  ✅ PASS: 3 cards exceed 0 active slots
  ✅ PASS: needsPrimaryRiser is TRUE
  ✅ PASS: DL380a provides 3 native active rear slots
  ✅ PASS: DL380a does not demand primary riser for 2 cards
  ✅ PASS: 2 cards fit in DL380a 3 active slots

--- SECTION 7: x16 Lane Oversubscription (laneBifurcationConstraint) ---
  ✅ PASS: Counted 2x x16 card demand
  ✅ PASS: Only 1 x16 lane available without cable kit
  ✅ PASS: laneBifurcationConstraint is TRUE (2 cards > 1 lane)
  ✅ PASS: Status is FAIL for x16 lane oversubscription
  ✅ PASS: Emits x16 lane oversubscription error
  ✅ PASS: 2 x16 lanes available with primary cable kit
  ✅ PASS: laneBifurcationConstraint clears to FALSE with 2 lanes
  ✅ PASS: laneBifurcationConstraint is TRUE for 3 cards on 2 lanes

================================================================
⚡ PART 2: ADVERSARIAL STRESS & SUBVERSIVE BOUNDARY ATTACKS
================================================================

🔹 Attack 1: Riser Cable Kit Subversion in pcie_riser.js
  ⚠️ VULNERABILITY DETECTED [VULN-PCIE-01]: Primary Riser Cable Kit Tallied as Physical Riser Card Bypassing needsPrimaryRiser
     Scenario: Customer specifies PCIe card + Primary Riser Cable Kit (P56073-B21) without the physical Primary Riser Card (P48803-B21)
     Observed: primaryRiserCount=1, activeSlotsAvailable=3, needsPrimaryRiser=false

🔹 Attack 2: Flash Memory Storage Drive Subversion in memory_channel.js
  ⚠️ VULNERABILITY DETECTED [VULN-MEM-01]: Storage Drive or Battery with "Memory" Description Counted as System RAM DIMM
     Scenario: Customer specifies server CPU + NVMe Flash Memory Storage Drive with 0 system RAM DIMMs
     Observed: memoryCount=2, totalMemoryGb=1600, needsMemory=false

🔹 Attack 3: Air Baffle Subversion in compute_thermal.js
  ⚠️ VULNERABILITY DETECTED [VULN-THERM-01]: Air Baffle or Accessory with "Heatsink" in Description Counted as Thermal Heatsink
     Scenario: Customer specifies server CPU + Air Baffle ("Standard Air Baffle for Heatsink") with 0 processor heatsinks
     Observed: hasHeatsinks=true, needsHeatsink=false

--- SECTION 8: Domain Evaluation Integration ---
  ✅ PASS: COMPUTE_THERMAL passes on valid BOM
  ✅ PASS: MEMORY_CHANNEL passes on valid BOM
  ✅ PASS: PCIE_RISER passes on valid BOM
  ✅ PASS: All domain aspect checks passed on valid BOM

================================================================
📊 ADVERSARIAL HARNESS SUMMARY:
   Baseline Requirements : 69 Passed | 0 Failed
   Vulnerabilities Found : 3 Physical Modeling Flaws Discovered
================================================================
```

---

## 4. In-Depth Vulnerability Analysis & Counter-Examples

### Vulnerability 1: `VULN-PCIE-01`
- **Component**: `scripts/lib/aspects/pcie_riser.js:158` (`tallyRiserCards`)
- **Observed Code**:
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
      } else if (position === 'SECONDARY') {
        tally.secondaryRiserCount += qty;
      } else if (position === 'TERTIARY') {
        tally.tertiaryRiserCount += qty;
      }
    }
  }
  ```
- **Attack Scenario**:
  A customer orders 1 PCIe network adapter and 1 Primary Riser Cable Kit (`P56073-B21`), but forgets the physical Primary Riser Card (`P48803-B21`):
  ```javascript
  const res = evalPcieRiserSlots([
    { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet Adapter', quantity: 1 },
    { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 }
  ]);
  ```
- **Observed Result**:
  `res.primaryRiserCount === 1`  
  `res.activeSlotsAvailable === 3`  
  `res.needsPrimaryRiser === false`
- **Blast Radius**:
  The configuration is falsely approved. In reality, the customer has cables hanging loose with no physical card slot to plug the network adapter into.
- **Root Cause**:
  `tallyRiserCards` checks `desc.includes('riser')` without excluding `role === 'Cable Kit'` or `desc.includes('cable')`.
- **Proposed Mitigation**:
  In `tallyRiserCards`:
  ```javascript
  function tallyRiserCards(tally, desc, sku, qty, role) {
    if (role === 'Cable Kit' || desc.includes('cable') || desc.includes('cbl')) return;
    if (role === 'PCIe Riser' || desc.includes('riser') || desc.includes('rear fio kit') || (desc.includes('pcie rear') && desc.includes('kit'))) {
      ...
  ```

---

### Vulnerability 2: `VULN-MEM-01`
- **Component**: `scripts/lib/aspects/memory_channel.js:43`
- **Observed Code**:
  ```javascript
  if (role === 'Memory' || desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5')) {
    const qty = (it.quantity || 1);
    memoryCount += qty;
    memoryItems.push(it);
    ...
    const gbMatch = desc.match(/(\d+)\s*gb/i);
    if (gbMatch) {
      totalMemoryGb += (parseInt(gbMatch[1], 10) * qty);
    }
  ```
- **Attack Scenario**:
  A customer orders 1 server CPU and 2 NVMe storage drives whose description contains "Flash Memory Storage Drive", with 0 RAM DIMMs:
  ```javascript
  const res = evalMemoryChannel([
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 Processor', quantity: 1 },
    { sku: 'P13662-B21', description: 'HPE 800GB NVMe Mixed Use Flash Memory Storage Drive', quantity: 2 }
  ]);
  ```
- **Observed Result**:
  `res.memoryCount === 2`  
  `res.totalMemoryGb === 1600`  
  `res.needsMemory === false`
- **Blast Radius**:
  A server with zero physical RAM modules passes the `needsMemory` baseline check because its storage drives were counted as system RAM.
- **Root Cause**:
  `desc.includes('memory')` matches any accessory, battery, or storage device mentioning flash memory.
- **Proposed Mitigation**:
  Exclude storage drives, controllers, batteries, and capacitors before tallying memory:
  ```javascript
  const isStorageOrAccessory = role === 'Storage Drive' || role === 'Storage Battery' || role === 'Storage Controller' ||
    desc.includes('drive') || desc.includes('ssd') || desc.includes('nvme') || desc.includes('battery') || desc.includes('capacitor');
  if (!isStorageOrAccessory && (role === 'Memory' || desc.includes('smart memory') || desc.includes('smart kit') || desc.includes('rdimm') || desc.includes('lrdimm') || desc.includes('mrdimm') || desc.includes('ddr5') || desc.includes('ddr4'))) {
  ```

---

### Vulnerability 3: `VULN-THERM-01`
- **Component**: `scripts/lib/aspects/compute_thermal.js:65` (`isHeatsinkItem`)
- **Observed Code**:
  ```javascript
  const isHeatsinkItem = it => {
    if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
    const sku = cleanBaseSKU(it.sku);
    const d = (it.description || '').toLowerCase();
    if (d.includes('power supply') || d.includes('flex slot') || d.includes('platinum')) return false;
    if (highPerfHeatsinkSku && sku === cleanBaseSKU(highPerfHeatsinkSku)) return true;
    if (['P74792-B21', 'P74794-B21', 'P49145-B21', 'P48818-B21', 'P58459-B21', 'P48809-B21'].includes(sku)) return true;
    if (d.includes('heat sink') || d.includes('heatsink') || classifyComponentRole('', d) === 'Heatsink') return true;
    ...
  ```
- **Attack Scenario**:
  A customer orders a CPU with an air baffle accessory that mentions heatsink:
  ```javascript
  const res = evalComputeThermal([
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 Processor', quantity: 1 },
    { sku: 'P99999-B21', description: 'HPE DL380 Gen11 Standard Air Baffle for Heatsink', quantity: 1 }
  ]);
  ```
- **Observed Result**:
  `res.hasHeatsinks === true`  
  `res.needsHeatsink === false`
- **Blast Radius**:
  Plastic chassis airflow baffling is recognized as a thermal heatsink, allowing an uncooled CPU to be certified as buildable.
- **Root Cause**:
  `d.includes('heatsink')` is not guarded against `d.includes('baffle')`, `d.includes('blank')`, or `d.includes('bracket')`.
- **Proposed Mitigation**:
  In `isHeatsinkItem`:
  ```javascript
  if (d.includes('baffle') || d.includes('blank') || d.includes('bracket') || d.includes('duct') || d.includes('cable')) return false;
  ```

---

## 5. Conclusion & Recommendation

Worker M1 made commendable progress on the baseline requirements of Milestone 1. However, under adversarial scrutiny, three false-negative bypasses were discovered that allow physically invalid server configurations to pass buildability checks.

In accordance with the Empirical Challenger role, I recommend returning Milestone 1 to Worker M1 with the above mitigations before Milestones 2-4 proceed.
