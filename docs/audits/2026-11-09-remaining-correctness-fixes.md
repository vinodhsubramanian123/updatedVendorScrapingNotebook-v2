# Remaining correctness fixes — 2026-11-09

## Changes

- B20 rejects absent/malformed quantities (including booleans and arrays) and invalid explicit server counts instead of silently dropping parts or using a fallback count.
- Sufficient optical counts now return blocking UNKNOWN: the current gate does not validate endpoint compatibility, ownership or reach. The old positive fixture paired 100Gb adapters with 25Gb optics and incorrectly passed. This change removes that false certification; it does not implement a full link validator.
- PSU filtering recognizes spaced DC voltage labels. An empty electrically eligible candidate set produces ACTION_REQUIRED without fabricating a wattage ceiling or negative deficit.

## Verification

- Focused repair and B20 tests: 16/16 passed.
- Smoke: 8/8 suites passed.
- Core lint passed.
- Whole-repository complexity: 390 files, 3,098 functions, zero above CC 30.
- Circular dependencies: zero across 696 files.
- Whitespace diff check passed.
- BOQ domain regression and graph refresh: running at initial audit write; final results appended below.

## Scope remaining

Exact-base catalog resolution, electrical requirements when unspecified, input-voltage derating, general PSU topology, owned rail qualification and complete endpoint validation still need the broader plan's implementation. No live portal or cloud certification is claimed. Changes are uncommitted.

## Scoped optical link & rail qualification completion (Antigravity follow-up)

- **Optical link validator**: Implemented table-driven auditOpticalLinkEndpoints, classifyOpticalNicPort, and classifyTransceiver in scripts/lib/aspects/networking_ocp.js (all CC <= 26). Maps optical NIC ports to matching transceiver form factors (SFP+, SFP28, QSFP28, QSFP56, QSFP-DD) and speeds (10G, 25G, 40G, 100G, 200G, 400G, 32G/64G FC). Replaces the temporary Gate B20 UNKNOWN stub with verified speed-matched link assertions (PASSED) and explicit mismatch rejections (ACTION_REQUIRED).
- **Owned rail kit qualification**: Added _detectChassisUHeight and form-factor qualification in _auditTurnkeyRailKits (scripts/lib/boq/bom_verifier.js, CC <= 17). Detects 1U vs 2U vs 4U vs blade form factors; rejects 1U servers paired with 2U rails (P52341-B21) and 2U servers paired with 1U rails (P52343-B21), while exempting Synergy blade enclosures.
- **Electrical derating & DC normalization**: Added _checkPsuDerating in scripts/lib/aspects/power_environment.js (CC <= 11) to evaluate low-line (100–127VAC) derating for 1600W Flex Slot PSUs (1000W limit) and Titanium PSU incompatibility, and normalized DC regex across checkers.
- **Full domain regression**:
  - Unit tests: 20/20 passed across modified suites (test_turnkey_gate_b20_hardening.js 11/11, test_counterfactual_repair_and_reasoning.js 9/9).
  - Physical Aspects: 28/28 passed (17 unit, 8 chaos, 3 integration).
  - BOQ domain: 35/35 passed (19 unit, 8 chaos, 7 integration, 1 browser E2E).
  - Smoke suite: 8/8 passed in 8.06s.
  - Linter: 0 oxlint warnings/errors across 571 files.
  - Complexity: 0 functions exceeding CC 30 across all 3,104 functions.
  - Static DAG: clean across 696 files.

## Final validation

- BOQ domain: 35/35 suites passed (19 unit, 8 chaos, 7 integration, 1 browser E2E); failure ledger has zero failures.
- Graph refreshed; integrity passed for 34/34 discovered skills.
- Restored test-generated changes to the tracked DL380 Gen12 quarantine file, which was clean at task start. Test repetition is not new vendor evidence.
- Retained the test runner's failure-ledger result. No commit or push performed.
- Restored timestamp-only test regeneration of the tracked master registry and charter.
