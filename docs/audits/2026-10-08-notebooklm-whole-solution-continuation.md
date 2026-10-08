# NotebookLM long-running whole-solution acceptance

User requirement recorded 8 October 2026. This extends the existing CP11 execution, CP10 candidate scrutiny and CP12 learning acceptance gates; it does not replace the remaining excellence plan or create a new completion denominator.

## Required behavior

- Keep one complete current solution manifest in the acceptance request, including chassis, CPU, RAM, quantities, ownership, node multipliers, support policy and cross-component dependencies. Individual SKU investigations are supporting evidence, never whole-solution acceptance. Separate candidate ranks must each have explicit complete coverage.
- Preserve explicit customer requirements. Prioritize chassis, CPU, RAM and quantities in candidate comparison, with explainable exceptions for incompatibility, discontinued or nearing-expiry products and excessive dependent SKU changes. Document evidence and customer tradeoffs; do not invent numerical weights without acceptance criteria.
- Support slow heavy-notebook queries, including ten-minute responses, through explicit configurable deadlines and observable pending state. Separate client observation timeout, local process exit, remote completion and grounded validation. Never turn a missing result into PASS.
- Collect and persist the actual answer, native authoritative citations, manifest fingerprint, notebook/source identities and final execution state. Recovery must identify the original request where supported; a fresh query is a new attempt, not polling the old one.
- For oversized requests, use a verified supported full-manifest source and a concise bound query. Do not silently truncate, split stateless partial requests or upload a source while still duplicating the oversized manifest inline. Verify current source-format support; Google Sheets support is not established by the user's suggested mechanism.
- Cleanup must respect unresolved remote execution and preserve recoverable source-attempt identities. Local timeout does not prove remote cancellation. Retries, cancellation, source cleanup and cache reuse must preserve scope and evidence.
- Learn only from eligible grounded evidence; demonstrate next-run consumption and non-trigger/wrong-scope controls. Document and test the actual agent/MCP/canonical paths, not just an unused helper.

## Confirmed local inspection findings

1. `notebook_query_utils.js` defaults synchronous queries to 120 seconds; `nlm_solution_source_validator.js` explicitly supplies 120 seconds. Dashboard async jobs default to 600 seconds. The existence of that async path does not establish its use by MCP or canonical validation.
2. `job_manager.js` status polling can mark a job FAILED on deadline without aborting its controller. Its completion handler protects CANCELLED only, allowing a late answer to overwrite FAILED. A bounded isolated correction is assigned; acceptance pending.
3. The whole-solution validator attaches CSV but also includes baseline and all candidate JSON inline. Its query options omit cancellation propagation. Attachment is a synchronous 45-second operation; unknown source identity after an ambiguous attachment failure needs recovery handling.
4. General query sanitation can reconstruct or shorten prompts to SKU lists. Structured validation bypasses this, but every solution-level ingress must prove it reaches that contract with quantities and ownership intact.
5. The installed `nlm notebook query --help` exposes timeout, source IDs, new conversation and conversation ID. `nlm chats --help` exposes list/get/export/to-note. No remote query-job polling command is exposed by those help surfaces. Existing local resume dispatches another query; it is not verified remote resumption.

## Acceptance and validation sequence

1. Independently audit reachable MCP, dashboard and canonical consumers; preserve exact line references and existing test coverage.
2. Correct terminal-state races in isolation and independently review before integration.
3. Implement one shared deadline/cancellation/result-recovery contract with bounded retries and explicit ambiguous remote state; qualify a delayed response using virtual time rather than repeated ten-minute tests.
4. Qualify full-source transport with a deliberately oversized manifest, exact quantities/ownership and official citation checks. Test source attach ambiguity, query cancellation, cleanup failure and cache invalidation after any manifest change.
5. Test delayed success, no response, transient failure, restart, concurrent consumers and late responses. Whole-solution negative control must reject individually plausible SKUs that violate a joint constraint.
6. Update skill instructions, routing declarations, telemetry and learning consumption only around implemented, source-bound behavior. Disclose live cloud acceptance separately; this audit performs no live source mutation.

Status revision5.32: narrow terminal-state fix integrated and independently checked; broader long-call/whole-source transport still pending. No cloud validation claimed.

Independent NotebookLM audit is archived under `outputs/history/skill_workflow_excellence/2026-10-08/session-5.29/notebook-independent-audit.json`. The narrow terminal-state correction is independently accepted in isolation: ten root checks pass; exact old-source controls give five failures and five passes. Source-bound receipt: `session-5.29/notebook-timeout-author/receipts/root-independent-review.json`. Subsequent integration receipt `2026-10-08/notebook-timeout-integration/integration-receipt.json` records 10 main checks, 8 existing consumer checks and 2 real-disk checks, with exact two-file delta and zero protected changes. This does not close the broader long-call contract.

## Live scraping and inbound knowledge additions

The user additionally requires long-running product capture to retain progress and session health. Audit inactivity versus absolute deadlines, bounded CDP command timeouts, target/frame ownership, iframe-local messages, visible authenticated session evidence, keep-alive prompts and recovery. An unrelated or stale frame message must not classify the current product session as failed. Session recovery must preserve capture completeness/provenance or explicitly restart an invalidated capture; a long wall-clock duration is not sufficient to fail or certify it. Existing modal/session helpers are present, but their invocation cadence and frame coverage are not yet qualified by this audit.

NotebookLM can contain lessons added outside the local system. Qualify an inbound synchronization path with source/citation identity, product/version/scope, freshness, conflict handling, quarantine and demonstrated local consumption. Do not treat notebook prose or customer inputs as verified deterministic rules. Preserve candidate branch lineage and inherited constraints when cloud advice opens close alternative paths. Bound and deduplicate exploration; every final rank still requires complete whole-manifest validation. Test that a cloud-only eligible lesson changes the intended next local run, and that wrong-scope, unsupported or stale advice does not.

These additions map to existing CP11 execution, CP12 learning, catalog/scraping coverage and CP10 candidate-selection gates. No new completion scopes are counted.

Independent read-only scraping audit: `session-5.29/scraping-independent-audit.json`, four exact source hashes. Confirmed source gaps: capture does not call session-extension helper periodically; extension/confirmation actions and session classification use inconsistent frame/visibility scope; a per-command45-second deadline can be exceeded by31 sequential1.5-second tab actions while browser work continues after local timeout; broad recovery and reused discovery timestamps need provenance qualification. Unrelated help text causing false session-expiry classification is a hypothesis requiring a DOM fixture, not a reproduced live failure. No browser mutation or catalog-certification bypass is claimed.


Inbound audit (revision5.32): `2026-10-08/parent-cooperative-independent/inbound-learning-readonly-audit.json`. Six production hashes bind the read-only assessment. Local-to-cloud publishing and cited answer extraction exist; default extracted lessons stay quarantined at confidence0.70. Local rules can be loaded next run and promoted rules can trigger recomputation. No direct notebook lesson-change pull, revision cursor or enforced freshness envelope was demonstrated. Acceptance still requires notebook-only eligible lesson → governed local record → actual next-run consumption, plus wrong-scope/stale controls.


Revision5.34: whole-manifest caller/validator/query utility signal and absolute retry deadline authored14/14 in isolatedTemp/codex-whole-manifest-cancellation-author-20261008; independent review quota-interrupted, not accepted/integrated. Existing45s synchronous attachment and20s cleanup remain outside query budget. Current main3directpreimages match after upstreamauthcommit; imported diagnostics/currentnlmskill must be included at composition. Upstream source identities/catalogs changed deliberately on8October; no old NotebookLM source IDs are current by assumption. See new grounding audit and sync-reconciliation manifest. Source attach ambiguity/full-source prompt/remote result recovery/inboundlearning still open.


Revision5.35 supersedes pending independent review: whole-manifest14author+3independent checks accepted isolated; archive `2026-10-08/whole-manifest-independent/root-readback.json`. Fresh canonical-owner/latest-source composition active. Scope remains query/retrybudget; sourceattachment/cleanup/restart/remotecompletion/fullsourceoversize and inboundlearning gates are still incomplete.
