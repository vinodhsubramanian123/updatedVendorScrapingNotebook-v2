'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  loadZeroPricePolicies,
  classifyConfirmedZeroByPolicy,
  isConfirmedZeroByPolicy,
  isSuspectedDateParseInteger,
  parseStrictPrice,
  reconcileConflictingPrices,
  parseLeadTimeOrEta,
  normalizeLifecycleCanonical,
  buildAvailabilityContract,
  classifyRowType
} = require('../../scripts/lib/catalog/field_parsers.js');

describe('field_parsers — strict price, zero policy, date-integer & conflict parsing', () => {
  it('parses valid USD currency strings and integers into PRICED state', () => {
    const p1 = parseStrictPrice('$1,234.50');
    assert.equal(p1.priceState, 'PRICED');
    assert.equal(p1.priceUsd, 1234.5);

    const p2 = parseStrictPrice('  109,990.00 USD ');
    assert.equal(p2.priceState, 'PRICED');
    assert.equal(p2.priceUsd, 109990);

    const p3 = parseStrictPrice(111990);
    assert.equal(p3.priceState, 'PRICED');
    assert.equal(p3.priceUsd, 111990);
  });

  it('keeps unpriced placeholders strictly null under UNPRICED state', () => {
    for (const raw of ['', null, undefined, 'Unpublished', 'Not published by OCA', 'N/A', 'TBD', '—']) {
      const res = parseStrictPrice(raw);
      assert.equal(res.priceUsd, null);
      assert.equal(res.priceState, 'UNPRICED');
    }
  });

  it('rejects dates, malformed deltas, negatives, and ranges as PARSE_FAILED', () => {
    for (const bad of ['10/23/2017', '2026-08-24', 'Oct 23, 2017', '$1,000 -> $1,200', '$500 (was $400)', '-$50.00', '$100 - $200']) {
      const res = parseStrictPrice(bad);
      assert.equal(res.priceUsd, null, `expected null for ${bad}`);
      assert.equal(res.priceState, 'PARSE_FAILED', `expected PARSE_FAILED for ${bad}`);
    }
  });

  it('flags shifted columns, lifecycle badges, and SKU-prefix leaks without fabricating prices', () => {
    const shifted = parseStrictPrice('P71117-B21');
    assert.equal(shifted.priceUsd, null);
    assert.equal(shifted.priceState, 'PARSE_FAILED');
    assert.equal(shifted.priceStatus, 'SHIFTED_COLUMN_REJECTED');

    const badge = parseStrictPrice('[OB]');
    assert.equal(badge.priceState, 'PARSE_FAILED');
    assert.equal(badge.priceStatus, 'SHIFTED_COLUMN_REJECTED');

    const skuPrefixLeak = parseStrictPrice(71117, {
      row: { sku: '71117-B21', Description: 'HPE 64GB DDR5 DIMM' }
    });
    assert.equal(skuPrefixLeak.priceUsd, null);
    assert.equal(skuPrefixLeak.priceState, 'PARSE_FAILED');
    assert.equal(skuPrefixLeak.priceStatus, 'SHIFTED_COLUMN_REJECTED');
  });

  it('distinguishes 7-8 digit MMDDYYYY/YYYYMMDD integer dates from legitimate 6-digit prices', () => {
    assert.equal(isSuspectedDateParseInteger(10232017), true);
    assert.equal(isSuspectedDateParseInteger(20241023), true);
    assert.equal(isSuspectedDateParseInteger(3062023), true);
    assert.equal(isSuspectedDateParseInteger(111990), false);

    const rejected = parseStrictPrice(10232017);
    assert.equal(rejected.priceUsd, null);
    assert.equal(rejected.priceState, 'PARSE_FAILED');
    assert.equal(rejected.reason, 'SUSPECTED_DATE_PARSE_INTEGER');
  });

  it('enforces config-driven zero-price policies without conflating unconfirmed hardware zeroes', () => {
    const policies = loadZeroPricePolicies();
    assert.ok(Array.isArray(policies.confirmedZeroParentContracts) && policies.confirmedZeroParentContracts.includes('HA113A1'));

    const contractZero = parseStrictPrice('$0.00', { sku: 'HA113A1', description: 'HPE Installation Service' });
    assert.equal(contractZero.priceState, 'CONFIRMED_ZERO');
    assert.equal(contractZero.priceStatus, 'CONFIRMED_ZERO_CONTRACT');
    assert.equal(contractZero.zeroConfirmed, true);

    const fioZero = parseStrictPrice(0, { sku: 'P35876-B21', description: 'FIO Enablement Kit' });
    assert.equal(fioZero.priceState, 'CONFIRMED_ZERO');
    assert.equal(fioZero.priceStatus, 'CONFIRMED_ZERO_FIO');
    assert.equal(isConfirmedZeroByPolicy('P35876-B21', 'FIO Enablement Kit'), true);

    const unconfirmedZero = parseStrictPrice('$0.00', { sku: 'P01366-B21', description: 'HPE 64GB DDR5 Memory Kit' });
    assert.equal(unconfirmedZero.priceState, 'ZERO_UNCONFIRMED');
    assert.equal(unconfirmedZero.zeroConfirmed, false);
    assert.equal(classifyConfirmedZeroByPolicy('P01366-B21', 'HPE 64GB DDR5 Memory Kit').matched, false);
  });

  it('reconciles agreeing prices and surfaces CONFLICTING_EVIDENCE on divergence', () => {
    const aligned = reconcileConflictingPrices([
      { source: 'Catalog', raw: '$1,250.00' },
      { source: 'Services', raw: 1250 }
    ]);
    assert.equal(aligned.priceState, 'PRICED');
    assert.equal(aligned.priceUsd, 1250);

    const diverged = reconcileConflictingPrices([
      { source: 'Catalog', raw: '$1,250.00' },
      { source: 'History', raw: '$1,850.00' }
    ]);
    assert.equal(diverged.priceUsd, null);
    assert.equal(diverged.priceState, 'CONFLICTING_EVIDENCE');
    assert.equal(diverged.conflicts.length, 2);
  });
});

describe('field_parsers — lead time, lifecycle, availability & row type', () => {
  it('parses en-dash week/month ranges accurately and refuses ETA dates as numeric days', () => {
    const weeks = parseLeadTimeOrEta('6\u20138 weeks');
    assert.equal(weeks.unit, 'WEEKS');
    assert.equal(weeks.minDays, 42);
    assert.equal(weeks.maxDays, 56);
    assert.equal(weeks.days, 49);
    assert.equal(weeks.isPublished, true);

    const months = parseLeadTimeOrEta('2-3 months');
    assert.equal(months.unit, 'MONTHS');
    assert.equal(months.minDays, 60);
    assert.equal(months.maxDays, 90);
    assert.equal(months.days, 75);

    const eta = parseLeadTimeOrEta('ETA 2026-12-01');
    assert.equal(eta.rawType, 'ETA_DATE');
    assert.equal(eta.days, null);
    assert.equal(eta.etaDate, '2026-12-01');
    assert.equal(eta.isPublished, true);

    const unpublished = parseLeadTimeOrEta('Built to Order');
    assert.equal(unpublished.days, null);
    assert.equal(unpublished.isPublished, false);
  });

  it('normalizes canonical lifecycle and builds decoupled availability contracts', () => {
    assert.equal(normalizeLifecycleCanonical('[OB] End of life').lifecycleCanonical, 'Obsolete');
    assert.equal(normalizeLifecycleCanonical('90-Day Warning').lifecycleBadge, '90');
    assert.equal(normalizeLifecycleCanonical('Direct Ship [DS]').lifecycleCanonical, 'Direct Ship');
    assert.equal(normalizeLifecycleCanonical('Active').lifecycleCanonical, 'Active');
    assert.equal(normalizeLifecycleCanonical('Hidden / Conditional').lifecycleCanonical, 'Unknown');

    const hiddenContract = buildAvailabilityContract({
      skuRow: { sku: 'P69999-B21', visibility: 'SELECTOR_HIDDEN', lifecycleStatus: 'Active' },
      conditionalEntry: { condition: 'Requires High-Perf Fan Kit' }
    });
    assert.equal(hiddenContract.visibility, 'SELECTOR_HIDDEN');
    assert.equal(hiddenContract.availability, 'PORTAL_CONDITIONAL');
    assert.equal(hiddenContract.compatibility, 'CONDITIONAL');
  });

  it('classifies base systems, support, software, internal FIO rows, and hardware options', () => {
    assert.equal(classifyRowType({ sku: 'P71100-B21', parentCategory: 'Base Chassis', Description: 'DL380 Gen12 CTO Server' }, { isBase: true }), 'BASE_SYSTEM');
    assert.equal(classifyRowType({ sku: 'HU4B2A3', parentCategory: 'Services', Description: 'HPE 3Y Tech Care Basic Service' }), 'SUPPORT_SERVICE');
    assert.equal(classifyRowType({ sku: 'R7A11AAE', parentCategory: 'Software', Description: 'Compute Ops Management 3yr SaaS Subscription' }), 'SOFTWARE_SUBSCRIPTION');
    assert.equal(classifyRowType({ sku: 'S1P01AAE', Description: 'HPE Software Subscription with 3Y Support' }), 'SOFTWARE_SUBSCRIPTION');
    assert.equal(classifyRowType({ sku: 'S2L70C', Description: 'NVIDIA H100 Support Kit' }), 'HARDWARE_OPTION');
    assert.equal(classifyRowType({ sku: 'P35876-B21', Description: 'HPE FIO Enablement Option' }), 'INTERNAL_CONFIGURATION');
    assert.equal(classifyRowType({ sku: 'P64707-B21', parentCategory: 'Memory', Description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Kit' }), 'HARDWARE_OPTION');
    assert.equal(classifyRowType({ sku: 'R8W23AAE', parentCategory: 'Graphics & GPU', Description: 'HPE ML Dev Env SW 1-19 GPU 1yr Sub E-RTU' }), 'SOFTWARE_SUBSCRIPTION');
    assert.equal(classifyRowType({ sku: 'R9H29AAE', Description: 'NVIDIA AI Enterprise L40S 3yr Sub E-RTU' }), 'SOFTWARE_SUBSCRIPTION');
    assert.equal(classifyRowType({ sku: 'R7J59AAE', parentCategory: 'Storage Controllers', Description: 'Intel VROC Standard 1yr E-RTU' }), 'SOFTWARE_SUBSCRIPTION');
    assert.equal(classifyRowType({ sku: 'S3Q39AAE', parentCategory: 'Storage Controllers', Description: 'Intel VROC Premium 1-pack E-RTU' }), 'SOFTWARE_SUBSCRIPTION');
    assert.equal(classifyRowType({ sku: 'H36XCA1#006', parentCategory: 'Graphics & GPU', Description: 'HPE GPU on RHOCP Integrat SVC' }), 'SUPPORT_SERVICE');
    assert.equal(classifyRowType({ sku: 'S7J51C', parentCategory: 'Graphics & GPU', Description: 'NVIDIA RTX Pro 5000 48GB Spl GPU' }), 'HARDWARE_OPTION');
    assert.equal(classifyRowType({ sku: '803-DELL3Y', Description: 'Dell PowerEdge ProSupport Plus 3Yr Service' }), 'SUPPORT_SERVICE');
    assert.equal(classifyRowType({ sku: 'CON-SNT-C240', Description: 'Cisco SmartNet Total Care 3Yr Support' }), 'SUPPORT_SERVICE');
  });
});
