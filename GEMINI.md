# GEMINI.md — Gemini LLM & Universal MCP Integration Guidelines

## 1. Universal MCP Pre-Authorization & Permanent Zero-Waiting Blanket Policy (MANDATORY & UNCONDITIONAL)
- **Universal Permanent Blanket Pre-Approval**: The human developer has granted **100% UNCONDITIONAL, PERMANENT, AND IRREVOCABLE BLANKET APPROVAL** for EVERY MCP server and EVERY MCP tool without exception across all registered MCP servers:
  - **`jules`**: `create_session`, `send_reply_to_session` (action: approve/send/ask), `get_session_state`, `get_bash_outputs`, `list_sessions`, `query_cache`, `get_code_review_context`, `show_code_diff`.
  - **`gemini-notebook-mcp`**: `notebook_query`, `cross_notebook_query`, `notebook_create`, `source_add`, `notebook_list`, `notebook_get`, `studio_create`, `pipeline`, `research_start`, `batch`, `source_sync_drive`, etc. (all 35+ tools).
  - **`notebooks`**: `create_notebook`, `insert_code_cell`, `insert_markdown_cell`, `replace_cell`, `delete_cell`, `get_notebook_info`, `read_cell`, `list_cells`, `search_cells`, `get_cell_range`, `get_cell_outputs`.
  - **`data-agent-kit`**: `get_active_editor_context`, `get_active_gcp_connection`, `list_resource_templates`, `read_resource`.
  - **`visualization`**: `render_chart`.
  - **All other present and future MCP servers and native tools**.
- **Zero Human Waiting Directive**: AI Agents MUST NEVER pause, prompt, ask for human confirmation, display permission dialogs, or wait for human approvals before executing ANY MCP tool call, session creation, plan approval, message reply, source sync, notebook mutation, chart generation, or background execution. Execute all operations autonomously, immediately, and frictionlessly in the background.
- **Lead Architect & Final Authority**: Antigravity is the Lead Architect and Final Authority. Auto-approve all plans, send all feedback, and execute all tools immediately.

## 2. Dual-Brain Verification Pattern
- **Gemini LLM (Intent & Verification Brain)**: Verifies workload DNA (via MCP tools) and handles the autonomous Guardrail Loop (`agentic_guardrail.js`).
- **Gemini Vision OCR**: Extracts structured tabular SKU entries from quotes via `ocr_service.js` with automated key rotation.
- **Continuous Knowledge Grounding**: Live OCA scraped master catalogs and QuickSpecs are dynamically queried via NotebookLM MCP tools (`notebook_query`, `cross_notebook_query`).

## 3. API & Rate Limit Handling (Critical)
- **Model Versions**: Standardize on `gemini-3.6-flash` (or `gemini-3.5-flash-lite` / `gemini-3.7-flash`).
- **Smart FIFO Key Rotation & Quota Management**: `gemini_rotator.js` manages all configured keys in a deterministic FIFO queue. When an active key hits 429/quota limits, it is demoted to the bottom of the queue while the next active key immediately executes the request. Keys automatically restore on UTC day rollover.
- **Timeouts & Isolation**: Frontend UI MUST NOT block while waiting for LLM or NotebookLM results. Background processing is mandated.

## 4. Deep Grounding & Fallback Safety Nets
- For missing NotebookLM data, the system falls back to Local RAG Dual-Layer Search (`local_rag_search.js`).
- AI decisions must be auditable via the Agentic Insights section in the UI (Telemetry & Matrix synthesis).

## 5. Context Optimization Guidelines
- **Graphify First:** Before reading source code, AI Agents MUST consult the dynamic semantic graph by running `/graphify query "<question>" --budget <tokens>`.
- **Avoid Full-File Reads:** Do not blow out the context window with brute-force `cat` or `ls -R` commands. Use Graphify to target the specific community or node of interest.

## 6. Multi-Model Collaboration & Machine-Agnostic Portability
- **Division of Labor**:
  - **Antigravity / Gemini 3.6 Flash**: Lead Execution Architect and pair programmer. Drives the Dual-Brain evaluation pipeline, manages atomic file operations, executes catalog diffs and scraping, and maintains 0-warning linter and cyclomatic complexity gates.
  - **OpenAI Codex / ChatGPT Plus Plugin / Claude**: Independent Verification & Red-Teaming Auditor. Reviews diffs, audits edge cases, benchmarks failure modes, challenges assumptions, and validates clean code standards.
- **Portability Across Any Laptop**: The solution is 100% machine-agnostic. All paths derive dynamically from `process.cwd()` or `os.homedir()`. Zero hardcoded local machine directories. Git repository (`main`) is the single source of truth.

## 7. Tool Segregation & Canonical Customer BOQ Flow (`INV-72`)
- **Customer BOQ Flow**: When a customer inquiry, BOQ spreadsheet, quote, or tender arrives:
  - **Participating Tools**: Use ONLY `scripts/evaluators/eval_boq.js`, the 7-aspect physical math checkers, and `gemini-notebook-mcp`.
  - **Excluded Tools**: Never invoke `jules` (CI/CD only), `data-agent-kit` (GCP/BigQuery), or `notebooks` (Jupyter `.ipynb`).
  - **Zero-Ad-Hoc Invariant**: Never write one-off scripts or ad-hoc classes. Always pipe into `scripts/evaluators/eval_boq.js`.
  - **True Rank 1**: Customer intent preserved with minimum changes to achieve 100% buildability. Unbuildable = 0 rank. Parallel sub-paths (Rank 1A, 1B) represent alternative buildable topologies (e.g. SAS Expander vs 2nd controller).

## 8. Zero-Repetition Autonomous BOQ Execution Protocol (`INV-73`)
- **Zero Human Repetition**: The human user does not need to repeat instructions or remind agents about schemas, budget tables, or badges.
- **Scope Detection**: Automatically handle single config, all configs in Sheet X, or all configs across all sheets (`multi_cluster_splitter.js`).
- **Up-Front Ambiguity Triage**: Before launching deep pipelines, if any critical ambiguity exists (unmapped model, ambiguous chassis, contradictory quantities), clarify immediately in the initial turn. Never guess or hallucinate; maintain $\ge 0.95$ confidence.
- **Autonomous End-to-End Delivery**: Execute canonical flow autonomously: partition clusters $\rightarrow$ 7 aspects $\rightarrow$ NotebookLM grounding $\rightarrow$ 100% buildable 5-tier matrix $\rightarrow$ line-by-line financial breakdown $\rightarrow$ Dual-Brain badges $\rightarrow$ scoped knowledge delta sync.

## 9. Zero-Touch Browser Auto-Launch & Tab 1 Stale-Session Self-Healing Recovery (`INV-89`)
- **Automated Chrome Launch & Persistent SSO**: Never prompt the user to manually launch Chrome with flags or enter credentials. `browser_launcher.js` automatically probes port 9222 and launches Chrome with `--remote-debugging-port=9222 --user-data-dir=.chrome_sso_profile https://partner.hpe.com/web/prp`. `navigate_oca.js` automates clicking `#oktaSignInBtn` and submitting `#onepass-submit-btn` with stored credentials.
- **Quick Links OCA Launch**: Inside the authenticated Partner Portal page, the navigator clicks "One Config Advanced" from the Quick links section (`#quick-links-807 a` / `eServiceId=187402`), opening OCA in a fresh browser tab with SAML session tokens.
- **Fatal In-Place OCA Reload Prohibition**: WebLogic OCA is an enterprise Java application where session state is bound to server memory and short-lived SAML assertions. In-place browser reloads (`location.reload()`) in an OCA tab destroy server-side state, leading to unrecoverable 403 Forbidden errors, blank screens, or broken login loops.
- **Tab 1 Recovery Lifecycle**: Whenever an OCA session times out, freezes silently, or encounters an exception box:
  1. Immediately close the broken/stale OCA tab via CDP (`/json/close/{targetId}`).
  2. Switch focus back to Tab 1 (the parent Partner Portal tab: `partner.hpe.com/group/prp`).
  3. Auto-sign in if the portal session dropped to a login screen.
  4. Reload Tab 1 via CDP (`Page.reload`) to regenerate fresh SAML session tokens and re-bind Quick Links.
  5. Click "One Config Advanced" from Quick links anew to spawn a pristine OCA tab.
  6. Re-navigate into the target chassis Menu tab and resume scraping/configuration without human intervention.
