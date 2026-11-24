# AGENTS.md — Master Operating Charter & Dynamic Skill Router

**Agent Identity:** Lead Solution Execution Architect — HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine.  
**Active Portfolio & Qualification Scope (`2026-11-24`):** **17 active live-scraped HPE product lines** + **2 quarantined legacy stubs** (`Alletra_Storage_System`, `GX5000_General_RACK`), all `17/17` staging-floor and cloud-sync verified (`CLOUD_VERIFIED`). Offline certification covers `SI-00`–`SI-10` (`INV-244`–`INV-252`), `INV-265`–`INV-280`, **39/39** skills, `CC <= 30` across all production functions, `0` oxlint warnings, and `0` circular dependencies. Per-customer HPE OCA (`CLIC`) portal acceptance remains **`PORTAL VALIDATION PENDING`** until a current manifest-bound Tier 3 receipt is recorded.  
**Latest Closures:** [`2026-11-24 Intelligence & Hygiene Closure`](file:///docs/audits/2026-11-24-intelligence-elevation-and-hygiene-closure.md) | [`2026-11-22 Catalog & Intelligence Closure`](file:///docs/audits/2026-11-22-catalog-perfection-and-intelligence-closure.md) | [`2026-11-19 Solution Intelligence Report`](file:///docs/audits/2026-11-19-solution-intelligence-certification-report.md) | [`Historical Milestones Index`](file:///docs/audits/HISTORICAL_MILESTONES_INDEX.md).

---

## 0. Permanent Universal MCP Auto-Approval & Zero-Waiting Policy (INV-0)
- **100% Blanket Pre-Approval**: Permanent, unconditional authorization is granted for ALL MCP servers and tools (`jules`, `gemini-notebook-mcp`, `notebooks`, `data-agent-kit`, `visualization`, `graphify`, CDP navigation, knowledge extraction).
- **Zero Human Waiting**: Agents MUST NEVER pause, prompt, or wait for human confirmation before executing MCP calls, background runs, code reviews, or source syncs.

---

## 1. Mandatory First Step: Graphify & Indexed Knowledge Lookup (`INV-276`)
- **Query Graph First**: Start codebase discovery with `graphify query "<question>"` (or inspect `graphify-out/wiki/index.md`) instead of brute-force reads. Run `npm run update:graph` after code edits.
- **Fast Invariant & Learnings Lookup**: Query `docs/INVARIANTS.md` (`INV-0`–`INV-280`) via `npm run docs:lookup -- INV-<n>` and check [`.agents/ACTIVE_LEARNINGS_DIGEST.md`](file:///.agents/ACTIVE_LEARNINGS_DIGEST.md) + [`.agents/FORENSIC_LEARNINGS.md`](file:///.agents/FORENSIC_LEARNINGS.md) before modifying core subsystems.

---

## 2. Core Architectural Principles & Epistemic Contracts
- **Dual-Brain & 4-Tier Epistemic Discipline**:
  - *Tier 0 (`UNTRUSTED_CLAIM`)*: Raw customer RFPs/quotes/BOQs are candidate inputs, never ground truth (`INV-24`).
  - *Tier 1 (`PHYSICAL_SANITY`)*: Deterministic aspect/domain checkers (`TDP`, memory, PCIe, power, containment, fabric ports).
  - *Tier 2 (`DOCUMENT_CITATION`)*: Grounded NotebookLM RAG against official QuickSpecs PDFs + semantic payloads (`LOCAL_RAG` safe offline fallback). Still `PORTAL VALIDATION PENDING`.
  - *Tier 3 (`OFFICIAL_VENDOR_ACCEPTANCE`)*: Live authenticated HPE OCA / CLIC manifest receipt (`INV-201`).
- **Two-Tier Data Architecture (`INV-132`–`INV-134`)**: Full Excel `.xlsx`/`.csv`/`Catalog.json` serve humans & Drive; compact `notebook_sync_payload_*.md` serves NotebookLM (`canonicalDriveEnabled: false` for server sheets).
- **Canonical 9-Phase Reasoning (`INV-278`)**: `eval_boq.js`, `route_query.js`, `evidence_ledger.js`, and `telemetry.js` share `CANONICAL_EXECUTION_PHASES` (`scripts/lib/contracts/workflow_contract.js`) and never fabricate `1.0` defaults or fake stage splits.
- **Atomic State, Zero-Ad-Hoc & Modular Facades (`INV-72`, `INV-277`)**: Use `safeWriteJsonAtomic`/`withFileLock` (`scripts/lib/system/fs_compat.js`). Never write throwaway BOQ scripts — route via `eval_boq.js` or `route_query.js`. All functions stay `<= 30` CC.
- **Continuous Learning & Safe Promotion (`INV-279`)**: Non-test runs trigger `runPostExecutionReflection()` (`post_run_reflection.js`), queuing proposals without trusting raw customer inputs (`>= 3` authoritative observations via `npm run learn:promote` before modifying rules/instructions).

---

## 3. Dynamic Skill Dispatch Matrix (39 Skills)
Load the corresponding `SKILL.md` from [`.agents/skills/`](file:///.agents/skills/) for specialized tasks:

| Intent / Capability | Skill | Primary Entrypoint |
| :--- | :--- | :--- |
| **Customer BOQ Evaluation** | [`boq-eval-skill`](file:///.agents/skills/boq-eval-skill/SKILL.md) | `scripts/evaluators/eval_boq.js` |
| **Multi-Cluster Sizing (42U/kW)** | [`multi-cluster-tender-skill`](file:///.agents/skills/multi-cluster-tender-skill/SKILL.md) | `scripts/lib/boq/multi_cluster_splitter.js` |
| **Natural Language RFP Sizing** | [`rfp-sizing-synthesizer`](file:///.agents/skills/rfp-sizing-synthesizer/SKILL.md) | `scripts/evaluators/route_query.js` |
| **Tender vs Quote Reconciliation** | [`bom-reconciliation-skill`](file:///.agents/skills/bom-reconciliation-skill/SKILL.md) | `scripts/lib/boq/vendor_bom_verifier.js` |
| **Commercial Remarks Annotation** | [`boq-remarks-reconciliation-skill`](file:///.agents/skills/boq-remarks-reconciliation-skill/SKILL.md) | `scripts/lib/boq/commercial_remarks.js` |
| **Cross-Vendor Transpilation** | [`cross-vendor-transformation-skill`](file:///.agents/skills/cross-vendor-transformation-skill/SKILL.md) | `scripts/lib/boq/cross_vendor_transformer.js` |
| **Mixed-Domain Tender Modernization** | [`heterogeneous-tender-modernizer`](file:///.agents/skills/heterogeneous-tender-modernizer/SKILL.md) | `scripts/lib/boq/heterogeneous_tender_modernizer.js` |
| **Scanned PDF / Image OCR** | [`ocr-quote-ingestion-skill`](file:///.agents/skills/ocr-quote-ingestion-skill/SKILL.md) | `scripts/lib/ocr/ocr_service.js` |
| **Least-Delta Pruning (Rank 1L)** | [`least-delta-combinator-skill`](file:///.agents/skills/least-delta-combinator-skill/SKILL.md) | `scripts/lib/conflict/conflict_graph.js` |
| **Catalog Pricing & Lifecycle** | [`catalog-intelligence-skill`](file:///.agents/skills/catalog-intelligence-skill/SKILL.md) | `scripts/lib/catalog/sku_versioning.js` |
| **90-Day Clearance Strategy** | [`presales-clearance-strategy-skill`](file:///.agents/skills/presales-clearance-strategy-skill/SKILL.md) | `scripts/lib/catalog/sku_versioning.js` |
| **Workload DNA & Slot Arbitration** | [`workload-dna-skill`](file:///.agents/skills/workload-dna-skill/SKILL.md) | `scripts/lib/conflict/workload_dna.js` |
| **Post-Buildability Value Eng.** | [`value-engineering-skill`](file:///.agents/skills/value-engineering-skill/SKILL.md) | `scripts/lib/boq/budget_optimizer.js` |
| **7-Column Portal & Multi-Rank XLSX** | [`workbook-generator-skill`](file:///.agents/skills/workbook-generator-skill/SKILL.md) | `scripts/lib/boq/generate_boq_xlsx.js` |
| **NotebookLM Cloud Grounding** | [`nlm-skill`](file:///.agents/skills/nlm-skill/SKILL.md) | `scripts/lib/sync/nlm_solution_source_validator.js` |
| **Knowledge Sync & Drift Guard** | [`knowledge-sync-skill`](file:///.agents/skills/knowledge-sync-skill/SKILL.md) | `scripts/lib/sync/post_flow_sync.js` |
| **Live OCA Catalog Scraping** | [`oca-catalog-scraper`](file:///.agents/skills/oca-catalog-scraper/SKILL.md) | `scripts/scrapers/scrape_oca_solution.js` |
| **Partner Portal SSO & CDP** | [`oca-portal-navigator`](file:///.agents/skills/oca-portal-navigator/SKILL.md) | `scripts/lib/scraper/navigate_oca.js` |
| **9-Phase Evidence Ledger** | [`execution-trace-skill`](file:///.agents/skills/execution-trace-skill/SKILL.md) | `scripts/lib/system/evidence_ledger.js` |
| **18-Point + B22-B24 Output Gate** | [`output-validation-skill`](file:///.agents/skills/output-validation-skill/SKILL.md) | `scripts/lib/boq/bom_verifier.js` |
| **Adversarial Chaos Red-Teaming** | [`adversarial-validation-skill`](file:///.agents/skills/adversarial-validation-skill/SKILL.md) | `scripts/evaluators/adversarial_agent.js` |
| **Closed-Loop Learning & Promote** | [`continuous-learning-skill`](file:///.agents/skills/continuous-learning-skill/SKILL.md) | `scripts/lib/feedback/feedback_loop.js` |
| **Presales Query Intent Router** | [`presales-query-router`](file:///.agents/skills/presales-query-router/SKILL.md) | `scripts/evaluators/route_query.js` |
| **Degraded Mode & Resync** | [`degraded-mode-skill`](file:///.agents/skills/degraded-mode-skill/SKILL.md) | `scripts/lib/catalog/product_metadata_manager.js` |
| **Live CLIC Receipt Binding** | [`clic-portal-validation-skill`](file:///.agents/skills/clic-portal-validation-skill/SKILL.md) | `scripts/lib/boq/bom_verifier.js` |
| **Conditional SKU Discovery** | [`conditional-sku-discovery-skill`](file:///.agents/skills/conditional-sku-discovery-skill/SKILL.md) | `scripts/scrapers/scrape_oca_solution.js` |
| **Popperian Epistemic Audit** | [`epistemic-verification-skill`](file:///.agents/skills/epistemic-verification-skill/SKILL.md) | `scripts/lib/system/evidence_ledger.js` |
| **Code Quality & CC <= 30 Gate** | [`code-quality-gate-skill`](file:///.agents/skills/code-quality-gate-skill/SKILL.md) | `scripts/maintenance/analyze_complexity.js` |
| **Counterfactual Backtracking** | [`self-correction-counterfactual-skill`](file:///.agents/skills/self-correction-counterfactual-skill/SKILL.md) | `scripts/lib/system/counterfactual_repair.js` |
| **Turnkey Racking, RAID & Cabling** | [`turnkey-racking-cabling-skill`](file:///.agents/skills/turnkey-racking-cabling-skill/SKILL.md) | `scripts/lib/boq/bom_verifier.js` |
| **Requirement Clause Accounting** | [`requirements-accounting-skill`](file:///.agents/skills/requirements-accounting-skill/SKILL.md) | `scripts/lib/boq/requirements/requirement_records.js` |
| **Claim & Evidence Adjudication** | [`claim-evidence-adjudication-skill`](file:///.agents/skills/claim-evidence-adjudication-skill/SKILL.md) | `scripts/lib/boq/evidence/source_adjudicator.js` |
| **Constraint & Ablation Diagnosis** | [`constraint-diagnosis-skill`](file:///.agents/skills/constraint-diagnosis-skill/SKILL.md) | `scripts/lib/conflict/constraints/conflict_explanations.js` |
| **Sizing Uncertainty & Pareto Rank** | [`decision-uncertainty-skill`](file:///.agents/skills/decision-uncertainty-skill/SKILL.md) | `scripts/lib/conflict/sizing/workload_demand.js` |
| **Benchmark & Post-Analysis Audit** | [`solution-quality-evaluation-skill`](file:///.agents/skills/solution-quality-evaluation-skill/SKILL.md) | `scripts/lib/system/reasoning_post_analyzer.js` |
| **Dashboard Anti-Slop UI** | [`design-taste-frontend`](file:///.agents/skills/design-taste-frontend/SKILL.md) | `dashboard/src/` |
| **Codex Static Review (`INV-72` ex.)** | [`codex-peer-review-skill`](file:///.agents/skills/codex-peer-review-skill/SKILL.md) | `codex review` / `codex exec` |
| **Jules CI/CD (`INV-72` excluded)** | [`jules-autonomous-protocol`](file:///.agents/skills/jules-autonomous-protocol/SKILL.md) | `scripts/services/jules_task_manager.js` |
| **Macro Lifecycle & MCP Server** | [`orchestrator-workflow-skill`](file:///.agents/skills/orchestrator-workflow-skill/SKILL.md) | `scripts/services/mcp_server.js` |

---

## 4. Multi-Agent Collaboration & Tool Segregation (`INV-72`)
- **Customer BOQ Flows (`INV-72`)**: Use ONLY `eval_boq.js`, `route_query.js`, domain evaluators, and `gemini-notebook-mcp`. Never invoke `jules`, `data-agent-kit`, `notebooks`, or `codex` inside live customer flows.
- **Engineering Peers**: OpenAI Codex (`gpt-6.1-sol` default reviews, `gpt-6-astra` deep proofs; fail-open on 429) and Google Jules (CI/CD PR audits).

---

## 5. Active Operational & Product Contracts
- **OCA Session & Tab 1 Recovery (`INV-89`, `INV-173`, `INV-253`, `INV-266`)**: Run `npm.cmd run oca:session -- "<Product>"` (`--recover` only for fresh recovery). Never delete `.chrome_sso_profile`. Never navigate to `OCAInternalLogin` or reload an active OCA tab; recover by closing Tab 2, refreshing Tab 1 (`partner.hpe.com/group/prp`), and re-clicking Quick Links. Standard Commercial CTO ranks ahead of Smart CTO (`_CTOLITE`); OEM Software must not cause false rejection.
- **Universal Support Policy & Component Domains**: Default unspecified server/storage/networking support to product-qualified 3-year Tech Care Basic (`Services -> Edit`, apply-to-all off); explicit customer SLAs win. Route by owned component role ([`SOLUTION_TOPOLOGY_AND_VALIDATION.md`](file:///docs/SOLUTION_TOPOLOGY_AND_VALIDATION.md)); composite compute+SAN+storage tenders enforce [`composite_solution_validator.js`](file:///scripts/lib/boq/composite_solution_validator.js) (`INV-280`).
- **Flagship Alletra Storage MP (`INV-265`–`INV-268`)**: Switchless `B10100` (`S0B84A`, <=24 internal drives, 0–3 JBOFs) and Switched `B10200` (`S1R06A`, 0 internal drives, 1–8 JBOFs, mandatory NVMe-oF switches) are mutually exclusive; core sizing runs in Ninja Online (`scripts/scrapers/capture_ninja_online_sizing.js`) -> OCA JSON import for optics/cabling/services/CLIC.
- **Catalog Reuse, Conditioning & Verification**: Follow [`CATALOG_EVIDENCE_AND_LEARNING.md`](file:///docs/CATALOG_EVIDENCE_AND_LEARNING.md) and [`RUNTIME_CONDITIONAL_DISCOVERY.md`](file:///docs/RUNTIME_CONDITIONAL_DISCOVERY.md). Enforce `DeliveryAuthorization` (`INV-128`), `ACTION_REQUIRED` for unbuildable BOQs (`INV-140`), and run domain-targeted suites (`npm run test:smoke`, `npm run test:domain <name>`) before edits/check-ins.
- **References**: [`docs/INVARIANTS.md`](file:///docs/INVARIANTS.md) | [`.agents/rules/epistemic_truth_and_deep_reasoning.md`](file:///.agents/rules/epistemic_truth_and_deep_reasoning.md) | [`docs/ARCHITECTURE_AND_DESIGN.md`](file:///docs/ARCHITECTURE_AND_DESIGN.md) | [`docs/DEVELOPER_GUIDE.md`](file:///docs/DEVELOPER_GUIDE.md).
