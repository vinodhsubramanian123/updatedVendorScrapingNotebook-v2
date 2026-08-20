---
name: frontend-design
description: Frontend UI/UX, motion graphics, and workflow architecture skill. Enforces crisp aesthetics, physics-based micro-interactions, robust state transitions, anti-slop visual hierarchy, and modular, data-driven workflow step architectures.
---

# Frontend Design & Workflow Motion Architecture Skill

## 1. Aesthetic Excellence & Anti-Slop Principles
- **Color Discipline**: Neutral slate/zinc foundations with singular, purposeful accents (Emerald `#10b981`, Deep Blue `#2563eb`, Violet `#8b5cf6`). Avoid chaotic multi-color gradients or muddy drop-shadows.
- **Visual Depth & Materiality**: Subtle borders (`border-slate-200/80`), layered backdrop blurs (`backdrop-blur-md`), 1px highlight borders on cards, and soft ambient drop-shadows tinted to background hues.
- **Typography & Rhythm**: High-contrast hierarchical scales (`text-2xl font-extrabold tracking-tight` for titles, `font-mono text-xs` for metrics/IDs). Standardized line heights and strict descender clearances.

## 2. Motion Graphics & UX Transitions
- **Hardware Accelerated**: Animate exclusively `transform` and `opacity`. Never trigger layout reflows by animating `height`, `width`, `top`, or `margin`.
- **Spring Physics over Linear Easing**: Use `cubic-bezier(0.16, 1, 0.3, 1)` or spring dynamics (`stiffness: 120, damping: 18`) for snappy, tactile, organic interaction.
- **Staggered Orchestration**: When revealing cards, steps, or logs, apply incremental delays (`100ms`, `150ms`, `200ms`) to guide visual attention without overwhelming.
- **Continuous Progress & Micro-feedback**: Pulsing glowing borders on active tasks (`animate-step-active`), shimmer bars on loading skeletons, animated SVG connectors between sequential workflow nodes.
- **Accessibility & Reduced Motion**: Honor `@media (prefers-reduced-motion: reduce)` by gracefully degrading animated transitions to instant state changes.

## 3. Modular Workflow & Step Architecture
To make adding any main workflow step or sub-step seamless, extensible, and clean:
1. **Data-Driven Step Registry**: Workflow steps MUST NOT be hard-coded into JSX markup. Define them in a central, typed schema object with:
   - `id`, `stageNumber`, `phase`, `title`, `subtitle`, `icon`, `badge`
   - `durationSec` / `durationMs`
   - `substeps`: Array of sub-step definitions with `id`, `title`, `description`, `evalCriteria`
   - `statusDerivation(state)`: Pure function computing `READY | RUNNING | COMPLETED | WARNING | FAILED`
   - `metrics(state)`: Pure function extracting dynamic badges/stats
   - `action`: Modal target, API trigger, or deep-link navigation
2. **Substep Hierarchy & Nesting**:
   - Every parent step can contain an arbitrary list of nested sub-steps.
   - Sub-steps maintain their own progress tracking (`0% -> 100%`, `substepIndex`), allowing real-time granular progress indication without changing parent component logic.
3. **Decoupled View Presentation**:
   - Separate Workflow State / Orchestrator Engine from the Rendering Components (Macro View, Timeline Stepper, Step Simulator, Micro Badges).
