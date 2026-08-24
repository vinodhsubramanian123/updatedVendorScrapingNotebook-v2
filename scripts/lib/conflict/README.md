# Conflict Resolution & Strategy Synthesis (`scripts/lib/conflict/`)

## 1. Purpose & Scope
Implements graph-based conflict detection, workload DNA profile matching, and the 5-tier strategy alternative matrix.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `conflict_graph.js` | `buildConflictGraph()`, `resolveConflicts()` | 5-level directed acyclic graph (DAG) detecting missing dependencies and mutually exclusive options. |
| `strategy_synthesizer.js` | `synthesizeStrategyMatrix()` | Synthesizes Rank 1 (Intent Preserved) through Rank 5 (Budget Minimized) proposals. |
| `workload_dna.js` | `extractWorkloadDna()` | Analyzes CPU core density, memory bandwidth, and GPU compute profile to categorize target workloads (AI/ML, Virtualization, Database, General Compute). |

## 3. 5-Tier Strategy Ranks
- **Rank 1**: Intent Preserved — Fixes all hardware errors with minimum changes to customer requested spec.
- **Rank 2**: Performance Maximized — Upgrades memory channels, thermal headroom, and high-throughput networking.
- **Rank 3**: Density Optimized — Focuses on maximizing core-to-RU and IOPS-to-watt efficiency.
- **Rank 4**: Balanced Enterprise — Balances performance, dual-PSU redundancy, and Pointnext Complete Care.
- **Rank 5**: Budget Minimized — Reduces BOM cost by down-binning non-critical components while preserving functional compatibility.
