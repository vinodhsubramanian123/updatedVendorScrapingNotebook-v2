# NotebookLM Source Retirement Manifest

Status: **EXECUTED AND VERIFIED**

Audited: 2026-09-06

Executed: 2026-09-06

## Execution record

- All 37 proposed source IDs were re-listed and matched to the expected notebook and title before deletion.
- The first cross-notebook bulk request was rejected without deleting anything. Membership was re-audited, then deletion succeeded in notebook-scoped batches: DL380 Gen12 `12`, DL380a Gen12 `10`, DL145 Gen11 `3`, and Synergy `12`.
- Exact retained-source postchecks passed with counts `3`, `2`, `1`, and `2` respectively.
- Restricted-source canary queries passed for all four notebooks and returned grounded product facts with inline citations.
- Cloud deletion is permanent. Future retirement is governed by the canonical knowledge-workbook transaction: consolidate verified learnings and scrape deltas, calculate fingerprints, write/refresh the stable Google Sheet source, pass a restricted canary, and only then retire the preceding source.

Policy: NotebookLM grounding sources are limited to official vendor documents, certified OCA catalogs, and verified/deduplicated KnowledgeDelta payloads. Customer BOQs, quotes, procurement lists, generated solution reports, and unverified notes are excluded.

## Post-execution trust audit (2026-09-06)

No additional source was deleted during this audit. Query allow-lists were tightened immediately, while physically retained sources remain available for learning extraction and evidence review.

- Official QuickSpecs remain trusted for DL380 Gen12, DL380 Gen11, DL380a Gen12, DL145 Gen11, Alletra, and Synergy.
- The DL380 Gen11 certified master catalog CSV remains trusted.
- Previously generated catalog narratives and the shared universal charter are quarantined from queries because their historical payloads were not product-scoped.
- `dl380a-gen12-configuration-architecture-guide.md` is retained but quarantined pending claim-by-claim validation. It contains useful product learnings, but also customer configuration material and claims that conflict with the no-unsolicited-software invariant.
- The DL380a canonical Sheet transaction created one superseded duplicate source, `df80d531-156e-48e0-b4e1-91328615cf7f`. It is retained and quarantined. It is a newly discovered retirement candidate and was not covered by the prior deletion authorization.
- `DL380 Gen11 Default Power Cable` is retained but quarantined pending extraction because it contains a Notebook conversation and customer configuration content rather than a clean verified learning source.
- Alletra currently contains repeated generated catalog sources dated 2026-09-05 plus `Canvas Copied Confirmation`. These are quarantined and are not authorized for deletion by the earlier retirement grant.

The next retirement transaction for any quarantined source is: extract candidate claims, verify each against official/OCA evidence, persist approved `KnowledgeDelta` records with exact product identity, refresh the canonical product Sheet, run a restricted-source canary, and only then request/consume deletion authorization for the newly proposed IDs.

The application queries only the trusted source IDs in `scripts/config/notebooks.json`. This manifest records the completed live-workspace cleanup authorized by the user.

## DL380 Gen12

Notebook: `1d190853-4e9c-48df-aa70-eae66c6f2c1f`

Keep:

- `6eb52606-9295-4f0b-af65-89454b2d443a` — HPE ProLiant Compute DL380 Gen12 QuickSpecs
- `d5a43395-f0cd-4b76-8656-a67f14cedf75` — certified OCA catalog
- `db72a668-a271-42ab-bedc-0a82abc1d609` — verified sync payload

Proposed retirement:

- `15fef5a7-b740-4e07-9367-f91e188a4a93` — All notes 05/08/2026
- `e1df0612-2e55-45b8-8bd8-779196bc4b04` — BOQ Ask Section 4 - Sheet1
- `146b5bb1-23b5-493a-afd1-279168ab12a9` — ComputeScale customer configuration
- `fde32685-05a1-4608-8f5c-3226f44a7393` — generated validation learnings
- `4e59bf7a-e63d-42a8-b422-b4548c334f5c` — chassis-price derivative
- `3c6b139c-ec7d-4d11-8fb3-205abc7d70f4` — procurement list
- `b1625a2d-8788-42b5-b221-9c474b4af5ae` — sourcing configuration report
- `b2be3cc7-a2c3-43d4-a858-9c1ca5aa1fb0` — Path B generated BOM report
- `f847b57d-610a-412e-a392-cdfbfbd936d3` — generated topology guide (not independently certified)
- `cc18293a-0fda-42a1-8225-89d2c5bdff0a` — portal-bypass learnings
- `44c135e9-14c8-47db-ad66-0e6e0ec34e45` — workload justification derivative
- `11d4fad1-8926-48e0-aa0d-726b943cbbef` — UpdatedErrors

## DL380a Gen12

Notebook: `b233ec88-4682-4164-a801-3ee6ca649dc1`

Keep:

- `734fcb3d-d3a3-4ea2-9070-395c7193e2c9` — HPE ProLiant Compute DL380a Gen12 QuickSpecs
- `cd20f359-db6d-427a-8570-b54970b2fddd` — canonical certified catalog and verified-learning Google Sheet

Retained but query-quarantined (not authorized for deletion):

- `01ddb8ef-cbd2-41bf-80c1-bbd7373a8b9c` — configuration architecture guide; useful claims were extracted and individually checked, but the source also contains unverified/customer-derived assertions
- `df80d531-156e-48e0-b4e1-91328615cf7f` — superseded duplicate canonical Sheet source from the first upload attempt

Proposed retirement:

- `b4a7006f-bbd1-4437-b47a-cbca0527e5c9` — validated Partner Portal BOM
- `a32fc66a-c696-465c-ac8d-d1f7f46a2132` — BOQ Ask Section 5 - Sheet1
- `32b777a4-af64-42fe-b629-e0ee56932723` — BOQ analysis/solution visualization
- `ddfde9e6-9bad-4b1e-9a1d-4b25515205ae` — Errors
- `d9841361-84c7-4f5c-92bc-cbcd330d036b` — fixed-configuration learnings
- `d9b08b1a-a0a8-4795-8ba6-f2e8885c8eeb` — customer configuration
- `8d0cbcaf-8107-46c2-b07c-82134eae5a59` — TensorScale customer configuration
- `807d4eeb-f052-48b4-8cd6-86bfa95507bb` — generated comprehensive learnings v2
- `261e42ca-bff9-4e13-92d4-e784a9f67d2e` — generated comprehensive learnings
- `4c86479f-58bf-4a93-a3c0-9efab4747ca3` — duplicate generated comprehensive learnings

## DL145 Gen11

Notebook: `7a48061a-331a-429b-8477-7e0473491714`

Keep:

- `8ef9a190-7b29-4ff1-8f42-2a5edbcf4fe9` — HPE ProLiant DL145 Gen11 QuickSpecs

Proposed retirement:

- `be022913-24b2-4871-ac75-4bcbe821cfc4` — customer BOQ/quote
- `259b0610-f45e-4433-b0ea-cdd03ea762e3` — Errors_Advice
- `60403e5a-7cba-4307-8802-ce38007c3df5` — PartnerPortal BOM

## Synergy

Notebook: `49a3c69e-115f-4332-9454-c5d4f2941327`

Keep:

- `f2310433-1322-4d39-8f88-6991f123170b` — HPE Synergy 12000 Frame QuickSpecs
- `099bd9d8-ca4c-44e7-bd9c-31090a4efa66` — certified OCA catalog

Proposed retirement:

- `0ccb9bef-dcc4-49a2-b075-848eef8bba78` — All notes 18/06/2026
- `25e9f4aa-f9b3-44d9-9578-524829270446` — duplicate All notes 18/06/2026
- `593afbc9-9b62-4663-ab68-31381d3b5b52` — duplicate All notes 18/06/2026
- `6e4ac0a0-940d-4416-ad37-f86761801ee0` — duplicate All notes 18/06/2026
- `6fb832e0-39a6-485f-af82-9ce57a63cb4d` — duplicate All notes 18/06/2026
- `70fb41e2-df37-40dc-b41f-f5e05c1ffac4` — duplicate All notes 18/06/2026
- `9e288185-3f4e-43e6-9f0d-6db787c1eaa2` — duplicate All notes 18/06/2026
- `b6b1222f-806a-4a7e-a4e7-ed3611afc99d` — duplicate All notes 18/06/2026
- `e2faedf3-05dc-41f1-95cb-bbfd44ceac96` — duplicate All notes 18/06/2026
- `dcc7dae8-5c9f-409b-bc0c-4020ecc030ed` — generated mind-map derivative
- `ea09ec9b-0f32-4feb-b043-a70c2bca10d3` — validation request
- `515681a7-b7eb-4d9d-8e85-ff3be0f03b03` — generated alignment/validation derivative

## Execution acceptance criteria

1. Re-list every notebook immediately before deletion and abort if an ID/title differs.
2. Delete only the IDs above, with explicit confirmation enabled for every call.
3. Re-list each notebook and verify only the `Keep` set remains.
4. Run a restricted-source canary query against every retained source set.
5. Record the timestamp, source counts, and canary outcome without storing customer content.
