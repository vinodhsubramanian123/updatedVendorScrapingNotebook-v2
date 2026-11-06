## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.
## 2024-11-06 - [Aria Expanded for Expandable Components]
**Learning:** For UI accessibility, components using standard interactions to manage state (like `ChevronDown`/`ChevronUp` for expandable and collapsible panels) often miss linking `aria-expanded` to their interactive trigger (`button`).
**Action:** Always verify that custom expandable buttons bind the `aria-expanded={stateVariable}` attribute to their `button` elements to correctly communicate the toggle state to screen readers.
