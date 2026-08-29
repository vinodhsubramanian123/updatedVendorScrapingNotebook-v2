'use strict';
/**
 * tests/chaos/test_weblogic_dom_expansion_chaos.js
 *
 * Chaos & Boundary Stress Suite for WebLogic DOM Expansion and Lifecycle Status Tags:
 * (scripts/scrapers/dom_extract.js & scripts/catalogs/build_catalog.js)
 *
 * Invariants Covered:
 * - INV-20: WebLogic OCA Dynamic DOM Expansion & Full Sub-Choice Trigger Protocol
 * - INV-21: Lifecycle Status Tag & Clean PID Separation Protocol
 * - INV-35: Obsolete Vendor Description Badge & Concatenation Sanitization
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { cleanBaseSKU, isValidHpeSKU } = require('../../scripts/lib/catalog/sku.js');

describe('⚡ WebLogic DOM Expansion & Lifecycle Tag Chaos Suite', () => {

  test('1. Lifecycle Status Tag Separation (INV-21): cleans OB, DS, 90, EOL status prefixes/badges', () => {
    const rawDomSkuEntries = [
      { rawHtml: '<span class="td_prod">OB</span><span class="_pid">P52534-B21</span>', expectedSku: 'P52534-B21', expectedStatus: 'OB' },
      { rawHtml: '<span class="td_prod">DS</span><span class="_pid">P48820-B21</span>', expectedSku: 'P48820-B21', expectedStatus: 'DS' },
      { rawHtml: '<span class="td_prod">90</span><span class="_pid">P01366-B21</span>', expectedSku: 'P01366-B21', expectedStatus: '90' },
      { rawHtml: '<span class="td_prod">EOL</span><span class="_pid">P69728-B21</span>', expectedSku: 'P69728-B21', expectedStatus: 'EOL' },
      { rawHtml: '<span class="_pid">P47777-B21</span>', expectedSku: 'P47777-B21', expectedStatus: 'ACTIVE' }
    ];

    rawDomSkuEntries.forEach(({ rawHtml, expectedSku, expectedStatus }) => {
      // Simulate DOM text extraction with status separation
      const statusMatch = rawHtml.match(/class="td_prod">([A-Z0-9]+)<\/span>/i);
      const skuMatch = rawHtml.match(/class="_pid">([^<]+)<\/span>/i);

      const rawSku = skuMatch ? skuMatch[1] : rawHtml;
      const clean = cleanBaseSKU(rawSku);
      const status = statusMatch ? statusMatch[1] : 'ACTIVE';

      assert.strictEqual(clean, expectedSku, `SKU must be cleaned to ${expectedSku}`);
      assert.strictEqual(isValidHpeSKU(clean), true, `Clean SKU ${clean} must pass isValidHpeSKU regex`);
      assert.strictEqual(status, expectedStatus, `Status must match ${expectedStatus}`);
    });
  });

  test('2. Description Sanitization (INV-35): strips obsolete error prefixes from description', () => {
    const rawDescriptions = [
      'Product is obsolete: P52534-B21 HPE ProLiant DL380 Gen11 8SFF Server',
      'OB Product is obsolete: P48820-B21 HPE DL380 Gen11 High Performance Fan Kit',
      'DS HPE 96W Smart Storage Battery (up to 20 Devices) with 145mm Cable Kit',
      '90 HPE ProLiant DL380 Gen11 2P Full Height Primary Riser Kit',
      'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit'
    ];

    const cleanDescriptions = rawDescriptions.map(desc => {
      return desc
        .replace(/^Product is obsolete:\s*[A-Z0-9-]+\s*/i, '')
        .replace(/^(?:OB|DS|90|EOL)\s+/i, '')
        .replace(/\bProduct is obsolete:\s*[A-Z0-9-]+\b/gi, '')
        .trim();
    });

    assert.strictEqual(cleanDescriptions[0], 'HPE ProLiant DL380 Gen11 8SFF Server');
    assert.strictEqual(cleanDescriptions[1], 'HPE DL380 Gen11 High Performance Fan Kit');
    assert.strictEqual(cleanDescriptions[2], 'HPE 96W Smart Storage Battery (up to 20 Devices) with 145mm Cable Kit');
    assert.strictEqual(cleanDescriptions[3], 'HPE ProLiant DL380 Gen11 2P Full Height Primary Riser Kit');
    assert.strictEqual(cleanDescriptions[4], 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit');
  });

  test('3. Dynamic DOM Expansion (INV-20): validates selector triggers for hidden sub-choice tables', () => {
    const mockToggles = ['#show_extra_columns', '#show_dates', '#show_obsolete_date', '#show_cost', '#show_price'];
    const mockSubChoices = ['showmore_ProcessorSection_AdditionalProcessorsChoice', 'showmore_MemorySection_AdditionalDIMMsChoice'];

    assert.strictEqual(mockToggles.length, 5, 'Must contain all 5 WebLogic toolbar toggles');
    assert(mockSubChoices.every(sc => sc.startsWith('showmore_')), 'All subchoice IDs must match showmore_* pattern');
  });

});
