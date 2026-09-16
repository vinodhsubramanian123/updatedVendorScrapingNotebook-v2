# Universal Vendor Architecture & Platform Invariants Charter

**Document Classification:** Canonical Universal Vendor Standards & Invariants  
**Maintained By:** HPE ProLiant AI Studio Autonomous Knowledge Engine (Antigravity AI)  
**Last Synchronized:** 2026-09-16T21:20:26.502Z  
**Scope:** Universal Hardware & Platform Laws (INV-1 through INV-38)  

---

## 1. Universal Cross-Platform Hardware Laws & Invariants

| Category | Law / Invariant | Enforcement & Technical Rationale |
| :--- | :--- | :--- |
| **Option Placement** | **INV-25: Multi-Chassis Container Tree** | Components inside Configure-to-Order (CTO) base chassis must carry Factory-Integrated Option tags (`#0D1` / `-F21`). Standalone BTO (`-B21`) components placed in CTO containers fail factory CLIC validation (Rules 81354490 & 91001655). |
| **Processors & Thermal** | **TDP Redline & Heatsink Selection** | Single processors with TDP ≤ 185W run on standard heatsinks. Single processors with TDP > 185W up to 350W strictly mandate Performance Heatsinks. |
| **Cooling & Fans** | **High-Performance Fan Threshold** | Standard 4-fan cooling is capped at 240W system-wide. High-Performance Fan Kits are strictly required when: CPU TDP ≥ 240W, cabled NVMe storage is configured, or dual-processor (2P) configurations are deployed. |
| **Memory Channels** | **8-Channel Symmetrical Interleaving** | Intel Xeon 6 memory controllers mandate population in balanced blocks of 8 or 16 DIMMs per CPU (1DPC at 6400 MT/s, 2DPC throttled to 6000 MT/s). Asymmetrical quantities disable interleaving and incur severe throughput degradation. |
| **Memory Restrictions** | **Zero Rank & Monolithic Mixing** | Mixing of x4 and x8 memory is prohibited. Mixing standard planar RDIMMs with 3DS RDIMMs is prohibited. 96GB/128GB densities are mutually exclusive. 16GB RDIMMs are restricted strictly to 1DPC. |
| **Power Infrastructure** | **INV-30: EU ErP Lot 9 & Platinum PSUs** | European Union ErP Lot 9 mandates 96% Titanium power supplies. Platinum PSUs (94%) deployed outside Europe require the `P35876-B21` CE Mark Removal FIO Enablement Kit ($1.00 list) to bypass regulatory blocks cleanly. |

---

## 2. Universal Rule Ledger & Verification Provenance

Total verified universal rules indexed: **1**.

| Scope | Category | Affected SKU | Dependency SKU | Rule Summary / Validation Directive | Verifications |
| :--- | :--- | :--- | :--- | :--- | :---: |
| 🌐 UNIVERSAL | `undefined` | `PORTAL` | `P64707-B21` | If PORTAL is present, P64707-B21 is mandatory. | 1x |

---
*End of Universal Vendor Architecture Charter. Product-specific rules are strictly encapsulated in their respective product notebooks.*
