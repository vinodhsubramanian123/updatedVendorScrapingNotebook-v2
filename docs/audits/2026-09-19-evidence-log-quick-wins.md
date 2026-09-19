# Evidence-log follow-up: bounded quick wins

Read-only source/artifact review on 2026-09-19; no tests executed or implementation changed. Inspected the 30 most recently modified evidence JSON records, then traced selected failures to their producers. This is additional review, not a claim that every historical log was examined.

## 1. Strengthen the successful multi-BOQ smoke case (highest priority)

`tests/integration/test_eval_multi_boq.js:30` is named “executes single text configuration in JSON mode” but accepts either SUCCESS or ERROR. Trace `TRC-1789829857353-182F76` for its temporary JSON file records failed chassis detection. The passing suite therefore proves response shape, not successful evaluation.

Quick win: separate explicit error-contract coverage from a valid offline evaluation fixture. Use a catalog-backed chassis/SKU combination and assert successful execution of local evaluation plus terminal evidence, while retaining INCOMPLETE/PORTAL VALIDATION PENDING where cloud review is absent. Trace JSON ingestion and chassis identification if the corrected fixture still fails. Do not force overall customer certification to SUCCESS just to satisfy the test.

This narrows the earlier closure statement: 172/172 passing is confirmed, but is not proof that every nominal success scenario evaluated successfully. The root cause of this particular ingestion/detection failure is not established by this follow-up.

## 2. Use the existing inline artifact contract for sizing queries

`route_query.js:552` records a null-path CUSTOMER_INPUT with a SHA-256 and exists:true. `EvidenceLedger.recordArtifact()` initializes exists:false after spreading caller details, so trace `TRC-1789829600910-7F0QFR` has a hashed query marked nonexistent. Structural health still passes because it checks the fingerprint.

Quick win: replace that call with `recordInlineArtifact('CUSTOMER_INPUT', queryText)`, already used by the canonical API. Keep queryText in the customer-input context. This removes an inconsistent artifact label without changing the sizing verdict.

## 3. Identify test purpose and expected failure explicitly

The newest 30 records include 16 SKU_DECISIONS_MISSING flags, 11 CHASSIS_NOT_IDENTIFIED flags, and six each INPUT_NOT_IDENTIFIED/INPUT_FINGERPRINT_MISSING. These counts combine historical broken implementations, intake failures, provisional sizing, and test activity; they must not be interpreted as 30 production incidents.

Quick win: add runOrigin/scenario/expectedOutcome metadata for future test-generated traces and a read-only audit filter. Preserve the raw failure verdict and gaps; never mark a failure expected solely because it came from a test directory. For intake rejection, explain that SKU decisions were not reached rather than implying an independently lost ledger stage.

## Separate investigation, not an established quick fix

Trace `TRC-1789829890928-4031C9` records ERR_EMPTY_BOQ for a temporary workbook named HP_Opportunity-_DL380_5_Servers.xlsx. The input no longer exists at the recorded path, so this review cannot distinguish a deliberately empty fixture from a workbook parsing problem. Future failed ingestion receipts should identify selected sheet, input origin, and extraction counts to make this diagnosis possible.

## Positive verification

For `TRC-1789829516787-42ED6E`, current CATALOG, CATALOG_RULES, RANKED_WORKBOOK, RANKED_CSV, PARTNER_PORTAL_WORKBOOK, and ANALYSIS_REPORT files all match their recorded SHA-256 values. Its in-memory customer input is explicitly recorded inline. The workflow remains INCOMPLETE rather than falsely asserting cloud or portal acceptance.
