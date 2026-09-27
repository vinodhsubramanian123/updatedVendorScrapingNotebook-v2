# ANTIGRAVITY AUTONOMOUS MIGRATION & RESTORATION GUIDE

This document provides definitive, zero-gap instructions for migrating the **HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine** across any development laptop:
- 🐧 **Linux Mint / Ubuntu / Debian**
- 🪟 **Windows 10 / 11 (PowerShell / CMD)**
- 🍎 **macOS Monterey 12.7+ (MacBook Air / Pro — Intel & Apple Silicon)**

---

## ⚡ Option 1: Autonomous One-Command Restoration (RECOMMENDED)

On the new machine:

1. **Clone the repository and install Node dependencies:**
   ```bash
   git clone <repo-url>
   cd vendorNotebookSolution
   npm install
   ```

2. **Download `antigravity_migration_bundle.zip`:**
   Place `antigravity_migration_bundle.zip` (from your Google Drive) into your `~/Downloads` folder or the repository root.

3. **Run the autonomous restorer:**
   ```bash
   npm run restore:env
   ```
   *Or directly:*
   ```bash
   node scripts/maintenance/restore_env.js
   ```

### What `npm run restore:env` executes automatically:
- 🖥️ **Detects Host OS**: Automatically senses Linux Mint, Windows 10/11, or macOS Monterey 12.7 (Darwin, Intel/ARM).
- 🔑 **Restores `.env`**: Places `.env` with Gemini API key pools and rotation configuration at repo root (automatically sanitizing host-specific `PATH` variables).
- ☁️ **Restores Google Cloud ADC**: Restores `application_default_credentials.json` and `client_secret.json` to:
  - Linux / macOS: `~/.config/gcloud/`
  - Windows: `%APPDATA%\gcloud\`
- 📓 **Restores Google NotebookLM Session**: Copies `auth.json` and profile cookies into `~/.notebooklm-mcp-cli/` so all 35+ `gemini-notebook-mcp` tools connect immediately without browser re-login.
- 🧠 **Restores Brain History**: Syncs `master_knowledge_registry.json`, price trails, and execution ledgers into `outputs/history/`.
- ⚙️ **Configures Global MCP Servers**: Generates machine-accurate `~/.gemini/config/mcp_config.json` tailored to the local binary paths (`gemini-notebook-mcp`, `jules`, `graphify`).
- 🌐 **Browser Setup**: Configures Playwright Chromium; on macOS Monterey (mac12), automatically falls back to system Google Chrome (`/Applications/Google Chrome.app`).
- 🐍 **Installs Python Tools**: Auto-installs `notebooklm-mcp-cli` and `graphifyy` via `uv` or `pip`.
- 📊 **Verifies Google Cloud ADC & Drive/Sheets Health**: Validates token freshness and scope coverage, alerting if autonomous refresh (`npm run auth:drive`) is needed.
- 🏗️ **Verifies Dashboard Production Build**: Executes `npm run build` on the host OS to ensure 0 build warnings/errors.
- 🛡️ **Verifies 8 Enterprise Guardrails**: Executes `npm run guardrail:check` and outputs an 8/8 verified status report.

---

## 📦 Creating a New Migration Bundle (When Leaving Current Machine)

Whenever you switch from this laptop to another:
```bash
npm run bundle:env
```
*Or directly:*
```bash
node scripts/maintenance/create_migration_bundle.js
```
This script packages all active credentials, Google Cloud ADC, NotebookLM tokens, and knowledge history into `~/Downloads/antigravity_migration_bundle.zip`. Simply upload that zip to Google Drive!

---

## 🛠️ Option 2: Manual Step-by-Step Installation Matrix

If you ever need to set up prerequisites from scratch on a clean OS:

### 1. Node.js (>=20.19.0)
- **Linux Mint / Ubuntu**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **Windows**:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
- **macOS (Monterey / Ventura / Sonoma / Sequoia)**:
  ```bash
  # Using official pkg installer from nodejs.org OR via Homebrew:
  brew install node
  ```

### 2. Google Chrome (Required for Live Scraping on CDP Port 9222)
- **Linux**:
  ```bash
  wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  sudo dpkg -i google-chrome-stable_current_amd64.deb
  ```
- **Windows**:
  Install standard Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`).
- **macOS**:
  Install Google Chrome into `/Applications/Google Chrome.app`.

### 3. Fast Python Package Manager (`uv`)
- **Linux / macOS**:
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Windows (PowerShell)**:
  ```powershell
  powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```

### 4. CLI Tools (`nlm` and `graphify`)
> [!IMPORTANT]
> Always install `graphifyy` (without `[mcp]`). `graphifyy` includes pre-compiled universal wheels with both `graphify` and `graphify-mcp` binaries and avoids compiling OpenSSL from C sources on macOS Monterey or Linux without `libssl-dev`.

- **Via `uv` (Recommended)**:
  ```bash
  uv tool install notebooklm-mcp-cli
  uv tool install graphifyy
  ```
- **Via standard `pip` (Fallback)**:
  ```bash
  pip install notebooklm-mcp-cli graphifyy
  ```

### 5. Playwright Headless Browser & Cross-Platform Engine
Run the automated cross-platform browser installer and probe:
```bash
npm run setup:browsers
```
*Behind the scenes:*
- **Linux & Windows & macOS Ventura+ (13+)**: Automatically runs `npx playwright install chromium`.
- **macOS Monterey 12.7 (Darwin <= 21)**: Playwright does not build chromium binaries for mac12 (`ERROR: Playwright does not support chromium on mac12`). The engine and test runner automatically detect macOS Monterey and fall back to system Google Chrome (`/Applications/Google Chrome.app`) via `channel: 'chrome'`.
- **Windows Fallback**: If bundled chromium is absent, automatically routes to pre-installed Microsoft Edge (`channel: 'msedge'`) or Google Chrome.

---

## 🛡️ Health Check & Verification Heartbeat

Once setup is complete, certify the environment:
```bash
# 1. Verify 8 Enterprise Guardrails (Gemini rotator, NotebookLM MCP, Google ADC & Drive, physical aspects, atomic FS)
npm run guardrail:check

# 2. Fast Smoke Suite (~3s)
npm run test:smoke

# 3. Production Dashboard Build
npm run build

# 4. Google Drive / Sheets Token Audit
npm run auth:check
```

**Expected Outcome**:
- 8/8 Guardrails PASS (HEALTHY)
- Google ADC & Drive/Sheets: VALID & HEALTHY
- 8/8 Smoke Suites PASS (100.0%)
- Dashboard built in <10s with 0 warnings and 0 errors.
