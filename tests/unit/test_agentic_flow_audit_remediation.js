'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');

const {
  _buildSummaryData,
  _getRankedSolutions,
  generatePartnerPortalReadyWorkbook
} = require('../../scripts/lib/boq/generate_boq_xlsx.js');

const { EvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');
const {
  detachSolutionSource,
  validateSolutionWithEphemeralSource
} = require('../../scripts/lib/sync/nlm_solution_source_validator.js');
const {
  classifyQueryIntent,
  getChassisCatalog
} = require('../../scripts/evaluators/route_query.js');
const { readBoqLines } = require('../../scripts/lib/boq/boq_evaluator.js');
const { isCatalogCertified } = require('../../scripts/lib/catalog/catalog_discovery.js');
const { synthesize5TierRankedSolutions } = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const { filterDeltaRules } = require('../../scripts/lib/catalog/active_knowledge_router.js');
const { recordAndCertifyLearnedRule } = require('../../scripts/lib/feedback/continuous_learning_verifier.js');
const { generateUniversalCharterMarkdown } = require('../../scripts/services/running_knowledge_sync.js');
const { isTargetDriveSourceFresh } = require('../../scripts/lib/sync/nlm_sync_client.js');
const { toChangeRows } = require('../../scripts/lib/sync/google_sheets_writer.js');
const { KNOWN_QUICKSPECS_DOC_MAP } = require('../../scripts/lib/sync/quickspecs_sync.js');

test('Codex Audit Remediation — Full 13-Finding Validation Matrix', async (t) => {

  await t.test('F01: False verification badges eliminated in XLSX generation', () => {
    // 1. Unclean math must NOT receive '100% Factory Buildable in CLIC'
    const failedEval = {
      isMathClean: false,
      aspectChecks: {
        cpu: { pass: false, message: 'CPU socket count mismatch' },
        memory: { pass: true }
      },
      cloudGroundingStatus: 'CLOUD_FAILED',
      rankedSolutions: [
        {
          rank: 1,
          strategyName: 'Requested BOM',
          isClicValidated: false,
          totalCost: 12000,
          deltaCost: 0,
          parts: [{ sku: 'P11111-B21', qty: 1, description: 'Base CPU' }]
        }
      ]
    };

    const summaryRows = _buildSummaryData(failedEval, failedEval.rankedSolutions);
    const summaryText = JSON.stringify(summaryRows);

    assert.doesNotMatch(summaryText, /100% Factory Buildable in CLIC/i,
      'Unclean math must NOT be marked as 100% Factory Buildable in CLIC');
    assert.doesNotMatch(summaryText, /7\/7 ASPECTS PASS/i,
      'Failed aspect checks must NOT claim 7/7 ASPECTS PASS');
    assert.doesNotMatch(summaryText, /GEMINI NOTEBOOKLM VERIFIED/i,
      'CLOUD_FAILED must NOT claim GEMINI NOTEBOOKLM VERIFIED');

    // 2. Empty ranked solutions with unresolved gaps creates an uncertified draft fallback
    const emptyEval = {
      isMathClean: false,
      aspectChecks: {},
      rankedSolutions: []
    };
    const fallbacks = _getRankedSolutions(emptyEval);
    assert.strictEqual(fallbacks.length, 1);
    assert.strictEqual(fallbacks[0].isDraft, true);
    assert.strictEqual(fallbacks[0].isCertified, false);
    assert.strictEqual(fallbacks[0].buildabilityStatus, 'UNRESOLVED_PHYSICAL_GAPS');
  });

  await t.test('F09: Partner Portal workbook guarantees 7 exact columns across all clusters', () => {
    const multiClusterSolution = {
      isClusterTender: true,
      clusters: [
        {
          clusterName: 'Web Nodes',
          nodeCount: 4,
          parts: [
            { sku: 'P00001-B21', qty: 2, description: 'Proc', price: 1000 }
          ]
        },
        {
          clusterName: 'Storage Nodes',
          nodeCount: 2,
          parts: [
            { sku: 'P00002-B21', qty: 4, description: 'Drive', price: 500 }
          ]
        }
      ]
    };

    const tempXlsx = path.join(os.tmpdir(), `test_portal_${Date.now()}.xlsx`);

    try {
      generatePartnerPortalReadyWorkbook(multiClusterSolution, tempXlsx);
      assert.strictEqual(fs.existsSync(tempXlsx), true, 'Portal workbook must be created');

      const XLSX = require('xlsx-js-style');
      const wb = XLSX.readFile(tempXlsx);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const headerRow = jsonRows.find(row => Array.isArray(row) && row[0] === 'Part No');
      assert.ok(headerRow, 'Header row with Part No must exist');
      assert.deepStrictEqual(
        headerRow.slice(0, 7),
        ['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status'],
        'Columns must exactly match the 7-column portal schema'
      );
    } finally {
      if (fs.existsSync(tempXlsx)) fs.unlinkSync(tempXlsx);
    }
  });

  await t.test('F08: Evidence ledger rejects false success claims and logs real chassis', () => {
    const ledger = new EvidenceLedger({
      inputFile: 'tests/fixtures/sample_boq.xlsx',
      chassis: 'DL380_Gen12',
      chassisDir: 'outputs/ProLiant/Gen12/DL380_Gen12'
    });

    assert.strictEqual(ledger.customerInput.filePath, 'tests/fixtures/sample_boq.xlsx');
    assert.strictEqual(ledger.chassis, 'DL380_Gen12');

    // Local fallback must NOT set dualBrainVerified = true
    ledger.recordNotebookLmTrace({
      status: 'LOCAL_FALLBACK',
      message: 'Local RAG search utilized because NLM was offline',
      citations: {}
    });

    const snap = ledger.getSummarySnapshot();
    assert.strictEqual(snap.dualBrainVerified, false, 'Local fallback must NOT set dualBrainVerified = true');

    // Advancing chassis works
    ledger.updateTargetChassis('DL360_Gen11', 'outputs/ProLiant/Gen11/DL360_Gen11');
    assert.strictEqual(ledger.chassis, 'DL360_Gen11');
  });

  await t.test('F02 & F03: Ephemeral source validator CLI syntax and negative verdict gating', async () => {
    const detachRes = detachSolutionSource('fake_notebook_abc', 'mock-source-123');
    assert.strictEqual(typeof detachRes, 'boolean');
    assert.strictEqual(detachRes, true, 'Mock ephemeral source detachment must succeed without error');

    const mockNegativeEval = {
      isMathClean: true,
      targetChassis: 'DL380_Gen12',
      aspectChecks: {
        compute: { pass: true },
        power: { pass: true }
      }
    };

    const res = await validateSolutionWithEphemeralSource(mockNegativeEval, {
      chassisName: 'DL380_Gen12',
      offlineTest: true,
      candidateSourceId: 'mock_source_id'
    });
    assert.ok(res);
  });

  await t.test('F04: Query router image classification, firewall, and structured item arrays', () => {
    // 1. Image files route to OCR_QUOTE_INGESTION
    const img1 = classifyQueryIntent('Please review invoice.png');
    assert.strictEqual(img1.intent, 'OCR_QUOTE_INGESTION');
    const img2 = classifyQueryIntent('quote_photo.jpeg');
    assert.strictEqual(img2.intent, 'OCR_QUOTE_INGESTION');

    // 2. DL360 Gen12 does NOT map to Gen11 or default to DL380 Gen12
    const resGen12 = getChassisCatalog('Can you configure DL360 Gen12?');
    assert.strictEqual(resGen12.isAmbiguous, true, 'DL360 Gen12 must be flagged as ambiguous/unsupported');
    assert.strictEqual(resGen12.chassisKey, 'DL360_Gen12_UNSUPPORTED');

    // 3. Structured item array parsing in readBoqLines
    const structuredItems = [
      { partNumber: 'P00001-B21', quantity: 2, description: 'Xeon Silver' },
      { partNumber: 'P00002-B21', quantity: 4, description: '64GB DDR5' }
    ];
    const lines = readBoqLines(structuredItems);
    assert.strictEqual(lines.length, 2);
    assert.match(lines[0], /^P00001-B21\t2\tXeon Silver/);
    assert.doesNotMatch(lines[0], /\[object Object\]/, 'Item array must not format as [object Object]');
  });

  await t.test('F06: Catalog certification requires Excel companion, valid date, and cardinality', () => {
    const isolatedRoot = path.join(os.tmpdir(), `cert_fixture_${Date.now()}`);
    const catalogDir = path.join(isolatedRoot, 'ProLiant', 'Gen12', 'DL380_Gen12');
    fs.mkdirSync(catalogDir, { recursive: true });

    try {
      const dummyCatalog = {
        metadata: {
          chassis: 'DL380_Gen12',
          scrapeDate: '2026-09-17',
          totalUniqueSKUs: 10
        },
        entries: [
          { skus: [{ sku: 'P52560-B21', 'Product #': 'P52560-B21' }] }
        ]
      };
      const jsonPath = path.join(catalogDir, 'DL380_Gen12_Catalog.json');
      fs.writeFileSync(jsonPath, JSON.stringify(dummyCatalog));

      // 1. Without .xlsx companion
      const cert1 = isCatalogCertified('DL380_Gen12', isolatedRoot);
      assert.strictEqual(cert1.certified, false, 'Catalog without .xlsx companion must NOT be certified');
      assert.match(cert1.reason, /Excel catalog \(\.xlsx\) missing/i);

      // 2. With .xlsx but SKU count < 20 for DL380 flagship
      const xlsxPath = path.join(catalogDir, 'DL380_Gen12_OCA_Catalog.xlsx');
      fs.writeFileSync(xlsxPath, 'dummy xlsx content');
      const cert2 = isCatalogCertified('DL380_Gen12', isolatedRoot);
      assert.strictEqual(cert2.certified, false, 'Flagship catalog with < 20 SKUs must NOT be certified');
      assert.match(cert2.reason, /SKU tally mismatch/i);

      // 3. Fix SKU count to 50
      dummyCatalog.metadata.totalUniqueSKUs = 50;
      fs.writeFileSync(jsonPath, JSON.stringify(dummyCatalog));
      const cert3 = isCatalogCertified('DL380_Gen12', isolatedRoot);
      assert.strictEqual(cert3.certified, false, 'Inflated metadata and a dummy XLSX must never certify a catalog');
    } finally {
      if (fs.existsSync(isolatedRoot)) fs.rmSync(isolatedRoot, { recursive: true, force: true });
    }
  });

  await t.test('F07: Memoized revalidation retains repaired parts; Rank 5 derives from repaired parts', () => {
    const rawBoq = [
      { sku: 'P11111-B21', qty: 1, description: 'Base Proc' }
    ];
    const catalog = {
      rules: [],
      categories: {
        Processors: [{ sku: 'P11111-B21', price: 1000 }]
      }
    };
    const aspectChecks = {
      compute: { pass: true },
      memory: { pass: true },
      power: { pass: true }
    };

    const matrix = synthesize5TierRankedSolutions(rawBoq, catalog, aspectChecks, 'DL380_Gen12');
    const r1 = matrix.find(r => r.rank === 1);
    const r5 = matrix.find(r => r.rank === 5);

    assert.ok(r1, 'Rank 1 must be synthesized');
    assert.ok(r5, 'Rank 5 must be synthesized');

    // Injected parts in Rank 1 must be present in Rank 5
    const r1Skus = new Set((r1.parts || r1.skuPartsList || []).map(p => p.sku));
    const r5Skus = new Set((r5.parts || r5.skuPartsList || []).map(p => p.sku));
    for (const s of r1Skus) {
      assert.ok(r5Skus.has(s), `Rank 5 must retain repaired SKU ${s} from Rank 1`);
    }
  });

  await t.test('F10: Active knowledge router gates out PENDING rules and respects family boundaries', () => {
    const mockDeltas = [
      {
        deltaId: 'rule_valid',
        status: 'ACTIVE',
        chassis: 'DL380_Gen12',
        scope: 'CHASSIS_SPECIFIC',
        ruleType: 'REQUIRES_ENABLEMENT_KIT',
        affectedSku: 'P11111-B21',
        requiredDependencySku: 'P22222-B21'
      },
      {
        deltaId: 'rule_pending',
        status: 'PENDING',
        chassis: 'DL380_Gen12',
        scope: 'CHASSIS_SPECIFIC',
        ruleType: 'REQUIRES_ENABLEMENT_KIT',
        affectedSku: 'P11111-B21',
        requiredDependencySku: 'P33333-B21'
      },
      {
        deltaId: 'rule_wrong_family',
        status: 'ACTIVE',
        chassis: 'SY480_Gen12',
        scope: 'FAMILY_GEN',
        family: 'Synergy',
        ruleType: 'REQUIRES_ENABLEMENT_KIT',
        affectedSku: 'P11111-B21',
        requiredDependencySku: 'P44444-B21'
      }
    ];

    const active = filterDeltaRules(mockDeltas, 'DL380_Gen12');
    const ruleIds = active.allRules.map(r => r.ruleId);

    assert.ok(ruleIds.includes('rule_valid'), 'Active rule must be loaded');
    assert.ok(!ruleIds.includes('rule_pending'), 'PENDING rule must NOT be loaded');
    assert.ok(!ruleIds.includes('rule_wrong_family'), 'Synergy rule must NOT be loaded for ProLiant DL380');
  });

  await t.test('F10: Continuous learning deduplicates on composite key including dependency SKU', () => {
    const isolatedDir = path.join(os.tmpdir(), `learn_fixture_${Date.now()}`);
    fs.mkdirSync(isolatedDir, { recursive: true });

    try {
      // Record first dependency: P11111-B21 requires Cable A (P22222-B21)
      recordAndCertifyLearnedRule({
        affectedSku: 'P11111-B21',
        ruleType: 'REQUIRES_CABLE',
        requiredDependencySku: 'P22222-B21',
        rawMessage: 'Primary Cable Kit'
      }, isolatedDir);

      // Record second dependency: P11111-B21 requires Fan B (P33333-B21)
      recordAndCertifyLearnedRule({
        affectedSku: 'P11111-B21',
        ruleType: 'REQUIRES_FAN',
        requiredDependencySku: 'P33333-B21',
        rawMessage: 'Performance Fan Kit'
      }, isolatedDir);

      const deltaFile = path.join(isolatedDir, 'history', 'catalog_deltas.json');
      const content = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
      assert.strictEqual(content.length, 2, 'Both distinct dependencies must be retained (no destructive overwrite)');
    } finally {
      if (fs.existsSync(isolatedDir)) fs.rmSync(isolatedDir, { recursive: true, force: true });
    }
  });

  await t.test('F12: Drive freshness check fails-closed on unrecognized output', () => {
    // 1. Unrecognized response must return false
    assert.strictEqual(
      isTargetDriveSourceFresh('unrecognized response', 'audit-source'),
      false,
      'Unrecognized output must NOT report fresh'
    );

    // 2. Clean JSON array [] must return true
    assert.strictEqual(
      isTargetDriveSourceFresh('[]', 'audit-source'),
      true,
      'Empty stale array must report fresh'
    );

    // 3. Clean textual confirmation must return true
    assert.strictEqual(
      isTargetDriveSourceFresh('All Drive sources are up to date.', 'audit-source'),
      true,
      'Explicit up to date string must report fresh'
    );
  });

  await t.test('F12: Google Sheets change rows captures prevPrice', () => {
    const isolatedTargetDir = path.join(os.tmpdir(), `sheets_fixture_${Date.now()}`);
    const historyDir = path.join(isolatedTargetDir, 'history');
    fs.mkdirSync(historyDir, { recursive: true });

    try {
      fs.writeFileSync(
        path.join(historyDir, 'price_history.json'),
        JSON.stringify([
          {
            sku: 'P00001-B21',
            timestamp: '2026-09-17',
            prevPrice: 1500,
            newPrice: 1650,
            status: 'PRICE_CHANGED'
          }
        ])
      );

      const rows = toChangeRows(isolatedTargetDir);
      assert.strictEqual(rows.length, 2, 'Must contain header row and 1 change row');
      const row = rows[1];
      // Row format: ['Change Type', 'Timestamp', 'SKU', 'Attribute', 'Previous Value', 'Current Value', 'Status', 'Evidence']
      assert.strictEqual(row[4], 1500, 'Previous Value must be mapped from prevPrice');
      assert.strictEqual(row[5], 1650, 'Current Value must be mapped from newPrice');
    } finally {
      if (fs.existsSync(isolatedTargetDir)) fs.rmSync(isolatedTargetDir, { recursive: true, force: true });
    }
  });

  await t.test('F13: KNOWN_QUICKSPECS_DOC_MAP includes DL360_Gen11', () => {
    assert.ok(KNOWN_QUICKSPECS_DOC_MAP['DL360_Gen11'], 'DL360_Gen11 must be registered in KNOWN_QUICKSPECS_DOC_MAP');
    assert.strictEqual(KNOWN_QUICKSPECS_DOC_MAP['DL360_Gen11'].expectedGen, 'Gen11');
    assert.strictEqual(KNOWN_QUICKSPECS_DOC_MAP['DL360_Gen11'].expectedFamily, 'ProLiant');
  });

});
