# Macro Orchestration Execution Lifecycle & CLI Script Pipeline

Derived directly from `scripts/rebuild_all.js`, `scripts/verify_all.js`, `scripts/eval_boq.js`, `scripts/lib/knowledge_sync.js`, and `scripts/lib/feedback_loop.js`.

```mermaid
graph TD
    subgraph "1. Scraper & Catalog Staging Pipeline"
        SCRAPE["node scripts/scrape_oca_solution.js<br/>(Attaches to CDP port 9222)"]
        VERIFY_TALLY["node scripts/verify_excel_tally.js<br/>(Validates Staging Row & SKU Integrity)"]
        PROMOTE["Promote Staging to Live Catalog<br/>(outputs/{Family}/{Gen}/{Model}/)"]
    end

    subgraph "2. Portfolio Synchronization & Rebuild Engine"
        REBUILD["node scripts/rebuild_all.js<br/>(Rebuilds JSON & TSV from raw_data)"]
        SYNC_REG["node scripts/lib/sync_registry.js<br/>(Synchronizes master_knowledge_registry.json)"]
        GEN_XLSX["node scripts/generate_xlsx.js<br/>(Builds 23-sheet styled master workbooks)"]
    end

    subgraph "3. Dual-Brain RAG & Knowledge Sync"
        KSYNC["node scripts/lib/knowledge_sync.js<br/>(Builds Markdown Charter Payloads)"]
        NLM_CLI["nlm source add / replace<br/>(Google NotebookLM Cloud Sync)"]
        LOCAL_RAG["local_rag_search.js<br/>(Dual-Layer Offline Fallback)"]
    end

    subgraph "4. BOQ Ingestion & Multi-Aspect Evaluation Engine"
        EVAL_CLI["node scripts/eval_boq.js &lt;quote.xlsx&gt;<br/>(Standalone CLI / Child Process)"]
        ASPECTS["7-Aspect Physical Math Engine<br/>(compute, memory, storage, pcie, power, net, support)"]
        GUARDRAIL["node scripts/lib/agentic_guardrail.js<br/>(MCP Tool Simulation Loop)"]
        SYNTHESIZE["5-Tier Strategy Resolution Matrix<br/>(Rank 1 to Rank 5)"]
    end

    subgraph "5. Continuous Certification & Red-Teaming Suite"
        VERIFY_ALL["node scripts/verify_all.js (npm test)<br/>(6/6 Certified Product Lines)"]
        BENCHMARKS["node scripts/test_boq_eval_benchmarks.js<br/>(5/5 Scenarios Recall & Precision)"]
        ADVERSARIAL["node scripts/adversarial_agent.js<br/>(Continuous Red-Team Injection)"]
    end

    subgraph "6. Closed-Loop Feedback & Self-Healing"
        FEEDBACK["node scripts/lib/feedback_loop.js<br/>(Ingests Portal CLIC Error Codes)"]
        DELTA_JSON["outputs/.../history/catalog_deltas.json<br/>(Atomic Persistence)"]
    end

    %% Lifecycle Execution Tracing
    SCRAPE --> VERIFY_TALLY --> PROMOTE
    PROMOTE --> REBUILD --> SYNC_REG --> GEN_XLSX
    SYNC_REG --> KSYNC --> NLM_CLI & LOCAL_RAG
    LOCAL_RAG & NLM_CLI --> EVAL_CLI
    EVAL_CLI --> ASPECTS --> GUARDRAIL --> SYNTHESIZE
    SYNTHESIZE --> VERIFY_ALL & BENCHMARKS & ADVERSARIAL
    FEEDBACK --> DELTA_JSON --> KSYNC
    DELTA_JSON -.->|Auto-Injected Fix Next Run| ASPECTS
```
