# Dashboard Web Application (`dashboard/`)

## 1. Overview & Architecture
The dashboard is a full-stack React + Vite + Express web application providing real-time BOQ evaluation, live scraper progress visualization, 5-tier strategy comparison matrices, and telemetry ledgers.

```
dashboard/
├── server.cjs                 ← Express backend coordinator (port 5173 / API endpoints)
├── routes/                    ← Modular Express route handlers
│   ├── evalRoutes.cjs         ← BOQ upload, parsing, evaluation & matrix APIs
│   ├── scraperRoutes.cjs      ← Scraper trigger, browser launch & SSE progress stream
│   ├── historyRoutes.cjs      ← Telemetry history, run details & audit logs
│   ├── statusRoutes.cjs       ← Portfolio status & system health
│   └── reconcileRoutes.cjs    ← Vendor BOM reconciliation & diff viewer
├── services/                  ← Core backend services
│   ├── taskManager.cjs        ← Mutex-safe background child process execution
│   ├── pathGuard.cjs          ← Path traversal and input sanitization guards
│   └── errorHandler.cjs       ← Centralized error handler with error envelopes
├── src/                       ← React frontend
│   ├── components/            ← Modular UI components
│   │   ├── header/            ← Chassis selector, search, nav tabs
│   │   ├── matrix/            ← 5-tier strategy comparison, rank cards, rejection modal
│   │   ├── uploader/          ← Drag-and-drop BOQ zone, pre-flight audit steps
│   │   ├── stepper/           ← Real-time SSE 10-stage scraper progress viewer
│   │   ├── summary/           ← Active model card, portfolio overview
│   │   ├── history/           ← Run history table & detail modal
│   │   ├── reconciliation/    ← Vendor BOM match table & action panel
│   │   └── telemetry/         ← Telemetry graphs, ledgers, and token meters
│   ├── services/              ← Evaluation normalizer & API client
│   └── utils/                 ← Style tokens, log parsers
└── README.md                  ← This file
```

## 2. Running Locally

```bash
# Start backend server & frontend dev server simultaneously
npm run dev

# Or run full dashboard with feedback listener
npm run dashboard
```

## 3. Design Standards
- Strictly adheres to `.agents/skills/design-taste-frontend/SKILL.md`.
- High-contrast Emerald Green / Slate palette, 12px border radiuses, dark mode default.
- Zero mock stubs: all UI metrics derive dynamically from backend JSON artifacts.
