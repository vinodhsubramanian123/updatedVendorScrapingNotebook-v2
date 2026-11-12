'use strict';
const cdp = require('./cdp');
const { parseProductMeta } = require('../catalog/product_meta');
const { navigateToOCAChassis } = require('./navigate_oca');
const { selectCatalogTab } = require('./catalog_tab_capture');

function validateComponentObservation(observed, product, sku, config = require('../../config/notebooks.json')) {
  const heading = String(observed?.heading || '');
  const actualSku = heading.match(/\[([A-Z0-9-]+)\]\s*$/i)?.[1];
  const productId = parseProductMeta(product).cleanName;
  const registration = config.notebooks[productId];
  const parent = config.notebooks[registration?.parentProductId];
  if (!registration?.captureViaParent || !parent?.baseSku || !actualSku || actualSku !== sku || sku !== registration.baseSku ||
      parseProductMeta(heading).cleanName !== productId || !observed?.owner ||
      parseProductMeta(observed?.parent).cleanName !== registration.parentProductId) {
    throw new Error('ACTIVE_COMPONENT_IDENTITY_UNVERIFIED');
  }
  return { query: product, selectedSku: sku, source: 'Authenticated OCA owned component menu',
    capturedAt: new Date().toISOString(), ownerConfiguration: observed.owner,
    parentConfiguration: observed.parent,
    candidates: [{ sku, text: heading, visited: true }], excludedCandidates: [] };
}

async function discoverActiveComponent(product, sku, pageTarget = null) {
  pageTarget ||= await cdp.getOCATarget();
  const ws = await cdp.connectWS(pageTarget.webSocketDebuggerUrl);
  try {
    const result = await cdp.sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const menu = document.querySelector('#extended_overview_menu');
        const nav = Array.from(document.querySelectorAll('.eo_nav_li')).map(e => e.innerText.trim());
        const heading = (document.querySelector('.menu_info')?.innerText || '').split('\\n').map(s => s.trim()).find(s => /\\[[A-Z0-9-]+\\]$/.test(s));
        return { heading: menu?.getClientRects().length ? heading : '', owner: nav.at(-1), parent: nav.at(-2) };
      })()`, returnByValue: true
    });
    return { pageTarget, chassisDiscovery: validateComponentObservation(result.result?.value, product, sku) };
  } finally { ws.close(); }
}

function ownedMenuSelection(childSku, parentSku, click = false) {
  return `(() => {
    const selected = [...document.querySelectorAll('#extended_overview_components .fancytree-title')].find(element => {
      const node = window.jQuery?.ui?.fancytree?.getNode(element);
      return element.getClientRects().length && node?.data?.product_number === ${JSON.stringify(childSku)} &&
        node.parent?.data?.product_number === ${JSON.stringify(parentSku)} && node.data.default_tab === 'menu';
    });
    if (selected && ${click}) selected.click();
    return Boolean(selected);
  })()`;
}

function parentOptionProbe(registration, parentSku) {
  return body => `(() => {
    const pane = document.getElementById('extended_overview_menu');
    if (!pane?.getClientRects().length || !pane.querySelector('.menu_info')?.innerText.includes(${JSON.stringify(`[${parentSku}]`)})) return false;
    const category = ${JSON.stringify(registration.parentOptionCategory)};
    const sku = ${JSON.stringify(registration.baseSku)};
    const rows = [...pane.querySelectorAll('tr.item_tr')].filter(row =>
      row.dataset.elementid?.startsWith(category + '_') && row.querySelector('._pid')?.textContent.trim() === sku &&
      row.getClientRects().length && !row.matches('.unavailable, .dqe-hidden') && !row.closest('table.UavailableTable'));
    const qty = rows.length === 1 ? rows[0].querySelector('.item_qty_div') : null;
    ${body}
  })()`;
}

async function selectOptionalChild(ws, registration, parentSku) {
  await selectCatalogTab(ws, '#extended_overview_menu', cdp);
  const parentOption = parentOptionProbe(registration, parentSku);
  const evaluate = expression => cdp.sendCommand(ws, 'Runtime.evaluate', { expression, returnByValue: true, userGesture: true });
  const category = await evaluate(parentOption(`
    const button = pane.querySelector('#button_' + CSS.escape(category));
    if (!button?.getClientRects().length) return false;
    if (!button.classList.contains('selected')) button.click();
    return true;
  `));
  if (!category.result?.value || !await cdp.waitForDOMPredicate(ws, parentOption('return Boolean(qty);'), 15000, 250)) {
    throw new Error('OWNED_COMPONENT_OPTION_NOT_DISCOVERED');
  }
  const opened = await evaluate(parentOption(`
    if (qty?.textContent.trim() !== '0') return false;
    qty.scrollIntoView({ block: 'center' });
    const rect = qty.getBoundingClientRect();
    qty.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
    return true;
  `));
  if (!opened.result?.value) throw new Error('OWNED_COMPONENT_OPTION_NOT_AT_BASELINE');
  const selected = await evaluate(parentOption(`
    if (!qty?.closest('tr.editing')) return false;
    const origin = qty.getBoundingClientRect();
    const choices = [...document.querySelectorAll('ul.popup-menu-body a[name="1"]')].filter(option => {
      const rect = option.getBoundingClientRect();
      return option.getClientRects().length && Math.abs(rect.x - origin.x) < 250 && Math.abs(rect.y - origin.y) < 250;
    });
    if (choices.length !== 1) return false;
    choices[0].click();
    return true;
  `));
  if (!selected.result?.value || !await cdp.waitForDOMPredicate(ws, parentOption("return qty?.textContent.trim() === '1';"), 30000, 500)) {
    throw new Error('OWNED_COMPONENT_OPTION_SELECTION_UNVERIFIED');
  }
  const observed = await evaluate(parentOption(`
    const row = qty?.closest('tr');
    if (qty?.textContent.trim() !== '1' || !row) return false;
    const text = row.querySelector('.item_price:not(.item_price_extendedPrice)')?.textContent.trim() || '';
    const usd = [...row.closest('div.menu_table').querySelectorAll('th, td')].some(cell => cell.textContent.trim() === 'Price (USD)');
    const days = row.querySelector('.shipment_leadtime_span')?.textContent.trim() || '';
    const priceVerified = usd && /^\\d[\\d,]*(?:\\.\\d{2})?$/.test(text);
    return { priceVerified, listPriceUsd: priceVerified ? Number(text.replaceAll(',', '')) : null,
      leadTime: /^\\d+$/.test(days) ? days + ' days' : '', leadTimeDays: /^\\d+$/.test(days) ? Number(days) : null };
  `));
  if (!observed.result?.value) throw new Error('OWNED_COMPONENT_OPTION_READBACK_FAILED');
  return observed.result.value;
}

async function captureViaParent(product, registration, parent, { forceFreshSession = false } = {}) {
  if (!registration.baseSku || !parent?.baseSku) throw new Error('OWNED_COMPONENT_BASE_MAPPING_REQUIRED');
  const navigation = await navigateToOCAChassis(registration.parentProductId, {
    targetSku: parent.baseSku, forceDiscovery: true, forceFreshSession
  });
  if (navigation.chassisDiscovery?.selectedSku !== parent.baseSku) throw new Error('OWNED_COMPONENT_PARENT_UNVERIFIED');
  const pageTarget = await cdp.getOCATarget();
  if (pageTarget.id !== navigation.pageId) throw new Error('OWNED_COMPONENT_TARGET_CHANGED');
  const ws = await cdp.connectWS(pageTarget.webSocketDebuggerUrl);
  let parentOption = null;
  try {
    await selectCatalogTab(ws, '#extended_overview_components', cdp);
    const exists = ownedMenuSelection(registration.baseSku, parent.baseSku);
    const initial = await cdp.sendCommand(ws, 'Runtime.evaluate', { expression: exists, returnByValue: true });
    if (!initial.result?.value && registration.parentOptionCategory) {
      parentOption = await selectOptionalChild(ws, registration, parent.baseSku);
      await selectCatalogTab(ws, '#extended_overview_components', cdp);
    }
    if (!await cdp.waitForDOMPredicate(ws, exists, 20000, 500)) throw new Error('OWNED_COMPONENT_MENU_NOT_DISCOVERED');
    const selection = await cdp.sendCommand(ws, 'Runtime.evaluate', {
      expression: ownedMenuSelection(registration.baseSku, parent.baseSku, true), returnByValue: true, userGesture: true
    });
    if (!selection.result?.value) throw new Error('OWNED_COMPONENT_MENU_NOT_DISCOVERED');
    const ready = await cdp.waitForDOMPredicate(ws, `(() => {
      const menu = document.getElementById('extended_overview_menu');
      const title = document.querySelector('.menu_info')?.innerText || '';
      return Boolean(menu?.getClientRects().length && title.includes(${JSON.stringify(`[${registration.baseSku}]`)}));
    })()`, 30000, 500);
    if (!ready) throw new Error('OWNED_COMPONENT_MENU_NOT_READY');
  } finally { ws.close(); }
  const result = await discoverActiveComponent(product, registration.baseSku, pageTarget);
  result.chassisDiscovery.parentBaseSku = parent.baseSku;
  if (parentOption) {
    result.chassisDiscovery.parentOption = { sku: registration.baseSku, category: registration.parentOptionCategory, quantity: 1 };
    Object.assign(result.chassisDiscovery.candidates[0], parentOption);
  }
  return result;
}

module.exports = { validateComponentObservation, discoverActiveComponent, captureViaParent };
