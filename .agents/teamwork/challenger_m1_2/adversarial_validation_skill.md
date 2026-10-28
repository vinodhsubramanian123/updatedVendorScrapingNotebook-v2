# Adversarial Red-Teaming & Boundary Validation Skill (Local Dump)
Source: c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\skills\adversarial-validation-skill\SKILL.md

Core Methodology:
Automated adversarial red-teaming, boundary fuzzing, and stress-testing on physical aspect checkers.
Focus for Milestone 1:
1. Zero PSUs on standard server chassis (must fail).
2. Integrated power chassis (Alletra, StoreEver) with 0 PSUs (must pass without false error).
3. PSU wattage deficit (e.g. 1400W system with 500W PSUs must fail).
4. PSU headroom deficit (<20% margin must warn).
5. Drive count exceeding backplane capacity (must fail `isBackplaneCapacityExceeded`).
6. Storage controller without cable kit (must fail `needsCableKit`).
7. LFF drives in SFF chassis, missing Alletra controller node, missing StoreEver SAS cable (must fail).
8. `SWITCH_FABRIC_PORTS` port oversubscription on networking switches (must fail).
9. `ARCHIVE_COLD_STORAGE` cartridge count exceeding tape library capacity (must fail).
