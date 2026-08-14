# Learned Rules Knowledge Base — Isolated Scope Taxonomy

This directory maintains isolated, structured rule sets to prevent cross-pollination between product lines and ensure clean grounding for Gemini NotebookLM RAG and deterministic AI pre-checks.

## File Organization & Scopes

| File | Scope Taxonomy | Description | Target Notebooks |
|---|---|---|---|
| [`universal_vendor_rules.json`](./universal_vendor_rules.json) | `UNIVERSAL_VENDOR` | Rules enforced across all HPE enterprise servers (BTO/CTO isolation, TAA/GTA exclusions, -48VDC Lug Kits). | All Product Notebooks |
| [`family_gen_rules.json`](./family_gen_rules.json) | `FAMILY_GEN` | Rules bound to a specific generation/family (ProLiant Gen12 DDR5 channel balance, Alletra storage cache). | Family-Specific Notebooks |
| [`chassis_specific_rules.json`](./chassis_specific_rules.json) | `CHASSIS_SPECIFIC` | Exact physical constraints for single chassis models (DL380 Gen12 8SFF SAS/SATA cable kits). | Model-Specific Notebook Only |

*Generated automatically by HPE Knowledge Sync Engine.*
