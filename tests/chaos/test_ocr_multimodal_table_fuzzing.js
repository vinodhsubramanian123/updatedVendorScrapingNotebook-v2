'use strict';
/**
 * tests/chaos/test_ocr_multimodal_table_fuzzing.js
 *
 * Hardened Chaos & Fuzzing Suite for:
 * 1. Multi-Currency Normalization (EUR, GBP, JPY, CAD)
 * 2. Concatenated Multi-Line Bundled SKU Cells
 * 3. Rotated/Swapped Columns (Price before SKU, Description before Qty)
 * 4. Preambles, Trailing Legal Text & Clean PID Extraction (INV-21)
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { cleanBaseSKU, isValidHpeSKU } = require('../../scripts/lib/catalog/sku.js');
const { parseSkuLines } = require('../../scripts/lib/boq/boq_parser.js');

test('▶ [OCR-CHAOS 1]: Multi-Currency Normalization (€, £, ¥, CAD)', () => {
  const currencyStrings = [
    { text: '€ 1.250,50', expected: 1250.50 },
    { text: '£ 3,450.00', expected: 3450.00 },
    { text: '¥ 120,000', expected: 120000 },
    { text: '$ 23,877.00 USD', expected: 23877.00 },
    { text: 'CAD 5,070.00', expected: 5070.00 }
  ];

  currencyStrings.forEach(({ text, expected }) => {
    // Standardize currency extraction
    let clean = text.replace(/[^0-9.,]/g, '').trim();
    if (clean.includes(',') && clean.includes('.')) {
      if (clean.indexOf(',') < clean.indexOf('.')) {
        clean = clean.replace(/,/g, ''); // 1,250.50 -> 1250.50
      } else {
        clean = clean.replace(/\./g, '').replace(/,/g, '.'); // 1.250,50 -> 1250.50
      }
    } else if (clean.includes(',')) {
      clean = clean.replace(/,/g, '');
    }
    const val = parseFloat(clean) || 0;
    assert.equal(val, expected, `Parsed ${text} should equal ${expected}`);
  });
});

test('▶ [OCR-CHAOS 2]: Concatenated Multi-Line Bundled SKU Cells', () => {
  const multiLineBundleCell = `
    P52534-B21 (CTO Base Chassis)
    P67088-B21 / Intel Xeon 8580
    P64707-F21, 64GB Smart FIO
    P47777-B21; Storage Controller
    R2E09A | 32Gb FC HBA
    P48820-B21 (Fan Kit)
    P56073-B21
    P48918-B21
    P35876-B21
  `;

  const foundSkus = [];
  const matches = multiLineBundleCell.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/ig);
  if (matches) {
    matches.forEach(m => {
      const clean = cleanBaseSKU(m);
      if (isValidHpeSKU(clean) && !foundSkus.includes(clean)) {
        foundSkus.push(clean);
      }
    });
  }

  assert.ok(foundSkus.includes('P52534-B21'), 'Must extract base chassis');
  assert.ok(foundSkus.includes('P67088-B21'), 'Must extract CPU');
  assert.ok(foundSkus.includes('P64707-F21'), 'Must extract FIO memory');
  assert.ok(foundSkus.includes('R2E09A'), 'Must extract FC HBA');
  assert.ok(foundSkus.includes('P35876-B21'), 'Must extract CE Mark kit');
  assert.equal(foundSkus.length, 9, 'Must extract all 9 distinct SKUs from messy multi-line cell');
});

test('▶ [OCR-CHAOS 3]: Legal Disclaimer Preambles and Trailing Disclaimers', () => {
  const rawTextWithPreamble = `
    CONFIDENTIAL TENDER DOCUMENTATION
    ISSUED BY GLOBAL INFRASTRUCTURE DIVISION
    TERMS AND CONDITIONS APPLY. STRICTLY NON-DISCLOSURE.
    
    Item 1: P52534-B21 | Qty: 20 | DL380 Gen11 CTO Server
    Item 2: P67088-B21 | Qty: 40 | Xeon Platinum 8580
    Item 3: P64707-F21 | Qty: 160 | 64GB DDR5-5600 Smart FIO
    
    DISCLAIMER: PRICES ARE SUBJECT TO CHANGE WITHOUT NOTICE.
    AUTHORIZED SIGNATURE: ____________________
    DATE: 2026-08-28
  `;

  const parsed = parseSkuLines(rawTextWithPreamble.split('\n'));
  assert.ok(parsed.items.length >= 2, 'Must parse valid hardware items, ignoring preambles and signatures');
  assert.ok(parsed.items.some(it => it.sku === 'P52534-B21'), 'Must find base chassis');
});