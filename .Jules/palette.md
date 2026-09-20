## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2024-03-24 - [Missing ARIA Expanded on Toggle Buttons]
**Learning:** Found that custom collapsible panels using Chevron icons frequently omit the `aria-expanded` attribute on their trigger buttons, leaving screen reader users unaware of the panel's current state.
**Action:** Always ensure components with expand/collapse state bind `aria-expanded={stateVariable}` to their interactive trigger to properly communicate toggle state.
