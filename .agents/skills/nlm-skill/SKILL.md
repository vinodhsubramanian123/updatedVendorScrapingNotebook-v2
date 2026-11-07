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

### Proactive Headless Pre-Flight & One-Shot Healing (`INV-181`, `INV-227`)
```bash
# Proactive headless health verification (45s lease timeout)
npm run auth:nlm:check

# Automated one-shot healing (launches isolated Chrome on port 18801 & logs in via openclaw CDP)
npm run auth:nlm:heal

# Hot-reload tokens into active MCP server memory without process restart
# MCP call: mcp__gemini-notebook-mcp__refresh_auth()
```

### High-Density Compression & Transport Failover (`INV-176`)
- Read RPCs (`source list`, `source content`, `notebook query`) utilize Chrome's in-page CDP transport (`nlmReadEnv`) with HTTP/3 Brotli compression.
- Mutating operations cleanly fail over to `httpx` if CDP is unavailable.
- CLI auth pre-submission rejections are classified as `NOT_SUBMITTED`, unblocking in-flight `checkAuthHealth({ autoHeal: true })` (`INV-221`).

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
1. Multi-rank candidate configurations are serialized to a compact CSV.
2. Attached temporarily to the product notebook as an ephemeral document source (`source_add`).
3. Targeted prompt executes grounded verification across all 7 physical aspects.
4. Extracted rules and citations are saved to persistent `KnowledgeDelta` records.
5. The temporary source is **immediately detached** (`source_delete`), strictly preventing baseline QuickSpecs contamination.

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
