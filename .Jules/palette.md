## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.

## 2023-11-01 - [Interactive Panel Triggers and Screen Readers]
**Learning:** Collapsible/expandable panels that use icons like `ChevronDown`/`ChevronUp` without explicitly binding the `aria-expanded` attribute to their interactive trigger (`button`) elements fail to communicate their state changes to screen readers, making it difficult for users relying on assistive technologies to understand if a section is open or closed.
**Action:** Always ensure that UI components managing state via standard interactions (like expanding/collapsing sections) correctly bind the `aria-expanded={stateVariable}` attribute to their trigger elements.
