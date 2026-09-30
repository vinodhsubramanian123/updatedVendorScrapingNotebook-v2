# Independent scraping review after d4212b6 and subsequent check-ins

Scope: HPE DL380 Gen12, reviewed 2026-09-30. This review does not certify exhaustive product coverage or replace the separate core/test architecture remediation.

## Live evidence

The initial navigator discovered 126 search candidates, with 26 matching CTO candidates. It selected P77819-B21, explicitly described by OCA as an **HPE OEM ProLiant Compute DL380 Gen12 8SFF NC Configure-to-order Server**. This is an OEM CTO, not an appropriate automatic default for a generic commercial DL380 Gen12 request.

After correcting the default selector and relaunching a fresh configuration, OCA selected **P73282-B21 — HPE ProLiant Compute DL380 Gen12 SFF NC Configure-to-order Server**. Navigation reached `NAVIGATED_TO_CONFIG_PAGE`. The search-price result was unverified; zero must not be presented as a verified free chassis. Evidence logs are under `outputs/ProLiant/Gen12/DL380_Gen12/evidence/scraping_review/`.

No complete catalog refresh, workbook promotion, NotebookLM replacement, or Tier 3 build acceptance was performed in this review.

## Corrections

- Preserve OEM CTOs in discovery but exclude them from generic default selection. Explicit target selection cannot silently fall back to another candidate. Active-session reuse requires product identity and rejects an OEM page for a generic request.
- Fix recovery reassignment of a constant page target.
- Missing affirmative stage evidence and unknown stages now fail verification. Chassis count cannot default to one. The generation gate computes actual SKU loss and checks recommendation fields instead of supplying unconditional PASS flags.
- Remove invented variant drive, expansion and PSU capabilities and the unsupported claim of a shared options pool.
- Recommendation is Unknown unless observed. CTO does not imply Recommended; `not recommended` no longer matches Yes. Synthetic chassis entries do not claim a recommendation.
- Unsupported vendor identities/adapters fail explicitly. Correct HPE navigator call signature. Dell placeholders no longer return fabricated live SKUs, prices or successful navigation.
- Backend capture waits for loading completion, decodes base64, restricts capture to the configured vendor host, removes URL queries, flushes outstanding body reads, and records capture failures. Unclassified notices remain raw observations instead of becoming inferred conflicts. Only recognized dependency/conflict types enter compiled rules.

## Validation

25 focused tests passed: product selection, verification contracts, existing vendor/matrix checks, and a new CDP completion/base64/origin/provenance regression. Syntax checks passed for the scraper, catalog builder, workbook generator and navigator. The existing matrix test simulates matrix data; it is not proof of the generated workbook or real chassis capabilities. Full certification remains separate.

## Remaining acceptance gaps

1. Discovery is not traversal. Every discovered supported base SKU needs its own capture receipt, branch state, rules and price provenance before claiming full-generation coverage. OEM, TAA, regional and appliance scope must be explicit; current eligibility filters exclude some variants.
2. Hidden DOM and ambient sweeps are not exhaustive CPU-count, backplane, PSU, GPU, NIC, support or multi-selector exploration. Record reached/unreached branches and never claim all combinations from this capture.
3. Backend observation is limited to requests made after interception starts. Endpoint schemas need validated adapters, recursive structured extraction, deduplication and bounded telemetry. Unseen requests cannot be inferred as absent rules.
4. Variant-scoped availability, prices, services and conditional rules need an aggregation contract; SKU-only union is insufficient when conditions differ between bases.
5. Stale lease reclamation still has a concurrent-reclaimer race and requires an atomic ownership protocol before simultaneous agents share a portal workflow.
6. Run the complete scoped live capture and verify dated deltas, every master workbook tab, replacement NotebookLM source readiness and citations before retiring prior sources. Existing checked-in claims of certified end-to-end operation exceed the evidence collected here.

The successful commercial navigation establishes the corrected selection path only. Catalog completeness, live prices, full branch coverage, cloud grounding and build acceptance remain distinct, unverified evidence states.
