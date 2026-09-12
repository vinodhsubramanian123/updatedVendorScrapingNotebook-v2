# BOQ Engine Subsystem (`scripts/lib/boq/`)

## 1. Purpose & Scope
Handles parsing, preprocessing, validation, physical evaluation, budget optimization, commercial value engineering, and Excel export for customer Bills of Materials (BOQs) and Vendor Quotes.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `boq_parser.js` | `extractSkus()`, `parseBoqLine()` | Shared regex extraction and token normalization (Single Source of Truth). |
| `boq_preprocessor.js` | `preprocessBoq()` | Ingests CSV, XLSX, and text BOQs; groups lines, normalizes quantities, filters noise. |
| `boq_evaluator.js` | `evaluateBoqAgainstCatalog()` | Coordinates the 7 physical aspect checkers against catalog rules, circuit breakers, and telemetry. |
| `deal_optimizer.js` | `optimizeDealValueEngineering()`, `evaluateValueEngineeringOpportunities()` | Post-buildability commercial advisory engine evaluating CPU right-sizing, NIC bandwidth alignment, PSU efficiency, and unsolicited services (`INV-76`). |
| `multi_cluster_splitter.js` | `analyzeAndPartitionClusters()` | Splits multi-node customer tenders into structured clusters, calculating RU, rack counts, rail kits, and facility power (`INV-29`). |
| `budget_optimizer.js` | `synthesizeRank5Budget()` | Generates cost-optimized alternative configs (Rank 5) by down-binning non-critical components. |
| `vendor_bom_verifier.js` | `verifyVendorBom()` | Cross-verifies vendor quote SKUs against promoted catalog rules and detects missing base options. |
| `generate_boq_xlsx.js` | `exportBoqEvaluationToXlsx()` | Exports evaluation results into a formatted Excel workbook with validation audit badges. |

## 3. Invariants & Data Contracts
- Always uses `isValidHpeSKU()` from `scripts/lib/catalog/sku.js` to eliminate DOM noise.
- Quantity fields must pass integer validation (`/^\d+$/`).
- Value engineering CapEx calculations must derive from `getHistoricalSkuPrice` with high confidence pricing.
