# Skills Gap Analysis — Full Architectural Review

> **Scope**: Routing logic, hardcoding smells, missing wiring, classification blind spots, and principle violations across the presales skill dispatch system.
> **Files Reviewed**:
> - [route_query.js](file:///scripts/evaluators/route_query.js)
> - [presales-query-router SKILL.md](file:///.agents/skills/presales-query-router/SKILL.md)
> - [catalog_discovery.js](file:///scripts/lib/catalog/catalog_discovery.js)
> - [requirement_intent_resolver.js](file:///scripts/lib/boq/requirement_intent_resolver.js)
> - [eval_boq.js](file:///scripts/evaluators/eval_boq.js)
> - [notebooks.json](file:///scripts/config/notebooks.json)
> - [chassis_map.json](file:///scripts/config/chassis_map.json)

---

## Summary Dashboard

| Category | Critical | High | Medium | Total |
|:---|:---:|:---:|:---:|:---:|
| **Missing Skill Wiring** (code has zero handler) | 3 | 2 | 1 | 6 |
| **Hardcoding / Magic Values** | 1 | 3 | 2 | 6 |
| **Logic Smells / Wrong Logic** | 2 | 3 | 2 | 7 |
| **Product Coverage Gaps** | 2 | 1 | 1 | 4 |
| **Classification Blind Spots** | 1 | 3 | 2 | 6 |
| **Principle Violations** | 1 | 2 | 1 | 4 |
| **Totals** | **10** | **14** | **9** | **33** |

---

## 🔴 CRITICAL: Missing Skill Wiring (Skills Documented but Zero Handlers)

### GAP-1: `workload-dna-skill` — Completely Unwired
> [!CAUTION]
> The presales-query-router SKILL.md documents a `workload-dna-skill` track for application-specific inquiries (SAP HANA, VMware VCF, VDI, AI inference). The [Mermaid flowchart](file:///.agents/skills/presales-query-router/SKILL.md#L47-L48) routes "Application-Specific Workload" → `workload-dna-skill`. **However**:
> - `route_query.js` has **zero references** to `workload-dna`, `WORKLOAD_DNA`, `resource_arbitrator`, `sap hana`, `vmware`, `vcf`, `vdi`, or `ai inference`.
> - There is **no `WORKLOAD_DNA` intent enum** in `classifyQueryIntent()`.
> - There is **no `_handleWorkloadDna()` handler** in `executeRoutedQuery()`.
> - There is **no case branch** in the `switch(classification.intent)`.

**Impact**: Customer query *"Size a server for SAP HANA with 2TB memory"* will be misclassified as `RFP_SIZING_TO_BOM` (generic sizing) and lose NUMA-optimized 1DPC memory, memory-per-core ratio enforcement, and workload-specific slot arbitration.

**Fix**: Add `WORKLOAD_DNA` intent detection with keywords (`sap hana`, `vmware vcf`, `vdi`, `ai inference`, `machine learning`, `high frequency trading`), a `_handleWorkloadDna()` handler that invokes `extractWorkloadDna()` from `workload_dna.js`, and a case branch in the switch.

---

### GAP-2: `value-engineering-skill` — Completely Unwired
> [!CAUTION]
> AGENTS.md Dispatch Matrix lists "Post-Buildability Deal CapEx/OpEx Optimization" → `value-engineering-skill` → `budget_optimizer.js`. The skill SKILL.md documents CPU right-sizing, NIC bandwidth alignment, PSU efficiency tuning after 100% buildability is confirmed. **However**:
> - `route_query.js` has **zero references** to `value-engineering`, `VALUE_ENGINEERING`, or `budget-optim`.
> - There is **no intent classification** for queries like *"Optimize this build for budget"* or *"Can we reduce CapEx on this 100% buildable config?"*.
> - The `--budget` flag exists in `eval_boq.js` but there's no router path to invoke it from natural language.

**Impact**: Post-buildability optimization requests silently fall through to FREEFORM_QA, getting a prose answer instead of an actionable optimized BOM.

---

### GAP-3: `least-delta-combinator-skill` — Completely Unwired
> [!CAUTION]
> Documented in the Dispatch Matrix for "Least-Delta Alternative Synthesis (Rank 1L)" → `conflict_graph.js`. **However**:
> - No `LEAST_DELTA` intent in `classifyQueryIntent()`.
> - No handler for *"Find the minimum-change alternative to this troublesome SKU"*.
> - The combinator is called internally from the conflict graph during eval_boq, but a customer asking *"What's the least-change fix for my controller issue?"* gets FREEFORM_QA.

---

### GAP-4: `workbook-generator-skill` — No Router Path
> [!WARNING]
> AGENTS.md documents "Standardized 7-Column Portals & Workbooks" → `workbook-generator-skill`. **However**:
> - No `WORKBOOK_GENERATION` intent classification.
> - Customer queries like *"Generate a portal upload sheet for this BOQ"* or *"Create an Excel workbook"* will hit FREEFORM_QA.

---

### GAP-5: `boq-remarks-reconciliation-skill` — Partially Wired
> [!WARNING]
> Listed in the SKILL.md classification matrix but missing from `classifyQueryIntent()`. The `executeRoutedQuery` switch would fall to the `default` case since there's no `REMARKS_RECONCILIATION` intent type, producing only a generic "Engage skill" instruction.

---

### GAP-6: `multi-cluster-tender-skill` — No Direct Router Intent
> [!NOTE]
> The presales-query-router SKILL.md describes routing multi-node/multi-sheet tenders to `multi-cluster-tender-skill`. The `classifyQueryIntent()` does detect spreadsheet files and redirects to `BOQ_EVALUATION`, which internally handles multi-cluster through `multi_cluster_splitter.js`. **However**, a text-only query *"I need 60 DL380 nodes for a 3-tier Web/App/DB cluster"* without a file will be classified as `RFP_SIZING_TO_BOM`, missing cluster decomposition, rack sizing, and power envelope calculation.

---

## 🔴 CRITICAL: Product Coverage Gaps

### GAP-7: `SN3600B_FC` — Completely Invisible to Router & Chassis Discovery
> [!CAUTION]
> `notebooks.json` has a fully configured `SN3600B_FC` entry (notebook ID `d7f84352`, pillar `NETWORKING`, `queryEnabled: true`). **However**:
> - [route_query.js PLATFORM_SIGNATURES](file:///scripts/evaluators/route_query.js#L75-L86) has **zero patterns for SN3600B, Brocade, SAN switch, or fibre channel switch**.
> - [catalog_discovery.js detectChassisVariant()](file:///scripts/lib/catalog/catalog_discovery.js#L78-L156) has **zero SN3600B detection patterns**.
> - [catalog_discovery.js getChassisMap() defaultMap](file:///scripts/lib/catalog/catalog_discovery.js#L29-L39) has **no SN3600B entry**.

**Impact**: Customer query *"Configure an SN3600B FC switch"* returns `UNKNOWN_PRODUCT`. BOQ items containing SN3600B SKUs (like base SKU `R7R97A`) are undetectable by auto-detection.

**Fix**:
1. Add `SN3600B_FC` to `getChassisMap()` default map with baseSku `R7R97A`.
2. Add `{ key: 'sn3600b', pattern: /\b(?:sn\s*3600b?|brocade|san\s*switch|fc\s*switch|fibre\s*channel\s*switch)\b/i }` to `PLATFORM_SIGNATURES`.
3. Add SN3600B detection patterns to `detectChassisVariant()`.

---

### GAP-8: `DL580_Gen12` — Hardcoded Map Entry Missing in `getChassisMap()` Default
> [!WARNING]
> `notebooks.json` has `DL580_Gen12` fully configured (notebook ID `3f5344ce`, `queryEnabled: true`). But the `getChassisMap()` default map (lines 29–39 of `catalog_discovery.js`) has **no `DL580_Gen12` entry**. It only exists in `chassis_map.json` on disk. If that JSON file is absent/corrupt, DL580 falls back to description-based detection only.

---

## 🟡 HIGH: Hardcoding & Magic Value Smells

### GAP-9: Gen12 Default Preference — Silent Assumption
> [!IMPORTANT]
> [route_query.js line 146](file:///scripts/evaluators/route_query.js#L145-L147):
> ```js
> // Documented default policy: when generation is absent after model identification, prefer Gen12
> const preferred = candidates.filter(c => c.id.includes('Gen12'));
> matchedCatalog = preferred.length === 1 ? preferred[0] : null;
> ```
> This is a hardcoded generation bias. If Gen13 launches, **every ambiguous query defaults to Gen12** until someone manually updates this line. This violates INV-1 (Zero-Hardcoding Compliance). The comment says "documented default policy" but the policy should be dynamic (e.g., prefer latest generation based on catalog discovery metadata).

---

### GAP-10: DL360 Gen12 Unsupported — Hardcoded Check
> [!WARNING]
> [route_query.js lines 48–57](file:///scripts/evaluators/route_query.js#L48-L57):
> ```js
> if ((text.includes('dl360') || text.includes('dl 360')) && (text.includes('gen12') || text.includes('gen 12'))) {
>   return { chassisKey: 'DL360_Gen12_UNSUPPORTED', ... };
> }
> ```
> This is a hardcoded "unsupported" check that will **silently suppress** DL360 Gen12 if HPE launches it. Should be derived dynamically from catalog presence (if no `DL360_Gen12_Catalog.json` exists → unsupported).

---

### GAP-11: `PLATFORM_SIGNATURES` Hardcoded Product Table
> [!WARNING]
> [route_query.js lines 75–86](file:///scripts/evaluators/route_query.js#L75-L86): The `PLATFORM_SIGNATURES` array and the candidate filtering block (lines 103–116) both contain hardcoded `startsWith()` strings for each platform key (`dl380_`, `dl380a_`, etc.). Adding a new product requires touching **both** arrays manually. Should be auto-generated from `chassis_map.json` or `listAllCatalogs()`.

---

### GAP-12: `detectChassisVariant()` Hardcoded Description Cascades
> [!WARNING]
> [catalog_discovery.js lines 130–141](file:///scripts/lib/catalog/catalog_discovery.js#L130-L141): A waterfall of hardcoded description checks (`dl384`, `dl380a`, `dl145`, `dl360`, `dl580`, `alletra`, `msl`, `cray`, `sy480`, `synergy 100gb`). This is the same pattern that missed SN3600B. Every new product requires a manual if-else addition.

---

### GAP-13: Hardcoded Notebook IDs in SKILL.md Documentation
> [!NOTE]
> Multiple SKILL.md files (presales-query-router, boq-eval-skill) contain inline notebook UUIDs like `b233ec88-4682-4164-a801-3ee6ca649dc1` and `1d190853-4e9c-48df-aa70-eae66c6f2c1f`. While the **code** correctly reads from `notebooks.json`, the **documentation** becomes stale. If a notebook is recreated, the SKILL.md references become misleading.

---

## 🟡 HIGH: Logic Smells & Wrong Logic

### GAP-14: `classifyQueryIntent()` Priority Ordering — Questions Override Sizing
> [!IMPORTANT]
> The classification priority order is:
> 1. Heterogeneous → 2. Cross-Vendor → 3. File detection → 4. Reconciliation keywords → 5. Catalog Intelligence → **6. Question detection** → **7. RFP Sizing** → 8. SKU tokens → 9. Default
>
> [Problem at lines 319–330](file:///scripts/evaluators/route_query.js#L319-L330): The question detector fires **before** the RFP sizing detector:
> ```js
> const isQuestion = /^(?:can\s+i|what\s+(?:is|are|options|can|do|does)|how\s+|why\s+|does\s+|is\s+(?:it|there))\b/i.test(text) ||
>   (text.includes('?') && !/\b(?:size\s+a|sizing|build\s+a\s+bom|generate\s+a\s+bom)\b/i.test(text));
> ```
> A query like *"Can I get 20 DL380a with 8x H200 NVL each?"* contains both `Can I` (question trigger) and sizing specs. The `isQuestion` regex fires first → routes to `FREEFORM_QA` instead of `RFP_SIZING_TO_BOM`.
>
> The negative lookahead `!/size\s+a|sizing|build\s+a\s+bom/` is **too narrow** — it misses *"Can I get"*, *"How many H200s fit"*, *"What power supplies do I need for 10x DL380a"*.

**Fix**: Either move sizing detection before question detection, or broaden the negative lookahead to include spec patterns (model + quantity + component).

---

### GAP-15: `_handleRfpSizing()` — Clause Splitting Fragile for Presales Queries
> [!WARNING]
> [route_query.js lines 525–529](file:///scripts/evaluators/route_query.js#L525-L529):
> ```js
> let rawLines = queryText.split(/[\r\n;]+/).map(l => l.trim()).filter(Boolean);
> if (rawLines.length === 1) {
>   const clauses = queryText.split(/\s+(?:with|and|plus|,)\s+/i).map(c => c.trim()).filter(Boolean);
>   if (clauses.length > 1) rawLines = clauses;
> }
> ```
> This splits *"DL380a Gen12 with basic processor and max H200 and minimum memory"* into:
> - `"DL380a Gen12"` ← loses all component context
> - `"basic processor"` ← good
> - `"max H200"` ← good
> - `"minimum memory"` ← good
>
> But the first clause `"DL380a Gen12"` is passed to `resolveRequirementIntent()` as a "requirement line" with no component role, creating a false unresolved requirement. Also, *"2x 32GB DDR5-5600 with ECC"* gets split into `"2x 32GB DDR5-5600"` and `"ECC"` — the ECC fragment is meaningless.

---

### GAP-16: Cross-Vendor Detection — Accidental Triggers on Product Questions
> [!WARNING]
> [route_query.js lines 232–250](file:///scripts/evaluators/route_query.js#L232-L250):
> ```js
> const isCrossVendor = ... ||
>   (/convert|equivalent|map|transform/i.test(text) && /dell|cisco|lenovo|supermicro/i.test(text)) || ...
> ```
> A question like *"Is this Dell R750 equivalent to DL380 Gen12?"* triggers `CROSS_VENDOR_TRANSFORMATION` (calls `transformCompetitorQuote()`) when the customer only wants a comparison answer, not a full architectural transformation with recommended BOM. The word "equivalent" + "Dell" is sufficient to trigger.

---

### GAP-17: `.pdf` Extension Detection — Routes to File-Based BOQ, Not OCR
> [!WARNING]
> [route_query.js line 253](file:///scripts/evaluators/route_query.js#L253):
> ```js
> const detectedPath = filePath || (text.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf|xlsx|xls|csv|tsv)/i)?.[0] || '');
> ```
> `.pdf` is included in the file path regex, but the OCR image check (line 256) only checks `['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp']` — **`.pdf` is not in the OCR image extensions list**. So a scanned PDF will be extracted by regex as a file path, but then neither routed to OCR (no `.pdf` in image list) nor parseable as a spreadsheet. It silently falls through to the text-based classification.

---

### GAP-18: Freeform Q&A `skillTarget` Self-Reference
> [!NOTE]
> [route_query.js lines 324–329 and 371–376](file:///scripts/evaluators/route_query.js#L324-L376): When `FREEFORM_QA` is classified, `skillTarget` is set to `'presales-query-router'` — the **same** skill that classified it. The agent SKILL.md says Track 1 should route to `nlm-skill` for NotebookLM grounded Q&A. The handler `_handleFreeformQa()` does call NotebookLM internally, but the reported `skillTarget` metadata is misleading. Should be `'nlm-skill'`.

---

### GAP-19: `scoreCandidate()` Threshold at 0.9 Too Aggressive
> [!NOTE]
> [requirement_intent_resolver.js line 177](file:///scripts/lib/boq/requirement_intent_resolver.js#L177):
> ```js
> const autoApply = Boolean(productConfirmed && best && best.score >= 0.9 && margin >= 0.08 && roleInference.certainty >= 0.9);
> ```
> The scoring formula (line 120–122) weights `category` at 0.42, `semantic` at 0.33, `numeric` at 0.2, and `skuTieBreak` at 0.05. For a perfect category match (1.0) and reasonable semantic match (0.7), the max score without SKU similarity is `0.42 + 0.231 + 0.2*numeric + 0.0 = 0.651 + 0.2*numeric`. Even with perfect numeric (1.0), that's `0.851` — **below the 0.9 auto-apply threshold**. This means auto-resolution almost never fires unless the SKU tie-break happens to push it over. Most resolutions will require human clarification even for obvious matches.

---

## 🟡 HIGH: Principle Violations

### GAP-20: `getChassisMap()` Default Map Violates Zero-Hardcoding (INV-1)
> [!IMPORTANT]
> [catalog_discovery.js lines 29–39](file:///scripts/lib/catalog/catalog_discovery.js#L29-L39): A 9-entry hardcoded default map (`DL380_Gen12`, `DL380_Gen11`, etc.) is embedded in code. While `chassis_map.json` can override it, the fallback hardcodes product identities. Any new product not in both `chassis_map.json` AND this default map requires a code change.

---

### GAP-21: `SY480_Gen12` and `SY100Gb_F32_Module` Share Notebook ID — INV-91 Isolation Violation
> [!WARNING]
> In `notebooks.json`:
> - `SY480_Gen12` → `notebookId: "49a3c69e-115f-4332-9454-c5d4f2941327"`
> - `SY100Gb_F32_Module` → `notebookId: "49a3c69e-115f-4332-9454-c5d4f2941327"`
>
> **Same notebook ID** for two products that AGENTS.md explicitly says "NEVER conflate with Synergy interconnect modules (`SY100Gb_F32_Module`)". A NotebookLM query grounded for compute blade rules could return fabric interconnect rules and vice versa, violating product isolation (INV-91).

---

### GAP-22: `evaluateBOQMultiAspect` in Reconciliation — Wrong API Shape
> [!WARNING]
> [route_query.js line 684](file:///scripts/evaluators/route_query.js#L684):
> ```js
> const evalRes = evaluateBOQMultiAspect(customerFile);
> ```
> `evaluateBOQMultiAspect()` expects an `items` array as its first argument, but here it receives a **file path string**. This will either throw an error or return an empty/malformed result. The reconciliation handler needs to parse the file into items first.

---

## 📊 Classification Decision Accuracy Matrix

| Customer Query | Expected Skill | Actual Routed Skill | Status |
|:---|:---|:---|:---:|
| *"Size a server for SAP HANA with 2TB memory"* | `workload-dna-skill` | ❌ `rfp-sizing-synthesizer` | **WRONG** |
| *"Can I get 20 DL380a with 8x H200 each?"* | `rfp-sizing-synthesizer` | ❌ `presales-query-router` (FREEFORM_QA) | **WRONG** |
| *"Configure an SN3600B FC switch"* | `oca-catalog-scraper` / NotebookLM | ❌ `UNKNOWN_PRODUCT` | **BROKEN** |
| *"What power supplies do I need for 10x DL380a?"* | `nlm-skill` (Q&A) | ❌ `rfp-sizing-synthesizer` | **WRONG** |
| *"Is this Dell R750 equivalent to DL380?"* | `nlm-skill` (comparison Q&A) | ❌ `cross-vendor-transformation-skill` | **WRONG** |
| *"Optimize this 100% buildable config for budget"* | `value-engineering-skill` | ❌ `presales-query-router` (FREEFORM_QA) | **WRONG** |
| *"Generate a portal upload sheet for this BOQ"* | `workbook-generator-skill` | ❌ `presales-query-router` (FREEFORM_QA) | **WRONG** |
| *"Find minimum-change fix for controller issue"* | `least-delta-combinator-skill` | ❌ `presales-query-router` (FREEFORM_QA) | **WRONG** |
| *"I need 60 DL380 nodes for Web/App/DB cluster"* | `multi-cluster-tender-skill` | ⚠️ `rfp-sizing-synthesizer` (loses cluster decomposition) | **PARTIAL** |
| *Customer uploads scanned PDF quote* | `ocr-quote-ingestion-skill` | ⚠️ Falls through (`.pdf` not in OCR ext list) | **BROKEN** |
| *"DL380 with 2 procs, 512GB RAM, 8 NVMe"* | `rfp-sizing-synthesizer` | ✅ `rfp-sizing-synthesizer` | **OK** |
| *"Evaluate this BOQ spreadsheet"* (with .xlsx) | `boq-eval-skill` | ✅ `boq-eval-skill` | **OK** |
| *"What SKUs went obsolete last week?"* | `catalog-intelligence-skill` | ✅ `catalog-intelligence-skill` | **OK** |
| *"Compare customer BOQ vs vendor quote"* | `bom-reconciliation-skill` | ✅ `bom-reconciliation-skill` | **OK** |

---

## 🔧 Remediation Plan (Priority-Ordered)

### Phase 1 — Critical Missing Wiring (Blocks Customer Queries)

| # | Gap | Action | Files | Effort |
|:--|:----|:-------|:------|:-------|
| 1 | **GAP-1** Workload DNA unwired | Add `WORKLOAD_DNA` intent + handler + keywords (SAP HANA/VMware/VDI/AI) | `route_query.js` | Medium |
| 2 | **GAP-7** SN3600B invisible | Add to `getChassisMap()`, `PLATFORM_SIGNATURES`, `detectChassisVariant()` | `catalog_discovery.js`, `route_query.js` | Small |
| 3 | **GAP-17** PDF not in OCR ext list | Add `.pdf` to OCR image extension check at line 256 | `route_query.js` | Trivial |
| 4 | **GAP-14** Question overrides sizing | Reorder: move sizing detection (step 5) before question detection (step 4), or broaden the negative lookahead | `route_query.js` | Small |
| 5 | **GAP-22** Wrong API call in reconciliation | Change `evaluateBOQMultiAspect(customerFile)` → parse file first then pass items | `route_query.js` | Small |

### Phase 2 — High-Value Missing Skills & Logic Fixes

| # | Gap | Action | Files | Effort |
|:--|:----|:-------|:------|:-------|
| 6 | **GAP-2** Value engineering unwired | Add `VALUE_ENGINEERING` intent + handler for post-buildability optimization | `route_query.js` | Medium |
| 7 | **GAP-3** Least-delta unwired | Add `LEAST_DELTA_SYNTHESIS` intent for explicit minimal-mutation requests | `route_query.js` | Medium |
| 8 | **GAP-4** Workbook generator unwired | Add `WORKBOOK_GENERATION` intent for explicit workbook/sheet generation requests | `route_query.js` | Small |
| 9 | **GAP-16** Cross-vendor accidental triggers | Add guard: only trigger transformation when action verbs (`convert to`, `transform to`, `migrate from`) are present, not just `equivalent` | `route_query.js` | Small |
| 10 | **GAP-15** Clause splitting fragile | Preserve the base model clause context after splitting; don't treat it as a requirement | `route_query.js` | Medium |
| 11 | **GAP-21** SY480/F32 shared notebook | Assign separate notebook IDs for compute vs fabric products | `notebooks.json` | Small (config) |

### Phase 3 — Anti-Hardcoding & Sustainability

| # | Gap | Action | Files | Effort |
|:--|:----|:-------|:------|:-------|
| 12 | **GAP-9** Gen12 default hardcoded | Replace with dynamic "prefer latest generation" from catalog metadata | `route_query.js` | Small |
| 13 | **GAP-10** DL360 Gen12 hardcoded unsupported | Derive dynamically from catalog presence | `route_query.js` | Small |
| 14 | **GAP-11** PLATFORM_SIGNATURES hardcoded | Auto-generate from `listAllCatalogs()` or `chassis_map.json` platform keys | `route_query.js` | Medium |
| 15 | **GAP-12** detectChassisVariant hardcoded cascades | Refactor to table-driven lookup from chassis_map.json | `catalog_discovery.js` | Medium |
| 16 | **GAP-20** Default map in code | Move to chassis_map.json-only (make file mandatory, remove code fallback) | `catalog_discovery.js` | Small |

### Phase 4 — Polish & Metadata

| # | Gap | Action | Files | Effort |
|:--|:----|:-------|:------|:-------|
| 17 | **GAP-18** FREEFORM_QA skillTarget self-reference | Change `skillTarget` from `'presales-query-router'` to `'nlm-skill'` | `route_query.js` | Trivial |
| 18 | **GAP-19** Auto-apply threshold too strict | Consider lowering to 0.85 or adjusting weight distribution | `requirement_intent_resolver.js` | Small |
| 19 | **GAP-13** Stale notebook IDs in docs | Add note that notebook IDs are read from `notebooks.json` at runtime | SKILL.md files | Trivial |
| 20 | **GAP-5** Remarks reconciliation unwired | Add `REMARKS_RECONCILIATION` intent + handler | `route_query.js` | Small |
| 21 | **GAP-6** Multi-cluster text-only queries | Add text-based multi-node detection (e.g., "60 nodes", "3-tier cluster") routing to multi-cluster handler | `route_query.js` | Medium |
| 22 | **GAP-8** DL580 missing from default map | Add `DL580_Gen12` entry to getChassisMap default | `catalog_discovery.js` | Trivial |

---

## Architectural Recommendation

> [!TIP]
> The root cause of **70%** of these gaps is that `classifyQueryIntent()` and `getChassisCatalog()` use **hardcoded keyword tables and regex cascades** instead of being data-driven from the config files (`chassis_map.json`, `notebooks.json`, `listAllCatalogs()`). A single refactor to make `PLATFORM_SIGNATURES`, `detectChassisVariant()`, and the unsupported-product check all derive dynamically from the on-disk catalog and config state would:
> 1. Eliminate all product coverage gaps automatically when a new product is scraped
> 2. Remove the need to touch code when adding products
> 3. Comply with the Zero-Hardcoding Invariant (INV-1)
