---
name: cross-vendor-transformation-skill
description: >-
  Translate a competitor hardware tender into an evidence-backed HPE proposal, preserving
  source requirements and documenting parity gaps.
  **DO call for:** "Convert this Cisco UCS BOM to HPE equivalent", "Provide HPE alternative
  for this Dell PowerEdge quote", "Translate this Lenovo tender to ProLiant."
  **DO NOT call for:** general competitive questions ("what does X cost?"), Gen11 vs Gen12
  comparisons, or freeform product questions — those route via presales-query-router.
---

# Cross-Vendor Transformation & Parity Translation Engine (`cross-vendor-transformation-skill`)

## 1. Scope & Parity Invariants
This skill governs the systematic translation of competitor hardware tenders (Dell PowerEdge, Cisco UCS, Lenovo ThinkSystem, Supermicro) into verified HPE ProLiant/Synergy equivalents while preserving core customer specifications and documenting technical parity gaps (`INV-190`).

- **Competitor Ingress Detection (`INV-190`)**: Competitor part numbers are candidate evaluation requirements, never ground truth. They MUST be mapped to functional equivalents in the certified HPE catalog.
- **Fabric & Protocol Parity (`INV-216`)**: InfiniBand and RoCEv2 fabrics are distinct; high-performance compute interconnects (e.g., NVIDIA Quantum-2 IB vs. 200Gb/400Gb RoCEv2) MUST NOT be silently conflated or substituted without parity disclosure.
- **Turnkey Completeness (`INV-228`)**: Turnkey competitor proposals specifying installation mandate equivalent HPE rail kits, optical transceivers, and PDU cables (`turnkey-racking-cabling-skill`).
- **Normative Directives**: Comply with [Normative Language Standard](../../rules/normative_language.md).

---

## ⛔ HALT Conditions

```
HALT-CV1: If context.targetVendor or target chassis is not specified:
  emit [ERR_TARGET_PRODUCT_REQUIRED] and request exact target platform (e.g., 'DL380 Gen12').
  Do NOT infer a default model or assume an unverified chassis.

HALT-CV2: If source BOM rows are 0 after ingestion:
  emit [ERR_EMPTY_SOURCE_BOM] and HALT. Route to ocr-quote-ingestion-skill if input is an image or PDF.

HALT-CV3: If target chassis catalog is missing from outputs/{Family}/{Gen}/{Model}/:
  emit [ERR_CATALOG_UNAVAILABLE] and HALT. Scrape target chassis catalog first.
```

---

## 2. Execution Pipeline

1. **Source Ingestion**: Ingest the competitor quote via spreadsheet parsing or OCR. Retain original rows, units, configuration ownership, and per-node quantities.
2. **Intent Routing**: Dispatch via `scripts/evaluators/route_query.js` with explicit cross-vendor intent.
3. **Requirement Extraction**: `scripts/lib/boq/cross_vendor_transformer.js` invokes `parseCompetitorSpecification()` to extract CPU cores, clock speed, socket counts, memory capacity, drive types/RAID, GPU accelerators, and network bandwidth. Unparsed items remain visible as `unresolvedRequirements`.
4. **Target Synthesis**: Synthesize candidate HPE configurations via [`rfp-sizing-synthesizer`](../rfp-sizing-synthesizer/SKILL.md) and evaluate candidate buildability via canonical `eval_boq.js`.
5. **Physical Aspect Verification**: Audit all 7 physical aspects. Protocol mismatches (e.g., InfiniBand vs. Ethernet RoCEv2) MUST be explicitly flagged.
6. **Grounding & Receipt**: Verify candidates via ephemeral NotebookLM query (`INV-24`). Final deliverables remain marked `PORTAL VALIDATION PENDING` until live CLIC verification occurs (`INV-201`, Gate B19).
7. **Workbook Generation**: Format deliverables via [`workbook-generator-skill`](../workbook-generator-skill/SKILL.md) and [`boq-remarks-reconciliation-skill`](../boq-remarks-reconciliation-skill/SKILL.md) for transparent customer line-by-line reconciliation.

---

## 3. References & Related Charters
- [Cross-Vendor Architecture Transformer](../../../scripts/lib/boq/cross_vendor_transformer.js) via `parseCompetitorSpecification()` and `transformCompetitorQuote()`
- [Heterogeneous Tender Modernizer](../heterogeneous-tender-modernizer/SKILL.md)
- [RFP Sizing Synthesizer](../rfp-sizing-synthesizer/SKILL.md)
- [Master System Invariants Directory (INV-190, INV-216, INV-228)](../../../docs/INVARIANTS.md)
