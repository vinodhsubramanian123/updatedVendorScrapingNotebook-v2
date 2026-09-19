> **Closed 2026-09-19:** Antigravity completed validation and Codex matched the current source hashes to saved execution manifests. See [final review closure](2026-09-19-final-remediation-closure.md). Pending instructions below are historical.

# Codex remediation — Antigravity testing handoff

Date: 2026-09-19. Base HEAD: `79e6c12c49bdec7ec4d65e55c7e51f124ea65697`.

Implementation is uncommitted and **runtime validation is pending**. The user assigned testing to Antigravity. Codex performed source review and JavaScript syntax-only parsing, not tests, builds, evaluations, portal operations, notebook synchronization, or publication. Existing user edits, tests, catalogs, and historical artifacts were preserved. The original gap review remains a historical record, not a description of the final code.

The pre-edit hashes are in `2026-09-19-remediation-input-manifest.md`. Evidence produced by future runs now includes a source manifest covering tracked and untracked scripts, dashboard, tests, and package files. Match receipts to that manifest or the eventual commit; do not inherit the earlier 172-suite claim.

## Implementation decisions

The new orchestrator now adapts requests to `runEvaluationPipeline`, the existing production implementation. It no longer has its own invented ten-phase execution, implicit DL380 catalog, grounding placeholder, background adversarial call, or report writer. Existing CLI/router/dashboard paths retain the mature pipeline. Multi-cluster decomposition and provisional recomputation remain specialized operations; this change does not certify them as full customer delivery.

File and in-memory requests share ingestion, quantity normalization, catalog gates, grounded review, candidate validation, delivery, and failure evidence. In-memory requests record their original input plus SHA-256 in the ledger. A separately supplied server count must agree with the quantity context; no implicit base/total reinterpretation was added.

Final deterministic candidate revalidation runs after RAG-induced changes, once, with synthesis disabled. It includes graph validity and missing dependencies, rejects empty candidates, records the manifest, and preserves the existing recommendation filter. This is explicitly **not** a claim that automated mutation fuzzing was performed.

The parameterized equation helpers and vendor adapters are capability scaffolding. Unknown profile values, unsupported domains, and unimplemented portal extraction do not receive PASS. Factory-included defaults require a citation, exact base-SKU evidence, document hash, and page before they can justify removing a customer line. Previously added citation strings alone do not meet that gate. Obtaining authoritative hardware evidence belongs to Antigravity's validation, not to invented implementation defaults.

## F01–F22 disposition

| Finding | Final implementation disposition | Antigravity focus |
| --- | --- | --- |
| F01 | Real `entries[].skus` index retained; strict finite/nonnegative price parsing added | Real catalog resolution, explicit zero, malformed price |
| F02 | Keywords and specs filter candidates; FC protocol required; unresolved parts have no invented SKU; empty-SKU accessory matches removed | Wrong protocol/speed/role, absent preferred SKU, no-drive vs ordinary drive |
| F03 | No evidence-free generation score; removed DL384→DL380a alias; conflicting generations rejected; no arbitrary first-catalog fallback | Explicit context vs text, spacing/underscore aliases, ambiguous multi-platform queries |
| F04 | Duplicate orchestrator removed; input arrays retain ownership metadata; invalid quantities rejected; quantity-count mismatch rejected | File/text/items equivalence, parent/global quantities, uppercase XLSX |
| F05 | Canonical API delegates to real catalog/grounding gates; no implicit DL380 or fabricated grounding | Offline, cloud unavailable, wrong notebook, missing catalog |
| F06 | Background fuzz generator is absent from canonical execution | Assert no hidden generation call/telemetry mutation in offline evaluation |
| F07 | Duplicate pre-RAG check removed; final local validation records all candidates and manifest | Empty/invalid candidate, changed manifest, dependency/graph failures |
| F08 | Explicit phase registration, unique IDs/numbers, prerequisite enforcement, terminal-state checks, unknown/failing check handling | Missing/failed prerequisites, WARNED policy, NOT_REACHED, repeated starts/completions |
| F09 | Existing pipeline ledger reused; inline artifacts supported; report written before hash/seal; absent files fail delivery; finalization exceptions mark failure | Report write failure, missing workbook, seal failure, actual artifact hashes |
| F10 | Existing checker adapters retained; no invented 16-channel fallback; unknown domains/results do not pass | Checker arguments and all diagnostic flags; missing channel metadata is unevaluated |
| F11 | Prior `hasExplicitCpuCount` fix retained | Split CPU rows vs combined row and explicit count |
| F12 | Prior accessory/transceiver guards retained | Real catalog descriptions and downstream tally heuristics |
| F13 | One mature evaluation implementation; canonical API is an adapter, not a competing pipeline | Trace actual entry paths; keep specialized sizing/recompute outputs provisional |
| F14 | Integrity/freshness gates enforced during intake and certification; safe epoch parsing, invalid/future/critical dates blocked; duplicate prices checked | 30/90-day boundaries, malformed date/table/row, option suffixes, unknown price |
| F15 | Unsupported capabilities remain explicit; generic equation helpers require supplied limits and quantity ratios rather than guessed hardware constants | Unknown limits never pass; no claim of complete non-server topology validation |
| F16 | Normalizer preserves incoming metadata; rejects invalid quantities; non-USD values are not labelled USD; solution inference avoids treating every generic component as a server | Mixed solutions, EDSFF, vendor patterns, zero price, currency, row order |
| F17 | Explicit `priceDriftItems`/metadata input supported by production pipeline; receipts preserved; rejected/error outcomes counted; activation is not called synchronization | Quote hash/region/currency retained; quarantine not bypassed; no background auto-promotion from arbitrary customer prices |
| F18 | Requested missing/unknown/failed sync stays ACTION_REQUIRED; offline/unrequested remains SKIPPED; cloud success requires successful receipt status | Failed running-knowledge sync despite upload, local-only vs requested cloud |
| F19 | Citation-only defaults no longer justify redundancy advice; management NIC distinction retained | Supply and verify real document/page/base-SKU evidence before enabling defaults |
| F20 | Historical completion claims superseded by this handoff; source manifest includes untracked implementation; adapters expose extraction capability=false | Final complete worktree receipts and corrected test expectations |
| F21 | Prior OCR status/offline guards retained; missing crypto import repaired; OCR hash/model and human chassis selection recorded in intake evidence | Offline image/PDF, key missing, extraction failed, empty OCR, human choice |
| F22 | Checklist output uses logger routing; explicit SKIP/WARN respected; absent formulas say NOT_RECORDED; evidence export check uses actual path | JSON/progress streams, contradictory statuses, formulas vs actual operands |

## Required validation, owned by Antigravity

1. Inspect the final worktree and update the six new unit modules where they assert superseded behavior. In particular, the canonical orchestrator must not claim `success:true` for an offline ungrounded BOM; lifecycle dependencies must not silently proceed; unsupported profile checks must not use fabricated channel/cooling defaults. Do not weaken production gates to preserve these old assertions.
2. Run focused regression and negative-path cases for every row above. Use real catalog-shaped fixtures, isolated output/state directories, and controlled cloud fakes. Verify that unit evaluation cannot mutate live telemetry, pricing history, quarantine, or notebooks accidentally.
3. Exercise CLI, canonical API, routed evaluation, dashboard evaluation, and multi-cluster ownership boundaries. Verify customer requirements and quantities are preserved and every customer-facing recommendation corresponds to the final validated manifest.
4. Check report/workbook/CSV/portal artifacts and failure traces. Independently hash exported files and compare ledger receipts. A structurally healthy trace can correctly describe an INCOMPLETE workflow; offline mode must not become vendor acceptance.
5. Validate factory defaults against actual vendor documents/receipts. Add structured `evidence: { artifactSha256, page, baseSku }` only after checking the claim and variant. No hardware assertions were externally certified by Codex.
6. Validate price-drift inputs with official quote provenance and actual synchronization readback if requested. The new explicit input is not an automatic authorization to activate customer-claimed pricing as a physical rule.
7. Run the repository's required lint, complexity, build, and complete isolated test matrix after focused checks. Retain the full run receipt, exact suite list/count, final source manifest/commit, failures, and fixes. Refresh the graph after further implementation changes.
8. Return the final diff and evidence to Codex for re-review before check-in. Preserve historical failed/incomplete traces rather than repairing their recorded verdicts retrospectively.

## Handoff prompt

> Test the uncommitted remediation described in `docs/audits/2026-09-19-codex-remediation-testing-handoff.md`. Codex has made implementation fixes and syntax-parsed the changed implementation, but has not run tests. Use the F01–F22 matrix for focused negative cases, update stale tests to the documented contracts, then run required isolated regression/lint/build/complexity checks. Preserve existing work and historical artifacts. Tie every receipt to the final worktree manifest or commit, keep unsupported checks explicit, and retain PORTAL VALIDATION PENDING without a matching live vendor receipt. Return the diff and receipts to Codex for re-review.
