# Project: HPE Solution Evaluator & Conflict Resolution Engine Epistemic Hardening

## Architecture
The system employs a Dual-Brain Paradigm combining a deterministic physical rule engine (7 aspect checkers) with an agentic guardrail layer (LLM / NotebookLM RAG).
- Deterministic Layer: Evaluates physical constraints (thermal TDP, memory channels, PCIe lanes, storage controllers/cabling, OCP networking, PSU wattage/redundancy, support contracts).
- Epistemic Layer: Enforces four-tier epistemic verification (Tier 0: Untrusted Claims, Tier 1: Pre-flight Sanity Checks, Tier 2: QuickSpecs Citations, Tier 3: Authenticated OCA / CLIC Receipts).
- Self-Correction & Conflict Resolution: Traverses dependency trees, models component resource contention, synthesizes 5-tier ranked alternative solutions (Rank 1A, 1B, 1L, Rank 2, Rank 5), and emits Phase 9 mathematical reasoning narratives.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Aspect Property Normalization | Reconcile disconnected aspect properties (`needsHeatsink`, `isInvalidChannelConfiguration`, `needsCableKit`, `needsDirectLiquidCooling`, `isBackplaneCapacityExceeded`) in `aspect_registry.js` | M1 | Survey E1 |
| 2 | Mandatory Component Baseline Assertions | Enforce non-zero checks for mandatory components (0 PSUs, 0 RAM, 0 heatsinks) so missing components fail instead of pass | M1 | Survey E1 |
| 3 | Comprehensive Diagnostic Diagnostics Binding | Bind 16 dropped storage/tape diagnostic checks and power headroom/wattage deficit checks (`hasPsuWattageDeficit`, `hasPsuHeadroomDeficit`) into error aggregation | M1 | Survey E1 |
| 4 | Active Domain Registry Checking | Replace static `NOT_EVALUATED` stubs in `DOMAIN_REGISTRY` (`SWITCH_FABRIC_PORTS`, `ARCHIVE_COLD_STORAGE`) with active physical validation | M1 | Survey E1 |
| 5 | Generalized Counterfactual Self-Correction Trail | Generalize `selfCorrectionTrail` generation from just OCP/rear-bays to 100% of physical conflicts across all 7 aspects | M2 | Survey E2 |
| 6 | Verifiable Mathematical Reasoning Narratives | Add step-by-step mathematical reasoning derivations in Phase 9 (`reasoning_post_analyzer.js`) for constraint deficits (thermal watts, DIMM channels, PCIe lanes, PSU headroom) and emit structured `counterfactualRepairProofs` | M2 | Survey E2 |
| 7 | Deterministic Repair for Unbuildable BOQs | Ensure unbuildable configurations (`DELIVERY_BLOCKED_UNBUILDABLE`) in `eval_boq.js` generate deterministic counterfactual repair proofs | M2 | Survey E2 |
| 8 | Authentic Evidence Quarantine Governance | Eliminate synthetic evidence bypass in `quarantined_deltas.js` / `feedback_loop.js`; require disk-verified authentic portal receipts (`outputs/history/oca_sessions/`) or official QuickSpecs citations | M2 | Survey E2 |
| 9 | InfiniBand vs RoCE Fabric Protocol Parsing | Expand `cross_vendor_transformer.js` to parse and differentiate high-speed InfiniBand (NDR 400G / HDR 200G) vs RoCEv2 fabric protocols and validate NUMA channel interleaving / socket symmetry | M3 | Survey E3 |
| 10 | Cross-Vendor Subsystem Stubs Replacement | Eliminate 5 `NOT_EVALUATED` stubs in `cross_vendor_transformer.js` (`THERMAL_ENVIRONMENT`, `STORAGE_CONTROLLER_CACHE`, `STORAGE_CABLING`, `BOOT_STORAGE_SUBSYSTEM`, `PCIE_EXPANSION_RISERS`) | M3 | Survey E3 |
| 11 | Chassis Drive Cage & Expander Packing Rules | Implement chassis carrier packing rules in `heterogeneous_tender_modernizer.js` (drive cage expansions up to 24 SFF / 12 LFF / 36 EDSFF) and allocate SAS expander / controller carriers | M3 | Survey E3 |
| 12 | Rank 5 Storage NVMe Tier Down-Tiering | Implement storage NVMe tier down-tiering in `strategy_synthesizer.js` (Rank 5) with capacity non-decrease ($C_{\text{target}} \ge C_{\text{original}}$) and workload DNA gating | M3 | Survey E3 |
| 13 | Epistemic Normalization Test Suite | Positive & negative boundary test suites for R1 (epistemic aspect normalization and 0-component rejection) | M4 | Survey E3 |
| 14 | Counterfactual Repair & Quarantine Test Suite | Positive & negative boundary test suites for R2 (counterfactual repair proofs for 100% of physical conflicts and quarantine authentic evidence verification) | M4 | Survey E3 |
| 15 | Advanced Skills Parity Test Suite | Positive & negative boundary test suites for R3 (InfiniBand vs RoCE, NUMA balance, chassis drive cage packing, and Rank 5 NVMe down-tiering) | M4 | Survey E3 |
| 16 | Quality Gate & Evidence Invariant Suite | Full test matrix validation, oxlint 0 warnings/errors (95 rules), cyclomatic complexity $CC \le 135$, and evidence ledger 100% health | M4 | Survey E3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Physical Aspect Verification & Epistemic Normalization (R1) | Features 1, 2, 3, 4 (`scripts/lib/aspects/`) | none | DONE |
| 2 | M2: Autonomous Counterfactual Self-Correction & Authentic Evidence (R2) | Features 5, 6, 7, 8 (`scripts/lib/conflict/`, `scripts/lib/system/`, `scripts/lib/feedback/`) | M1 | DONE |
| 3 | M3: Advanced Agentic Skills Polish & Parity Depth (R3) | Features 9, 10, 11, 12 (`scripts/lib/boq/`, `scripts/lib/conflict/`) | M1, M2 | DONE |
| 4 | M4: Automated Verification, Telemetry Invariants & Regression Proof (R4) | Features 13, 14, 15, 16 (`tests/`, `scripts/tests/`) | M1, M2, M3 | IN_PROGRESS |

## Interface Contracts
### `scripts/lib/aspects/compute_*.js` ↔ `aspect_registry.js`
- `compute_thermal.js` returns: `{ needsHeatsink: boolean, needsDirectLiquidCooling: boolean, fanKitUnderPopulated: boolean, ... }`
- `memory_channel.js` returns: `{ isInvalidChannelConfiguration: boolean, hasMixedDdrGeneration: boolean, hasMixedMemoryTypes: boolean, ... }`
- `storage_tri_mode.js` returns: `{ needsCableKit: boolean, isBackplaneCapacityExceeded: boolean, diagnosticErrors: string[], ... }`
- `power_environment.js` returns: `{ hasPsuWattageDeficit: boolean, hasPsuHeadroomDeficit: boolean, psuCount: number, ... }`
- `aspect_registry.js` maps each flag into error lists; asserts non-zero mandatory components when full hardware spec is provided.

### `scripts/lib/conflict/` ↔ `reasoning_post_analyzer.js`
- `conflict_graph.js` / `resource_arbitrator.js` exports: `selfCorrectionTrail: Array<{ step, contestedResourceType, hypothesis, detectedFailure, backtrackedFrom, selfCorrectionAction, resolutionDetails, verifiedBuildable }>`
- Emits entries for any physical aspect failure (Thermal, Memory, PCIe, Power, Storage, Networking, Support).
- `reasoning_post_analyzer.js` accepts `selfCorrectionTrail`, calculates step-by-step mathematical proofs for Step 3 and Step 6, and serializes `counterfactualRepairProofs`.

### `quarantined_deltas.js` ↔ Evidence Verification
- `promoteQuarantinedDelta` verifies that `evidenceId` references an existing file in `outputs/history/oca_sessions/` with `status === 'ACCEPTED_BY_VENDOR'` and valid SHA-256 fingerprint, or official QuickSpecs citation; rejects local random synthetic IDs.

### `cross_vendor_transformer.js` ↔ Fabric & NUMA
- Network parser extracts `fabricProtocol: 'INFINIBAND_NDR' | 'INFINIBAND_HDR' | 'ROCE_V2' | 'ETHERNET'`.
- Parity audit checks speed, port count, AND protocol match.
- Memory parity checks total GB, socket symmetry, and balanced channel interleaving.

### `heterogeneous_tender_modernizer.js` ↔ Drive Cage Packing
- Storage pool allocation evaluates form factor (SFF, LFF, EDSFF), expands base chassis (8SFF -> 16SFF -> 24SFF; 4LFF -> 8LFF -> 12LFF) before incrementing server chassis count, and adds required SAS expander / controller cards.

### `strategy_synthesizer.js` ↔ Rank 5 Storage Down-Tiering
- `_tryBudgetStorageSubstitution()` down-tiers High Performance/Mixed Use NVMe to Read Intensive NVMe or SATA SSDs only when workload DNA is not write-intensive (`workloadDNA.storageWorkload !== 'WRITE_INTENSIVE'`), preserving capacity and form factor.

## Code Layout
- Physical Aspect Rules: `scripts/lib/aspects/`
- Conflict & Solution Strategy Synthesis: `scripts/lib/conflict/`
- System & Epistemic Telemetry: `scripts/lib/system/`
- Feedback & Quarantine Governance: `scripts/lib/feedback/`
- BOQ Evaluation & Cross-Vendor Transformers: `scripts/lib/boq/`
- Test Suites: `tests/unit/`
