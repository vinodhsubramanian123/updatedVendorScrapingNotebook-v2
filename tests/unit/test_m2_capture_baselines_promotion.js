'use strict';

/**
 * tests/unit/test_m2_capture_baselines_promotion.js
 *
 * Milestone M2: Verifies clean-room staging isolation, coverage profile enforcement,
 * and full SHA-256 SKU hash generation.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { isCatalogCertified } = require('../../scripts/lib/catalog/catalog_discovery.js');
const { computeSkuHash, computeFullSkuHash } = require('../../scripts/lib/catalog/checksum_diff.js');

describe('Milestone M2: Fresh Capture, Baselines & Safe Promotion', () => {

  // ── 1. Clean-Room Staging Verification ──
  describe('Clean-Room Staging Isolation', () => {
    it('verifies scrape_oca_solution.js no longer copies intermittent_scraps or stale catalogs', () => {
      const scraperFile = path.resolve(__dirname, '../../scripts/scrapers/scrape_oca_solution.js');
      const content = fs.readFileSync(scraperFile, 'utf8');

      // Check that lines copying intermittent_scraps or Catalog.json have been removed from seedStagingFromLiveWorkspace
      assert.strictEqual(
        content.includes("copyDirRecursive(existingScraps, path.join(outputDir, 'intermittent_scraps'))"),
        false,
        'Staging must NOT inherit stale intermittent_scraps TSVs'
      );
      assert.strictEqual(
        content.includes("fs.copyFileSync(existingCatalog, path.join(outputDir, `${meta.cleanName}_Catalog.json`))"),
        false,
        'Staging must NOT inherit previous Catalog.json before scrape'
      );
      assert.ok(content.includes('Clean-room staging active'), 'Clean-room log must be present');
    });
  });

  // ── 2. Coverage Profile Enforcement (F07) ──
  describe('Coverage Profile Verification in isCatalogCertified', () => {
    it('verifies coverage profiles config file exists and contains canonical schemas', () => {
      const profilesPath = path.resolve(__dirname, '../../scripts/config/catalog_coverage_profiles.json');
      assert.ok(fs.existsSync(profilesPath), 'catalog_coverage_profiles.json must exist');
      const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles;
      assert.ok(profiles.DL380_Gen12, 'DL380_Gen12 profile must exist');
      assert.ok(profiles.DL380a_Gen12, 'DL380a_Gen12 profile must exist');
      for (const id of ['DL380_Gen12', 'DL380a_Gen12', 'SY480_Gen12']) {
        assert.ok(profiles[id].requiredSheets.includes('Accessories & Infrastructure'));
        assert.ok(profiles[id].requiredSheets.includes('Support Services'));
      }
    });

    it('certifies the refreshed workbooks with consolidated views', () => {
      for (const id of ['DL380a_Gen12', 'SY480_Gen12']) {
        const result = isCatalogCertified(id);
        assert.strictEqual(result.certified, true, id + ': ' + result.reason);
      }
      const result = isCatalogCertified('DL380_Gen12');
      assert.strictEqual(result.certified, true, `Certified should be true, but got: ${result.reason}`);
      assert.ok(result.skuCount >= 500, `SKU count must be >= 500, got ${result.skuCount}`);
    });

    it('blocks missing or header-only required views despite surplus unrelated tabs', () => {
      const { validateCatalogCoverage } = require('../../scripts/lib/catalog/catalog_coverage.js');
      const { utils } = require('xlsx-js-style');
      const id = 'DL380_Gen12';
      const dir = path.resolve(__dirname, '../../outputs/ProLiant/Gen12', id);
      const catalog = JSON.parse(fs.readFileSync(path.join(dir, id + '_Catalog.json'), 'utf8'));
      const services = JSON.parse(fs.readFileSync(path.join(dir, id + '_Services.json'), 'utf8'));
      const { requiredSheets } = require('../../scripts/config/catalog_coverage_profiles.json').profiles[id];
      const filler = Array.from({ length: 30 }, (_, i) => 'Unrelated ' + i);
      const workbook = utils.book_new();
      const populated = utils.aoa_to_sheet([['Product #'], ['P73282-B21']]);
      for (const name of [...requiredSheets.filter(name => name !== 'Support Services'), ...filler]) {
        utils.book_append_sheet(workbook, populated, name);
      }
      const check = () => validateCatalogCoverage(id, catalog, services, workbook);
      assert.match(check().reason, /missing required workbook sheet: Support Services/);
      utils.book_append_sheet(workbook, utils.aoa_to_sheet([['Product #']]), 'Support Services');
      assert.match(check().reason, /empty required workbook sheet: Support Services/);
      workbook.Sheets['Support Services'] = populated;
      assert.strictEqual(check().valid, true);
    });
  });

  // ── 3. Full SHA-256 Hash Support (F08) ──
  describe('Full SHA-256 Checksum Diff Receipts', () => {
    it('computes 16-char prefix by default and 64-char full SHA-256 on request', () => {
      const sampleSku = {
        sku: 'P73282-B21',
        description: 'HPE DL380 Gen12 8SFF CTO Server',
        priceUsd: 1500,
        optionType: 'Chassis'
      };

      const defaultHash = computeSkuHash(sampleSku);
      assert.strictEqual(defaultHash.length, 16, 'Default SKU hash should be 16-character prefix');

      const fullHash = computeFullSkuHash(sampleSku);
      assert.strictEqual(fullHash.length, 64, 'Full SKU hash must be 64-character SHA-256 hex string');
      assert.ok(fullHash.startsWith(defaultHash), 'Full hash must begin with the 16-character prefix');
    });
  });
});
