'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizeConfiguration, outputQuantities } = require('./configuration_context.js');

function groupIdentity(sourceSha256, sheetName, owner, index) {
  return 'group-' + crypto.createHash('sha256').update(JSON.stringify([sourceSha256, sheetName, owner, index])).digest('hex').slice(0, 20);
}
function sourceRows(items) {
  return items.map((item, index) => ({ sourceItemIndex: item.sourceItemIndex ?? index, sku: item.sku, quantity: item.quantity,
    configurationId: item.configurationId || null, parentId: item.parentId || null, subParentId: item.subParentId || null,
    quantityScope: item.quantityScope || null, quantityBasis: item.quantityBasis || null, description: item.description || '' }));
}
function diagnosticGroup(items, metadata, error) {
  return { ...metadata, multiplier: null, items, sourceRows: sourceRows(items), quantityBridge: [],
    blocked: { status: 'ACTION_REQUIRED', error: error.message, code: error.code || 'GROUP_OWNERSHIP_UNRESOLVED' } };
}
function ownedGroup(items, metadata) {
  try {
    const context = normalizeConfiguration(items);
    if (!context.baseChassisQuantity) throw new Error('Group has no owned CTO anchor; node count and facility scope require clarification.');
    const normalized = context.items.map(item => ({ ...item, configurationId: metadata.groupId }));
    const quantityBridge = normalized.map(item => ({ sku: item.sku, quantityScope: item.quantityScope,
      owner: metadata.groupId, ...outputQuantities(item, context.multiplier) }));
    return { ...metadata, multiplier: context.multiplier, items: normalized, sourceRows: sourceRows(items), quantityBridge,
      ownershipEvidence: context.ownershipEvidence };
  } catch (error) { return diagnosticGroup(items, metadata, error); }
}
function quantityTotals(items, quantityField = 'quantity') {
  const totals = new Map();
  for (const item of items) {
    const quantity = Number(item[quantityField]);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Allocation has a non-positive or unsafe quantity for ' + item.sku);
    const total = (totals.get(item.sku) || 0) + quantity;
    if (!Number.isSafeInteger(total)) throw new Error('Allocation quantity overflow for ' + item.sku);
    totals.set(item.sku, total);
  }
  return [...totals].sort((a, b) => a[0].localeCompare(b[0]));
}
function partitionOwnedGroups(items, metadata, splitter) {
  if (items.some(item => item.quantityScope === 'global' || item.parentId || item.subParentId)) throw new Error('Unowned global or nested rows cannot be distributed across inferred groups.');
  const partition = splitter.analyzeAndPartitionClusters(items.map(item => ({ ...item, category: item.category || 'General' })));
  const allocated = partition.clusters.flatMap(cluster => cluster.items.map(item => ({ ...item,
    quantity: item.totalQuantity ?? item.quantity * cluster.multiplier, quantityBasis: 'total' })));
  if (JSON.stringify(quantityTotals(items)) !== JSON.stringify(quantityTotals(allocated))) throw new Error('Splitter changed source SKU quantities or added enablement items; clarify allocation before canonical evaluation.');
  return partition.clusters.map((cluster, index) => {
    const groupId = groupIdentity(metadata.sourceSha256, metadata.sourceSheet, cluster.name, index);
    const ownedItems = cluster.items.map(item => ({ ...item, configurationId: groupId, quantityScope: 'configuration',
      quantityBasis: 'total', quantity: item.totalQuantity ?? item.quantity * cluster.multiplier }));
    return ownedGroup(ownedItems, { ...metadata, groupId, clusterName: cluster.name, displayLabel: cluster.name,
      allocationSourceRows: sourceRows(items), allocationEvidence: 'EXISTING_SPLITTER_EXACT_SKU_TOTAL_CONSERVATION' });
  });
}
function sourceOwnerGroups(items, metadata) {
  const owners = [...new Set(items.map(item => item.configurationId).filter(Boolean))];
  if (!owners.length) return null;
  if (items.some(item => !item.configurationId)) throw new Error('Rows without an owner coexist with explicit configuration owners; clarify their scope.');
  return owners.map((owner, index) => ownedGroup(items.filter(item => item.configurationId === owner), {
    ...metadata, sourceOwner: owner, groupId: groupIdentity(metadata.sourceSha256, metadata.sourceSheet, owner, index),
    clusterName: owner, displayLabel: metadata.sourceSheet + ': ' + owner }));
}
function planSheetGroups(parsed, metadata, splitter) {
  const items = parsed.items.map((item, sourceItemIndex) => ({ ...item, sourceItemIndex }));
  try {
    if (!items.length || parsed.unresolvedRequirements?.length || parsed.unmatchedSkus?.length) throw new Error('Empty or unresolved source rows require intake clarification before grouping.');
    const owned = sourceOwnerGroups(items, metadata);
    if (owned) return owned;
    const cpuSkus = new Set(items.filter(item => /processor|xeon/i.test(item.description || '')).map(item => item.sku));
    const base = ownedGroup(items, metadata);
    if (cpuSkus.size > 1 && base.multiplier > 1) return partitionOwnedGroups(items, metadata, splitter);
    return [base];
  } catch (error) { return [diagnosticGroup(items, metadata, error)]; }
}
function writeGroupInput(group, directory, XLSX) {
  if (group.blocked) return group;
  const rows = [['Part Number', 'Qty', 'Description', 'Unit Price', 'Configuration ID', 'Quantity Scope', 'Quantity Basis']];
  group.items.forEach((item, index) => rows.push([item.sku, group.quantityBridge[index].totalQty, item.description || '',
    item.unitPriceUsd ?? 0, group.groupId, item.quantityScope, 'total']));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Server Config');
  const filePath = path.join(directory, group.groupId + '.xlsx');
  XLSX.writeFile(workbook, filePath);
  return { ...group, filePath, sheetName: 'Server Config', inputSha256: crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
    inputQuantityBasis: 'ORDER_TOTAL_CANONICAL_CONTEXT_NORMALIZES_ONCE' };
}
function planWorkbookGroups(inputFile, workbook, XLSX, projectRoot) {
  const { isNonBomSheet } = require('./boq_parser.js');
  const { parseAndConsolidateBOQDetailed } = require('./boq_evaluator.js');
  const splitter = require('./multi_cluster_splitter.js');
  const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(inputFile)).digest('hex');
  const sheetNames = workbook.SheetNames.filter(name => !isNonBomSheet(name));
  if (!sheetNames.length) throw new Error('No BOQ sheets found');
  const groups = sheetNames.flatMap((sourceSheet, index) => {
    const metadata = { sourceFile: inputFile, sourceSha256, sourceSheet, clusterName: sourceSheet, displayLabel: sourceSheet,
      groupId: groupIdentity(sourceSha256, sourceSheet, 'default', index) };
    const parsed = parseAndConsolidateBOQDetailed(inputFile, inputFile, sourceSheet);
    return planSheetGroups(parsed, metadata, splitter);
  });
  const directory = path.join(projectRoot, 'outputs/temp/split_clusters', crypto.randomUUID());
  fs.mkdirSync(directory, { recursive: true });
  return groups.map(group => writeGroupInput(group, directory, XLSX));
}
module.exports = { planWorkbookGroups, planSheetGroups, ownedGroup, quantityTotals };
