# OCA session startup and recovery — 19 October 2026

## Current result

Live CDP navigation succeeded for **DL380 Gen12**, selecting the commercial CTO base **P73282-B21** and entering the WebLogic configuration workspace. A repeated call reused the active configuration. A subsequent forced recovery closed only OCA, returned through Partner Portal, clicked One Config Advanced, and reached a new configuration workspace.

The earlier solution-wide audit only observed that no OCA tab was open; it had not attempted startup. That observation was not evidence of an unfixable authentication blocker. This follow-up exercised startup and found the defects below.

Navigation is verified. No new catalog capture, complete BOM acceptance, CLIC certification, or cloud synchronization is claimed.

## Canonical commands for future agents

From the repository in PowerShell:

```powershell
# Start or reuse the exact active target configuration.
npm.cmd run oca:session -- "DL380 Gen12"

# Deliberately replace OCA through fresh Partner Portal SAML launch.
# Flag position is supported before or after the quoted product query.
npm.cmd run oca:session -- --recover "DL380 Gen12"
```

Use the exact model/generation and a quoted query. The session utility is navigation-only; catalog scraping and customer evaluation continue through their own canonical entrypoints and gates. Prefer reuse for ordinary continuation. Force recovery only when the OCA session is stale, broken, or intentionally being replaced.

Each CLI invocation writes an atomic sanitized JSON receipt under `outputs/history/oca_sessions/navigation-<timestamp>.json`, containing query, timestamps, port, terminal navigation status, page ID and URL without query/fragment. Fresh discovery also records the selected base SKU; reuse may have no new discovery SKU and must not invent one. Credentials are never included. `vendorAcceptance` and `cloudSync` remain `NOT_EVALUATED`.

Receipts also bind the navigation module's SHA-256. A historical receipt proves its recorded execution, not readiness after future code or browser changes.

## What blocked reliable startup

| Finding | Observed behavior / defect | Remedy |
|---|---|---|
| CDP was mistaken for authenticated OCA | Port 9222 was running a NotebookLM-owned Chrome profile with no OCA or Partner Portal page. | Keep browser availability, portal authentication and OCA readiness separate. Open a portal anchor without replacing unrelated tabs. The browser launcher intentionally reuses a listening browser. |
| Password stage stalled | The first live run submitted email, then entered passive redirect waiting while the visible Onepass password field remained empty despite configured credentials. | Verify the actual password field after CDP text input, repair focus loss with the native input setter, dispatch input/change events, and synchronize the modal username. Return only readiness booleans. |
| Early auth assumption and short form window | A `/group/prp` pathname alone ended the password phase; the credential polling window was only 30 seconds, followed by up to 180 seconds of passive waiting. | A visible password dialog takes precedence over the URL. Require a portal launcher anchor for early authenticated recognition and allow up to 90 seconds for delayed credential-form mounting. A visible form without configured/autofilled credentials produces an explicit error. |
| Commercial sessions repeatedly destroyed | A successful workspace was closed on the next call because `isDefaultChassisCandidate` scanned the whole page and matched the standard **OEM Software** category. This was reproduced live. | Determine OEM eligibility and exact target SKU from matching base-product lines, not option-category text. Preserve DL380/DL380a and generation boundaries. |
| Newly opened portal missing from selection | `navigateToOCAChassis` created a portal tab but continued selection from its old target list. | Re-read CDP targets after creating the anchor. |
| Recovery assumed Chrome already existed | `recoverAndLaunchFreshOCA` queried CDP before ensuring browser startup. | Ensure Chrome/CDP readiness and fail with `CDP_UNAVAILABLE` if launch is unsuccessful. |
| Authentication failures swallowed | Portal launch caught sign-in errors, then attempted launcher discovery on the failed login page. | Propagate authentication errors; distinguish absent credentials, rejected credentials, vendor interaction and timeout. Reject detection uses visible error containers, not generic help text. |
| Flag-first CLI treated as chassis | `process.argv[2]` could be `--recover`. | Locate the non-flag product query. The live flag-first recovery command selected the intended DL380 Gen12 base. |
| Skill overpromised credentials/MFA | It claimed the connected port always used `.chrome_sso_profile`, credentials always persisted and MFA was bypassed. | Corrected skill: an already-running browser can use another profile; credentials/cookies are conditional; vendor MFA/CAPTCHA cannot be promised away. |
| No terminal navigation receipt | Console output alone was the startup record. | Added `oca:session` command and atomic sanitized success/failure receipts. Unknown base price now remains null instead of zero. |

The first authentication stall is an observed outcome. The logs did not uniquely establish whether late form mounting, early URL recognition, or focus loss caused that particular empty field; all three failure paths were addressed. The OEM-category false rejection was directly reproduced and isolated.

## Startup protocol

1. Ensure CDP is reachable. Do not infer HPE identity or authorization from `/json/version` returning 200.
2. Preserve an existing Partner Portal anchor. If none exists, open `https://partner.hpe.com/group/prp` as a new tab and refresh the target inventory.
3. If the exact active OCA configuration is usable, return `READY_AT_MENU_TAB`. Other categories mentioning OEM do not change the base identity.
4. Otherwise use the Partner Portal sign-in flow. Read configured `HPE_PORTAL_USER` / `HPE_PORTAL_PASS` through the repository environment; preserve a saved password if no override exists. Verify field state without printing values.
5. Click the rendered **One Config Advanced** quick link (`#quick-links-807 a`, or the evidenced tool anchor for service 187402) with a user gesture. Wait for the SAML-created OCA target.
6. Search by model name, inspect exact CTO candidates and select the intended commercial base. Do not put raw CTO token filters into the search box or silently choose OEM/TAA/GTA/BTO.
7. Wait for the real configuration workspace. Retain the terminal receipt and verify the owning product/base before continuing a scrape or customer manifest operation.
8. For a stale session, close OCA and return to the portal anchor. Never navigate directly to or reload `OCAInternalLogin`.

## Error interpretation

| Code / state | Meaning and next action |
|---|---|
| `CDP_UNAVAILABLE` | Browser debugging did not become ready; inspect executable/profile startup and port availability. Do not reset unrelated profiles or terminate a shared browser. |
| `HPE_AUTH_CREDENTIALS_REQUIRED` | A visible password form has neither configured nor saved credentials in this profile. Supply credentials through the approved local environment/session; do not invent or expose them. |
| `HPE_AUTH_REJECTED` | A visible authentication error was detected. Preserve the session for investigation; do not repeatedly guess passwords. |
| `HPE_AUTH_INTERACTION_REQUIRED` | Vendor identity verification/MFA/CAPTCHA is present. Disclose the specific boundary and retain the login tab. |
| `HPE_AUTH_TIMEOUT` | Authentication did not settle within its deadline. Inspect the current page and failed stage; do not call it an OCA product-search failure. |
| `OCA_LAUNCH_PENDING` | The portal launcher did not produce an OCA target within the deadline. Check rendered launcher/entitlement/popup state without navigating to the SAML endpoint. |
| `OCA_PRODUCT_NOT_FOUND` / `OCA_SELECTION_FAILED` | Authentication and launch may be working; product discovery/selection failed. Preserve product evidence and investigate the exact request. |
| `OCA_CONFIG_NOT_READY` / configuration exception | The selected product did not reach a usable workspace. Recover through the portal under the existing bounded recovery policy. |
| `READY_AT_MENU_TAB` / `NAVIGATED_TO_CONFIG_PAGE` | Navigation readiness only. Scrape coverage, local evaluation, vendor acceptance and cloud readback still require their own receipts. |

No instruction should describe “human MFA bypass” or “guaranteed saved credentials” as an implementation capability. If the vendor requires a challenge, document the blocker rather than weakening authentication or claiming success.

## Retained live evidence

All logs are under `outputs/history/`:

- `2026-10-19-oca-startup-live.log`: initial email submission followed by stalled password/redirect stage; the owned navigator process was stopped before retry.
- `2026-10-19-oca-startup-fixed-live.log`: successful password submission, authenticated portal, rendered quick-link click, 128 discovery candidates / 26 matching CTO bases, commercial P73282-B21 selection, `NAVIGATED_TO_CONFIG_PAGE`.
- `2026-10-19-oca-session-reuse.log`: pre-fix OEM-category false rejection and unnecessary reopening of the commercial workspace.
- `2026-10-19-oca-session-reuse-fixed.log`: corrected fast reuse, `READY_AT_MENU_TAB`, same tab `93B24EC93FBECCD1AA7079F1FA5B7F73`.
- `2026-10-19-oca-session-recovery-live.log`: flag-first forced recovery, new tab `DD934D519D421421CCE5EBD743FC473C`, P73282-B21 selection and workspace readiness.

Initial successful receipts:

- `outputs/history/oca_sessions/navigation-1792436381872.json`: reuse readiness.
- `outputs/history/oca_sessions/navigation-1792436400698.json`: fresh portal recovery and configuration readiness.

Page IDs and session state are ephemeral. These records demonstrate this run and must not be reused as proof of a future browser/session or customer acceptance.

## Regression and continuation requirements

`tests/unit/test_oca_session_auth.js` verifies password-field recovery when another input has focus, event dispatch, safe special-character handling, saved-password preservation, missing-field rejection, and commercial/OEM/model/generation/base-SKU boundaries. Existing navigator resilience and product-selection suites retain stale-session and transport guard checks.

Focused command:

```powershell
node --test tests/unit/test_oca_session_auth.js tests/unit/test_cdp_navigator_resilience.js tests/unit/test_oca_navigator_product_selection.js
```

The focused suite passed 15 tests. Keep those separate from live browser receipts; mocked tests do not prove vendor availability. The user subsequently authorized checking in these tests, fixes and plans for Antigravity review. See `2026-10-19-antigravity-review-and-execution-handoff.md` for the remaining review/execution work. Remote publication is separate from this local check-in.

Do not update global Codex memories from this task without an explicit memory-update request. The skill, this runbook and the repository charter provide the continuation instructions.

## Final verification

- Focused session/resilience/product selection: **15/15 tests passed**, zero skips.
- Curated smoke: **8/8 suites passed**.
- Core lint and the final navigator/test lint: exit 0, no warnings or errors reported.
- Static skill audit: zero broken links, zero unresolved local imports, zero missing package entrypoints.
- Final live reuse receipt: `outputs/history/oca_sessions/navigation-1792436554449.json`, `READY_AT_MENU_TAB`, same recovered tab `DD934D519D421421CCE5EBD743FC473C`.
- Final live log: `outputs/history/2026-10-19-oca-session-final-live.log`.
- Graph refresh receipt: `outputs/history/2026-10-19-oca-session-graph.log`.

The session was left open for continuation. The current connected browser was reused; launching an entirely stopped browser was not exercised live. Wrong-password and MFA classifications were not exercised against the real account. Those limits do not affect the observed successful authentication, fresh OCA launch, workspace readiness and repeated reuse in this run.
