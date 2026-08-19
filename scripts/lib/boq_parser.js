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

const { cleanBaseSKU, isValidHpeSKU, HPE_SKU_EXTRACT_REGEX } = require('./sku.js');

/**
 * Parse an array of text lines, extracting and consolidating valid HPE SKU items.
 * Handles chassis/node multipliers, structured CSV/TSV columns, option suffixes (0D1/B19), and quantity detection.
 *
 * @param {string[]} lines Array of raw text lines from BOQ input
 * @returns {{ items: Array<object>, multiplier: number }} Consolidated items and detected multiplier
 */
function splitStructuredRow(line, delimiter) {
  if (!delimiter) return [line];
  if (delimiter !== ',') return line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
  
  const rawParts = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      rawParts.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += c;
    }
  }
  rawParts.push(current.trim().replace(/^["']|["']$/g, ''));

  // Merge unquoted thousand-separated numbers (e.g. "$5" and "584.00" -> "$5,584.00")
  const merged = [];
  for (let i = 0; i < rawParts.length; i++) {
    const curr = rawParts[i];
    const next = rawParts[i + 1];
    if (curr && /^\$?\d{1,3}$/.test(curr) && next && /^\d{3}(?:\.\d{2})?$/.test(next)) {
      merged.push(`${curr},${next}`);
      i++;
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

function parseSkuLines(lines) {
  const itemMap = new Map();
  let currentMultiplier = 1;
  let activeColumnMap = null;

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (!line) continue;

    // Skip non-line item quote metadata, page footers, and legal disclaimers
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.startsWith('quote #') ||
      lowerLine.startsWith('proposal #') ||
      lowerLine.startsWith('page ') ||
      lowerLine.startsWith('created by') ||
      lowerLine.startsWith('date:') ||
      lowerLine.startsWith('customer:') ||
      lowerLine.startsWith('currency:') ||
      lowerLine.startsWith('terms & conditions') ||
      lowerLine.startsWith('terms and conditions') ||
      lowerLine.startsWith('subtotal') ||
      lowerLine.startsWith('grand total') ||
      lowerLine.startsWith('total estimate')
    ) {
      continue;
    }

    const delimiter = line.includes('\t') ? '\t' : (line.includes(',') ? ',' : (line.includes('|') ? '|' : (line.includes(';') ? ';' : null)));
    
    // Check if line is a table header row (e.g. "Line #, Product Number, Product Description, Qty, Unit Price")
    if (delimiter) {
      const headerCandidates = splitStructuredRow(line, delimiter).map(c => c.toLowerCase());
      const hasSkuHeader = headerCandidates.some(c => c.includes('product') || c.includes('part') || c.includes('sku') || c.includes('item #') || c.includes('pos'));
      const hasDescOrQtyHeader = headerCandidates.some(c => c.includes('description') || c.includes('qty') || c.includes('quantity') || c.includes('price') || c.includes('units'));

      if (hasSkuHeader && hasDescOrQtyHeader) {
        // Build dynamic column map for subsequent rows with strict precedence
        const map = { sku: -1, desc: -1, qty: -1, price: -1 };
        
        headerCandidates.forEach((col, idx) => {
          // SKU Column Precedence (do NOT mistake Line#/Item# for SKU)
          if (col.includes('product number') || col.includes('part number') || col.includes('product #') || col.includes('part #') || col.includes('sku') || col === 'pn' || col === 'p/n' || col === 'material') {
            map.sku = idx;
          } else if (map.sku === -1 && (col === 'product' || col === 'part')) {
            map.sku = idx;
          }

          // Description Column Precedence
          if (col.includes('description') || col.includes('product name') || col.includes('item description') || col === 'bezeichnung' || col === 'text') {
            map.desc = idx;
          }

          // Quantity Column Precedence
          if (col === 'qty' || col === 'quantity' || col === 'menge' || col === 'count' || col === 'units' || col.includes('quantity') || col.includes('qty')) {
            map.qty = idx;
          }

          // Unit Price Column Precedence
          if (col.includes('unit price') || col.includes('einzelpreis') || col.includes('net price') || col.includes('list price') || col === 'price' || col === 'preis') {
            map.price = idx;
          }
        });

        if (map.sku !== -1 || map.desc !== -1 || map.qty !== -1) {
          activeColumnMap = map;
          continue; // Header row processed successfully
        }
      }
    }

    // Detect chassis/node multiplier line (e.g. "2x HPE DL380 Gen12 Server Nodes" or "Multiplier: 2")
    const multMatch = line.match(/^(\d+)\s*x\b/i) || line.match(/\b(\d+)\s*x\s*(?:node|server|chassis|system|unit|quote)\b/i) || line.match(/^(?:multiplier|qty|quantity)[:=\s]*(\d+)\b/i);
    const lineSku = (line.match(HPE_SKU_EXTRACT_REGEX) || [])[1];
    if (multMatch && (!lineSku || !isValidHpeSKU(lineSku))) {
      currentMultiplier = parseInt(multMatch[1], 10) || 1;
      continue;
    }

    // Process structured line using activeColumnMap or dynamic column detection
    if (delimiter) {
      const parts = splitStructuredRow(line, delimiter);
      if (parts.length >= 2) {
        let skuIndex = activeColumnMap && activeColumnMap.sku !== -1 ? activeColumnMap.sku : -1;
        let descIndex = activeColumnMap && activeColumnMap.desc !== -1 ? activeColumnMap.desc : -1;
        let qtyIndex = activeColumnMap && activeColumnMap.qty !== -1 ? activeColumnMap.qty : -1;
        let priceIndex = activeColumnMap && activeColumnMap.price !== -1 ? activeColumnMap.price : -1;

        // Auto-detect SKU column if not established by header map
        if (skuIndex === -1 || !parts[skuIndex] || !isValidHpeSKU(cleanBaseSKU(parts[skuIndex]))) {
          for (let i = 0; i < parts.length; i++) {
            const clean = cleanBaseSKU(parts[i]);
            if (clean && isValidHpeSKU(clean)) {
              skuIndex = i;
              break;
            }
          }
        }

        if (skuIndex !== -1) {
          const rawSkuPart = parts[skuIndex];
          const cleanSku = cleanBaseSKU(rawSkuPart);

          if (cleanSku && isValidHpeSKU(cleanSku)) {
            // Find Quantity
            let lineQty = 1;
            if (qtyIndex !== -1 && parts[qtyIndex]) {
              const parsedQ = parseInt(parts[qtyIndex].replace(/[^\d]/g, ''), 10);
              if (!isNaN(parsedQ) && parsedQ > 0) lineQty = parsedQ;
            } else {
              // Search remaining columns for integer quantity
              for (let i = 0; i < parts.length; i++) {
                if (i === skuIndex || i === descIndex || i === priceIndex) continue;
                const p = parts[i];
                if (/^\d+$/.test(p)) {
                  const q = parseInt(p, 10);
                  if (q > 0 && q < 100000) {
                    lineQty = q;
                    break;
                  }
                }
              }
            }

            // Find Description
            let rawDescPart = '';
            if (descIndex !== -1 && parts[descIndex]) {
              rawDescPart = parts[descIndex];
            } else {
              // Find longest non-SKU, non-numeric column as description
              let longest = '';
              for (let i = 0; i < parts.length; i++) {
                if (i === skuIndex) continue;
                const p = parts[i];
                if (p.length > longest.length && !/^\$?[\d,.]+%?$/.test(p)) {
                  longest = p;
                }
              }
              rawDescPart = longest;
            }

            // Find Unit Price
            let unitPriceUsd = 0;
            if (priceIndex !== -1 && parts[priceIndex]) {
              const num = parseFloat(parts[priceIndex].replace(/[^0-9.]/g, ''));
              if (!isNaN(num)) unitPriceUsd = num;
            } else {
              for (let i = 0; i < parts.length; i++) {
                if (i === skuIndex || i === descIndex || i === qtyIndex) continue;
                const priceMatch = parts[i].match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2})\b/);
                if (priceMatch) {
                  const num = parseFloat(priceMatch[1].replace(/,/g, ''));
                  if (!isNaN(num) && num > 0) {
                    unitPriceUsd = num;
                    break;
                  }
                }
              }
            }

            const isFioLine = rawSkuPart.includes('0D1') || rawSkuPart.includes('B19') || rawDescPart.toLowerCase().includes('factory integrated');
            const totalQty = lineQty * currentMultiplier;

            if (itemMap.has(cleanSku)) {
              const existing = itemMap.get(cleanSku);
              if (isFioLine) {
                existing.isFactoryIntegrated = true;
              } else {
                existing.quantity += totalQty;
              }
              if (unitPriceUsd > 0 && !existing.unitPriceUsd) existing.unitPriceUsd = unitPriceUsd;
            } else {
              itemMap.set(cleanSku, {
                sku: cleanSku,
                description: rawDescPart && !rawDescPart.toLowerCase().includes('factory integrated') ? rawDescPart : cleanSku,
                quantity: totalQty,
                unitPriceUsd: unitPriceUsd || 0,
                extendedPriceUsd: (unitPriceUsd || 0) * totalQty,
                isFactoryIntegrated: isFioLine
              });
            }
            continue;
          }
        }
      }
    }

    // Fallback: Free-form text line parsing
    const normalizedLine = line.replace(/[\/\|;\+]|--/g, ' ');
    const rawMatches = normalizedLine.match(new RegExp(HPE_SKU_EXTRACT_REGEX.source, 'gi')) || [];
    const validMatches = rawMatches.map(m => cleanBaseSKU(m)).filter(s => s && isValidHpeSKU(s));
    if (validMatches.length === 0) continue;

    for (const cleanSku of validMatches) {
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

      const isFioLine = line.includes('0D1') || line.includes('B19') || line.toLowerCase().includes('factory integrated');
      const totalQty = lineQty * currentMultiplier;

      let cleanDesc = normalizedLine
        .replace(new RegExp(cleanSku.replace('-', '[-]'), 'gi'), '')
        .replace(/\b\d+\s*x\b/gi, '')
        .replace(/\b(?:qty|quantity|count)[:=\s]*\d+\b/gi, '')
        .replace(/^\d+[\s,\t]+/, '')
        .replace(/[\s,\t]+\d+$/, '')
        .replace(/\b0D1\b|\bB19\b|\bB21\b/gi, '')
        .replace(/["$`]/g, '')
        .trim();

      if (cleanDesc.length < 3 || cleanDesc.toLowerCase() === cleanSku.toLowerCase()) {
        cleanDesc = cleanSku;
      }

      if (itemMap.has(cleanSku)) {
        const existing = itemMap.get(cleanSku);
        if (isFioLine) {
          existing.isFactoryIntegrated = true;
        } else {
          existing.quantity += totalQty;
        }
      } else {
        itemMap.set(cleanSku, {
          sku: cleanSku,
          description: cleanDesc,
          quantity: totalQty,
          unitPriceUsd: 0,
          extendedPriceUsd: 0,
          isFactoryIntegrated: isFioLine
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
