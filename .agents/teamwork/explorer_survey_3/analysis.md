# Deep-Dive Codebase Survey Report: Requirements R3 & R4

**Explorer:** Explorer 3 (`teamwork_preview_explorer`)  
**Mission:** Survey & Architectural Gap Analysis for Requirements R3 (Advanced Agentic Skills Polish & Parity Depth) and R4 (Automated Verification & Telemetry Invariants)  
**Date:** 2026-10-27  
**Working Directory:** `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_survey_3`  

---

## 1. Executive Summary

This investigation performed an exhaustive, evidence-based survey of the HPE Presales Solution Evaluator codebase, focusing specifically on:
1. **Cross-Vendor Transformation** (`scripts/lib/boq/cross_vendor_transformer.js` and `.agents/skills/cross-vendor-transformation-skill/SKILL.md`): Evaluating fabric matching (InfiniBand NDR/HDR vs RoCEv2 vs Ethernet) and NUMA topology alignment.
2. **Heterogeneous Tender Modernization** (`scripts/lib/boq/heterogeneous_tender_modernizer.js` and `.agents/skills/heterogeneous-tender-modernizer/SKILL.md`): Evaluating chassis carrier packing rules across SFF, LFF, and E3.S EDSFF drive cages, as well as storage controller and expander allocations.
3. **Budget Optimization & Rank 5 Synthesis** (`scripts/lib/conflict/strategy_synthesizer.js`, `scripts/lib/boq/budget_optimizer.js`, and `scripts/lib/conflict/workload_dna.js`): Evaluating storage NVMe tier down-tiering in Rank 5 (High Performance/Write-Intensive NVMe -> Value/Read-Intensive NVMe -> SATA/SAS SSD).
4. **Test Architecture, Runner & Invariants** (`scripts/maintenance/run_test_matrix.js`, `scripts/lib/system/evidence_ledger.js`, oxlint rules, and cyclomatic complexity limits).
5. **Positive and Negative Boundary Test Suite Inventory** required to rigorously prove R1, R2, R3, and R4.

Current baseline metrics verified:
- **Test Matrix**: Exactly **264 test suites** (194 Unit, 41 Chaos, 26 Integration, 3 E2E). Fast smoke suite passes 8/8 in 23.15s.
- **Linter Gate**: 0 oxlint warnings/errors across `scripts/` & `tests/` (530 files, 95 rules) and `dashboard/src/` (115 files).
- **Complexity Gate**: Max CC is strictly $\le 135$ across all 376 scanned files (1897 functions). Highest current CC is `performReasoningPostAnalysis` at 121, `evalComputeThermal` at 116, and `synthesize5TierRankedSolutions` at 112.

---

## 2. Investigation 1: Cross-Vendor Transformation & Skill

### 2.1 Current Implementation State
- **File**: `scripts/lib/boq/cross_vendor_transformer.js` (312 lines)
- **Skill Definition**: `.agents/skills/cross-vendor-transformation-skill/SKILL.md`
- **Router Hook**: `scripts/evaluators/route_query.js:1286` (`_handleCrossVendorTransformation`)

The transformer parses competitor tenders (Cisco UCS, Dell PowerEdge, Lenovo, Supermicro) via `parseCompetitorSpecification()` and audits candidate HPE BOMs via `audit12PointPhysicalParity()`.

### 2.2 Critical Gaps in High-Speed Fabric Matching (InfiniBand vs RoCEv2)
1. **Network Specification Parsing Gap (`cross_vendor_transformer.js:30`)**:
   ```javascript
   const net = lines.find(line => /\b(nic|network|ethernet|ocp|sfp|base-t|10gbe|25gbe|100gbe|adapter)\b/i.test(line)) || '';
   ```
   - **Flaw**: Does not match high-speed fabric keywords such as `infiniband`, `ib`, `roce`, `rocev2`, `connectx`, `ndr`, `hdr`, `edr`, `200gbe`, `400gbe`, `800gbe`, `cx7`, `cx6`, `osfp`, or `qsfp112`.
   - **Missing Data Contract**: `competitorSpec.networking` only contains `{ portsCount, speedGb, isOcp }`. It completely lacks:
     - `fabricType`: `'INFINIBAND' | 'ROCE' | 'ETHERNET' | 'FC'`
     - `infinibandGeneration`: `'NDR' (400G) | 'HDR' (200G) | 'EDR' (100G) | 'NDR200' | 'XDR'`
     - `roceProtocol`: `'RoCEv2' | 'RoCEv1' | 'NONE'`
     - `controllerFamily`: `'ConnectX-7' | 'ConnectX-6' | 'Thor2' | 'Broadcom' | 'Intel'`
     - `connectorType`: `'OSFP' | 'QSFP112' | 'QSFP56' | 'QSFP28' | 'SFP28'`
2. **Subsystem Audit Deficit (`cross_vendor_transformer.js:199-225`)**:
   - `OCP_NETWORKING_FABRIC` checks only `reqSpeed` and `reqPorts`.
   - **Architectural Violation**: If competitor requests pure InfiniBand (e.g. `2x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP PCIe Adapter`), and the target BOM provides a 400GbE Ethernet / RoCEv2 NIC, the checker reports `MATCHED` because `speedGb === 400` and `ports === 2`. However, pure InfiniBand fabrics require Subnet Managers and native IB switches (e.g. QM9700/QM8700), whereas Ethernet/RoCEv2 operates over standard IP/Ethernet switches with PFC/ECN. Treating them as interchangeable is a severe hardware delivery failure mode.
   - **PCIe Gen5 Slot Bandwidth Check**: An NDR 400Gb/s adapter requires PCIe Gen5 x16 (64 GB/s bidirectional) to prevent interface bottlenecks. The checker does not verify PCIe generation alignment.

### 2.3 Critical Gaps in NUMA Topology & Memory Channel Alignment
1. **Unbalanced Population Starvation Undetected (`cross_vendor_transformer.js:143-161`)**:
   - `MEMORY_TOPOLOGY` only sums `targetMemGb` and compares with `reqMemGb`.
   - `parseCompetitorSpecification` line 61 initializes `isBalanced1Dpc: null` and never computes it.
   - **Architectural Violation**: In modern dual-socket architectures (Intel Xeon Sapphire Rapids/Emerald Rapids with 8 channels per socket, or AMD EPYC Genoa/Turin with 12 channels per socket), memory channel interleaving dictates up to 35-40% of memory bandwidth.
   - If competitor specifies 16x 64GB DDR5-5600 (1024 GB, 8 DIMMs/socket = fully balanced 1DPC), and candidate BOM provides 8x 128GB DDR5-5600 (1024 GB, 4 DIMMs/socket = populating only 4 of 8 channels), the current transformer returns `MATCHED`!
   - **Required Enhancement**:
     - Compute DIMM count per socket (`dimmsPerSocket = totalDimms / socketCount`).
     - Validate channel interleaving: Intel Gen4/Gen5 requires 8 or 16 DIMMs per socket for full channel balance. AMD EPYC requires 12 or 24 DIMMs per socket.
     - Detect socket asymmetry: socket 1 DIMMs must equal socket 2 DIMMs.
     - Flag `DEFICIT` or `WARNING_UNBALANCED_NUMA` when memory capacity is satisfied but channel interleaving or socket balance is violated.

### 2.4 Un-Evaluated Stubs in 12-Point Physical Parity Audit
Lines 258-264 of `cross_vendor_transformer.js`:
Out of 12 subsystems, 5 fall into `default:` and unconditionally return `status: 'NOT_EVALUATED'`:
- `THERMAL_ENVIRONMENT`: Should evaluate if competitor has high TDP CPUs (>270W) or GPUs and whether target BOM has High Performance Fans / High Performance Heatsinks.
- `STORAGE_CONTROLLER_CACHE`: Should verify if competitor specified RAID cache (e.g. 4GB/8GB) and target controller provides matching or exceeding cache.
- `STORAGE_CABLING`: Should verify if drive count > 8 requires tri-mode SAS expander cabling or controller cables.
- `BOOT_STORAGE_SUBSYSTEM`: Should verify if competitor specifies dedicated boot storage (BOSS / NS204i / M.2) and target BOM includes NS204i-u / NS204i-d.
- `PCIE_EXPANSION_RISERS`: Should verify if target BOM contains secondary/tertiary risers when competitor adapter count exceeds 3 PCIe cards.

---

## 3. Investigation 2: Heterogeneous Multi-Domain Modernizer

### 3.1 Current Implementation State
- **File**: `scripts/lib/boq/heterogeneous_tender_modernizer.js` (295 lines)
- **Skill Definition**: `.agents/skills/heterogeneous-tender-modernizer/SKILL.md`
- **Platform Profiles**: `scripts/lib/rules/platform_profiles.js` (349 lines)

The modernizer partitions mixed tenders (server, storage, sanFabric, tapeBackup) and synthesizes carrier fleets for loose/orphan components via `synthesizeCarrierFleet()`.

### 3.2 Critical Gaps in Chassis Carrier Packing Rules
1. **Drive Form Factor Blindness in `_allocateStoragePools` (`heterogeneous_tender_modernizer.js:37-58`)**:
   ```javascript
   function _allocateStoragePools(storage, base, baseDriveBays, carrierPools) {
     for (const entry of storage.values()) {
       const chassisCount = Math.ceil(entry.quantity / baseDriveBays);
       ...
   ```
   - **Flaw**: Assumes every server only has `baseDriveBays` (defaulting to 8), ignoring form factors and expansion drive cages.
   - **Severe Inefficiency**: If a customer tender specifies 16x 1.92TB SFF SSDs, current logic calculates `Math.ceil(16 / 8) = 2`, allocating **2 physical servers** instead of 1 server with an additional 8SFF drive cage kit!
   - **Form Factors**:
     - **SFF (2.5")**: Base 8SFF chassis expands to 16SFF or 24SFF using 8SFF Drive Cage Kits (`P48813-B21` for Gen11, `P75741-B21` for Gen12).
     - **LFF (3.5")**: Base 8LFF chassis expands to 12LFF front + 2LFF/4LFF rear cages.
     - **EDSFF (E3.S)**: DL380 Gen12 supports up to 20 or 36 E3.S EDSFF NVMe SSDs (`P73282-B21` / EDSFF CTO).
2. **Missing Controller & SAS Expander Allocation**:
   - When drive count is 1-8: 1x 8-port controller (e.g. MR216i-o or MR408i-o) or direct CPU NVMe lanes suffice.
   - When drive count is 9-24 SFF: Drives exceed 8 ports. The system must allocate either:
     - A 24G SAS Expander Kit (e.g., `P48809-B21` SAS Expander with cables) with an 8-port controller.
     - OR a 16-port / 32-port controller (e.g., MR416i-p with 16 internal lanes or SR932i-p with 32 lanes).
   - Currently, `_allocateStoragePools` simply notes: *"Drive capacity estimate uses base chassis bays; controllers, expanders, cables and drive enablement kits require evaluation."* It leaves items empty and does not plan the carrier cage or expander hardware!
3. **Platform Profile Gaps (`platform_profiles.js`)**:
   - `PLATFORM_PROFILES['HPE_PROLIANT_DL380_GEN11']` and `GEN12`:
     - Contains `baseChassis` (8SFF) and `baseChassis24Sff` (24SFF), but lacks `baseChassisLff` (e.g. `P52533-B21` 12LFF CTO or 8LFF) and EDSFF profiles.
     - Lacks `storageArchitecture` schema detailing `maxSffBays: 24`, `maxLffBays: 12`, `maxEdsffBays: 36`, `driveCagesPerChassis: 3`, `baysPerCage: 8`, and associated cage SKUs.

---

## 4. Investigation 3: Strategy Synthesizer & Rank 5 Budget Optimization

### 4.1 Current Implementation State
- **Files**: `scripts/lib/conflict/strategy_synthesizer.js` (1704 lines), `scripts/lib/boq/budget_optimizer.js` (303 lines), `scripts/lib/conflict/workload_dna.js` (184 lines)
- **Tiers Produced**:
  - Rank 1: Closest Intent Match (100% buildable, mandatory fixes only)
  - Rank 1L: Least-Delta Alternative (pruned cascading dependency bloat)
  - Rank 2: Standardized Factory CTO Baseline
  - Rank 3: High-IOPS & Storage Performance Optimized
  - Rank 4: Extreme GPU / Workload Accelerated
  - Rank 5: Budget & CapEx Minimized Buildable Baseline

### 4.2 Critical Gap: Zero Storage Down-Tiering in Rank 5 Synthesis
Look at `synthesizeBudgetMinimizationCandidate` (`strategy_synthesizer.js:1136-1160`):
```javascript
function synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached) {
  const parts = v1.parts.map(p => ({ ...p }));
  const aspectCompute = evalResults.aspects?.compute || {};
  const aspectPower = evalResults.aspects?.power || {};
  const aspectPcie = evalResults.aspects?.pcie || {};

  const mChanged = _tryBudgetMemorySubstitution(parts, aspectCompute, getPrice);
  const pChanged = _tryBudgetPowerSubstitution(parts, aspectPower, getPrice);
  const tChanged = _tryBudgetThermalSubstitution(parts, aspectCompute, aspectPcie, getPrice);
```
**Observation**:
- Memory down-tiering exists (`_tryBudgetMemorySubstitution`: DDR5-5600 to DDR5-4800).
- Power down-tiering exists (`_tryBudgetPowerSubstitution`: 1600W/1800W PSU to 800W if wattage < 450W).
- Thermal down-tiering exists (`_tryBudgetThermalSubstitution`: Max Performance Heat Sink to High Performance Heat Sink if TDP <= 270W).
- **Storage down-tiering is 100% missing!** There is no `_tryBudgetStorageSubstitution`!

### 4.3 Storage NVMe Down-Tiering Architecture & Rules
In enterprise servers, enterprise NVMe storage accounts for 30% to 60% of total BOM CapEx. Down-tiering storage provides the most impactful CapEx reductions for budget-restricted tender bids.

1. **Storage Tier Hierarchy**:
   - **Tier 1 (High Performance / Write Intensive NVMe)**: 3-10 DWPD, PCIe Gen5/Gen4 MU/WI (e.g. HPE 1.6TB / 3.2TB / 6.4TB NVMe MU SSD). Unit cost: ~$1,200 - $2,500.
   - **Tier 2 (Value / Read Intensive NVMe)**: 1 DWPD, PCIe Gen4/Gen5 RI (e.g. HPE 1.92TB / 3.84TB / 7.68TB NVMe RI SSD). Unit cost: ~$450 - $900 (saves 40-55% per drive).
   - **Tier 3 (Value SAS / SATA Read Intensive SSD)**: 0.8-1 DWPD, 6G SATA / 12G Value SAS RI (e.g. HPE 1.92TB / 3.84TB SATA RI SSD). Unit cost: ~$220 - $450 (saves 65-75% per drive).

2. **Five Golden Invariants for Storage Down-Tiering**:
   - **Invariant ST-1 (Capacity Non-Decrease)**: Down-tiering must NEVER reduce total or per-drive storage capacity ($C_{\text{target}} \ge C_{\text{original}}$). A 3.84TB MU NVMe drive must down-tier to a 3.84TB or 3.84TB+ RI NVMe drive, never 1.92TB.
   - **Invariant ST-2 (Form Factor Compatibility)**: SFF Basic Carrier (BC) must replace SFF BC; LFF Low Profile Carrier (LPC) must replace LFF LPC; E3.S EDSFF must replace E3.S EDSFF.
   - **Invariant ST-3 (Quantity & Cage Limit Conservation)**: Drive count must remain constant so drive cage limits and controller port counts are not breached.
   - **Invariant ST-4 (Workload DNA Compatibility Gate)**:
     - Check `workload_dna.js:extractWorkloadDna()`. If `storageWorkload === 'WRITE_INTENSIVE'` or `primaryWorkload === 'DATABASE_IN_MEMORY'`, down-tiering to Read-Intensive (1 DWPD) represents an endurance risk. The down-tiering must attach an explicit tradeoff caveat:
       `tradeoffMetrics.storageEnduranceNotice = 'CapEx optimized: Replaced Mixed-Use/Write-Intensive NVMe with Read-Intensive NVMe (1 DWPD). Verify customer write endurance requirements.'`
     - If workload is `BALANCED_ENTERPRISE`, `VDI_AI_GRAPHICS`, or `READ_INTENSIVE`, substitution is completely safe and delivers maximum savings.
   - **Invariant ST-5 (Physical Revalidation Gate)**: Candidate BOM must pass `revalidateCached(parts)` to confirm `physicalMathClean: true` and `totalCost < v1.totalCost`.

---

## 5. Investigation 4: Test Architecture, Test Runner & Invariants

### 5.1 Test Suite Inventory & Breakdown
- **Discovery**: `node scripts/maintenance/run_test_matrix.js --list` discovers **264 test suites**.
- **Tier Breakdown**:
  - `unit` (`tests/unit/`): 194 suites
  - `chaos` (`tests/chaos/`): 41 suites
  - `integration` (`tests/integration/`): 26 suites
  - `e2e` (`tests/e2e/`): 3 suites
- **Domain Filter Mapping** (`run_test_matrix.js:65-136`):
  - `aspects`: Physical Aspect Checks (`/aspect|thermal|memory_channel|storage_tri_mode|networking_ocp|pcie_riser|power_environment|support/i`)
  - `boq`: BOQ & Preprocessor (`/boq|cto|preprocessor|splitter|variation|cluster|excel|bom|unmatched/i`)
  - `scraping`: Portal & DOM Scraping (`/scrap|cdp|dom|clic|ocr|browser|portal|ambient|conditional/i`)
  - `sync`: Knowledge Sync & NLM RAG (`/sync|notebook|rag|knowledge_extractor|drive/i`)
  - `catalog`: Catalog & Rules Intelligence (`/catalog|sku|registry|diff|product_scope|rules|pricing|freshness/i`)
  - `conflict`: Conflict Graph & Strategy (`/conflict|least_delta|strategy|workload|topology/i`)
  - `guardrail`: Agentic Guardrail & Governance (`/guardrail|rotator|prompt|telemetry|feedback|invariants|evidence/i`)
  - `router`: Presales Router & Skill Handlers (`/query_router|route_query|presales_skill|skill_boundaries|presales_skills_chaos/i`)
  - `core`: Core Architecture & Invariants (`/all_system_invariants|evaluation_orchestrator|schemas|bom_verifier|evidence_workflow|catalog_refresh_contract|decision_trace|core_workflow_contracts|workflow_contract|product_metadata_manager|portal_receipt|post_hardening_boundary_review|test_m[0-5]_/i`)
  - `smoke`: Fast Smoke Suite (8 curated suites, runs in ~23s)

### 5.2 Oxlint & Cyclomatic Complexity Governance
- **Oxlint**:
  - `npm run lint`: dashboard/src (115 files, 0 warnings, 0 errors with 95 rules).
  - `npm run lint:core`: scripts/ and tests/ (530 files, 0 warnings, 0 errors with 95 rules).
- **Cyclomatic Complexity Invariant**:
  - `npm run lint:complexity`: scans 376 files, 1897 functions.
  - Strict ceiling: $CC \le 135$.
  - High CC functions to be mindful of during R3 implementation:
    - `audit12PointPhysicalParity` in `cross_vendor_transformer.js`: currently **CC 101**. Any added checks must be modularized into helper functions ($CC \le 10$) so `audit12PointPhysicalParity` does not exceed 135!
    - `synthesize5TierRankedSolutions` in `strategy_synthesizer.js`: currently **CC 112**. Storage down-tiering must be implemented via separate helper `_tryBudgetStorageSubstitution()` ($CC \le 10$).
    - `synthesizeCarrierFleet` in `heterogeneous_tender_modernizer.js`: currently **CC 35**. Drive cage packing must be in separate helper `_packStorageDriveCages()` ($CC \le 10$).

### 5.3 Evidence Ledger 9-Phase Lifecycle & Telemetry Invariants
- **File**: `scripts/lib/system/evidence_ledger.js` (433 lines)
- **Lifecycle Phases**:
  1. `Phase 1: Input Ingestion & Document Scrutiny`
  2. `Phase 2: Platform Identity & Topology Resolution`
  3. `Phase 3: Deterministic Physical Aspect Checkers`
  4. `Phase 4: Conflict Graph & DAG Resolution`
  5. `Phase 5: Grounded Cloud RAG / NotebookLM Verification`
  6. `Phase 6: Strategy Synthesis (5-Tier Strategy Matrix)`
  7. `Phase 7: Line-by-Line Financial Audit & Tally Verification`
  8. `Phase 8: Workbook Generation & Deliverable Packaging`
  9. `Phase 9: Autonomous Self-Correction & Reasoning Post-Analysis`
- **Invariants Enforced**:
  - **INV-105 (Zero Default Success)**: Phases must be explicitly started via `startPhase()` and completed via `completePhase()` with an allowed status (`PASSED`, `FAILED`, `WARNING`, `SKIPPED`, `DEGRADED`, `ACTION_REQUIRED`, `RESOLVED`, `NOT_REACHED`, `NOT_RUN`). Undefined or truthy fallbacks throw errors.
  - **SKIPPED Phase Policy**: Marked `SKIPPED` requires both `skipReason` and `policyCode`.
  - **Phase Immutability**: Completed phases cannot be modified; resolutions must append candidate resolution evidence.
  - **Non-Repudiation on Disk**: Ledger exports both atomic JSON (`evidence_log_<traceId>.json`) and Markdown summary (`evidence_summary_<traceId>.md`).
  - **Ledger Health Check (`getHealth()`)**:
    - `INPUT_NOT_IDENTIFIED`
    - `CHASSIS_NOT_IDENTIFIED`
    - `PHASE_<N>_MISSING` / `PHASE_<N>_UNFINISHED`
    - `SKU_DECISIONS_MISSING`
    - `INPUT_FINGERPRINT_MISSING`
    - Returns `{ healthy: boolean, gaps: string[], workflowStatus: 'COMPLETE' | 'INCOMPLETE' | 'FAILED' }`.

---

## 6. Investigation 5: Proposed New Positive & Negative Boundary Test Suites

To prove R1, R2, R3, and R4 without regressions, the following dedicated test suites are designed and recommended:

### Suite 1: `tests/unit/test_cross_vendor_fabric_and_numa.js` (Unit Tier, Domain: `router` / `aspects`)
- **Positive Tests**:
  - 1.1: Ingestion of Mellanox/NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP card correctly classifies `fabricType: 'INFINIBAND'`, `infinibandGen: 'NDR'`, `speedGb: 400`.
  - 1.2: Matching candidate HPE 400Gb/s 1-port OSFP PCIe3/Gen5 InfiniBand adapter (`P58110-B21` or similar) against NDR 400G specification reports `MATCHED`.
  - 1.3: Ingestion of Broadcom BCM57508 100GbE Dual-Port RoCEv2 OCP3 adapter correctly classifies `fabricType: 'ROCE'`, `protocol: 'RoCEv2'`, `isOcp: true`.
  - 1.4: 16x 64GB DDR5-5600 on dual-socket Intel Xeon (8 DIMMs/socket, 8 channels/socket = 1DPC balanced) evaluates to `isBalanced1Dpc: true`, status: `MATCHED`.
- **Negative & Boundary Tests**:
  - 1.5: Competitor requests NDR 400G InfiniBand, but candidate provides 400GbE RoCEv2 Ethernet adapter -> Flags `FABRIC_MISMATCH_DEFICIT` (protocol incompatibility).
  - 1.6: Candidate provides matching total memory capacity (1024 GB) via 8x 128GB on dual-socket (only 4 DIMMs/socket populating 4 of 8 channels) -> Flags `UNBALANCED_NUMA_WARNING` / memory bandwidth deficit.
  - 1.7: Unbalanced DIMM counts across sockets (e.g. 10 DIMMs on Socket 1, 6 on Socket 2) -> Flags `SOCKET_ASYMMETRY_DEFICIT`.

### Suite 2: `tests/unit/test_heterogeneous_carrier_packing.js` (Unit Tier, Domain: `boq`)
- **Positive Tests**:
  - 2.1: SFF Drive Packing: 16 SFF drives allocated into 1x DL380 8SFF base chassis with 1x additional 8SFF drive cage kit (total chassis = 1, not 2).
  - 2.2: 24 SFF Drive Packing: 24 SFF drives allocated into 1x DL380 8SFF chassis with 2x 8SFF drive cage kits and SAS Expander kit.
  - 2.3: LFF Drive Packing: 12 LFF drives allocated into 1x 8LFF base chassis with 1x 4LFF drive cage kit.
  - 2.4: E3.S EDSFF Packing: 32 E3.S drives packed into 1x DL380 Gen12 EDSFF chassis.
- **Negative & Boundary Tests**:
  - 2.5: Over-capacity allocation: 32 SFF drives into DL380 (max 24 SFF) correctly splits into 2 servers (24 SFF in Server 1 + 8 SFF in Server 2).
  - 2.6: Form factor clash: Attempting to pack LFF drives into an SFF-only chassis triggers form factor quarantine or separate carrier pool.

### Suite 3: `tests/unit/test_rank5_storage_downtiering.js` (Unit Tier, Domain: `conflict`)
- **Positive Tests**:
  - 3.1: Down-tier 8x 3.84TB NVMe Mixed-Use SSD (`P50231-B21`) to 8x 3.84TB NVMe Read-Intensive SSD (`P50217-B21`) -> BOM cost drops, capacity remains exactly 30.72TB, `physicalMathClean: true`.
  - 3.2: General compute workload: Down-tiering Mixed-Use NVMe to Read-Intensive NVMe proceeds without blocker and records CapEx delta.
  - 3.3: Extreme budget optimization: Down-tier NVMe to SATA Read-Intensive SSD for cost-sensitive tier.
- **Negative & Boundary Tests**:
  - 3.4: Workload DNA Gate: When workload is classified as `WRITE_INTENSIVE` or `HIGH_IOPS_TRANSACTIONAL_DB`, down-tiering attaches mandatory `storageEnduranceNotice` trade-off disclosure.
  - 3.5: Capacity Non-Decrease Invariant: Down-tiering candidate is rejected if replacement SKU has lower capacity (e.g. 1.92TB replacing 3.84TB).
  - 3.6: Form factor preservation: SFF drive cannot be replaced by LFF drive.

### Suite 4: `tests/chaos/test_counterfactual_repair_and_ledger_health.js` (Chaos Tier, Domain: `guardrail` / `core`)
- **Positive & Boundary Tests**:
  - 4.1: Inject 10 distinct hardware conflicts (thermal, power, Tri-Mode, PCIe, memory) -> Verify Phase 9 emits deterministic counterfactual repair proofs with exact SKU and rule citations.
  - 4.2: Evidence ledger maintains 100% health (`healthy: true`, 0 gaps) across end-to-end evaluation with self-correction backtracking trail.
  - 4.3: Fuzz with corrupt, partial, or missing input documents -> Ledger catches operational failure, logs terminal failure event, and never corrupts disk state.

---

## 7. Implementation Recommendations & Sequence

1. **Phase 1: Skills Enhancement (R3)**
   - Update `platform_profiles.js` with storage cage limits, LFF/EDSFF profiles, and fabric adapter families.
   - Expand `cross_vendor_transformer.js` with high-speed fabric classification and NUMA channel interleaving checks. Modularize into helper functions to ensure $CC \le 135$.
   - Expand `heterogeneous_tender_modernizer.js` with drive cage packing logic (`_packStorageDriveCages`) and controller/expander allocation.
   - Expand `strategy_synthesizer.js` with `_tryBudgetStorageSubstitution()` respecting capacity preservation and workload DNA gating.
2. **Phase 2: Reasoning Post-Analyzer & Self-Correction (R2)**
   - Enhance `reasoning_post_analyzer.js` to ensure deterministic counterfactual repair derivations for 100% of detected conflicts.
3. **Phase 3: Test Matrix Expansion (R4)**
   - Add the 4 proposed test suites (`test_cross_vendor_fabric_and_numa.js`, `test_heterogeneous_carrier_packing.js`, `test_rank5_storage_downtiering.js`, and `test_counterfactual_repair_and_ledger_health.js`).
   - Run `npm run lint`, `npm run lint:core`, and `npm run lint:complexity` to verify 0 warnings and $CC \le 135$.
   - Run isolated test matrix to verify 100% pass rate.
