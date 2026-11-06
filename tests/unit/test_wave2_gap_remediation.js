'use strict';
/**
 * tests/unit/test_wave2_gap_remediation.js
 *
 * Validates Wave 2 Remediation Deliverables:
 * 1. G-RSN-01: Ambient-aware least-delta SKU selection & portal conditional tagging
 * 2. G-STR-03: Automated mixed-domain tender forking in preprocessor & query router
 * 3. G-RSN-03: Secondary riser card vs cable decoupling in resource arbitrator
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const {
  isSkuVisibleAtDefaultAmbient,
  buildLeastDeltaCandidate
} = require('../../scripts/lib/conflict/least_delta_combinator.js');
const { preprocessAndGroupBOQ, sniffDomainComposition } = require('../../scripts/lib/boq/boq_preprocessor.js');
const { classifyQueryIntent } = require('../../scripts/evaluators/route_query.js');
const { arbitrateContestedResources } = require('../../scripts/lib/conflict/resource_arbitrator.js');

test('G-RSN-01: isSkuVisibleAtDefaultAmbient detects conditional visibility in catalog rules', () => {
  const dl380aCatalogDir = path.resolve(__dirname, '../../outputs/ProLiant/Gen12/DL380a_Gen12');
  if (fs.existsSync(dl380aCatalogDir)) {
    // P74576-B21 is recorded in DL380a_Gen12_Catalog_Rules.json as conditional view
    const visibility = isSkuVisibleAtDefaultAmbient('P74576-B21', dl380aCatalogDir);
    assert.equal(visibility.isVisible, false, 'P74576-B21 should be detected as conditionally hidden at default ambient');
    assert.ok(visibility.conditionType, 'Condition type must be populated');
  }

  // Non-conditional standard SKU
  const standardVis = isSkuVisibleAtDefaultAmbient('P49610-B21', dl380aCatalogDir);
  assert.equal(standardVis.isVisible, true, 'Standard SKU P49610-B21 should be visible at default ambient');
});

test('G-RSN-01: buildLeastDeltaCandidate emits isPortalConditional = true when substituting gated SKUs', () => {
  const baseParts = [
    { sku: 'P73282-B21', quantity: 1, description: 'DL380 Gen12 CTO Server' },
    { sku: 'P01366-B21', quantity: 1, description: 'Legacy Capacitor Battery' }
  ];
  const fixParts = [];
  const troublesomeSkus = [
    {
      originalSku: 'P01366-B21',
      alternativeSku: 'P74576-B21', // Known conditional SKU
      type: 'DISCONTINUED_SKU_SUPERSEDED',
      troublesomeReason: 'Delisted SKU requires replacement',
      functionalEquivalence: 'Direct functional replacement',
      presalesValuePitch: 'Active portal alternative',
      cascadingEliminated: []
    }
  ];
  const evalResults = { errors: [], missingDependencies: [] };
  const catalogData = { entries: [] };
  const chassisInfo = { catalogDir: path.resolve(__dirname, '../../outputs/ProLiant/Gen12/DL380a_Gen12') };
  const getPrice = () => 500;

  const candidate = buildLeastDeltaCandidate(baseParts, fixParts, troublesomeSkus, evalResults, catalogData, chassisInfo, getPrice);

  assert.ok(candidate, 'Candidate must be synthesized');
  assert.equal(candidate.isPortalConditional, true, 'isPortalConditional must be true when substitute is conditional');
  assert.equal(candidate.portalValidationStatus, 'PORTAL_CONDITIONAL', 'portalValidationStatus must be PORTAL_CONDITIONAL');
  assert.ok(Array.isArray(candidate.portalConditionalSkus), 'portalConditionalSkus array must be returned');
  assert.equal(candidate.portalConditionalSkus.length, 1, 'Should record exactly 1 conditional SKU');
  assert.equal(candidate.portalConditionalSkus[0].sku, 'P74576-B21');
});

test('G-STR-03: sniffDomainComposition and boq_preprocessor detect mixed domains and flag heterogeneous router', () => {
  const mixedLines = [
    { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 CTO Server', quantity: 1 },
    { sku: 'R0Q39B', description: 'HPE MSA 2062 16Gb Fibre Channel SFF Storage Array', quantity: 1 },
    { sku: 'R7J71A', description: 'HPE StoreFabric SN3600B 32Gb 24/8 Fibre Channel Switch', quantity: 2 }
  ];

  const sniff = sniffDomainComposition(mixedLines);
  assert.equal(sniff.isMixedDomain, true, 'Tender with Server, Storage, and SAN Switch must be flagged as isMixedDomain = true');
  assert.ok(sniff.activeDomains.includes('server'), 'Active domains must include server');
  assert.ok(sniff.activeDomains.includes('storage'), 'Active domains must include storage');
  assert.ok(sniff.activeDomains.includes('networking'), 'Active domains must include networking');

  const preprocessed = preprocessAndGroupBOQ(mixedLines);
  assert.equal(preprocessed.isMixedDomain, true, 'Preprocessor result must expose isMixedDomain = true');
  assert.equal(preprocessed.requiresHeterogeneousRouter, true, 'Preprocessor result must expose requiresHeterogeneousRouter = true');
});

test('G-STR-03: route_query automatically classifies mixed-domain tender file as HETEROGENEOUS_TENDER_MODERNIZATION', () => {
  const tempCsvPath = path.resolve(__dirname, '../../outputs/temp/test_mixed_domain_tender.csv');
  const tempDir = path.dirname(tempCsvPath);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const csvContent = [
    'Part Number,Description,Qty',
    'P73282-B21,HPE ProLiant Compute DL380 Gen12 CTO Server,1',
    'R0Q39B,HPE MSA 2062 16Gb Fibre Channel SFF Storage Array,1',
    'R7J71A,HPE StoreFabric SN3600B 32Gb 24/8 Fibre Channel Switch,2'
  ].join('\n');
  fs.writeFileSync(tempCsvPath, csvContent, 'utf8');

  try {
    const classification = classifyQueryIntent('', { filePath: tempCsvPath });
    assert.equal(classification.intent, 'HETEROGENEOUS_TENDER_MODERNIZATION', 'Mixed-domain file must route to HETEROGENEOUS_TENDER_MODERNIZATION');
    assert.equal(classification.skillTarget, 'heterogeneous-tender-modernizer', 'Skill target must be heterogeneous-tender-modernizer');
    assert.ok(classification.domainSniff, 'Classification must attach domainSniff details');
    assert.equal(classification.domainSniff.isMixedDomain, true);
  } finally {
    if (fs.existsSync(tempCsvPath)) fs.unlinkSync(tempCsvPath);
  }
});

test('G-RSN-03: arbitrateContestedResources decouples secondary riser card from secondary cable kit', () => {
  // Scenario A: Customer has secondary riser installed, but needs secondary cable kit to activate Slot 4
  const evalResultsA = {
    aspectChecks: {
      pcieRiser: {
        isExceedingActiveSlots: false,
        isExceedingTotalSlots: false,
        needsSecondaryRiser: false,
        needsSecondaryCableKit: true,
        activeSlotsAvailable: 4,
        requiredPcieCards: 3
      }
    },
    missingDependencies: [
      { key: 'SECONDARY_RISER_CABLE_KIT', sku: 'P56074-B21' }
    ]
  };

  const arbitrationA = arbitrateContestedResources([], evalResultsA, {}, null);
  assert.ok(arbitrationA, 'Arbitration result must be returned');

  const secCableBranch = arbitrationA.branches.find(b => b.branchId === 'branch_pcie_secondary_cable');
  assert.ok(secCableBranch, 'Must emit branch_pcie_secondary_cable when only cable kit is needed');
  assert.equal(secCableBranch.substitutions[0].action, 'INJECT_SECONDARY_RISER_CABLE');
  assert.equal(secCableBranch.substitutions[0].injectedSku, 'P56074-B21');

  const secRiserBranch = arbitrationA.branches.find(b => b.branchId === 'branch_pcie_secondary_riser');
  assert.equal(secRiserBranch, undefined, 'Must NOT emit branch_pcie_secondary_riser when physical riser card is not needed');

  // Scenario B: Customer exceeds slots and actually needs physical secondary riser
  const evalResultsB = {
    aspectChecks: {
      pcieRiser: {
        isExceedingActiveSlots: true,
        isExceedingTotalSlots: false,
        needsSecondaryRiser: true,
        needsSecondaryCableKit: false,
        activeSlotsAvailable: 2,
        requiredPcieCards: 5
      }
    },
    missingDependencies: []
  };

  const arbitrationB = arbitrateContestedResources([], evalResultsB, {}, null);
  assert.ok(arbitrationB);
  const secRiserBranchB = arbitrationB.branches.find(b => b.branchId === 'branch_pcie_secondary_riser');
  assert.ok(secRiserBranchB, 'Must emit branch_pcie_secondary_riser when physical riser is required');
  assert.equal(secRiserBranchB.substitutions[0].action, 'INJECT_SECONDARY_RISER_AND_CABLE');
});
