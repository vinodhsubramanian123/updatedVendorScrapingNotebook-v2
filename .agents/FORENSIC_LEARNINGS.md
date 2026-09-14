# Antigravity Forensic Knowledge Ledger (v2.0 Diamond)

This ledger documents "hard-won" technical learnings and blindspots identified during the Antigravity Forensic Portal development. Future agents MUST consult this ledger to foresee and prevent recurring issues.

## 🔬 1. SKU Normalization (The "PartA vs PART_A" Blindspot)
- **Issue**: Dependency cycles and catalog lookups often fail because rules use `PART_A` while the catalog uses `partA`.
- **Learning**: Always match on **Canonical Keys** (`.toUpperCase().replace(/[^A-Z0-9]/g, '')`). 
- **Remediation**: Use `DataQualityEngine.detectCycles` with the pathKey protocol to ensure consistent matching while preserving display labels.

## 🎭 2. Playwright Mock Hardening
- **Issue**: Unit tests targeting `BasePortalService` derivatives often crash with `TypeError: this.page.evaluate is not a function`.
- **Learning**: `BasePortalService` stabilization logic (e.g., `_waitForDOMSettle`, `clearBlockers`) relies heavily on `evaluate` and `waitForTimeout`.
- **Remediation**: Every manual `Page` mock in Vitest MUST include these methods, even if they just return `Promise.resolve()`.

## ⚖️ 3. The "Summary Trap" (Hydration Stalls)
- **Issue**: Navigating to the "Summary" tab in HPE/Dell portals sometimes triggers a secondary AJAX loader that isn't caught by standard `waitForLoadState`.
- **Learning**: Portals use nested iframes and background JS workers that don't always signal "Load Complete" to the browser.
- **Remediation**: Standardize on `_waitForDOMSettle` (MutationObserver-based) after every major tab switch.

## 📡 4. IPC Bridge Synchronization
- **Issue**: UI components (e.g., `LiveAgentTerminal`) sometimes show stale data because of race conditions in state updates.
- **Learning**: `useEffect` hooks in React might capture stale closure values if they don't use `useRef` for transient mission state.
- **Remediation**: Use the `activeMissionUcidRef` pattern to ensure log handlers always reference the current mission context.

## 🏗️ 5. Architectural Creep (Reconciliation)
- **Issue**: Portal-added mandatory parts (factory kits) were being flagged as unauthorized drift.
- **Learning**: The portal is "smarter" than the BOQ; it knows mandatory dependencies.
- **Remediation**: Update `PortalReconciler` to acknowledge `HEALER_INJECTED` metadata or flag these as `ADVICE` instead of `WARNING`.

## 🎨 6. Light Theme Specificity Overrides
- **Issue**: Custom component styles explicitly declared in style files (e.g., `.description-intent { color: var(--aether-text) }`) have high specificity and override default responsive Tailwind class utilities (`text-slate-800`).
- **Learning**: Tailwind color classes will silently fail if class-level CSS declarations specify color variables.
- **Remediation**: Always write explicit parent theme overrides (e.g., `.theme-light .description-intent { color: #0f172a !important }`) to ensure perfect readability in light/dark transitions.

## 📐 7. Virtualized Grid Column Alignment Shifts
- **Issue**: Columns in virtualized tables (e.g. React Window grids) get shifted to the left by one position if even a single cell is conditionally or accidentally omitted in the row template.
- **Learning**: Symmetrical header-row grids depend strictly on rendering the identical cell count as header tracks. Omissions will cause actions or pricing columns to shift left, ruining visual consistency.
- **Remediation**: Insert placeholder elements or ensure proper cell mapping exists for all columns (e.g. rendering the missing Drift Δ cell in `VirtualRow.tsx`).

## 🧱 8. Stretch Layout Padding for Wrapping Text
- **Issue**: Wrapped multi-line text (e.g. `[OPTION]` suffixes) gets clipped at the bottom of virtual rows if parent grids use vertical alignment centering (`items-center`).
- **Learning**: Grid `items-center` shrinks item tracks to text wraps, compressing them. 
- **Remediation**: Set virtual rows to use grid alignment **`items-stretch`** and shift vertical centering responsibility to children utilizing full-height centering flex containers (`h-full flex items-center justify-center`). This guarantees zero vertical text clipping.

## 🎛️ 9. Accessible Theme-Aware Scrollbars
- **Issue**: Narrow 8px scrollbars are extremely difficult to grab, and transparent tracks are completely invisible against light canvases.
- **Learning**: Data grids require comfortable scrollbars to identify and drag pages comfortably.
- **Remediation**: Styled custom scrollbars as `14px` thick using transparent borders and `background-clip: padding-box` for spacious grab targets, and mapped dark-slate thumbs for light backgrounds.

## 🤖 10. LLM "Minimum Component" Strictness vs "Preferred" Intent
- **Issue**: The LLM reasoning engine skipped satisfying "Preferred" requirements (like NVMe storage) because its prompt instructed it to find the "MINIMUM" set of components.
- **Learning**: Language models interpret "minimum" very literally and will aggressively drop non-mandatory requirements. Also, heuristic NLP fallbacks often misclassify explicit requirements (like "NVMe is required") as "preferred" if they don't dynamically parse context.
- **Remediation**: Always explicitly instruct LLM prompts to satisfy "Preferred" requirements if resources allow, rather than just asking for the "minimum" set. Implement dynamic keyword parsing (checking for words like "must", "require") in fallback heuristic engines, and log explicitly when components are skipped versus added.

---
*Status: DIAMOND-CERTIFIED*
