# 6-Stage BOQ Evaluation Workflow & Pre-Flight Sub-Steps

This diagram captures the complete end-to-end evaluation pipeline defined in `docs/WORKFLOWS_AND_LEARNINGS.md` and `.agents/skills/boq-eval-skill/SKILL.md`.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Presales
    participant UI as React Control Center
    participant API as Express API Server
    participant Preproc as Preprocessor & OCR
    participant Math as 6-Aspect Math Engine
    participant Graph as 5-Level Conflict Graph
    participant Agent as Agentic Guardrail (MCP)
    participant NLM as NotebookLM / Local RAG
    participant Syn as Strategy Synthesizer
    participant Out as Exporter & Telemetry

    Note over Customer,UI: Stage 1: Upload & Multi-Format Ingestion
    Customer->>UI: Uploads BOQ (Excel / CSV / Image / Text)
    UI->>API: POST /api/upload-boq (Multipart Disk Storage)
    API->>Preproc: Read Raw Payload

    Note over Preproc,API: Stage 2: 5-Stage Cleansing & Pre-flight Normalization
    alt Is Image / Scanned PDF
        Preproc->>Preproc: performGeminiOcr() with Key Rotation
    end
    Preproc->>Preproc: 1. Strip Header & Preamble Rows
    Preproc->>Preproc: 2. Normalize Delimiters (Tabs, Pipes, Columns)
    Preproc->>Preproc: 3. Detect Server Node Multipliers (e.g. 2x Nodes)
    Preproc->>Preproc: 4. Extract Canonical HPE SKUs (isValidHpeSKU)
    Preproc->>Preproc: 5. Detect Multi-Configuration Splits (Clustering)
    Preproc-->>UI: Broadcast Cleansing Telemetry via SSE

    Note over Math,Graph: Stage 3: Deterministic Physical Aspect Pre-Checks
    API->>Math: evaluatePhysicalMath(items)
    par Check 7 Physical & Service Aspects
        Math->>Math: Aspect 1: Compute & TDP (Watts vs High-Perf Fans)
        Math->>Math: Aspect 2: Memory Channels (1DPC/2DPC, x4/x8 mixing)
        Math->>Math: Aspect 3: Storage Tri-Mode (RAID Controller Battery)
        Math->>Math: Aspect 4: PCIe Expansion (Risers vs Add-in Cards)
        Math->>Math: Aspect 5: Power Environment (-48VDC Lug Kits)
        Math->>Math: Aspect 6: Networking (OCP 3.0 Port Allocations)
        Math->>Math: Aspect 7: Support & Services SLA (Pointnext & Tech Care)
    end
    Math->>Graph: validateConflictGraph(items, missingDependencies)
    Graph->>Graph: Check VENDOR, CHASSIS, CATEGORY, SUBCAT, SKU rules
    Graph->>Graph: Compute Confidence Score (0.0 to 1.0)

    Note over Graph,Agent: Stage 4: Dual-Brain Resolution & Guardrail Loop
    alt Confidence Score >= 0.75 & Zero Critical Conflicts
        Graph->>Syn: Proceed Directly to Solution Synthesis
    else Confidence Score < 0.75 or Missing Mandatory Dependencies
        Graph->>Agent: Trigger Agentic MCP Guardrail
        loop Autonomous Resolution Loop (Max 5 iterations)
            Agent->>NLM: Query QuickSpecs Rule Grounding
            NLM-->>Agent: Authoritative Hardware Constraints
            Agent->>Agent: Tool: simulate_build(modifiedSKUs)
            Agent->>Agent: Tool: search_catalog(category, query)
            Agent->>Agent: Inject Mandatory Fixes (e.g. Fan Kit P48820-B21)
        end
        Agent->>Syn: Return Validated Whole-Solution BOM
    end

    Note over Syn,Out: Stage 5: 5-Tier Strategy Resolution Matrix Synthesis
    Syn->>Syn: Synthesize Rank 1: Customer Workload Intent Preserved
    Syn->>Syn: Synthesize Rank 2: Standardized CTO Baseline
    Syn->>Syn: Synthesize Rank 3: Performance Max (High-IOPS / Clock)
    Syn->>Syn: Synthesize Rank 4: Density Max (Future Scalability)
    Syn->>Syn: Synthesize Rank 5: Budget Minimized (Lowest CapEx)

    Note over Out,UI: Stage 6: Multi-Modality Output & Ledger Persistence
    Syn->>Out: Generate 19-Sheet Corrected Excel BOM (generate_boq_xlsx.js)
    Syn->>Out: Append Run Trace to pipeline_telemetry.json
    Out->>API: Broadcast EVAL_RESULT via SSE Stream
    API-->>UI: Render 5-Tier Matrix, Tradeoffs & Aspect Badges
    UI-->>Customer: Visual Review, Excel Download & Partner Portal Export
```
