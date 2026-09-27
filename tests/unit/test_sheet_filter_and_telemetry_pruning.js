'use strict';
/**
 * tests/unit/test_sheet_filter_and_telemetry_pruning.js
 *
 * Validates:
 * - Gap 1: Canonical isNonBomSheet/isBomSheet functions (INV-63)
 * - Gap 2: Own output workbook sheets are correctly classified
 * - Gap 4: Expanded bomKeywords cover modern sheet name patterns
 * - Gap 5: Telemetry FIFO pruning caps array sizes
 */

const test = require('node:test');
const assert = require('node:assert');

const {
  isNonBomSheet,
  isBomSheet,
  NON_BOM_KEYWORDS,
  BOM_KEYWORDS
} = require('../../scripts/lib/boq/boq_parser.js');

const {
  pruneTelemetry,
  MAX_TELEMETRY_ENTRIES
} = require('../../scripts/lib/system/telemetry.js');

// ═══════════════════════════════════════════════════════════
// Gap 1+2: Canonical isNonBomSheet / isBomSheet (INV-63)
// ═══════════════════════════════════════════════════════════

test('Canonical Sheet Filter Tests (INV-63)', async (t) => {

  await t.test('isNonBomSheet correctly identifies non-BOM sheets', () => {
    const nonBomSheets = [
      'Audit Trail',
      'Architecture Notes',
      'Terms & Conditions',
      'Notes',
      'README',
      'Compliance Matrix',
      'Validation Messages',
      'Message Log',
      'CLIC Advice',
      'Error Log',
      'Errors Found',
      'Instructions',
      'Cover Page',
      'Executive Summary & Aspects',   // Gap 2: Our own generated output sheet
      'Overview',
      'Changelog',
      'Revision History'
    ];

    for (const sheet of nonBomSheets) {
      assert.strictEqual(
        isNonBomSheet(sheet), true,
        `Expected isNonBomSheet("${sheet}") to return true`
      );
    }
  });

  await t.test('isNonBomSheet correctly allows BOM sheets through', () => {
    const bomSheets = [
      'BOM',
      'Quote Details',
      'BOQ - Server Hardware',
      'Tender Response',
      'Hardware List',
      'Parts Breakdown',
      'Rank 1 - Customer Intent',       // Gap 2: Our own Rank output sheets
      'Rank 2 - Performance',
      'Rank 1L - Least Delta',
      'Configuration Summary',           // Gap 4: 'config' keyword
      'Server Components',               // Gap 4: 'server' keyword  
      'Compute Nodes',                   // Gap 4: 'compute' keyword
      'Storage Options',                 // Gap 4: 'storage' keyword
      'Pricing Sheet',                   // Gap 4: 'pricing' keyword
      'Spec Response',                   // Gap 4: 'spec' keyword
      'Bill of Materials'                // Gap 4: full phrase
    ];

    for (const sheet of bomSheets) {
      assert.strictEqual(
        isNonBomSheet(sheet), false,
        `Expected isNonBomSheet("${sheet}") to return false (sheet should be parsed as BOM)`
      );
    }
  });

  await t.test('isBomSheet positively identifies BOM priority sheets', () => {
    const prioritySheets = [
      'BOM',
      'Customer Quote',
      'BOQ_items',
      'Tender Pricing',
      'Hardware Config',
      'Rank 1 Build',
      'Server Node A',
      'Compute Cluster',
      'Storage Array Config',
      'Networking Components',
      'Pricing Details'
    ];

    for (const sheet of prioritySheets) {
      assert.strictEqual(
        isBomSheet(sheet), true,
        `Expected isBomSheet("${sheet}") to return true`
      );
    }
  });

  await t.test('isBomSheet rejects non-BOM sheets', () => {
    const nonBomSheets = [
      'Sheet1',
      'Data',
      'Page 1',
      'Dashboard',
      'Metrics'
    ];

    for (const sheet of nonBomSheets) {
      assert.strictEqual(
        isBomSheet(sheet), false,
        `Expected isBomSheet("${sheet}") to return false`
      );
    }
  });

  await t.test('BOM keywords take priority over non-BOM keywords', () => {
    // "Rank 1 Summary" contains both "rank" (BOM) and "summary" (non-BOM)
    // BOM should win because it indicates actual data
    assert.strictEqual(isNonBomSheet('Rank 1 Summary'), false,
      'BOM keyword "rank" should override non-BOM keyword "summary"');

    // "Configuration Notes" contains both "config" (BOM) and "notes" (non-BOM)
    assert.strictEqual(isNonBomSheet('Configuration Notes'), false,
      'BOM keyword "config" should override non-BOM keyword "notes"');

    // "Hardware Validation" contains both "hardware" (BOM) and "validation" (non-BOM)
    assert.strictEqual(isNonBomSheet('Hardware Validation'), false,
      'BOM keyword "hardware" should override non-BOM keyword "validation"');
  });

  await t.test('edge cases: null, empty, undefined input', () => {
    assert.strictEqual(isNonBomSheet(null), true);
    assert.strictEqual(isNonBomSheet(''), true);
    assert.strictEqual(isNonBomSheet(undefined), true);
    assert.strictEqual(isBomSheet(null), false);
    assert.strictEqual(isBomSheet(''), false);
    assert.strictEqual(isBomSheet(undefined), false);
  });

  await t.test('keyword lists have no duplicates', () => {
    const bomDupes = BOM_KEYWORDS.filter((kw, i) => BOM_KEYWORDS.indexOf(kw) !== i);
    assert.strictEqual(bomDupes.length, 0, `BOM_KEYWORDS has duplicates: ${bomDupes}`);

    const nonBomDupes = NON_BOM_KEYWORDS.filter((kw, i) => NON_BOM_KEYWORDS.indexOf(kw) !== i);
    assert.strictEqual(nonBomDupes.length, 0, `NON_BOM_KEYWORDS has duplicates: ${nonBomDupes}`);
  });
});

// ═══════════════════════════════════════════════════════════
// Gap 5: Telemetry FIFO Pruning
// ═══════════════════════════════════════════════════════════

test('Telemetry FIFO Pruning (Gap 5)', async (t) => {

  await t.test('pruneTelemetry caps oversized arrays', () => {
    const data = {
      history: new Array(200).fill({ id: 'test' }),
      learnedDeltas: new Array(80).fill({ id: 'test' }),
      exportHistory: new Array(150).fill({ id: 'test' }),
      guardrailHistory: new Array(60).fill({ id: 'test' })
    };

    const pruned = pruneTelemetry(data);
    assert.strictEqual(pruned, true, 'Should report pruning occurred');
    assert.strictEqual(data.history.length, MAX_TELEMETRY_ENTRIES.history);
    assert.strictEqual(data.learnedDeltas.length, MAX_TELEMETRY_ENTRIES.learnedDeltas);
    assert.strictEqual(data.exportHistory.length, MAX_TELEMETRY_ENTRIES.exportHistory);
    assert.strictEqual(data.guardrailHistory.length, MAX_TELEMETRY_ENTRIES.guardrailHistory);
  });

  await t.test('pruneTelemetry preserves arrays within limit', () => {
    const data = {
      history: new Array(10).fill({ id: 'test' }),
      learnedDeltas: new Array(5).fill({ id: 'test' })
    };

    const pruned = pruneTelemetry(data);
    assert.strictEqual(pruned, false, 'Should report no pruning needed');
    assert.strictEqual(data.history.length, 10);
    assert.strictEqual(data.learnedDeltas.length, 5);
  });

  await t.test('pruneTelemetry handles missing arrays gracefully', () => {
    const data = { version: '1.2.0' };
    const pruned = pruneTelemetry(data);
    assert.strictEqual(pruned, false);
  });

  await t.test('pruneTelemetry keeps newest entries (FIFO: oldest evicted)', () => {
    const data = {
      history: [
        { id: 'newest', timestamp: '2026-09-28' },
        { id: 'middle', timestamp: '2026-09-27' },
        ...new Array(200).fill({ id: 'old', timestamp: '2026-01-01' })
      ]
    };

    pruneTelemetry(data);
    assert.strictEqual(data.history[0].id, 'newest', 'First entry should be newest');
    assert.strictEqual(data.history[1].id, 'middle', 'Second entry should be middle');
    assert.strictEqual(data.history.length, MAX_TELEMETRY_ENTRIES.history);
  });
});
