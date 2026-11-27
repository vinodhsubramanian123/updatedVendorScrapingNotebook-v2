---
name: enterprise-dashboard-ux-skill
description: >-
  Linear + Stripe + Vercel SaaS dashboard craft standard for dense enterprise UIs, data tables, live agentic execution progress, dark/light semantic design tokens, and modular decomposition.
  **DO call for**: Building or modernizing the React + Tailwind enterprise dashboard shell, collapsible sidebar, command omnibox, Light/Dark semantic tokens, dense hardware/BOM tables, and live multi-tier agentic execution timelines.
  **DO NOT call for**: Marketing landing pages or portfolios (use design-taste-frontend), backend BOQ physics evaluation (use boq-eval-skill), or static commit reviews (use codex-peer-review-skill).
---

# enterprise-dashboard-ux-skill: Enterprise SaaS Dashboard & Agentic Studio Craft

> **Standard Scope**: Enterprise management consoles, dense technical data tables, multi-step agentic workflows, live SSE execution streams, and multi-tier presales copilot dashboards.
> For landing pages, portfolios, or marketing redesigns, use [`design-taste-frontend`](../design-taste-frontend/SKILL.md).
> **Normative Standard**: All rules in this skill follow [Normative Language Standard](../../rules/normative_language.md) and architecture contracts [`AGENTS.md`](../../../AGENTS.md) (`INV-111`, `INV-278`, `INV-286`).

---

## 1. Core Visual Craft & Surface Hierarchy

### A. Layout & Spatial Density
- **Application Shell**:
  - Top Bar: `56px` height with breadcrumbs, command omnibox (`⌘K` / `/`), provider health badges, and theme toggle.
  - Left Rail: Collapsible sidebar (`240px` expanded, `64px` icon-only collapsed, responsive overlay drawer for screens `< 1024px`).
  - Workspace Canvas: Contained (`max-w-[1440px] mx-auto` with `px-4 sm:px-6`), structured card padding (`p-4` or `p-5`).
- **8pt Grid & Rhythms**:
  - Maintain margins and padding based on multiples of 4px / 8px (`gap-2`, `gap-3`, `gap-4`, `p-3`, `p-4`, `p-5`).
  - Arbitrary pixel spacing (`p-[17px]`) is prohibited.

### B. Typography & Tabular Numbers
- **Font Stack**:
  - Primary UI: `Geist Sans`, system-ui, -apple-system, sans-serif.
  - Code, SKUs & Quantities: `Geist Mono`, monospace with `tabular-nums` (`font-mono font-medium tabular-nums`).
  - Type Scale: `11px` (`text-[11px]`), `12px` (`text-xs`), `14px` (`text-sm`), `16px` (`text-base`), `18px` (`text-lg`), `20px` (`text-xl`).

### C. Unified Semantic Design Tokens (Light & Dark)
- **Surfaces**:
  - Light Canvas: `#F8FAFC`, Panels: `rgba(255, 255, 255, 0.96)`, Elevated: `#FFFFFF`.
  - Dark Canvas: `#0B0F19`, Panels: `rgba(17, 24, 39, 0.94)`, Elevated: `#1E293B`.
- **Text & Borders**:
  - Primary Text: Light `#0F172A`, Dark `#F8FAFC`.
  - Secondary Text: Light `#475569`, Dark `#94A3B8`.
  - Borders: Light `#E2E8F0`, Dark `#334155`.
- **HPE Emerald Brand Accent**:
  - Base: `#01A781`, Hover: `#00906F`, Light Container: `#E6F7F3`, Dark Container: `rgba(1, 167, 129, 0.16)`.

---

## 2. Epistemic Status Badges & Truthful Displays

Never display ambiguous or fabricated statuses. Use standard epistemic badges:
- `CLOSURE VERIFIED`: Hardware SKU constraint graph closed without cycles or contradictions.
- `CLOSURE BLOCKED`: Constraint closure failed with explicit blocker reasons.
- `PORTAL VALIDATION PENDING`: Local checks passed; live HPE OCA / CLIC portal validation required before commercial quotation.
- `COMPUTED CAPABILITY ENVELOPE`: Physical hardware bounds (CPU, PCIe, OCP, memory, power) computed from platform profiles and catalog manifests.
- `LOCAL RAG FALLBACK`: Cloud grounding unavailable; answer generated using offline local knowledge search.
- `UNMAPPED` / `NOT_EVALUATED`: Vendor parity or subsystem evidence unconfirmed; never coerce to verified pass.

---

## 3. Live Agentic Execution & Timeline UX

All multi-step agentic executions (Deterministic, Gemini Copilot, Antigravity Deep Escalation) MUST provide:
1. **Tier Identification**: Clear badge indicating execution tier (`Deterministic`, `Gemini Copilot`, `Antigravity Deep`) and escalation provenance when escalated.
2. **Deterministic Progress**: Explicit step indicators, canonical stage labels, elapsed timer, and active progress bar.
3. **Structured Tool Calls**: Collapsible cards displaying input parameters and output summaries for tool calls.
4. **Filterable Logs**: Streaming log console with options for `All Events`, `Phases & Tools`, `Warnings & Errors`, and `Copy Logs`.
5. **Cooperative Cancellation**: Visible, responsive `Cancel Run` button bound to `AbortController` and `/api/kill-task`.
6. **Post-Run Summary**: Completed timelines collapse into a compact summary bar with toggleable full history.

---

## 4. Accessibility & Motion Rules (WCAG 2.2 AA)

- **Keyboard Navigation**:
  - All modals and drawers MUST trap focus and close on `Escape`.
  - Global Omnibox triggers via `⌘K` or `/`.
  - Immediate execution on `Enter` / `⌘Enter` / `Ctrl+Enter`; multi-line input on `Shift+Enter`.
- **Contrast & Native Controls**:
  - High-contrast text (`>= 4.5:1`) on all inputs, selects, and buttons in both themes.
  - Native `<select>` elements MUST inherit theme `color-scheme` and surface background variables in both Light and Dark modes.
- **Motion Bounds**:
  - GPU transitions between `120ms` and `350ms` cubic-bezier (`transform`, `opacity`).
  - Strict `@media (prefers-reduced-motion: reduce)` disabling animations, transforms, and transition delays.

---

## 5. Architectural & Complexity Ceilings

- **3D Maintainability Ratchet**: New and modified UI components and hooks MUST target `CC <= 15` (hard cap `CC <= 20`), `LOC <= 80` per function, and `maxNesting <= 4`.
- **Modular Extraction**: Extract complex state machines, file upload handlers, and SSE stream subscriptions into dedicated custom hooks (`useBoqUploader.js`, `useWorkspaceRuns.js`, `useTheme.js`).
- **Canonical Implementation Modules**:
  - Shell & Navigation: `App()`, `AppWorkspaceShell()`, `Sidebar()`, `CommandOmnibox()` (`dashboard/src/components/layout/AppWorkspaceShell.jsx`)
  - Hooks & State: `useTheme()`, `useBoqUploader()`, `useAppHandlers()`, `useWorkspaceRuns()` (`dashboard/src/hooks/useTheme.js`, `dashboard/src/hooks/useBoqUploader.js`, `dashboard/src/hooks/useWorkspaceRuns.js`)
  - Normalizers & Streams: `normalizeEvalResult()`, `deriveDualBrainBadges()`, `reduceTimeline()` (`dashboard/src/services/evalNormalizer.js`, `dashboard/src/services/executionTimeline.js`)
  - Presales Studio & Feedback (`INV-288`, `INV-290`): `PresalesRequestPanel.jsx` (clean session reset rotating `sessionId`), `ClarificationPromptCard.jsx` (multi-turn continuation), `InlineOutcomeFeedback.jsx` (`localOnly` offline enforcement separating Studio feedback from portal observations), `UserFeedbackDrawer.jsx` (`postJson()` / `requestJson()` API helpers), `PortfolioManifestWorkspace.jsx`, and `ScraperTriggerCard.jsx`, backed by `dashboard/routes/agent.cjs`, `dashboard/routes/intelligence.cjs`, `dashboard/routes/catalogs.cjs`, and `dashboard/routes/tasks.cjs`.

---

## 🔗 Connected Skills

- [`design-taste-frontend`](../design-taste-frontend/SKILL.md) — Marketing and portfolio visual styling rules
- [`code-quality-gate-skill`](../code-quality-gate-skill/SKILL.md) — 3D maintainability ratchet, `oxlint`, Vitest, and Playwright CI gates
- [`execution-trace-skill`](../execution-trace-skill/SKILL.md) — 9-phase telemetry and `PROVIDER_RECOVERY` observability
- [`presales-query-router`](../presales-query-router/SKILL.md) — 3-tier Studio copilot dispatch and clarification handoffs
- [`continuous-learning-skill`](../continuous-learning-skill/SKILL.md) — Studio feedback quarantine vs portal observation governance

---

## ⛔ HALT Conditions

```text
HALT-DUX1: If any dashboard component hardcodes color-scheme: light !important or breaks Dark mode contrast on native controls:
  emit [ERR_THEME_CONTRAST_LOCK] and HALT. Replace hardcoded colors with semantic CSS variables.

HALT-DUX2: If a new or modified React component or hook breaches CC > 20, LOC > 80, or maxNesting > 4:
  emit [ERR_COMPLEXITY_RATCHET] and HALT. Extract pure helpers or custom hooks before proceeding.
```
