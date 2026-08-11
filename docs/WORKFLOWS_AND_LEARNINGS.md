# Workflows, Pipelines & Full Learnings

## 1. 6-Stage BOQ Evaluation Workflow
1. **Multimodal Parsing**: `gemini-2.5-flash` processes images/PDFs into structured BOQ JSON.
2. **CTO Normalization**: Resolves fractional math for multi-node chassis configurations.
3. **Aspect Math Guardrails**: Validates CPU TDP limits, memory channel symmetry, power lug kits, and PCIe slots.
4. **NotebookLM Grounding**: Queries HPE QuickSpecs for absolute truth on dependencies.
5. **Agentic Verification (Guardrail Loop)**: Gemini LLM orchestrates tools to resolve conflicts, re-simulate builds, and learn missing knowledge.
6. **Partner Portal Re-verification**: Cross-checks solutions against official HPE portals to derive `KnowledgeDeltas`.

## 2. System Learnings & Improvements
- **API Rate Limits (429 & 503 Errors)**: We learned that high concurrency triggers strict Gemini API limits (especially on models like `gemini-3.6-flash`). We introduced retry backoff loops in `agentic_guardrail.js` and shifted primary operations to `gemini-2.5-flash` and `gemini-3.5-flash`.
- **Hallucination Prevention (Red-Teaming)**: We implemented a background Adversarial Agent (`adversarial_agent.js`) that continuously injects hallucinated BOQs to verify the evaluator's Catch Rate and Precision. This runs asynchronously and updates the `pipeline_telemetry.json` heartbeat.
- **Agentic Autonomy**: We replaced static LLM explanation prompts with an active **Guardrail Loop** using MCP tool definitions. The LLM can now call `simulate_build` and `record_knowledge_delta`.

## 3. MCP Server & Tooling Workflow
The MCP server (`scripts/mcp_server.js`) exposes the local rule engine as standardized tools. 
When a BOQ evaluation results in low confidence, the orchestrator triggers `runAgenticGuardrail`, which uses these tools to iterately resolve issues until a high confidence score is achieved.
