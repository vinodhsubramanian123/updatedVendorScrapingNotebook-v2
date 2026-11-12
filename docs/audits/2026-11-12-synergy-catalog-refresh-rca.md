# Synergy catalog refresh root-cause analysis

The November 6 NotebookLM publication reused the October 29 SY480 Gen12 and October 30 F32 OCA captures. The sync and rules audit began with catalogs already on disk. A successful upload could therefore make the portfolio look current while the frame itself and two separately configurable module menus were absent from the inventory. The OCA column named `Est. Lead Time` also escaped lead-time normalization.

The refresh planner now resolves the supplied BOM against exact base SKUs. The portfolio audit compares the registered products and their owned menus against local artifacts and receipts. It checks capture age and the published artifact fingerprints separately. A receipt must bind the correct child and parent base SKUs for a menu captured under the frame.

| Scope | OCA base SKU | Capture method |
| --- | --- | --- |
| Synergy 12000 Frame | `P51174-B21` | Commercial frame menu |
| Synergy 480 Gen12 | `P68217-B21` | Commercial compute module menu |
| Virtual Connect SE 100Gb F32 | `867796-B21` | Owned menu under the verified frame |
| 4-port Frame Link Module | `876852-B21` | Default owned menu under the verified frame |
| Brocade 64Gb Fibre Channel Module | `P77653-B21` | Select one module in a fresh frame configuration, confirm the selection, then capture its menu |

The shared-knowledge writer could overwrite catalog publication metadata after an upload completed. It now merges only the shared document fields and verified shared-source IDs into the latest registry under a file lock. The catalog canary checks the exact target identifier, the candidate source citation and the workbook fingerprint. The SY480 rule payload retains the exact parent SKU when the rule supplies both the registered frame name and its SKU.

The frame catalog captured on November 11 records `AF573A` at 8 days and `A0K02A` at 21 days. Both are 2 m C13–C14, 250 V, 10 A jumper cords. These are observed OCA estimates. The supplied BOM has no PDU model, and the capture receipts cover the observed menus and selector states. A whole-configuration CLIC receipt would be separate evidence.

Run the following to audit one product with both freshness and publication checks. Omit `--chassis` for the registered portfolio. The audit exits unsuccessfully when required evidence is missing.

```powershell
node scripts/maintenance/audit_product_rules_association.js --chassis SY480_Gen12 --require-fresh --require-published
```
