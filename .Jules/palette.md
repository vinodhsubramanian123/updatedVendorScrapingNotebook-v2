## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2024-05-18 - Missing ARIA attributes for collapsible elements
**Learning:** Found an accessibility issue pattern specific to this app's components regarding expandable and collapsible panels (`RankCard`, `ValueEngineeringPanel`, `VendorScraperProgress`). These interactive elements were changing internal state and rendering additional info but did not communicate their toggle state back to screen readers.
**Action:** Ensure that all components using standard `ChevronDown`/`ChevronUp` interactions to manage state (like `isExpanded`) correctly bind `aria-expanded={stateVariable}` to their interactive trigger (`button`) elements.
