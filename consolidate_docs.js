const fs = require('fs');
const path = require('path');

const archContent = `# Architecture & Design

## 1. Hybrid Dual-Brain Architecture
The application employs a **Hybrid Dual-Brain Architecture** designed for maximum resilience, auditability, and execution speed:

\`\`\`mermaid
graph TD
    subgraph "Phase 1: Ingestion"
        A[Input BOQ - Excel/CSV/Image] --> B[Multimodal OCR Extraction]
    end
    subgraph "Phase 2: Local Rule Engine (Deterministic)"
        B --> C[BOQ Parsing & Multi-Node Cleansing]
        C --> D[6-Aspect Math: Thermal, Power, Memory, PCIe, Storage, Network]
    end
    subgraph "Phase 3: Agentic Guardrail (Probabilistic)"
        D -->|If Confidence < 1.0| E[Agentic Guardrail Loop via MCP]
        E <--> F[NotebookLM RAG Grounding]
        E <--> G[Local Catalog DB Search]
    end
    subgraph "Phase 4: Synthesis & Output"
        E --> H[5-Tier Strategic Resolution Matrix]
        D -->|If Confidence == 1.0| H
        H --> I[Dashboard & Telemetry]
    end
\`\`\`

## 2. Core Architectural Decisions
- **Deterministic Rule Engine Primacy**: The local engine (e.g., \`boq_evaluator.js\`) executes fast, hardcoded physical hardware math without relying on external LLMs. This ensures a 100% functional fallback if APIs go offline.
- **Agentic MCP Guardrail**: Instead of brittle LLM single-pass prompting, the system uses a stateful Model Context Protocol (MCP) tool-calling loop (\`agentic_guardrail.js\`). The LLM actively hypothesizes fixes, calls the local rule engine via \`simulate_build\`, and checks NotebookLM before committing.
- **Decoupled Data Architecture**: SKUs are strictly classified (e.g., base chassis vs. options). Atomic JSON writes (\`safeWriteJsonAtomic\`) ensure database files are never corrupted.

## 3. Data Dictionary & Key Schemas
- **KnowledgeDelta**: Captures learned physical dependency rules. Used to train the local rule engine.
- **ConflictGraph**: Directed Acyclic Graph tracking SKU dependencies, mutually exclusive items, and capacity bounds.
- **ResolutionMatrix**: 5-Tier layout of hardware builds (Rank 1: Intent Preserving, Rank 5: Budget Minimized). Includes itemized price data.

## 4. UI/UX Design System
- **Real-Time Telemetry Dashboard**: Utilizes SSE (Server-Sent Events) to stream evaluation logs.
- **Component Design**: Tailwind-based, responsive, visually polished using high-contrast themes and sophisticated layouts (e.g., \`TelemetryCard.jsx\`, \`ResolutionMatrix.jsx\`).
`;

const workflowContent = `# Workflows, Pipelines & Full Learnings

## 1. 6-Stage BOQ Evaluation Workflow
1. **Multimodal Parsing**: \`gemini-2.5-flash\` processes images/PDFs into structured BOQ JSON.
2. **CTO Normalization**: Resolves fractional math for multi-node chassis configurations.
3. **Aspect Math Guardrails**: Validates CPU TDP limits, memory channel symmetry, power lug kits, and PCIe slots.
4. **NotebookLM Grounding**: Queries HPE QuickSpecs for absolute truth on dependencies.
5. **Agentic Verification (Guardrail Loop)**: Gemini LLM orchestrates tools to resolve conflicts, re-simulate builds, and learn missing knowledge.
6. **Partner Portal Re-verification**: Cross-checks solutions against official HPE portals to derive \`KnowledgeDeltas\`.

## 2. System Learnings & Improvements
- **API Rate Limits (429 & 503 Errors)**: We learned that high concurrency triggers strict Gemini API limits (especially on models like \`gemini-3.6-flash\`). We introduced retry backoff loops in \`agentic_guardrail.js\` and shifted primary operations to \`gemini-2.5-flash\` and \`gemini-3.5-flash\`.
- **Hallucination Prevention (Red-Teaming)**: We implemented a background Adversarial Agent (\`adversarial_agent.js\`) that continuously injects hallucinated BOQs to verify the evaluator's Catch Rate and Precision. This runs asynchronously and updates the \`pipeline_telemetry.json\` heartbeat.
- **Agentic Autonomy**: We replaced static LLM explanation prompts with an active **Guardrail Loop** using MCP tool definitions. The LLM can now call \`simulate_build\` and \`record_knowledge_delta\`.

## 3. MCP Server & Tooling Workflow
The MCP server (\`scripts/mcp_server.js\`) exposes the local rule engine as standardized tools. 
When a BOQ evaluation results in low confidence, the orchestrator triggers \`runAgenticGuardrail\`, which uses these tools to iterately resolve issues until a high confidence score is achieved.
`;

const devGuideContent = `# Developer Guide

## 1. Local Development & Scripts
- \`npm run dev\` (in \`dashboard/\`): Starts the Vite dashboard and Express backend bridge.
- \`npm run build\` (in \`dashboard/\`): Compiles production static assets.
- \`node scripts/eval_boq.js <file.csv> [--chassis <dir>]\`: Runs the BOQ evaluation CLI.
- \`node scripts/adversarial_agent.js\`: Triggers a single run of the adversarial background red-team bot.

## 2. UI/UX & Coding Standards
- **Styling**: Use strictly Tailwind utility classes. No inline styles or custom CSS files.
- **Accessibility**: Ensure high contrast, proper modal closures (Escape key/backdrop clicks), and no orphaned click handlers.
- **Token Optimization**: Log minimally but descriptively. Do not emit huge JSON blobs to standard out unless requested via \`--json\`.

## 3. Testing & Benchmarking
- **Continuous Benchmarks**: Run \`scripts/test_boq_eval_benchmarks.js\` to execute predefined hardware test cases (e.g., Thermal TDP, Memory Symmetry, DC Lug kits).
- **Adversarial Red-Teaming**: Ensure \`run_background_adversary.js\` is active to continually measure Catch Rate and Precision on the live dashboard.
`;

fs.writeFileSync('docs/ARCHITECTURE_AND_DESIGN.md', archContent);
fs.writeFileSync('docs/WORKFLOWS_AND_LEARNINGS.md', workflowContent);
fs.writeFileSync('docs/DEVELOPER_GUIDE.md', devGuideContent);

// Remove the old docs to avoid duplication
const oldDocs = [
  'AGENTIC_CLOSED_LOOP_EVOLUTION_AND_ROADMAP.md',
  'CANONICAL_ENGINEERING_KNOWLEDGE_BASE.md',
  'GEMINI_NOTEBOOK_SETUP_GUIDE.md',
  'HPE_CATALOG_RULES_AND_CONSISTENCY_CHARTER.md',
  'ORCHESTRATED_PIPELINE_AND_FEEDBACK_LOOP.md',
  'PHASE_7_DASHBOARD_IMPLEMENTATION_PLAN.md',
  'PHASE_8_AUTONOMOUS_MCP_AND_OBSERVABILITY_PLAN.md',
  'PROJECT_ARCHITECTURE_AND_MD_FILES.md'
];

oldDocs.forEach(doc => {
  const p = path.join('docs', doc);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
});
