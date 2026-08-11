const fs = require('fs');

let content = fs.readFileSync('scripts/eval_boq.js', 'utf8');

const requires = `
const { runAgenticGuardrail } = require('./lib/agentic_guardrail');
`;

content = content.replace("const { executeNotebookQuery } = require('./lib/notebook_query_utils');", "const { executeNotebookQuery } = require('./lib/notebook_query_utils');\n" + requires);

const agenticCode = `
  // -------------------------------------------------------------
  // NEW: Agentic AI Cross-Verification (Guardrail Loop)
  // -------------------------------------------------------------
  if (evalResults.confidence && evalResults.confidence.isHitlTriggered) {
    if (!JSON_MODE) console.log('\\n🤖 Triggering Agentic Guardrail Loop for resolution...');
    
    // We await the guardrail to complete
    const guardrailResult = await runAgenticGuardrail(items, chassisDir);
    if (!JSON_MODE) {
       console.log('✅ Agentic Output:');
       console.log(guardrailResult.text || guardrailResult.error);
    }
    
    // Re-evaluate if we want, or just accept the LLM's explanation as part of the report
    evalResults.agenticExplanation = guardrailResult.text || null;
  }
`;

// Insert the agenticCode right before Step 4: Budget Optimization Analysis
content = content.replace("  // Step 4: Budget Optimization Analysis (Golden Rule Assurance)", agenticCode + "\n  // Step 4: Budget Optimization Analysis (Golden Rule Assurance)");

fs.writeFileSync('scripts/eval_boq.js', content);
