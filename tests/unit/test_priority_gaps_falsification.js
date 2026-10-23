'use strict';
/**
 * tests/unit/test_priority_gaps_falsification.js
 *
 * Negative-Path Counterexamples & Falsification Suite for G01, G03, G04, G07, G08, G09
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const {
  validateBoqEvaluationCriteria
} = require('../../scripts/lib/boq/bom_verifier.js');
const {
  buildUniversalQuantityConservationLedger
} = require('../../scripts/lib/boq/quantity_conservation.js');
const {
  splitAndWriteClusterWorkbooks
} = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const {
  scoreAndSortCandidates
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const {
  loadActiveKnowledgeRules
} = require('../../scripts/lib/catalog/active_knowledge_router.js');
const {
  getRegisteredAspectsForDomain
} = require('../../scripts/lib/aspects/aspect_registry.js');
const {
  evictCachedRagResult,
  invalidateRagCache,
  getCachedRagResult,
  setCachedRagResult
} = require('../../scripts/lib/notebook/notebook_query_utils.js');

describe('Priority Gaps Falsification Suite (G01, G03, G04, G07, G08, G09)', () => {

  // ── G01 & G09: Quantity Conservation Falsification ──────────────────────────
  describe('G01 & G09: Quantity Conservation Integrity', () => {

    test('Non-array raw items evaluate to isFullyConserved: false (prevents G01 silent pass)', () => {
      const res = buildUniversalQuantityConservationLedger(null, []);
      assert.strictEqual(res.isFullyConserved, false);
      assert.strictEqual(res.error, 'INVALID_RAW_ITEMS_ARRAY');
    });

    test('Repeated source SKU rows aggregate without false duplicate-row surplus discrepancies', () => {
      const rawItems = [
        { sku: 'P52534-B21', quantity: 2, description: 'Row 1 CTO Base' },
        { sku: 'P52534-B21', quantity: 3, description: 'Row 5 CTO Base' }
      ];
      // Clusters allocate exactly 5 total (e.g. 5 nodes)
      const clusters = [
        { multiplier: 5, items: [{ sku: 'P52534-B21', quantity: 1, totalQuantity: 5 }] }
      ];

      const res = buildUniversalQuantityConservationLedger(rawItems, clusters);
      assert.strictEqual(res.isFullyConserved, true, 'Exact allocation across duplicate rows must be conserved');
      assert.strictEqual(res.totalDiscrepancies, 0);
      assert.strictEqual(res.exactConservedCount, 1);
      assert.strictEqual(res.ledger[0].status, 'CONSERVED_EXACT');
      assert.strictEqual(res.ledger[0].requestedQuantity, 5);
      assert.strictEqual(res.ledger[0].allocatedTotal, 5);
      assert.strictEqual(res.ledger[0].rowAllocations.length, 2);
    });

    test('Deficit allocation is accurately flagged as RESIDUAL_DEFICIT', () => {
      const rawItems = [{ sku: 'P52534-B21', quantity: 10 }];
      const clusters = [{ multiplier: 8, items: [{ sku: 'P52534-B21', quantity: 1, totalQuantity: 8 }] }];

      const res = buildUniversalQuantityConservationLedger(rawItems, clusters);
      assert.strictEqual(res.isFullyConserved, false);
      assert.strictEqual(res.deficitCount, 1);
      assert.strictEqual(res.ledger[0].status, 'RESIDUAL_DEFICIT');
      assert.strictEqual(res.ledger[0].delta, -2);
    });

    test('Injected enablement kits appear in ledger as MANDATORY_POLICY_ADDITION', () => {
      const rawItems = [{ sku: 'P52534-B21', quantity: 5 }];
      const clusters = [
        {
          multiplier: 5,
          items: [
            { sku: 'P52534-B21', quantity: 1, totalQuantity: 5 },
            { sku: 'P56073-B21', quantity: 1, totalQuantity: 5, policyMandated: true, description: 'Primary Riser Cable Kit' }
          ]
        }
      ];

      const res = buildUniversalQuantityConservationLedger(rawItems, clusters);
      const cableKit = res.ledger.find(l => l.canonicalSku === 'P56073-B21');
      assert.ok(cableKit, 'Injected enablement kit must be present in conservation ledger');
      assert.strictEqual(cableKit.status, 'MANDATORY_POLICY_ADDITION');
      assert.strictEqual(cableKit.policyMandated, true);
      assert.strictEqual(cableKit.requestedQuantity, 0);
      assert.strictEqual(cableKit.allocatedTotal, 5);
    });

    test('Unsolicited extra hardware is flagged as UNREQUESTED_ADDITION', () => {
      const rawItems = [{ sku: 'P52534-B21', quantity: 5 }];
      const clusters = [
        {
          multiplier: 5,
          items: [
            { sku: 'P52534-B21', quantity: 1, totalQuantity: 5 },
            { sku: 'P99999-B21', quantity: 1, totalQuantity: 5, policyMandated: false, description: 'Unsolicited GPU' }
          ]
        }
      ];

      const res = buildUniversalQuantityConservationLedger(rawItems, clusters);
      assert.strictEqual(res.isFullyConserved, false);
      assert.strictEqual(res.unrequestedAdditionsCount, 1);
      const extra = res.ledger.find(l => l.canonicalSku === 'P99999-B21');
      assert.strictEqual(extra.status, 'UNREQUESTED_ADDITION');
    });
  });

  // ── G04 & G08: Unmatched Input & Unresolved Requirements ───────────────────
  describe('G04 & G08: Intake Gate Masking & Unresolved Requirements (B16, B17)', () => {

    test('output.unmatchedSkus = [] does NOT mask non-empty context.unmatchedSkus (G04 fix)', () => {
      const output = {
        unmatchedSkus: [], // Empty output!
        items: [{ sku: 'P73282-B21', quantity: 1 }],
        aspectChecks: []
      };
      const context = {
        unmatchedSkus: [{ rawSku: 'MISSING_PART_123', reason: 'NO_CATALOG_MATCH' }]
      };

      const checks = validateBoqEvaluationCriteria(output, context);
      const b16 = checks.find(c => c.id === 'B16');
      assert.ok(b16);
      assert.strictEqual(b16.status, 'FAILED', 'Context unmatched SKUs must not be masked by empty output array');
      assert.ok(b16.detail.includes('MISSING_PART_123'));
    });

    test('unmatchedSkus array containing null/undefined entries formats safely without crashing', () => {
      const output = {
        unmatchedSkus: [null, undefined, { rawSku: 'VALID_RAW_SKU' }],
        items: [{ sku: 'P73282-B21', quantity: 1 }]
      };

      assert.doesNotThrow(() => {
        const checks = validateBoqEvaluationCriteria(output, {});
        const b16 = checks.find(c => c.id === 'B16');
        assert.strictEqual(b16.status, 'FAILED');
      });
    });

    test('Descriptive customer lines that failed SKU resolution trigger Gate B17 failure (G08)', () => {
      const output = {
        items: [{ sku: 'P73282-B21', quantity: 1 }],
        unresolvedRequirements: [
          'Customer demands redundant 1600W Titanium PSUs',
          '4x 32GB DDR5 RDIMM 5600'
        ]
      };

      const checks = validateBoqEvaluationCriteria(output, {});
      const b17 = checks.find(c => c.id === 'B17');
      assert.ok(b17, 'B17 check must exist in acceptance criteria');
      assert.strictEqual(b17.status, 'FAILED', 'Unresolved customer requirements must block acceptance');
      assert.strictEqual(b17.evidence.unresolvedCount, 2);
      assert.ok(b17.detail.includes('redundant 1600W Titanium PSUs'));
    });

    test('Gate B17 passes when unresolvedRequirements is empty', () => {
      const output = {
        items: [{ sku: 'P73282-B21', quantity: 1 }],
        unresolvedRequirements: []
      };

      const checks = validateBoqEvaluationCriteria(output, {});
      const b17 = checks.find(c => c.id === 'B17');
      assert.strictEqual(b17.status, 'PASSED');
    });
  });

  // ── G03: Exact Aspect Identity Verification ────────────────────────────────
  describe('G03: Exact Aspect Identity Profiles', () => {

    test('Unrelated check starting with STORAGE does not satisfy STORAGE_CONTROLLER_PAIR (G03 fix)', () => {
      const output = {
        solutionTopology: { domain: 'storage' },
        aspectChecks: [
          { id: 'STORAGE_BOGUS_CHECK', name: 'Storage Fake Checker', status: 'PASS' },
          { id: 'POWER_ENVIRONMENT', name: 'Power Environment', status: 'PASS' },
          { id: 'SUPPORT_SERVICES', name: 'Support Services', status: 'PASS' }
        ]
      };

      const checks = validateBoqEvaluationCriteria(output, {});
      const b1 = checks.find(c => c.id === 'B1');
      assert.strictEqual(b1.status, 'FAILED');
      assert.ok(b1.detail.includes('STORAGE_CONTROLLER_PAIR'), 'Missing controller pair must be explicitly named');
    });

    test('Numeric aspect IDs [1..7] without matching aspect identities cannot satisfy server checks', () => {
      const output = {
        aspectChecks: [
          { id: 1, name: 'Random Check 1', status: 'PASS' },
          { id: 2, name: 'Random Check 2', status: 'PASS' },
          { id: 3, name: 'Random Check 3', status: 'PASS' },
          { id: 4, name: 'Random Check 4', status: 'PASS' },
          { id: 5, name: 'Random Check 5', status: 'PASS' },
          { id: 6, name: 'Random Check 6', status: 'PASS' },
          { id: 7, name: 'Random Check 7', status: 'PASS' }
        ]
      };

      const checks = validateBoqEvaluationCriteria(output, {});
      const b1 = checks.find(c => c.id === 'B1');
      assert.strictEqual(b1.status, 'FAILED');
      assert.ok(b1.detail.includes('Missing required server domain aspect'));
    });

    test('SN3600B switch with the 4 specialized SAN checks passes san_switch profile cleanly', () => {
      const output = {
        solutionTopology: { domain: 'san_switch' },
        chassis: 'SN3600B_FC',
        aspectChecks: [
          { id: 'SAN_LICENSED_PORTS', name: 'SAN Licensed Port Capacity', status: 'PASS' },
          { id: 'BUNDLED_OPTICS_BILLING', name: 'Bundled Optics Billing', status: 'PASS' },
          { id: 'CATALOG_SERVICE_COVERAGE', name: 'Catalog and Service Coverage', status: 'PASS' },
          { id: 'SERVER_RULES_NOT_APPLICABLE', name: 'Server Component Rules', status: 'NOT_APPLICABLE' }
        ]
      };

      const checks = validateBoqEvaluationCriteria(output, {});
      const b1 = checks.find(c => c.id === 'B1');
      assert.strictEqual(b1.status, 'PASSED', 'SAN switch must pass its dedicated domain profile');
    });
  });

  // ── G07: Splitter DeliveryAuthorization Enforcement ─────────────────────────
  describe('G07: Splitter DeliveryAuthorization Enforcement', () => {

    test('splitAndWriteClusterWorkbooks with strictDeliveryAuth: true throws when authorization is missing', () => {
      const tempDir = path.resolve(__dirname, '../../outputs/temp/test_g07_delivery_auth');
      fs.mkdirSync(tempDir, { recursive: true });

      const sampleItems = [
        { sku: 'P52534-B21', quantity: 2, description: 'DL380 Gen12 CTO Server', category: 'Base Chassis' },
        { sku: 'P67088-B21', quantity: 4, description: 'Intel Xeon Platinum 8568Y+ Processor', category: 'Processor' }
      ];

      assert.throws(() => {
        splitAndWriteClusterWorkbooks(sampleItems, tempDir, { strictDeliveryAuth: true });
      }, /Presentation export blocked: Raw clusters have no DeliveryAuthorization/);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  // ── G02: Deterministic Strategy Ranking & Scoped Ownership ─────────────────
  describe('G02: Deterministic Strategy Ranking & Scoped Ownership', () => {

    test('Candidate permutation yields identical scores and deterministic ranking (G02 fix)', () => {
      const items = [
        { sku: 'P52534-B21', quantity: 1, category: 'Base Chassis' },
        { sku: 'P67088-B21', quantity: 2, category: 'Processor' },
        { sku: 'P43328-B21', quantity: 8, category: 'Memory' }
      ];

      const makeCandA = () => ({
        name: 'Strategy_SAS_Expander',
        score: 0.95,
        physicalMathClean: true,
        skuPartsList: [
          { sku: 'P52534-B21', quantity: 1, category: 'Base Chassis' },
          { sku: 'P67088-B21', quantity: 2, category: 'Processor' },
          { sku: 'P43328-B21', quantity: 8, category: 'Memory' },
          { sku: 'P56073-B21', quantity: 1, category: 'Cable' }
        ]
      });

      const makeCandB = () => ({
        name: 'Strategy_Second_Controller',
        score: 0.90,
        physicalMathClean: true,
        skuPartsList: [
          { sku: 'P52534-B21', quantity: 1, category: 'Base Chassis' },
          { sku: 'P67088-B21', quantity: 2, category: 'Processor' },
          { sku: 'P43328-B21', quantity: 8, category: 'Memory' },
          { sku: 'P48832-B21', quantity: 1, category: 'Cable' }
        ]
      });

      // Run permutation 1: [A, B]
      const cands1 = [makeCandA(), makeCandB()];
      scoreAndSortCandidates(cands1, items);

      // Run permutation 2: [B, A]
      const cands2 = [makeCandB(), makeCandA()];
      scoreAndSortCandidates(cands2, items);

      // Order and scores MUST be identical
      assert.strictEqual(cands1[0].name, cands2[0].name, 'Winner must be identical regardless of permutation');
      assert.strictEqual(cands1[1].name, cands2[1].name, 'Runner-up must be identical regardless of permutation');
      assert.strictEqual(cands1[0].dynamicScore, cands2[0].dynamicScore, 'Dynamic score must be invariant to candidate order');
      assert.strictEqual(cands1[1].dynamicScore, cands2[1].dynamicScore, 'Dynamic score must be invariant to candidate order');
    });

    test('Candidate containing multiple rows of requested SKU does NOT inflate matchRatio above 1.0', () => {
      const items = [
        { sku: 'P43328-B21', quantity: 4, category: 'Memory' } // 1 requested SKU
      ];

      // Candidate has 4 rows of the same requested SKU
      const candidate = {
        name: 'Multi_Row_Memory_Candidate',
        score: 0.90,
        physicalMathClean: true,
        skuPartsList: [
          { sku: 'P43328-B21', quantity: 1, category: 'Memory' },
          { sku: 'P43328-B21', quantity: 1, category: 'Memory' },
          { sku: 'P43328-B21', quantity: 1, category: 'Memory' },
          { sku: 'P43328-B21', quantity: 1, category: 'Memory' }
        ]
      };

      const cands = [candidate];
      scoreAndSortCandidates(cands, items);

      assert.ok(candidate.intentMatchRatio <= 1.0, `intentMatchRatio (${candidate.intentMatchRatio}) must be <= 1.0`);
      assert.strictEqual(candidate.intentMatchRatio, 1.0);
    });
  });

  // ── G06: Revocation & Cache Eviction in Active Knowledge Router ───────────
  describe('G06: Knowledge Revocation & Cache Eviction', () => {

    test('Revoked rule by deltaId or explicit revocation is excluded from active rules', () => {
      const mockDeltas = [
        {
          deltaId: 'DELTA_ACTIVE_001',
          chassis: 'DL380_Gen12',
          productId: 'DL380_Gen12',
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          affectedSku: 'P52534-B21',
          ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY',
          rawMessage: 'Active dependency requires mandatory cable kit',
          status: 'ACTIVE'
        },
        {
          deltaId: 'DELTA_REVOKED_002',
          chassis: 'DL380_Gen12',
          productId: 'DL380_Gen12',
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          affectedSku: 'P52534-B21',
          ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY',
          rawMessage: 'Revoked dependency rule',
          status: 'REVOKED'
        },
        {
          deltaId: 'DELTA_REVOKED_BY_FLAG',
          chassis: 'DL380_Gen12',
          productId: 'DL380_Gen12',
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          affectedSku: 'P52534-B21',
          ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY',
          rawMessage: 'Flagged revoked rule',
          revoked: true,
          status: 'ACTIVE'
        },
        {
          deltaId: 'DELTA_REVOKED_BY_LEDGER',
          chassis: 'DL380_Gen12',
          productId: 'DL380_Gen12',
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          affectedSku: 'P52534-B21',
          ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY',
          rawMessage: 'Ledger revoked rule',
          status: 'ACTIVE'
        }
      ];

      const res = loadActiveKnowledgeRules('DL380_Gen12', '', {
        rawDeltas: mockDeltas,
        revokedIdentifiers: ['DELTA_REVOKED_BY_LEDGER']
      });

      assert.strictEqual(res.allRules.length, 1, 'Only non-revoked active delta must be loaded');
      assert.strictEqual(res.allRules[0].ruleId, 'DELTA_ACTIVE_001');
    });

    test('RAG cache evictCachedRagResult and invalidateRagCache cleanly purge stale entries', () => {
      const key1 = 'rag_test_key_alpha';
      const key2 = 'rag_test_key_beta';
      setCachedRagResult(key1, { answer: 'Alpha evidence' });
      setCachedRagResult(key2, { answer: 'Beta evidence' });

      assert.ok(getCachedRagResult(key1), 'Alpha must be present in cache');
      assert.ok(getCachedRagResult(key2), 'Beta must be present in cache');

      // Evict Alpha
      const evicted = evictCachedRagResult(key1);
      assert.strictEqual(evicted, true);
      assert.strictEqual(getCachedRagResult(key1), null, 'Alpha must be evicted');
      assert.ok(getCachedRagResult(key2), 'Beta must remain in cache');

      // Invalidate Beta via predicate
      const invalidatedCount = invalidateRagCache((k) => k.includes('beta'));
      assert.strictEqual(invalidatedCount, 1);
      assert.strictEqual(getCachedRagResult(key2), null, 'Beta must be invalidated');
    });
  });

  // ── G10: Aspect Profiles for Synergy & Archive Domains ────────────────────
  describe('G10: Aspect Profiles for Synergy & Archive Domains', () => {

    test('getRegisteredAspectsForDomain returns 6 dedicated aspects for synergy_compute', () => {
      const aspects = getRegisteredAspectsForDomain('synergy_compute');
      assert.strictEqual(aspects.length, 6, 'Synergy compute must define 6 canonical aspects');
      const aspectIds = aspects.map(a => a.id);
      assert.ok(aspectIds.includes('COMPUTE_THERMAL'));
      assert.ok(aspectIds.includes('MEMORY_CHANNEL'));
      assert.ok(aspectIds.includes('STORAGE_TRI_MODE'));
      assert.ok(aspectIds.includes('FRAME_FABRIC_MEZZANINE'));
      assert.ok(aspectIds.includes('FRAME_SHARED_POWER'));
      assert.ok(aspectIds.includes('SUPPORT_SERVICES'));
    });

    test('bom_verifier evaluates synergy_compute domain with dedicated aspects and fails if mezzanine missing', () => {
      const incompleteSynergy = {
        solutionTopology: { domain: 'synergy_compute' },
        chassis: 'SY480_Gen10_Plus',
        aspectChecks: [
          { id: 'COMPUTE_THERMAL', name: 'Compute Thermal Aspect', status: 'PASS' },
          { id: 'MEMORY_CHANNEL', name: 'Memory Channel Aspect', status: 'PASS' },
          { id: 'STORAGE_TRI_MODE', name: 'Storage Aspect', status: 'PASS' },
          { id: 'FRAME_SHARED_POWER', name: 'Frame Shared Power Aspect', status: 'PASS' },
          { id: 'SUPPORT_SERVICES', name: 'Support Services Aspect', status: 'PASS' }
          // Missing FRAME_FABRIC_MEZZANINE
        ]
      };

      const checks = validateBoqEvaluationCriteria(incompleteSynergy, {});
      const b1 = checks.find(c => c.id === 'B1');
      assert.strictEqual(b1.status, 'FAILED');
      assert.ok(b1.detail.includes('Missing required synergy_compute domain aspect(s): FRAME_FABRIC_MEZZANINE'));
    });

    test('bom_verifier evaluates archive_tape domain: NOT_EVALUATED triggers ACTION_REQUIRED (INV-105) and PASS passes', () => {
      const unevaluatedArchive = {
        solutionTopology: { domain: 'archive_tape' },
        chassis: 'StoreEver_MSL3040',
        aspectChecks: [
          { id: 'ARCHIVE_COLD_STORAGE', name: 'Tape Library & Archive Drive Validation', status: 'NOT_EVALUATED' }
        ]
      };

      const checks1 = validateBoqEvaluationCriteria(unevaluatedArchive, {});
      const b1Unevaluated = checks1.find(c => c.id === 'B1');
      assert.strictEqual(b1Unevaluated.status, 'ACTION_REQUIRED', 'Archive tape domain with NOT_EVALUATED advisory must be ACTION_REQUIRED per INV-105 honest uncertainty');

      const evaluatedArchive = {
        solutionTopology: { domain: 'archive_tape' },
        chassis: 'StoreEver_MSL3040',
        aspectChecks: [
          { id: 'ARCHIVE_COLD_STORAGE', name: 'Tape Library & Archive Drive Validation', status: 'PASS' }
        ]
      };

      const checks2 = validateBoqEvaluationCriteria(evaluatedArchive, {});
      const b1Evaluated = checks2.find(c => c.id === 'B1');
      assert.strictEqual(b1Evaluated.status, 'PASSED', 'Archive tape domain with PASS status must evaluate to PASSED');
    });
  });
});
