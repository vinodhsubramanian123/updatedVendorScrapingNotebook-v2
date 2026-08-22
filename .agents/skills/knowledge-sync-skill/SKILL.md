---
name: knowledge-sync-skill
description: Bi-directional knowledge synchronization skill between Antigravity AI evaluation engine and Gemini NotebookLM RAG notebooks across multi-product generations (DL380 Gen12, Gen11, Alletra, Synergy, Cray).
---

# Knowledge Sync Skill — Bi-Directional Agent & Gemini NotebookLM Alignment Protocol

## 1. Overview
This skill ensures that the **Antigravity AI local evaluation engines** and **Gemini NotebookLM RAG notebooks** maintain 100% synchronization regarding HPE server configuration rules, physical constraints, chassis variants, pricing, and vendor portal rejection feedback.

---

## 2. Multi-Environment Stability & Fallback Architecture

To prevent build or test failures in automated CI/CD pipelines (such as GitHub Actions) or offline development environments, the sync engine operates on a deterministic 3-tier fallback model:

```
                  [Trigger Knowledge Sync]
                             │
                             ▼
         [Check Environment: process.env.CI / GITHUB_ACTIONS]
                 /                                \
           (Yes: In CI)                      (No: Local / Dev)
               │                                      │
               ▼                                      ▼
     [Validate Markdown Payload            [Verify nlm CLI & Auth]
      & Assert Local Registry]                   /         \
               │                           (Valid)        (Unavailable)
               ▼                              │                 │
    [Mark CI_OFFLINE_VERIFIED]                ▼                 ▼
                                    [Execute nlm sync]   [Fallback to MCP / Local RAG]
```

1. **Tier 1: Cloud `nlm` CLI Synchronization**:
   - Executes when `nlm` CLI is installed and authenticated.
   - Deletes stale source by ID and uploads the newly generated Markdown payload under the canonical source name `{chassis}_OCA_Catalog_{YYYY-MM-DD}`.
2. **Tier 2: Universal MCP Tool Synchronization (`gemini-notebook-mcp:source_add`)**:
   - Executes autonomously when CLI is unavailable.
3. **Tier 3: CI/CD & Offline Safety Net (`CI_OFFLINE_VERIFIED`)**:
   - Validates generated Markdown payloads, updates `notebooks.json`, and records sync timestamps without throwing unhandled process exceptions.

---

## 3. Scope Taxonomy Rules
Learnings captured from HPE OCA portal rejections (`KnowledgeDeltas`) are automatically categorized into a 3-tier scope taxonomy:

1. **`UNIVERSAL_VENDOR`**: Applies across ALL HPE product lines (e.g. BTO/CTO mode exclusions, TAA/GTA regional exclusions, -48VDC lug kit mandatory pairings).
2. **`FAMILY_GEN`**: Applies to a specific product family + generation (e.g. ProLiant Gen12 DDR5-6400 memory bit-width rules, Alletra 9000 storage controller write-cache protection).
3. **`CHASSIS_SPECIFIC`**: Applies to an exact chassis model (e.g. DL380 Gen12 SFF drive-less FIO kit `873763-B21`).

---

## 4. Synchronization Execution Commands

```bash
# Run Master Knowledge Sync Across All Registered Portfolios
npm run sync:knowledge

# Auto-upload payloads to Google NotebookLM for a specific chassis
node scripts/lib/knowledge_sync.js --chassis DL380_Gen12_SFF --auto-upload-nlm

# Full portfolio knowledge sync with auto-upload
node scripts/lib/knowledge_sync.js --auto-upload-nlm

# Output JSON payload for Dashboard SSE stream
node scripts/lib/knowledge_sync.js --json
```

---

## 5. Active Target Notebook Registry (`scripts/config/notebooks.json`)

| Product Identifier | Product Family | Generation | Target Cloud Notebook ID | Notebook Title |
| :--- | :--- | :--- | :--- | :--- |
| `DL380_Gen12_SFF` | ProLiant | Gen12 | `1d190853-4e9c-48df-aa70-eae66c6f2c1f` | *Dl 380 Spec Gen 12* |
| `DL380_Gen11` | ProLiant | Gen11 | `d37fa851-90cb-45b7-a8e1-78488a0bc6e6` | *DL380 Gen 11* |
| `Alletra_Storage_System` | Alletra | Storage | `a67629ba-3434-42ab-b465-bd6d71852198` | *HPE Alletra Storage MP QuickSpecs* |
| `SY100Gb_F32_Module` | Synergy | General | `49a3c69e-115f-4332-9454-c5d4f2941327` | *Synergy 12000 Frame* |
| `MSL3040_Tape` | StoreEver | Tape | `1d190853-4e9c-48df-aa70-eae66c6f2c1f` | *Default Knowledge Hub* |
| `GX5000_General_RACK` | Cray | General | `1d190853-4e9c-48df-aa70-eae66c6f2c1f` | *Default Knowledge Hub* |
| **Default Fallback** | Universal | All | `1d190853-4e9c-48df-aa70-eae66c6f2c1f` | *Default Knowledge Hub* |
