## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2026-08-28 - [Accessible Collapsible Panels]
**Learning:** Found that custom buttons toggling the visibility of content panels (often using chevron icons) were missing the `aria-expanded` attribute. This is critical for screen reader users to understand the current state of the panel (collapsed vs. expanded) and to know that the button controls a collapsible area.
**Action:** Always ensure that trigger buttons controlling the visibility of sections have the `aria-expanded` attribute dynamically bound to the state variable that manages the section's visibility (e.g., `aria-expanded={isOpen}`).
