# Workbook Intake & Spec Neutralization Rules

This reference documents the intake, sanitization, and normalization invariants used by `boq-eval-skill` and `scripts/lib/boq/` (`boq_evaluator.js`, `boq_preprocessor.js`, `boq_parser.js`, and `multi_cluster_splitter.js`).

---

## 1. Physical Anchor & Cluster Multiplier (`INV-117`, Rule 6)
- **Base Chassis Anchor**: The CTO base chassis line item quantity serves as the physical anchor defining the cluster multiplier ($N = \text{serverCount}$).
- If multiple server chassis lines exist, each distinct chassis or group initiates an independent compute cluster.
- Hardware options belonging to a cluster are partitioned against this anchor.

---

## 2. Pre-Multiplied BOQ Decomposition (`Rule 38`)
- **Single-Node Normalization**: Decomposes aggregated multi-node tenders ($N > 1$) into an atomic **Base Unit BOM**:
  $$Q_{\text{node}} = \frac{Q_{\text{total}}}{N}$$
- **Fractional Anomaly Detection**: If $Q_{\text{total}} \pmod N \ne 0$, the item is flagged as an uneven allocation or order-level accessory rather than silently rounding.
- **Physical Checker Isolation**: 7-Aspect engineering checkers evaluate **ONLY** the Base Unit BOM ($Q_{\text{node}}$) to prevent false physical capacity breaches (e.g. 8 CPUs in a 2-socket chassis).

---

## 3. Hardware Spec String Neutralization (`Rules 5 & 43`)
Hardware descriptions often embed technical specification tokens that look like quantities or multipliers:
- Tokens like `x8`, `x16`, `4x`, `2x`, `#`, `Gen5`, `3x16`:
  - E.g. `804943-B21` *"HPE ProLiant 4x Lift Handle Option Kit"*
  - E.g. `P74690-B21` *"DL380a Gen12 Rear 3x16 Slot FIO Kit"*
  - E.g. `P10115-B21` *"Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter"*
- **Neutralization Invariant**: Pre-processing sanitizes and masks spec notations before quantity extraction to prevent regex parsers from treating spec tokens as quantity multipliers.

---

## 4. Service & Installation Item Quarantining (`Rule 44`)
- OEM service SKUs and install descriptions frequently contain chassis-like acronyms (e.g. `HA113A1 5A6` *"HPE Proliant DL/ML Install SVC"*).
- Pre-processing quarantines service SKUs and regex matches for `\b(install|startup|deployment|svc|care pack|tech care)\b` to prevent false detection as server compute nodes.

---

## 5. Spares & Order-Level Services Immunity (`Rules 4 & 36`)
- Order-level installation services (`HA113A1`), break-fix warranties (`HU4B2A3`), spares, and bulk accessories (`804943-B21` lift handles) remain scoped at `nodeMult = 1`.
- They are **never** divided across nodes during single-node decomposition and are preserved at full order quantity.

---

## 6. Dynamic Non-BOM Sheet Filtering (`INV-63`)
- Multi-sheet enterprise workbooks frequently contain non-BOM documentation tabs:
  - *Cover Page*, *Title*, *Terms & Conditions*, *Instructions*, *Readme*, *Summary*, *Notes*.
- `isNonBomSheet(sheetName, sheetRows)` inspects tab names and column headers, skipping administrative tabs to isolate the true hardware table automatically without manual user filtering.

---

## 7. Strict Model Isolation (`DL380a_Gen12` vs `DL380_Gen12`)
- `DL380a_Gen12` is a dedicated AI accelerator server supporting up to 8DW/16SW GPUs (`P75008-B21`/`P75002-B21` GPU Mode choices, `S3U30C` H200 GPUs, captive GPU risers).
- Quotes/BOQs specifying "DL380a" or GPU server SKUs **MUST** evaluate strictly against `outputs/ProLiant/Gen12/DL380a_Gen12` and dedicated NotebookLM notebook `DL380a` (`b233ec88-4682-4164-a801-3ee6ca649dc1`). Never route to standard `DL380_Gen12`.
