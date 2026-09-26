## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2026-09-26 - [Accessible Expandable/Collapsible Toggles]
**Learning:** Found multiple instances where toggle buttons for expanding/collapsing panels (e.g., using Chevron icons or 'Expand'/'Collapse' text) were missing the `aria-expanded` attribute. This prevents screen readers from understanding the panel's current state, hindering accessibility.
**Action:** Always ensure that interactive elements acting as triggers for expandable regions include the `aria-expanded={booleanState}` attribute correctly bound to their corresponding React state variables.
