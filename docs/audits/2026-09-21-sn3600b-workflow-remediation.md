# SN3600B workflow remediation — 2026-09-21/22

Scope: R7R97A and the supplied Config2_SN3600B_FC_Switch_EVALUATED_BOQ.xlsx. Preserve the original workbook. Verification is syntax inspection, artifact inspection and canonical production workflow execution. The owner assigned test suites elsewhere; no new full-suite certification is claimed.

## Closure checklist

- [x] CDP profile discovery and authenticated Partner Portal/OCA recovery.
- [x] Distinguish valid OCAInternalLogin/External OCA from expired sessions; detect visible encountered-a-problem errors.
- [x] Restart through Partner Portal and One Config Advanced, with bounded recovery and a surviving portal tab.
- [x] Exact SKU search, classic search mode, delayed controls, foreground activation, saved credentials and secret-safe navigation labels.
- [x] Remove hardcoded credential and invented delivery estimate.
- [x] Extract owned table rows and iframe text; preserve visible menu prices before hidden tabs zero them; reject dates as prices.
- [x] Avoid changing hardware modes or service radio buttons during generic expansion.
- [x] Recognize fixed SAN switches and H-prefix physical transceivers correctly.
- [x] Refresh 158 catalog entries: 58 hardware and 100 service/software; canonical master workbook artifact audit passed.
- [x] Preserve official QuickSpecs evidence through staging promotion and verify its SHA-256 before applying bundle rules.
- [x] Model base and upgrade inclusions: 8 + 2 × 8 active ports and optics = 24.
- [x] Route fixed SAN appliances away from server CPU, memory, disk and riser additions.
- [x] Ignore worksheet title rows and retain allocation notes.
- [x] Remove standalone optics only for explicit local-port allocation; retain spare, replacement, remote and unspecified purposes.
- [x] Apply strict product scope to active knowledge routing.
- [x] Preserve service parent/suffix evidence; recognize abbreviated Inst/SVC rows when applying the explicit support override.
- [x] Bind service substitution to one exact base SKU/quantity and one icon; reject ambiguous mixed-icon propagation.
- [x] Correct unresolved-price labels, empty SAN exports, applicability labels and baseline-versus-corrected financial presentation.
- [x] Bind vendor acceptance to the exact complete SKU/quantity manifest; reject partial, stale, future-dated, malformed-price and mixed-icon receipts.
- [x] Preserve native structured NotebookLM validation prompts, including candidate JSON and allocation notes.
- [x] Use SAN-specific document review instead of server-only physical aspects.
- [x] Require native vendor citations outside JSON code blocks and one parsed verdict; do not turn prose-only PASS into grounded certification or call a real unverified response a mock.
- [x] Classify vetted vendor citations by source ID instead of rejecting vendor passages containing customer/quote terminology.
- [x] Use one scoped registry builder for both sync workflows; preserve three historical portal lessons in a durable delta source.
- [x] Record owner support, icon isolation and expired-session lessons through the continuous-learning API; all three are reachable by the active router.
- [x] Include dated vendor-qualified support observations in canonical NotebookLM sync, separately from customer inputs.
- [x] Export sync status after sync completes, avoiding permanently stale SYNC PENDING badges.
- [x] Verify native-citation review and exact five-line workbook manifest; retain the final trace and commit reviewed changes.

## Accepted vendor configuration

Live complete OCA/CLIC receipt captured 2026-09-22T07:58:17.037Z. CLIC overall OK with zero unbuildables, errors, warnings and process-control issues. Evidence is under outputs/SAN/FC/SN3600B_FC/evidence; the prior five-year Essential receipt is superseded.

| SKU | Quantity | Unit list USD | Extended USD |
|---|---:|---:|---:|
| R7R97A | 1 | 19,746 | 19,746 |
| R7M09A | 2 | 19,950 | 39,900 |
| QK735A | 8 | 195 | 1,560 |
| HX2M2E | 1 | 950 | 950 |
| U5988E | 1 | 480 | 480 |
| Total | | | 62,636 |

R6W26A was redundantly allocated to the eight active base ports, which already include optics. Two R7M09A kits supply the other sixteen licensed ports and optics. The eight requested cables are preserved; licensed port capacity does not invent endpoint demand.

HX2M2E is three-year Tech Care Basic **with CDMR**, not GMR. The live selector showed no plain three-year Basic option for this product. U5988E retains the requested installation. Both apply-to-all controls were off in the owning node's Components/Services editor.

Original customer estimates totalled USD 16,547; the standalone pack's estimated USD 2,800 is not a live savings quote. The final USD 62,636 is current captured OCA list pricing, including the requested support change, not a discounted partner quotation.

## Agent continuation contract

Use scripts/evaluators/eval_boq.js for this BOQ; do not write a bespoke evaluator. Exact command:

```powershell
node scripts/evaluators/eval_boq.js 'C:/Users/latha/Downloads/Config2_SN3600B_FC_Switch_EVALUATED_BOQ.xlsx' --sheet 'Evaluated BOQ' --chassis outputs/SAN/FC/SN3600B_FC --notebook-id d7f84352-1cdb-4842-84ca-39d2a10b91eb --support-default --output outputs/SAN/FC/SN3600B_FC/customer_evaluation.md
```

The support default is a commercial policy, not proof of compatibility. Every server/storage/networking product should attempt three-year Basic unless an explicit alternative exists. Obtain the exact product-qualified service through Components → owning icon → Services → Edit; keep both bulk-application controls off. Other products and mixed-icon solutions still need their own live evidence.

A changed manifest cannot reuse this CLIC receipt. The runtime accepts captured receipts for 24 hours, with BOM/check captures within fifteen minutes; later runs require fresh live evidence. Retained files document this historical acceptance after that period.

Notebook: d7f84352-1cdb-4842-84ca-39d2a10b91eb. Official QuickSpecs source: 41012991-4c8a-48d8-a024-bb6dc33f5037, a00000578enw V25, 16 February 2026. Source uploads use the configured CLI fallback when NotebookLM MCP is unavailable. Temporary candidate sources must always be detached. Customer tables are evaluation inputs, never vendor authority.

## Evidence limits and external conditions

The separate Gemini guardrail intermittently returned HTTP 503. That is degraded review evidence, not successful independent verification. NotebookLM source review and live CLIC acceptance have separate statuses. Native citations are mandatory before marking candidate document review verified.

Separate Google Drive running-knowledge sync was skipped because Google authentication was inactive. The local registry and product NotebookLM sync succeeded; Drive publication was not requested.

The pre-existing test_failure_ledger.json records another runner's four failures on 2026-09-21 (two assertions and two timeouts). Preserve that evidence; do not replace it with a green claim from syntax or production artifact checks.

Earlier provisional traces included a phantom title row, incomplete service handling or generic instead of candidate-specific NotebookLM prompts. They are historical diagnostics, not final certifications. The final trace and receipt must be consulted together.

## Final verification record

Canonical final trace: TRC-1790082194547-FF7ABF. All nine phases PASSED, evidence health COMPLETE with no gaps. The final candidate document review PASSED with 15 native citations and confirmed temporary-source detachment. The trace includes the service-qualification and phase-status fixes. The complete CLIC receipt was independently reread after tightening required headers, owner labels and displayed-total reconciliation: five rows, USD 62,636.

Reviewed 29 changed JavaScript files with node --check, parsed 29 changed/new JSON artifacts, and checked diffs (allowing intentional Markdown hard-break spaces). No test suites were run. The semantic code graph was refreshed. Browser profiles, authentication data, logs and partial capture scratch files are excluded from the commit. Pre-existing test/quarantine evidence is preserved.

Additional closure: verified live service rows no longer request clarification merely because they are absent from the main menu catalog. NOT_APPLICABLE checks are not failures; the baseline optics warning is explicitly linked to its receipt-backed corrected candidate. A provider error is reported as unavailable rather than a successful agentic review.
