## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2026-09-11 - [Custom Drag-and-Drop Zone Accessibility]
**Learning:** Custom file upload drop zones constructed using `div` elements with `onClick` handlers are inherently inaccessible to keyboard users and screen readers unless explicitly configured.
**Action:** When building custom interactive elements like drop zones, always add `role="button"`, `tabIndex={0}`, an `aria-label`, visible focus indicators (`focus-visible:ring-2`), and an `onKeyDown` handler to simulate click events via "Enter" or "Space" keys.
