const { parseAndConsolidateBOQ, evaluatePhysicalMath } = require('./scripts/lib/boq/boq_evaluator.js');
const { validateConflictGraph } = require('./scripts/lib/conflict/conflict_graph.js');

const text = `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-B21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P48818-B21,HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply,2
HA114A1,HPE Installation and Startup Service,1
S1A05A,HPE GreenLake Private Cloud Business Edition SaaS,1`;

const items = parseAndConsolidateBOQ(text);
const posEval = evaluatePhysicalMath(items);
console.log("ERRORS:", JSON.stringify(posEval.errors, null, 2));
console.log("MISSING DEPS:", JSON.stringify(posEval.missingDependencies, null, 2));
