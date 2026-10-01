# DL380_Gen12 scoped workflow corrections and observed H200 states

Scope: HPE / SERVER / ProLiant / Gen12 / DL380_Gen12. Workflow review and dated vendor observations; not a complete catalog, customer BOM, general hardware rule or CLIC acceptance. These corrections supersede contradictory workflow inferences; use the exact vendor context.

## LEARN_DL380_GEN12_H200_OBSERVED_STATES_20261001

Live OCA evidence on commercial DL380 Gen12 base P73282-B21: S3U30C NVIDIA H200 NVL 141GB was already present in the DOM at selected 30C tracking SKU P79552-B21, but hidden and marked unavailable. Vendor text says H200 NVL and 30C cannot be selected together. At selected 27C tracking SKU P79555-B21 the unavailable flag and restriction disappeared; the collapsed section still hid the row visually. Original 30C was restored. This is two observed selector states, not proof of every lower temperature or final CLIC build acceptance. Evidence: evidence/scraping_review/h200_at_30c_before.json and h200_at_27c.json. Do not compile the 30C prohibition as an allowed <=30C gate.

## LEARN_DL380_GEN12_OEM_DEFAULT_20260930

OCA observed P77819-B21 as OEM DL380 Gen12 CTO. Preserve it in scoped discovery; a generic commercial DL380 Gen12 request must not automatically choose OEM. P73282-B21 was observed as commercial CTO, not certified as a permanent substitute or live-price guarantee.

## LEARN_DL380_GEN12_RUNTIME_DISCOVERY_20260930

Catalog absence is not proof of unsupported hardware. Investigate missing and conditional BOQ SKUs on the exact base and owning configuration, with the requested quantities and environmental state. Hidden presence establishes observation only. Revalidate each changed manifest in CLIC; a runtime plan does not establish acceptance.

## LEARN_DL380_GEN12_COVERAGE_BOUNDARY_20260930

Chassis discovery does not establish traversal. Current automated conditional capture covers hidden DOM and ambient probes; other selector combinations and all-base coverage remain unverified. Unknown recommendation, price and variant capability stay unknown. Do not retire prior NotebookLM sources before replacement verification.

Learning revision: b72420b16ad98907ee5a68cd2ca47ef59250cd00a675e91f2c24ba07203a692d
