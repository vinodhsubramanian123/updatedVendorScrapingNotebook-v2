## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2026-08-28 - [Expandable Component Accessibility]
**Learning:** Found that custom expandable panels and sections did not use the `aria-expanded` attribute on their trigger buttons. This causes a degraded experience for screen reader users who aren't notified of the state change when expanding or collapsing sections.
**Action:** Always verify that interactive buttons controlling expandable content regions include the `aria-expanded={isExpanded}` attribute so screen readers correctly announce their toggled state.
