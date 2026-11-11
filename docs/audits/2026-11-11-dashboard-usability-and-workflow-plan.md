# Dashboard usability, workflow reliability and motion

Reviewed 11 November 2026 against `65dd4165`, the commit advertised by GitHub for `main`. This is a review and implementation plan. Findings marked as reproduced used local checks or a browser with controlled workflow events.

## Current assessment

The dashboard has working desktop navigation, a searchable portfolio, a catalog explorer, BOQ intake, a resolution matrix, telemetry and settings. Its workflow controls are split across the presales form, macro lifecycle, stepper, evaluator dialog and operations tab. A first-time user must infer which entry point to use, where the result will appear and which action is safe to take next. The desktop layout is readable with styles loaded. The running view needs more informative status and the narrow layout needs work.

| Priority | Finding | Evidence and impact |
| --- | --- | --- |
| P1 | The presales BOQ path drops the local-only choice | With local-only checked, the browser fixture sent `offlineMode: true` to classification, omitted `offline` from `/api/eval-boq`, then called `/api/notebook-query-async` after a fixture result supplied a grounding payload. All three requests used local stubs. The evaluator reads `offline` on its direct request. [Form and submit path](../../dashboard/src/components/PresalesRequestPanel.jsx#L70) · [Server option](../../dashboard/routes/evaluation.cjs#L174) · [Deferred query](../../dashboard/src/App.jsx#L488) |
| P1 | Refresh can mix runs and lose their outcomes | A direct run-state check recorded a late update and log for run A while B was active. The snapshot stored A as the latest result and retained its log under B. A terminal event clears the active run without keeping a terminal record in the snapshot. The presales panel also accepts routed results by product alone. Evaluation start events omit the product. [Snapshot capture](../../dashboard/services/runState.cjs#L25) · [Routed result handler](../../dashboard/src/components/PresalesRequestPanel.jsx#L48) · [Evaluation start](../../dashboard/routes/evaluation.cjs#L193) |
| P1 | Platform clarification cannot reliably resume after refresh | The evaluation route deletes a temporary intake before publishing the result. A refreshed browser attempts to replay the stored file path and hash. The earlier in-memory input can still work in the original tab, which hides the problem in normal click-through testing. Source-confirmed for temporary text intake and affected uploads. [Cleanup](../../dashboard/routes/evaluation.cjs#L290) · [Resume logic](../../dashboard/src/App.jsx#L519) |
| P1 | Progress graphics show unsupported or mislabeled progress | Chromium showed 45% and “Starting…” on a routed workflow before any progress event. The lifecycle stepper maps engine step 4 to ranking and step 5 to post-verification. Those events describe storage and networking checks. The direct status check also showed no active mapped stage for steps 8 and 9, where the evaluator emits grounding, ranking and candidate validation events. [Global loading](../../dashboard/src/components/GlobalLoadingState.jsx#L11) · [Stage mapping](../../dashboard/src/services/workflowEvidence.js#L43) · [Engine checks](../../scripts/lib/boq/boq_evaluator.js#L1504) · [Grounded review](../../scripts/evaluators/eval_boq.js#L849) |
| P1 | The production layout depends on a remote script | Blocking the Tailwind CDN in Chromium changed the sticky header to static and the flex navigation buttons to inline blocks. Restricted-network or offline use loses core layout styling. [HTML entry point](../../dashboard/index.html#L8) |
| P2 | Narrow layouts and workflow status need accessibility work | At a 390 px viewport the document expanded to 548 px and clipped header health controls. The tested running view exposed no live region or progressbar semantics. Reduced-motion mode suppressed the tested animation. [Header](../../dashboard/src/components/Header.jsx#L126) · [Navigation](../../dashboard/src/components/header/NavigationTabs.jsx#L22) · [Reduced motion](../../dashboard/src/styles/index.css#L586) |
| P2 | Users have to translate internal workflow terms and raw output | Presales classification displays machine intent names. The generic routed result renders a small item table when present and otherwise relies heavily on structured output. The default evaluation page exposes several representations of the lifecycle before giving users a clear path from input to outcome. [Presales panel](../../dashboard/src/components/PresalesRequestPanel.jsx#L12) · [Default evaluator workspace](../../dashboard/src/App.jsx#L257) |

## Implementation sequence

### 1. Make execution policy and run ownership reliable

- Carry the selected product, exact base where known, workflow intent and execution policy from preview through execution, retry, clarification and result. Enforce local-only mode on the server for the job and all deferred work. Surface cloud-only requirements such as OCR as actionable intake states.
- Maintain one server-held run record per run ID with a scoped event cursor, active stage, last update, terminal outcome, and result or diagnostic. Keep logs and updates attached to their run. Restore the active run and selected historical run separately. Bind candidate-dependent actions to the selected run and manifest.
- Restore the original intake for a pending clarification using a run-owned reference with bounded retention and hash verification. If recovery is unavailable, ask for re-upload before enabling the replay action.
- Bundle CSS with the production build and exercise the app with external requests blocked. Keep the development and production startup checks independently runnable.

### 2. Give users one starting point and a clear path to results

- Open on a request workspace with prominent choices for **Evaluate a BOQ**, **Size a solution**, **Compare quotes** and **Ask a catalog question**. Keep natural-language routing available in the same workspace. Show the selected product and execution mode next to the run button. Reveal additional files, platform selection and scope controls as the chosen workflow needs them.
- Keep the run summary available across tabs with product, current stage, elapsed time, last update, cancellation state and a link to the full run. Preserve the user’s current view when another run completes. Keep operational controls under **Pipeline Ops** and provide direct links to catalog, audit and telemetry details from results.
- Give each workflow an outcome view with a plain-language status, blockers and the next action. BOQ and sizing need candidate comparison and evidence. Reconciliation needs matched, missing, substituted and extra items with quantity and price deltas. Catalog questions need an answer, sources and scope. Keep structured diagnostics expandable.
- Show physical checks, document grounding, vendor acceptance, delivery authorization and cloud sync as separate states. Distinguish a completed process from an approved configuration. Make a blocked action explain which evidence or input it requires.

### 3. Use motion to make changes in state visible

- Drive a single primary run indicator from explicit engine stage IDs and events. For known stage counts, show “Stage 3 of 7” and the stage name. For unmeasured work, show “Waiting for NotebookLM” or the relevant action with elapsed time and an indeterminate indicator. Elapsed time and network freshness should update independently of stage progress.
- Animate the active-stage change and completion once with a short transition. Keep stage labels and controls in place as updates arrive. Use a small activity indicator while the engine is working. Reserve skeletons for initial data loads. Show demonstrations in a clearly labeled simulator.
- Give reconnecting, waiting for input, cancelling, cancelled, failed and completed runs distinct text states. Announce meaningful changes through a live region. Expose measured progress with accessible names and values. Keep the same information available in reduced-motion mode, through keyboard interaction and without relying on color.
- At 390 px, stack product and search controls, keep navigation discoverable and keep the run summary and primary action visible. Allow wide data tables to scroll inside their own region.

## Acceptance matrix

| Workflow | What to verify before sign-off |
| --- | --- |
| BOQ intake and evaluation | Paste and upload supported spreadsheets, text and OCR fixtures. Cover bad files, local-only OCR, preflight and split, unclear platform, refresh before clarification, multi-configuration input, scoped aspects, warnings and blocked delivery. |
| Routed presales | Classify and execute sizing, cross-vendor transformation, reconciliation, catalog intelligence and freeform queries using supported fixtures. Verify ambiguity, edits during execution, correct product and execution mode, and a readable outcome for each route. Assert no cloud calls for local-only runs. |
| Resolution, topology and export | Compare candidates and inspect topology and evidence. Download an authorized fixture and match its bytes and manifest. Show reasons for blocked export. Verify a changed rank or manifest invalidates stale acceptance and late RAG results cannot modify the current run. |
| Catalog and portfolio | Switch products during an in-flight request. Verify family and health filters, SKU search, rules, lifecycle, price history, missing prices, unknown health, and empty or unavailable catalogs across server, storage, fabric and tape examples. |
| Pipeline Ops, artifacts and audit | Check selected-product and all-product scopes, prerequisite errors, progress and cancellation, run history, downloads, evidence inspection and safe retries. Confirm the launched command and scope in the run record. |
| NotebookLM, telemetry, feedback and settings | Verify grounded, degraded and offline displays, mapping edits and persistence, feedback and quarantine actions using fixtures, audit and telemetry readbacks, loading and failure states, and keyboard operation in each drawer. |
| Recovery, motion and accessibility | Exercise two tabs, refresh during every run state, disconnect across completion, replay duplicate or late events, and restart the server. Test 390, 768 and 1440 px, keyboard-only use, zoom, reduced motion, screen reader announcements and CDN blocking. Each screen should identify the active or historical run and give a clear next action. |
| Live integration | Use dedicated validation inputs to exercise HPE authentication and CLIC receipt binding, NotebookLM grounding and cloud readback. Record the product, manifest, evidence and result for each integration exercised. |

Have a first-time presales user complete one BOQ evaluation and one quote comparison without coaching. Ask them to identify the active product, interpret the result, find the evidence and explain whether export is available. Use observed hesitation and wrong turns to prioritize refinements.

## Checks performed

- Production build passed. The existing Chromium smoke test passed for navigation, sample BOM population, portfolio search and settings dismissal. It did not submit the sample for evaluation or verify live services.
- Frontend tests passed 68/68. API route tests passed 9/9 and the service lifecycle test passed 1/1 in offline test mode against the production build. The first route test invocation timed out waiting for the development server to start.
- Lint, the repository complexity gate and the circular dependency check passed. Browser checks with controlled events reproduced local-only request handling, progress, narrow-screen and CDN issues. Direct state checks reproduced the stale update and stage mapping issues.
- Reviewed source directly after the Graphify index was unavailable. The separate Codex CLI peer review could not open the repository because its Windows tool runtime failed to launch.
- Live HPE OCA/CLIC, NotebookLM, cloud sync, authenticated export and full pipeline execution coverage remain open. The checked-in browser smoke result supports basic desktop interaction coverage.
