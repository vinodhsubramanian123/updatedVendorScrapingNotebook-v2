# Epistemic Truth, Deep Cognitive Reasoning & Anti-Pattern Prevention

This rule document governs all AI agents (Antigravity, Codex, Claude, subagents, and automated scripts) operating within the HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine repository. It codifies the deep cognitive lessons, architectural mistakes, and permanent guardrails established during the 2026-09-17 second-wave verification audit.

---

## 1. Core Cognitive Philosophy: Epistemic Non-Repudiation

1. **Truth Exists on Disk, Not in Memory**:
   - An in-memory JavaScript object returning `{ status: 'PASS' }` is merely a transient hypothesis.
   - Real, verifiable truth exists ONLY in persistent records on disk, verified by cryptographic SHA-256 content fingerprints, strict schema validation, and independent negative-path audits.
   - Never claim an evaluation, test, or sync passed without persistent, verifiable disk evidence.

2. **Adversarial Negative-Path Priority**:
   - Never test only the "happy path" and assume edge cases work.
   - Before certifying any feature, boundary checker, or pipeline stage, aggressively test negative inputs:
     - Null, undefined, empty string, or whitespace-only inputs.
     - Corrupt, truncated, or unmapped files.
     - Network drops, offline mode, rate-limit throttling (429), and permission locks (`EPERM`).
     - Zero or negative component quantities, unmapped chassis platforms, and self-referencing citations.
   - A failure MUST produce a clean, machine-parseable error trace with terminal phase records—NEVER an untracked crash, and NEVER a synthetic or fabricated pass.

3. **Four-Tier Epistemological Discipline**:
   - **Tier 0: Customer Input = Untrusted Claim**: Raw customer RFPs, quotes, and tenders inherently contain human errors, deprecated SKUs, missing cables, and invalid component ratios. They are strictly candidate inputs to be evaluated, never authoritative ground truth.
   - **Tier 1: Local Aspect Math = Pre-Flight Math Sanity Check**: The 7 deterministic aspect engines calculate physical, electrical, and thermal limits (TDP, memory channels, PCIe slots, power draw). This is a necessary mathematical pre-condition, but not an official vendor configurator acceptance.
   - **Tier 2: Grounded NotebookLM Review = Document Citation Check**: RAG queries against vendor QuickSpecs PDFs and live 22-sheet catalogs provide document-grounded verification. However, QuickSpecs do not prove live portal ordering availability or factory supply holds.
   - **Tier 3: Live OCA/CLIC Portal Response = Official Vendor Acceptance Receipt**: Only an authenticated transaction with the live HPE OCA / CLIC WebLogic runtime compiles a certified factory build.
   - **Rule**: Deliverables MUST label status as `PORTAL VALIDATION PENDING` until a live Tier 3 CLIC transaction occurs. Never conflate Tier 1 or Tier 2 with Tier 3.

4. **Root-Cause Architectural Remediation vs Shallow Symptom Patching**:
   - When a bug, audit finding, or test failure is identified, never apply a superficial patch that merely silences the specific failing assertion.
   - Trace the failure to its architectural root cause: Why did the schema allow this state? Why did the normalizer default to truthy? Why did the lifecycle exit prematurely?
   - Fix the underlying architectural contract across the entire subsystem and add automated boundary tests that prevent regression.

---

## 2. The 9 Past Anti-Patterns & Permanent Architectural Invariants

### Anti-Pattern 1: The "Default Success" Trap (Loose Truthiness)
- **The Mistake**: Code like `val !== false ? 'PASS' : 'FAIL'` or `if (aspectResult) passCount++`. When an aspect check was missing, undefined, or failed to run, the loose truthiness check evaluated it as `'PASS'`, turning absent checks into unearned 7/7 success badges.
- **The Invariant (`INV-106`)**: Normalizers and evaluators must NEVER use loose inequality checks. Absent or undefined data MUST evaluate strictly to `'UNKNOWN'` (or `'OPTIONAL'` for non-mandatory items like OCP adapters or Tech Care support). Zero default success.

### Anti-Pattern 2: The "Circular Authority" Trap (Self-Grounding Candidate Manifests)
- **The Mistake**: Uploading the candidate solution BOM to NotebookLM as an ephemeral source and including it in `authoritativeSourceIds`. The LLM cited the candidate BOM itself to "prove" that the proposed configuration was valid!
- **The Invariant (`INV-105`)**: Ephemeral candidate BOM sources are query inputs ONLY and must be strictly segregated from `authoritativeSourceIds`. Any citation that references the candidate source itself, or lacks verifiable vendor QuickSpecs provenance, MUST evaluate to `UNKNOWN` and cannot certify vendor grounding.

### Anti-Pattern 3: The "Premature Lifecycle Closure" Trap (Lifecycle Inversion)
- **The Mistake**: Calling `evidenceLedger.finalizeAndExport()` at the end of Phase 6 (Strategy Synthesis), before Phase 8 (Deliverable Generation) and Phase 9 (Continuous Learning Sync) completed.
- **The Invariant (`INV-104`)**: `finalizeAndExport()` MUST run strictly after Phase 8 and Phase 9 finish, or inside top-level terminal error handlers. Every phase (1 through 9) MUST record an unambiguous terminal status (`PASSED`, `FAILED`, `ACTION_REQUIRED`, `SKIPPED`, `NOT_REACHED`). No phase may remain `RUNNING` or `undefined`.

### Anti-Pattern 4: The "Destructive Cloud Sync" Trap (Blind Clear/Wipe Before Write)
- **The Mistake**: Using Google Sheets `values:batchClear` to wipe sheets clean before writing updated rows. If a network blip or rate limit occurred mid-write, the user lost all historical data.
- **The Invariant (`INV-108`)**: Cloud writes MUST use atomic in-place cell updates (`spreadsheets.batchUpdate` with `updateCells`) with zero destructive clearing, followed by mandatory `values:batchGet` readback verification comparing SHA-256 row fingerprints before declaring delivery complete.

### Anti-Pattern 5: The "Universal Rule Scope Pollution" Trap (Charter Poisoning)
- **The Mistake**: Allowing product-specific rules (e.g. DL380 Gen12 heatsink TDP thresholds or DL145 PCIe lane limits) to leak into `master_universal_knowledge_charter.md`.
- **The Invariant (`INV-109`)**: Universal knowledge charters MUST strictly exclude single-product rules, thresholds, and part numbers. Single-product rules must remain quarantined in `outputs/{Family}/{Gen}/{Model}/catalog_deltas.json` and `quarantined_deltas.json`.

### Anti-Pattern 6: The "Regex Metacharacter Explosion" Trap (Unsanitized Query Tokens)
- **The Mistake**: Passing raw markdown query text containing asterisks (`**`), backticks, or hashes directly into `new RegExp('\\b' + token + '\\b')`, causing V8 to throw `SyntaxError: Invalid regular expression: /\b**\b/i: Nothing to repeat`.
- **The Invariant (`INV-110`)**: All search and query tokenizers (e.g. `prepareSearchTerms` in `local_rag_search.js`) must strip markdown syntax and escape regex metacharacters (`replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) before constructing regular expressions.

### Anti-Pattern 7: The "Negative-Path Amnesia" Trap (Untracked Pre-Flight Crashes)
- **The Mistake**: When an early error occurred in `eval_boq.js` (unmapped chassis, missing file), the evaluator threw or exited without attaching `traceId` or `evidenceLogPath`, and left downstream phases undefined, producing corrupt/incomplete evidence logs.
- **The Invariant (`INV-111`)**: Pre-flight error handlers MUST generate and attach `traceId` and `evidenceLogPath`, mark all unreached downstream phases as `NOT_REACHED` with the upstream error detail, and emit them in machine-parseable JSON (`__EVAL_RESULT_JSON__{ status: 'ERROR', error: ..., data: { traceId, evidenceLogPath } }__EVAL_RESULT_JSON__`).

### Anti-Pattern 8: The "Stale Receipt" Trap (Manifest Fingerprint Drift)
- **The Mistake**: Reviewing Candidate 1 with an LLM, subsequently modifying a SKU or quantity in Candidate 1, and keeping the old review receipt attached to the modified manifest.
- **The Invariant (`INV-107`)**: Review receipts (`candidateReviewCurrent`) are cryptographically bound to the SHA-256 manifest hash (`solutionFingerprint`). Any alteration of a SKU or quantity immediately invalidates previous review receipts, withholding cloud delivery until re-verified.

### Anti-Pattern 9: The "Runtime Portability" Trap (V8 Heap & Windows File Locks)
- **The Mistake**: Assuming fixed memory behavior or POSIX filesystem semantics across environments.
- **The Invariant (`INV-103`)**: Node 24 allocates larger default V8 pages; fuzzing memory thresholds must be calibrated to runtime realities (e.g. 80 MB across 25 concurrent evaluations). Atomic filesystem operations in `fs_compat.js` MUST catch Windows `EPERM` locks and fall back to atomic copy-and-unlink (`copyFileSync` + `unlinkSync`).

### Anti-Pattern 10: The "Non-Existent Category Traversal" Trap (Catalog Schema Blindness)
- **The Mistake**: Assuming option catalogs store SKUs under `catalogData.categories`, looping over `Object.entries(categories)`. In HPE OCA scraped schemas, option tables are structured under `catalogData.entries[].skus[]`. Assuming `categories` caused catalog intelligence queries to return `liveDetails: null`.
- **The Invariant (`INV-112`)**: Never assume JSON schema property names from intuition. Inspect canonical schemas in `.agents/DATA_DICTIONARY.md` and live samples. Catalog SKU discovery MUST iterate over `catalogData.entries[].skus[]` extracting `parentCategory`, `subCategory`, `lifecycleStatus`, and `listPrice`.

### Anti-Pattern 11: The "Globalized History Path" Trap (Chassis History Partitioning)
- **The Mistake**: Searching for price histories at `outputs/history/price_history.json`. Historical price trails are scoped per chassis at `outputs/{Family}/{Gen}/{Model}/history/price_history.json`.
- **The Invariant (`INV-113`)**: Price history queries MUST resolve the target chassis directory dynamically via `catalog_discovery.js` and query the chassis-scoped `history/price_history.json` (and `services_history/services_price_history.json`).

### Anti-Pattern 12: The "Undeclared Scope Hazard" Trap (Strict Mode Inversion)
- **The Mistake**: Referencing `chassisInfo` in the primary `if (filePath)` branch of a `switch` block before declaring it in a subsequent `else if` branch. In `'use strict'`, this throws a runtime `ReferenceError`.
- **The Invariant (`INV-114`)**: In multi-branch dispatchers, always hoist catalog, context, and chassis resolution to the top of the case block before branching on file vs in-memory items.

### Anti-Pattern 13: The "Argument Position Rigidity" Trap (CLI Fragility)
- **The Mistake**: Treating `args[0]` as the input file path. When users or scripts placed flags like `--offline` or `--json` before the filename, `args[0]` evaluated to `--offline`, aborting execution with false "file not found" errors.
- **The Invariant (`INV-115`)**: CLI argument parsers MUST scan for non-flag tokens (skipping option values) or support explicit `--file <path>` to guarantee total position independence.

### Anti-Pattern 14: The "Truncated Evidence Lifecycle" Trap (Presales Sizing Gaps)
- **The Mistake**: Recording only phases 1-3 during quick RFP sizing, leaving phases 4-9 missing, omitting customer input fingerprints, and producing `healthy: false` evidence records.
- **The Invariant (`INV-116`)**: Every presales pipeline track that creates an `EvidenceLedger` MUST bring all 9 phases to a terminal status (`PASSED`, `ACTION_REQUIRED`, or `RESOLVED`), cryptographically fingerprint the customer input (text or file), and record all candidate SKUs in `skuAuditLedger`.

---

## 3. Mandatory Protocols for Autonomous Execution

1. **Zero Unearned Success Claims**:
   - Marketing strings like "100% Factory Buildable in CLIC" or "7/7 ASPECTS PASS" must NEVER be stamped statically in code or templates.
   - Every status claim MUST be dynamically derived from real evaluation receipts: `rank.evidence.allAspectsPass`, `rank.evidence.clicCertified`, `rank.evidence.groundedInQuickSpecs`.

2. **Zero Checkins / Commits Without Explicit Human Consent**:
   - AI agents MUST NOT execute `git commit`, `git add`, or `git push` unless explicitly instructed by the user.
   - When a milestone is completed, present the full verification evidence, test receipts, and diff summaries to the user, keeping the working tree clean and inspectable for independent 2nd-opinion reviews (Codex, Claude).

3. **Continuous Evidence Health Auditing**:
   - After any batch run or customer evaluation, run the reusable evidence health auditor:
     ```powershell
     node scripts/maintenance/audit_evidence_health.js --save
     ```
   - Verify that all active evidence logs report `healthy: true`, `gaps: []`, and `contradictions: 0`.

4. **Multi-Brain Collaborative Verification**:
   - **Antigravity / Gemini**: Lead Execution Architect & Orchestrator. Maintains CC $\le 135$ and 0-warning linter discipline.
   - **Gemini NotebookLM**: Authoritative Intent & Ground-Truth Brain grounded in QuickSpecs and live catalogs.
   - **OpenAI Codex / Claude**: Independent Verification & Adversarial Red-Teaming Auditors. Diff review, failure mode auditing, and assumption challenges.
