# Catalog refresh and knowledge synchronization — 29 October 2026

## Scope and acceptance

Refresh DL380a Gen12, DL380 Gen12, Synergy 480 Gen12 and Synergy F32 as separate exact products. The Synergy 12000 enclosure and its relationships are not certified by a compute or fabric catalog capture. Capture coverage remains limited to visited bases and observed selectors.

Completion requires audited JSON/services/rules/workbook parity, original vendor timestamps, capture provenance, current Drive workbook readback, complete NotebookLM semantic-source readback, a source-restricted grounded canary, durable trust activation, and post-deletion inventory of only the replaced managed catalogs. Preserve official documents, independent learning sources, shared-component sources and unrelated files.

## Initial live observations

- Drive/Sheets and NotebookLM authentication succeeded. Partner Portal sign-in and authenticated OCA launch succeeded for commercial DL380a Gen12 P76706-B21.
- Server captures were dated 17 October despite NotebookLM uploads dated 28 October. Upload time must not be reported as capture freshness.
- Synergy compute capture was dated 11 September; the F32 baseline was dated 10 August. Both lacked current matching cloud fingerprints.
- Initial server builds omitted raw CPU rows carrying `[CS]` badges. The 30-CPU audit exposed this loss. Correcting normalization restored 32 processor entries on DL380a and 34 on DL380. The 30-CPU guard remains enabled for both products. Corrected retained captures contain 451 and 605 unique hardware SKUs respectively, across 27 and 26 sheets.
- Windows directory promotion returned EPERM. A native Move-Item fallback was removed after it moved part of the baseline before failing. The baseline was reconstructed from retained files and all four artifacts matched the previous registered SHA-256 values. Keep that incident distinct from successful publication.

## Implemented workflow corrections

- `publishDriveWorkbook: true` publishes/read-verifies a human workbook independently of `canonicalDriveEnabled: false`, which selects a semantic Markdown source for NotebookLM. Enabled for the four scoped products. The preflight checks Google scopes when this publishing mode is enabled.
- Human workbook publication fails closed on missing destination, wrong returned sheet ID, unsuccessful write, absent full fingerprint or failed readback. Preserve rollback backups from the existing Sheets writer.
- Product shorthand `DL380a_Gen12` retains the ProLiant family rather than General/UNKNOWN.
- `[CS]` is stripped from the SKU identity while retained as `vendorAttributes['Vendor Status Badge']`. Its meaning/orderability remains unverified; it is not silently classified as an accepted or orderable option.
- Ambient row selection prioritizes an actual input or `.item_qty_div` ahead of its parent table cell. Wait for one selected row, settled content and restored baseline. The bounded readback window is 90 seconds; timeout remains a failure.
- Retained staging audits compare discovery time against vendor capture time, rather than the time the audit is rerun. Resumption still requires capture age at most 72 hours.
- Recovery rejects source IDs present before an upload even if an erroneous queue entry claims ownership. Recovery tests use an isolated queue rather than mutating the production recovery ledger.

## Resume and future execution

Use the canonical scraper for a new capture:

```powershell
$env:NLM_SYNC_READ_TRANSPORT = 'httpx'
node scripts/scrapers/scrape_oca_solution.js --chassis DL380a_Gen12 --confirm-source-retirement
```

After an audited capture encounters a publication failure, use the checked resume command with the retained stage, not an invented capture timestamp:

```powershell
node scripts/maintenance/resume_catalog_refresh.js DL380a_Gen12 outputs/temp/staging_DL380a_Gen12_1793254439486
```

The command checks staging enclosure, product identity, age, preflight, workbook audit and capture provenance before invoking the existing promotion, metadata and cloud-sync APIs. It writes `evidence/resumed_catalog_refresh.json`. It does not weaken promotion or cloud verification gates.

Record scoped workflow advisories idempotently:

```powershell
node scripts/maintenance/record_catalog_refresh_learnings.js DL380a_Gen12 DL380_Gen12 SY480_Gen12 SY100Gb_F32_Module
```

All 12 advisories were reachable through the active knowledge router. This verifies advisory discovery, not hardware compatibility or cloud publication.

## Cloud learning intake

Original source contents were downloaded into each product's `evidence/2026-10-29-cloud-*.txt`. Preserve the documents; they are candidates for engineering review, not automatically authoritative hardware rules.

| Product | Source ID | Content |
|---|---|---|
| DL380a Gen12 | cabe1be1-4890-42b9-b216-b20671bada8a | Comprehensive learnings v3 |
| DL380 Gen12 | e2b95d35-9988-4640-ab6f-db0e216808fa | Memory sourcing master learnings |
| Synergy compute/frame | f2874ad6-a131-4127-8a17-8ac22f1eaf1a | Architecture charter |
| Synergy compute/frame | 360db92c-82ce-455d-924b-48a6d468ddb5 | CLIC and partitioning learnings |

The DL380a v3 source contradicts itself on cable kits per GPU pair. It also makes broad factory-bundling and fixed-PSU claims requiring exact base, mode and dated receipt checks. Do not convert these claims into dependencies without resolving those boundaries. The Synergy documents describe a particular multi-frame configuration; do not generalize its quantities into standalone module rules.

## Validation record

- Initial focused sync/freshness/refresh tests: 23 passed, zero failures/skips.
- Ambient-control and transaction-recovery tests after the recovery fix: 11 passed, zero failures/skips.
- Final focused semantic parsing, ambient, sync/freshness, refresh and transaction checks: 44 passed, zero failures/skips, with `--test-concurrency=1` because older source-transaction fixtures share workflow leases. An initial concurrent invocation had two lease-contention failures; those were not live vendor failures.
- Both corrected retained server workbooks passed their complete tally audits. Cloud publication is a separate pending operation until its verified receipt is recorded.

## Verified continuation and parent-component discovery

Live source inventory on 29 October confirmed current source presence and exact local four-artifact hash equality for DL380a, DL380 and SY480. Their resumed refresh receipts report CLOUD_VERIFIED and human workbook readback. Active sources are respectively `96acd6c8-3537-4296-a18f-1ec0619bc649`, `177800cf-4bf4-4db7-bf14-ba59a9cab3d1`, and `ffddc101-14e0-4612-9daf-15e7299553bd`. Only one matching managed catalog remains for each. Independent sources were preserved.

F32 remains incomplete. Its old three-row registry summary mixes compute, frame and fabric and is not a complete captured module catalog. The attempted cloud upload failed semantic content readback and was removed; do not relax that gate. The old F32 source in the SY480 notebook is preserved until an exact verified replacement exists.

The identity resolver now returns the exact registered key after matching: stripping `_Module` from `SY100Gb_F32_Module` previously caused preflight to miss its notebook. Portal matching recognizes 100Gb F32 explicitly and rejects compute modules, other fabric models and support-only rows. Focused refresh tests passed 45/45, scope tests 17/17, and updated identity tests 10/10.

Standalone F32 search did not find an eligible module. Following the user's parent-product guidance, authenticated OCA navigation reached Synergy 12000 commercial frame `P51174-B21`. Continue through its owned interconnect options; capture frame/base and child owner separately. Never relabel the entire frame catalog as F32 or infer module options from the old three-row summary. On 30 October the expired portal session required normal Partner Portal authentication renewal.

This is a running evidence record, not a whole-family completion certificate.

## 31 October hardening and validation

F32 capture was rebuilt from its own 867796-B21 menu beneath the P51174-B21 frame. It contains 142 retained hardware identities (including tombstones), two service/license identities, and 17 workbook sheets. Selected support retains its full #Z1R suffix and unknown price. Alternative support branches remain unexecuted. Unscoped solution services are retained in raw evidence but excluded from the component catalog. The full workbook audit passed. Publication separately requires the final cloud receipt.

Missing current prices no longer borrow quantities, extended totals, historical prices, or fabricated zero. Obsolete hardware remains retained but is excluded from current price-coverage denominators. Exact registered module identity survives alias matching; networking modules do not receive compute CPU/DIMM requirements. Legacy incomplete baselines remain recoverable in promotion backups. Metadata tally includes retained tombstones consistently with catalog metadata.

Validation: 49 impact tests, 25 final focused tests, 12 receipt tests, and 21 component/parser tests passed in separate runs. A later receipt test overlapped the live cloud transaction and failed its shared lease expectation; rerun after cloud completion. Graph integrity passed with all 30 skills connected. No blanket certification of arbitrary products, generations, unseen selectors or full Synergy solutions is implied.
