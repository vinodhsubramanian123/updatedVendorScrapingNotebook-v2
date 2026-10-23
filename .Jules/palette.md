## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2026-08-28 - [Toggle State Accessibility]
**Learning:** Found that custom expandable/collapsible toggle panels (using interactive elements like standard buttons with state variables) often lacked the `aria-expanded` attribute. This is critical for screen readers to properly communicate whether a section is expanded or collapsed to the user.
**Action:** Always verify that components using state to toggle visibility (e.g., expandable details or drawers) explicitly bind the `aria-expanded={stateVariable}` attribute to their interactive trigger (`button`) elements.
