# DISPATCH — Worker M4 (Milestone 4 Implementation)

**Timestamp**: 2026-10-28T05:55:00Z  
**Worker Role**: Milestone 4 Implementation Worker (Quality Gates, Telemetry Invariants & Test Runner Harmonization)  
**Assigned Working Directory**: `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\worker_m4`  
**Parent Orchestrator**: `06cb5c88-e2a4-407d-9438-e05cab02c2f3`  

---

## Mandatory Prerequisites
1. Read `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\ORIGINAL_REQUEST.md`.
2. Read `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\orchestrator_1\PROJECT.md`.
3. Read the three Explorer handoffs:
   - `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m4_1\handoff.md`
   - `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m4_2\handoff.md`
   - `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m4_3\handoff.md`
   - `c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m4_3\proposed_catalogs_cjs.patch`

---

## ⚠️ MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

---

## Objectives & Changes to Implement

### 1. Remediate `dashboard/routes/catalogs.cjs` (0 Oxlint Warnings Across All 676 Files)
- Remove unused variable `tryResolveSafePath` at line 32.
- Remove unused variables `CONFIG_DIR` and `HISTORY_DIR` at lines 36-37.
- Remove unnecessary escape character `-` in regex at line 377 (`/^[a-zA-Z0-9_\-]+$/` -> `/^[a-zA-Z0-9_-]+$/`).
- (Reference: `proposed_catalogs_cjs.patch`).

### 2. Update `package.json` Lint & Test Scripts
- Update `"lint"`: `"npx -y oxlint dashboard/"` (was `"dashboard/src"`, which caused `dashboard/routes/` to be unmonitored).
- Update `"lint:all"`: `"npx -y oxlint scripts/ tests/ dashboard/"`.
- Update `"test:aspect_units"`: add `node tests/unit/test_lifecycle_aspect_evaluation.js && node tests/unit/test_aspect_registry.js`.
- Add convenience scripts:
  - `"test:m1": "node scripts/maintenance/run_test_matrix.js --pattern \"aspect|lifecycle\""`
  - `"test:m2": "node scripts/maintenance/run_test_matrix.js --pattern \"counterfactual|self_correction|quarantin|evidence\""`
  - `"test:m3": "node scripts/maintenance/run_test_matrix.js --pattern \"fabric|numa|cage|down_tiering\""`

### 3. Update `scripts/maintenance/run_test_matrix.js` (`DOMAIN_METADATA`)
- In `DOMAIN_METADATA.conflict`:
  `matcher: p => /conflict|least_delta|strategy|workload|topology|counterfactual|self_correction|arbitrat|contested|repair|reasoning|down_tiering|rank5/i.test(p)`
- In `DOMAIN_METADATA.boq`:
  `matcher: p => /boq|cto|preprocessor|splitter|variation|cluster|excel|bom|unmatched|cross_vendor|fabric|drive_cage|packing/i.test(p)`
- In `DOMAIN_METADATA.sync`:
  `matcher: p => /(?:sync|notebook|knowledge_extractor|\brag\b|google_drive|drive_sync)/i.test(p) && !/storage|drive_cage/i.test(p)`
- In `DOMAIN_METADATA.guardrail`:
  `matcher: p => /guardrail|rotator|prompt|telemetry|feedback|invariants|evidence|quarantin/i.test(p)`
- In `DOMAIN_METADATA.aspects`:
  `matcher: p => /aspect|thermal|memory_channel|storage_tri_mode|networking_ocp|pcie_riser|power_environment|support|lifecycle|fabric|tape/i.test(p)`

### 4. Optimize `tests/chaos/test_m3_it3_adversarial_storage_budget_stress.js`
- In Section 3, reduce repeated end-to-end calls to `synthesize5TierRankedSolutions` from 12 to 2 (one write-intensive proof, one non-write-intensive baseline proof), and delegate the individual token variations to `_tryBudgetStorageSubstitution`. This reduces suite runtime from ~30s to ~5s, saving ~25s per matrix run.

### 5. Verification Commands & Acceptance Criteria
Execute the following commands and record outputs in `handoff.md`:
1. `npx -y oxlint scripts tests dashboard` -> 0 warnings, 0 errors across 676 files.
2. `npm run lint:complexity` -> all functions $\le 135$ CC.
3. `npm run test:circular` -> 0 circular dependency cycles.
4. `npm run audit:evidence` -> 100% evidence log health.
5. `npm run test:smoke` -> all smoke tests pass.
6. `npm run test:domain:aspects` -> all pass.
7. `npm run test:domain:boq` -> all pass (including cross_vendor and drive_cage).
8. `npm run test:domain:conflict` -> all pass (including counterfactual, reasoning, and down_tiering).
9. `npm run test:domain:guardrail` -> all pass (including quarantined deltas).
10. `npm run test:domain:sync` -> all pass (without false storage collisions).
11. `node --test tests/chaos/test_m3_it3_adversarial_storage_budget_stress.js` -> 19/19 tests pass in ~5s.

Write a complete 5-component `handoff.md` (Observation, Logic Chain, Caveats, Conclusion, Verification Method) in `.agents/teamwork/worker_m4/handoff.md` and notify parent.
