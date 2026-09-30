'use strict';
/**
 * scripts/lib/scraper/dom_unavailable_rules.js — Universal DOM Extraction for Unavailable/Gated SKUs & Portal Rules
 *
 * Extracts unavailable/conditional SKUs and their explicit portal reasoning rules directly from
 * HPE OCA's WebLogic DOM tree (table.UavailableTable, tr.uavailableTable_tr, .choice_header1,
 * and choice_column_titles_<choiceId>-<reason>).
 *
 * Operates across all product categories without hardcoded SKU or category lists.
 */

/**
 * Generic heuristic classifier for OCA portal ineligibility and gating reasoning text.
 * @param {string} reasonText
 * @returns {string} Rule category identifier
 */
function classifyDomRuleReason(reasonText) {
  if (!reasonText || typeof reasonText !== 'string') return 'MUTUAL_EXCLUSION';
  const lower = reasonText.toLowerCase();

  if (lower.includes('bto')) {
    return 'BTO_DISALLOWED';
  }
  if (lower.includes('ambient') || lower.includes('temperature') || lower.includes('deg')) {
    return 'AMBIENT_GATE';
  }
  if (lower.includes('cto server only') || (lower.includes('supported with') && lower.includes('cto')) || lower.includes('edsff') || lower.includes('chassis')) {
    return 'CHASSIS_GATE';
  }
  if (lower.includes('x4 and x8') || lower.includes('3ds') || lower.includes('memory cannot be mixed') || lower.includes('mixing of memory') || lower.includes('dimm')) {
    return 'MEMORY_MIXING';
  }
  if ((lower.includes('riser') && lower.includes('ocp')) || (lower.includes('cannot be selected together') && lower.includes('slot'))) {
    return 'SLOT_COLLISION';
  }
  if (lower.includes('supported only with') || lower.includes('requires') || lower.includes('must be selected with')) {
    return 'PAIRED_KIT_REQUIRED';
  }
  if (lower.includes('supply constraint') || lower.includes('supply_restricted') || lower.includes('customer specific')) {
    return 'SUPPLY_RESTRICTED';
  }
  return 'MUTUAL_EXCLUSION';
}

/**
 * Pure DOM parser that operates on any DOM document or root element (JSDOM or browser window.document).
 * @param {Document|Element} doc
 * @returns {{ unavailableRules: Array<object>, unavailableSkus: Array<object> }}
 */
function parseUnavailableDomRules(doc) {
  const unavailableRules = [];
  const unavailableSkus = [];
  const seenSkus = new Set();

  if (!doc || !doc.querySelectorAll) {
    return { unavailableRules, unavailableSkus };
  }

  // Find all unavailable tables specifically (avoiding top-level hide_unavailable container)
  const tables = Array.from(doc.querySelectorAll(
    'table.UavailableTable, tr.uavailableTable_tr table, [class*="uavailableTable"], [class*="UavailableTable"]'
  ));

  for (const table of tables) {
    // 1. Extract reasoning text from red header or choice_column_titles id
    let reasonText = '';
    const redHeader = table.querySelector(
      '.choice_header1[style*="red"], .choice_header1.unavailable, [style*="color: red"], [style*="color:red"], .unavailable_header'
    );
    if (redHeader) {
      reasonText = (redHeader.innerText || redHeader.textContent || '').trim();
    }

    if (!reasonText) {
      const colTitle = table.querySelector('tr[id*="choice_column_titles_"]');
      if (colTitle && colTitle.id) {
        const parts = colTitle.id.split('-');
        if (parts.length > 1) {
          reasonText = parts.slice(1).join('-').trim();
        }
      }
    }

    // Clean up whitespace and newlines
    reasonText = reasonText.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!reasonText || reasonText.length < 3) continue;

    // 2. Classify rule type generically
    const ruleType = classifyDomRuleReason(reasonText);

    // 3. Find parent Section / Category name by walking ancestors
    let sectionName = 'General Options';
    let ancestor = table.closest ? table.closest('tr') : null;
    while (ancestor && ancestor.previousElementSibling) {
      ancestor = ancestor.previousElementSibling;
      if (ancestor.classList && (ancestor.classList.contains('section_header') || ancestor.className.includes('section_header'))) {
        const raw = (ancestor.innerText || ancestor.textContent || '').trim();
        sectionName = raw.split(/[\r\n]+/)[0].replace(/Show Subcategories|Collapse All|Expand All/gi, '').trim();
        break;
      }
    }

    const affectedSkusInRule = [];
    const rows = Array.from(table.querySelectorAll('tr.item_tr.unavailable, tr.item_tr[class*="unavailable"], tr.unavailable'));

    for (const tr of rows) {
      const pidEl = tr.querySelector('._pid, .item_prod span._pid, .item_prod, [class*="_pid"]');
      const rawSku = (pidEl ? (pidEl.innerText || pidEl.textContent || '') : '').trim();
      // Clean embedded status prefixes like 'OB\n P45916-B21', 'CS\n P69726-B21', '90\n S3Z84AAE'
      const sku = rawSku.replace(/^(?:OB|CS|90)\s+/i, '').trim();
      if (!sku || sku === 'Product #' || seenSkus.has(sku)) continue;

      const descEl = tr.querySelector('.item_desc, [class*="item_desc"]');
      const desc = (descEl ? (descEl.innerText || descEl.textContent || '') : '').trim();

      const priceEl = tr.querySelector('.item_price, [class*="item_price"]');
      const priceStr = (priceEl ? (priceEl.innerText || priceEl.textContent || '') : '0').replace(/[^0-9.]/g, '');
      const price = parseFloat(priceStr) || 0;

      const startEl = tr.querySelector('.item_start_date');
      const endEl = tr.querySelector('.item_end_date');
      const startDate = (startEl ? (startEl.innerText || startEl.textContent || '') : '').trim();
      const endDate = (endEl ? (endEl.innerText || endEl.textContent || '') : '').trim();

      const badgeEl = tr.querySelector('.td_prod');
      let badge = '';
      const badgeSpan = tr.querySelector('.td_badge, .badge, .item_badge, .badge_txt');
      if (badgeSpan) {
        badge = (badgeSpan.innerText || badgeSpan.textContent || '').trim();
      } else {
        const rawPrefixMatch = rawSku.match(/^(OB|CS|90)\b/i);
        if (rawPrefixMatch) {
          badge = rawPrefixMatch[1].toUpperCase();
        } else if (badgeEl) {
          const clone = badgeEl.cloneNode ? badgeEl.cloneNode(true) : null;
          if (clone && clone.querySelectorAll) {
            clone.querySelectorAll('._pid, [class*="_pid"]').forEach(p => p.remove());
            badge = (clone.innerText || clone.textContent || '').trim();
          } else {
            badge = (badgeEl.innerText || badgeEl.textContent || '').trim();
          }
        }
      }
      const badgeTitle = badgeEl ? (badgeEl.getAttribute('title') || '') : '';

      seenSkus.add(sku);
      affectedSkusInRule.push(sku);

      unavailableSkus.push({
        sku,
        description: desc,
        listPrice: price,
        startDate,
        discontinuedDate: endDate || 'Active',
        section: sectionName,
        ruleType,
        ineligibilityReason: reasonText,
        supplyBadge: badge,
        supplyTitle: badgeTitle,
        isSelectable: false,
        status: 'PORTAL_CONDITIONAL'
      });
    }

    if (affectedSkusInRule.length > 0) {
      unavailableRules.push({
        ruleId: `RULE_${unavailableRules.length + 1}`,
        ruleType,
        section: sectionName,
        reason: reasonText,
        affectedSkusCount: affectedSkusInRule.length,
        affectedSkus: affectedSkusInRule
      });
    }
  }

  return { unavailableRules, unavailableSkus };
}

/**
 * Self-contained client-side expression executed in browser page context via CDP Runtime.evaluate.
 */
const UNAVAILABLE_DOM_EXPRESSION = `(() => {
  const documents = [document];
  try {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(f => {
      try {
        if (f.contentDocument && !documents.includes(f.contentDocument)) {
          documents.push(f.contentDocument);
        }
      } catch (_) {}
    });
  } catch (_) {}

  const classifyReason = (reasonText) => {
    if (!reasonText) return 'MUTUAL_EXCLUSION';
    const lower = reasonText.toLowerCase();
    if (lower.includes('ambient') || lower.includes('temperature') || lower.includes('deg')) return 'AMBIENT_GATE';
    if (lower.includes('cto server only') || (lower.includes('supported with') && lower.includes('cto')) || lower.includes('edsff') || lower.includes('chassis')) return 'CHASSIS_GATE';
    if (lower.includes('x4 and x8') || lower.includes('3ds') || lower.includes('memory cannot be mixed') || lower.includes('mixing of memory') || lower.includes('dimm')) return 'MEMORY_MIXING';
    if ((lower.includes('riser') && lower.includes('ocp')) || (lower.includes('cannot be selected together') && lower.includes('slot'))) return 'SLOT_COLLISION';
    if (lower.includes('supported only with') || lower.includes('requires') || lower.includes('must be selected with')) return 'PAIRED_KIT_REQUIRED';
    if (lower.includes('supply constraint') || lower.includes('supply_restricted') || lower.includes('customer specific')) return 'SUPPLY_RESTRICTED';
    if (lower.includes('bto')) return 'BTO_DISALLOWED';
    return 'MUTUAL_EXCLUSION';
  };

  const unavailableRules = [];
  const unavailableSkus = [];
  const seenSkus = new Set();

  for (const doc of documents) {
    const tables = Array.from(doc.querySelectorAll(
      'table.UavailableTable, tr.uavailableTable_tr table, [class*="uavailableTable"], [class*="UavailableTable"]'
    ));

    for (const table of tables) {
      let reasonText = '';
      const redHeader = table.querySelector(
        '.choice_header1[style*="red"], .choice_header1.unavailable, [style*="color: red"], [style*="color:red"], .unavailable_header'
      );
      if (redHeader) {
        reasonText = (redHeader.innerText || redHeader.textContent || '').trim();
      }

      if (!reasonText) {
        const colTitle = table.querySelector('tr[id*="choice_column_titles_"]');
        if (colTitle && colTitle.id) {
          const parts = colTitle.id.split('-');
          if (parts.length > 1) {
            reasonText = parts.slice(1).join('-').trim();
          }
        }
      }

      reasonText = reasonText.replace(/[\\n\\r\\t]+/g, ' ').replace(/\\s+/g, ' ').trim();
      if (!reasonText || reasonText.length < 3) continue;

      const ruleType = classifyReason(reasonText);

      let sectionName = 'General Options';
      let ancestor = table.closest ? table.closest('tr') : null;
      while (ancestor && ancestor.previousElementSibling) {
        ancestor = ancestor.previousElementSibling;
        if (ancestor.classList && (ancestor.classList.contains('section_header') || ancestor.className.includes('section_header'))) {
          const raw = (ancestor.innerText || ancestor.textContent || '').trim();
          sectionName = raw.split(/[\\r\\n]+/)[0].replace(/Show Subcategories|Collapse All|Expand All/gi, '').trim();
          break;
        }
      }

      const affectedSkusInRule = [];
      const rows = Array.from(table.querySelectorAll('tr.item_tr.unavailable, tr.item_tr[class*="unavailable"], tr.unavailable'));

      for (const tr of rows) {
        const pidEl = tr.querySelector('._pid, .item_prod span._pid, .item_prod, [class*="_pid"]');
        const rawSku = (pidEl ? (pidEl.innerText || pidEl.textContent || '') : '').trim();
        const sku = rawSku.replace(/^(?:OB|CS|90)\\s+/i, '').trim();
        if (!sku || sku === 'Product #' || seenSkus.has(sku)) continue;

        const descEl = tr.querySelector('.item_desc, [class*="item_desc"]');
        const desc = (descEl ? (descEl.innerText || descEl.textContent || '') : '').trim();

        const priceEl = tr.querySelector('.item_price, [class*="item_price"]');
        const priceStr = (priceEl ? (priceEl.innerText || priceEl.textContent || '') : '0').replace(/[^0-9.]/g, '');
        const price = parseFloat(priceStr) || 0;

        const startEl = tr.querySelector('.item_start_date');
        const endEl = tr.querySelector('.item_end_date');
        const startDate = (startEl ? (startEl.innerText || startEl.textContent || '') : '').trim();
        const endDate = (endEl ? (endEl.innerText || endEl.textContent || '') : '').trim();

        const badgeEl = tr.querySelector('.td_prod');
        let badge = '';
        const badgeSpan = tr.querySelector('.td_badge, .badge, .item_badge, .badge_txt');
        if (badgeSpan) {
          badge = (badgeSpan.innerText || badgeSpan.textContent || '').trim();
        } else {
          const rawPrefixMatch = rawSku.match(/^(OB|CS|90)\b/i);
          if (rawPrefixMatch) {
            badge = rawPrefixMatch[1].toUpperCase();
          } else if (badgeEl) {
            const clone = badgeEl.cloneNode ? badgeEl.cloneNode(true) : null;
            if (clone && clone.querySelectorAll) {
              clone.querySelectorAll('._pid, [class*="_pid"]').forEach(p => p.remove());
              badge = (clone.innerText || clone.textContent || '').trim();
            } else {
              badge = (badgeEl.innerText || badgeEl.textContent || '').trim();
            }
          }
        }
        const badgeTitle = badgeEl ? (badgeEl.getAttribute('title') || '') : '';

        seenSkus.add(sku);
        affectedSkusInRule.push(sku);

        unavailableSkus.push({
          sku,
          description: desc,
          listPrice: price,
          startDate,
          discontinuedDate: endDate || 'Active',
          section: sectionName,
          ruleType,
          ineligibilityReason: reasonText,
          supplyBadge: badge,
          supplyTitle: badgeTitle,
          isSelectable: false,
          status: 'PORTAL_CONDITIONAL'
        });
      }

      if (affectedSkusInRule.length > 0) {
        unavailableRules.push({
          ruleId: 'RULE_' + (unavailableRules.length + 1),
          ruleType,
          section: sectionName,
          reason: reasonText,
          affectedSkusCount: affectedSkusInRule.length,
          affectedSkus: affectedSkusInRule
        });
      }
    }
  }

  return JSON.stringify({ unavailableRules, unavailableSkus });
})()`;

/**
 * CDP wrapper to extract unavailable DOM rules and SKUs from active browser session.
 * @param {WebSocket} ws
 * @param {Function} sendCommand
 * @returns {Promise<{ unavailableRules: Array<object>, unavailableSkus: Array<object> }>}
 */
async function extractUnavailableDomRules(ws, sendCommand) {
  try {
    const result = await sendCommand(ws, 'Runtime.evaluate', {
      expression: UNAVAILABLE_DOM_EXPRESSION,
      returnByValue: true
    });
    const parsed = JSON.parse(result.result?.value || '{"unavailableRules":[],"unavailableSkus":[]}');
    return {
      unavailableRules: parsed.unavailableRules || [],
      unavailableSkus: parsed.unavailableSkus || []
    };
  } catch (err) {
    console.warn(`[WARN] [DOM_EXTRACT] Failed to extract unavailable DOM rules: ${err.message}`);
    return { unavailableRules: [], unavailableSkus: [] };
  }
}

module.exports = {
  classifyDomRuleReason,
  parseUnavailableDomRules,
  UNAVAILABLE_DOM_EXPRESSION,
  extractUnavailableDomRules
};
