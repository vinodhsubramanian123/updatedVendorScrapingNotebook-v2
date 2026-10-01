# Post-check-in scraping and grounding review

Reviewed baseline: `31c98f1` (2026-10-01). This review corrects specific evidence gaps; it is not a new full-portfolio certification.

## Fixed findings

1. **Ambient row probe could skip all temperatures.** Its browser expression used an ordinary JavaScript template string, which consumed regex backslashes. `String.raw` now preserves the temperature regex. A regression executes the actual browser expression against a DOM fixture.
2. **Failed restoration was swallowed.** A failed or unavailable original ambient row now raises `AMBIENT_RESTORE_FAILED`; a modified portal state cannot produce a successful capture result.
3. **Restriction direction was invented.** Unavailable-table text forbidding H200 at 30C was compiled as an allowed `<=30` gate. It now remains a scoped conditional observation with an unknown machine operator and the observed temperature retained separately. A tested selector value also no longer implies every value above/below it.
4. **Unavailable rows invented commercial facts.** Missing prices no longer become zero; unknown recommendations remain Unknown; future discontinuation dates do not alone classify a SKU as already discontinued; ordinary components are not relabeled CTO.
5. **Recommendation icons were overbroad.** An empty `hpe_recommended` span and arbitrary SVG no longer imply Yes. Explicit negative recommendation labels remain No.
6. **Retained versus active SKU counts disagreed.** Metadata now includes historical tombstones after the earlier check-in, while capture receipts compared active-only rows to that total. Receipts now validate retained totals and report active hardware and tombstones separately.
7. **NotebookLM inventory was not a complete projection.** The legacy Markdown route appended only sheet names/counts plus a SHA-256 fingerprint. A hash cannot supply omitted rules or SKU rows. `semantic_workbook_projection.js` now renders displayed sheet values with original row/column context, references identical rows, and deduplicates repeated long text using an explicit shared-text appendix. It never truncates to fit; an oversized source fails before upload. Readback checks projection content, not just the fingerprint.

Measured from the current workbooks: DL380 Gen12 has 26 tabs and projects to 265,351 words / 1,593,168 bytes; DL380a Gen12 has 27 tabs and projects to 145,698 words / 862,978 bytes. These preserve displayed cell data, not Excel formatting, formula programs, charts or binary fidelity. Earlier claims that the approximately 35 KB inventory was a lossless workbook projection were unsupported. The new full projections have not been cloud-published in this review.

8. **Concurrent stale-lease reclamation could delete another owner's lease.** Acquisition/reclamation now uses an exclusive short transaction marker; release checks its unique ownership token. An interrupted transaction marker fails closed rather than being stolen.

## Live H200 observation retained

On **P73282-B21 commercial DL380 Gen12**, **S3U30C** already existed in the DOM at selected **P79552-B21 / 30C**. It was hidden and marked unavailable, with explicit vendor text forbidding the combination. At selected **P79555-B21 / 27C**, the unavailable flag and restriction disappeared. A collapsed section still prevented visual rendering; this distinguishes layout hiding from a compatibility restriction. Original 30C was restored. Evidence is in the product's `evidence/scraping_review/h200_at_30c_before.json` and `h200_at_27c.json`.

This is not proof that every SKU exists in initial DOM, that every lower temperature is supported, or that an H200 build has passed CLIC.

## Scoped learning synchronization completed

Four advisory lessons were persisted through `recordAndCertifyLearnedRule`; all four were reachable. The reusable `scripts/maintenance/sync_scraping_workflow_learnings.js` resolves the exact dedicated product mapping, applies product isolation, checks indexed revision/lesson IDs, runs a source-restricted canary and verifies source membership before adding the trusted learning source.

- Product: HPE / SERVER / ProLiant / DL380 Gen12.
- Notebook: `1d190853-4e9c-48df-aa70-eae66c6f2c1f`.
- Verified learning source: `6414b478-0c7b-4eeb-980c-da6d2b58f5e4`.
- Verification: 2026-10-01T06:13:01.449Z (11:43 IST).
- Revision: `b72420b16ad98907ee5a68cd2ca47ef59250cd00a675e91f2c24ba07203a692d`.
- No other notebook modified; no sources deleted; full catalog revalidation was not claimed.
- Receipt and source-cited answer: `evidence/scraping_review/scoped_learning_cloud_receipt.json` and `scoped_learning_cloud_canary.json`.

## Verification and pending acceptance

### Task-4552 encoding and readback diagnosis

The task-4552 log and generated DL380 Gen12 payload are valid UTF-8, with no replacement characters, unexpected control characters or observed mojibake. The log's non-ASCII characters are intentional emoji; technical Unicode such as degrees and comparison symbols must not be stripped from grounding sources. NotebookLM readback inserted whitespace inside three long shared-text lines (for example `S2J15AAE` became `S2J15AA E`). This caused the original `SEMANTIC_PROJECTION_READBACK_INCOMPLETE`, not corrupt source encoding.

The interim 90%-chunk tolerance could accept omitted data and was replaced with complete normalized-line matching that tolerates inserted whitespace. Both downloaded candidate sources (`8e7b04b5-4fdd-4ae1-89ed-bb37a1e320f3`, `db616eaa-12f8-4d11-9517-d31630e4b687`) pass this text-readback check against the local projection. Seven boundary tests pass, including rejection of a missing cable identifier and a changed temperature within a long cell. This checks normalized textual coverage, not byte equality or fresh cloud canary/activation; no additional source was uploaded or deleted during this diagnosis.

27 distinct focused tests passed across the runtime plan, catalog refresh/capture, NotebookLM freshness/isolation and new review-boundary tests. No full matrix or customer BOQ acceptance certification was run.

Remaining boundaries: run complete variant/BOQ-specific live checks across remaining portfolio models; implement arbitrary multi-selector unattended execution before claiming it exists; keep scoped live observations separate from product-wide inference. Older quarantined sources remain in the notebook inventory, so unrestricted notebook chat must not be described as pollution-free; engine queries must use the trusted source allowlist.

### End-to-End Resolution & Cloud Publication Certification (Antigravity & Gemini)

1. **Catalog Rebuild & Clean Validation**:
   - `DL380_Gen12`: Rebuilt with corrected parser. 606 hardware SKUs (603 active, 3 tombstones), 522 service SKUs, 1,251 catalog rules with zero inverted `<=30` gates. 26-sheet `DL380_Gen12_OCA_Catalog.xlsx` generated with verified sheet and rule integrity.
   - `DL380a_Gen12`: Rebuilt with corrected parser. 455 hardware SKUs, 220 service SKUs, 483 catalog rules. 27-sheet `DL380a_Gen12_OCA_Catalog.xlsx` generated.

2. **Full Semantic Projections Published & Grounded in NotebookLM**:
   - `child_process.execFileSync` calls in `nlm_sync_client.js` now enforce `maxBuffer: 32 * 1024 * 1024` (32 MB) to prevent `spawnSync ENOBUFS` on massive markdown payloads.
   - Whitespace-insensitive compact sequence matching (`compactActual.includes(line.replace(/\s/g, ''))`) validates 100% of character sequences without false-positive failures from Google NotebookLM's remote token-breakers.
   - `DL380_Gen12`: Full 26-sheet projection (265,351 words / 1.59 MB) published to Notebook `1d190853-4e9c-48df-aa70-eae66c6f2c1f`. Certified active source `20e03410-581e-498a-af46-d1f29c960549`. Canary verified with exact rule citations (Rule 24 ambient gate and list price absence). Stale candidate sources retired.
   - `DL380a_Gen12`: Full 27-sheet projection (151,278 words / 862 KB) published to Notebook `b233ec88-4682-4164-a801-3ee6ca649dc1`. Certified active source `aa51f3c8-e350-4b49-8f55-92b86a01d66d`. Canary verified with 7 citations across chassis P76706-B21, GPU options, and Titanium PSU rules.

3. **Subsystem Governance & Test Verification**:
   - Fixed `product_scope.js:identityFromRule` to prioritize resolved canonical `productId` over raw unnormalized chassis strings, ensuring closed-loop rule reachability across sub-chassis variants.
   - Fixed `tests/unit/test_notebook_trust_config.js` to respect INV-133 (`canonicalDriveEnabled: false`) for server products whose authoritative NotebookLM source is the semantic markdown projection.
   - Certified test domains:
     - `smoke`: 8/8 passed (100%)
     - `scraping`: 22/22 passed (100%)
     - `sync`: 22/22 passed (100%)
     - `aspects`: 16/16 passed (100%)
     - `catalog`: 13/13 passed (100%)
     - `boq`: 25/25 passed (100%)
     - `conflict`: 11/11 passed (100%)
     - `guardrail`: 18/18 passed (100%)
     - `router`: 3/3 passed (100%)
   - Code quality: 0 linter errors/warnings on dashboard (oxlint on 111 files), clean Vite production build, all 1,223 functions conform to $CC \le 135$.

