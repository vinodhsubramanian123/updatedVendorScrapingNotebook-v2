# Forensic Technical Learnings Ledger (`updatedVendorScrapingNotebook-v2`)

Hard-won architectural lessons observed directly in this codebase. Consult alongside [`docs/INVARIANTS.md`](../docs/INVARIANTS.md) (`npm run docs:lookup -- INV-<n>`).

## 1. WebLogic OCA `OCAInternalLogin` & `.blockUI` Overlay Trap (`INV-173`, `INV-254`)
- **Failure Mode:** Calling `Page.reload` / `location.reload()` or navigating directly to `https://oca.ext.hpe.com/oca/OCAInternalLogin` breaks WebLogic server-side SAML conversation memory (403/blank loop). Additionally, WebLogic leaves 100+ transparent `.blockUI.blockOverlay` divs (`opacity: 0`) that trigger infinite false-busy hangs if checked without `parseFloat(style.opacity) > 0.1`.
- **Enforcement:** `scripts/lib/scraper/cdp.js` (`assertSafeCdpNavigationGuard`), `scripts/lib/scraper/catalog_tab_capture.js` (`isBlockingElement`), and `scripts/lib/scraper/navigate_oca.js` (`CONFIG_WORKSPACE_READY_PREDICATE`). Recover only via Tab 1 (`partner.hpe.com/group/prp`) reload + clicking `#quick-links-807 a`.

## 2. Windows Chrome Job-Object Termination & Unified NLM Profile (`INV-253`, `INV-269`)
- **Failure Mode:** Child Chrome processes spawned inside PowerShell tool calls inherit the session Job Object (`KILL_ON_JOB_CLOSE`) and die on turn exit; separately, storing port `18801` interactive NLM cookies outside `~/.notebooklm-mcp-cli/chrome-profiles/<profile>` caused daily `AuthenticationError` rotation drift.
- **Enforcement:** `scripts/lib/scraper/browser_launcher.js` (`_spawnDetachedChromeProcess`) and `scripts/maintenance/nlm_interactive_auth.js` spawn Chrome via WMI `Win32_Process.Create`, register `18801` PIDs in `~/.notebooklm-mcp-cli/chrome-port-map.json`, and never delete `.chrome_sso_profile` on timeout.

## 3. FIO Option-Tag vs Localization-Suffix SKU Normalization (`INV-265`, `INV-273`)
- **Failure Mode:** Customer BOQs mix factory integration suffixes (`#0D1`, `#OD1`, `#B19`, `#B21`) with true hardware localization variants (`R7R97A#AC3`, `$0.00`). String-exact matching in `route_query.js:evaluateWorkloadBranch` missed cleaned substitution targets from `resource_arbitrator.js`.
- **Enforcement:** Always use `cleanBaseSKU()` (`scripts/lib/catalog/sku.js`) for option matching while preserving `#AC3` localization rows as distinct catalog entries.

## 4. Payload Bloat & Transport Sentinel Leak in E2E Runs (`SI-07`, `INV-249`)
- **Failure Mode:** Expanding every `UNEVALUATED` rule into `__EVAL_RESULT_JSON__` (~21.5 MB) and pushing raw transport sentinel lines into `dashboard/routes/evaluation.cjs` `run.logs[]` inflated `GET /api/run/:runId` to ~82 MB, exceeding Node's default 5s `keepAliveTimeout` (`ECONNRESET`).
- **Enforcement:** Summarize unevaluated rules in `scripts/lib/conflict/conflict_graph.js` (`_summarizeUnevaluatedChassisRules`), strip sentinel lines via `_isEvalTransportSentinelLine` in `evaluation.cjs`, and keep `keepAliveTimeout >= 65000` in `dashboard/server.cjs`.

## 5. Vite Middleware Realpath Alignment & Self-Proxy Prevention (`INV-275`)
- **Failure Mode:** Windows directory junctions cause `process.cwd()` vs `fs.realpathSync(PROJECT_ROOT)` drift that crashes Vite 6.2 `esbuildOutputFromId` (`504 Outdated Optimize Dep`), while `server.proxy` inside `middlewareMode: true` causes Express-mounted Vite to proxy `/api` back to itself (`ENOBUFS`).
- **Enforcement:** Align `process.cwd()` to `fs.realpathSync(PROJECT_ROOT)` before `createViteServer`, pass `server: { middlewareMode: true, proxy: {} }`, and mount explicit `/api` + `/artifacts` JSON 404 guards ahead of `vite.middlewares` in `dashboard/server.cjs`.

## 6. Atomic JSON Writes, File Leases & Epistemic Nullability (`INV-104`, `INV-197`, `INV-278`)
- **Failure Mode:** Parallel writes to `catalog_deltas.json` or `pipeline_telemetry.json` lose updates on Windows; defaulting missing confidence to `1.0` or missing prices to `$0` fabricates false certainty.
- **Enforcement:** Wrap read-modify-write mutations with `withFileLock` + `safeWriteJsonAtomic` (`scripts/lib/system/fs_compat.js`) and preserve `null` / `'UNKNOWN'` / `'NOT_EVALUATED'` wherever observations or denominators are absent.

## 7. Complexity Profiler Tokenization & Facade Contract (`INV-277`)
- **Failure Mode:** Raw character scanning for `{`/`}` inside strings/regexes desynchronized function boundaries, while counting both `if (` and `else if (` double-counted `else if` branches. `skill_workflow_registry.js` AST checks also inspect static `switch` cases in `scripts/evaluators/route_query.js`.
- **Enforcement:** `scripts/maintenance/analyze_complexity.js` strips comments/strings/regexes before brace and branch measurement; `route_query.js` preserves its top-level intent `switch` while delegating handlers to `scripts/lib/router/*`.

## 8. Wave 1–5 Intelligence Elevation & Refactoring Forensics (`INV-276`–`INV-280`, `2026-11-24`)
- **Returned-Array Property Preservation (`strategy_synthesizer.js`, `tradeoff_explainer.js`):** Non-index array properties (`paretoFrontier`, `evaluatedCandidateSet`) attached to candidate arrays vanish under standard `.map(...)` transforms unless copied via `Object.getOwnPropertyDescriptors`, breaking `SI-06` Pareto certification.
- **One-Way DAG Promotion Separation (`INV-279`):** Extract shared promotion logic into `scripts/lib/feedback/instruction_promoter.js` so both `scripts/maintenance/promote_learned_instructions.js` and `scripts/maintenance/evaluate_solution_intelligence_quality.js` depend one-way with zero cycles (`test:circular`).
- **Ephemeral Test Telemetry Isolation (`INV-278`):** Under `NODE_ENV === 'test'` or `NODE_TEST_CONTEXT`, `scripts/lib/system/telemetry.js` isolates writes into `_ephemeralTestStores` unless `telemetryFile`, `ANTIGRAVITY_TELEMETRY_FILE`, or `SKILL_ISOLATION_ROOT` is set, protecting production `pipeline_telemetry.json`.
- **Windows Junction Vitest & React Portal Selectors:** Run `npm.cmd test --workspace=dashboard` instead of `npx --prefix dashboard vitest` across Windows directory junctions; wait explicitly for `#boq-file-input` after `/api/health` policy hydration and scope Playwright modal outcome locators inside `[role="dialog"]` so `#root` hidden tabs never shadow portal cards.
- **Catalog Identity, Snapshot Index Cache & Serializer Trim:** Propagate `catalogProductId` from `chassis_base_skus_by_family_gen` onto `chassis_base_skus` in `scripts/lib/catalog/catalog_discovery.js`; maintain stat-fingerprinted `snapshotIndexCache` in `scripts/lib/catalog/sku_versioning.js` (eliminating `O(SKUs × Snapshots)` JSON re-parsing); omit `catalogData`/`catalogRules` from `_buildNestedEvalResults` in `scripts/lib/boq/eval_output_serializer.js`; return `UNKNOWN` (never `PASS`) in `composite_solution_validator.js` (`B25`) when transceiver speed or SAN port denominators are absent.
