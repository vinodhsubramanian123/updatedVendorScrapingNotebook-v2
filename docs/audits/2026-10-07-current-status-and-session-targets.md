# Current execution status and restart instructions

Updated 9 October 2026, revision 5.43. This is the current snapshot; historical sessions and receipts remain in the checkpoint ledger.

## Saved and usable on local main

Verified runtime fixes are committed on local main, with no outstanding working-tree changes at the start of this handoff. Latest verified runtime commits: db32541 (query choice) and3c5e18b (pricing presence). Local main was nine commits ahead of the last fetched origin/main (7ac4baf) at the final runtime verification; no push has been performed. A local commit protects work from ordinary session/context loss, but is not an off-machine backup.

| Delivery | Commit | Evidence and limits |
| --- | --- | --- |
| Dashboard cancellation envelopes | c7c4dd8 | Independent Agy reviews; 19 frontend plus 5 backend checks. CANCELLED stays terminal despite nested evaluation data. |
| Notebook attempts and long-call budgets | 189c708 | 17 candidate plus 17 main checks; affected isolated consumers passed. Durable attempt binding, no blind resubmission, query600s/online child1800s/offline child120s. Actual provider polling/recovery and ambiguous source attachment remain open. |
| GPU capacity ownership, remedies and narrative | 4d4be2a | Independent24/24 and main24/24; four affected suites passed. Exact SKU ownership and positive integer capacity; quantity multiplication once; mixed kits not misreported. Lint8 existing warnings before/after,0new,0errors; CC131. |
| Query-choice memory and up-front clarification | This checkpoint | Independent17 and main39 checks; router4/4; cycles0/614; CC131; lint0new/10existing. Actual scoped preference consumption replaces fabricated hardware evidence. Full CP7c/CP12 remain open. |
| Pricing presence through grouped input/context/report | This checkpoint | Independent23, main42, grouped28 including actual offline children, parser/workbook7, quantity wrapper1. cycles0/617,CC131,lint0new/3existing. Quote/list basis still open. |
| Reasoning, receipts and unfinished candidates | 94416d7,4365a57,ef9e061 | History preserved; partial typed choice store is archived UNUSED/UNVERIFIED. Superseded GPU failures retained, corrected evidence in gpu-main-integration. |

All receipt folders above live under outputs/history/skill_workflow_excellence/2026-10-09/. Production source, reviewer tests, raw results, source/preimage bindings and limitations are committed where indicated by their receipts. Earlier lint0 claims based on shell association are superseded: use explicit node to invoke cached oxlint; Notebook lint needs requalification at the next relevant stable boundary.

## Completion and activation

Formal accepted scopes: **12/35 (34.3%)**. This counts complete independently accepted scopes, not every integrated fix. Development remains incomplete. Accepted CP0 baseline, CP1–CP6 additive, CP6r, CP7a/b and CP8a must not be repeated without a specific changed dependency.

Combined CP8/CP11 transport/facade/trace code is already committed. PRESALES_TERMINAL_OWNER and PRESALES_EXECUTION_TRACE remain opt-in; PRESALES_QUERY_SHADOW defaults off. Saving code does not activate unfinished paths or establish live vendor/cloud certification.

## Next implementation: bounded missing steps

1. Query-choice fix is independently integrated and saved in this checkpoint; do not reauthor it. Remaining broader CP7c/CP12: end-to-end learning/telemetry activation and path coverage. Receipt: query-choice-main-integration/acceptance-receipt.json.
2. Pricing presence fix is independently integrated and saved; do not reauthor. NextCP10a: separate catalog estimate from customer quoted basis in budget_optimizer, correct nullable/missing-price schema contracts and qualify end-to-end caller output.
3. Finish remaining reliability gates: MCP ingress/trace ownership, telemetry activation, source-attachment ambiguity, supported provider recovery, whole-manifest validation and six recorded scraper/session findings.

Codex delegates disambiguation_intelligence_author/pricing_presence_author stopped with quota errors and are not active. GPU verifier assignment was completed by root. Agy GPU worker b9f490b7-4bbd-4812-b771-480ff01e5866 is finished for this scope; do not resume its completed work. Agy router reviewer 9618307e-48a4-439a-a4f5-b82d02f335dd has no accepted final receipt. Parent conversation8c0aeeae-672b-41eb-a876-254e06645407 and Temp/agy-latest-gaps-20261009 are recovery hints, not required durable acceptance evidence. Check actual artifacts before continuing an old backend conversation.

## Full remaining delivery batches

| Batch | Remaining scopes | Acceptance |
| --- | --- | --- |
| A reliability/activation | CP11a/b, CP8b, CP6b and current blocking defects | Affected customer callers, ownership/cancellation/deadlines, source-bound receipts; real remote limits explicit |
| B customer paths/pricing | CP9b/c/a/d/e, CP10a/b, path-specific CP7c | RFP/workload/OCR/conversion/mixed requests, intent and quantity conservation, complete-manifest validation |
| C learning/vendor/skills | CP12a/b/c, CP13a/b/c, CP14, CP15, CP16 | Consumed learning,28skill contracts, VendorX then Dell conformance, honest unsupported capabilities |
| D final acceptance | CP17,CP18 | Maintainable extractions and final-tree domain/build/static/scenario acceptance |

6–8 substantial sessions was a planning allowance, not measured completion time. Do not repeat it as a fresh forecast without accepted delivery. Track completed fixes, next gate and remaining scopes; reforecast after Batch A closes.

## Agent-independent restart

Read this snapshot, the plan, ledger and bounded implementation handoff. The versioned Agy guide is agy-orchestration/SKILL.md with references/cli-operation.md. Personal installed skill is a convenience; the repository copy preserves delegation lessons for other agents.

Verify git status and current source bindings; acquire the canonical live writer lease before edits. Never reclaim by age alone. Isolated authors have disjoint writes, root integrates independently verified fixes promptly and commits exact allowlists. No new baseline capture or rerun of passing GPU/dashboard checks unless dependencies change. CLI SUCCESS or print timeout is not completion; require actual artifacts and assertion evidence. Notebook conversation-id means follow-up, not remote-job polling. Whole solutions stay whole; no fragmented verification or invented citations/certification.

## Revision5.42 active pricing continuation

Historical revision5.42 pricing failures are superseded by revision5.43 acceptance. Both Agy implementation conversations now have their tested fixes promoted to main. Do not resume their completed code authoring. Pricing author receipt predates2guard corrections; it is labelled superseded. Final main source bindings and42tests govern acceptance. Source/brief/preimage records and original failures remain archived.

## Revision5.43 delivered and next gate

Query-choice runtime saved in main db32541. Pricing6source fix now integrated42/42main,23independent,28grouped actualoffline child checks,7parser/workbook controls and1legacyquantitywrapper. Receipt pricing-main-integration/acceptance-receipt.json; source bindings checked. Router skill corrected to actual typed preference/consumption behavior (documentation only, not CP14closure). Graph refreshed9358nodes/17032edges/499communities; semantic labels still limited. Formal12/35 remains, two substantive runtime fixes delivered this execution turn. Remaining23scopes are not only tests. Next implement price-basis preservation plus nullable schema, then remaining BatchA lifecycle/telemetry/source recovery and BatchB customer paths. Do not rerun successful39/42/28checks without changed dependencies. WriterPID8008/session29945 held during commit then explicitly released; verify lock absence before next lease.
