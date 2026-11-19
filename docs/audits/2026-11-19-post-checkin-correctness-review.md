# Post-check-in correctness review

Date: 2026-11-19. Reviewed baseline: `2568357c9806deb1b270d71ce12b3f5b3209e42f`.

This follow-up covers reproducible defects outside the checked-in Solution Intelligence regression cases. The verification scope is offline, including mocked delivery boundaries.

## Reproduced defects and fixes

| Area | Counterexample before the fix | Corrected behavior |
| --- | --- | --- |
| Dependency gate/projection | `evaluateInvalidationBoundary(null, 'AUTH')` returned UNKNOWN, but B24 passed it and the customer projection labeled it VALID. | Explicit unknown/non-accepting boundaries require action, prevent positive buildability, and block projected delivery authorization. Absent legacy dependency data retains its existing behavior. |
| Dependency reevaluation | Two authorizations shared a source. After invalidation, reevaluating one FAILED and the sibling VALID restored the source and incorrectly made the failed authorization acceptable. | Every target and upstream dependency must have VALID status. Failed/unknown nodes and missing upstream nodes block acceptance; sibling success cannot repair the failed target. An omitted reevaluation outcome remains UNKNOWN. |
| Verified repairs | Removing the only CPU returned ACCEPTED when the validator was missing or returned null/empty data. A repair session with an unchecked baseline and no proposals also returned ACCEPTED. | Transactions roll back missing/empty validation reports. Sessions cannot declare an unchecked baseline solved. Explicit checked empty-error reports remain supported. |
| Repair argument dispatch | The one-object API silently ignored its delta and callback because the helper inspected its own three arguments instead of the public caller's argument count. | Both packed and positional calls apply their deltas and invoke the supplied validator. |
| Repair ownership | SET_QUANTITY for a previously absent owner created an unowned part. Repeating the delta could create duplicate rows. | New parts retain owner, role, description, and quantity scope through the same field-copy helper used by ADD. |
| RAID requirements | A customer's requested RAID 6 became the candidate's actual RAID even when none was configured. Usable storage could also be calculated using the requested RAID instead of the candidate RAID. | Candidate/context RAID is the evidence source. Missing RAID remains unresolved, and usable capacity uses the candidate's actual RAID. |
| Installed networking | A dual-port 1 GbE NIC plus a spare 100 GbE transceiver satisfied a two-port 100 GbE requirement. One fast port plus two slow ports could also satisfy the count. | Spare/shared optics do not establish installed NIC capability. Required ports must meet the speed condition on installed adapters. |
| Compound requirement interpretation | `At least 256 GB RAM and TPM 2.0 mandatory` was marked entirely satisfied by RAM alone. | Unsupported conjuncts remain visible in `uninterpretedFragments`; the original clause and recognized metrics are preserved, while hard-clause coverage remains UNRESOLVED and requests clarification. Fully typed conjunctions and contextual support terms remain parsed. |

## Checks added before commit

- A stored run could carry an unknown dependency alongside an earlier approval. The dashboard routes, customer workbook writers, serializer, and artifact integrity checks now share the same dependency interpretation as B24. Delivery and document-review fingerprints bind explicit status and acceptance, even if the index revision is unchanged. Older payloads that omit the boundary or carry the legacy `isStale: false` shape retain their existing behavior.
- A queued reevaluation could approve a superseded revision or replay an already resolved result. Completion now checks that the queue entry is current, pending, and matches the trigger revision. A target with several current triggers stays blocked until those reevaluations succeed.
- A minimum in one conjunct could turn a later DIMM maximum into a minimum. Comparators now stop at conjunctions. An explicitly mandatory unparsed fragment remains blocking alongside a preference elsewhere in the clause.
- Catalog NIC descriptions can name SFP or QSFP connector types. Ports on those adapters now count toward installed capacity, and a separate spare optic still contributes no installed ports.

## Engineering lessons

- Test acceptance at every point that commits an outcome: initial gate, stored-run export, direct file generation, publication, and reevaluation. A passing gate or matching fingerprint from an earlier step cannot establish current dependency validity.
- Keep the required value and observed candidate value separate. Positive fixtures should supply the RAID mode, validation report, and installed port data they intend to verify. Counterexamples should omit or contradict those inputs and check the resulting disposition.
- Treat asynchronous results as revision-bound. Exercise the ordering where a newer invalidation happens before an older result returns, and require each independent trigger to resolve before granting acceptance.

## Remaining coverage

The dependency index supports registered nodes and explicit boundaries. The standard evaluation path does not automatically register every artifact and its upstream revisions, so this review does not certify automatic invalidation of every previously exported run after a catalog change. Guaranteeing that behavior requires wiring registration, persistence, and current revision checks into normal evaluation and export. The clause parser checks supported conjunctions and does not claim complete interpretation of arbitrary prose.

## Regression evidence

New regressions cover the counterexamples above in SI-02, SI-05, SI-07, SI-08, and `tests/unit/test_boq_partial_requirement_clauses.js`.

Two SI-10 fixture inputs now explicitly provide the evidence required by their existing scenarios: F09-DEV declares its configured RAID 6, and F16-HELD supplies a deterministic candidate validation report for the receipt-invalidation test. Expected outcomes and the 24-family / 48-case split are unchanged.

The first broad SI run caught these fixture assumptions rather than weakening the corrected behavior. After correcting the inputs, the SI-10 quality suite passed all 48 scenarios.

## Final verification

- Combined serial `node --test` run: **122/122 PASS**, zero failures/skips. Includes SI-01 through SI-10, partial-clause and usable-storage regressions, HTTP and file export authorization, registry contracts, and active knowledge routing.
- Core workflow and delivery boundary suites: **31/31 PASS**, zero failures/skips. The fixtures mock native document review and publication and exercise both grounding policy branches.
- SI-10 benchmark within that run: **48/48 scenarios PASS**, unchanged dev/held-out splits, zero false acceptances or repair regressions.
- `npm.cmd run test:smoke`: **8/8 suites PASS**, failure ledger empty.
- `npm.cmd run lint:all`: PASS, zero warnings/errors.
- `npm.cmd run lint:complexity`: PASS, zero breaches of CC 30 across 414 files / 4,406 functions.
- `npm.cmd run test:circular`: PASS, zero circular dependencies.
- `npm.cmd run test:deadcode`: PASS, zero unexplained orphan modules.
- `npm.cmd run update:graph`: PASS, 15,320 nodes / 29,901 links, 39/39 skills connected, zero ad-hoc scripts.
- `git diff --check`: PASS.

An independent review of the initial parser and repair changes found no important regression in that scope. Catalog freshness warnings remained visible. Verification covered selected offline suites and mocked delivery. Live portal and cloud qualification remain pending.
