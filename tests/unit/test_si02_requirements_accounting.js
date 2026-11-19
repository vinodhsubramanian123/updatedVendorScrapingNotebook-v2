'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const xlsx = require('xlsx-js-style');

const {
  HARDNESS_LEVELS,
  COMPARATORS,
  SCOPE_TYPES,
  extractBudgetConstraint,
  parseTypedClauseValue,
  detectHardnessAndScope,
  computeUsableStorageTb
} = require('../../scripts/lib/boq/requirements/typed_values.js');

const {
  SCHEMA_VERSION,
  extractRequirementRecords,
  extractWorkbookCoverNotes,
  buildRequirementRevisionDigest
} = require('../../scripts/lib/boq/requirements/requirement_records.js');

const {
  DISPOSITIONS,
  evaluateCandidateRequirementCoverage,
  attachCandidateDispositions,
  summarizeRequirementCoverage,
  applyRequirementWaiver
} = require('../../scripts/lib/boq/requirements/coverage.js');

const { resolveRequirementIntent, extractRequirementIntent } = require('../../scripts/lib/boq/requirement_intent_resolver.js');
const {
  parseAndConsolidateBOQDetailed,
  evaluateBOQMultiAspect,
  _readWorkbookWithCoverNotes,
  readBoqLines
} = require('../../scripts/lib/boq/boq_evaluator.js');

const DL380_GEN12_DIR = path.resolve(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12');
const DL380_GEN12_CATALOG_PATH = path.join(DL380_GEN12_DIR, 'DL380_Gen12_Catalog.json');

test('Case 1: Rejects non-currency max phrases while parsing currency-qualified budgets', () => {
  assert.equal(extractBudgetConstraint('max 64 cores'), null);
  assert.equal(extractBudgetConstraint('max 16 DIMMs'), null);
  assert.equal(extractBudgetConstraint('max 2U'), null);
  assert.equal(extractBudgetConstraint('max 30 days'), null);
  assert.equal(extractBudgetConstraint('under 250 W'), null);
  assert.equal(extractBudgetConstraint('budget of 50000 cores'), null);

  assert.equal(extractBudgetConstraint('$50,000')?.budgetUsd, 50000);
  assert.equal(extractBudgetConstraint('USD 75,000')?.budgetUsd, 75000);
  assert.equal(extractBudgetConstraint('50k USD')?.budgetUsd, 50000);
  assert.equal(extractBudgetConstraint('budget of 50000')?.budgetUsd, 50000);
  assert.equal(extractBudgetConstraint('under $25,000')?.budgetUsd, 25000);

  const intentOnly = extractRequirementIntent(['Need DL380 Gen12 with max 64 cores and max 16 DIMMs']);
  assert.equal(intentOnly.budgetUsd, null);

  const resolved = resolveRequirementIntent({
    rawLines: ['Need DL380 Gen12 with max 64 cores', 'max 2U'],
    catalogData: { entries: [] },
    productConfirmed: true
  });
  assert.equal(resolved.intent.budgetUsd, null);
  assert.equal(resolved.requirementAccounting.schemaVersion, '1.0');
  assert.equal(resolved.requirementAccounting.records[0].typedValue.metric, 'cores');
  assert.equal(resolved.requirementAccounting.records[0].typedValue.comparator, COMPARATORS.MAX);
  assert.equal(resolved.requirementAccounting.records[0].typedValue.value, 64);
});

test('Case 2: Explicit USD budget keeps incomplete pricing or null totalCostUsd UNRESOLVED', () => {
  const accounting = extractRequirementRecords(['Budget under $50,000']);
  assert.equal(accounting.records[0].typedValue.metric, 'budgetUsd');
  assert.equal(accounting.records[0].typedValue.value, 50000);

  const incompleteCand = {
    skuPartsList: [{ sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 1, unitPriceUsd: null, priceKnown: false }],
    pricingComplete: false,
    totalCostUsd: null
  };
  const covIncomplete = evaluateCandidateRequirementCoverage(incompleteCand, accounting);
  assert.equal(covIncomplete.dispositions[0].disposition, DISPOSITIONS.UNRESOLVED);
  assert.equal(covIncomplete.blocksPositiveRecommendation, true);

  // Even if a partial totalCostUsd is attached while pricingComplete === false, MUST remain UNRESOLVED
  const partialFlagCand = {
    skuPartsList: [{ sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 1, unitPriceUsd: 10000 }],
    pricingComplete: false,
    totalCostUsd: 10000
  };
  const covPartial = evaluateCandidateRequirementCoverage(partialFlagCand, accounting);
  assert.equal(covPartial.dispositions[0].disposition, DISPOSITIONS.UNRESOLVED);
  assert.equal(covPartial.blocksPositiveRecommendation, true);

  const nullTotalCand = {
    skuPartsList: [{ sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 1, unitPriceUsd: 10000 }],
    pricingComplete: true,
    totalCostUsd: null
  };
  assert.equal(evaluateCandidateRequirementCoverage(nullTotalCand, accounting).dispositions[0].disposition, DISPOSITIONS.UNRESOLVED);

  const withinBudget = {
    skuPartsList: [{ sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 1, unitPriceUsd: 45000, priceKnown: true }],
    pricingComplete: true,
    totalCostUsd: 45000
  };
  const covOk = evaluateCandidateRequirementCoverage(withinBudget, accounting);
  assert.equal(covOk.dispositions[0].disposition, DISPOSITIONS.SATISFIED);
  assert.equal(covOk.blocksPositiveRecommendation, false);

  const overBudget = { ...withinBudget, totalCostUsd: 62000 };
  const covOver = evaluateCandidateRequirementCoverage(overBudget, accounting);
  assert.equal(covOver.dispositions[0].disposition, DISPOSITIONS.VIOLATED);
  assert.equal(covOver.blocksPositiveRecommendation, true);
});

test('Case 3: 512 GB per node across 20 nodes + strict ramCapacityGb vs dimmCount distinction', () => {
  const memParsed = parseTypedClauseValue('512 GB per node across 20 nodes');
  assert.equal(memParsed.metric, 'ramCapacityGb');
  assert.equal(memParsed.value, 512);
  assert.equal(memParsed.scope, SCOPE_TYPES.PER_NODE);
  assert.ok(memParsed.extractedMetrics.some(m => m.metric === 'nodeCount' && m.value === 20));
  assert.equal(memParsed.extractedMetrics.some(m => m.metric === 'dimmCount'), false);

  const dimmParsed = parseTypedClauseValue('max 16 DIMMs');
  assert.equal(dimmParsed.metric, 'dimmCount');
  assert.equal(dimmParsed.comparator, COMPARATORS.MAX);
  assert.equal(dimmParsed.value, 16);
  assert.equal(dimmParsed.extractedMetrics.some(m => m.metric === 'ramCapacityGb'), false);

  const accounting = extractRequirementRecords(['512 GB per node across 20 nodes', 'max 16 DIMMs']);

  const compliantCand = {
    nodeCount: 20,
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'P69728-B21', description: 'HPE 64GB (1x64GB) DDR5-6400 Smart Memory Kit', quantity: 8 }
    ]
  };
  const covOk = evaluateCandidateRequirementCoverage(compliantCand, accounting);
  assert.equal(covOk.dispositions[0].disposition, DISPOSITIONS.SATISFIED);
  assert.equal(covOk.dispositions[1].disposition, DISPOSITIONS.SATISFIED);
  assert.equal(covOk.blocksPositiveRecommendation, false);

  const wrongGbRightDimm = {
    nodeCount: 20,
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'P69725-B21', description: 'HPE 16GB (1x16GB) DDR5-6400 Smart Memory Kit', quantity: 16 }
    ]
  };
  const covWrongGb = evaluateCandidateRequirementCoverage(wrongGbRightDimm, accounting);
  assert.equal(covWrongGb.dispositions[0].disposition, DISPOSITIONS.VIOLATED);
  assert.equal(covWrongGb.dispositions[1].disposition, DISPOSITIONS.SATISFIED);

  const tooManyDimms = {
    nodeCount: 20,
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'P69727-B21', description: 'HPE 32GB (1x32GB) DDR5-6400 Smart Memory Kit', quantity: 24 }
    ]
  };
  const covTooManyDimms = evaluateCandidateRequirementCoverage(tooManyDimms, accounting);
  assert.equal(covTooManyDimms.dispositions[1].disposition, DISPOSITIONS.VIOLATED);
});

test('Case 4: Shared/spare optics handling and preference non-promotion', () => {
  const hs = detectHardnessAndScope('4 spare 25GbE SFP28 optics shared across cluster');
  assert.equal(hs.hardness, HARDNESS_LEVELS.HARD_CONSTRAINT);
  assert.equal(hs.promoteToPhysicalRule, true);
  assert.equal(hs.isSpare, true);
  assert.equal(hs.isShared, true);

  const pref = detectHardnessAndScope('Prefer 100GbE optics if possible');
  assert.equal(pref.hardness, HARDNESS_LEVELS.PREFERENCE);
  assert.equal(pref.promoteToPhysicalRule, false);
  assert.equal(pref.isHardBlocking, false);

  const accounting = extractRequirementRecords([
    '4 spare 25GbE SFP28 optics shared across cluster',
    'Prefer 100GbE optics if possible'
  ]);
  const candWithSpares = {
    nodeCount: 4,
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'P26256-B21', description: 'HPE 25GbE 2-port SFP28 Adapter', quantity: 1 }
    ],
    sharedInfrastructure: [
      { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR Transceiver', quantity: 4, quantityScope: 'global' }
    ]
  };
  const covWithSpares = evaluateCandidateRequirementCoverage(candWithSpares, accounting);
  assert.equal(covWithSpares.dispositions[0].disposition, DISPOSITIONS.SATISFIED);
  assert.equal(covWithSpares.dispositions[1].disposition, DISPOSITIONS.VIOLATED);
  assert.equal(covWithSpares.dispositions[1].blocking, false);
  assert.equal(covWithSpares.blocksPositiveRecommendation, false);

  const candMissingSpares = { ...candWithSpares, sharedInfrastructure: [] };
  const covMissingSpares = evaluateCandidateRequirementCoverage(candMissingSpares, accounting);
  assert.equal(covMissingSpares.dispositions[0].disposition, DISPOSITIONS.VIOLATED);
  assert.equal(covMissingSpares.blocksPositiveRecommendation, true);
});

test('Case 5: Usable RAID vs raw storage math and candidate evaluation', () => {
  const r6 = computeUsableStorageTb({ driveCount: 6, driveSizeTb: 3.84, raidLevel: 'RAID 6' });
  assert.equal(r6.valid, true);
  assert.equal(r6.usableStorageTb, 15.36);

  const r10 = computeUsableStorageTb({ rawStorageTb: 20, driveCount: 4, raidLevel: 'RAID 10' });
  assert.equal(r10.valid, true);
  assert.equal(r10.usableStorageTb, 10);

  const r5Spare = computeUsableStorageTb({ driveCount: 6, driveSizeTb: 3.84, raidLevel: 'RAID 5', hotSpares: 1 });
  assert.equal(r5Spare.valid, true);
  assert.equal(r5Spare.usableStorageTb, 15.36);

  const impossibleR6 = computeUsableStorageTb({ driveCount: 2, driveSizeTb: 3.84, raidLevel: 'RAID 6' });
  assert.equal(impossibleR6.valid, false);
  assert.equal(impossibleR6.physicalImpossibility, true);

  const accounting = extractRequirementRecords(['>= 15 TB usable RAID 6']);

  // 5 x 3.84TB = 19.2TB raw (>15TB raw), but RAID 6 usable is 11.52TB (<15TB) -> VIOLATED
  const fiveDrives = {
    raidLevel: 'RAID 6',
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'P40500-B21', description: 'HPE 3.84TB NVMe Read Intensive SSD', quantity: 5 }
    ]
  };
  const covFive = evaluateCandidateRequirementCoverage(fiveDrives, accounting);
  assert.equal(covFive.dispositions[0].disposition, DISPOSITIONS.VIOLATED);
  assert.equal(covFive.blocksPositiveRecommendation, true);

  // 6 x 3.84TB = 23.04TB raw, RAID 6 usable = 15.36TB >= 15TB -> SATISFIED
  const sixDrives = {
    raidLevel: 'RAID 6',
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'P40500-B21', description: 'HPE 3.84TB NVMe Read Intensive SSD', quantity: 6 }
    ]
  };
  const covSix = evaluateCandidateRequirementCoverage(sixDrives, accounting);
  assert.equal(covSix.dispositions[0].disposition, DISPOSITIONS.SATISFIED);
  assert.equal(covSix.blocksPositiveRecommendation, false);
});

test('Case 6: Do-not-substitute lock and negation/exclusion rules', () => {
  const accounting = extractRequirementRecords(['Do not substitute P73282-B21; no installation; exclude HA114A1']);
  assert.equal(accounting.records.length, 3);
  assert.equal(accounting.records[0].noSubstitute, true);
  assert.equal(accounting.records[1].hardness, HARDNESS_LEVELS.EXCLUSION);
  assert.equal(accounting.records[2].hardness, HARDNESS_LEVELS.EXCLUSION);

  const goodCand = {
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', quantity: 1 }
    ]
  };
  const covGood = evaluateCandidateRequirementCoverage(goodCand, accounting);
  assert.equal(covGood.blocksPositiveRecommendation, false);
  assert.ok(covGood.dispositions.every(d => d.disposition === DISPOSITIONS.SATISFIED));

  const badCand = {
    skuPartsList: [
      { sku: 'P73283-B21', description: 'HPE DL380 Gen12 LFF CTO Server', quantity: 1 },
      { sku: 'HA114A1', description: 'HPE Onsite Installation Service', quantity: 1 }
    ]
  };
  const covBad = evaluateCandidateRequirementCoverage(badCand, accounting);
  assert.equal(covBad.blocksPositiveRecommendation, true);
  assert.ok(covBad.dispositions.every(d => d.disposition === DISPOSITIONS.VIOLATED));
});

test('Case 7: Support SLA level, duration years, and retention evaluation', () => {
  const accounting = extractRequirementRecords(['5-year Tech Care Critical with CDMR']);
  const matched = {
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'HU4A6A5', description: 'HPE 5Y Tech Care Critical wCDMR Service', quantity: 1 }
    ]
  };
  assert.equal(evaluateCandidateRequirementCoverage(matched, accounting).dispositions[0].disposition, DISPOSITIONS.SATISFIED);

  const wrongSupport = {
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', quantity: 1 }
    ]
  };
  const covWrong = evaluateCandidateRequirementCoverage(wrongSupport, accounting);
  assert.equal(covWrong.dispositions[0].disposition, DISPOSITIONS.VIOLATED);
  assert.equal(covWrong.blocksPositiveRecommendation, true);
});

test('Case 8: Contradictory node counts trigger ambiguities, clarification questions, and UNRESOLVED block', () => {
  const accounting = extractRequirementRecords(['10 servers', '12 nodes']);
  assert.equal(accounting.ambiguityCount, 1);
  assert.equal(accounting.ambiguities[0].metric, 'nodeCount');
  assert.deepEqual(accounting.ambiguities[0].conflictingValues, [10, 12]);
  assert.equal(accounting.clarificationQuestions.length, 1);
  assert.equal(accounting.clarificationQuestions[0].severity, 'BLOCKING');
  assert.equal(accounting.records[0].isAmbiguous, true);
  assert.equal(accounting.records[1].isAmbiguous, true);

  const cand = {
    nodeCount: 10,
    skuPartsList: [{ sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 10 }]
  };
  const cov = evaluateCandidateRequirementCoverage(cand, accounting);
  assert.equal(cov.dispositions[0].disposition, DISPOSITIONS.UNRESOLVED);
  assert.equal(cov.dispositions[1].disposition, DISPOSITIONS.UNRESOLVED);
  assert.equal(cov.blocksPositiveRecommendation, true);

  // Compatible range bounds should NOT raise contradiction
  const compatible = extractRequirementRecords(['at least 10 nodes', 'max 12 nodes']);
  assert.equal(compatible.ambiguityCount, 0);

  // Inverted range bounds MUST raise contradiction
  const inverted = extractRequirementRecords(['at least 16 nodes', 'max 12 nodes']);
  assert.equal(inverted.ambiguityCount, 1);
});

test('Case 9: Unicode & decimal units + immutable versioned RequirementRecord digest and IDs', () => {
  const input = ['≥ 2.5 TB NVMe', '≤ 1,200 W', '≥ 512 GB RAM', '≤ 100 GbE', '>= 1.5 TB memory'];
  const acc1 = extractRequirementRecords(input);
  const acc2 = extractRequirementRecords(input);

  assert.equal(acc1.schemaVersion, SCHEMA_VERSION);
  assert.equal(acc1.inputRevisionSha256, acc2.inputRevisionSha256);
  assert.equal(acc1.inputRevisionSha256, buildRequirementRevisionDigest(acc1.records));
  assert.ok(Object.isFrozen(acc1));
  assert.ok(Object.isFrozen(acc1.records[0]));

  for (const rec of acc1.records) {
    assert.match(rec.id, /^REQ-[0-9a-f]{8}-\d{3}$/);
  }

  assert.deepEqual(
    acc1.records.map(r => [r.typedValue.metric, r.typedValue.comparator, r.typedValue.value]),
    [
      ['rawStorageTb', COMPARATORS.MIN, 2.5],
      ['powerWatts', COMPARATORS.MAX, 1200],
      ['ramCapacityGb', COMPARATORS.MIN, 512],
      ['speedGbps', COMPARATORS.MAX, 100],
      ['ramCapacityGb', COMPARATORS.MIN, 1536]
    ]
  );
});

test('Case 10: Uninterpretable preservation, Excel cover-row provenance, waiver guards, quantity conservation & evaluator integration', () => {
  // 1. Uninterpretable clause preserved
  const unintAcc = extractRequirementRecords(['Must support sovereign air-gap widget compliance Z-99']);
  assert.equal(unintAcc.records.length, 1);
  assert.equal(unintAcc.uninterpretedClauses.length, 1);
  assert.equal(unintAcc.records[0].parseStatus, 'UNINTERPRETED');

  const baseCandidate = {
    skuPartsList: [{ sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 1, unitPriceUsd: 5000, priceKnown: true }],
    pricingComplete: true,
    totalCostUsd: 5000
  };
  const covUnint = evaluateCandidateRequirementCoverage(baseCandidate, unintAcc);
  assert.equal(covUnint.dispositions[0].disposition, DISPOSITIONS.UNRESOLVED);
  assert.equal(covUnint.blocksPositiveRecommendation, true);

  // 2. Waiver guards
  assert.throws(
    () => applyRequirementWaiver(covUnint, { requirementId: unintAcc.records[0].id, customerAuthority: '   ' }),
    /WAIVER_AUTHORITY_REQUIRED/
  );
  const validWaived = applyRequirementWaiver(covUnint, {
    requirementId: unintAcc.records[0].id,
    customerAuthority: 'VP Infrastructure (Jane Doe)',
    reason: 'Verified offline via air-gap checklist'
  });
  assert.equal(validWaived.dispositions[0].disposition, DISPOSITIONS.WAIVED);
  assert.equal(validWaived.blocksPositiveRecommendation, false);

  const impAcc = extractRequirementRecords(['RAID 6 with 2x 3.84 TB drives']);
  const impCov = evaluateCandidateRequirementCoverage(baseCandidate, impAcc);
  assert.equal(impCov.dispositions[0].physicalImpossibility, true);
  assert.throws(
    () => applyRequirementWaiver(impCov, {
      requirementId: impAcc.records[0].id,
      customerAuthority: 'CTO Override'
    }),
    /WAIVER_PHYSICAL_IMPOSSIBILITY_FORBIDDEN/
  );

  // 3. Quantity conservation link
  const baselineItems = [
    { sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 2 },
    { sku: 'P74573-B21', description: 'Xeon 6730P Processor', quantity: 4 }
  ];
  const deficitCand = {
    nodeCount: 2,
    skuPartsList: [
      { sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'P74573-B21', description: 'Xeon 6730P Processor', quantity: 1 }
    ]
  };
  const covCons = evaluateCandidateRequirementCoverage(deficitCand, extractRequirementRecords([]), { baselineItems });
  assert.equal(covCons.quantityConservation.isFullyConserved, false);
  assert.equal(covCons.quantityConservation.deficitCount, 1);

  // 4. Excel cover-row provenance + non-leakage + evaluateBOQMultiAspect integration
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'si02-xlsx-'));
  try {
    const withCoverPath = path.join(tmpDir, 'with_cover.xlsx');
    const plainPath = path.join(tmpDir, 'plain.xlsx');

    const headerAndSkus = [
      ['Product #', 'Description', 'Qty'],
      ['P73282-B21', 'HPE ProLiant Compute DL380 Gen12 8SFF NC Configure-to-order Server', 1],
      ['P74573-B21', 'Intel Xeon 6730P 2.5GHz 32-core 250W Processor for HPE', 2],
      ['P69728-B21', 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 Registered Smart Memory Kit', 8],
      ['P38997-B21', 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply Kit', 2],
      ['HU4B2A3', 'HPE 3Y Tech Care Basic Service', 1]
    ];

    const coverRows = [
      ['Budget under $50,000', ''],
      ['Do not substitute P73282-B21', ''],
      ['Must support sovereign air-gap widget compliance Z-99', ''],
      ['', '']
    ];

    const wbCover = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wbCover, xlsx.utils.aoa_to_sheet([...coverRows, ...headerAndSkus]), 'BOM');
    xlsx.writeFile(wbCover, withCoverPath);

    const wbPlain = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wbPlain, xlsx.utils.aoa_to_sheet(headerAndSkus), 'BOM');
    xlsx.writeFile(wbPlain, plainPath);

    const coverExtract = _readWorkbookWithCoverNotes(withCoverPath, 'BOM');
    assert.equal(coverExtract.coverNoteRecords.length, 3);
    assert.deepEqual(
      coverExtract.coverNoteRecords.map(r => ({ sheet: r.sheet, row: r.row, cell: r.cell, text: r.text })),
      [
        { sheet: 'BOM', row: 1, cell: 'A1', text: 'Budget under $50,000' },
        { sheet: 'BOM', row: 2, cell: 'A2', text: 'Do not substitute P73282-B21' },
        { sheet: 'BOM', row: 3, cell: 'A3', text: 'Must support sovereign air-gap widget compliance Z-99' }
      ]
    );
    assert.equal(extractWorkbookCoverNotes(headerAndSkus, 'BOM', 0).length, 0);

    // Backward-compatible readBoqLines must still exclude cover rows
    const backwardLines = readBoqLines(withCoverPath);
    assert.equal(backwardLines.some(l => l.includes('sovereign air-gap')), false);

    // parseAndConsolidateBOQDetailed must NOT leak cover rows (P73282-B21 remains qty 1)
    const detailed = parseAndConsolidateBOQDetailed('', withCoverPath);
    assert.equal(detailed.coverNoteRecords.length, 3);
    const chassis = detailed.items.find(i => i.sku === 'P73282-B21');
    assert.equal(chassis.quantity, 1);

    const catalogData = fs.existsSync(DL380_GEN12_CATALOG_PATH)
      ? JSON.parse(fs.readFileSync(DL380_GEN12_CATALOG_PATH, 'utf8'))
      : null;

    const evalCover = evaluateBOQMultiAspect(withCoverPath, { targetDir: DL380_GEN12_DIR, catalogData, productConfirmed: true });
    const evalPlain = evaluateBOQMultiAspect(plainPath, { targetDir: DL380_GEN12_DIR, catalogData, productConfirmed: true });

    // Existing evaluation behavior & rankedSolutions ordering must remain unchanged
    assert.equal(evalCover.isMathClean, evalPlain.isMathClean);
    assert.deepEqual(evalCover.errors, evalPlain.errors);
    assert.deepEqual(evalCover.missingDependencies, evalPlain.missingDependencies);
    assert.deepEqual(
      (evalCover.conflictGraph?.rankedSolutions || []).map(r => r.strategyId || r.name),
      (evalPlain.conflictGraph?.rankedSolutions || []).map(r => r.strategyId || r.name)
    );

    assert.equal(evalCover.requirementAccounting.records.length, 3);
    assert.equal(evalCover.requirementAccounting.records[0].provenance.cell, 'A1');
    assert.equal(evalCover.requirementAccounting.records[0].provenance.sheet, 'BOM');
    assert.equal(evalCover.requirementAccounting.records[2].parseStatus, 'UNINTERPRETED');

    const ranked = evalCover.conflictGraph?.rankedSolutions || [];
    assert.ok(ranked.length > 0);
    for (const cand of ranked) {
      assert.ok(cand.requirementCoverage, 'Every candidate must carry additive requirementCoverage');
      assert.equal(cand.requirementCoverage.blocksPositiveRecommendation, true, 'Uninterpreted hard cover note blocks positive recommendation');
      assert.ok(cand.requirementCoverage.quantityConservation, 'Baseline conservation ledger attached via quantity_conservation.js');
    }

    // Also verify standalone summarizeRequirementCoverage + attachCandidateDispositions
    const standalone = [{ skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }] }];
    attachCandidateDispositions(standalone, unintAcc);
    const sum = summarizeRequirementCoverage(standalone[0].requirementCoverage);
    assert.equal(sum.unresolvedCount, 1);
    assert.equal(sum.blocksPositiveRecommendation, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Regression: Verifier findings (English word SKU guard, mixed memory/storage isolation, BOM RAID/Spare row skip, shared conservation & virtual .xlsx path)', () => {
  // 1. Plain English words must never match as SKUs
  const wordExcl = extractRequirementRecords(['No service; exclude servers; must keep exact hardware']);
  assert.equal(wordExcl.records[0].typedValue.metric, 'excludedCategory');
  assert.equal(wordExcl.records[0].typedValue.value, 'service');
  assert.equal(wordExcl.records[1].typedValue.metric, 'excludedCategory');
  assert.equal(wordExcl.records[1].typedValue.value, 'servers');
  assert.equal(wordExcl.records[2].parseStatus, 'UNINTERPRETED');

  const candWithServiceAndServer = {
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
      { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', quantity: 1 }
    ]
  };
  const covWordExcl = evaluateCandidateRequirementCoverage(candWithServiceAndServer, wordExcl);
  assert.equal(covWordExcl.dispositions[0].disposition, DISPOSITIONS.VIOLATED);
  assert.equal(covWordExcl.dispositions[1].disposition, DISPOSITIONS.VIOLATED);
  assert.equal(covWordExcl.dispositions[2].disposition, DISPOSITIONS.UNRESOLVED);

  // 2. Mixed memory + storage clauses never cross-bleed; 16x 64GB DDR5 RDIMMs is memory only
  const mixed = parseTypedClauseValue('512 GB ECC memory and 3.84 TB NVMe SSD');
  assert.deepEqual(
    mixed.extractedMetrics.map(m => [m.domain, m.metric, m.value]),
    [
      ['MEMORY', 'ramCapacityGb', 512],
      ['STORAGE', 'rawStorageTb', 3.84]
    ]
  );

  const dimmArray = parseTypedClauseValue('16x 64GB DDR5 RDIMMs');
  assert.equal(dimmArray.extractedMetrics.some(m => m.domain === 'STORAGE'), false);
  assert.ok(dimmArray.extractedMetrics.some(m => m.metric === 'dimmCount' && m.value === 16));
  assert.ok(dimmArray.extractedMetrics.some(m => m.metric === 'ramCapacityGb' && m.value === 1024));

  // 3. BOM CSV rows containing RAID 1 or Spare in descriptions must not leak into RequirementRecords
  const bomAcc = extractRequirementRecords({
    rawLines: [
      'Product #,Description,Qty',
      'P78279-B21,HPE NS204i-u Gen11+ Boot Device RAID 1,1',
      '845398-B21,HPE 25Gb SFP28 SR Transceiver Spare,4'
    ]
  });
  assert.equal(bomAcc.records.length, 0);

  // 4. Shared infrastructure passes through to quantityConservation & quantityBasis: 'base' is never divided by nodeCount
  const sharedBaseline = [
    { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 4 },
    { sku: 'P69728-B21', description: 'HPE 64GB (1x64GB) DDR5-6400 Smart Memory Kit', quantity: 32 },
    { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR Transceiver', quantity: 4 }
  ];
  const sharedCand = {
    nodeCount: 4,
    skuPartsList: [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 4 },
      { sku: 'P69728-B21', description: 'HPE 64GB (1x64GB) DDR5-6400 Smart Memory Kit', quantity: 8, quantityBasis: 'base' }
    ],
    sharedInfrastructure: [
      { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR Transceiver', quantity: 4 }
    ]
  };
  const sharedCov = evaluateCandidateRequirementCoverage(
    sharedCand,
    extractRequirementRecords(['512 GB per node across 4 nodes']),
    { baselineItems: sharedBaseline }
  );
  assert.equal(sharedCov.dispositions[0].disposition, DISPOSITIONS.SATISFIED);
  assert.equal(sharedCov.quantityConservation.isFullyConserved, true);
  assert.equal(sharedCov.quantityConservation.deficitCount, 0);

  // 5. Inline text with virtual .xlsx options.filePath never throws ENOENT
  const inlineBom = 'Product #,Description,Qty\nP73282-B21,HPE DL380 Gen12 CTO Server,1';
  const parsedVirtual = parseAndConsolidateBOQDetailed(inlineBom, 'virtual_quote.xlsx');
  assert.equal(parsedVirtual.items.length, 1);
  assert.deepEqual(parsedVirtual.coverNoteRecords, []);
  const evalVirtual = evaluateBOQMultiAspect(inlineBom, { filePath: 'virtual_quote.xlsx', targetDir: DL380_GEN12_DIR });
  assert.ok(evalVirtual.requirementAccounting);
});

test('Case 11: solution_evidence fingerprints bind requirementAccounting revision & clauses without disturbing legacy evaluations', () => {
  const { solutionFingerprint, deliveryFingerprint } = require('../../scripts/lib/boq/solution_evidence.js');
  const baseEval = {
    chassis: 'DL380_Gen12',
    items: [{ sku: 'P73282-B21', quantity: 1 }],
    conflictGraph: { rankedSolutions: [{ rank: 1, skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }] }] }
  };

  const reqA = extractRequirementRecords(['512 GB RAM per node', 'max $25,000']);
  const reqB = extractRequirementRecords(['512 GB RAM per node', 'max $20,000']);

  const evalA = { ...baseEval, requirementAccounting: reqA };
  const evalB = { ...baseEval, requirementAccounting: reqB };

  assert.notEqual(solutionFingerprint(baseEval), solutionFingerprint(evalA));
  assert.notEqual(solutionFingerprint(evalA), solutionFingerprint(evalB));
  assert.notEqual(deliveryFingerprint(baseEval), deliveryFingerprint(evalA));
  assert.notEqual(deliveryFingerprint(evalA), deliveryFingerprint(evalB));
});

test('Review regression: RAID requirements never supply candidate RAID evidence', () => {
  const req = extractRequirementRecords('RAID 6');
  const cand = { items: [{ sku: 'P11111-B21', description: '8 TB SAS HDD', quantity: 4 }] };
  const missing = evaluateCandidateRequirementCoverage(cand, req);
  assert.equal(missing.dispositions[0].disposition, DISPOSITIONS.UNRESOLVED);
  assert.equal(missing.blocksPositiveRecommendation, true);
  assert.equal(evaluateCandidateRequirementCoverage({ ...cand, raidLevel: 'RAID 6' }, req).dispositions[0].disposition, DISPOSITIONS.SATISFIED);
});

test('Review regression: required network speed and port count belong to installed adapters', () => {
  const req = extractRequirementRecords('At least 2 ports at 100 GbE per node');
  const low = { sku: 'P11111-B21', description: 'Dual port 1 GbE Ethernet Adapter', quantity: 1 };
  const fast = { sku: 'P33333-B21', description: 'Single port 100 GbE Ethernet Adapter', quantity: 1 };
  const spare = { sku: 'P22222-B21', description: '100 GbE QSFP transceiver spare', quantity: 1, isSpare: true };
  for (const extra of [spare, fast]) {
    const cov = evaluateCandidateRequirementCoverage({ items: [low, extra] }, req);
    assert.equal(cov.dispositions[0].disposition, DISPOSITIONS.VIOLATED);
    assert.equal(cov.blocksPositiveRecommendation, true);
  }
  const cov = evaluateCandidateRequirementCoverage({ items: [low, { ...fast, quantity: 2 }, spare] }, req);
  assert.equal(cov.dispositions[0].disposition, DISPOSITIONS.SATISFIED);

  const qsfpAdapter = { sku: 'P44444-B21', description: 'Intel Ethernet 100Gb 2-port QSFP28 Adapter for HPE', quantity: 1 };
  const qsfpCoverage = evaluateCandidateRequirementCoverage({ items: [qsfpAdapter] }, req);
  assert.equal(qsfpCoverage.dispositions[0].disposition, DISPOSITIONS.SATISFIED);
});
