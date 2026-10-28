# Deep Codebase Survey Report: Residual Intelligence & Epistemic Reasoning Review (Requirement R1)

**Working Directory:** `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_survey_1`  
**Date:** 2026-10-27  
**Explorer:** Explorer 1 (`teamwork_preview_explorer`)  
**Scope:** Review across all 30 dynamic skills in `.agents/skills/`, router pathways in `scripts/evaluators/route_query.js`, and physical aspect checkers in `scripts/lib/aspects/` to identify remaining heuristic simplifications, un-evaluated stubs (`NOT_EVALUATED`), empty defaults, missing checks, and optimistic passes.

---

## 1. Executive Summary

An exhaustive, line-by-line inspection of the 30 dynamic skills, router dispatch pathways, and physical aspect checkers reveals that while the repository possesses a mature, highly sophisticated architectural foundation (100% test pass rate across 16 domain aspect suites, 0 OxLint warnings across 530 files), **significant epistemic disconnects, un-evaluated stubs, heuristic shortcuts, and optimistic false-passes remain in the runtime evaluation engine**.

### Key Systemic Findings:
1. **Physical Checker Return Disconnects in `aspect_registry.js`**: Subsystem checkers calculate rich physical diagnostics, but `normalizeAspectResult()` in `aspect_registry.js` either checks non-existent property names or completely drops computed violations, causing configurations with severe hardware conflicts to pass cleanly.
2. **Optimistic Passes on Completely Missing Hardware**: A server or storage array with **0 power supplies**, **0 processor heatsinks**, or **0 storage drives** evaluates as `status: 'PASS'` because the aspect checkers only test for *mismatches between installed parts* rather than asserting *mandatory component existence*.
3. **Static `NOT_EVALUATED` Stubs in Registered Domains**:
   - In `DOMAIN_REGISTRY.networking`, `SWITCH_FABRIC_PORTS` is a static stub hardcoded to return `status: 'NOT_EVALUATED'`.
   - In `DOMAIN_REGISTRY.archive` and `archive_tape`, `ARCHIVE_COLD_STORAGE` is a static stub returning `status: 'NOT_EVALUATED'`.
   - In `cross_vendor_transformer.js`, 5 of the 12 parity subsystems (`THERMAL_ENVIRONMENT`, `STORAGE_CONTROLLER_CACHE`, `STORAGE_CABLING`, `BOOT_STORAGE_SUBSYSTEM`, `PCIE_EXPANSION_RISERS`) fall through to a default branch returning `NOT_EVALUATED`.
4. **Heuristic Parameter Shortcuts**:
   - `memory_channel.js`: Lines 82 assume `cpuCount = 2` if no CPU is identified, ignoring single-socket (DL325, DL345, DL110, DL145) or 4-socket (DL560, DL580) architectures.
   - `networking_ocp.js`: Line 230 defaults `maxOcpSlots = 2`, allowing dual-OCP adapter configurations to pass on single-slot chassis without checking for mandatory OCP2 enablement cabling.
   - `power_environment.js`: Line 204 initializes `maxPsuWattage = 800`, which masks missing power supplies.
   - `pcie_riser.js`: Line 250 defaults `activePrimarySlots = 3` and `totalPhysicalSlots = 3` even when no primary riser card is installed.
5. **Specialized Skill Deficits (R2 & R3 Alignments)**:
   - `cross-vendor-transformation-skill`: Lacks InfiniBand (HDR/NDR/XDR) and RoCE fabric matching and NUMA channel interleaving.
   - `heterogeneous-tender-modernizer`: Carrier fleet packing uses simple division (`Math.ceil(qty / maxDimms)`) without validating symmetric memory channel population or populating essential carrier node hardware (leaves `items: []`).
   - `strategy-synthesizer` (Rank 5): Implements CPU/memory/thermal budget reductions but completely lacks storage NVMe tier down-tiering.
   - `reasoning_post_analyzer.js` (Phase 9): Narrative fails to emit deterministic counterfactual repair proofs when configurations have conflicts.
   - `feedback_loop.js`: Line 185 accepts local synthetic IDs (`candidate.traceId` or `candidate.deltaId`) as proof of official vendor portal observation, allowing rule promotion from quarantine without authentic portal receipts.

---

## 2. In-Depth Analysis of Physical Aspect Checkers (`scripts/lib/aspects/`)

The physical aspect checker engine consists of 8 modular checkers orchestrated by `aspect_registry.js`. Below is the detailed analysis of each checker, identifying verbatim file lines, functions, disconnects, and heuristic simplifications.

### 2.1 `compute_thermal.js` (`evalComputeThermal`)

#### Code Observations & Logic:
- **Missing Property Binding in Normalization**:
  - In `aspect_registry.js` line 278:
    ```javascript
    case 'COMPUTE_THERMAL':
      if (result.needsHeatsink) errors.push('Missing required processor heatsink');
      if (result.needsDirectLiquidCooling) errors.push('Direct Liquid Cooling required for high-TDP processor');
    ```
  - In `compute_thermal.js` lines 126–158:
    `evalComputeThermal` returns `hasHeatsinks`, `hasMaxPerfHeatsink`, `hasOverprovisionedMaxHeatsink`, `recommendedHeatsinkSku`.
    **`result.needsHeatsink` is NEVER computed or returned by `compute_thermal.js`!**
    **`result.needsDirectLiquidCooling` is NEVER computed or returned by `compute_thermal.js`!**
    Consequently, `result.needsHeatsink` is always `undefined` (falsy), and `'Missing required processor heatsink'` is **never emitted**.
- **Optimistic Pass on Missing Heatsinks**:
  - In `compute_thermal.js` line 77:
    ```javascript
    const hasHeatsinks = highPerfHeatsinkSku ? items.some(isHeatsinkItem) : true;
    ```
    If `highPerfHeatsinkSku` is not explicitly declared in `mandatorySkus`, `hasHeatsinks` automatically defaults to `true`. Even when `highPerfHeatsinkSku` is declared and `hasHeatsinks === false`, because `needsHeatsink` is not returned, the checker passes cleanly!
- **Dropped Physical Diagnostic**:
  - `fanKitUnderPopulated` (line 116):
    ```javascript
    const fanKitUnderPopulated = isModularFan && fanKitCount > 0 && fanKitsPerServer < minFanKitsRequired;
    ```
    `evalComputeThermal` computes whether modular fans (e.g. AMD DL385/DL365 P58465-B21) are under-populated. However, `aspect_registry.js` never checks `fanKitUnderPopulated`. A 2-socket AMD server with only 1 modular fan kit passes without error.
  - `hasOverprovisionedMaxHeatsink` (line 94):
    Computed to prevent the 45-day lead time bottleneck of `P74794-B21` for <=270W CPUs under INV-208, but dropped by `aspect_registry.js`.
- **Missing CPU Sanity**:
  - If a server BOQ has 0 CPUs (`cpuCount === 0`), `evalComputeThermal` returns `cpuCount: 0`, `maxCpuTdpWatts: 0`, `needsHighPerfCooling: false`. No error is emitted for a headless/CPU-less server.

---

### 2.2 `memory_channel.js` (`evalMemoryChannel`)

#### Code Observations & Logic:
- **Disconnected Channel Validation Check**:
  - In `aspect_registry.js` line 287:
    ```javascript
    case 'MEMORY_CHANNEL':
      if (result.hasBtoMemoryInCto) errors.push('Standalone BTO memory SKU is restricted in CTO base server');
      if (result.isInvalidChannelConfiguration) errors.push('Invalid memory channel population');
    ```
  - In `memory_channel.js` lines 91–108:
    `evalMemoryChannel` returns `isSupportedPopulation` and `isBalancedChannel`.
    **`isInvalidChannelConfiguration` is NEVER returned by `memory_channel.js`!** It is always `undefined`.
- **Dropped Physical Incompatibilities**:
  - In `memory_channel.js` lines 88–89:
    ```javascript
    const hasMixedDdrGeneration = hasDdr4Memory && hasDdr5Memory;
    const hasMixedMemoryTypes = (hasRdimm && (hasLrdimm || hasMrdimm)) || (hasLrdimm && hasMrdimm);
    ```
    `hasMixedDdrGeneration` and `hasMixedMemoryTypes` are computed and returned, but **neither is checked in `aspect_registry.js` lines 285–290!**
    A configuration mixing DDR4 and DDR5 DIMMs, or mixing RDIMM and LRDIMM modules, passes `MEMORY_CHANNEL` validation without errors!
- **Heuristic Simplification (Hardcoded CPU Assumption)**:
  - Line 82:
    ```javascript
    if (cpuCount === 0) cpuCount = 2;
    ```
    If no processor is present or parsed, the checker assumes `cpuCount = 2`. On single-socket platforms (DL325 Gen11, DL345 Gen11, DL145 Gen11), this corrupts DIMM channel calculations (e.g. 8 DIMMs evaluated as 4 DIMMs/socket instead of 8 DIMMs on 1 socket).
- **Optimistic Pass on Zero Memory**:
  - If `memoryCount === 0`:
    Line 86: `const isSupportedPopulation = memoryCount > 0 && ...` (evaluates to `false`).
    In `aspect_registry.js` line 288:
    `if (result.memoryCount > 0 && result.isSupportedPopulation === false) errors.push(...)`
    Because `result.memoryCount === 0`, the guard `result.memoryCount > 0` bypasses the check, returning `PASS` for a server with 0 RAM modules!

---

### 2.3 `storage_tri_mode.js` (`evalStorageTriMode`)

#### Code Observations & Logic:
- **Missing Property Bindings in Normalization**:
  - In `aspect_registry.js` line 295 & 297:
    ```javascript
    case 'STORAGE_TRI_MODE':
      if (result.hasIncompatibleYCable) errors.push('Tri-Mode Splitter Cable Kit is incompatible with standard cages');
      if (result.needsSasExpander) errors.push('SAS Expander required for configuration exceeding 8 drives');
      if (result.needsCableKit) errors.push('Storage controller cable kit required');
      if (result.needsSmartStorageBattery) errors.push('Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup');
      if (result.isBackplaneCapacityExceeded) errors.push('Drive count exceeds chassis backplane capacity');
    ```
  - **`result.needsCableKit` is NEVER returned by `storage_tri_mode.js`!** (It returns `hasOcpCable`, `needsCapacitorCable`).
  - **`result.isBackplaneCapacityExceeded` is NEVER returned by `storage_tri_mode.js`!**
- **16 Rich Subsystem Checks Dropped/Ignored by `aspect_registry.js`**:
  `storage_tri_mode.js` implements comprehensive checks across Alletra arrays, StoreEver tape automation, Synergy composable storage, and drive compatibility, but **NONE of these are evaluated in `aspect_registry.js`**:
  1. `alletra.hasMissingControllerNode`: Alletra requires exactly 2 active controller nodes. (Dropped)
  2. `alletra.hasAsymmetricHbas`: Alletra HBAs must be symmetric. (Dropped)
  3. `alletra.missingDaisyChainCables`: Daisy chain cables required for expansion shelves. (Dropped)
  4. `alletra.insufficientRaid6Drives`: RAID 6 requires >= 6 SSDs. (Dropped)
  5. `alletra.insufficientRaid10Drives`: RAID 10 requires >= 4 SSDs. (Dropped)
  6. `compat.hasD3940ConnectivityError`: Synergy D3940 enclosure requires SAS mezzanine + connection module. (Dropped)
  7. `storeEver.needsMiniSasHdCable`: LTO SAS tape drives require Mini-SAS HD cables. (Dropped)
  8. `storeEver.needsFcTransceiver`: LTO FC tape drives require optical transceivers. (Dropped)
  9. `storeEver.exceedsMaxMsl3040Slots`: MSL3040 expansion modules > 6. (Dropped)
  10. `storeEver.exceedsSlotCapacity`: Data cartridges exceed total library slots. (Dropped)
  11. `compat.hasLffDrivesInSffChassis`: LFF 3.5" drives placed in SFF 2.5" chassis. (Dropped)
  12. `compat.hasDriveCageMixingConflict`: Mixing 4SFF and 4EDSFF cages on DL380a. (Dropped)
  13. `compat.hasMr216iORaid56Risk`: Hardware RAID controller MR216i-o attempting RAID 5/6 without write-back cache. (Dropped)
  14. `cabling.needsDriveCageForController`: Hardware RAID controller installed without drive cages. (Dropped)
  15. `cabling.hasControllerNoDriveConflict`: Storage controller paired with "No Drive" FIO kit. (Dropped)
  16. `cabling.needsCapacitorCable`: Battery installed without controller cable kit. (Dropped)
  **Result**: If any of these 16 severe violations occur in a BOQ, `STORAGE_TRI_MODE` returns an optimistic `status: 'PASS'`.

---

### 2.4 `pcie_riser.js` (`evalPcieRiserSlots`)

#### Code Observations & Logic:
- **Dropped Lane Bifurcation Constraint**:
  - In `pcie_riser.js` lines 277–278:
    ```javascript
    const laneBifurcationConstraint = perNodeX16Required > x16LanesAvailable;
    ```
    This accurately tracks whether x16-demanding PCIe cards (such as 200Gb/400Gb Mellanox InfiniBand, NVIDIA H100/H200/L40S GPUs) exceed the number of electrically active x16 slots.
  - **`aspect_registry.js` lines 300–307 NEVER checks `result.laneBifurcationConstraint`!**
    A server with 3 x16 InfiniBand adapters on a riser offering only 1 x16 slot passes `PCIE_RISER` validation.
- **Heuristic Shortcut & Optimistic Mechanical Slot Assumption**:
  - In `pcie_riser.js` lines 250–255:
    ```javascript
    const activePrimarySlots = isDl380a ? 3 : (perNodePrimaryRiser > 0 ? (t.hasPrimaryCableKit ? 3 : 2) : 3);
    const installedRiserSlots = t.riserEvidence.reduce(...);
    const totalPhysicalSlots = 3 + installedRiserSlots;
    ```
    If `perNodePrimaryRiser === 0`, it defaults to `activePrimarySlots = 3` and `totalPhysicalSlots = 3`.
    In HPE ProLiant Gen11/Gen12 CTO servers, PCIe slots 1–3 are hosted on the Primary Riser cage. Without a primary riser kit selected, the server has 0 active rear PCIe slots. The checker optimistically assumes 3 physical slots exist by default.
  - Line 270:
    ```javascript
    const needsSecondaryRiser = perNodeCards > (3 + (perNodePrimaryRiser * 3)) && perNodeSecondaryRiser === 0;
    ```
    If a user configures 3 PCIe cards and 0 risers, `needsSecondaryRiser` evaluates to `false`, `isExceedingTotalSlots` is `false`, and the BOQ passes with zero risers!

---

### 2.5 `networking_ocp.js` (`evalNetworkingOcp`)

#### Code Observations & Logic:
- **Heuristic Default: `maxOcpSlots = 2`**:
  - Lines 230–236:
    `maxOcpSlots` defaults to 2. However, standard 1U servers (DL360 Gen11) and 2U baseline configurations only expose 1 native OCP 3.0 slot (Slot 1). Slot 2 requires an explicit CPU2 OCP enablement cable kit (`P48831-B21` / `P48832-B21`).
  - Lines 263–266:
    ```javascript
    isExceedingOcpSlots: t.ocpAdapterCount > (maxOcpSlots * nodes),
    hasConflictingOcpCables: t.hasCpu1Ocp2Cable && t.hasCpu2Ocp2Cable,
    ```
    If 2 OCP adapters are selected without *any* OCP enablement cable, `t.ocpAdapterCount > (2 * 1)` is `false`, and `hasConflictingOcpCables` is `false`. The configuration **optimistically passes**, leaving Slot 2 unpowered and uncabled!
- **Dropped SAN & Synergy Transceiver Diagnostics**:
  - `evalNetworkingOcp` computes:
    - `isMissing32GbTransceivers` (line 188)
    - `isMissing64GbTransceivers` (line 189)
    - `isMissingOpticalPatchCables` (line 190)
    - `hasSanSinglePointOfFailure` (line 191)
    - `synergyFabricErrors` (line 220)
  - In `aspect_registry.js` lines 309–313, **none of these 5 diagnostics are checked**. Fiber Channel HBAs with zero transceivers or missing cables pass without warning.

---

### 2.6 `power_environment.js` (`evalPowerEnvironment`)

#### Code Observations & Logic:
- **Omission of Critical Wattage Deficit Checks**:
  - In `power_environment.js` lines 241–242:
    ```javascript
    const hasPsuHeadroomDeficit = tally.psuCount > 0 && tally.maxPsuWattage < requiredWattageWithHeadroom;
    const hasPsuWattageDeficit = tally.psuCount > 0 && tally.maxPsuWattage < estimatedNodeWattage;
    ```
  - In `aspect_registry.js` lines 315–323:
    `aspect_registry.js` checks `hasMixedAcDcPower`, `hasMixedWattagePsus`, `hasMixedEfficiencyPsus`, `hasDl380aGpuPsuShortage`, `hasSynergyRedundantPowerError`, `hasDcPowerSupply`, `needsCeRemovalKit`.
    **`result.hasPsuWattageDeficit` is COMPLETELY OMITTED!**
    **`result.hasPsuHeadroomDeficit` is COMPLETELY OMITTED!**
    **`result.needsHighLine220v` is COMPLETELY OMITTED!**
    **`result.hasDl145PsuOversizing` is COMPLETELY OMITTED!**
    **Critical Consequence**: A high-density server requiring 1400W load equipped with dual 500W PSUs evaluates as `status: 'PASS'`.
- **Extreme Optimistic Pass: Server with Zero Power Supplies**:
  - If a BOQ contains 0 PSUs (`tally.psuCount === 0`):
    - `hasMixedAcDcPower = false`
    - `hasMixedWattagePsus = false`
    - `hasMixedEfficiencyPsus = false`
    - `hasDl380aGpuPsuShortage = false`
    - `hasDcPowerSupply = false`
  - In `aspect_registry.js`, none of the error conditions trigger.
  - **A server with ZERO power supplies passes the power environment aspect!**
- **Default Wattage Fallback**:
  - Line 204: `maxPsuWattage: 800`. If 0 PSUs exist, `maxPsuWattage` defaults to 800W rather than 0W or `null`, masking the missing PSU in downstream calculations.

---

### 2.7 `support_manufacturing.js` (`evalSupportManufacturing`)

#### Code Observations & Logic:
- **CLIC Rule 81322276 Management License Omission**:
  - Line 100 & 180: Tracks `hasManagementLicense` (e.g. `R7A11AAE` Compute Ops Management 3yr SaaS).
  - In `aspect_registry.js` lines 325–330:
    ```javascript
    case 'SUPPORT_MANUFACTURING':
      if (result.hasContradictoryInstallServices) errors.push('Onsite and Remote installation services cannot both be selected');
      if (result.isWindowsLicenseUnderprovisioned) errors.push(`Windows Server core licensing underprovisioned by ${result.missingCoreLicenses || 0} cores`);
      if (result.isVmwareLicenseUnderprovisioned) errors.push(`VMware vSphere core licensing underprovisioned by ${result.missingVmwareCores || 0} cores`);
      if (result.isLinuxSubscriptionUnderprovisioned) errors.push('Linux subscriptions underprovisioned for socket count');
      break;
    ```
    **`hasManagementLicense === false` is NOT checked in `aspect_registry.js`!**
    Although `B14` in `bom_verifier.js` audits Rule 81322276, the domain physical aspect checker itself drops it.
- **Dropped SaaS Without Hardware Support Rule**:
  - Line 348 computes `hasSaasWithoutHardwareSupport: t.hasSaasSubscription && !t.hasHardwareSupport`. Dropped by `aspect_registry.js`.
- **Zero Sockets / Zero Cores Parameter Passing**:
  - In `aspect_registry.js` line 55:
    ```javascript
    function adapterSupportManufacturing(items, catalogData, _mandatorySkus, serverCount, _ctx) {
      return evalSupportManufacturing(items, catalogData, 0, serverCount);
    }
    ```
    It passes hardcoded `0` for `totalSocketCores`. If the CPU description regex fails to parse core counts from item strings, `detectedCpuCores` defaults to `0`, causing Windows Server licensing checks to assume 0 cores and pass.

---

### 2.8 Non-Server Aspect Checkers in `DOMAIN_REGISTRY`

In `aspect_registry.js` lines 99–208, several registered domains contain un-evaluated stubs:

1. **`networking` domain**:
   - Aspect `SWITCH_FABRIC_PORTS` (lines 148–156):
     ```javascript
     checker: (_items, _catalogData, _mandatorySkus, _serverCount, _ctx) => {
       return {
         status: 'NOT_EVALUATED',
         advisory: 'Switch port fabric, speed matching, protocol, and airflow alignment require switch ASIC profile; marked NOT_EVALUATED'
       };
     }
     ```
     **Hardcoded stub returning `NOT_EVALUATED`.**
2. **`archive` and `archive_tape` domains**:
   - Aspect `ARCHIVE_COLD_STORAGE` (lines 177–198):
     ```javascript
     checker: (_items, _catalogData, _mandatorySkus, _serverCount, _ctx) => {
       return {
         status: 'NOT_EVALUATED',
         advisory: 'Archive domain physical constraints not evaluated; tape library chassis profile not loaded'
       };
     }
     ```
     **Hardcoded stub returning `NOT_EVALUATED`.**
3. **`storage` domain**:
   - Aspect `STORAGE_CONTROLLER_PAIR` (lines 112–140):
     Uses naive substring matching:
     `desc.includes('controller node') || desc.includes('controller enclosure') || desc.includes('storage node')`
     If a storage BOQ uses official part numbers (e.g. `R0P87A`, `R0P88A`) without those exact substring keywords in the description, `nodeCount === 0`, and the checker returns `status: 'NOT_EVALUATED'` instead of validating against catalog SKU roles or failing.

---

## 3. Review of Router Pathways (`scripts/evaluators/route_query.js`)

`scripts/evaluators/route_query.js` (2,062 lines) is the central dispatcher for presales queries.

### 3.1 Intent Classification Matrix
The router classifies queries into 5 primary canonical tracks and 12 specialized sub-tracks:
1. `FREEFORM_QA` (`presales-query-router` / `nlm-skill`)
2. `RFP_SIZING_TO_BOM` (`rfp-sizing-synthesizer`)
3. `BOQ_EVALUATION` (`boq-eval-skill`)
4. `BOM_RECONCILIATION` (`bom-reconciliation-skill`)
5. `CATALOG_INTELLIGENCE` (`catalog-intelligence-skill`)
6. `CROSS_VENDOR_TRANSFORMATION` (`cross-vendor-transformation-skill`)
7. `HETEROGENEOUS_TENDER_MODERNIZATION` (`heterogeneous-tender-modernizer`)
8. `WORKLOAD_DNA` (`workload-dna-skill`)
9. `VALUE_ENGINEERING` (`value-engineering-skill`)
10. `LEAST_DELTA_SYNTHESIS` (`least-delta-combinator-skill`)
11. `WORKBOOK_GENERATION` (`workbook-generator-skill`)
12. `REMARKS_RECONCILIATION` (`boq-remarks-reconciliation-skill`)
13. `MULTI_CLUSTER_TENDER` (`multi-cluster-tender-skill`)
14. `ADVERSARIAL_VALIDATION` (`adversarial-validation-skill`)
15. `CONTINUOUS_LEARNING` (`continuous-learning-skill`)
16. `KNOWLEDGE_SYNC` (`knowledge-sync-skill`)
17. `OCR_QUOTE_INGESTION` (`ocr-quote-ingestion-skill`)

### 3.2 Router Gaps & Heuristic Short-Circuits Identified

1. **Question Mark Hijacking in `_classifyCatalogSizingOrQa`**:
   - Lines 576–587:
     ```javascript
     const isQuestion = /^(?:can\s+i|what\s+(?:is|are|options|can|do|does)|how\s+|why\s+|does\s+|is\s+(?:it|there))\b/i.test(text) || text.includes('?');
     if (isQuestion) {
       return { intent: 'FREEFORM_QA', confidence: 0.92, skillTarget: 'presales-query-router' };
     }
     ```
     If a presales engineer asks: *"Can I configure 2x P73299-B21 with 16x P73300-B21 on DL380 Gen12?"*, the router intercepts it as `FREEFORM_QA` because it contains `can i` and `?`, short-circuiting before checking for SKUs or buildability.
   - In `_handleFreeformQa` (line 725), it calls `_buildFreeformFeasibilityCheck()`, but this only performs an O(1) catalog existence check on the SKU tokens without executing the 7 physical aspect checkers or conflict graph.
2. **`_handleRfpSizing` Phased Evidence Ledger Stubs**:
   - In lines 1030, 1038, 1041, 1044:
     Phase 5, Phase 7, Phase 8, and Phase 9 in the RFP sizing evidence ledger are hardcoded to complete with `ACTION_REQUIRED` and fixed rationale strings:
     - Phase 5: `"Sized candidates require full pipeline validation before ranking or delivery."`
     - Phase 7: `"QuickSpecs and whole-candidate NotebookLM review have not run in the sizing path."`
     - Phase 8: `"Draft sizing output only; no validated portal workbook or Google Sheet delivery."`
     - Phase 9: `"Knowledge synchronization has not run in the sizing path."`
     Unless `context.continueEvaluation` is explicitly set to `true`, the sizing path does not complete physical aspect checks or rank generation.
3. **`_handleMultiClusterTender` Rough Estimator**:
   - Lines 1673–1711: Computes basic rack count (`Math.ceil(totalRackUnits / rackUnits)`) and power envelope (`count * watts / 1000`), but blade enclosures, composite synergy frames, and optical SAN fabric end-points are completely omitted from the sizing result.

---

## 4. Review of the 30 Dynamic Skills (`.agents/skills/`)

### 4.1 Master Inventory Table

| # | Dynamic Skill | Intent / Trigger | Implementation File | Status / Gaps Identified |
|---|---|---|---|---|
| 1 | `adversarial-validation-skill` | `ADVERSARIAL_VALIDATION` | `scripts/evaluators/adversarial_agent.js` | **Healthy**: 10 adversarial chaos modes implemented; candidate scrutiny separates synthetic tests from customer deliverables (INV-195). |
| 2 | `bom-reconciliation-skill` | `BOM_RECONCILIATION` | `scripts/evaluators/route_query.js` / `vendor_bom_verifier.js` | **Healthy**: Distinct 4-dimension audit; enforces `isTwoBaselineComparison: false` for single-file audits. |
| 3 | `boq-eval-skill` | `BOQ_EVALUATION` | `scripts/evaluators/eval_boq.js` | **Core Evaluator**: Integrates 7 aspects, but inherits aspect checker omissions noted in Section 2. |
| 4 | `boq-remarks-reconciliation-skill` | `REMARKS_RECONCILIATION` | `scripts/lib/boq/commercial_remarks.js` | **Healthy**: 9 commercial remark actions, row parity preservation, and zero-jargon enforcement. |
| 5 | `catalog-intelligence-skill` | `CATALOG_INTELLIGENCE` | `scripts/lib/catalog/sku_versioning.js` | **Healthy**: Pricing history trails, lifecycle states (OB, DS, 90-Day, EOL), and start/discontinued dates. |
| 6 | `clic-portal-validation-skill` | `PORTAL_VALIDATION` | `scripts/lib/boq/bom_verifier.js` | **Healthy**: Cryptographic receipt matching (INV-178/INV-201); marks unverified deliveries as `PORTAL VALIDATION PENDING`. |
| 7 | `codex-peer-review-skill` | Engineering Review | `codex review` / `codex exec` | **Healthy**: Governed engineering peer review protocol; strictly excluded from customer BOQ flows. |
| 8 | `conditional-sku-discovery-skill` | Operational Discovery | `scripts/scrapers/scrape_oca_solution.js` | **Healthy**: Walks hidden DOM elements and selector triggers; records `thresholdValue` and `conditionKey` (INV-125). |
| 9 | `continuous-learning-skill` | `CONTINUOUS_LEARNING` | `scripts/lib/feedback/feedback_loop.js` | **Gap Identified**: Line 185 accepts local `traceId` / `deltaId` as synthetic approval without authentic portal receipt. |
| 10 | `cross-vendor-transformation-skill` | `CROSS_VENDOR_TRANSFORMATION` | `scripts/lib/boq/cross_vendor_transformer.js` | **Major Gaps (R3)**: 5/12 subsystems return `NOT_EVALUATED`; lacks InfiniBand/RoCE and NUMA topology matching. |
| 11 | `degraded-mode-skill` | Operational Resilience | `scripts/lib/catalog/product_metadata_manager.js` | **Healthy**: 72-hour catalog freshness warning, `DEGRADED_UNGROUNDED` disclosure, dual-layer local RAG fallback. |
| 12 | `design-taste-frontend` | UI Development | `dashboard/src/` | **Healthy**: Anti-slop frontend guidelines for Dashboard telemetry and evaluation visualization. |
| 13 | `epistemic-verification-skill` | Verification Protocol | `scripts/lib/system/evidence_ledger.js` | **Healthy**: 9-phase evidence ledger verification and non-repudiation on disk. |
| 14 | `execution-trace-skill` | Execution Tracing | `scripts/lib/system/evidence_ledger.js` | **Healthy**: End-to-end trace correlation and cryptographic artifact hashing. |
| 15 | `heterogeneous-tender-modernizer` | `HETEROGENEOUS_TENDER_MODERNIZATION` | `scripts/lib/boq/heterogeneous_tender_modernizer.js` | **Major Gaps (R3)**: Hardcoded `NOT_EVALUATED` stubs; carrier nodes leave `items: []`; memory allocation ignores channel interleaving rules. |
| 16 | `jules-autonomous-protocol` | Background CI/CD | `scripts/services/jules_task_manager.js` | **Healthy**: Excluded from customer BOQ flow (INV-72); background CI/CD task manager. |
| 17 | `knowledge-sync-skill` | `KNOWLEDGE_SYNC` | `scripts/lib/sync/post_flow_sync.js` | **Healthy**: Bi-directional Markdown payload sync to NotebookLM with SHA-256 fingerprint verification (INV-132/134). |
| 18 | `least-delta-combinator-skill` | `LEAST_DELTA_SYNTHESIS` | `scripts/lib/conflict/least_delta_combinator.js` | **Healthy**: Synthesizes Rank 1L/1M candidates; eliminates cascading dependency bloat. |
| 19 | `multi-cluster-tender-skill` | `MULTI_CLUSTER_TENDER` | `scripts/lib/boq/multi_cluster_splitter.js` | **Healthy**: Diophantine multiplier solving, 42U rack counts, peak power envelopes (kW). |
| 20 | `nlm-skill` | Presales RAG Grounding | `scripts/lib/sync/nlm_solution_source_validator.js` | **Healthy**: Ephemeral solution source validation, native citation extraction, and token auto-healing (INV-205). |
| 21 | `oca-catalog-scraper` | Operational Scraping | `scripts/scrapers/scrape_oca_solution.js` | **Healthy**: CDP 9222 WebLogic scraper; produces 26-sheet master Excel and deterministic catalogs. |
| 22 | `oca-portal-navigator` | Partner Portal Navigation | `scripts/lib/scraper/navigate_oca.js` | **Healthy**: Headless Okta SSO, Tab 1 stale-session recovery (INV-89), and WebLogic AJAX spinner handling. |
| 23 | `ocr-quote-ingestion-skill` | `OCR_QUOTE_INGESTION` | `scripts/lib/ocr/ocr_service.js` | **Healthy**: Gemini Vision multimodal OCR, 25MB file upload harmonization, smart FIFO rotation. |
| 24 | `orchestrator-workflow-skill` | Macro Lifecycle | `scripts/services/mcp_server.js` | **Healthy**: 6-stage lifecycle manager across scraping, sync, evaluation, and feedback. |
| 25 | `output-validation-skill` | Acceptance Gate | `scripts/lib/boq/bom_verifier.js` | **Healthy**: 18-point pre-presentation delivery gate (B1–B20); cryptographic delivery authorization (INV-128). |
| 26 | `presales-query-router` | Query Routing | `scripts/evaluators/route_query.js` | **Detailed in Section 3**: Effective intent classification; minor keyword/question-mark precedence gaps. |
| 27 | `rfp-sizing-synthesizer` | `RFP_SIZING_TO_BOM` | `scripts/evaluators/route_query.js` | **Detailed in Section 3**: Translates unstructured RFP capacity into candidate BOMs. |
| 28 | `value-engineering-skill` | `VALUE_ENGINEERING` | `scripts/lib/boq/budget_optimizer.js` | **Healthy**: Post-buildability CPU right-sizing and budget optimization on certified solutions. |
| 29 | `workbook-generator-skill` | `WORKBOOK_GENERATION` | `scripts/lib/boq/generate_boq_xlsx.js` | **Healthy**: Standardized 7-column vendor portal workbooks with cluster subtotals and 2-line gaps. |
| 30 | `workload-dna-skill` | `WORKLOAD_DNA` | `scripts/lib/conflict/workload_dna.js` | **Healthy**: Application profiling (SAP HANA, vSphere, VDI, SQL) and slot collision arbitration. |

---

## 5. Epistemic Reasoning Review (R2 & R3 Deep-Dive)

### 5.1 Requirement R2: Autonomous Self-Correction & Reasoning Narratives
- **Inspection of `reasoning_post_analyzer.js`**:
  Lines 174–186 construct a 5-step narrative (`reasoningNarrative`):
  1. Intake Classification
  2. Platform & Generation Scoping
  3. Physical Math & Constraint Verification
  4. Epistemic Grounding
  5. Continuous Learning
  And an optional Step 6 for `selfCorrectionTrail`.
- **Epistemic Gap**:
  When a configuration fails physical pre-checks (e.g. `hasDl380aGpuPsuShortage === true`, `needsHighPerfCooling === true`, or `needsSasExpander === true`), Step 3 simply states:
  *"X conflict(s) detected, Y missing dependency/enablement item(s) identified..."*
  **It does NOT provide deterministic counterfactual repair proofs.**
  A proper counterfactual repair proof must state:
  - *Observation*: e.g. Processor TDP = 350W > 185W threshold.
  - *Violated Rule*: e.g. CLIC Rule 81354654 / INV-21 (High-Performance Cooling Mandate).
  - *Counterfactual Repair*: e.g. `+1x P48820-B21 (HPE High Performance Fan Kit, +$180.00)` resolves thermal boundary deficit without cascading power bloat.
  - *Verification State*: Proof that applying this substitution renders `needsHighPerfCooling: false` and satisfies B1 acceptance.

### 5.2 Requirement R3: Parity Depth in Specialized Skills

#### A. `cross-vendor-transformation-skill` (`cross_vendor_transformer.js`):
- In `audit12PointPhysicalParity` lines 258–264:
  `THERMAL_ENVIRONMENT`, `STORAGE_CONTROLLER_CACHE`, `STORAGE_CABLING`, `BOOT_STORAGE_SUBSYSTEM`, and `PCIE_EXPANSION_RISERS` are completely un-evaluated stubs returning:
  `{ status: 'NOT_EVALUATED', details: 'Requires target chassis physical aspect evaluation and QuickSpecs verification.' }`
- **InfiniBand / RoCE Fabric Matching**:
  Subsystem `OCP_NETWORKING_FABRIC` (lines 199–225) only inspects standard Ethernet port count and speed. It has zero awareness of:
  - InfiniBand speeds (HDR 200Gb/s, NDR 400Gb/s, XDR 800Gb/s)
  - RoCE v2 low-latency offload adapters (e.g. Mellanox ConnectX-6/ConnectX-7)
  - Subnet management or InfiniBand optical transceivers vs DAC cables
- **NUMA Topology Balance**:
  Subsystem `MEMORY_TOPOLOGY` (lines 143–161) only sums `targetMemGb >= reqMemGb`. It does not verify:
  - Memory channel symmetry across sockets (1DPC vs 2DPC)
  - Memory speed throttling (e.g. DDR5-5600 dropping to DDR5-4400 when 2DPC is populated)
  - Equal DIMM allocation per NUMA node

#### B. `heterogeneous-tender-modernizer` (`heterogeneous_tender_modernizer.js`):
- `_allocateMemoryPools` (lines 12–35) naively divides `entry.quantity` by `maxDimms` (32).
  If a customer submits 10 loose DIMMs, it provisions 1 server node with 10 DIMMs = 5 DIMMs per CPU socket. Per Intel/AMD QuickSpecs and `evalMemoryChannel`, 5 DIMMs per socket is an **asymmetric, unsupported configuration**.
- Carrier fleet synthesis provisions chassis with `items: []`. It leaves out the base compute nodes (processors, heatsinks, minimum RAM to boot, power supplies, fan kits, storage controllers).

#### C. `strategy-synthesizer` (`strategy_synthesizer.js`):
- In `synthesizeBudgetMinimizationCandidate` (lines 1136–1170):
  It calls:
  - `_tryBudgetMemorySubstitution` (down-tiers DDR5-5600 to DDR5-4800 on low-TDP CPUs)
  - `_tryBudgetPowerSubstitution` (down-tiers 1600W PSUs to 800W on low-wattage systems)
  - `_tryBudgetThermalSubstitution` (down-tiers Max Performance heatsinks to High Performance on <=270W CPUs)
  **Storage NVMe Down-Tiering is completely missing.**
  When a customer specifies expensive Write-Intensive or Mixed-Use NVMe SSDs for a standard application, Rank 5 fails to evaluate safe down-tiering to Read-Intensive NVMe or Mainstream Value NVMe SSDs, missing up to 40% of potential deal CapEx savings.

#### D. Quarantine Rule Promotion in `feedback_loop.js`:
- In `processPortalFeedback` lines 184–192:
  ```javascript
  const humanReview = options.humanReview || (candidate.source === 'OFFICIAL_VENDOR_PORTAL_OBSERVATION' && (candidate.traceId || candidate.deltaId) ? {
    reviewer,
    reasoning: `Autonomous verified portal evidence for ${candidate.chassis}`,
    decision: 'APPROVE',
    verified: true,
    evidence: [{ type: 'OFFICIAL_VENDOR_PORTAL', id: candidate.traceId || candidate.deltaId }]
  } : null);
  ```
  `candidate.deltaId` is generated locally by `Date.now() + Math.random()`. The system treats this random local string as authentic portal evidence, allowing unverified deltas to be promoted to active rules without real CLIC receipts or QuickSpecs source citations.

---

## 6. Synthesis & Comprehensive Recommendations

To achieve the requirements outlined in `ORIGINAL_REQUEST.md` (R1–R4), the following remediation plan is established:

### Phase 1: Harden Physical Aspect Checkers & Connect Disconnected Properties
1. **`compute_thermal.js`**:
   - Compute and return `needsHeatsink` (`cpuCount > 0 && !hasHeatsinks`).
   - Implement `needsDirectLiquidCooling` for CPUs > 350W TDP where air cooling is physically prohibited.
   - Assert `cpuCount > 0` for server domain; fail if 0 CPUs are installed.
2. **`memory_channel.js`**:
   - Return `isInvalidChannelConfiguration = !isSupportedPopulation`.
   - Assert `hasMixedDdrGeneration` and `hasMixedMemoryTypes` as critical errors in `aspect_registry.js`.
   - Remove hardcoded `if (cpuCount === 0) cpuCount = 2`; derive CPU count honestly or require chassis profile.
   - Assert `memoryCount > 0`; fail server builds with 0 DIMMs.
3. **`storage_tri_mode.js` & `aspect_registry.js`**:
   - In `aspect_registry.js`, bind all 16 dropped diagnostic checks:
     `hasMissingControllerNode`, `hasAsymmetricHbas`, `missingDaisyChainCables`, `insufficientRaid6Drives`, `insufficientRaid10Drives`, `hasD3940ConnectivityError`, `needsMiniSasHdCable`, `needsFcTransceiver`, `hasLffDrivesInSffChassis`, `hasDriveCageMixingConflict`, `hasMr216iORaid56Risk`, `needsDriveCageForController`, `hasControllerNoDriveConflict`, `needsCapacitorCable`.
4. **`pcie_riser.js`**:
   - In `aspect_registry.js`, check `result.laneBifurcationConstraint` and emit error: `'PCIe x16 lane demand exceeds available x16 physical slots'`.
   - Eliminate optimistic assumption that 3 slots exist without a primary riser.
5. **`networking_ocp.js`**:
   - Require explicit OCP2 enablement cabling when `ocpAdapterCount > 1`.
   - In `aspect_registry.js`, assert `isMissing32GbTransceivers`, `isMissing64GbTransceivers`, and `isMissingOpticalPatchCables`.
6. **`power_environment.js`**:
   - In `aspect_registry.js`, assert `hasPsuWattageDeficit`, `hasPsuHeadroomDeficit`, and `needsHighLine220v`.
   - Assert `psuCount > 0`; fail any server or storage configuration with 0 power supplies.
7. **Domain Checkers in `DOMAIN_REGISTRY`**:
   - Replace static `NOT_EVALUATED` stubs in `networking` (`SWITCH_FABRIC_PORTS`) and `archive` (`ARCHIVE_COLD_STORAGE`) with deterministic physical checkers.
   - In `storage`, validate controller node presence via catalog SKU taxonomy roles rather than brittle string matching.

### Phase 2: Autonomous Self-Correction & Reasoning Narratives (R2)
1. **`reasoning_post_analyzer.js`**:
   - Implement `generateDeterministicCounterfactualRepairProofs()`:
     For every detected error in `rawErrors` or `missingDeps`, synthesize a verified counterfactual repair statement with exact SKU, quantity, CapEx impact, and physical invariant reference.
   - Embed these counterfactual proofs directly into Step 3 and Step 6 of `reasoningNarrative`.

### Phase 3: Parity Depth in Specialized Skills (R3)
1. **`cross_vendor_transformer.js`**:
   - Implement physical evaluation for the 5 stubbed subsystems (`THERMAL_ENVIRONMENT`, `STORAGE_CONTROLLER_CACHE`, `STORAGE_CABLING`, `BOOT_STORAGE_SUBSYSTEM`, `PCIE_EXPANSION_RISERS`).
   - Add InfiniBand (HDR/NDR/XDR) and RoCE fabric detection and transceiver matching in `OCP_NETWORKING_FABRIC`.
   - Add NUMA topology channel balance verification in `MEMORY_TOPOLOGY`.
2. **`heterogeneous_tender_modernizer.js`**:
   - Implement symmetric channel population bin-packing in `_allocateMemoryPools` ensuring valid DIMMs-per-socket counts (1, 2, 4, 6, 8, 12, 16).
   - Fully populate carrier node hardware (CPUs, minimum RAM, boot controllers, PSUs, fans).
3. **`strategy_synthesizer.js`**:
   - Implement `_tryBudgetStorageSubstitution` in `synthesizeBudgetMinimizationCandidate` to evaluate safe NVMe down-tiering (e.g. Write-Intensive to Read-Intensive NVMe) for Rank 5.
4. **`feedback_loop.js`**:
   - Enforce that automatic rule promotion from quarantine strictly requires an authentic portal receipt (verified via `receiptMatches()`) or official QuickSpecs citation; disallow promotion based solely on transient local `traceId` / `deltaId`.

---

**Report Status:** Complete  
**Delivered to:** `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_survey_1\analysis.md`
