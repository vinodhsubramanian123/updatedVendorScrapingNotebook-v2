
## 2024-08-24 - [Add Missing ARIA Labels to Icon-Only Buttons]
**Learning:** Found a systemic pattern where icon-only action buttons (e.g., Close, Settings, Zoom) were missing `aria-label` attributes, impacting screen reader accessibility across the application's components.
**Action:** Implemented a script to auto-detect icon-only buttons using regex on JSX files and appended appropriate `aria-label`s based on their `title` attribute or standard icon semantic meanings (e.g., X -> "Close"). This ensures all interactive elements are properly identified for keyboard/assistive users.
