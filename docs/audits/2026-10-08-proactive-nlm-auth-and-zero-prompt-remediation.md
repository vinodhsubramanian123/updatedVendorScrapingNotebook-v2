# Proactive NotebookLM Auth Pre-Flight & Non-Interactive Recovery Audit

**Date:** 2026-10-08  
**Scope:** Universal Gemini NotebookLM Authentication Lifecycle & Pipeline Hardening  
**Governance:** `INV-157` (Proactive Headless Pre-Flight & Friction-Free Zero-Prompt Recovery)  
**Author:** Lead Solution Execution Architect (Antigravity)

---

## 1. Executive Summary & Problem Diagnosis

Google NotebookLM requires authenticated web session cookies (`SID`, `HSID`, `SSID`, CSRF token) tied to a personal Google account (`vinodhsubramanian@gmail.com`). Google terminates and rotates these session cookies every 7 to 14 days. 

In prior sessions, credential expiration created significant developer friction and token waste due to four systemic failure modes:
1. **Late Reactive Failure**: Sync and BOQ evaluation pipelines executed multi-minute diffing, Excel compilation, and Markdown projection before discovering authentication was dead at the final upload step.
2. **Terminal Keystore Prompt Freeze**: Running `nlm login` interactively prompted:
   ```text
   Protect the 'default' saved login in your OS keystore? [y/N]:
   ```
   This blocked headless automation, confused terminal runners on whether to input `Y` or `N`, and required interactive intervention.
3. **Stale Session Stagnation**: Invoking `nlm login` without flags sometimes inspected stale local profile caches and reported "Authentication valid!" without opening Chrome, even though Google had already invalidated the session on their servers.
4. **Running Process Memory Lag**: Background MCP servers and running agent instances held stale in-memory auth caches after terminal re-authentication unless restarted.

---

## 2. Hardened Architecture & Invariant Codification (`INV-157`)

### 2.1 The `--storage file` Zero-Prompt Breakthrough
Investigating the `nlm login` CLI options revealed the `--storage` argument:
- `nlm login --storage file`: Directly writes credentials to `~/.notebooklm-mcp-cli/profiles/default/`, **completely bypassing the interactive OS keystore `[y/N]` prompt**.
- Combined with `--force`, the command:
  ```powershell
  nlm login --force --storage file
  ```
  unconditionally launches Chrome, captures fresh Google session cookies upon account selection (~10 seconds), automatically closes Chrome, and saves tokens cleanly with zero terminal prompts.

### 2.2 Proactive Headless Pre-Flight Gate
Rather than waiting for failure during a sync or evaluation pipeline:
- `nlm login --check` executes a fast (<2s) headless API probe.
- Exits `0` if credentials and RPC tokens are valid.
- Exits `1` if credentials are stale or expired.
- Exposed via dedicated npm script:
  ```powershell
  npm run auth:nlm:check
  ```

### 2.3 Instant In-Memory Hot-Reload
Following terminal re-authentication, the agent invokes `call_mcp_tool('gemini-notebook-mcp', 'refresh_auth')`. Fresh tokens from disk are reloaded into server memory immediately without restarting Antigravity, VS Code, or background processes.

---

## 3. Implemented Code Changes

1. **New Automated Health Checker**:
   - Created `scripts/maintenance/check_nlm_auth.js` providing programmatic verification and clear remediation formatting.
   - Added `"auth:nlm:check": "node scripts/maintenance/check_nlm_auth.js"` in `package.json`.
2. **Pipeline Pre-Flight Hardening**:
   - `scripts/lib/sync/nlm_sync_client.js:syncToNotebookLMWithinLease` now runs `nlm login --check` before uploading payloads. Expired auth fails closed upfront with the non-interactive remediation command.
3. **Query Diagnostics Guidance**:
   - `scripts/lib/notebook/query_diagnostics.js:diagnoseNotebookFailure` now specifies `nlm login --force --storage file` rather than plain `nlm login`.
4. **Skills & Invariant Documentation**:
   - Updated `.agents/skills/nlm-skill/SKILL.md` (Rule 1) and `.agents/skills/nlm-skill/references/troubleshooting.md`.
   - Formally cataloged `INV-157` in `docs/INVARIANTS.md`, `AGENTS.md`, and `GEMINI.md`.

---

## 4. Verification & Certification Results

- **Headless Health Check**: `npm run auth:nlm:check` passed in 4.1s with exit code 0 (`Account: vinodhsubramanian@gmail.com, Notebooks: 43`).
- **Catalog Refresh Contract**: `tests/unit/test_catalog_refresh_contract.js` passed 12/12 tests in 2.98s.
- **Solution Source Validator**: `tests/unit/test_nlm_solution_source_validator.js` passed 7/7 tests in 1.57s.
- **OxLint Sanity Check**: `npm run lint:core` passed with 0 errors across 454 files.
