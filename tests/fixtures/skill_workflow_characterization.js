'use strict';
// CP0 fixtures characterize exact local contracts, never vendor acceptance.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const VALID_ROWS = Object.freeze([
  ['P73282-B21', 1], ['P87302-B21', 2], ['P69728-F21', 16],
  ['P49146-B21', 1], ['P49145-B21', 2], ['P44712-B21', 2], ['873763-B21', 1],
  ['P73325-B21', 1], ['R7A11AAE', 1], ['P79558-B21', 1]
].map(Object.freeze));
const EXPORT_FIXTURE = Object.freeze({ clock: '2026-10-05T00:00:00.000Z',
  signingKey: 'PUBLIC_CP0_EXPORT_CONTRACT_FIXTURE_KEY_NOT_A_PRODUCTION_SECRET',
  source: 'tests/unit/test_core_workflow_contracts.js:232',
  meaning: 'SYNTHETIC_EXPORTER_CONTRACT_ONLY_NO_HARDWARE_OR_VENDOR_ACCEPTANCE' });
function exporterCandidate() {
  return { chassis: 'DL380_Gen12', acceptanceGate: { isValid: true, status: 'PASSED', blockersCount: 0, blockers: [] },
    items: [{ sku: 'P74573-B21', quantity: 2, unitPriceUsd: 1200 }],
    rankedSolutions: [{ rank: 1, name: 'Rank 1: Preserved Intent',
      skuPartsList: [{ sku: 'P74573-B21', quantity: 2, unitPriceUsd: 1200 }] }] };
}
function localFixture(root) {
  const relative = 'outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_Catalog.json';
  const catalogBytes = fs.readFileSync(path.join(root, relative)), catalog = JSON.parse(catalogBytes);
  const servicesRelative = relative.replace('_Catalog.json', '_Services.json');
  const serviceBytes = fs.readFileSync(path.join(root, servicesRelative)), services = JSON.parse(serviceBytes);
  const deltaRelative = 'outputs/ProLiant/Gen12/DL380_Gen12/catalog_deltas.json';
  const deltaBytes = fs.readFileSync(path.join(root, deltaRelative)), deltas = JSON.parse(deltaBytes);
  const rows = [...catalog.entries, ...services.entries].flatMap(group => (group.skus || []).map(row => ({ ...row, parentCategory: group.parentCategory })));
  const selected = VALID_ROWS.map(([sku, quantity]) => {
    const row = rows.find(candidate => (candidate.sku || candidate['Product #']) === sku);
    if (!row || row.lifecycleStatus !== 'Active' || typeof row.Description !== 'string') throw new Error('CP0 fixture requires exact active catalog row: ' + sku);
    return { sku, quantity, description: row.Description, category: row.parentCategory,
      prerequisiteRuleId: deltas.find(delta => delta.affectedSku === 'P73282-B21' && delta.requiredDependencySku === sku)?.deltaId || null,
      visibilityState: row.visibilityState || 'CATALOG_VISIBLE', provenance: row.provenance || 'EXACT_ARCHIVED_CATALOG_ROW' };
  });
  const csv = 'Product #,Description,Qty\n' + selected.map(row => [row.sku, '"' + row.description.replaceAll('"','""') + '"', row.quantity].join(',')).join('\n') + '\n';
  return { csv, rows: selected, catalog: { path: relative, sha256: crypto.createHash('sha256').update(catalogBytes).digest('hex') },
    services: { path: servicesRelative, sha256: crypto.createHash('sha256').update(serviceBytes).digest('hex') },
    learnedDependencies: { path: deltaRelative, sha256: crypto.createHash('sha256').update(deltaBytes).digest('hex') },
    scope: 'SINGLE_NODE_COMPUTE_ONLY_LOCAL_PHYSICAL_RULE_CONTROL',
    limits: ['No boot/storage workload is requested.', 'Catalog conditional visibility is not live compatibility or ordering acceptance.', 'Offline grounding and vendor validation remain pending.'] };
}
module.exports = { VALID_ROWS, EXPORT_FIXTURE, exporterCandidate, localFixture };
