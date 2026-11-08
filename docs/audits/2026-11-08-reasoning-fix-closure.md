# Reasoning correction follow-up

Date: 2026-11-08

Implemented the six follow-up findings from the static review. The user explicitly reassigned final testing to Codex for this change; development preceded test execution.

## Changes

- Retraction and supersession now deactivate every supported registry array, including chassis-specific rules and wrapped deltas. Active readers reject inactive records regardless of an older ACTIVE governance field. Retraction decisions also exclude old source copies during registry rebuilds. Source history and decision records remain available for audit.
- Tier 3 and delivery gate B19 now independently re-read the original captured BOM and configuration evidence. They require current timestamps, successful vendor status, complete scope, and the exact candidate manifest. Receipt IDs, supplied hashes and status flags alone cannot establish acceptance.
- Repair discovery requires exact catalog/product identity. Removed hardcoded cross-generation PSU, heatsink, memory, service and enablement defaults. PSU candidates come from the scoped catalog; thermal proposals require explicit capacity and packaging attributes; service candidates respect requested SLA and duration, defaulting to three-year Basic only when unspecified. Other enablement conflicts remain actionable unresolved constraints until scoped rules establish the required change.
- Every acceptance blocker is preserved, including duplicate IDs, missing IDs, customer conflicts, general blockers and missing blocker details. A SKU mentioned in prose does not authorize an addition, removal or substitution.
- Both missing and underpowered PSU branches check the available catalog capacity. Unknown loads or invalid server counts produce unresolved actions rather than fabricated quantities. Infeasibility refers only to the observed candidate set, not universal vendor support.
- Missing correction status is UNVERIFIED. Resolution counts require both explicit RESOLVED status and verifiedBuildable. Removed generic cooling certification statements from explanation templates.

All emitted hardware changes remain proposals requiring complete candidate validation; this patch does not claim universal autonomous repair or vendor certification. Missing catalog ratings and packaging information intentionally reduce automatic part selection rather than creating unsupported evidence.

## Final validation

- 53/53 tests passed across repair/reasoning, receipt binding, chaos, active knowledge routing, quarantine and knowledge synchronization tests. Retraction was also checked in a fresh Node process against persistent records.
- Receipt suite rerun after preserving output scope in gate B19: 7/7 passed, including a positive accepted capture and a changed-manifest rejection.
- Smoke matrix: 8/8 suites passed.
- Core lint: zero warnings/errors after correction of one unused declaration.
- Whole-repository complexity: 387 files, 3,083 functions; zero above CC 30.
- Circular dependencies: zero across 692 files.
- git diff --check: passed, with line-ending normalization notices only.
- Graph refreshed (14,094 nodes / 25,103 edges). The follow-on integrity checker reported `UNGROUNDED_SKILL` for cross-vendor-transformation-skill (zero implementation links); graph-link integrity is therefore not certified by this change.

Local test receipts: `outputs/history/reasoning_fix_tests_20261108.log` and `outputs/history/receipt_fix_tests_20261108.log`. Receipt tests use synthetic isolated captures; no live portal acceptance or cloud publication was performed. Existing unrelated working-tree changes were retained.
