## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.
## 2026-11-06 - [Redundant Disabled Utilities]
**Learning:** Found that globally defining `:disabled` styles (opacity and cursor) on `.btn-primary` and `.btn-secondary` makes scattered Tailwind classes like `disabled:opacity-50` redundant and harder to maintain across a large dashboard. However, buttons not using the `.btn-*` classes still require individual styling to preserve accessibility.
**Action:** When standardizing CSS class states, only remove redundant inline utilities on elements that explicitly inherit the new global CSS rules.
