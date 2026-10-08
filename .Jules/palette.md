## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2026-09-27 - [Aria-Expanded on Toggle Buttons]
**Learning:** Discovered that several interactive trigger buttons managing expandable and collapsible panels (such as `RankCard` details, `ValueEngineeringPanel`, and `MacroOrchestratorFlow` logs) were missing the `aria-expanded` attribute. This is crucial for screen readers to convey the toggle state to users.
**Action:** When implementing or reviewing components that use state variables (like `isExpanded`) to toggle visibility of content, always ensure the trigger element, typically a `<button>`, includes the `aria-expanded={stateVariable}` attribute.
