'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractRequirementRecords } = require('../../scripts/lib/boq/requirements/requirement_records.js');
const { evaluateCandidateRequirementCoverage } = require('../../scripts/lib/boq/requirements/coverage.js');

test('an understood RAM requirement cannot hide a mandatory uninterpreted conjunct', () => {
  const candidate = { items: [{ sku: 'MEMORY', description: '256 GB DDR5 Memory', quantity: 1 }] };
  for (const text of [
    'At least 256 GB RAM and TPM 2.0 mandatory',
    'TPM 2.0 mandatory and at least 256 GB RAM',
    'At least 256 GB RAM plus secure boot required',
    'Prefer 256 GB RAM and TPM 2.0 mandatory'
  ]) {
    const accounting = extractRequirementRecords(text);
    assert.equal(accounting.records[0].parseStatus, 'UNINTERPRETED', text);
    assert.equal(accounting.records[0].rawText, text);
    assert.ok(accounting.records[0].extractedMetrics.some(m => m.metric === 'ramCapacityGb'));
    assert.ok(accounting.records[0].uninterpretedFragments.length > 0);
    assert.equal(accounting.clarificationQuestions[0].severity, 'BLOCKING');
    const coverage = evaluateCandidateRequirementCoverage(candidate, accounting);
    assert.equal(coverage.dispositions[0].disposition, 'UNRESOLVED');
    assert.equal(coverage.blocksPositiveRecommendation, true);
  }
});

test('fully typed compound requirements and contextual support terms remain parsed', () => {
  for (const text of ['At least 256 GB RAM and max 16 DIMMs', '3 year Tech Care Basic support and CDMR']) {
    const accounting = extractRequirementRecords(text);
    assert.equal(accounting.records[0].parseStatus, 'PARSED', text);
    assert.equal(accounting.clarificationQuestions.length, 0);
  }
  const accounting = extractRequirementRecords('At least 256 GB RAM and max 16 DIMMs');
  const candidate = { items: [{ sku: 'MEMORY', description: '64 GB DDR5 Memory', quantity: 4 }] };
  assert.equal(evaluateCandidateRequirementCoverage(candidate, accounting).dispositions[0].disposition, 'SATISFIED');
  const overLimit = { items: [{ sku: 'MEMORY', description: '64 GB DDR5 Memory', quantity: 17 }] };
  assert.equal(evaluateCandidateRequirementCoverage(overLimit, accounting).dispositions[0].disposition, 'VIOLATED');
});

test('usable storage uses the candidate RAID and remains unresolved without it', () => {
  const accounting = extractRequirementRecords('At least 28 TB usable storage with RAID 6');
  const candidate = { items: [{ sku: 'DRIVE', description: '8 TB SAS HDD', quantity: 6 }] };
  const missing = evaluateCandidateRequirementCoverage(candidate, accounting);
  const usableMissing = missing.dispositions[0].metricResults.find(m => m.metric === 'usableStorageTb');
  assert.equal(usableMissing.status, 'UNRESOLVED');
  assert.equal(usableMissing.actual, null);
  const wrongRaid = evaluateCandidateRequirementCoverage({ ...candidate, raidLevel: 'RAID 1' }, accounting);
  const usableWrongRaid = wrongRaid.dispositions[0].metricResults.find(m => m.metric === 'usableStorageTb');
  assert.equal(usableWrongRaid.status, 'VIOLATED');
  assert.equal(usableWrongRaid.actual, 24);
});
