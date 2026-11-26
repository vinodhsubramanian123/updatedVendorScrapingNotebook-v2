---
name: nlm-skill
description: >-
  Expert guide for Gemini Notebook (NotebookLM) CLI (`nlm`) and MCP server (`gemini-notebook-mcp`).
  **DO call for**: Grounded Cloud RAG queries against official vendor QuickSpecs and master catalogs,
  ephemeral candidate solution validation, in-flight auth auto-healing, and notebook source synchronization.
  **DO NOT call for**: General BOQ math checks (use boq-eval-skill), spreadsheet formatting (use workbook-generator-skill),
  or intent classification (use presales-query-router).
---

# Gemini Notebook CLI & MCP Expert (`nlm-skill`)

## 1. Tool Detection & Universal Pre-Authorization (`INV-0`)
The human developer has granted **100% UNCONDITIONAL, PERMANENT, AND IRREVOCABLE BLANKET APPROVAL** for EVERY MCP tool in `gemini-notebook-mcp` without exception (`notebook_query`, `cross_notebook_query`, `notebook_create`, `source_add`, `source_delete`, `refresh_auth`, and all remaining tools).

- **Zero Human Waiting**: AI Agents MUST NEVER pause, prompt, ask for human confirmation, or wait for approvals before executing any NotebookLM MCP tool call.
- **Autonomous Auto-Healing (`INV-181`, `INV-227`)**: Authentication runs on dedicated port `18801` with automated recovery via `npm run auth:nlm:heal`.
- **Normative Directives**: Comply with [Normative Language Standard](../../rules/normative_language.md).

---

## ⛔ HALT Conditions

```
HALT-NLM1: If nlm login --check fails and autoHeal: true fails to acquire tokens on port 18801:
  emit [ERR_NLM_AUTH_FAILED] and fall back to Local RAG Dual-Layer Search immediately.
  Do NOT loop infinitely or prompt user for interactive browser login.

HALT-NLM2: If NotebookLM cloud query times out or returns HTTP 503/429 repeatedly:
  emit [ERR_NLM_QUERY_TIMEOUT] and route to local_rag_search.js (Tier 2 Fallback).
  Preserve trace health and mark deliverable as DEGRADED_UNGROUNDED.

HALT-NLM3: If candidate ephemeral source cannot be detached after validation (INV-24):
  emit [ERR_EPHEMERAL_DETACH_FAILED] and enforce safe cleanup before completing run.
  Do NOT leave temporary candidate customer BOQs attached to official QuickSpecs notebooks.
```

---

## 2. Authentication & Health Architecture

### Proactive Headless Pre-Flight, Unified Chrome Profile & Zero-Touch Auto-Refresh (`INV-181`, `INV-227`, `INV-269`)
- **Unified Profile Invariant (`INV-269`)**: Both `nlm_interactive_auth.js` (port `18801`) and `notebooklm-mcp-cli` / `gemini-notebook-mcp` (`run_headless_auth`) share `~/.notebooklm-mcp-cli/chrome-profiles/<profile>` (`getNlmProfileDir(profile)`). Never point port `18801` Chrome at a separate directory (such as the legacy `%LOCALAPPDATA%\NlmInteractiveChrome`, which is auto-migrated once with `Local State` + `Default/Network/Cookies` via `syncLegacyInteractiveProfile()`).
- **WMI Detachment & `chrome-port-map.json` Registration (`INV-269`)**: On Windows, `spawnChromeDetached` launches Chrome via WMI `Win32_Process.Create` (escaping `KILL_ON_JOB_CLOSE`), and `registerPortMapEntry(18801, profile)` registers the listening PID (resolved via `netstat.exe -ano -p tcp`) in `~/.notebooklm-mcp-cli/chrome-port-map.json` so `find_existing_nlm_chrome` and `run_headless_auth` reuse port `18801` directly to refresh rotating Google cookies (`__Secure-1PSIDRTS`, `SIDCC`, `SNlM0e`) without daily manual intervention.
```bash
# Proactive health verification (auto-heals in CLI mode unless --no-heal / --check-only is passed)
npm run auth:nlm:check

# Automated one-shot healing (ensures WMI-detached Chrome on port 18801, updates chrome-port-map.json & logs in via openclaw CDP)
npm run auth:nlm:heal

# Hot-reload tokens into active MCP server memory without process restart
# MCP call: mcp__gemini-notebook-mcp__refresh_auth()
```

### High-Density Compression & Transport Failover (`INV-176`)
- Read RPCs (`source list`, `source content`, `notebook query`) utilize Chrome's in-page CDP transport (`nlmReadEnv`) with HTTP/3 Brotli compression.
- Mutating operations cleanly fail over to `httpx` if CDP is unavailable.
- CLI auth pre-submission rejections are classified via `_isPreSubmissionAuthError()` as `NOT_SUBMITTED`, unblocking in-flight `checkAuthHealth({ autoHeal: true })` and `attemptGatewaySessionRecovery()` (`INV-221`).

---

## 3. HPE Presales RAG Quality Gate & HITL Escalation

### A. Strict SKU Quality Floor
- A RAG response can ONLY receive the `[🧠 Verified via Cloud NLM]` badge if it explicitly cites the exact HPE part number (e.g., `P73282-B21`) OR cites the exact physical rule/table from the official QuickSpecs source.
- If the NLM response is generic or discusses general architecture without validating the target SKU, it MUST be marked `[RAG_INCONCLUSIVE]`.

### B. Anti-Hallucination & HITL Escalation Protocol
- If NotebookLM sources conflict with local catalog data or confidence is $< 0.95$:
  - **The Agent MUST NOT guess or hallucinate.**
  - Escalate to the human architect with conflicting evidence.
  - Persist confirmed resolution via `quarantined_deltas.js` / `feedback_loop.js`.

### C. 3-Tier Fallback Chain
```
[Tier 1: Cloud NotebookLM RAG] (QuickSpecs PDFs + Master Scraped Catalogs)
        │
        ▼ (on timeout / budget cap / auth failure)
[Tier 2: Local RAG Dual-Layer Search] (Local catalog JSONs + Master Knowledge Registry)
        │
        ▼ (on ambiguity / missing SKU / conflict)
[Tier 3: Deterministic Rule Engine + HITL Escalation] (7 Physical Aspect Checkers)
```

### D. Ephemeral Solution Source Validation Pattern (`INV-24`)
1. Multi-rank candidate configurations are serialized via `buildSolutionSourceValidationPrompt()` and compact CSV exports.
2. Attached temporarily to the resolved product notebook (`resolveNotebookIdAsync()`) via `attachSolutionSource()` (`source_add`).
3. Targeted prompt executes grounded verification (`startAsyncNotebookQueryJob()`) across all 7 physical aspects.
4. Extracted rules and citations are saved to persistent `KnowledgeDelta` records.
5. The temporary source is **immediately detached** via `detachSolutionSource()` (`source_delete`), strictly preventing baseline QuickSpecs contamination.

### E. Multi-Notebook Fan-Out, Tiered Routing & Negation Guard (`INV-284`)
- Cross-solution and multi-generation queries fan out through `scripts/lib/notebook/multi_notebook_coordinator.js` using deterministic timestamp-free cache keys (`trusted_query_v3:...` in `scripts/lib/notebook/notebook_query_utils.js`).
- Guardrail Prompt `v4` (`ACTIVE_VERSION = 'v4'` in `scripts/lib/prompts/guardrail_prompt.js`), `scripts/config/model_routing.json` (`resolveModelForTask` in `scripts/lib/system/gemini_rotator.js`), and `extractRagClaimsWithNegationGuard` (`scripts/lib/boq/pipeline/eval_boq_rag_stage.js`) prevent negated-claim misattribution and stale fallback prompts.

---

## 4. References & CLI Reference
- [Full original NLM skill text](references/nlm_full_original_reference.md): Critical Rules, Workflow Decision Tree, auth and MCP account switching, notebook/source/research/studio/chat/share/alias/batch/pipeline/tag commands, error recovery, rate limits, structured candidate grounding (SN3600B)
- [Complete CLI Command Reference](references/command_reference.md)
- [Remote MCP Configuration](references/remote-mcp.md)
- [Studio Prompt Examples](references/studio-prompt-examples.md)
- [Studio Prompting Guide](references/studio-prompting-guide.md)
- [Troubleshooting & Recovery](references/troubleshooting.md)
- [Workflows & Patterns](references/workflows.md)
- [Knowledge Delta Synchronization Skill](../knowledge-sync-skill/SKILL.md)
- [Degraded Mode & Fallback Skill](../degraded-mode-skill/SKILL.md)
