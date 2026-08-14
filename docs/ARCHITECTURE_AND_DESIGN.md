# Architecture & Design

## 1. Hybrid Dual-Brain Architecture
The application employs a **Hybrid Dual-Brain Architecture** designed for maximum resilience, auditability, and execution speed:

```mermaid
graph TD
    subgraph "Phase 1: Ingestion"
        A[Input BOQ - Excel/CSV/Image] --> B[Multimodal OCR Extraction]
    end
    subgraph "Phase 2: Local Rule Engine (Deterministic)"
        B --> C[BOQ Parsing & Multi-Node Cleansing]
        C --> D[6-Aspect Math: Thermal, Power, Memory, PCIe, Storage, Network]
    end
    subgraph "Phase 3: Agentic Guardrail (Probabilistic)"
        D -->|If Confidence < 1.0| E[Agentic Guardrail Loop via MCP]
        E <--> F[NotebookLM RAG Grounding]
        E <--> G[Local Catalog DB Search]
    end
    subgraph "Phase 4: Synthesis & Output"
        E --> H[5-Tier Strategic Resolution Matrix]
        D -->|If Confidence == 1.0| H
        H --> I[Dashboard & Telemetry]
    end
```

## 2. Core Architectural Decisions
- **Deterministic Rule Engine Primacy**: The local engine (e.g., `boq_evaluator.js`) executes fast, hardcoded physical hardware math without relying on external LLMs. This ensures a 100% functional fallback if APIs go offline.
- **Agentic MCP Guardrail**: Instead of brittle LLM single-pass prompting, the system uses a stateful Model Context Protocol (MCP) tool-calling loop (`agentic_guardrail.js`). The LLM actively hypothesizes fixes, calls the local rule engine via `simulate_build`, and checks NotebookLM before committing.
- **Loose Coupling via Barrel Exports**: All backend subsystems (BOQ Engine, RAG, Scraper, Feedback) are strictly decoupled and routed through a master barrel export (`scripts/lib/index.js`). This eliminates "God Nodes" and tight coupling, preventing brittle cross-dependencies.
- **Continuous Structural Auditing (Dynamic Truth)**: While this document provides the *static* conceptual design, the system architecture is actively audited using the `graphify` skill. The resulting semantic graph (`graphify-out/GRAPH_REPORT.md`) is the *dynamic source of truth* for file dependencies and god nodes. Agents MUST query this graph rather than relying solely on static docs.
- **Decoupled Data Architecture**: SKUs are strictly classified (e.g., base chassis vs. options). Atomic JSON writes (`safeWriteJsonAtomic`) ensure database files are never corrupted.
- **Configuration-Driven Scraping Profiles**: The scraping pipeline (`scrape_oca_solution.js`) relies on dynamically loaded JSON profiles (`scripts/config/profiles/`) to govern DOM thresholds, required tabs, and generation-specific component rules (e.g., DL380 Gen12 vs Alletra). This ensures zero hardcoding in the core orchestration script, making scaling to new product families highly maintainable.

## 3. Data Dictionary & Key Schemas
- **KnowledgeDelta**: Captures learned physical dependency rules. Used to train the local rule engine.
- **ConflictGraph**: Directed Acyclic Graph tracking SKU dependencies, mutually exclusive items, and capacity bounds.
- **ResolutionMatrix**: 5-Tier layout of hardware builds (Rank 1: Intent Preserving, Rank 5: Budget Minimized). Includes itemized price data.

## 4. UI/UX Design System
- **Real-Time Telemetry Dashboard**: Utilizes SSE (Server-Sent Events) to stream evaluation logs.
- **Anti-Slop Aesthetic (Taste Skill)**: The UI actively rejects generic "AI-generated" aesthetics by strictly adhering to the `design-taste-frontend` ruleset. It uses the **Geist** font family and an **Emerald Green (`#01A781`) / Slate** high-contrast palette.
- **Component Design**: Tailwind-based, strict `rounded-xl` (12px) radiuses, and tightly-controlled custom tinted drop-shadows (e.g., `TelemetryCard.jsx`, `ResolutionMatrix.jsx`) for maximum data-density.

## 5. Subsystem Architecture & Master Barrel API
The engine is structured into 5 decoupled domain namespaces exported via [`scripts/lib/index.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/index.js):

| Subsystem | Modules | Core Responsibilities |
|---|---|---|
| **`system`** | `telemetry`, `fsCompat`, `progress`, `logger`, `profileLoader` | Atomic I/O with rollback (`safeWriteJsonAtomic`), progress streaming, structured logging, profile loading |
| **`boq`** | `evaluator`, `preprocessor`, `parser`, `conflictGraph`, `budgetOptimizer`, `vendorBomVerifier`, `xlsxExporter` | 6-aspect physical math, N-way configuration diffing, shared SKU line parsing (`boq_parser.js`), 5-tier strategy matrix |
| **`catalog`** | `rules`, `discovery`, `formatter`, `diff`, `productMeta`, `sku`, `registry`, `validator`, `checksumDiff`, `skuVersioning`, `syncRegistry` | 5-level catalog rules, auto-chassis detection, schema validation (`data_validator.js`), SKU regex, price diff audit |
| **`rag`** | `ocrService`, `knowledgeSync`, `notebookQuery`, `localSearch`, `postFlowSync` | Multimodal Gemini Vision OCR (with 25MB limits), bi-directional NotebookLM sync, dual-layer local fallback search |
| **`scraper` & `feedback`** | `cdp`, `domExtract`, `navigateOca`, `loop`, `queue` | Hands-free CDP automation, zero-touch browser runner, closed-loop `KnowledgeDelta` learning |

