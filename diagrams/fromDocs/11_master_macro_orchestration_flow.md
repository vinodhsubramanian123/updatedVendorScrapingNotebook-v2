# Master Macro Continuous Lifecycle Orchestration Flow

This diagram illustrates the **6-Stage Continuous Learning Macro Lifecycle** spanning from portal scraping to feedback learning (`.agents/skills/orchestrator-workflow-skill/SKILL.md`).

```mermaid
graph LR
    subgraph "Stage 1: OCA Catalog Scraper"
        S1["Live Scraping via CDP port 9222<br/>Outputs: {Model}_Catalog.json + Master Excel"]
    end

    subgraph "Stage 2: Knowledge Sync"
        S2["Build Markdown Payload & Delta Sync<br/>Outputs: Google NotebookLM RAG + Local RAG"]
    end

    subgraph "Stage 3: Customer BOQ Engine"
        S3["6-Aspect Physical Math & 5-Tier Strategy Matrix<br/>Outputs: Corrected Multi-Sheet Excel BOM"]
    end

    subgraph "Stage 4: Grounded AI Consultation"
        S4["Agentic MCP Guardrail & QuickSpecs Grounding<br/>Outputs: Verified Hardware Rules & Technical Insights"]
    end

    subgraph "Stage 5: HITL Verification Trial"
        S5["Partner Portal Verification & Quote Submission<br/>Outputs: Acceptance or CLIC Error Code"]
    end

    subgraph "Stage 6: Autonomous Feedback Learning"
        S6["Capture Error & Dynamic Rule Ingestion<br/>Outputs: catalog_deltas.json + Auto-Sync"]
    end

    %% Lifecycle Loop
    S1 -->|Catalog Data| S2
    S2 -->|Grounded Rules| S3
    S3 -->|Validated BOM| S4
    S4 -->|Optimized Quote| S5
    S5 -->|Portal Error / Feedback| S6
    S6 -->|Self-Healing Loop| S2
    S6 -.->|Auto-Fix Next Run| S3
```
