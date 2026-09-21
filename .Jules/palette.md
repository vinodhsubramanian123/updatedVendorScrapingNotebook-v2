## 2026-09-21 - Missing aria-expanded on toggle buttons
**Learning:** Components using `ChevronDown`/`ChevronUp` for expandable sections (like in `RankCard.jsx`) are missing the `aria-expanded` attribute, which is crucial for screen readers to understand the toggle state.
**Action:** Add `aria-expanded={stateVariable}` to the interactive trigger (`button`) elements.
