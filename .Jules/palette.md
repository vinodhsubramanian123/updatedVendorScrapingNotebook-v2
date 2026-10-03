## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2024-05-15 - [Icon-Only Button Accessibility in Topology Viewer]
**Learning:** The topology viewer components (BoqTopologyModal, BoqTopologyCanvas, BoqTopologyNodeInspector) contain multiple interactive controls (rank selector, subsystem filters, close buttons, zoom controls) that lack clear aria-labels or screen reader descriptions when they rely primarily on visual layout or icons.
**Action:** Ensure all button elements, particularly those containing only icons (like Zoom In/Out, Reset, Close) or dynamically generated filter chips, have explicit `aria-label` attributes to maintain accessibility.
