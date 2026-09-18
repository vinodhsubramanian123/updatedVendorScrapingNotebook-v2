'use strict';
const assert = require('node:assert/strict');
const { parseSkuLines } = require('../../scripts/lib/boq/boq_parser');
const { normalizeConfiguration, outputQuantities, applyConfigurationContext } = require('../../scripts/lib/boq/configuration_context');
const { generateMultiRankSolutionCsv, generateMultiRankSolutionWorkbook, generatePartnerPortalUploadBOM, generateProfessionalBOQ } = require('../../scripts/lib/boq/generate_boq_xlsx');
const XLSX = require('xlsx-js-style');

const parsed = parseSkuLines([
  'Product #,Description,Qty',
  'P76706-B21,HPE DL380a Gen12 Configure-to-order Server,20',
  'P76706-B21 B19,HPE DL380a Gen12 Configure-to-order Server,20',
  'P74571-B21,Intel Xeon Processor,40',
  'P69728-F21,HPE Memory Kit,160',
  'HA113A1,HPE Installation Service,1',
  'HA113A1 5A6,HPE Proliant DL/ML Install SVC,20',
  'HU4B2A3,HPE 3Y Tech Care Basic Service,1'
]);
const context = normalizeConfiguration(parsed.items);
assert.equal(context.multiplier, 20);
assert.equal(context.items.find(it => it.sku === 'P74571-B21').quantity, 2);
assert.equal(context.items.find(it => it.sku === 'P69728-F21').quantity, 8);
assert.equal(context.items.find(it => it.sku === 'HA113A1').quantity, 1);
assert.equal(context.items.find(it => it.sku === 'HA113A1 5A6').totalQuantity, 20);
assert.deepEqual(normalizeConfiguration(context.items), context, 'normalization is idempotent');
assert.deepEqual(outputQuantities({ quantity: 40 }, 20), { perNodeQty: 40, nodeMult: 20, totalQty: 800 }, 'base qty divisible by multiplier must not be divided');
assert.deepEqual(outputQuantities({ quantity: 40, quantityScope: 'global' }, 20), { perNodeQty: 40, nodeMult: 1, totalQty: 40 });
assert.throws(() => normalizeConfiguration([...parsed.items, { sku: 'P52534-B21', quantity: 10 }]), /OWNERSHIP_AMBIGUOUS/);
assert.throws(() => normalizeConfiguration([...parsed.items, { sku: 'P12345-B21', description: 'Synergy frame', quantity: 2 }]), /OWNERSHIP_AMBIGUOUS/);
assert.throws(() => normalizeConfiguration([...parsed.items, { sku: 'P12345-B21', parentId: 'other-frame', quantity: 20 }]), /OWNERSHIP_AMBIGUOUS/);
assert.throws(() => normalizeConfiguration([...parsed.items, { sku: 'P12345-B21', quantity: 21 }]), /OWNERSHIP_AMBIGUOUS/);
const branches = parseSkuLines(['CONFIGURATION #1: 20x A', 'P76706-B21,CTO Server,1', 'CONFIGURATION #2: 5x B', 'P76706-B21,CTO Server,1']);
assert.equal(branches.items.length, 2, 'same SKU must not merge across owners');
assert.throws(() => normalizeConfiguration(branches.items), /OWNERSHIP_AMBIGUOUS/);
const metadata = parseSkuLines(['SKU,Description,Qty,Parent ID', 'P74571-B21,Processor,40,frame-2']);
assert.equal(metadata.items[0].parentId, 'frame-2');
assert.throws(() => normalizeConfiguration(metadata.items), /OWNERSHIP_AMBIGUOUS/);
const scopedHeader = parseSkuLines(['CONFIGURATION #1: 20x A', 'SKU,Description,Qty,Quantity Scope', 'P76706-B21,CTO Server,1,configuration', 'HA113A1,HPE Installation Service,1,global']);
assert.equal(scopedHeader.items[0].quantity, 20);
assert.equal(scopedHeader.items[1].quantity, 1, 'global scope must be applied before header multiplication');

const candidate = { rank: 1, name: 'Closest valid solution', physicalMathClean: true, skuPartsList: context.items.filter(it => it.quantityScope !== 'global').map(it => ({ ...it, unitPriceUsd: 10 })) };
const evaluation = applyConfigurationContext({ clusterSizing: { serverCount: 1 }, conflictGraph: { rankedSolutions: [candidate], recommendedSolutions: [candidate] } }, context);
const csv = XLSX.read(generateMultiRankSolutionCsv(evaluation), { type: 'string' });
const rows = XLSX.utils.sheet_to_json(csv.Sheets[csv.SheetNames[0]], { header: 1 });
assert.ok(rows.every(row => row.length === 14), 'CSV header and data widths agree');
const cpu = rows.find(row => row[2] === 'P74571-B21');
assert.deepEqual(cpu.slice(3, 6).map(Number), [2, 20, 40]);
const service = rows.find(row => row[2] === 'HA113A1');
assert.deepEqual(service.slice(3, 6).map(Number), [1, 1, 1]);
const wb = generateMultiRankSolutionWorkbook(evaluation);
let verified = 0;
for (const sheet of Object.values(wb.Sheets)) {
  for (const [address, cell] of Object.entries(sheet)) {
    if (/^D\d+$/.test(address) && cell.f?.startsWith('B')) {
      const row = address.slice(1);
      assert.equal(cell.v, sheet[`B${row}`].v * sheet[`C${row}`].v);
      verified++;
    }
  }
}
assert.equal(verified, context.items.length);
const portal = generatePartnerPortalUploadBOM(evaluation);
const portalRows = XLSX.utils.sheet_to_json(portal.Sheets[portal.SheetNames[0]], { header: 1 });
assert.deepEqual(portalRows.find(row => row[0] === 'P74571-B21').slice(1, 3), [2, 20]);
assert.deepEqual(portalRows.find(row => row[0] === 'HA113A1').slice(1, 3), [1, 1]);
const proposal = generateProfessionalBOQ(evaluation);
const proposalRows = Object.values(proposal.Sheets).flatMap(sheet => XLSX.utils.sheet_to_json(sheet, { header: 1 }));
assert.equal(proposalRows.find(row => row[0] === 'P74571-B21')[1], 40);
console.log('PASS: normalization, ownership ambiguity, branch isolation, service options, idempotency, CSV, MultiRank formulas, Partner Upload and Proposal.');
