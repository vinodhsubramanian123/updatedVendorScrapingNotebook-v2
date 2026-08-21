# Agentic Guardrail MCP Tool Loop & Build Simulation

This diagram illustrates the autonomous tool execution loop used by the Gemini AI Agent to resolve hardware conflicts (`scripts/lib/agentic_guardrail.js`, `scripts/mcp_server.js`).

```mermaid
sequenceDiagram
    autonumber
    participant Evaluator as BOQ Engine (Low Confidence / Conflict)
    participant Guardrail as Agentic Guardrail Loop (agentic_guardrail.js)
    participant Gemini as Gemini 3.5 Flash LLM
    participant MCP as MCP Tool Server (scripts/mcp_server.js)
    participant NLM as Google NotebookLM
    participant Simulator as Build Simulator (boq_evaluator.js)

    Evaluator->>Guardrail: Trigger Guardrail (Items, Violations, Missing Fixes)
    Guardrail->>Gemini: Prompt with Workload Context & Available MCP Tools

    loop Autonomous Tool Execution Loop (Max 5 Iterations)
        Gemini-->>Guardrail: Tool Call Request (JSON)
        
        alt Tool: query_notebooklm(query)
            Guardrail->>MCP: Call query_notebooklm
            MCP->>NLM: Query Official QuickSpecs
            NLM-->>MCP: Authoritative Technical Rule / Specification
            MCP-->>Guardrail: Return Rule Content
        else Tool: search_catalog(category, query)
            Guardrail->>MCP: Call search_catalog
            MCP->>MCP: Search live master catalog JSON
            MCP-->>Guardrail: Return Matching Verified SKUs & Prices
        else Tool: simulate_build(modifiedSKUs)
            Guardrail->>MCP: Call simulate_build
            MCP->>Simulator: Re-run 7-Aspect Math on Candidate BOM
            Simulator-->>MCP: { isMathClean, confidenceScore, remainingErrors }
            MCP-->>Guardrail: Return Simulation Outcome
        end

        Guardrail->>Gemini: Feed Tool Output Back to LLM Context
    end

    Gemini-->>Guardrail: Final Resolution Decision & Technical Reasoning
    Guardrail->>Evaluator: Return 100% Buildable Validated BOM + Action Ledger
```
