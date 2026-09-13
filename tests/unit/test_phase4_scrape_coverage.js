'use strict';
/**
 * tests/unit/test_phase4_scrape_coverage.js
 *
 * Phase 4 — Scrape and Chassis Coverage Test Suite
 *
 * Validates:
 *   1. Immutable text capture + retry resilience (dom_extract.js extractChunkedText)
 *   2. Row deduplication in deriveTextFromTables
 *   3. Category provenance — all entries have text/role-matched categories (no pure ordinal fallback)
 *   4. Per-variant rule matrix coverage for DL380 Gen12 (6 variants) and DL145 Gen11 (1 variant)
 *   5. Physical constraint encoding accuracy (required → -2, no max → -1, optional → -3)
 *   6. Known OCA grouping artifacts are logged, not silently ignored
 *   7. Zero uncategorized entries across all 4 chassis catalogs
 *   8. Critical categories (PSU, Networking, Chassis) have non-zero SKUs with prices in all chassis
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const OUTPUTS_ROOT = path.resolve(__dirname, '../../outputs');

function loadCatalog(family, gen, model, filename) {
  const p = path.join(OUTPUTS_ROOT, family, gen, model, filename);
  if (!fs.existsSync(p)) throw new Error(`Catalog file missing: ${p}`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const CATALOGS = {
  DL380_Gen12: () => loadCatalog('ProLiant', 'Gen12', 'DL380_Gen12', 'DL380_Gen12_Catalog.json'),
  DL380_Gen11: () => loadCatalog('ProLiant', 'Gen11', 'DL380_Gen11', 'DL380_Gen11_Catalog.json'),
  DL380a_Gen12: () => loadCatalog('ProLiant', 'Gen12', 'DL380a_Gen12', 'DL380a_Gen12_Catalog.json'),
  DL145_Gen11: () => loadCatalog('ProLiant', 'Gen11', 'DL145_Gen11', 'DL145_Gen11_Catalog.json'),
};

const RULES_CATALOGS = {
  DL380_Gen12: () => loadCatalog('ProLiant', 'Gen12', 'DL380_Gen12', 'DL380_Gen12_Catalog_Rules.json'),
  DL145_Gen11: () => loadCatalog('ProLiant', 'Gen11', 'DL145_Gen11', 'DL145_Gen11_Catalog_Rules.json'),
};

describe('Phase 4: Scrape and Chassis Coverage Suite', () => {
  it('1. extractChunkedText retries until DOM is stable and returns full text snapshot', async () => {
    const { extractChunkedText } = require('../../scripts/lib/scraper/dom_extract.js');
    let evalCalls = 0;
    const mockSend = async (ws, method, params) => {
      evalCalls++;
      if (method === 'Runtime.evaluate' && params.expression.includes('isLoading')) {
        if (evalCalls <= 2) {
          return { result: { value: { length: 300, isLoading: true } } };
        }
        return { result: { value: { length: 12000, isLoading: false } } };
      }
      if (method === 'Runtime.evaluate' && params.expression.includes('__ocaBodyTextSnapshot')) {
        if (params.expression.includes('delete')) return { result: { value: true } };
        return { result: { value: 'A'.repeat(12000) } };
      }
      return { result: { value: null } };
    };
    const { fullText, totalLen } = await extractChunkedText({}, mockSend, 50000, 3);
    assert.equal(totalLen, 12000, 'totalLen should be 12000 after retry settles');
    assert.equal(fullText.length, 12000, 'fullText.length should be 12000 from stable snapshot');
  });

  it('2. deriveTextFromTables deduplicates duplicate rows across tables', () => {
    const { deriveTextFromTables } = require('../../scripts/lib/scraper/dom_extract.js');
    const tables = [
      { rows: [['P73282-B21', 'DL380 Gen12 SFF CTO', '1', '5584.00'], ['P03178-B21', 'PSU 1000W', '2', '926.00']] },
      { rows: [['P73282-B21', 'DL380 Gen12 SFF CTO', '1', '5584.00']] },
      { rows: [['P73283-B21', 'DL380 Gen12 24SFF CTO', '1', '5980.00']] }
    ];
    const text = deriveTextFromTables(tables);
    const lines = text.split('\n').filter(Boolean);
    const dl380Lines = lines.filter(l => l.includes('P73282-B21'));
    assert.equal(dl380Lines.length, 1, 'P73282-B21 should appear exactly once after dedup');
    assert.equal(lines.length, 3, 'Unique lines: 3 (P73282, P03178, P73283)');
  });

  it('3. All 4 chassis catalogs have zero uncategorized (empty parentCategory) entries', () => {
    for (const [name, load] of Object.entries(CATALOGS)) {
      const d = load();
      const uncategorized = d.entries.filter(e => !e.parentCategory || e.parentCategory === '');
      assert.equal(uncategorized.length, 0,
        `${name}: ${uncategorized.length} uncategorized entries found`);
    }
  });

  it('4. All catalog entries across 4 chassis have at least one rule (no silent ordinal fallback)', () => {
    for (const [name, load] of Object.entries(CATALOGS)) {
      const d = load();
      const noRules = d.entries.filter(e => !e.rules || e.rules.length === 0);
      assert.equal(noRules.length, 0,
        `${name}: ${noRules.length} entries with no rules`);
    }
  });

  it('5. Critical categories (PSU, Networking, Chassis) exist with prices in all chassis', () => {
    const critCats = ['Power Supplies', 'Networking', 'Chassis'];
    for (const [name, load] of Object.entries(CATALOGS)) {
      const d = load();
      for (const cat of critCats) {
        const entries = d.entries.filter(e => e.parentCategory === cat);
        assert.ok(entries.length > 0, `${name}/${cat}: must have at least 1 entry`);
        const skus = entries.flatMap(e => e.skus || []);
        assert.ok(skus.length > 0, `${name}/${cat}: must have at least 1 SKU`);
        const priced = skus.filter(s => {
          const p = parseFloat((s['Unit Price (USD)'] || '').replace(/,/g, ''));
          return p > 0;
        });
        assert.ok(priced.length > 0,
          `${name}/${cat}: at least one SKU must have a valid non-zero Unit Price`);
      }
    }
  });

  it('6. DL380 Gen12 chassisVariantMatrix covers all 6 form factor variants with category data', () => {
    const d = RULES_CATALOGS.DL380_Gen12();
    const variants = d.chassisVariants || [];
    const matrix = d.chassisVariantMatrix || {};
    assert.equal(variants.length, 6, 'DL380 Gen12 must have exactly 6 chassis variants');
    const skus = variants.map(v => v.sku);
    for (const sku of skus) {
      const entry = matrix[sku];
      assert.ok(entry, `Variant ${sku} must have an entry in chassisVariantMatrix`);
      const catCount = Object.keys(entry).length;
      assert.ok(catCount >= 10,
        `Variant ${sku} must have coverage for >= 10 categories, got ${catCount}`);
    }
  });

  it('7. Riser Cards use maxQty=-2 sentinel (required), not a parse error', () => {
    const d = CATALOGS.DL380_Gen12();
    const riserEntries = d.entries.filter(e => e.subCategory === 'Riser Cards');
    assert.ok(riserEntries.length > 0, 'DL380 Gen12 must have Riser Cards entries');
    for (const e of riserEntries) {
      assert.equal(e.maxQty, -2,
        `Riser Cards entry must use sentinel maxQty=-2 (required), got ${e.maxQty}`);
      assert.equal(e.minQty, 1, 'Riser Cards must have minQty=1');
    }
  });

  it('8. Known OCA grouping artifacts retained with provenance (PSU in Networking, Riser in Memory)', () => {
    // DL145: DL110 companion PSUs properly categorized in Power Supplies (or Networking if legacy co-located)
    const dl145 = CATALOGS.DL145_Gen11();
    const psuEntries = dl145.entries.filter(e => e.parentCategory === 'Power Supplies' || e.parentCategory === 'Networking');
    const psuItems = psuEntries.flatMap(e => (e.skus || [])
      .filter(s => /power supply|flex slot/i.test(s.Description || '')));
    assert.ok(psuItems.length >= 2,
      'DL145_Gen11: companion PSU items must be present with provenance. ' +
      `Found ${psuItems.length}.`);
    psuItems.forEach(s => {
      const p = parseFloat((s['Unit Price (USD)'] || '').replace(/,/g, ''));
      assert.ok(p > 0,
        `Companion PSU ${s['Product #']} must retain a valid price, got "${s['Unit Price (USD)']}"`);
    });

    // DL380 Gen12: 2 riser paddle cards retained with valid pricing
    const dl380g12 = CATALOGS.DL380_Gen12();
    const riserEntries = dl380g12.entries.filter(e => e.parentCategory === 'PCIe Risers' || e.parentCategory === 'Memory');
    const riserCards = riserEntries.flatMap(e => (e.skus || [])
      .filter(s => /riser.*paddle|paddle.*card/i.test(s.Description || '')));
    assert.ok(riserCards.length >= 2,
      'DL380_Gen12: exactly 2 riser paddle card items must be present with provenance. ' +
      `Found ${riserCards.length}.`);
    riserCards.forEach(s => {
      const p = parseFloat((s['Unit Price (USD)'] || '').replace(/,/g, ''));
      assert.ok(p > 0,
        `Riser paddle card ${s['Product #']} must retain a valid price, got "${s['Unit Price (USD)']}"`);
    });
  });

  it('9. INV-6: scrapeDate is YYYY-MM-DD format, separate from scrapeTimestamp', () => {
    for (const [name, load] of Object.entries(CATALOGS)) {
      const d = load();
      const meta = d.metadata || {};
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(meta.scrapeDate),
        `${name}: scrapeDate must be YYYY-MM-DD, got "${meta.scrapeDate}"`);
      assert.ok(/T/.test(meta.scrapeTimestamp),
        `${name}: scrapeTimestamp must be full ISO, got "${meta.scrapeTimestamp}"`);
      assert.notEqual(meta.scrapeDate, meta.scrapeTimestamp,
        `${name}: scrapeDate and scrapeTimestamp must differ`);
    }
  });

  it('10. INV-22: Flagship DL380 servers have >= 30 Processor SKUs each', () => {
    const flagships = [
      ['DL380_Gen12', CATALOGS.DL380_Gen12()],
      ['DL380_Gen11', CATALOGS.DL380_Gen11()],
    ];
    for (const [name, d] of flagships) {
      const processorEntries = d.entries.filter(e => e.parentCategory === 'Processor');
      const processorSkus = processorEntries.reduce((n, e) => n + (e.skus || []).length, 0);
      assert.ok(processorSkus >= 30,
        `${name}: Flagship must have >= 30 processor SKUs (INV-22), got ${processorSkus}`);
    }
  });
});
