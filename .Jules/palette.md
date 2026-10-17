## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.
## 2026-10-07 - [Accessible Toggle Buttons and Expanding Panels]
**Learning:** Found that some custom switch/toggle buttons lacked semantic roles and accessibility attributes (e.g. `role="switch"`, `aria-checked`), while chevron-controlled expandable panels lacked `aria-expanded` attributes. This prevented screen readers from correctly identifying their interactive state.
**Action:** Always verify that interactive custom toggles implement proper ARIA roles and state attributes (`aria-checked` and `aria-expanded`) so their active state is fully conveyed to assistive technologies.
