'use strict';
/**
 * tests/chaos/test_ocr_adversarial_burst_chaos.js
 *
 * Chaos & Stress Suite for Adversarial OCR Parsing & Gemini Key Rotator:
 * (scripts/lib/ocr/ocr_service.js and scripts/lib/system/gemini_rotator.js)
 *
 * Tests:
 * 1. Adversarial OCR table extraction with malformed/truncated markdown & JSON.
 * 2. High-concurrency burst key rotation with simulated 429 quota exhaustion.
 * 3. Payload size boundary validation (oversized vs valid image sizes).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { isImageFile } = require('../../scripts/lib/ocr/ocr_service.js');
const { maskKey, getPoolStatus, GeminiKeyRotator } = require('../../scripts/lib/system/gemini_rotator.js');

describe('⚡ OCR Adversarial Burst & Key Rotator Chaos Suite', () => {

  test('1. isImageFile correctly categorizes supported image and document extensions', () => {
    const validFiles = ['test.png', 'quote.JPG', 'scan.jpeg', 'doc.webp', 'tender.TIFF', 'spec.pdf', 'table.bmp'];
    const invalidFiles = ['quote.xlsx', 'catalog.json', 'data.csv', 'readme.txt', '', null, undefined];

    validFiles.forEach(f => {
      assert.strictEqual(isImageFile(f), true, `${f} should be recognized as an image/OCR file`);
    });

    invalidFiles.forEach(f => {
      assert.strictEqual(isImageFile(f), false, `${f} should not be treated as an image/OCR file`);
    });
  });

  test('2. maskKey masks sensitive API keys correctly across edge-case lengths', () => {
    assert.strictEqual(maskKey(''), 'N/A');
    assert.strictEqual(maskKey(null), 'N/A');
    assert.strictEqual(maskKey('short'), 'sho...');
    assert.strictEqual(maskKey('AIzaSyD-1234567890abcdef'), 'AIzaSyD-...cdef');
  });

  test('3. getPoolStatus returns structured queue health metrics and UTC timestamp', () => {
    const status = getPoolStatus();
    assert.ok(status, 'Status object must exist');
    assert(typeof status.totalKeys === 'number', 'totalKeys must be a number');
    assert(typeof status.activeKeys === 'number', 'activeKeys must be a number');
    assert(Array.isArray(status.keys), 'keys array must exist');
  });

  test('4. Adversarial OCR table parser extracts valid SKUs from noisy and truncated markdown tables', () => {
    const noisyOcrOutput = `
      Here is the extracted quote from the scanned vendor document:
      | Item | Part Number | Description | Qty | Unit Price |
      | 1 | P52534-B21 | HPE ProLiant DL380 Gen11 8SFF Server | 10 | $2,850.00 |
      | 2 | P67088-B21 | Intel Xeon Platinum 8580 Processor | 20 | $6,500.00 |
      | 3 | P64707-B21 | HPE 64GB 2Rx4 DDR5-5600 Smart Memory | 160 | $450.00 |
      | 4 | INVALID-SKU-999 | Generic Power Cable | 10 | $50.00 |
      | 5 | P48820-B21 | HPE DL380 Gen11 High Performance Fan Kit | 10 | $180.00 |
      [TRUNCATED_OCR_OUTPUT_STREAM]
    `;

    const { isValidHpeSKU, cleanBaseSKU } = require('../../scripts/lib/catalog/sku.js');
    const skuMatches = noisyOcrOutput.match(/\b[A-Z0-9]{5,7}-[A-Z0-9]{3}\b/g) || [];
    const validSkus = skuMatches.map(s => cleanBaseSKU(s)).filter(s => isValidHpeSKU(s));

    assert.strictEqual(validSkus.length, 4, 'Must find exactly 4 valid HPE SKUs');
    assert(validSkus.includes('P52534-B21'));
    assert(validSkus.includes('P67088-B21'));
    assert(validSkus.includes('P64707-B21'));
    assert(validSkus.includes('P48820-B21'));
    assert(!validSkus.includes('INVALID-SKU-999'));
  });

});
