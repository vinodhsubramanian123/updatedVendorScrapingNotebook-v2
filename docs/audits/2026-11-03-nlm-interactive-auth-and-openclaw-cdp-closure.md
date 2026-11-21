# NotebookLM Interactive Auth & OpenClaw External CDP Closure Audit — 3 November 2026

## 1. Executive Summary & Problem Scope

This audit resolves recurrent authentication failures, stuck Google Chrome windows, and broken credential-healing loops encountered during NotebookLM CLI and MCP operations on Windows/PowerShell environments.

### 1.1 The Failure Symptoms
When users or automated scripts executed `nlm login`, `nlm login --check`, or `npm run auth:nlm:heal`:
1. The browser failed to open, hung indefinitely, or exited prematurely.
2. The CLI reported `spawnSync nlm ETIMEDOUT` or `AuthenticationError: The NLM auth profile is locked but no browser instance was found`.
3. If Chrome did open, Google Sign-In occasionally threw `"This browser or app may not be secure. Try using a different browser"`, blocking authentication entirely.
4. Subsequent retries failed immediately due to dangling `SingletonLock` files left in `~/.notebooklm-mcp-cli/chrome-profiles/default/`.

### 1.2 The Manual Workaround
The user previously solved this manually via a multi-step sequence suggested by OpenAI Codex:
```powershell
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
& $chrome "--user-data-dir=$env:LOCALAPPDATA\NlmInteractiveChrome" --remote-debugging-port=18801 --new-window 'https://notebooklm.google.com/'

nlm login --profile default --provider openclaw --cdp-url http://127.0.0.1:18801
nlm login --profile default --check
```

This audit codifies the underlying root causes, institutionalizes this workaround into an automated, permanent zero-friction system (`INV-227`), and certifies complete regression safety.

---

## 2. Root Cause Analysis

### 2.1 Windows Child Process Handoff
Under `nlm login` (default `builtin` provider), `notebooklm-mcp-cli` spawns Chrome via Python `subprocess.Popen`. On Windows, if Google Chrome is already running under the user's desktop session, the newly spawned Chrome process delegates its command-line invocation to the existing Chrome master process and the child launcher process immediately terminates (`launcher_exited = True`). `cdp.py` detects that the spawned PID exited, fails to bind a matching listener, and either hangs or raises `AuthenticationError("Failed to launch browser")`.

### 2.2 Profile Directory Lockfile Traps (`SingletonLock`)
Abnormally terminated or timed-out Chrome processes leave `SingletonLock`, `lockfile`, `SingletonCookie`, and `SingletonSocket` behind in the profile directory. `cdp.py:is_profile_locked` treats these stale locks as an active browser, aborting any fresh launch attempt before the network socket is even probed.

### 2.3 Google OAuth Automated Bot Detection
When Chromium is spawned with raw automated test flags (`--headless`, `--disable-extensions`, and temporary test profile paths), Google's OAuth endpoints flag the browser as an automated test runner, presenting the `"This browser or app may not be secure"` interstitial. Launching Chrome as a genuine foreground desktop application directly from the OS shell bypasses this heuristic.

### 2.4 Port Segregation & Stdio Hanging
- Port `9222` is reserved for HPE Partner Portal / OCA scraping via `.chrome_sso_profile`.
- Port `18800` is `nlm`'s default internal port, prone to collisions with orphaned headless processes.
- In Node.js environments, executing `execFileSync('nlm', ...)` without `stdio: ['ignore', 'pipe', 'pipe']` caused Python/Typer stdin checks to block on unclosed input pipes, leading to artificial 45-60s timeouts.

---

## 3. Implemented Architecture (`INV-227`, Hardened by `INV-269` on 2026-11-21)

### 3.1 Automated Interactive Engine (`scripts/maintenance/nlm_interactive_auth.js`)
A dedicated cross-platform lifecycle manager that handles:
1. **Unified Chrome Profile Directory (`INV-269`)**: Uses `~/.notebooklm-mcp-cli/chrome-profiles/<profile>` (`getNlmProfileDir(profile)`) — the exact profile directory expected by `notebooklm_tools.utils.auth_browser.run_headless_auth` and `cdp_transport.py`. On first run, `syncLegacyInteractiveProfile()` automatically migrates `Local State` (the Windows DPAPI AES cookie encryption key) and `Default/Network/*` session databases (`20` files) from the legacy `%LOCALAPPDATA%\NlmInteractiveChrome` directory and writes `.nlm_legacy_migrated.json`. **Never split interactive port `18801` Chrome and `notebooklm-mcp-cli` across separate `--user-data-dir` paths**, or automatic headless refresh of rotating Google session cookies (`__Secure-1PSIDRTS`, `SIDCC`, `SNlM0e`) will fail every day.
2. **Port Probing & `chrome-port-map.json` Registration (`INV-269`)**: Checks `http://127.0.0.1:18801/json/version` and calls `registerPortMapEntry(18801, profile)` (using fast native `netstat.exe -ano -p tcp`) to write `{"18801":{"profile":"default","pid":<pid>}}` into `~/.notebooklm-mcp-cli/chrome-port-map.json`. This allows Python's `find_existing_nlm_chrome('default')` and `run_headless_auth('default')` to reuse the live port `18801` browser directly without spawning a conflicting port `9223` browser against the same profile directory.
3. **WMI Job-Object Detached Desktop Launch (`INV-253`, `INV-269`)**: On Windows, `spawnChromeDetached` spawns Chrome via WMI `Invoke-CimMethod -ClassName Win32_Process -MethodName Create` (parented by `WmiPrvSE.exe`, without contradictory `detached: true` + `windowsHide: true` flags on the PowerShell launcher). This detaches Chrome from the ephemeral PowerShell tool session's Windows Job Object (`KILL_ON_JOB_CLOSE`) so port `18801` remains alive permanently across turns.
4. **OpenClaw CDP Extraction**: Executes `nlm login --profile default --provider openclaw --cdp-url http://127.0.0.1:18801 --storage file --force` with `stdio: ['ignore', 'pipe', 'pipe']`, extracting cookies and CSRF tokens in **~2 seconds**.
5. **Credential Validation**: Validates the extracted session via `nlm login --profile default --check`.

### 3.2 Unified Auto-Heal (`scripts/maintenance/check_nlm_auth.js`, `check_all_auth.js`, `nlm_sync_client.js`)
Updated `checkAuthHealth({ autoHeal: true })`:
- Programmatic `checkAuthHealth()` calls default to `autoHeal: false` (strictly read-only probe, never deleting locks or spawning browsers).
- CLI invocations of `check_nlm_auth.js` (`npm run auth:nlm:check` / `npm run auth:nlm:heal`), `check_all_auth.js` (`auditNotebookLm`), and pre-flight validation in `nlm_sync_client.js` (`_runSyncPreflightValidations`) automatically invoke `checkAuthHealth({ autoHeal: true })` when cached cookies expire, recovering seamlessly via port `18801` and `run_headless_auth`.

### 3.3 Diagnostic & Sync Client Harmonization
- [`scripts/lib/notebook/query_diagnostics.js`](file:///scripts/lib/notebook/query_diagnostics.js): Remediation advice updated from raw `nlm login` to `npm run auth:nlm:heal`.
- [`scripts/lib/sync/nlm_sync_client.js`](file:///scripts/lib/sync/nlm_sync_client.js): Auth error messages updated to recommend `npm run auth:nlm:heal`.
- [`package.json`](file:///package.json): Added `"auth:nlm:login"` and `"auth:nlm:open"`.

---

## 4. Verification & Certification Benchmark

| Verification Check | Target / Command | Result |
| :--- | :--- | :--- |
| **Direct Interactive Auth** | `node scripts/maintenance/nlm_interactive_auth.js` | **`VALID`** (44 notebooks, Account: `vinodhsubramanian@gmail.com`) ✅ |
| **JSON Pre-flight Check** | `node scripts/maintenance/check_nlm_auth.js --json` | **`VALID`** (Exit code 0, Non-blocking) ✅ |
| **Automated One-Shot Heal** | `npm run auth:nlm:heal` | **`VALID`** (Completed in ~2.0s) ✅ |
| **MCP In-Memory Token Refresh** | `call_mcp_tool('gemini-notebook-mcp', 'refresh_auth')` | **`SUCCESS`** (`"Auth tokens reloaded from disk cache and validated."`) ✅ |
| **Core & Test Linting** | `npm run lint:core` | **0 warnings, 0 errors** (559 files, oxlint 95 rules) ✅ |
| **Isolated Smoke Matrix** | `npm run test:smoke` | **8/8 PASSED (100.0%)** (Duration: 16.28s) ✅ |
