# Agent Skills Hardening, Modularization & Epistemic Elevation Audit

**Date:** 2026-11-07  
**Scope:** Whole-Repository Agent Skills (`.agents/skills/`), Operational Normative Standards, Query Routing, and Epistemic Truth  
**Author:** Antigravity (Lead Solution Execution Architect)  
**Status:** **CERTIFIED COMPLETE & VERIFIED**

---

## 1. Executive Summary & Rationale

In response to deep architectural reviews and continuous presales optimization, a comprehensive audit was executed across all skills in `.agents/skills/`, subagent prompt contracts, and master system charters (`AGENTS.md`, `GEMINI.md`, `.agents/AGENTS.md`).

Prior to this intervention:
1. **Linguistic Ambiguity & Hedge Words**: Over 45 occurrences of ambiguous terms (*"appropriate"*, *"as needed"*, *"etc."*, *"consider"*, *"typically"*, *"usually"*, *"generally"*, *"if possible"*, *"try to"*) introduced non-deterministic branching, prompt hesitation, and unbounded retry loops in automated agents.
2. **Context Window Token Bloat**: Three monolithic skills (`boq-eval-skill` at 57 KB, `nlm-skill` at 51 KB, and `orchestrator-workflow-skill` at 44 KB) exhausted agent context windows upon dynamic injection, risking truncation and guardrail failure.
3. **Missing Specialized Capabilities**: Four critical architectural workflows codified in recent invariants (`INV-179`, `INV-201`, `INV-202`, `INV-215`, `INV-228`, `INV-229`, `INV-230`) lacked dedicated skill entry points.
4. **Charter & Benchmark Staleness**: `AGENTS.md` and `GEMINI.md` contained stale references citing "$CC \le 135$" and "249 suites", conflicting with the certified whole-repository global ceiling of **$CC \le 30$** (INV-229/230) and domain-segregated test matrices.

---

## 2. Core Remediations & Architectural Deliverables

### A. Normative Language Standard (`.agents/rules/normative_language.md`)
Established a binding RFC-2119 precision charter:
- Standardized strict definitions for `MUST`, `MUST NOT`, `SHALL`, `SHOULD`, and `MAY`.
- Explicitly banned 8 operational hedge words in procedural directives.
- Codified standardized `HALT-<PREFIX><NUM>` condition syntax with mandatory error codes and deterministic remediations across all skills.
- Mandated terminal phase execution states (`PASSED`, `FAILED`, `ACTION_REQUIRED`, `SKIPPED`, `NOT_REACHED`), strictly prohibiting `RUNNING` or `undefined` upon completion.
- Reconciled upfront ambiguity triage (`INV-73` vs `INV-98`): clarify critical structural ambiguities ($\text{confidence} < 0.95$) in the initial turn, otherwise execute autonomously.

### B. Modularization of 3 Monolithic Skills
Conserved over **120 KB** of dynamic context window space by splitting monolithic files into compact execution charters ($\le 250$ lines) and structured reference files:
1. **`boq-eval-skill`**:
   - `SKILL.md`: Reduced from 57 KB (504 lines) to ~110 lines focused on the 8 atomic steps, 7 aspect checks, 5-tier strategy ranking, and pre-presentation gates.
   - `references/boq_invariants_and_rules.md`: Comprehensive reference of physical invariants (`INV-24` to `INV-111`).
   - `references/platform_quirks_and_gotchas.md`: Detailed platform notes on memory interleaving, PCIe risers, and GPU power.
2. **`nlm-skill`**:
   - `SKILL.md`: Reduced from 51 KB (1,011 lines) to ~100 lines focused on MCP pre-authorization, dedicated OpenClaw port 18801 auto-healing (`INV-181`, `INV-227`), HPE Presales RAG Quality Gate, ephemeral solution sheet validation (`INV-24`), and local RAG fallback.
   - `references/nlm_cli_and_studio_reference.md`: Preserved 780 lines of CLI and Studio documentation for audio podcasts, quizzes, flashcards, mind maps, infographics, and batch pipelines.
3. **`orchestrator-workflow-skill`**:
   - `SKILL.md`: Streamlined to 6-stage continuous learning lifecycle, failure ledger recording, and multi-agent delegation.
   - `references/macro_lifecycle_and_invariants.md`: 120-invariant reference catalog and lifecycle contracts.

### C. Creation of 4 New Specialized Skills (Expanding Registry to 34 Skills)
1. **`code-quality-gate-skill`**:
   - Enforces universal $CC \le 30$ ceiling (`scripts/maintenance/analyze_complexity.js`, `INV-229`, `INV-230`).
   - Asserts 0 oxlint warnings/errors across 565+ files and clean DAG (0 circular dependencies).
   - Validates non-empty test matrix discovery (`INV-129`, `INV-218`) and clean failure ledgers.
2. **`self-correction-counterfactual-skill`**:
   - Governs autonomous backtracking search and minimum mutation set derivation (`INV-202`, `INV-215`).
   - Eliminates oscillation through deterministic candidate configuration hashing.
   - Mandates serializing the standardized 5-step numbered reasoning narrative (`INV-191`).
3. **`presales-clearance-strategy-skill`**:
   - Implements dual-track 90-day clearance vs. active production baseline strategy (`INV-179`).
   - Captures up to 70% vendor discounts for cost-sensitive tenders with mandatory disclaimer watermarks and production backups.
4. **`turnkey-racking-cabling-skill`**:
   - Turnkey physical racking, rail kit validation (`P69770-B21` / `P52341-B21`), and optical transceiver matching (`845398-B21`).
   - Multi-drive NVMe factory RAID transpilation to `389692-B21` and NS204i-u boot decoupling (`INV-228`, `INV-206`, `INV-208`, `INV-210`, `INV-214`).

### D. Hardening & Invariant Upgrades Across Existing Skills
- **`clic-portal-validation-skill`**: Added `INV-201` (Gate B19 cryptographic receipt matching), `HALT-CLIC1` to `HALT-CLIC3`, and eliminated loose warning acceptance wording.
- **`cross-vendor-transformation-skill`**: Added `INV-190` (competitor ingress), `INV-216` (InfiniBand vs. RoCEv2 parity), and `INV-228`.
- **`epistemic-verification-skill`**: Updated stale $CC \le 135$ to $CC \le 30$, added `INV-104` to `INV-111`, `INV-191`, `INV-202`, `INV-215`, and `HALT-EPI1`.
- **`output-validation-skill`**: Replaced unbounded "SHOULD attempt" with bounded `MAX_REMEDIATION_ATTEMPTS = 3` sequence and terminal error code `ERR_PRE_PRESENTATION_GATE_FAILED`.
- **`rfp-sizing-synthesizer`**: Replaced ambiguous WARNs with strict deterministic directives (PSU escalation, secondary heatsink mandate).
- **`value-engineering-skill`**: Added `HALT-VE1` enforcing execution strictly AFTER 100% buildability is confirmed (`INV-75`).
- **`presales-query-router`**: Reconciled zero prompting with upfront ambiguity triage; registered all 34 skills.
- **Deduplication**: Replaced redundant 15-line runtime discovery paragraph across 6 skills with clean links to `docs/RUNTIME_CONDITIONAL_DISCOVERY.md`.

### E. Charters & Guidelines Synchronization
- **`AGENTS.md`**: Upgraded line 91 to $CC \le 30$ global ceiling; added all 4 new skills to the Dynamic Skill Dispatch Matrix; updated invariant range to `INV-1 through INV-230`.
- **`GEMINI.md`**: Upgraded line 65 to $CC \le 30$.
- **`.agents/AGENTS.md`**: Updated skills count to 34 and linked to `normative_language.md`.
- **`scripts/evaluators/route_query.js`**: Registered explicit tracks and keyword rules for all 4 new skills.

---

## 3. Automated Validation & Verification Matrix

| Verification Check | Script / Command | Status | Result / Detail |
| :--- | :--- | :---: | :--- |
| **Skills Integrity & Quality** | `npm run test:skills` | **PASS** | 34/34 skills valid, 0 link errors, 0 banned words, 1,910 verified SKUs |
| **Presales Intent Router** | `node --test tests/unit/test_query_router.js` | **PASS** | 16/16 tests passed (100%), all specialized skill tracks & collision cases verified |
| **Fast Smoke Suite** | `npm run test:smoke` | **PASS** | 8/8 suites passed (100%), failure ledger clear |
| **Cyclomatic Complexity** | `npm run lint:complexity` | **PASS** | 387 files, 3,079 functions, 0 functions $>30$ CC (100% compliant) |
| **Core Oxlint** | `npm run lint:core` | **PASS** | 567 files, 95 rules, 0 warnings, 0 errors |
| **Circular Dependencies** | `npm run test:circular` | **PASS** | 692 files scanned, clean DAG, 0 circular dependencies |
| **Continuous Learning Sync** | `node scripts/maintenance/record_skills_and_reasoning_learnings.js` | **PASS** | Deltas recorded and certified reachable across DL380_Gen12 & DL380a_Gen12 |

---

## 4. Certification Statement
The skills architecture, operational charters, and intent dispatch pathways are certified at **100.0% COMPLIANCE** with zero loose wording, zero circular dependencies, zero lint warnings, and whole-repository cyclomatic complexity $\le 30$.
