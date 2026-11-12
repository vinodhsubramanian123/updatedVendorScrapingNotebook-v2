'use strict';
const cdp = require('./cdp');
const { parseProductMeta } = require('../catalog/product_meta');
const { resolveOwnedCatalogPath, matchesOwnedCatalogPath, registeredOwnedMenuMatches } = require('../catalog/catalog_hierarchy');
const { navigateToOCAChassis } = require('./navigate_oca');
const { selectCatalogTab } = require('./catalog_tab_capture');

function validateComponentObservation(observed, product, sku, config = require('../../config/notebooks.json'), scopePath = null) {
  const productId = config.notebooks[product] ? product : parseProductMeta(product).cleanName;
  const expected = resolveOwnedCatalogPath(productId, config.notebooks);
  const registration = expected.at(-1);
  const parent = expected.at(-2);
  const heading = String(observed?.heading || '');
  const parentMatches = scopePath
    ? matchesOwnedCatalogPath(expected, scopePath) && observed?.parent === scopePath.at(-2)?.ownerConfiguration && observed?.owner === scopePath.at(-1)?.ownerConfiguration
    : expected.length === 2 && parseProductMeta(observed?.parent).cleanName === parent?.productId;
  if (!registration.captureViaParent || !parentMatches || !observed?.owner || !heading.endsWith(`[${sku}]`) ||
      sku !== registration.baseSku || !registeredOwnedMenuMatches(registration, heading)) {
    throw new Error('ACTIVE_COMPONENT_IDENTITY_UNVERIFIED');
  }
  return { query: product, selectedSku: sku, source: 'Authenticated OCA owned component menu',
    capturedAt: new Date().toISOString(), ownerConfiguration: observed.owner,
    parentConfiguration: observed.parent,
    ...(scopePath ? { scopePath, parentBaseSku: parent.baseSku } : {}),
    candidates: [{ sku, text: heading, visited: true }], excludedCandidates: [] };
}

async function discoverActiveComponent(product, sku, pageTarget = null) {
  pageTarget ||= await cdp.getOCATarget();
  const ws = await cdp.connectWS(pageTarget.webSocketDebuggerUrl);
  try {
    return { pageTarget, chassisDiscovery: validateComponentObservation(await readActiveMenu(ws, cdp), product, sku) };
  } finally { ws.close(); }
}

const ACTIVE_MENU_PROBE = `(() => {
  const menu = document.querySelector('#extended_overview_menu');
  const nav = Array.from(document.querySelectorAll('.eo_nav_li')).map(e => e.innerText.trim());
  const heading = (menu?.querySelector('.menu_info')?.innerText || '').split('\\n').map(s => s.trim()).find(s => /\\[[A-Z0-9-]+\\]$/.test(s));
  return { heading: menu?.getClientRects().length ? heading : '', owner: nav.at(-1), parent: nav.at(-2), breadcrumbs: nav };
})()`;

async function readActiveMenu(ws, api) {
  const result = await api.sendCommand(ws, 'Runtime.evaluate', { expression: ACTIVE_MENU_PROBE, returnByValue: true });
  return result.result?.value;
}

function ownedMenuSelection(childSku, parent, click = false) {
  return `(() => {
    const selected = [...document.querySelectorAll('#extended_overview_components .fancytree-title')].find(element => {
      const node = window.jQuery?.ui?.fancytree?.getNode(element);
      const parentNode = node?.parent;
      const label = parentNode?.span?.querySelector('.fancytree-title')?.innerText.split('\\n')[0].trim();
      const parentMatches = [parentNode?.data?.subconfig_name, label].includes(${JSON.stringify(parent.ownerConfiguration)});
      return element.getClientRects().length && node?.data?.product_number === ${JSON.stringify(childSku)} &&
        parentNode?.data?.product_number === ${JSON.stringify(parent.baseSku)} && node.data.default_tab === 'menu' &&
        (${!parent.requireOwnerMatch} || parentMatches);
    });
    if (!selected) return false;
    if (!${click}) return true;
    const data = window.jQuery.ui.fancytree.getNode(selected).data;
    selected.click();
    return { ownerId: data.subConfId || data.subconfig_id || data.subconf_id || null };
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

async function selectOptionalChild(ws, registration, parentSku, api) {
  await selectCatalogTab(ws, '#extended_overview_menu', api);
  const parentOption = parentOptionProbe(registration, parentSku);
  const evaluate = expression => api.sendCommand(ws, 'Runtime.evaluate', { expression, returnByValue: true, userGesture: true });
  const category = await evaluate(parentOption(`
    const button = pane.querySelector('#button_' + CSS.escape(category));
    if (!button?.getClientRects().length) return false;
    if (!button.classList.contains('selected')) button.click();
    return true;
  `));
  if (!category.result?.value || !await api.waitForDOMPredicate(ws, parentOption('return Boolean(qty);'), 15000, 250)) {
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
  if (!selected.result?.value || !await api.waitForDOMPredicate(ws, parentOption("return qty?.textContent.trim() === '1';"), 30000, 500)) {
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

async function openOwnedMenu(ws, entry, parent, api) {
  await selectCatalogTab(ws, '#extended_overview_components', api);
  await expandOwnedTreeNode(ws, parent, api);
  const exists = ownedMenuSelection(entry.baseSku, parent);
  const initial = await api.sendCommand(ws, 'Runtime.evaluate', { expression: exists, returnByValue: true });
  let option = null;
  if (!initial.result?.value && entry.parentOptionCategory && !await api.waitForDOMPredicate(ws, exists, 3000, 250)) {
    option = await selectOptionalChild(ws, entry, parent.baseSku, api);
    await selectCatalogTab(ws, '#extended_overview_components', api);
    await expandOwnedTreeNode(ws, parent, api);
  }
  if (!await api.waitForDOMPredicate(ws, exists, 20000, 500)) throw new Error('OWNED_COMPONENT_MENU_NOT_DISCOVERED: ' + entry.productId);
  const selection = await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: ownedMenuSelection(entry.baseSku, parent, true), returnByValue: true, userGesture: true
  });
  if (!selection.result?.value) throw new Error('OWNED_COMPONENT_MENU_NOT_DISCOVERED: ' + entry.productId);
  const ready = await api.waitForDOMPredicate(ws, 'Boolean((' + ACTIVE_MENU_PROBE + ').heading?.endsWith(' + JSON.stringify('[' + entry.baseSku + ']') + '))', 30000, 500);
  if (!ready) throw new Error('OWNED_COMPONENT_MENU_NOT_READY: ' + entry.productId);
  return { menu: await readActiveMenu(ws, api), option, ownerId: selection.result.value.ownerId };
}

function scopeStep(entry, menu) {
  if (!menu?.owner || !String(menu.heading).endsWith('[' + entry.baseSku + ']')) {
    throw new Error('OWNED_COMPONENT_MENU_IDENTITY_UNVERIFIED: ' + entry.productId);
  }
  return { productId: entry.productId, baseSku: entry.baseSku, ownerConfiguration: menu.owner };
}

async function captureViaParent(product, config, { forceFreshSession = false, api = cdp, navigate = navigateToOCAChassis } = {}) {
  const path = resolveOwnedCatalogPath(product, config.notebooks);
  const [root, ...children] = path;
  if (!children.length) throw new Error('OWNED_COMPONENT_BASE_MAPPING_REQUIRED');
  const navigation = await navigate(root.ocaSearchQuery || root.productId, { targetSku: root.baseSku, forceDiscovery: true, forceFreshSession });
  if (navigation.chassisDiscovery?.selectedSku !== root.baseSku) throw new Error('OWNED_COMPONENT_PARENT_UNVERIFIED');
  const pageTarget = await api.getOCATarget();
  if (pageTarget.id !== navigation.pageId) throw new Error('OWNED_COMPONENT_TARGET_CHANGED');
  const ws = await api.connectWS(pageTarget.webSocketDebuggerUrl);
  try {
    let menu = await readActiveMenu(ws, api);
    const scopePath = [scopeStep(root, menu)];
    let leafOption = null;
    for (const entry of children) {
      const parent = { ...scopePath.at(-1), requireOwnerMatch: scopePath.length > 1 };
      const result = await openOwnedMenu(ws, entry, parent, api);
      menu = result.menu;
      const step = scopeStep(entry, menu);
      if (result.ownerId) step.ownerId = result.ownerId;
      scopePath.push(step);
      if (!registeredOwnedMenuMatches(entry, menu.heading) || !scopePath.every((part, index) =>
        part.ownerConfiguration === menu.breadcrumbs?.at(index - scopePath.length))) {
        throw new Error('OWNED_COMPONENT_BREADCRUMB_MISMATCH: ' + entry.productId);
      }
      leafOption = result.option;
      if (leafOption) step.parentOption = { sku: entry.baseSku, category: entry.parentOptionCategory, quantity: 1 };
    }
    const leaf = path.at(-1);
    const chassisDiscovery = validateComponentObservation(menu, product, leaf.baseSku, config, scopePath);
    if (leafOption) {
      chassisDiscovery.parentOption = scopePath.at(-1).parentOption;
      Object.assign(chassisDiscovery.candidates[0], leafOption);
    }
    return { pageTarget, chassisDiscovery };
  } finally { ws.close(); }
}

async function expandOwnedTreeNode(ws, parent, api) {
  await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const title = [...document.querySelectorAll('#extended_overview_components .fancytree-title')].find(element => {
        const node = window.jQuery?.ui?.fancytree?.getNode(element);
        return element.getClientRects().length && node?.data?.product_number === ${JSON.stringify(parent.baseSku)} &&
          [node.data.subconfig_name, element.innerText?.split('\\n')[0].trim()].includes(${JSON.stringify(parent.ownerConfiguration)});
      });
      if (!title) return false;
      const node = window.jQuery.ui.fancytree.getNode(title);
      if (!node.expanded) node.span?.querySelector('.fancytree-expander')?.click();
      return true;
    })()`, returnByValue: true, userGesture: true
  });
}

async function observeOwnedMenus(ws, baseSku, api = cdp) {
  const menu = await readActiveMenu(ws, api);
  if (!menu?.owner || !String(menu.heading).endsWith(`[${baseSku}]`)) return { status: 'ACTIVE_SCOPE_UNVERIFIED' };
  const available = await api.sendCommand(ws, 'Runtime.evaluate', {
    expression: `Boolean(document.querySelector('a[href="#extended_overview_components"]')?.getClientRects().length)`, returnByValue: true
  });
  if (!available.result?.value) return { status: 'COMPONENTS_TAB_UNAVAILABLE' };
  let outcome;
  try {
    await selectCatalogTab(ws, '#extended_overview_components', api);
    await expandOwnedTreeNode(ws, { baseSku, ownerConfiguration: menu.owner }, api);
    const result = await api.sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const scope = Array.from(document.querySelectorAll('#extended_overview_components .fancytree-title'))
          .map(element => window.jQuery?.ui?.fancytree?.getNode(element))
          .filter(node => node?.data?.product_number === ${JSON.stringify(baseSku)});
        const parent = scope.find(node => node.data.subconfig_name === ${JSON.stringify(menu.owner)} ||
          node.span?.querySelector('.fancytree-title')?.innerText.split('\\n')[0].trim() === ${JSON.stringify(menu.owner)});
        if (!parent || (parent.lazy && !parent.isLoaded())) return { status: 'COMPONENT_TREE_SCOPE_UNVERIFIED' };
        const children = (parent.children || []).filter(node => node.data?.default_tab === 'menu')
          .map(node => ({ baseSku: node.data.product_number || null, ownerConfiguration: node.data.subconfig_name || null }));
        return { status: 'OBSERVED_CONFIGURED_CHILD_MENUS', children };
      })()`, returnByValue: true
    });
    outcome = result.result?.value || { status: 'COMPONENT_TREE_SCOPE_UNVERIFIED' };
  } catch (error) {
    outcome = { status: 'COMPONENT_TREE_PROBE_FAILED', reason: error.message };
  }
  await selectCatalogTab(ws, '#extended_overview_menu', api);
  const restored = await readActiveMenu(ws, api);
  if (restored?.heading !== menu.heading || restored.owner !== menu.owner) throw new Error('OWNED_MENU_INVENTORY_RESTORE_FAILED');
  return outcome;
}

module.exports = { validateComponentObservation, discoverActiveComponent, captureViaParent, observeOwnedMenus };
