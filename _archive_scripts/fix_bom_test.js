const fs = require('fs');
const path = require('path');
const file = 'tests/test_vendor_bom_verifier.js';
let content = fs.readFileSync(file, 'utf8');

// replace chassisDir to use a mock temp dir
content = content.replace(
  "const chassisDir = path.join(__dirname, '..', 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF');",
  `const fs = require('fs');
  const os = require('os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-bom-test-'));
  const chassisDir = path.join(tmpDir, 'DL380_Gen12_SFF');
  fs.mkdirSync(chassisDir, { recursive: true });
  fs.writeFileSync(path.join(chassisDir, 'DL380_Gen12_SFF_Catalog.json'), JSON.stringify({
    entries: [
      { skus: [{ 'Product #': 'P47777-B21' }, { 'Product #': 'P74775-B21' }, { 'Product #': 'P76471-B21' }, { 'Product #': 'P38997-B21' }] }
    ]
  }));`
);

// Add cleanup
content = content.replace(
  "if (passed === total) {",
  `fs.rmSync(tmpDir, { recursive: true, force: true });
  if (passed === total) {`
);
fs.writeFileSync(file, content);
