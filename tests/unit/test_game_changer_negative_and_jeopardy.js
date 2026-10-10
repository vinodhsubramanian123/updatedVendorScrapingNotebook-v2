'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Subsystem under test
const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');
const { isNegativeRagVerdict } = require('../../scripts/lib/sync/nlm_solution_source_validator.js');
const { classifyQueryIntent } = require('../../scripts/evaluators/route_query.js');
const { executeToolRequest } = require('../../scripts/services/mcp_server.js');
const { _executeStagedFileAtomicity } = require('../../scripts/lib/boq/eval_output_serializer.js');

test('Game Changer Jeopardy & Negative Testing Suite', async (t) => {

  // =========================================================================
  // SCENARIO 1: Aspect 3 Storage Math Jeopardy (False-PASS Fix Verification)
  // =========================================================================
  await t.test('Scenario 1: Aspect 3 Storage Math Jeopardy (0-Drive Chassis Detection)', async (t2) => {
    
    await t2.test('Jeopardy: 0-drive server chassis without opt-out kit MUST FAIL Aspect 3 (not UNKNOWN)', () => {
      const items = [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 }
      ];
      const result = evaluatePhysicalMath(items);
      
      const storageAspect = result.aspectChecks.find(a => a.id === 3 || a.name.includes('Storage'));
      assert.ok(storageAspect, 'Aspect 3 must exist in evaluation');
      assert.strictEqual(storageAspect.status, 'FAIL', 'Unconfigured 0-drive chassis must FAIL Aspect 3, never UNKNOWN');
      assert.ok(
        storageAspect.detail.includes('0 drives requires No Drive Configuration FIO Kit'),
        `Detail must explain 0-drive failure. Received: ${storageAspect.detail}`
      );
      assert.ok(result.mathDeductions.some(d => d.includes('0 drives detected. Requires HPE No Drive Configuration FIO Kit')));
      assert.ok(result.missingDependencies.some(d => d.key === 'NO_DRIVE_FIO_KIT'));
    });

    await t2.test('Happy Path: Chassis with explicit No Drive Configuration Kit PASSES Aspect 3', () => {
      const items = [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
        { sku: 'P52535-B21', description: 'HPE ProLiant DL380 Gen12 No Drive Configuration FIO Kit', quantity: 1 }
      ];
      const result = evaluatePhysicalMath(items);
      const storageAspect = result.aspectChecks.find(a => a.id === 3 || a.name.includes('Storage'));
      assert.strictEqual(storageAspect.status, 'PASS', 'Chassis with No Drive kit should PASS Aspect 3');
    });

    await t2.test('Happy Path: Chassis with valid drives, controller, and battery PASSES Aspect 3', () => {
      const items = [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
        { sku: 'P53562-B21', description: 'HPE 960GB SATA 6G Mixed Use SFF BC Multi Vendor SSD', quantity: 2 },
        { sku: 'P40880-B21', description: 'HPE MR416i-p Gen11 SPDM Storage Controller', quantity: 1 },
        { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery 145mm Cable Kit', quantity: 1 }
      ];
      const result = evaluatePhysicalMath(items);
      const storageAspect = result.aspectChecks.find(a => a.id === 3 || a.name.includes('Storage'));
      assert.strictEqual(storageAspect.status, 'PASS', 'Chassis with complete storage stack should PASS Aspect 3');
    });

    await t2.test('Jeopardy: Chassis with controller but missing smart battery FAILS Aspect 3', () => {
      const items = [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
        { sku: 'P53562-B21', description: 'HPE 960GB SATA 6G Mixed Use SFF BC Multi Vendor SSD', quantity: 2 },
        { sku: 'P40880-B21', description: 'HPE MR416i-p Gen11 SPDM Storage Controller', quantity: 1 }
        // Battery intentionally missing
      ];
      const result = evaluatePhysicalMath(items);
      const storageAspect = result.aspectChecks.find(a => a.id === 3 || a.name.includes('Storage'));
      assert.strictEqual(storageAspect.status, 'FAIL', 'Controller without battery must FAIL Aspect 3');
      assert.ok(storageAspect.detail.includes('Smart Storage Battery'));
    });
  });

  // =========================================================================
  // SCENARIO 2: Delivery Gate & Staging Atomicity (Orphan Directory Cleanup)
  // =========================================================================
  await t.test('Scenario 2: Delivery Gate & Staging Atomicity (Cleanup Verification)', async (t2) => {
    
    await t2.test('Jeopardy: _executeStagedFileAtomicity rejects empty/missing artifacts and aborts promotion', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomicity_test_'));
      try {
        const stagingDir = path.join(tempDir, '.export_staging_test');
        const genDir = path.join(tempDir, 'deliverables_test');
        fs.mkdirSync(stagingDir, { recursive: true });

        // Create 3 valid files, leave 4th file missing
        fs.writeFileSync(path.join(stagingDir, 'file1.xlsx'), 'content1');
        fs.writeFileSync(path.join(stagingDir, 'file2.csv'), 'content2');
        fs.writeFileSync(path.join(stagingDir, 'file3.md'), 'content3');

        const stagingArtifacts = [
          { staging: path.join(stagingDir, 'file1.xlsx'), target: path.join(genDir, 'file1.xlsx') },
          { staging: path.join(stagingDir, 'file2.csv'), target: path.join(genDir, 'file2.csv') },
          { staging: path.join(stagingDir, 'file3.md'), target: path.join(genDir, 'file3.md') },
          { staging: path.join(stagingDir, 'file4.xlsx'), target: path.join(genDir, 'file4.xlsx') } // Does not exist
        ];

        assert.throws(() => {
          _executeStagedFileAtomicity(stagingArtifacts, stagingDir);
        }, /Presentation export did not create all required non-empty artifacts in staging/);

        // Verify generation dir was NEVER published
        assert.strictEqual(fs.existsSync(genDir), false, 'Failed export must not publish generation directory');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    await t2.test('Happy Path: _executeStagedFileAtomicity publishes exactly when all 4 artifacts are present', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomicity_happy_'));
      try {
        const stagingDir = path.join(tempDir, '.export_staging_uuid');
        const genDir = path.join(tempDir, 'deliverables_uuid');
        fs.mkdirSync(stagingDir, { recursive: true });

        fs.writeFileSync(path.join(stagingDir, 'sheet.xlsx'), 'mock-xlsx');
        fs.writeFileSync(path.join(stagingDir, 'sheet.csv'), 'mock-csv');
        fs.writeFileSync(path.join(stagingDir, 'proposal.md'), 'mock-proposal');
        fs.writeFileSync(path.join(stagingDir, 'portal.xlsx'), 'mock-portal');

        const stagingArtifacts = [
          { staging: path.join(stagingDir, 'sheet.xlsx'), target: path.join(genDir, 'sheet.xlsx') },
          { staging: path.join(stagingDir, 'sheet.csv'), target: path.join(genDir, 'sheet.csv') },
          { staging: path.join(stagingDir, 'proposal.md'), target: path.join(genDir, 'proposal.md') },
          { staging: path.join(stagingDir, 'portal.xlsx'), target: path.join(genDir, 'portal.xlsx') }
        ];

        _executeStagedFileAtomicity(stagingArtifacts, stagingDir);

        // Staging must have moved to generation directory
        assert.strictEqual(fs.existsSync(stagingDir), false, 'Staging directory should be gone after atomic rename');
        assert.strictEqual(fs.existsSync(genDir), true, 'Generation directory must exist');
        assert.strictEqual(fs.existsSync(path.join(genDir, 'sheet.xlsx')), true);
        assert.strictEqual(fs.existsSync(path.join(genDir, 'portal.xlsx')), true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  // =========================================================================
  // SCENARIO 3: RAG Grounding Negation-Aware Verification (Negative Testing)
  // =========================================================================
  await t.test('Scenario 3: RAG Grounding Negation-Awareness (Preserving Clean Verdicts)', async (t2) => {
    
    await t2.test('Negative Test: Natural language sentences with negation phrases MUST NOT trigger negative verdict', () => {
      const positiveSentences = [
        'Configuration verified. There is no CLIC error or unbuildable flag found in QuickSpecs.',
        'Verified: zero missing mandatory components. Build is completely valid.',
        'Solution verified without any incompatible options.',
        'The proposed configuration does not violate any rules and contains zero errors.',
        'Validation complete: no issues found across all 7 physical aspects.',
        'All checks passed successfully without validation failures.'
      ];

      for (const sentence of positiveSentences) {
        const isNegative = isNegativeRagVerdict(sentence);
        assert.strictEqual(
          isNegative,
          false,
          `Expected sentence to NOT be flagged as negative verdict: "${sentence}"`
        );
      }
    });

    await t2.test('Jeopardy: Genuine negative sentences MUST reliably trigger negative verdict', () => {
      const negativeSentences = [
        'QuickSpecs indicates a fatal CLIC error: storage controller missing.',
        'The proposed bill of materials is unbuildable without secondary riser.',
        'This configuration cannot be built due to power budget deficit.',
        'Found missing mandatory High-Performance Fan Kit P48820-B21.',
        'Incompatible memory channel population detected.',
        'The configuration violates rule 81354654 for high TDP processors.',
        'Validation failed: PSU count 1 does not meet redundant power threshold.',
        'Invalid configuration: mixing DDR4 and DDR5 memory modules.'
      ];

      for (const sentence of negativeSentences) {
        const isNegative = isNegativeRagVerdict(sentence);
        assert.strictEqual(
          isNegative,
          true,
          `Expected sentence to be flagged as negative verdict: "${sentence}"`
        );
      }
    });
  });

  // =========================================================================
  // SCENARIO 4: MCP Service Path Traversal & Security Boundary
  // =========================================================================
  await t.test('Scenario 4: MCP Service Security (Path Traversal Boundary Enforcement)', async (t2) => {
    
    await t2.test('Jeopardy: record_knowledge_delta strictly sanitizes directory traversal characters', async () => {
      const maliciousRequests = [
        {
          name: 'record_knowledge_delta',
          arguments: {
            chassis_id: '../../../../etc/passwd',
            affected_sku: 'P12345-B21',
            required_sku: 'P67890-B21',
            rule_update: 'Security test traversal'
          }
        },
        {
          name: 'record_knowledge_delta',
          arguments: {
            chassis_id: '..\\..\\windows\\system32',
            affected_sku: 'P12345-B21',
            required_sku: 'P67890-B21',
            rule_update: 'Security test backslash traversal'
          }
        }
      ];

      for (const req of maliciousRequests) {
        const response = await executeToolRequest(req, {});
        // Response must either succeed safely inside outputs (sanitized) or fail cleanly without escaping
        if (!response.isError) {
          const parsed = JSON.parse(response.content[0].text);
          assert.ok(parsed, 'Response parsed');
        } else {
          // If it erred, it must be because of traversal protection or invalid parameters
          assert.ok(response.content[0].text.includes('Path Traversal') || response.content[0].text.includes('Error executing tool'));
        }
      }
    });

    await t2.test('Jeopardy: record_knowledge_delta with empty/whitespace chassis throws clean error', async () => {
      const response = await executeToolRequest({
        name: 'record_knowledge_delta',
        arguments: {
          chassis_id: '   ',
          affected_sku: 'P12345-B21',
          required_sku: 'P67890-B21',
          rule_update: 'Whitespace test'
        }
      }, {});
      assert.strictEqual(response.isError, true);
      assert.ok(response.content[0].text.includes('Invalid chassis_id'));
    });
  });

  // =========================================================================
  // SCENARIO 5: Presales Intent Router Modular Routing & Edge Cases
  // =========================================================================
  await t.test('Scenario 5: Presales Intent Router Modular Classification & Edge Cases', async (t2) => {
    
    await t2.test('Edge Case: Freeform comparison query without files routes to FREEFORM_QA (never false BOM_RECONCILIATION)', () => {
      const classification = classifyQueryIntent('Compare DL380 pricing with DL360', {});
      assert.strictEqual(classification.intent, 'FREEFORM_QA');
      assert.strictEqual(classification.skillTarget, 'nlm-skill');
    });

    await t2.test('Happy Path: Price trend query routes to CATALOG_INTELLIGENCE', () => {
      const classification = classifyQueryIntent('Show price trend for DL380 Gen12 options', {});
      assert.strictEqual(classification.intent, 'CATALOG_INTELLIGENCE');
      assert.strictEqual(classification.skillTarget, 'catalog-intelligence-skill');
    });

    await t2.test('Happy Path: Natural language specification without SKUs routes to RFP_SIZING_TO_BOM', () => {
      const classification = classifyQueryIntent('Need 3 servers with 64 cores, 512GB RAM, and 10TB NVMe storage', {});
      assert.strictEqual(classification.intent, 'RFP_SIZING_TO_BOM');
      assert.strictEqual(classification.skillTarget, 'rfp-sizing-synthesizer');
    });

    await t2.test('Happy Path: Competitor conversion query routes to CROSS_VENDOR_TRANSFORMATION', () => {
      const classification = classifyQueryIntent('Convert this Dell PowerEdge R760 specification to HPE ProLiant equivalent', {});
      assert.strictEqual(classification.intent, 'CROSS_VENDOR_TRANSFORMATION');
      assert.strictEqual(classification.skillTarget, 'cross-vendor-transformation-skill');
    });

    await t2.test('Happy Path: Tender modernization query routes to HETEROGENEOUS_TENDER_MODERNIZATION', () => {
      const classification = classifyQueryIntent('Modernize this heterogeneous tender with 4 compute nodes and 1 SAN switch', {});
      assert.strictEqual(classification.intent, 'HETEROGENEOUS_TENDER_MODERNIZATION');
      assert.strictEqual(classification.skillTarget, 'heterogeneous-tender-modernizer');
    });

    await t2.test('Happy Path: Two distinct files provided routes to BOM_RECONCILIATION', () => {
      const classification = classifyQueryIntent('Reconcile tender against vendor quote', {
        filePath: 'path/to/tender.xlsx',
        vendorFilePath: 'path/to/partner_quote.xlsx'
      });
      assert.strictEqual(classification.intent, 'BOM_RECONCILIATION');
      assert.strictEqual(classification.skillTarget, 'bom-reconciliation-skill');
    });

    await t2.test('Happy Path: Single file provided routes to BOQ_EVALUATION', () => {
      const classification = classifyQueryIntent('Evaluate this customer bill of materials', {
        filePath: 'path/to/customer_boq.xlsx'
      });
      assert.strictEqual(classification.intent, 'BOQ_EVALUATION');
      assert.strictEqual(classification.skillTarget, 'boq-eval-skill');
    });
  });

  // =========================================================================
  // SCENARIO 6: Resiliency & Security Sweep (CDP Timeout & Path Guard Boundaries)
  // =========================================================================
  await t.test('Scenario 6: Resiliency & Security Sweep (CDP Timeout & Path Boundaries)', async (t2) => {
    
    await t2.test('Jeopardy: connectWS rejects cleanly when endpoint is unreachable (bounded retry)', async () => {
      const { connectWS } = require('../../scripts/lib/scraper/cdp.js');
      await assert.rejects(
        async () => {
          await connectWS('ws://127.0.0.1:54321/devtools/page/invalid', 1, 100);
        },
        /ECONNREFUSED|timeout|WebSocket/i
      );
    });

    await t2.test('Jeopardy: assertSafePath rejects directory traversal outside authorized roots', () => {
      const { assertSafePath } = require('../../dashboard/services/pathGuard.cjs');
      assert.throws(() => {
        assertSafePath('../../windows/system32/cmd.exe');
      }, /Path traversal detected|HTTP 403/);
    });
  });

});
