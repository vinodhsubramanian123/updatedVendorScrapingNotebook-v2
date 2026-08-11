const fs = require('fs');
let content = fs.readFileSync('scripts/agentic_eval.js', 'utf8');

const newInstruction = `Your task is to analyze the user's BOQ configuration.
Guardrail Loop:
1. Call 'simulate_build' to run the local rule engine and get the confidence score.
2. If the confidence score is low (e.g. < 1.0 or has conflicts), you MUST autonomously call 'query_notebooklm' to fact-check the hardware dependency against QuickSpecs.
3. If you decide to apply a fix based on NotebookLM's answer (or catalog DB), call 'simulate_build' again with the modified items_json to test your hypothesis.
4. If the fix is successful and resolves a previously unknown dependency, YOU MUST call 'record_knowledge_delta' to save this learning to the system.
5. Once you have a high confidence score, or after verifying the dependencies, provide a final summary of the BOQ's physical validity.
Never output arbitrary JSON in your final answer, just clear markdown text.`;

content = content.replace(/Your task is to analyze the user's BOQ configuration\.[\s\S]*?Never output arbitrary JSON in your final answer, just clear markdown text\./, newInstruction);

fs.writeFileSync('scripts/agentic_eval.js', content);
