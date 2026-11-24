# E2E Workflow Gap Analysis & Improvement Plan
**Repository:** `updatedVendorScrapingNotebook-v2`  
**Date:** 2026-09-27 | **Author:** Antigravity Lead Architect  
**Scope:** Skill-trigger → Customer Query → Code Execution → Agentic Workflow — full five-dimension teardown

---

## Dimension A — Customer Query Interpretation

### What works well
- `route_query.js` correctly classifies into 5 canonical tracks (FREEFORM_QA, RFP_SIZING, BOQ_EVALUATION, BOM_RECONCILIATION, CATALOG_INTELLIGENCE).
- `PLATFORM_SIGNATURES` auto-augments from discovered catalogs; explicit generation mismatch is caught.
- Multi-generation ambiguity guard (`AMBIGUOUS_QUERY`) fires if two different gens appear in one query.

### Gaps identified

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| A-1 | **No query intent confidence score surfaced to caller** — Router makes a classification decision but never emits a numeric confidence; the guardrail has no hook to trigger HITL when classification is borderline | [`route_query.js`](file:///C:/Users/latha/antigravityProjects/updatedVendorScrapingNotebook-v2/scripts/evaluators/route_query.js) | Silent misclassification causes wrong pipeline |
| A-2 | **Freeform vs RFP boundary is ambiguous** — "I need 2 DL380 Gen12 with 512GB RAM" can be classified as either FREEFORM_QA or RFP_SIZING_TO_BOM; the decider uses only surface-level keyword matching with no workload DNA enrichment | `route_query.js` L.850+ | Wrong track, wasted tokens |
| A-3 | **No multi-language / abbreviated chassis handling** — "380G12", "ProLiant G11", "DL380Gen12" (no space) all fail the regex boundary patterns | `route_query.js` PLATFORM_SIGNATURES | Customer queries fail lookup |
| A-4 | **Quick-question freeform track loses product context** — If the question is "Can H200 GPU work in DL380 Gen12?", the answer comes from local RAG but the thermal ambient-temperature rule (≥27°C datacenter ambient needed) is NOT recalled because it is an **implicit DOM rule**, never persisted to NotebookLM as an explicit conditional SKU gate | `local_rag_search.js` | Silently returns wrong PASS |
| A-5 | **No clarification triage step for multi-config BOQs** — AGENTS.md mandates up-front ambiguity triage but no structured triage conversation is forced when multiple configs are detected without explicit config separators | `boq_preprocessor.js` | Wrong cluster splits |

### Fixes (A)

```
A-1: Emit classificationConfidence: 0.0-1.0 from getChassisCatalog() into the route result envelope.
     If score < 0.80, set hitlRequired: true and surface as AMBIGUOUS_QUERY with explanation.

A-2: Route "sizing intent" via workload_dna.js first — if DNA score >= 0.7 for any known
     workload pattern AND no SKUs are detected, force RFP_SIZING_TO_BOM regardless of wording.

A-3: Add canonical aliases: /380g(\d+)/i → "DL380 Gen{N}", /proliant\s*g(\d+)/i → "Gen{N}".
     Extend PRODUCT_ALIASES in product_scope.js accordingly.

A-4: Persist conditional DOM rules (ambient temperature gates, GPU TDP thresholds seen
     in hidden DOM) as explicit Catalog_Rules.json entries with field "conditionType":
     "AMBIENT_GATE" | "TDP_GATE" | "CONFIG_TRIGGER_ONLY". Then RAG can find them.

A-5: In boq_preprocessor.js, when configs > 1 AND sheet names are ambiguous,
     force clarification of CTO unit quantity before proceeding. Emit structured JSON
     with missingFields: ["configSeparatorStrategy", "ctoQty"] to the caller.
```

---

## Dimension B — Input Sheet Validation & Config Planning

### What works well
- `boq_preprocessor.js` handles .xlsx, .xls, .csv, .tsv, freeform text sections.
- CTO atomic normalization via `cto_normalizer.js` catches quantity anomalies.
- `variation_clusterer.js` builds a diff matrix and improbability index.
- HITL trigger fires if `improbabilityScore > threshold`.

### Gaps identified

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| B-1 | **No sheet-level product type auto-detection before config split** — A tender with Row 1 = DL380 Gen12, Row 20 = SN3600B FC Switch is treated as one server config until `boq_parser.js` fails on the switch SKU | `boq_preprocessor.js` + `boq_parser.js` | Switch lines silently dropped or misclassified |
| B-2 | **CTO quantity divisor only normalizes to 1 unit; no multi-chassis pack validation** — e.g. "2 × DL380 chassis + shared 20 drives" is not decomposed into 2 clusters × 10 drives each | `cto_normalizer.js` | Wrong drive-per-chassis ratio in all aspects |
| B-3 | **Preprocessing audit trail doesn't surface un-mapped SKUs** — SKUs that have no match in catalog are silently dropped from `parseSkuLines()`; there is no UNMATCHED section in the preprocessing report | `boq_parser.js` | Missing critical components go unnoticed |
| B-4 | **No cross-sheet deduplication** — If the same SKU appears in Sheet1 and Sheet3 (common with HPE tender templates), it is evaluated twice and can double-count quantities | `boq_preprocessor.js` loadInputSections | Quantity math errors in 7-aspect checks |
| B-5 | **`heterogeneous_tender_modernizer.js` is not called automatically from preprocessor** — when a mixed-domain sheet is detected (server + SAN + switch), the router continues to server-only evaluation instead of forking to the heterogeneous path | `route_query.js` / `boq_preprocessor.js` | Storage/networking components not validated |

### Fixes (B)

```
B-1: Add a domain-sniff pass in boq_preprocessor.js before variation clustering:
     iterate parsed rows, run topologyRole(description) on each SKU, bucket by
     {server, storage, networking, archive}. If multi-domain, split into domain
     sub-tenders and route each through its own eval pipeline.

B-2: In cto_normalizer.js, after detecting multiplier N, divide ALL non-chassis
     BOM lines by N and assert chassis count === N. Emit chassis_multiplier in
     the auditTrail for downstream 7-aspect checks to use.

B-3: In boq_parser.js, collect every SKU that fails catalog lookup into
     unmatchedSkus[]. Emit this list as a HITL_REQUIRED audit step with
     confidence 0.0.  Never silently drop an unmatched line.

B-4: Add dedup pass: after all sheets are merged, accumulate quantities
     by cleanBaseSKU(). Flag any SKU appearing in >1 sheet with status:
     'MULTI_SHEET_DUPLICATE'.

B-5: In route_query.js botom of track dispatch, if topology.domain === 'composite'
     AND heterogeneous_tender_modernizer exists, auto-route there before returning
     server-only evaluation results.
```

---

## Dimension C — E2E Solution → Rankings → Verification → Introspection

### What works well
- `boq_evaluator.js` runs 7 physical aspect checks (TDP, Memory, TriMode, Networking, PCIe, Power, Support).
- `conflict_graph.js` + `strategy_synthesizer.js` produce 5-Tier Ranked Strategy Matrix.
- `least_delta_combinator.js` synthesizes Rank 1L minimal-mutation path.
- `agentic_guardrail.js` / `guardrail_transport.js` query NotebookLM for grounded verification.
- Evidence ledger tracks phase completion.

### Gaps identified

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| C-1 | **Ranking confidence is not re-validated against NotebookLM citations** — `strategy_synthesizer.js` produces Rank 1A, 1B, 1L rankings using local rule math, but the guardrail is called _after_ rankings, not per-rank. A locally-valid rank can still fail NLM grounding. | `agentic_guardrail.js` | Ungrounded rankings presented to customer |
| C-2 | **`evalSupportServices` uses hard-coded service SKU patterns** — e.g. `^h[a-z0-9]{6}` for Pointnext, but newer HPE service SKUs (Compute Ops Management `R7A11AAE`, HaaS codes) don't match | `aspects/support_services.js` | Service validation silently passes invalid SKUs |
| C-3 | **`evaluateUnprofiledTopology` returns confidence 0 with no concrete next-action** — when a topology is unrecognized, the system flags `VALIDATION_PROFILE_REQUIRED` but gives no actionable path back to the user | `solution_topology.js` L.61 | Evaluation dead-ends silently |
| C-4 | **Least-Delta (Rank 1L) does NOT verify that substituted SKU is visible in catalog at current default ambient** — This is exactly the H200 / 30°C ambient issue. A SKU that exists in the catalog JSON may still be conditionally hidden in the live portal under standard ambient-temperature defaults | `least_delta_combinator.js` | Rank 1L substitute is un-orderable |
| C-5 | **No introspection / reasoning trace returned to the USER** — The evaluation emits aspect check status objects but never produces a human-readable reasoning narrative explaining WHY a rank was chosen and what evidence supports it | `eval_output_serializer.js` | Users can't trust or audit the output |
| C-6 | **`solutionFingerprint()` hashes the BOM but NOT the catalog version** — If the catalog is re-scraped between two evaluations, the same customer BOM gets a different grounded result with no explanation | `boq/solution_evidence.js` | Non-deterministic evaluation results |

### Fixes (C)

```
C-1: For each Rank candidate, run a per-rank NLM micro-query:
     "Does [SKU list] form a valid HPE [product] configuration?"
     Attach nlmCitationVerified: true/false to each rank.
     Only present ranks with nlmCitationVerified: true as RECOMMENDED.

C-2: Replace hard-coded regex with a dynamic service SKU pattern loaded from
     catalog/catalog_rules.js SERVICE_SKU_PATTERNS array, seeded from OCA
     Services tab scrape and updateable without code changes.

C-3: In evaluateUnprofiledTopology, populate a requiredActionsToUnblock[] array
     with concrete steps: ["Scrape OCA for SN3600B", "Register SN3600B_FC
     notebook in notebooks.json", "Re-evaluate with SAN evaluator"].

C-4: Add a catalog-visibility check in least_delta_combinator.js:
     for each proposed substitute SKU, call isSkuVisibleAtDefaultAmbient(sku, catalog)
     which checks the Catalog_Rules.json for AMBIENT_GATE / TDP_GATE conditions.
     If hidden, mark rank as PORTAL_CONDITIONAL and require live OCA verification.

C-5: Add generateEvaluationNarrative() to eval_output_serializer.js that produces
     a numbered step-by-step reasoning trace:
     1. What was detected in the BOM
     2. Which physical checks passed/failed and why
     3. Which catalog rule fired for each conflict
     4. What evidence (NLM citation / catalog entry) supports each conclusion
     5. What the customer must do next

C-6: Include catalogFingerprint (SHA-256 of Catalog.json metadata.scrapedAt +
     totalUniqueSKUs) inside solutionFingerprint(). Log catalog version change as
     a WARNING when re-evaluating the same BOM.
```

---

## Dimension D — Portal Scraping: Hidden DOM Rules, Ambient/TDP Gates, SKU Visibility, NLM Sync

> **This is the most critical dimension.** The H200 GPU (and many other AI-SKUs) are hidden in OCA unless specific ambient-temperature configuration triggers (≤27°C vs default 30°C) are selected. The current scraper captures only the DOM state at the time of scraping — it does NOT enumerate conditional visibility states.

### What works well
- `dom_extract.js` captures iframe content, handles reactive WebLogic re-renders with snapshot freeze.
- `extractTablesAsRows` captures `._pid` badge-tagged product IDs correctly.
- `extractSectionHeaders` provides landmark context.
- `checksum_diff.js` provides SHA-256 SKU-level differential — ADDED, MODIFIED, REMOVED are properly classified.
- `post_flow_sync.js` triggers NLM upload after each scrape.
- `notebooks.json` has per-product `notebookId`, `cloudSyncState`, `lastContentFingerprints`.

### Gaps identified

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| D-1 | **Hidden/conditional SKUs are NOT captured** — The scraper reads DOM state under the default ambient setting (30°C). SKUs gated behind ambient < 27°C (e.g. H200 GPU for DL380 Gen12), or behind a TDP-trigger (high-wattage CPU selected), or behind a form-factor selection, are completely invisible to `innerText` and `extractTablesAsRows()`. The `display:none` or `visibility:hidden` elements are not traversed. | `dom_extract.js` / `scrape_oca_solution.js` | H200 and similar SKUs absent from catalog |
| D-2 | **No enumeration of configuration trigger combinations** — OCA is a state machine. Selecting Processor A unlocks SKU-set X; selecting Ambient 27°C unlocks SKU-set Y. The scraper captures one state. All other conditional branches are dark. | `scrape_oca_solution.js` | Incomplete catalog — missing entire GPU tier |
| D-3 | **Catalog_Rules.json does not encode conditional SKU visibility** — `classifyRule()` only looks for text patterns like "ambient temperature" in rule text, but does NOT record WHICH SKUs become visible/invisible under which condition. There is no `conditionType: AMBIENT_GATE`, `triggerSku`, `thresholdValue` model. | `catalog_rules.js` classifyRule() | Rules exist but can't be queried as gates |
| D-4 | **`checksum_diff.js` hashes sku+price+desc but not visibility state** — A SKU that goes from hidden→visible (ambient change) has an unchanged hash but fundamentally different ordering eligibility. | `checksum_diff.js` computeSkuHash() | Visibility changes never trigger NLM update |
| D-5 | **NLM notebook not updated when a SKU's ambient/trigger condition changes** — Even if we knew a SKU's condition changed, `post_flow_sync.js` only syncs when `modifiedSkusCount > 0 OR addedSkusCount > 0`. Visibility-state-only changes are invisible to the diff engine. | `post_flow_sync.js` / `knowledge_sync.js` | NLM notebook stays stale for conditional SKUs |
| D-6 | **`resolveProductNotebookId()` uses exact-match then substring match but no family+gen fallback** — If a new chassis variant is scraped (e.g. `DL380_Gen12_24SFF`) and notebooks.json only has `DL380_Gen12`, the notebook lookup returns null and NLM sync is skipped silently | `nlm_solution_source_validator.js` L.39 | New variants never synced to NLM |
| D-7 | **Alletra notebook has `cloudSyncState: "FAILED"` and `lastSyncError` shows `invalid_grant`** — This means Alletra knowledge is stale. No alert or recovery path is triggered. Evaluations for Alletra BOQs silently degrade to local RAG only. | `notebooks.json` L.191 | Alletra evaluations are ungrounded |
| D-8 | **`defaultNotebookId: null`** — If any product falls through all notebook lookup logic, the code returns `null` silently. There is no global fallback notebook for unsupported/new products. | `notebooks.json` L.2, `knowledge_sync.js` L.48 | New products silently skip cloud grounding |

### Fixes (D)

**D-1 & D-2 — Hidden DOM Conditional Scraping:**
```javascript
// In dom_extract.js, add extractHiddenElements():
async function extractHiddenElements(ws, sendCommand) {
  const result = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Walk ALL elements including display:none and visibility:hidden
      const allElements = document.querySelectorAll('[class*="_pid"], ._pid, .item_prod');
      const hidden = [];
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        const isHidden = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        if (isHidden) {
          // Walk up to find parent row and extract SKU + containing rule text
          const row = el.closest('tr, .item_row, [data-item]');
          const ruleEl = row?.closest('table')?.previousElementSibling;
          hidden.push({
            sku: (el.innerText || el.textContent || '').trim(),
            ruleContext: (ruleEl?.innerText || '').trim().substring(0, 300),
            visibilityReason: 'HIDDEN_IN_DEFAULT_DOM_STATE',
            parentClass: el.parentElement?.className || ''
          });
        }
      }
      return JSON.stringify(hidden);
    })()`,
    returnByValue: true
  });
  try { return JSON.parse(result.result?.value || '[]'); } catch { return []; }
}
```

**D-2 — Ambient / TDP Configuration Sweep:**
```javascript
// In scrape_oca_solution.js, add a conditional sweep pass after Step 5:
// 1. Extract the ambient temperature selector (select[name*="ambient"] or dropdown)
// 2. For each threshold value [35°C, 30°C, 27°C, 25°C]:
//    a. sendCommand SET VALUE to ambient selector
//    b. sleep(2000) for WebLogic to re-render
//    c. extractTablesAsRows() — diff against baseline
//    d. Any NEW rows that appear are CONDITIONAL_SKUs with conditionType: AMBIENT_GATE,
//       thresholdValue: 27, operator: "lte"
// 3. Restore original ambient value
// 4. Persist conditional SKUs in a separate raw_data/conditional_skus.json

// Structure:
{
  "sku": "P47824-B21",  // H200 NVL 141GB GPU
  "description": "NVIDIA H200 NVL 141GB GPU for HPE...",
  "conditionType": "AMBIENT_GATE",
  "operator": "lte",
  "thresholdDegC": 27,
  "visibleAtDefault30C": false,
  "visibleAt27C": true,
  "evidence": "HPE OCA DOM — element visible only after ambient dropdown set to ≤27°C"
}
```

**D-3 — Catalog_Rules.json Conditional SKU Model:**
```javascript
// Extend classifyRule() return to include:
{
  level: 'SKU',
  ruleType: 'CONDITIONAL_VISIBILITY',
  conditionType: 'AMBIENT_GATE',  // or TDP_GATE, CONFIG_TRIGGER
  conditionKey: 'ambientTempC',
  conditionOperator: 'lte',
  thresholdValue: 27,
  affectedSkus: ['P47824-B21', ...],
  isStrict: true,
  portalVerificationRequired: true
}
```

**D-4 — Visibility-aware hash:**
```javascript
// In checksum_diff.js, add visibilityState field to computeSkuHash():
function computeSkuHash(skuObj) {
  const visibility = String(skuObj.visibilityState || 'VISIBLE').trim(); // NEW
  const payload = `${pn}|${desc}|${price}|${optType}|${qty}|${visibility}`; // extended
  ...
}
```

**D-5 — NLM sync trigger for visibility changes:**
```javascript
// In post_flow_sync.js, add conditional SKU change detection:
const conditionalSkusPath = path.join(liveOutputDir, 'raw_data', 'conditional_skus.json');
const prevConditionalPath = path.join(liveOutputDir, 'history', 'prev_conditional_skus.json');
if (fs.existsSync(conditionalSkusPath) && fs.existsSync(prevConditionalPath)) {
  const curr = JSON.parse(fs.readFileSync(conditionalSkusPath));
  const prev = JSON.parse(fs.readFileSync(prevConditionalPath));
  const visibilityChanged = curr.some(s => {
    const p = prev.find(x => x.sku === s.sku);
    return !p || p.visibleAt27C !== s.visibleAt27C || p.thresholdDegC !== s.thresholdDegC;
  });
  if (visibilityChanged) forceNlmSync = true;
}
```

**D-6 — Notebook lookup form-factor fallback:**
```javascript
// In nlm_solution_source_validator.js resolveProductNotebookId():
// After substring match fails, try stripping form-factor suffix:
const strippedNorm = normalize(name.replace(/_(8SFF|24SFF|8LFF|12LFF|EDSFF|SFF|LFF|RACK)$/i, ''));
for (const [key, val] of Object.entries(notebooks)) {
  if (normalize(key) === strippedNorm && val.notebookId && val.queryEnabled !== false) {
    return val.notebookId;
  }
}
```

**D-7 — Alletra stale notebook recovery:**
```javascript
// In knowledge_sync.js, after getNotebookDegradedMode() returns 'STALE_NOTEBOOK_SYNC':
// Auto-trigger Google OAuth token refresh via nlm source sync-drive or re-auth flow.
// Emit a structured ALERT to the pipeline logger:
logger.error('KNOWLEDGE_SYNC', `Notebook ${chassisName} has cloudSyncState=FAILED.
  Action required: Re-authenticate Google OAuth and re-run sync.
  Last error: ${entry.lastSyncError}`);
// Set evaluation confidence to DEGRADED_UNGROUNDED for this chassis.
```

---

## Dimension E — Architecture Correctness: Product Type, Solution, Sub-component Separation

### What works well
- `product_scope.js` correctly infers PILLAR (SERVER/STORAGE/NETWORKING) from family.
- `solution_topology.js` resolves domain from a BOQ's item list using `topologyRole()`.
- `classifyComponentRole()` in `product_meta.js` has explicit guards for SAN Switch, Fabric Interconnect, Composable Enclosure to prevent server-profile bleeding.
- `DOMAIN_CHECKS` enumerate domain-specific validation requirements.

### Gaps identified

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| E-1 | **Synergy frame vs Synergy compute blade vs Synergy F32 interconnect are in the SAME notebook** — `notebooks.json` adds `sharedEnclosureWarning` but the evaluation engine does NOT enforce pillar-filtered queries. A query about SY480 memory can return F32 fabric results | `notebooks.json` + `agentic_guardrail.js` | Wrong grounding — compute rules for networking |
| E-2 | **`inferPillar()` returns 'UNKNOWN' for any unrecognized family** — New vendors (Juniper EX, Arista, Pure Storage) will all land as UNKNOWN and silently take the generic server evaluation path | `product_scope.js` L.21 | Networking/storage evaluated as server |
| E-3 | **`topologyRole()` function is too aggressive with null returns** — Items like "HPE 96W Smart Storage Battery" return null (correctly excluded from topology nodes), but "HPE Alletra 9000 Storage Array" can also return null if description is ambiguous | `solution_topology.js` L.7 | Storage system skipped from composite topology |
| E-4 | **Sub-component containment model is incomplete** — When a solution has a Synergy Frame (enclosure), SY480 blades (server), and F32 modules (networking), the `OWNERSHIP_AND_CONTAINMENT` check is listed as `NOT_EVALUATED` with no implementation | `solution_topology.js` L.42, `evaluateUnprofiledTopology()` | Multi-component solutions never fully validated |
| E-5 | **`catalog_rules.js` `getMandatorySkusForChassis()` uses a brittle if-else chain** — Adding a new chassis variant (e.g. DL560 Gen12, or a new Aruba switch) requires a code change. There is no data-driven fallback | `catalog_rules.js` L.72-93 | New products silently fall to wrong kit set |
| E-6 | **`product_meta.js` FAMILY_PATTERNS array is first-match wins** — 'SAN' pattern `/\bsn\s*\d{4}[a-z]\b/i` is first, but will miss `HPE StoreFabric SN6610C` which doesn't start with SN+4digits+letter | `product_meta.js` L.10 | New SAN products classified as 'General' |
| E-7 | **No cross-component dependency validation is implemented** — `ENCLOSURE_BAY_COMPATIBILITY`, `ADAPTER_TO_FABRIC_MAPPING`, `SHARED_POWER_COOLING` are all listed as `NOT_EVALUATED` for composite solutions. These are the most critical checks for Synergy solutions | `solution_topology.js` L.42 | Composite solutions can never reach PASS |

### Fixes (E)

**E-1 — Pillar-filtered NLM queries:**
```javascript
// In agentic_guardrail.js, when querying a shared-enclosure notebook:
const notebookEntry = cfg.notebooks[chassisName];
if (notebookEntry?.sharedEnclosureWarning) {
  const pillarFilter = `IMPORTANT: Filter responses to pillar: ${notebookEntry.pillar} only.
  Do NOT reference ${notebookEntry.pillar === 'SERVER' ? 'fabric/networking' : 'compute/server'} components.`;
  query = `${pillarFilter}\n\n${query}`;
}
```

**E-2 — Extensible pillar inference:**
```javascript
// In product_scope.js, make inferPillar data-driven:
const PILLAR_FAMILIES = {
  SERVER: ['proliant', 'cray', 'superdome', 'edgeline', 'simplivity', 'poweredge', 'ucs', 'thinksystem'],
  STORAGE: ['alletra', 'nimble', 'storeonce', 'msa', 'storeever', 'powerstore', 'powervault', 'purestorage', 'netapp'],
  NETWORKING: ['aruba', 'san', 'nexus', 'catalyst', 'networking', 'juniper', 'arista', 'brocade']
};
// Load extensions from chassis_map.json pillar_overrides for vendor-agnostic support.
```

**E-3 — Strengthen topologyRole() for storage arrays:**
```javascript
// Add explicit Alletra/storage array guard BEFORE the null-return:
if (/alletra|nimble|storeonce|powerstore|powervault|\bmsa\s*\d+/i.test(text)
    && !/\b(service|support|cable|transceiver|kit)\b/i.test(text)) {
  return 'storage';
}
```

**E-4 & E-7 — Implement composite topology sub-checks (at minimum a structured NOT_EVALUATED with evidence requirement):**
```javascript
// In solution_topology.js, replace the empty relationshipChecks list with:
// 1. ENCLOSURE_BAY_COMPATIBILITY: count SY480 blades vs frame bay count from catalog
// 2. ADAPTER_TO_FABRIC_MAPPING: verify each compute module OCP/PCIe adapter speed
//    matches F32 fabric link speed (100Gb vs 50Gb vs 25Gb)
// 3. SHARED_POWER_COOLING: sum per-blade TDP vs frame power budget from catalog
// Mark each as PASS, FAIL, or EVIDENCE_REQUIRED with specific missing data callout.
```

**E-5 — Data-driven mandatory SKU kit resolution:**
```javascript
// In chassis_map.json, add a "kit_routing" table:
{
  "kit_routing": {
    "matchers": [
      { "familyPattern": "proliant", "genPattern": "gen12", "kitKey": "ProLiant_Gen12" },
      { "familyPattern": "alletra", "genPattern": "*", "kitKey": "Alletra_Storage" },
      { "familyPattern": "aruba", "genPattern": "*", "kitKey": "Aruba_Networking" }
    ]
  }
}
// getMandatorySkusForChassis() reads this table instead of if-else chain.
```

---

## Additional Gaps & Smells Not in A-E

| # | Area | Gap | Fix |
|---|------|-----|-----|
| X-1 | **graphify graph is not present** | `graphify-out/graph.json` is absent — all `/graphify query` calls fail silently. Every session falls back to brute-force file reads, inflating context window. | Run `npx graphify update .` to rebuild. Add to pre-session invariant check. |
| X-2 | **`defaultNotebookId: null` is a silent failure** | Any product with no notebook mapping falls through to no-op NLM grounding. Should emit `DEGRADED: NO_NOTEBOOK_MAPPED` badge. | Set `defaultNotebookId` to a GLOBAL_CATCH notebook or explicitly fail with `UNGROUNDED` status |
| X-3 | **`Alletra_Storage_System` cloudSyncState FAILED** | Live OCA scrape and NLM sync broke due to `invalid_grant` OAuth. Evaluation is running ungrounded. | Re-authenticate GCP service account. Run `nlm source sync-drive Alletra_Storage_System`. Set `cloudSyncState: "RECOVERING"` as a distinct state. |
| X-4 | **`SN3600B_FC` has no `runningKnowledgeSourceId`** | SAN switch notebook has `canonicalKnowledgeSourceIds` but no running knowledge doc — learning loop is broken for the newest product. | Add runningKnowledgeSourceId after next learning cycle. |
| X-5 | **No version tracking on catalog rules** | `Catalog_Rules.json` has no `schemaVersion` or `lastModifiedBy`. When a scrape adds a new ambient rule, there's no audit of who/what changed it. | Add `schemaVersion`, `lastModifiedAt`, `lastModifiedByPipeline` to all Catalog_Rules.json files. |
| X-6 | **`emitProgress()` in boq_evaluator.js is a no-op stub** | The function exists but doesn't connect to any SSE/websocket channel — dashboard receives no real-time progress for BOQ evaluations | Wire up to `progress.js` emitProgress consistent with scraper pipeline. |
| X-7 | **No multi-vendor BOQ guard** | When a BOQ mixes HPE and Dell or Cisco SKUs, the evaluator runs HPE catalog rules on Dell SKUs and silently fails constraint checks. No cross-vendor separation. | In boq_preprocessor.js, detect vendor by SKU prefix pattern. Bucket by vendor before evaluation. Route Dell lines to cross_vendor_transformer.js. |
| X-8 | **`catalog_freshness_guard.js` not called before evaluation** | Evaluations can run against catalogs that are days old. There is no pre-flight freshness gate. | Call `isCatalogFresh(catalogDir, maxAgeHours=72)` at start of `evaluateBOQMultiAspect()`. Emit `STALE_CATALOG` warning badge if exceeded. |

---

## Implementation Priority & Execution Plan

> **Key principle**: No test cases in this plan per user instruction. Focus on core logic fixes. Leave testing plan for Gemini model runs.

### Phase 1 — Critical / Safety (Execute immediately)
1. **D-1/D-2**: Add `extractHiddenElements()` + ambient-temperature sweep to `dom_extract.js` and `scrape_oca_solution.js`
2. **D-3**: Extend `catalog_rules.js` `classifyRule()` with `CONDITIONAL_VISIBILITY` rule type and `conditionType`, `thresholdValue`, `affectedSkus` fields
3. **D-4**: Extend `checksum_diff.js` `computeSkuHash()` with `visibilityState` field
4. **D-7**: Add Alletra OAuth recovery alert + `DEGRADED_UNGROUNDED` confidence label in `knowledge_sync.js`
5. **B-1**: Add domain-sniff pass in `boq_preprocessor.js` to auto-split mixed-domain tenders

### Phase 2 — Correctness (Execute next session)
6. **C-4**: Add `isSkuVisibleAtDefaultAmbient()` gate in `least_delta_combinator.js`
7. **D-6**: Add form-factor-strip fallback to `resolveProductNotebookId()` in `nlm_solution_source_validator.js`
8. **E-1**: Add pillar-filtered query prefix in `agentic_guardrail.js` for shared-enclosure notebooks
9. **A-1**: Emit `classificationConfidence` score in `route_query.js`
10. **B-3**: Emit `unmatchedSkus[]` from `boq_parser.js`

### Phase 3 — Architecture Hardening (Plan for Gemini model execution)
11. **E-4/E-7**: Implement `ENCLOSURE_BAY_COMPATIBILITY`, `ADAPTER_TO_FABRIC_MAPPING`, `SHARED_POWER_COOLING` checks in `solution_topology.js`
12. **E-5**: Data-driven `kit_routing` table in `chassis_map.json` + rewrite `getMandatorySkusForChassis()`
13. **C-5**: Add `generateEvaluationNarrative()` to `eval_output_serializer.js`
14. **X-1**: Rebuild graphify graph: `npm run update:graph`
15. **D-5**: Visibility-change-triggered NLM sync in `post_flow_sync.js`

### Phase 4 — Testing Plan (For Gemini model execution — no token spend here)
- Unit: Each new function in isolation with mocked CDP / catalog data
- Integration: Full scrape → conditional sweep → catalog build → NLM sync for DL380 Gen12 (validate H200 appears under 27°C ambient)
- E2E: Submit a BOQ containing H200 GPU and verify the system flags `PORTAL_CONDITIONAL` on Rank 1L, not a silent PASS

---

## Summary Metrics

| Dimension | Gaps Found | Critical | High | Medium |
|-----------|-----------|---------|------|--------|
| A — Query Interpretation | 5 | 1 (A-4) | 2 | 2 |
| B — Input Validation | 5 | 2 (B-1, B-5) | 2 | 1 |
| C — Solution/Ranking/Verification | 6 | 2 (C-1, C-4) | 2 | 2 |
| D — Portal Scraping & NLM | 8 | 4 (D-1,D-2,D-3,D-5) | 3 | 1 |
| E — Architecture Correctness | 7 | 3 (E-1,E-4,E-7) | 3 | 1 |
| X — Additional Smells | 8 | 2 (X-3, X-6) | 4 | 2 |
| **Total** | **39** | **14** | **16** | **9** |

> [!CAUTION]
> The H200 ambient-gate gap (D-1/D-2 + C-4) is the highest business risk: the current system can present an unorderable H200 GPU as Rank 1L or even as a PASS in a customer-facing evaluation. This must be fixed in Phase 1 before the next customer BOQ is processed.

> [!WARNING]
> `Alletra_Storage_System` `cloudSyncState: "FAILED"` means all Alletra evaluations are running without NotebookLM grounding today. Re-auth and re-sync is urgently needed.

> [!NOTE]
> The graphify graph (`graphify-out/graph.json`) is stale / missing. Rebuild with `npm run update:graph` at the start of each session to restore token-efficient architecture discovery.
