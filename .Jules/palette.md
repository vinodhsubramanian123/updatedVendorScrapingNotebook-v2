## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2026-08-28 - [Accessible Collapsible Panels]
**Learning:** Found that custom toggle buttons managing expandable/collapsible state (e.g., using `ChevronDown`/`ChevronUp` icons) were missing the `aria-expanded` attribute. Without this, screen reader users cannot perceive whether a panel is currently expanded or collapsed, breaking accessibility for interactive state.
**Action:** Always ensure that components using standard interactions to manage state correctly bind the `aria-expanded={stateVariable}` attribute to their interactive trigger (`button`) elements to communicate toggle state to screen readers.
