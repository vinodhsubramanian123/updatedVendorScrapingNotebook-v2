# Conflict Resolution & Strategy Synthesis (`scripts/lib/conflict/`)

## 1. Purpose & Scope
Implements graph-based conflict detection, workload DNA profile matching, 4-brain auditable decision trace ledgers, Least-Delta candidate optimization, and the 5-tier strategy alternative matrix.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `conflict_graph.js` | `buildConflictGraph()`, `resolveConflicts()` | 5-level directed acyclic graph (DAG) detecting missing dependencies and mutually exclusive options. |
| `strategy_synthesizer.js` | `synthesizeStrategyMatrix()` | Synthesizes Rank 1 (Intent Preserved) through Rank 5 (Budget Minimized) proposals, integrating Rank 1L/1M. |
| `least_delta_combinator.js` | `buildLeastDeltaCandidate()`, `findBestAlternativeInCatalog()` | Identifies troublesome SKUs causing cascading bloat, prunes accessories, and finds pin-compatible catalog alternatives (`INV-74`). |
| `decision_trace.js` | `createDecisionTraceLedger()`, `persistLedger()` | Captures an immutable, timestamped reasoning chain attributing decisions across 4 brains (Math, RAG, Value Engineering, HITL) (`INV-75`). |
| `workload_dna.js` | `extractWorkloadDna()` | Analyzes CPU core density, memory bandwidth, and GPU compute profile to categorize target workloads (AI/ML, Virtualization, Database, General Compute). |
| `cascading_impact_analyzer.js` | `introspectSku()` | Traces recursive dependencies and downstream enablement ripple effects for candidate SKUs. |

## 3. Strategy Matrix Tiers
- **Rank 1**: Customer Intent Preserved — Minimal necessary adjustments for 100% buildability.
  - **Rank 1L (Least-Delta Sibling)**: Substitutes a troublesome SKU with a direct catalog alternative to eliminate cascading accessory kits.
  - **Rank 1M (Minimal Mutation Pruning)**: Prunes unnecessary standalone options that trigger complex multi-component requirements.
- **Rank 2**: Performance Maximized — Upgrades memory channels, thermal headroom, and high-throughput networking.
- **Rank 3**: Density Optimized — Focuses on maximizing core-to-RU and IOPS-to-watt efficiency.
- **Rank 4**: Balanced Enterprise — Balances performance, dual-PSU redundancy, and Pointnext Complete Care.
- **Rank 5**: Budget Minimized — Reduces BOM cost by down-binning non-critical components while preserving functional compatibility.
