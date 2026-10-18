# Core follow-up review after 22bdfc7

Reviewed the combined scraping, NotebookLM transport/recovery, candidate revalidation, and new Fast-Ship changes. This is a bounded code review, not live customer or vendor certification.

## Corrections

- Removed hardcoded fallback processors, SSD and fabricated seven-day availability from Fast-Ship synthesis. A missing catalog candidate now produces no alternative.
- Failed physical revalidation cannot produce a Fast-Ship alternative. The candidate remains a proposal requiring requirement, grounded-document and exact portal review even when local checks pass.
- Removed unconditional "100% buildable" and invented intent-alignment percentages. A nested Fast-Ship proposal is not covered by its parent rank's review receipt.
- Missing component lead times keep whole-solution delivery estimates and savings unknown; the maximum of known component lead times remains available separately.
- Corrected the supply-chain fixture to use the actual nested catalog schema. The previous flat fixture passed only because the fabricated SKU fallback masked the catalog miss.

The preceding transport fixes are present in 22bdfc7: source operation timeout configuration, read/mutation transport separation, durable uncertain-upload records, live-PID source shielding, terminal query cancellation, fail-closed missing physical validators, eight-pass dependency repair and honest postflight status.

## Focused validation of this follow-up

`node --test tests/unit/test_supply_chain_lead_time_intelligence.js`: 11 passed, 0 failed. Includes catalog-miss, failed-physical-check and incomplete-delivery-estimate cases.

Scoped oxlint on the changed strategy and test files: exit 0. No additional broad matrix run was launched after the user's instruction to focus on core fixes.

## Remaining boundaries

- `inspectAndEnableToolsMenu` is exported and unit-tested but has no production caller. Tools-menu discovery is not yet an executed scraping stage. Its broad selectors and synchronous open/read/close sequence need observed portal controls and asynchronous readiness handling before production wiring.
- Source attach, inventory and cleanup still use synchronous child processes. Longer operation limits address premature termination but do not provide mid-operation cancellation within the same Node event loop. Cleanup has an independent budget so a caller timeout does not abandon a known temporary source.
- Fast-Ship selection does not prove equivalent capacity, processor performance, endurance or customer intent. Grounded candidate review and exact current portal acceptance remain required; catalog presence or local math cannot establish these facts.
- No new live heavy-notebook upload/query or OCA/CLIC manifest acceptance was performed in this review. Existing historical receipts do not certify the new revision.
