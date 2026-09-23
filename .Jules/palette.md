## 2026-08-27 - [Disabled Button States]
**Learning:** Found that custom buttons (`btn-primary` and `btn-secondary`) had no specific styling for their `disabled` state, causing them to appear active despite being unclickable. This degrades UX and accessibility, especially in forms or loading operations where visual feedback is crucial.
**Action:** Always verify that custom buttons have an explicit `:disabled` pseudo-class (e.g., `opacity: 0.5; cursor: not-allowed;`) to ensure users instantly recognize when an action is unavailable.
## 2024-09-23 - Improve Feedback Drawer Form Submission UX
**Learning:** Adding explicit disabled states and loading indicators to submit buttons across async actions reduces duplicated event firing, particularly in feedback and data reporting modals.
**Action:** When implementing any fetch-based form logic (like `handleSubmit` in `UserFeedbackDrawer`), always wrap the API call in a `try...finally` block that manages an `isSubmitting` flag and binds it to the trigger's `disabled` property, utilizing standard classes like `btn-primary`.
