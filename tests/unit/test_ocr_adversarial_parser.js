'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { parseSkuLines } = require('../../scripts/lib/boq/boq_parser.js');
const { isImageFile, performGeminiOcr } = require('../../scripts/lib/ocr/ocr_service.js');
const { GeminiKeyRotator } = require('../../scripts/lib/system/gemini_rotator.js');

const TEST_DIR = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_payloads');
if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
const TEST_STATE_FILE = path.join(TEST_DIR, 'temp_adv_test_keys_state.json');

function cleanup() {
  if (fs.existsSync(TEST_STATE_FILE)) fs.unlinkSync(TEST_STATE_FILE);
}

async function runAdversarialParserTests() {
  console.log('🧪 Starting Adversarial OCR & Chaotic Quote Parsing Tests...\n');
  cleanup();

  // 1. Test scripts/lib/boq_parser.js and scripts/lib/ocr_service.js with noisy tabular inputs
  console.log('▶ Test 1: Noisy tabular inputs (multi-currency, mixed whitespace, messy description, missing qty)');
  const noisyLines = [
    "SKU\tDescription\tQty\tPrice",
    " P73282-B21 \t HPE DL380 Gen10 Plus \t  2  \t $1,000.00 ", // standard, $
    "P07646-B21\tMessy Desc SN: 123456\t\t€ 500.00", // missing qty, €
    "867796-B21\t \t1\t£200", // empty desc, £
  ];
  
  const parsedNoisy = parseSkuLines(noisyLines);
  assert.strictEqual(parsedNoisy.items.length, 3);
  
  const item1 = parsedNoisy.items.find(i => i.sku === 'P73282-B21');
  assert.strictEqual(item1.quantity, 2);
  assert.strictEqual(item1.unitPriceUsd, 1000);
  
  const item2 = parsedNoisy.items.find(i => i.sku === 'P07646-B21');
  assert.strictEqual(item2.quantity, 1); // defaults to 1
  assert.strictEqual(item2.unitPriceUsd, 500); // parsed €
  assert(item2.description.includes('Messy Desc SN: 123456'));
  
  const item3 = parsedNoisy.items.find(i => i.sku === '867796-B21');
  assert.strictEqual(item3.unitPriceUsd, 200); // parsed £

  console.log('  ✅ Noisy tabular inputs handled correctly.');

  // 2. Test SKU regex extraction against edge cases
  console.log('\n▶ Test 2: SKU regex extraction edge cases');
  const edgeCaseLines = [
    "p07646-b21\t lower case sku \t1\t$100", // lowercase prefix
    "867796-B21\t truncated sku in text P73282-B2 \t 1 \t $100", // truncated SKU in description
    "Some text with embedded SN123456789 and sku P73282-B21", // embedded SN
  ];

  const parsedEdgeCases = parseSkuLines(edgeCaseLines);
  assert.strictEqual(parsedEdgeCases.items.length, 4);
  
  const lcItem = parsedEdgeCases.items.find(i => i.sku.toLowerCase() === 'p07646-b21');
  assert.ok(lcItem, "Lowercase SKU parsed");
  
  const truncItem = parsedEdgeCases.items.find(i => i.sku === '867796-B21');
  assert.ok(truncItem, "Extracted main SKU, ignored truncated");
  
  const snItem = parsedEdgeCases.items.find(i => i.sku === 'P73282-B21');
  assert.ok(snItem, "Extracted SKU with embedded SN in text");

  const pureSnItem = parsedEdgeCases.items.find(i => i.sku === 'SN123456789');
  assert.ok(pureSnItem, "Extracted embedded SN as a standalone SKU");

  console.log('  ✅ SKU regex extraction edge cases handled correctly.');

  // 3. Test FIFO key rotation failover under rapid simulated 429 quota exhaustion
  console.log('\n▶ Test 3: FIFO key rotation failover under rapid simulated 429 quota exhaustion');
  
  const mockKeys = [
    'MOCK_KEY_1',
    'MOCK_KEY_2',
    'MOCK_KEY_3'
  ];

  const rotator = new GeminiKeyRotator({
    stateFile: TEST_STATE_FILE,
    rawKeysString: mockKeys.join(',')
  });

  let callCount = 0;
  
  // Simulate an operation that throws 429 on the first two keys, succeeds on the third
  const simulatedOperation = async ({ apiKey }) => {
    callCount++;
    if (apiKey === 'MOCK_KEY_1' || apiKey === 'MOCK_KEY_2') {
      const err = new Error('Simulated Rate Limit or Quota Exhaustion');
      err.status = 429;
      throw err;
    }
    return `Success with ${apiKey}`;
  };

  const result = await rotator.executeWithSmartRotation(simulatedOperation, { maxRetries: 3 });
  
  assert.strictEqual(result, 'Success with MOCK_KEY_3');
  assert.strictEqual(callCount, 3); // Called exactly 3 times
  
  // Check that MOCK_KEY_1 and MOCK_KEY_2 are demoted and MOCK_KEY_3 is active
  const active = rotator.getActiveKey();
  assert.strictEqual(active.apiKey, 'MOCK_KEY_3');
  assert.strictEqual(active.allExhausted, undefined);

  const status = rotator.getPoolStatus();
  assert.strictEqual(status.activeKeys, 1);
  assert.strictEqual(status.exhaustedKeys, 2);

  console.log('  ✅ FIFO key rotation failover succeeded.');

  // 4. Test ocr_service.js handling
  console.log('\n▶ Test 4: OCR service bounds and image verification');
  
  // Test valid extensions
  assert.strictEqual(isImageFile('test.jpg'), true);
  assert.strictEqual(isImageFile('test.png'), true);
  assert.strictEqual(isImageFile('test.pdf'), true);
  assert.strictEqual(isImageFile('test.txt'), false);

  // Test file size limit simulation inside performGeminiOcr (it checks stats early on)
  const dummyImage = path.join(__dirname, 'dummy_test_image.jpg');
  fs.writeFileSync(dummyImage, 'fake image content');
  const originalStatSync = fs.statSync;
  fs.statSync = (p) => {
    if (p === dummyImage) return { size: 26 * 1024 * 1024 }; // 26 MB
    return originalStatSync(p);
  };
  try {
    await performGeminiOcr(dummyImage);
    assert.fail('Should have thrown size limit error');
  } catch (err) {
    assert(err.message.includes('exceeds maximum allowed size of 25MB'), 'Expected size limit error');
  } finally {
    fs.statSync = originalStatSync;
    if (fs.existsSync(dummyImage)) fs.unlinkSync(dummyImage);
  }

  console.log('  ✅ OCR service bounds verified.');

  cleanup();
  console.log('\n✅ All Adversarial Parser & OCR Resilience Tests Passed!');
}

runAdversarialParserTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  cleanup();
  process.exit(1);
});
