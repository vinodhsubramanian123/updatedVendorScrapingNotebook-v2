# Authentication probe safety fixes

Reviewed baseline: `44f8f7d9`. This is a bounded review of the recent authentication changes.

## Findings and changes

- Routine `checkAuthHealth()` calls deleted Chrome profile locks and could terminate processes on port 9222 before checking credentials. Removed automatic cleanup from both the probe and healing dispatch. Dedicated browser startup also preserves profile locks: CDP unavailability does not prove that a browser profile is unused. Legacy explicit cleanup exports remain for compatibility.
- The health probe used the active CLI profile while recovery explicitly used `default`. Both now use `default`.
- An exit-zero CLI response without the authentication-valid marker bypassed requested healing. Invalid responses now enter recovery when requested.
- The recovery subprocess had a 60-second timeout despite sequential internal stages allowing approximately 115 seconds. Increased its outer timeout to 120 seconds.
- Browser spawn errors arrive as asynchronous `error` events, outside the surrounding `try/catch`. Startup now handles those events and returns a structured failure.

## Validation

- Five isolated regression tests passed (`tests/unit/test_nlm_auth_probe_safety.js`), including denied filesystem deletion/process cleanup, simulated asynchronous spawn failure, custom profile forwarding, timeout duration, and remediation command verification.
- Core lint exited successfully.
- Smoke matrix: 8/8 suites passed.
- `git diff --check` passed.

No live login, cloud synchronization or vendor acceptance was tested. These operational fixes do not establish a hardware rule for the product-scoped feedback registry. Retain the general lesson here: a health probe must not mutate browser ownership, and an absent debugging endpoint is not evidence of stale profile locks.
