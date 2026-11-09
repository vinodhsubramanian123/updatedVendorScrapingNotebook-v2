## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2024-10-24 - [Aria-Expanded on Toggles]
**Learning:** React components using `ChevronDown`/`ChevronUp` (like in `AmbiguityInbox.jsx`) often manage a toggle state (e.g. `isOpen`) visually but lack structural communication to screen readers. This breaks accessibility for users trying to understand if a section is open or closed.
**Action:** Always verify that interactive elements (buttons, clickable divs) that toggle visibility of content include the `aria-expanded={stateVariable}` attribute properly bound to their React state.
