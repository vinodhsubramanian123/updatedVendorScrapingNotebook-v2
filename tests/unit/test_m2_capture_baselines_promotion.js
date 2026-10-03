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
      assert.strictEqual(profiles.DL380_Gen12.expectedWorkbookSheets, 26);
      assert.strictEqual(profiles.DL380a_Gen12.expectedWorkbookSheets, 27);
    });

    it('certifies live DL380_Gen12 against its coverage profile', () => {
      const result = isCatalogCertified('DL380_Gen12');
      assert.strictEqual(result.certified, true, `Certified should be true, but got: ${result.reason}`);
      assert.ok(result.skuCount >= 500, `SKU count must be >= 500, got ${result.skuCount}`);
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
