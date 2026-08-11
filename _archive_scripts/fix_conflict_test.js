const fs = require('fs');
const path = require('path');
const file = 'tests/test_conflict_graph.js';
let content = fs.readFileSync(file, 'utf8');

// Create mock rules file
content = content.replace(
  "const { detectChassisVariant, validateConflictGraph } = require('../scripts/lib/conflict_graph');",
  `const os = require('os');
const { detectChassisVariant, validateConflictGraph } = require('../scripts/lib/conflict_graph');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conflict-graph-test-'));
const chassisDir = path.join(tmpDir, 'DL380_Gen12_SFF');
fs.mkdirSync(chassisDir, { recursive: true });
fs.writeFileSync(path.join(chassisDir, 'DL380_Gen12_SFF_Catalog_Rules.json'), JSON.stringify([
  { level: 'CATEGORY', ruleType: 'MUTUAL_EXCLUSION', condition: 'x4', target: 'x8', message: 'Mixing of x4 and x8 memory is not allowed' }
]));`
);

content = content.replace(/'outputs\/ProLiant\/Gen12\/DL380_Gen12_SFF'/g, 'chassisDir');

// Add cleanup
content = content.replace(
  "if (failed === 0) {",
  `fs.rmSync(tmpDir, { recursive: true, force: true });
  if (failed === 0) {`
);

fs.writeFileSync(file, content);
