'use strict';
const cdp = require('./cdp.js');

async function captureOwnedServiceTab(ws, href, api, tables, texts) {
  ws._unscopedServiceTables = await api.extractTablesAsRows(ws, href);
  const deepOwner = ws._captureDeepOwner;
  const scoped = await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // COMPONENT_SERVICE_TREE
      const data = Array.from(document.querySelectorAll('#sui-components-tree tr'))
        .map(row => window.jQuery?.ui?.fancytree?.getNode(row)?.data).filter(row => row?.subConfId);
      return { treeRows: data.length, owners: data
        .filter(row => (row.product_number || row.productNumber || row.ucid) === ${JSON.stringify(ws._captureComponentSku)} &&
          (${!deepOwner} || row.subConfId === ${JSON.stringify(deepOwner?.ownerId || null)}))
        .map(row => ({ owner: row.subConfId, support: row.reactiveSupport, install: row.installService })) };
    })()`, returnByValue: true
  });
  const evidence = scoped.result?.value;
  if (!evidence?.treeRows) throw new Error('COMPONENT_SERVICE_TREE_NOT_LOADED');
  const { owners, treeRows } = evidence;
  const scope = owners.length ? 'OBSERVED_SELECTED_SERVICES_ONLY'
    : (deepOwner ? 'EXACT_SERVICE_OWNER_UNVERIFIED' : 'OWNER_ABSENT_IN_OBSERVED_SERVICE_TREE');
  ws._componentServiceEvidence = { scope, owners, treeRows,
    unexecuted: ['alternative service types, terms and tiers', 'parent-level support changes'] };
  const rows = [['Product #', 'Description', 'Price (USD)', 'Owner Configuration', 'Evidence Scope']];
  for (const owner of owners) for (const value of [owner.support, owner.install]) {
    const match = String(value || '').match(/^([A-Z0-9]+(?:#[A-Z0-9]+)?)\s+(.+)$/);
    if (match) rows.push([match[1], match[2], '', owner.owner, 'Observed selected service; alternatives not enumerated']);
  }
  if (rows.length > 1) tables.push({ tableId: 'component_owned_services', rows, rowCount: rows.length });
  texts.push(`Support Services: ${scope}. Alternative service branches remain unexecuted.`);
}

// Capture each live view before navigating away. Browser-side timers spanning
// multiple WebLogic tab changes can retain stale widgets or lose earlier data.
async function captureSupplementalCatalogTabs(ws, pattern, api = cdp) {
  const discovery = await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => { // CATALOG_TAB_LIST
      const match = new RegExp(${JSON.stringify(pattern)}, 'i');
      return Array.from(document.querySelectorAll('a.ui-tabs-anchor'))
        .filter(el => el.getClientRects().length && match.test((el.innerText || '').trim()))
        .map(el => el.getAttribute('href')).filter(href => href?.startsWith('#') && href !== '#extended_overview_menu');
    })()`, returnByValue: true
  });
  const tables = [];
  const texts = [];
  try {
    for (const href of new Set(discovery.result?.value || [])) {
      if (ws._captureDeepOwner && ['#extended_overview_svc', '#extended_overview_bom'].includes(href)) continue;
      await selectCatalogTab(ws, href, api);
      if (ws._captureComponentSku && href === '#extended_overview_suisvc') {
        await captureOwnedServiceTab(ws, href, api, tables, texts);
        continue;
      }
      tables.push(...await api.extractTablesAsRows(ws, href));
      const paneTextRes = await api.sendCommand(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const pane = document.getElementById(${JSON.stringify(href.slice(1))}) || document.querySelector(${JSON.stringify(href)});
          return (pane?.innerText || '').trim();
        })()`,
        returnByValue: true
      });
      const paneText = paneTextRes?.result?.value;
      if (typeof paneText === 'string' && paneText.length > 0) {
        texts.push(paneText);
      } else if (typeof api.extractChunkedText === 'function') {
        texts.push((await api.extractChunkedText(ws, 50000)).fullText);
      }
    }
  } finally {
    await selectCatalogTab(ws, '#extended_overview_menu', api);
  }
  if (ws._captureComponentSku && !ws._componentServiceEvidence) {
    ws._componentServiceEvidence = { scope: 'COMPONENT_SERVICE_VIEW_UNAVAILABLE', owners: [],
      unexecuted: ['component-owned service selections and alternatives'] };
  }
  return { tables, fullText: texts.join('\n') };
}

const EXPECTED_TABLE_COLUMN_GROUPS = Object.freeze({
  sku: /(?:product\s*#|part\s*number|sku)/i,
  description: /description/i,
  price: /(?:unit\s*price|list\s*price|price\s*\(usd\))/i,
  leadTime: /lead\s*time/i,
  lifecycleDates: /(?:start\s*date|discontinued\s*date)/i
});

async function verifyExpectedCatalogColumns(ws, api = cdp) {
  const sendCmd = typeof api === 'function' ? api : api?.sendCommand;
  if (typeof sendCmd !== 'function') {
    return { verified: false, present: {}, missing: Object.keys(EXPECTED_TABLE_COLUMN_GROUPS), error: 'Missing sendCommand transport' };
  }
  try {
    const res = await sendCmd(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const headerTexts = Array.from(document.querySelectorAll('table tr:nth-child(-n+4) th, table thead th, table tr:nth-child(-n+4) td'))
          .map(el => (el.innerText || '').trim())
          .filter(Boolean);
        return [...new Set(headerTexts)].slice(0, 200);
      })()`,
      returnByValue: true
    });
    const observedHeaders = Array.isArray(res?.result?.value) ? res.result.value : [];
    const present = {};
    const missing = [];
    for (const [key, regex] of Object.entries(EXPECTED_TABLE_COLUMN_GROUPS)) {
      const ok = observedHeaders.some(h => regex.test(h));
      present[key] = ok;
      if (!ok) missing.push(key);
    }
    return { verified: observedHeaders.length > 0 && present.sku && present.description, present, missing, observedHeaders };
  } catch (err) {
    return { verified: false, present: {}, missing: Object.keys(EXPECTED_TABLE_COLUMN_GROUPS), error: err.message };
  }
}

const BROWSER_TAB_CHECK_SCRIPT = `(() => {
  function dismissDialogs() {
    for (const b of document.querySelectorAll('.modal-dialog button, .ui-dialog button, .dialog-button, .popup-button, .modal-footer button, .ui-dialog-titlebar-close')) {
      const txt = (b.innerText || b.value || '').trim();
      if (/^(?:yes|ok|confirm|leave|proceed|continue|accept|allow|close|dismiss|resume session|resume current session)$/i.test(txt) || b.classList.contains('ui-dialog-titlebar-close')) {
        try { b.click(); } catch (_) {}
      }
    }
  }
  dismissDialogs();

  function isBlockingElement(el) {
    if (el.offsetWidth <= 100 || el.offsetHeight <= 100) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (el.id === 'loading_div' || el.id === 'dqe-loading-overlay') return true;
    if (el.classList.contains('blockOverlay') && parseFloat(style.opacity || '0') > 0.1) return true;
    return false;
  }
  const globalBusy = Array.from(document.querySelectorAll('#loading_div, #dqe-loading-overlay, .blockOverlay')).some(isBlockingElement);
  if (globalBusy) return false;

  const pane = document.getElementById(__TARGET_ID__);
  if (!pane || !pane.getClientRects().length) {
    _activateTab(__HREF__);
    return false;
  }

  const hasRows = pane.querySelectorAll('table tr, section, .ui-accordion-header, select').length > 0;
  const textLen = (pane.innerText || '').trim().length;
  if (__IS_MENU__ && document.querySelectorAll('table').length >= 10) return true;
  if (__IS_SERVICES__ && (hasRows || textLen >= 20)) return true;
  if (hasRows || textLen > 0) return true;

  _activateTab(__HREF__);
  return false;

  function _activateTab(h) {
    const tab = Array.from(document.querySelectorAll('a.ui-tabs-anchor')).find(el => el.getAttribute('href') === h);
    if (!tab) return;
    if (window.jQuery) {
      window.jQuery(tab).closest('li').data('canOpen', true);
      window.jQuery(tab).data('canOpen', true);
    }
    const now = Date.now();
    if (tab._lastClickTime && (now - tab._lastClickTime) < 3000) return;
    tab._lastClickTime = now;
    const isSelected = tab.getAttribute('aria-selected') === 'true' && tab.closest('li')?.classList.contains('ui-tabs-active');
    const paneVisible = pane && pane.getClientRects().length > 0;
    if (!isSelected || !paneVisible) {
      tab.click();
      const $t = window.jQuery ? window.jQuery(tab).closest('.ui-tabs') : null;
      const idx = window.jQuery ? window.jQuery(tab).closest('li').index() : -1;
      if ($t && idx >= 0) {
        try { $t.tabs('option', 'active', idx); } catch (_) {}
      }
    }
  }
})()`;

function catalogTabReadyExpression(href) {
  const isServicesHref = /svc/i.test(String(href || ''));
  const isMenuHref = /menu/i.test(String(href || ''));
  const targetId = String(href || '').replace(/^#/, '');
  return BROWSER_TAB_CHECK_SCRIPT
    .replaceAll('__TARGET_ID__', JSON.stringify(targetId))
    .replaceAll('__HREF__', JSON.stringify(href))
    .replaceAll('__IS_SERVICES__', isServicesHref ? 'true' : 'false')
    .replaceAll('__IS_MENU__', isMenuHref ? 'true' : 'false');
}

async function selectCatalogTab(ws, href, api) {
  if (typeof api?.dismissDOMModals === 'function') {
    try { await api.dismissDOMModals(ws); } catch (_) {}
  }
  const selected = await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => { // CATALOG_TAB_SELECT
      const tab = Array.from(document.querySelectorAll('a.ui-tabs-anchor')).find(el => el.getAttribute('href') === ${JSON.stringify(href)});
      if (!tab) return false;
      if (window.jQuery) {
        window.jQuery(tab).closest('li').data('canOpen', true);
        window.jQuery(tab).data('canOpen', true);
      }
      tab.click();
      const $tabs = window.jQuery ? window.jQuery(tab).closest('.ui-tabs') : null;
      const tabIndex = window.jQuery ? window.jQuery(tab).closest('li').index() : -1;
      if ($tabs && tabIndex >= 0) {
        try { $tabs.tabs('option', 'active', tabIndex); } catch (_) {}
      }
      return true;
    })()`, returnByValue: true, userGesture: true
  });
  if (!selected.result?.value) throw new Error(`CATALOG_TAB_MISSING: ${href}`);
  const ready = await api.waitForDOMPredicate(ws, catalogTabReadyExpression(href), 90000, 500);
  if (!ready) throw new Error(`CATALOG_TAB_NOT_READY: ${href}`);
}

const CLICK_SERVICES_EDIT_SCRIPT = `(() => {
  const scopeRoot = document.querySelector('#extended_overview_suisvc, #sui-components-tree') || document;
  const editBtn = Array.from(scopeRoot.querySelectorAll('a, button, input[type="button"]'))
    .find(el => /^edit(?:\\s+services?)?$/i.test((el.innerText || el.value || '').trim()));
  if (!editBtn) return { clicked: false };
  editBtn.click();
  return { clicked: true, triggerText: (editBtn.innerText || editBtn.value || '').trim() };
})()`;

const EXTRACT_SERVICES_PICKER_SCRIPT = `(() => {
  const dialog = document.querySelector('.ui-dialog:not([style*="display: none"]), .modal.in, .modal.show, #service_edit_dialog');
  const tables = dialog ? Array.from(dialog.querySelectorAll('table')).map((t, idx) => ({
    tableId: t.id || ('services_edit_picker_' + idx),
    rows: Array.from(t.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('th, td')).map(c => (c.innerText || '').trim())
    ).filter(r => r.some(Boolean))
  })).filter(t => t.rows.length > 0) : [];
  const closeBtn = dialog ? Array.from(dialog.querySelectorAll('button, a, .ui-dialog-titlebar-close'))
    .find(el => el.classList.contains('ui-dialog-titlebar-close') || /^(?:cancel|close)$/i.test((el.innerText || el.value || '').trim())) : null;
  if (closeBtn) closeBtn.click();
  return { tables, fullText: dialog ? (dialog.innerText || '').trim() : '' };
})()`;

async function captureServicesEditPicker(ws, api = cdp, options = {}) {
  if (!api || typeof api.sendCommand !== 'function') {
    throw new Error('captureServicesEditPicker requires api.sendCommand');
  }
  const openRes = await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: CLICK_SERVICES_EDIT_SCRIPT,
    returnByValue: true,
    userGesture: true
  });
  if (!openRes?.result?.value?.clicked) {
    return {
      captured: false,
      tables: [],
      fullText: '',
      optionCount: 0,
      scope: 'SERVICES_EDIT_TRIGGER_ABSENT',
      unexecuted: ['component-owned Services -> Edit modal tier alternatives']
    };
  }
  if (typeof api.waitForDOMPredicate === 'function') {
    await api.waitForDOMPredicate(
      ws,
      `Boolean(document.querySelector('.ui-dialog:not([style*="display: none"]) table, .modal.in table, .modal.show table, #service_edit_dialog table'))`,
      options.timeoutMs || 15000,
      300
    );
  }
  const extractRes = await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: EXTRACT_SERVICES_PICKER_SCRIPT,
    returnByValue: true
  });
  const payload = extractRes?.result?.value || {};
  const tables = Array.isArray(payload.tables) ? payload.tables : [];
  const optionCount = tables.reduce((sum, t) => sum + Math.max(0, (t.rows?.length || 0) - 1), 0);
  return {
    captured: optionCount > 0,
    tables,
    fullText: String(payload.fullText || ''),
    optionCount,
    scope: optionCount > 0 ? 'SERVICES_EDIT_PICKER_CAPTURED' : 'SERVICES_EDIT_PICKER_EMPTY',
    unexecuted: optionCount > 0 ? [] : ['empty Services -> Edit picker table']
  };
}

module.exports = {
  EXPECTED_TABLE_COLUMN_GROUPS,
  captureSupplementalCatalogTabs,
  selectCatalogTab,
  verifyExpectedCatalogColumns,
  captureServicesEditPicker
};
