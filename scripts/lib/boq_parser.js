'use strict';
/**
 * scripts/lib/boq_parser.js — Shared BOQ Line Parser
 *
 * Extracted from boq_evaluator.js and boq_preprocessor.js to eliminate
 * duplicated SKU extraction logic (Gap G1).
 *
 * Provides a single canonical implementation of:
 * - Multiplier line detection (e.g. "2x HPE DL380 Server Nodes")
 * - SKU extraction via HPE_SKU_EXTRACT_REGEX
 * - Quantity normalization (leading/trailing/explicit qty patterns)
 * - Description cleaning
 * - Item deduplication and consolidation
 */

const { cleanBaseSKU, isValidHpeSKU, HPE_SKU_EXTRACT_REGEX } = require('./sku');

/**
 * Parse an array of text lines, extracting and consolidating valid HPE SKU items.
 * Handles chassis/node multipliers, separator normalization, and quantity detection.
 *
 * @param {string[]} lines Array of raw text lines from BOQ input
 * @returns {{ items: Array<object>, multiplier: number }} Consolidated items and detected multiplier
 */
function parseSkuLines(lines) {
  const itemMap = new Map();
  let currentMultiplier = 1;

  for (const line of lines) {
    // Skip headers
    if (line.toLowerCase().includes('product #') && line.toLowerCase().includes('description')) continue;

    // Detect chassis/node multiplier line (e.g. "2x HPE DL380 Gen12 Server Nodes" or "Multiplier: 2")
    const multMatch = line.match(/^(\d+)\s*x\b/i) || line.match(/\b(\d+)\s*x\s*(?:node|server|chassis|system|unit|quote)\b/i) || line.match(/^(?:multiplier|qty|quantity)[:=\s]*(\d+)\b/i);
    const lineSku = (line.match(HPE_SKU_EXTRACT_REGEX) || [])[1];
    if (multMatch && (!lineSku || !isValidHpeSKU(lineSku))) {
      currentMultiplier = parseInt(multMatch[1], 10) || 1;
    }

    // Normalize separators (/, |, ;, +, -- double dash) without removing single SKU hyphens
    const normalizedLine = line.replace(/[\/\|;\+]|--/g, ' ');

    // Extract all valid SKU matches on the line
    const rawMatches = normalizedLine.match(new RegExp(HPE_SKU_EXTRACT_REGEX.source, 'gi')) || [];
    const validMatches = rawMatches.map(m => cleanBaseSKU(m)).filter(s => s && isValidHpeSKU(s));
    if (validMatches.length === 0) continue;

    for (const cleanSku of validMatches) {
      // Parse line item quantity (default to 1)
      let lineQty = 1;
      const explicitQty = normalizedLine.match(/\b(?:qty|quantity|count)[:=\s]*(\d+)\b/i);
      if (explicitQty) {
        lineQty = parseInt(explicitQty[1], 10) || 1;
      } else {
        const leadingQty = normalizedLine.match(/^(\d+)[\s,\t]+/);
        const trailingQty = normalizedLine.match(/[\s,\t]+(\d+)\s*$/);
        if (leadingQty && validMatches.length === 1) {
          lineQty = parseInt(leadingQty[1], 10) || 1;
        } else if (trailingQty && validMatches.length === 1) {
          lineQty = parseInt(trailingQty[1], 10) || 1;
        }
      }

      const totalQty = lineQty * currentMultiplier;

      // Clean description
      let description = normalizedLine
        .replace(new RegExp(cleanSku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
        .replace(/^[\d\s,\t\-"'\:\;]+/, '')
        .replace(/[\d\s,\t\-"'\:\;]+$/, '')
        .trim();
      if (!description) description = cleanSku;

      if (itemMap.has(cleanSku)) {
        const existing = itemMap.get(cleanSku);
        existing.quantity += totalQty;
      } else {
        itemMap.set(cleanSku, {
          sku: cleanSku,
          description: description,
          quantity: totalQty
        });
      }
    }
  }

  return {
    items: Array.from(itemMap.values()),
    multiplier: currentMultiplier
  };
}

module.exports = {
  parseSkuLines
};
