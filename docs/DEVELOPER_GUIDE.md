# Developer Guide

## 1. Local Development & Scripts
- `npm run dev` (in `dashboard/`): Starts the Vite dashboard and Express backend bridge.
- `npm run build` (in `dashboard/`): Compiles production static assets.
- `node scripts/eval_boq.js <file.csv> [--chassis <dir>]`: Runs the BOQ evaluation CLI.
- `node scripts/adversarial_agent.js`: Triggers a single run of the adversarial background red-team bot.

## 2. UI/UX & Coding Standards
- **Styling**: Use strictly Tailwind utility classes. No inline styles or custom CSS files.
- **Accessibility**: Ensure high contrast, proper modal closures (Escape key/backdrop clicks), and no orphaned click handlers.
- **Token Optimization**: Log minimally but descriptively. Do not emit huge JSON blobs to standard out unless requested via `--json`.

## 3. Testing & Benchmarking
- **Continuous Benchmarks**: Run `scripts/test_boq_eval_benchmarks.js` to execute predefined hardware test cases (e.g., Thermal TDP, Memory Symmetry, DC Lug kits).
- **Adversarial Red-Teaming**: Ensure `run_background_adversary.js` is active to continually measure Catch Rate and Precision on the live dashboard.
