# Hybrid Dual-Brain Architecture

The HPE ProLiant AI Studio BOQ Evaluator employs a **Hybrid Dual-Brain Architecture** separating deterministic physical hardware math from agentic AI reasoning and QuickSpecs grounded RAG.

```mermaid
graph TB
    subgraph "Customer Input Layer"
        A1["📄 Customer BOQ<br/>(Excel / CSV / TSV / Raw Text)"]
        A2["🖼️ Multimodal Quote Image / PDF<br/>(Scanned RFP / iQuote)"]
    end

    subgraph "Ingestion & Pre-Processing Subsystem"
        B1["Multimodal Vision OCR Service<br/>(ocr_service.js)"]
        B2["CTO Normalization & Parsing Engine<br/>(boq_preprocessor.js + boq_parser.js)"]
        B3["5-Stage Cleansing Pipeline<br/>(Header Offset, Line Consolidation, Multipliers)"]
    end

    subgraph "Infrastructure: Gemini Key Rotator (FIFO Pool)"
        KR["Smart Key Rotator (gemini_rotator.js)<br/>Deterministic FIFO Queue + Daily Quota Demotion"]
    end

    subgraph "Brain 1: Deterministic Physical Rule Engine (Local & Offline)"
        D1["Aspect 1: Compute & Thermal Math<br/>(TDP Watts vs Fan Kits)"]
        D2["Aspect 2: Memory Channel Symmetry<br/>(8 Channels/Socket, 1DPC/2DPC)"]
        D3["Aspect 3: Storage Tri-Mode & Battery<br/>(RAID Cache Battery & Drive Kits)"]
        D4["Aspect 4: PCIe Slots & Riser Bifurcation<br/>(Lanes vs Riser Cards)"]
        D5["Aspect 5: Power Infrastructure<br/>(PSU Wattage Redundancy & DC Lugs)"]
        D6["Aspect 6: Networking & OCP Slots<br/>(OCP 3.0 Occupancy & Ports)"]
        D7["Aspect 7: Support & Services SLA<br/>(Pointnext & Tech Care Validation)"]
        CG["5-Level Conflict Graph & Capacity DAG<br/>(conflict_graph.js)"]
    end

    subgraph "Brain 2: Intent, Verification & Grounding Brain"
        NLM["Google NotebookLM RAG<br/>(Official QuickSpecs Grounding)"]
        LOCAL_RAG["Local Dual-Layer Fallback Search<br/>(local_rag_search.js)"]
        GUARDRAIL["Agentic MCP Guardrail Loop<br/>(agentic_guardrail.js)"]
        SIM["Build Simulator & Fix Verifier<br/>(simulate_build Tool — Full Multi-Aspect Re-run)"]
    end

    subgraph "Output & Synthesis Layer"
        MATRIX["5-Tier Strategic Resolution Matrix<br/>(Rank 1: Intent Preserved ... Rank 5: Budget Minimized)"]
        DASHBOARD["React Control Center Dashboard<br/>(Real-Time SSE Stream)"]
        EXCEL["Corrected Multi-Sheet Excel BOM<br/>(generate_boq_xlsx.js)"]
        LEDGER["Telemetry Ledger & Action Log<br/>(pipeline_telemetry.json)"]
    end

    %% Connections
    A1 --> B2
    A2 --> B1
    KR -.->|Active API Key| B1
    KR -.->|Active API Key| GUARDRAIL
    KR -.->|Active API Key| LOCAL_RAG
    B1 --> B2
    B2 --> B3
    B3 --> D1 & D2 & D3 & D4 & D5 & D6 & D7
    D1 & D2 & D3 & D4 & D5 & D6 & D7 --> CG

    CG -->|Confidence == 1.0 & Clean| MATRIX
    CG -->|Confidence < 1.0 or Unresolved| GUARDRAIL

    GUARDRAIL <-->|Query Grounding| NLM
    NLM -.->|If Cloud Offline| LOCAL_RAG
    GUARDRAIL <-->|Iterative Simulation| SIM
    SIM <--> D1 & D2 & D3 & D4 & D5 & D6 & D7

    GUARDRAIL -->|Resolved Output| MATRIX
    MATRIX --> DASHBOARD
    MATRIX --> EXCEL
    MATRIX --> LEDGER
```
