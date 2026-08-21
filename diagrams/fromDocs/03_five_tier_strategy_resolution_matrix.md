# 5-Tier Strategy Resolution Matrix Synthesis Pipeline

This diagram illustrates how the **5-Tier Strategy Resolution Matrix** is synthesized from Workload DNA profiling, mandatory physical fixes, and budget arithmetic (`scripts/lib/conflict/strategy_synthesizer.js`).

```mermaid
graph TD
    subgraph "Input Context & Profile"
        RAW_BOM["Normalized Customer Base BOM<br/>(SKUs, Quantities, Unit Prices)"]
        DNA["Workload DNA Profiler<br/>• Primary Workload (Compute / DB / VDI)<br/>• RAM/Core Ratio (GB/Core)<br/>• Accelerator Presence (GPU / SmartNIC)<br/>• Storage IOPS Tier (NVMe / SAS)"]
        FIXES["Mandatory Injected Fixes<br/>(Thermal Fans, Battery Kits, DC Lugs)"]
        CATALOG_PRICES["Master Catalog Price History<br/>(price_history.json)"]
    end

    subgraph "Mathematical Budget Calculator"
        BC["Base BOM Cost = Σ(Base SKU Price × Qty)"]
        FC["Fix Cost = Σ(Mandatory Fix SKU Price × Qty)"]
    end

    subgraph "5-Tier Strategy Synthesizer"
        R1["<b>Rank 1: Customer Workload Intent Preserved (Optimal Match)</b><br/>• Preserves exact compute & memory specifications<br/>• Injects ONLY mandatory buildability fixes<br/>• Budget: Base BOM Cost + Fix Cost ($0 Addon Surplus)"]

        R2["<b>Rank 2: Standard Baseline & Factory Default Accessories</b><br/>• Aligns with standard CTO chassis baseline configuration<br/>• Standard factory default accessories & redundant power<br/>• Budget: Baseline Cost + Fix Cost + Standard Addons"]

        R3["<b>Rank 3: High-IOPS & Storage Performance Optimized</b><br/>• Upgrades to High-Performance NVMe / High-Clock Processors<br/>• Tuned for maximum transactional & computational throughput<br/>• Budget: Performance Optimized Premium Tier"]

        R4["<b>Rank 4: Maximum Density & Scalability Expansion</b><br/>• Maximizes DIMM slot occupancy & storage backplane bays<br/>• Built for 3-5 year future scale-up capacity without chassis swaps<br/>• Budget: Maximum Density Scale Tier"]

        R5["<b>Rank 5: Budget & CapEx Minimized Buildable Baseline</b><br/>• Strips all optional non-essential accessories & bundles<br/>• Minimum viable 100% buildable certified configuration<br/>• Budget: Lowest Possible CapEx expenditure"]
    end

    subgraph "Tradeoff & Validation Engine"
        DEDUP["Deduplication & Validation Filter<br/>(Guarantees exactly 5 unique, non-colliding solution tiers)"]
        METRICS["Tradeoff Metrics Engine<br/>• Intent Alignment % (100% down to 65%)<br/>• SKU Modifications Count<br/>• Cost Delta USD ($)<br/>• Capacity Expansion Rating"]
        RAG_CHECK["QuickSpecs Grounding Verification<br/>(NotebookLM Secondary Validation)"]
    end

    subgraph "Render & Serialization"
        UI_MATRIX["Interactive UI Comparison Table<br/>(ResolutionMatrix.jsx)"]
        EXCEL_MATRIX["Multi-Sheet Corrected Excel Workbook<br/>(generate_boq_xlsx.js)"]
    end

    %% Flow
    RAW_BOM & DNA & FIXES & CATALOG_PRICES --> BC & FC
    BC & FC --> R1 & R2 & R3 & R4 & R5
    R1 & R2 & R3 & R4 & R5 --> DEDUP
    DEDUP --> METRICS
    METRICS --> RAG_CHECK
    RAG_CHECK --> UI_MATRIX & EXCEL_MATRIX
```
