## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2024-05-18 - [Expandable Panel Accessibility]
**Learning:** Found that custom buttons used to toggle expandable panels and dropdowns lacked the `aria-expanded` attribute, which means screen reader users aren't notified of the state change when the panel opens or closes.
**Action:** Always verify that interactive elements controlling the visibility of other content include an `aria-expanded={stateVariable}` attribute tied to the current component state.
