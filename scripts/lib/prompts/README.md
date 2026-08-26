# Prompts Subsystem

Structured prompt templates for the agentic LLM guardrail verification loop. These templates are consumed by `scripts/lib/rag/agentic_guardrail.js` to construct deterministic, version-controlled prompts for Gemini API calls.

## Modules

| Module | Purpose |
|--------|---------|
| `guardrail_prompt.js` | Exports parameterized prompt builder functions for the Dual-Brain agentic guardrail loop, including workload DNA verification, conflict detection, and strategy rank validation prompts |

## Usage

```js
const { buildGuardrailPrompt } = require('./prompts/guardrail_prompt.js');
const prompt = buildGuardrailPrompt({ chassis, conflicts, workloadDna });
```

## Design Rationale

Prompt templates are separated from the guardrail logic itself to:
1. Enable version-controlled prompt iteration without touching evaluation logic
2. Allow A/B testing of prompt variants via the telemetry system
3. Keep `agentic_guardrail.js` focused on orchestration, not string construction
