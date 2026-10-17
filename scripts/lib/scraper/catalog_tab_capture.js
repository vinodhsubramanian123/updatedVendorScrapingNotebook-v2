'use strict';
const cdp = require('./cdp.js');

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
      await selectCatalogTab(ws, href, api);
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
  return { tables, fullText: texts.join('\n') };
}

async function selectCatalogTab(ws, href, api) {
  const selected = await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => { // CATALOG_TAB_SELECT
      const tab = Array.from(document.querySelectorAll('a.ui-tabs-anchor')).find(el => el.getAttribute('href') === ${JSON.stringify(href)});
      if (!tab) return false;
      if (tab.getAttribute('aria-selected') !== 'true' && !tab.closest('li')?.classList.contains('ui-tabs-active')) tab.click();
      return true;
    })()`, returnByValue: true, userGesture: true
  });
  if (!selected.result?.value) throw new Error(`CATALOG_TAB_MISSING: ${href}`);
  const ready = await api.waitForDOMPredicate(ws, `(() => {
    const busy = Array.from(document.querySelectorAll('.loading_div, .maui-loading-div, .toolbar_loading, .dqe-loading'))
      .some(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none');
    if (busy) return false;
    const pane = document.getElementById(${JSON.stringify(href.slice(1))});
    if (!pane?.getClientRects().length || (!pane.innerText?.trim() && !pane.querySelectorAll('table, section, div').length)) {
      const tab = Array.from(document.querySelectorAll('a.ui-tabs-anchor')).find(el => el.getAttribute('href') === ${JSON.stringify(href)});
      if (tab && tab.getAttribute('aria-selected') !== 'true' && !tab.closest('li')?.classList.contains('ui-tabs-active')) {
        tab.click();
      }
      return false;
    }
    return true;
  })()`, 30000, 500);
  if (!ready) throw new Error(`CATALOG_TAB_NOT_READY: ${href}`);
}

module.exports = { captureSupplementalCatalogTabs };
