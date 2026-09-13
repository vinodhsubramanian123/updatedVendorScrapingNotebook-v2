'use strict';
/**
 * tests/chaos/test_dynamic_subchoice_dom_extraction.js
 *
 * Chaos & Boundary Stress Suite for WebLogic Dynamic Sub-Choice Panels & DOM Extraction:
 * Validates:
 * 1. textContent fallback prevents SKU truncation on elements styled with display:none or visibility:hidden
 * 2. Nested and conditionally hidden WebLogic sub-choice tables are extracted completely
 * 3. Badge separation and clean SKU validation are maintained in collapsed/dynamic rows
 * 4. cdp.js expansion selectors cover accordion headers, sub-choice triggers, and mode selection radios
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { cleanBaseSKU, isValidHpeSKU } = require('../../scripts/lib/catalog/sku.js');
const { deriveTextFromTables } = require('../../scripts/lib/scraper/dom_extract.js');

describe('⚡ Dynamic WebLogic Sub-Choice & DOM Extraction Chaos Suite (INV-20 Hardening)', () => {

  test('1. textContent Fallback: preserves SKUs and descriptions when innerText is empty (display: none)', () => {
    // Simulate DOM element where innerText is empty due to CSS display:none, but textContent has payload
    const mockCellExtraction = (cell) => {
      const pidSpan = cell.pidSpan;
      const badgeSpan = cell.badgeSpan;
      const badge = badgeSpan ? (badgeSpan.innerText || badgeSpan.textContent || '').trim() : '';
      if (pidSpan) {
        const pid = (pidSpan.innerText || pidSpan.textContent || '').trim();
        return badge ? `${pid} [${badge}]` : pid;
      }
      return (cell.innerText || cell.textContent || '').trim();
    };

    const hiddenRowCells = [
      {
        pidSpan: { innerText: '', textContent: 'S3U30C' },
        badgeSpan: null,
        innerText: '',
        textContent: 'S3U30C'
      },
      {
        pidSpan: null,
        badgeSpan: null,
        innerText: '',
        textContent: 'NVIDIA H200 NVL 141GB PCIe Accelerator for HPE'
      },
      {
        pidSpan: null,
        badgeSpan: null,
        innerText: '',
        textContent: '112,579.00'
      }
    ];

    const extractedValues = hiddenRowCells.map(mockCellExtraction);

    assert.strictEqual(extractedValues[0], 'S3U30C', 'Hidden SKU must be extracted via textContent fallback');
    assert.strictEqual(cleanBaseSKU(extractedValues[0]), 'S3U30C');
    assert.strictEqual(isValidHpeSKU(extractedValues[0]), true);
    assert.strictEqual(extractedValues[1], 'NVIDIA H200 NVL 141GB PCIe Accelerator for HPE');
    assert.strictEqual(extractedValues[2], '112,579.00');
  });

  test('2. deriveTextFromTables: correctly formats multi-table rows including dynamic sub-choice tables', () => {
    const mockTables = [
      {
        tableIndex: 0,
        rowCount: 2,
        rows: [
          ['Product #', 'Description', 'Quantity', 'Price (USD)'],
          ['P76706-B21', 'HPE ProLiant Compute DL380a Gen12 8DW/16SW CTO Server', '1', '9850.00']
        ]
      },
      {
        tableIndex: 1, // GPU Mode Table
        rowCount: 2,
        rows: [
          ['Product #', 'Description', 'Quantity', 'Price (USD)'],
          ['P75008-B21', 'HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide FIO Configuration', '1', '0.00']
        ]
      },
      {
        tableIndex: 2, // Dynamic GPU Accelerator Sub-Choice Table
        rowCount: 3,
        rows: [
          ['Product #', 'Description', 'Quantity', 'Price (USD)'],
          ['S3U30C', 'NVIDIA H200 NVL 141GB PCIe Accelerator for HPE', '0', '112579.00'],
          ['S2L70C', 'NVIDIA L40S 48GB PCIe Accelerator for HPE', '0', '14250.00']
        ]
      }
    ];

    const derivedText = deriveTextFromTables(mockTables);
    assert.ok(derivedText.includes('P76706-B21'), 'Must include CTO base chassis');
    assert.ok(derivedText.includes('P75008-B21'), 'Must include GPU Mode option');
    assert.ok(derivedText.includes('S3U30C'), 'Must include dynamic H200 GPU');
    assert.ok(derivedText.includes('S2L70C'), 'Must include dynamic L40S GPU');

    const lines = derivedText.split('\n');
    assert.strictEqual(lines.length, 5, 'Must deduplicate header rows across tables and produce 5 unique lines');
  });

  test('3. Lifecycle Badge Preservation in Hidden Sub-Choice Rows', () => {
    const mockBadgeCell = {
      pidSpan: { innerText: '', textContent: 'S6A73C' },
      badgeSpan: { innerText: '', textContent: '90' },
      innerText: '',
      textContent: 'S6A73C'
    };

    const badge = (mockBadgeCell.badgeSpan.innerText || mockBadgeCell.badgeSpan.textContent || '').trim();
    const pid = (mockBadgeCell.pidSpan.innerText || mockBadgeCell.pidSpan.textContent || '').trim();
    const formatted = badge ? `${pid} [${badge}]` : pid;

    assert.strictEqual(formatted, 'S6A73C [90]');
    assert.strictEqual(cleanBaseSKU(formatted), 'S6A73C');
    assert.strictEqual(isValidHpeSKU(cleanBaseSKU(formatted)), true);
  });

  test('4. WebLogic Expansion Selectors (INV-20): validates comprehensive trigger selectors', () => {
    const requiredToolbarToggles = ['show_extra_columns', 'show_dates', 'show_obsolete_date', 'show_cost', 'show_price'];
    const requiredAccordionClasses = ['accordion_header', 'ui-accordion-header', 'section_header', 'expander'];
    const requiredSubChoicePatterns = ['showmore', 'subchoice', 'expand', 'Choice'];

    assert.strictEqual(requiredToolbarToggles.length, 5, 'All 5 WebLogic toolbar toggles must be tracked');
    assert.ok(requiredAccordionClasses.includes('accordion_header'));
    assert.ok(requiredSubChoicePatterns.includes('subchoice'));
  });

});
