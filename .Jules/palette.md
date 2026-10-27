## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2023-10-27 - [Missing aria-expanded on Collapsible Panels]
**Learning:** Found a recurring pattern where interactive buttons controlling the visibility of collapsible panels (such as "Show Details" or "Expand" toggles) were missing the `aria-expanded` attribute. This is a critical accessibility issue, as screen readers rely on this attribute to announce the current state (expanded or collapsed) of the associated content.
**Action:** Always verify that components using standard interactions to manage state (like `ChevronDown`/`ChevronUp` for expandable panels) correctly bind the `aria-expanded={stateVariable}` attribute to their interactive trigger (`button`) elements. When adding this attribute, ensure the exact name of the state variable controlling the component's state is used.
