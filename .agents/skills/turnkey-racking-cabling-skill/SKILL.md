---
name: turnkey-racking-cabling-skill
description: >-
  Turnkey physical racking, DL380a Gen12 factory RAID transpilation, NS204i-u boot decoupling and
  optical/cabling completeness (INV-228).
  **DO call for**: RFPs that mandate installation, racking or cabling; rail-kit and optical-transceiver
  completeness checks; multi-drive NVMe RAID FIO conflicts on DL380a Gen12.
  **DO NOT call for**: conversational Q&A (use presales-query-router), OCR parsing (use ocr-quote-ingestion-skill),
  or software subscription renewals.
---

# Turnkey Racking, Factory RAID & Cabling Completeness (`turnkey-racking-cabling-skill`)

Comply with [Normative Language Standard](../../rules/normative_language.md). Every rule below is taken from `INV-228` in [docs/INVARIANTS.md](../../../docs/INVARIANTS.md); SKU names were checked against the DL380 Gen12 and DL380a Gen12 catalogs on 2026-11-07. Re-verify against the current catalog before quoting.

## ⛔ HALT Conditions

```
HALT-TRC1: If the RFP mandates installation, racking and cabling and no rail kit for the exact chassis is in the manifest:
  emit [ERR_MISSING_RAIL_KIT] and block the 18-point pre-presentation gate until a catalog-verified rail kit is present.

HALT-TRC2: If an open SFP28 cage has neither a matching optical transceiver nor a DAC cable in the manifest:
  emit [ERR_UNMATCHED_OPTICAL_ENDPOINT] and block the gate. Do NOT guess the transceiver; read it from the catalog.

HALT-TRC3: If 339778-B21 is present with more than 2 drives and no dedicated boot device (P78279-B21) and no full-cage RAID setting:
  emit [ERR_RAID_FIO_DRIVE_COUNT] and apply the INV-228 transpilation rules below. Do NOT emit an unbuildable BOM.
```

## 1. Rules from INV-228
1. **Factory RAID**: `339778-B21` (HPE RAID 1 Drive 1 FIO Setting) enforces `Drive Count == 2` in CLIC.
   - If a dedicated boot device `P78279-B21` is present, `339778-B21` is pruned as redundant.
   - If factory array pre-configuration is explicitly mandated across the drive cage, `339778-B21` is transpiled to `389692-B21` (HPE Customer Defined RAID Setting Service, max 1) with zero CapEx delta.
2. **Boot vs workload storage**: `P78279-B21` (HPE NS204i-u v2 480GB NVMe Boot Device) and its front boot cage have no hardware, cage or bus dependency on SFF NVMe data drives, their cage kit or direct-attach cables. Select them independently; do not inject false prerequisites.
3. **Turnkey completeness**: when the RFP mandates installation, racking and cabling, the gate enforces the chassis rail kit and matching optical transceivers or DAC cables for open SFP28 cages. Rails are never bundled in the base chassis.

## 2. Catalog-verified items (2026-11-07 catalog snapshot)

| SKU | Catalog description | Present in |
| :--- | :--- | :--- |
| `P69770-B21` | HPE ProLiant Compute DL380a Gen12 Ball Bearing Rail Kit | DL380a Gen12 |
| `P52341-B21` | HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | DL380 Gen12 catalog |
| `845398-B21` | HPE 25Gb SFP28 SR 100m Transceiver | both |
| `A0K02A` | HPE C13 - C14 WW 250V 10Amp 2.0m Jumper Cord | DL380 Gen12 catalog only |
| `339778-B21` | HPE RAID 1 Drive 1 FIO Setting | both |
| `389692-B21` | HPE Customer Defined RAID Setting Service | DL380a Gen12 only |
| `P78279-B21` | HPE NS204i-u v2 480GB NVMe Hot Plug Boot Optimized Storage Device | both |

Notes:
- A cable-management arm SKU is not documented in INV-228 and no CMA SKU was verified; do not add one from this skill.
- Which rail kit applies to which chassis variant, and any PDU cord requirement, are not stated in INV-228. Resolve them from the exact product catalog and the portal; leave `NOT_EVALUATED` otherwise.

## 3. Related
- [BOM Verifier & Pre-Presentation Gate](../../../scripts/lib/boq/bom_verifier.js) via `verifyPrePresentationAcceptance()`
- [boq-eval-skill](../boq-eval-skill/SKILL.md) for the 18-point gate.
- [multi-cluster-tender-skill](../multi-cluster-tender-skill/SKILL.md) for rack and power totals.
