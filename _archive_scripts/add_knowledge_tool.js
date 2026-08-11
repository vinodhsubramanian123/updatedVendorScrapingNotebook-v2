const fs = require('fs');

let content = fs.readFileSync('scripts/agentic_eval.js', 'utf8');

const newTool = `
  {
    name: 'record_knowledge_delta',
    description: 'Records a new physical dependency rule or fix to the persistent KnowledgeBase so the system automatically learns from this session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chassis_id: { type: Type.STRING, description: "The chassis variant, e.g., 'DL380_Gen12_SFF'" },
        affected_sku: { type: Type.STRING, description: "The SKU that requires a fix." },
        required_sku: { type: Type.STRING, description: "The mandatory required SKU." },
        rule_update: { type: Type.STRING, description: "The explanation of the new rule." }
      },
      required: ['chassis_id', 'affected_sku', 'required_sku', 'rule_update']
    }
  }
`;

content = content.replace(
  "  }\n];",
  "  }," + newTool + "\n];"
);

const newRequires = `
const { processPortalFeedback } = require('./lib/feedback_loop.js');
`;

content = content.replace(
  "const { queryLocalKnowledgeBase } = require('./lib/local_rag_search.js');",
  "const { queryLocalKnowledgeBase } = require('./lib/local_rag_search.js');" + newRequires
);

const toolSwitchCase = `
          case 'record_knowledge_delta': {
            const outputDir = path.join(__dirname, '..', 'outputs', 'ProLiant', 'Gen12', args.chassis_id);
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            result = processPortalFeedback("Agentic rule update", outputDir, {
              affectedSku: args.affected_sku,
              requiredDependencySku: args.required_sku,
              ruleUpdate: args.rule_update,
              humanReasoning: "Agentic Guardrail Loop derived from RAG/DB fact-check"
            });
            break;
          }
`;

content = content.replace(
  "          case 'query_catalog_db': {",
  toolSwitchCase + "          case 'query_catalog_db': {"
);

fs.writeFileSync('scripts/agentic_eval.js', content);
