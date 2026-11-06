## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2026-08-27 - [Expandable Component States]
**Learning:** Noticed that many expandable and collapsible panels using interaction components (like `ChevronDown` and `ChevronUp`) did not have the `aria-expanded` attribute bound to their toggle button's state. This makes it difficult for screen readers to properly communicate the state of these sections.
**Action:** Ensure that all toggle buttons for expandable/collapsible elements use `aria-expanded={stateVariable}` so assistive technologies can announce state changes correctly.
