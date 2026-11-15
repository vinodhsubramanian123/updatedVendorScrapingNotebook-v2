'use strict';

// Header aliases are semantic contracts, not worksheet positions.
const HEADERS = {
  pn: /^(?:p\/?n|part\s*(?:no\.?|number)|sku|product\s*#|item\s*code|material)$/i,
  desc: /^(?:desc(?:ription)?|item\s*(?:desc(?:ription)?|details)|specification|details)$/i,
  qty: /^(?:qty|quantity|units?|count|qty\s*per\s*(?:node|set|server|system))$/i,
  setQty: /^(?:set\s*qty|system\s*qty|cluster\s*qty|node\s*multiplier|servers?|system\s*count|multiplier)$/i,
  price: /^(?:unit\s*price(?:\s*\([^)]*\))?|list\s*price|price)$/i
};
const ACTIONS = {
  MATCHED: 'MATCHED (1:1)',
  MODERNIZED: '[MODERNIZED]',
  REDUCED: '[QTY REDUCED]',
  BUFFERED: '[QTY BUFFERED]',
  REMOVED: '[REMOVED FROM SERVER BUILD]',
  FACTORY_INCLUDED: '[FACTORY INCLUDED / LINE REMOVED]',
  ABSORBED: '[ABSORBED INTO NEW SERVER POOL]',
  ADDED: '[ADDED]',
  NOT_EVALUATED: '[NOT EVALUATED]',
  RECOMMENDED_PRODUCTION_BASELINE: '[RECOMMENDED PRODUCTION BASELINE]',
  FAST_TRACK_CLEARANCE: '[FAST-TRACK / CLEARANCE OPTION]',
  DELIVERY_RISK_WARNING: '[DELIVERY RISK WARNING]'
};

function resolveTenderColumns(headerRow) {
  if (!Array.isArray(headerRow)) throw new Error('Header row must be an array.');
  const map = {};
  for (const [key, pattern] of Object.entries(HEADERS)) {
    const indices = headerRow.flatMap((value, index) => pattern.test(String(value ?? '').trim()) ? [index] : []);
    if (indices.length > 1) throw new Error(`Ambiguous ${key} columns; supply a single table header.`);
    map[key] = indices[0] ?? -1;
  }
  if (map.pn < 0 || map.qty < 0) throw new Error('Part number and quantity headers are required.');
  // Append analysis; existing customer Remarks/Notes are part of the baseline.
  map.remarks = headerRow.length;
  return map;
}

function formatCommercialRemark(action, context = {}) {
  if (!ACTIONS[action]) throw new Error(`Unsupported commercial action: ${action}`);
  const quantity = context.configuredQty;
  const unknownQuantity = action === 'NOT_EVALUATED' && quantity == null;
  if (!unknownQuantity && (!Number.isSafeInteger(quantity) || quantity < 0)) throw new Error('Configured quantity must be a nonnegative integer, or unknown for NOT_EVALUATED.');
  if (action === 'MATCHED' && context.exactMatch !== true) throw new Error('MATCHED requires verified row parity.');
  if (action !== 'MATCHED' && !String(context.reason || '').trim()) throw new Error('A change or unresolved row requires a reason.');
  if (action === 'ABSORBED' && (!context.sourceRef || !context.destinationRef || !context.quantityBridge)) {
    throw new Error('Absorption requires source, destination and quantity bridge.');
  }
  const sku = context.proposedSku || 'Unresolved';
  const bridge = action === 'ABSORBED'
    ? ` [Source: ${context.sourceRef}] [Destination: ${context.destinationRef}] [Quantity bridge: ${context.quantityBridge}]` : '';
  const text = `${ACTIONS[action]} [Proposed SKU: ${sku}] [Configured Qty: ${unknownQuantity ? 'Unresolved' : quantity}]${bridge}${context.reason ? ` ${context.reason}` : ''}`;
  if (/\bucid\b|dummy server|\bhack\b/i.test(text)) throw new Error('Internal portal jargon in generated remark.');
  return text;
}

// Pure row-array adapter. Callers retain workbook cells/formulas/styles and write
// only the appended analysis column; this does not serialize an Excel workbook.
function appendCommercialRemarks(rows, remarksByRow, headerIndex = 0) {
  if (!Array.isArray(rows) || !rows.every(Array.isArray)) throw new Error('Rows must be arrays.');
  if (!Number.isSafeInteger(headerIndex) || headerIndex < 0 || headerIndex >= rows.length) throw new Error('Invalid header row.');
  const columns = resolveTenderColumns(rows[headerIndex]);
  const output = structuredClone(rows);
  columns.remarks = Math.max(...rows.map(row => row.length));
  output[headerIndex][columns.remarks] = 'Engineering Remarks & Configuration Action';
  for (const [key, remark] of Object.entries(remarksByRow)) {
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index <= headerIndex || index >= rows.length) throw new Error('Invalid remark row.');
    output[index][columns.remarks] = formatCommercialRemark(remark.action, remark);
  }
  return { rows: output, columns };
}

/**
 * Dual-track 90-day clearance vs. active production baseline commercial remarks
 * per INV-179 / presales-clearance-strategy-skill.
 *
 * @param {object} [options]
 * @param {string} [options.clearanceSku] - SKU in 90-day / Direct Ship / EOL warning
 * @param {string} [options.productionSku] - Active replacement SKU for production baseline
 * @param {string} [options.deliveryRiskNote] - Optional supply chain or lead-time risk note
 * @returns {{productionRemark:string, clearanceRemark:string, deliveryRiskRemark:string|null, summary:string[]}}
 */
function formatDualTrackClearanceRemarks(options = {}) {
  const {
    clearanceSku = '',
    productionSku = '',
    deliveryRiskNote = ''
  } = options;

  const productionRemark = productionSku
    ? `${ACTIONS.RECOMMENDED_PRODUCTION_BASELINE}: ${productionSku} recommended for new/repeat production rollouts (active lifecycle, full warranty/supply continuity).`
    : `${ACTIONS.RECOMMENDED_PRODUCTION_BASELINE}: Use active lifecycle replacement SKU for new/repeat production rollouts.`;
  const clearanceRemark = clearanceSku
    ? `${ACTIONS.FAST_TRACK_CLEARANCE}: ${clearanceSku} available during 90-day EOL/Direct-Ship clearance window for tactical same-quarter fulfillment only.`
    : `${ACTIONS.FAST_TRACK_CLEARANCE}: Tactical clearance SKU valid only during remaining 90-day window.`;
  const deliveryRiskRemark = deliveryRiskNote
    ? `${ACTIONS.DELIVERY_RISK_WARNING}: ${deliveryRiskNote}`
    : null;

  const summary = [productionRemark, clearanceRemark];
  if (deliveryRiskRemark) summary.push(deliveryRiskRemark);
  return {
    productionRemark,
    clearanceRemark,
    deliveryRiskRemark,
    summary
  };
}

module.exports = {
  resolveTenderColumns,
  formatCommercialRemark,
  appendCommercialRemarks,
  formatDualTrackClearanceRemarks
};
