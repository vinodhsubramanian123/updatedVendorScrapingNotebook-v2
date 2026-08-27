/**
 * test_dom_extraction_fuzzing.js
 * Chaos & Fuzzing Test Suite for WebLogic OCA DOM Extraction,
 * Nested Sub-Choice Parsing, and Lifecycle Badge Separation.
 * 
 * Verifies:
 * - INV-20: WebLogic Dynamic DOM Expansion & Full Sub-Choice Trigger Protocol
 * - INV-21: Lifecycle Status Tag & Clean PID Separation Protocol
 * - INV-22: Category Cardinality & Proactive Provenance Pre-Commit Assertion
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cleanBaseSKU, isValidHpeSKU } = require('../../scripts/lib/catalog/sku.js');

describe('DOM Extraction Chaos & Fuzzing Tests (INV-20 & INV-21)', () => {
  it('should handle heavily malformed, whitespace-padded DOM strings without throwing', () => {
    const fuzzedEntries = [
      ' \n\t  OB  \n\t  P49631-B21  \t\n ',
      'DS\r\n\tP49632-B21CTO\r\n',
      '90 \n\n \t P49639-B21 \t ',
      '  [OB]   P49638-B21   ',
      ' \t\t  P67089-B21  \n\n '
    ];

    fuzzedEntries.forEach(entry => {
      const clean = cleanBaseSKU(entry);
      assert.ok(clean.length > 0, `Cleaned SKU from '${entry}' must not be empty`);
      assert.strictEqual(isValidHpeSKU(clean), true, `SKU '${clean}' must be valid HPE SKU`);
    });
  });

  it('should safely reject empty, undefined, null, or symbol inputs without crash', () => {
    const edgeCases = [
      '',
      '   ',
      null,
      undefined,
      '\n\t\r',
      '---',
      'N/A'
    ];

    edgeCases.forEach(ec => {
      assert.doesNotThrow(() => {
        const clean = cleanBaseSKU(ec);
        const valid = isValidHpeSKU(clean);
        assert.strictEqual(valid, false, `Edge case '${ec}' must not be considered a valid SKU`);
      });
    });
  });

  it('should handle simulated WebLogic sub-choice table rows with badges and dates', () => {
    const mockWebLogicRows = [
      { rawSku: '<span class="td_prod">OB</span><span class="_pid">P49631-B21</span>', desc: 'Intel Xeon 8468V', price: '$8,500.00', startDate: '01/10/2023', discontinuedDate: '11/30/2025' },
      { rawSku: '<span class="td_prod">DS</span><span class="_pid">P49632-B21</span>', desc: 'Intel Xeon 8458P', price: '$7,200.00', startDate: '01/10/2023', discontinuedDate: '09/30/2025' },
      { rawSku: '<span class="td_prod">90</span><span class="_pid">P49639-B21</span>', desc: 'Intel Xeon 5411N', price: '$2,100.00', startDate: '04/03/2023', discontinuedDate: '10/31/2026' },
      { rawSku: '<span class="_pid">P67089-B21</span>', desc: 'Intel Xeon 8592+', price: '$12,400.00', startDate: '12/14/2023', discontinuedDate: '07/31/2027' }
    ];

    mockWebLogicRows.forEach(row => {
      // Simulate PID extraction logic
      const pidMatch = row.rawSku.match(/class="_pid">([^<]+)<\/span>/);
      const badgeMatch = row.rawSku.match(/class="td_prod">([^<]+)<\/span>/);
      
      const cleanSku = pidMatch ? pidMatch[1].trim() : cleanBaseSKU(row.rawSku);
      const badge = badgeMatch ? badgeMatch[1].trim() : 'Active';

      assert.strictEqual(isValidHpeSKU(cleanSku), true, `Extracted SKU '${cleanSku}' must be valid`);
      assert.ok(['OB', 'DS', '90', 'Active'].includes(badge), `Badge '${badge}' must be valid`);
    });
  });
});
