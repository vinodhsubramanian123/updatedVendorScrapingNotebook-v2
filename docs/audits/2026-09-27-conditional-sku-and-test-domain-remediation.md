# Comprehensive Audit & Remediation: Conditional SKU Discovery, Domain-Based Testing & Anti-Hallucination Governance

**Date:** 2026-09-27  
**Author / Execution Lead:** Antigravity (Pair Programming with User)  
**Status:** Certified & Implemented (89/89 suites executed PASSED across 5 domains; $CC \le 135$; 0 lint warnings)  
**Target Reviewers:** OpenAI Codex, Claude 3.5/3.7, Antigravity Subagents  

---

## 1. Executive Summary & Root Causes Identified

A deep end-to-end architectural evaluation across the entire lifecycle (Customer Query $\rightarrow$ Sizing $\rightarrow$ 7 Aspects $\rightarrow$ Scraper $\rightarrow$ NotebookLM Grounding $\rightarrow$ Conflict Resolution $\rightarrow$ Deliverables) surfaced three foundational system gaps:

1. **The Hidden DOM / Ambient-Gated SKU Blindspot (The "H200 Anomaly")**:
   * *Problem*: In WebLogic OCA, products like the NVIDIA H200 NVL 141GB GPU (`P47824-B21`) are conditionally hidden behind the ambient temperature selector (default: 30°C). At $\le 27^\circ\text{C}$, the GPU becomes visible. Traditional scrapers queried visible `innerText`, completely missing CSS-hidden elements (`display: none`) and failing to sweep macro configuration options.
   * *Root Cause*: The scraper took only a single snapshot of the default DOM state.
   * *Impact*: Catalogs lacked conditionally gated SKUs, causing false failures or unorderable substitutions.

2. **Monolithic Test Matrix Token & CPU Exhaustion**:
   * *Problem*: Running `npm test` executed 168 test suites sequentially, taking 5+ minutes and wasting hundreds of thousands of tokens and system cycles on unrelated tests.
   * *Root Cause*: The test runner only supported vertical tiers (`unit`, `chaos`, `integration`, `e2e`) without horizontal domain segregation.
   * *Impact*: Developers and agents either skipped tests or incurred high resource exhaustion.

3. **Mixed-Domain Tender Conflation & Reasoning Opacity**:
   * *Problem*: When customers requested mixed tenders (e.g. Synergy compute + SAN switches + Alletra storage), components were evaluated under a monolithic server profile or left as `NOT_EVALUATED` without transparent cross-component checks (bay limits, fabric link speed matching, shared power).
   * *Root Cause*: Lack of upfront domain sniffing and composite relationship evaluation.

---

## 2. Implemented Architecture & Code Changes

### Phase 1: Scraping-Time Conditional Discovery & Rule Classification
* **`scripts/lib/scraper/dom_extract.js`**:
  * Added `extractHiddenElements(ws, sendCommand)`: walks the DOM tree using `textContent` and `window.getComputedStyle()` to capture all `._pid` elements hidden by CSS (`display: none`, `visibility: hidden`).
  * Added `probeConditionalSkuVisibility(ws, sendCommand, thresholds)`: probes ambient temperature options `[35, 30, 27, 25]`°C, diffs visible SKU sets, and restores the original value.
* **`scripts/scrapers/scrape_oca_solution.js`**:
  * Wired Step 5 to run conditional sweeps and atomically output `raw_data/conditional_skus.json`.
* **`scripts/lib/catalog/catalog_rules.js`**:
  * Added `CONDITIONAL_VISIBILITY` rule type in `classifyRule()` with `AMBIENT_GATE` and `TDP_GATE` machine-parseable fields (`thresholdValue`, `conditionOperator: 'lte'|'gte'`, `conditionKey`).
* **`scripts/lib/catalog/checksum_diff.js`**:
  * Extended `computeSkuHash()` to include `visibilityState` and `conditionType`, ensuring visibility changes trigger catalog diffs and NLM synchronization.

### Phase 2: Correctness, Confidence & Boundary Integrity
* **`scripts/lib/conflict/least_delta_combinator.js`**:
  * Added `isSkuVisibleAtDefaultAmbient(sku, catalogDir)`: verifies whether proposed Rank 1L substitute SKUs require non-default ambient conditions, tagging them with `PORTAL_CONDITIONAL`.
* **`scripts/evaluators/route_query.js`**:
  * Emitted `classificationConfidence` (0.0 to 1.0), `hitlRequired` (true if $<0.80$), and `classificationBasis`.
* **`scripts/lib/boq/boq_parser.js` & `boq_preprocessor.js`**:
  * Collected `unmatchedSkus[]` in parser; logged HITL audit steps in preprocessor when uncataloged SKU tokens are detected.
* **`scripts/lib/rag/agentic_guardrail.js` & `guardrail_prompt.js`**:
  * Enforced `INV-91` scope restriction prefixes for shared-enclosure notebooks (Synergy Frame).
  * Upgraded guardrail system prompt to **`v3`** (conditional gates, catalog freshness, composite domain checks).

### Phase 3: Composite Topology, Governance & Test Matrix Segregation
* **`scripts/lib/boq/solution_topology.js`**:
  * Implemented `evaluateCompositeRelationships()`:
    1. `ENCLOSURE_BAY_COMPATIBILITY`: validates compute blade count against frame capacity (e.g. 12 bays for Synergy 12000).
    2. `ADAPTER_TO_FABRIC_MAPPING`: validates link speed alignment between server mezzanine adapters and fabric interconnects.
    3. `SHARED_POWER_COOLING`: validates aggregate compute TDP against frame power budget.
* **`scripts/lib/boq/eval_output_serializer.js`**:
  * Implemented `generateEvaluationNarrative()`: emits 5-step numbered reasoning trace linking conclusions to evidence.
* **`scripts/lib/boq/boq_preprocessor.js`**:
  * Implemented `sniffDomainComposition()`: partitions mixed-domain tenders before variation clustering.
* **`scripts/config/chassis_map.json` & `catalog_rules.js`**:
  * Replaced if-else chains with data-driven `kit_routing.matchers[]` table.
* **`scripts/lib/boq/solution_evidence.js`**:
  * Embedded `catalogFingerprint` into `solutionFingerprint()` hash.
* **`scripts/lib/catalog/catalog_freshness_guard.js` & `boq_evaluator.js`**:
  * Added `isCatalogFresh()` 72-hour staleness pre-flight in `evaluateBOQMultiAspect()`.
* **`scripts/lib/sync/knowledge_sync.js`**:
  * Implemented `assertNotebookHealth()` to detect `cloudSyncState: FAILED` and emit `DEGRADED_UNGROUNDED` status.
* **`scripts/maintenance/run_test_matrix.js` & `package.json`**:
  * Introduced domain-segregated test execution (`--domain` / `-D`):
    * `aspects`: 16 suites
    * `boq`: 25 suites
    * `scraping`: 18 suites
    * `sync`: 22 suites
    * `smoke`: 8 suites (~3.1s execution)

---

## 3. Test Verification Matrix

All targeted domain test runs were executed and certified clean:

| Domain Run | Command | Suites | Duration | Pass Rate | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Fast Smoke Suite** | `npm run test:smoke` | 8 | 3.13s | **100% (8/8)** | ✅ PASSED |
| **Physical Aspects** | `npm run test:domain:aspects` | 16 | 26.85s | **100% (16/16)** | ✅ PASSED |
| **BOQ & Preprocessor** | `npm run test:domain:boq` | 25 | 140.35s | **100% (25/25)** | ✅ PASSED |
| **Knowledge Sync** | `npm run test:domain:sync` | 22 | 42.03s | **100% (22/22)** | ✅ PASSED |
| **Portal Scraping** | `npm run test:domain:scraping` | 18 | 36.66s | **100% (18/18)** | ✅ PASSED |
| **Complexity Analysis**| `npm run lint:complexity` | 281 files | 1.8s | **CC $\le$ 135 (0 breaches)** | ✅ PASSED |

Total distinct verified suites across targeted runs: **89 suites passed, 0 failed**.

---

## 4. Peer Review Guide for Codex & Claude

When reviewing this checkin, please inspect:
1. **`scripts/lib/scraper/dom_extract.js`**: Verify `extractHiddenElements` and `probeConditionalSkuVisibility` handle edge cases (empty options, non-ambient forms).
2. **`scripts/lib/catalog/catalog_rules.js`**: Verify regex patterns for `AMBIENT_GATE` and `TDP_GATE` cleanly parse both `°C` and `C`, and uppercase/lowercase wattages.
3. **`scripts/lib/conflict/least_delta_combinator.js`**: Verify `isSkuVisibleAtDefaultAmbient` gracefully falls open when `conditional_skus.json` is missing.
4. **`scripts/lib/boq/solution_topology.js`**: Verify `evaluateCompositeRelationships` correctly defaults to 12 bays when metadata is unspecified.
5. **`scripts/maintenance/run_test_matrix.js`**: Verify `--domain` flags cleanly isolate test sets without omitting required suites.
