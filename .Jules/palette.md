## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2024-10-12 - [Accessible Expandable Panels]
**Learning:** Found that components using standard interactions to manage state (like `ChevronDown`/`ChevronUp` for expandable and collapsible panels) often fail to bind the `aria-expanded` attribute to their interactive trigger (`button`) elements. For instance, in `RankCard.jsx`, the "Least-Delta Cascade Pruning" and "Thinking & Decision Chain" panels lacked this attribute. This prevents screen readers from understanding the panel's visibility state.
**Action:** When implementing or reviewing expandable/collapsible panels, always ensure the trigger element correctly binds `aria-expanded={stateVariable}` to properly communicate the toggle state to assistive technologies.
