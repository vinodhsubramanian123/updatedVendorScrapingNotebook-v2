const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert');
const { queryLocalKnowledgeBase } = require('../scripts/lib/local_rag_search.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const MOCK_CHASSIS_DIR = path.join(OUTPUTS_DIR, 'DL380_Gen12');

test('Setup Mock Data', async (t) => {
  if (!fs.existsSync(OUTPUTS_DIR)) {
    fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(MOCK_CHASSIS_DIR)) {
    fs.mkdirSync(MOCK_CHASSIS_DIR, { recursive: true });
  }

  const catalogJson = {
    metadata: { chassis: 'DL380 Gen12', totalUniqueSKUs: 10 },
    entries: [
      {
        parentCategory: 'Memory',
        subCategory: 'DDR5',
        skus: [{ sku: 'P43322-B21', description: 'HPE 32GB (1x32GB) Single Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit', listPrice: 100 }]
      },
      {
        parentCategory: 'Power',
        subCategory: 'RPS',
        skus: [{ sku: '865414-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', listPrice: 200 }]
      },
      {
        parentCategory: 'Storage',
        subCategory: 'SSD',
        skus: [{ sku: 'P40502-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 PM1733a SSD', listPrice: 300 }]
      },
      {
        parentCategory: 'Networking',
        subCategory: 'Adapter',
        skus: [{ sku: 'P26253-B21', description: 'Broadcom BCM57412 Ethernet 10Gb 2-port SFP+ OCP3 Adapter for HPE', listPrice: 150 }]
      }
    ],
    baseVariants: [
      { sku: 'P52559-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', listPrice: 1500 }
    ]
  };
  fs.writeFileSync(path.join(MOCK_CHASSIS_DIR, 'DL380_Gen12_Catalog.json'), JSON.stringify(catalogJson, null, 2));

  const rulesCsv = `Category,SubCategory,Constraint,Severity,RuleText
Memory,DDR5,Requires Gen12,Error,Requires Gen12 processors
Power,RPS,Redundancy,Warning,Requires 2 power supplies for redundant power`;
  fs.writeFileSync(path.join(MOCK_CHASSIS_DIR, 'DL380_Gen12_Catalog_Rules.csv'), rulesCsv);
});

test('Test synonym mapping: "high speed ram" -> DDR5', async (t) => {
  const result = queryLocalKnowledgeBase('high speed ram', 'DL380 Gen12');
  assert.ok(result.answer.includes('DDR5'), 'Should match DDR5 based on synonym map');
  assert.ok(result.answer.includes('P43322-B21'), 'Should return the DDR5 memory kit SKU');
  assert.ok(result.confidenceScore > 0, 'Confidence score should be > 0');
});

test('Test synonym mapping: "redundant power" -> RPS', async (t) => {
  const result = queryLocalKnowledgeBase('redundant power', 'DL380 Gen12');
  assert.ok(result.answer.includes('RPS'), 'Should match RPS subcategory');
  assert.ok(result.answer.includes('865414-B21'), 'Should return the RPS power supply kit SKU');
});

test('Test synonym mapping: "nvme read intensive" -> SSD', async (t) => {
  const result = queryLocalKnowledgeBase('nvme read intensive', 'DL380 Gen12');
  assert.ok(result.answer.includes('SSD'), 'Should match SSD subcategory');
  assert.ok(result.answer.includes('P40502-B21'), 'Should return the NVMe SSD kit SKU');
});

test('Test partial part number match and scoring', async (t) => {
  const result = queryLocalKnowledgeBase('P52559 CTO Server', 'DL380 Gen12');
  assert.ok(result.answer.includes('P52559-B21'), 'Should match partial SKU in base variant');
  assert.ok(result.answer.includes('CTO Server'), 'Should match base variant description');
  assert.ok(result.confidenceScore > 0, 'Confidence score should be populated');
});

test('Test catalog rules cross-referencing', async (t) => {
  const result = queryLocalKnowledgeBase('redundant power rule', 'DL380 Gen12');
  assert.ok(result.answer.includes('Catalog Rule'), 'Should include catalog rule match');
  assert.ok(result.answer.includes('Requires 2 power supplies for redundant power'), 'Should find the specific rule text');
});

test('Test top-k ranking and score limits', async (t) => {
  // Add a bunch of noise rules to test top-k
  const rulesCsvLines = ['Category,SubCategory,Constraint,Severity,RuleText'];
  for (let i = 0; i < 20; i++) {
    rulesCsvLines.push(`Test,Noise,None,Info,This is a noisy text match ${i}`);
  }
  fs.writeFileSync(path.join(MOCK_CHASSIS_DIR, 'DL380_Gen12_Catalog_Rules.csv'), rulesCsvLines.join('\n'));

  const result = queryLocalKnowledgeBase('noisy text match', 'DL380 Gen12');

  // The result answer is a string of matches joined by \n\n. We split to count matches.
  const matches = result.answer.split('\n\n').filter(m => m.includes('Catalog Rule'));
  assert.ok(matches.length <= 15, `Should limit to top 15 results (got ${matches.length})`);
});

test('Teardown Mock Data', async (t) => {
  fs.rmSync(MOCK_CHASSIS_DIR, { recursive: true, force: true });
});
