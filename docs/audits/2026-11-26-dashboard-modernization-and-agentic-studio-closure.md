# 2026-11-26 Dashboard Modernization & Agentic Studio Closure

**Base:** `0456ce8f`. **Invariants:** `INV-287`, `INV-288`.

## Delivered
- Enterprise shell: grouped `Sidebar`, `56px` `Header`, `CommandOmnibox`, mobile nav strip with `More dashboard views` select, Light default + Dark tokens (`useTheme`), live `AgenticExecutionTimeline`.
- Wave B-F UI: hardware envelope (`HardwareEnvelopeView`, `CatalogEnvelopePanel`), closure status (`ClosureStatusStrip`), portfolio/manifests + 5 vendor adapters, model routing panel, multi-notebook fan-out.
- 3-tier presales runtime (`agent.cjs`, `presales_copilot_agent.js`, `agy_escalation_bridge.js`) with strict `OFFLINE_MODE` (`INV-288`).
- 3D complexity ratchet (`INV-287`).
- Codex follow-up: exact-SKU search, modal focus handling, server-sourced timeline tiers, aborted telemetry requests, lazy-loaded Settings/RAG drawers.
- Visual QA & End-to-End Runtime fixes (`2026-11-27`): 390px/768px `MobileNavStrip` grid overlap, Light/Dark contrast on `BOM Reconciliation` banner & `.badge-indigo` & `.bg-emerald-50/70`, live `GEMINI_AGENT` + live `AGY_DEEP` + multi-turn `ClarificationPromptCard`, inline `Correct / Teach Studio` → `Analyze with Antigravity` (`HTTP 200` `RULE_DELTA_PROPOSAL`), `1-Click E2E Scrape` + guarded onboarding (`POST /api/scrape-e2e`, `POST /api/onboard-product`), Cross-Vendor Dell R760 → DL380 Gen12 + `BUILDABLE · PORTAL PENDING` comparison badges, `Visual Topology` GAP labels/layout & `POST /api/notebook-query-async` `HTTP 202` resolution.

## Verification (final run)
`lint:all` 0/0 · `lint:complexity` 0 breaches (`CC<=20`, `LOC<=80`, `Nest<=4`) · `test:circular` 0 cycles · `test:deadcode` 4 allowlisted · `test:skills` 40/40 · Vitest 100/100 · `test:smoke` 8/8 · `test_agent_copilot_and_intelligence_routes` 6/6 · `test_vendor_adapter_registry_and_onboarding` (`17` active + `2` quarantined stubs) · build passed · browser release gate & full portfolio E2E passed · live `/browser` verification on `http://localhost:3318` passed (`0` console errors, `0` HTTP `409`s). See [walkthrough.md](../plans/walkthrough.md).

## Open
Per-customer HPE OCA (`CLIC`) portal receipt acceptance and live authenticated SSO portal scraping remain **`PORTAL VALIDATION PENDING`** until run inside an interactive HPE Partner Portal Chrome session.
