'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { isImageFile, performGeminiOcr } = require('../scripts/lib/ocr_service.js');
const geminiRotator = require('../scripts/lib/gemini_rotator.js');

async function runTests() {
  console.log('🧪 Starting OCR Service Resilience Tests...');

  const dummyImage = path.join(__dirname, 'dummy_test_image.jpg');
  fs.writeFileSync(dummyImage, 'fake image content');

  // Test 1: Payload size limit (25MB check)
  console.log('  Testing payload size limit...');
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
  }

  // Set API key to avoid early return in performGeminiOcr
  const originalGetActiveKey = geminiRotator.getActiveKey;
  geminiRotator.getActiveKey = () => ({ apiKey: 'fake-key' });

  // Test 2 & 4: Simulated 429 rate limit backoff and Fallback table extraction
  console.log('  Testing rate limit handling and fallback extraction...');
  const originalExecute = geminiRotator.executeWithSmartRotation;

  let callCount = 0;
  geminiRotator.executeWithSmartRotation = async (fn, opts) => {
    callCount++;
    throw new Error('429 Too Many Requests');
  };

  const fallbackResult = await performGeminiOcr(dummyImage);
  assert(fallbackResult.text.includes('[OCR_ERROR]'), 'Expected fallback output with [OCR_ERROR]');
  assert(fallbackResult.text.includes('429 Too Many Requests'), 'Expected error message in fallback text');
  assert.strictEqual(fallbackResult.isOcrProcessed, false);

  geminiRotator.executeWithSmartRotation = originalExecute;

  // Test 3: Malformed base64 handling / invalid file handling
  console.log('  Testing invalid file handling...');
  assert.strictEqual(isImageFile('test.txt'), false, 'Should reject .txt files');
  assert.strictEqual(isImageFile(null), false, 'Should handle null');
  assert.strictEqual(isImageFile('test.jpg'), true, 'Should accept .jpg files');

  // Test 5: Simulated Successful Extraction
  console.log('  Testing successful extraction...');
  geminiRotator.executeWithSmartRotation = async (fn, opts) => {
    return {
      text: "Line#, SKU, Description, Qty\n1, P76706-B21, Server, 1\n2, P48820-B21, Memory, 2"
    };
  };

  const successResult = await performGeminiOcr(dummyImage);
  assert(successResult.isOcrProcessed, true);
  // Three lines: Header + 2 items
  assert.strictEqual(successResult.lineCount, 3);
  assert.deepStrictEqual(successResult.detectedSkus, ['P76706-B21', 'P48820-B21']);

  geminiRotator.executeWithSmartRotation = originalExecute;
  geminiRotator.getActiveKey = originalGetActiveKey;

  fs.unlinkSync(dummyImage);

  console.log('✅ OCR Service Resilience Tests Passed!');
}

runTests().catch(err => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
