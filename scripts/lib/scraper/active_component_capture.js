'use strict';
const cdp = require('./cdp');
const { isExactProductCandidate, normalizePortalSearchQuery } = require('./navigate_oca');

function validateComponentObservation(observed, product, sku) {
  const heading = String(observed?.heading || '');
  const actualSku = heading.match(/\[([A-Z0-9-]+)\]\s*$/i)?.[1];
  if (!actualSku || actualSku !== sku || !observed?.owner || !observed?.parent ||
      !isExactProductCandidate(normalizePortalSearchQuery(product), { text: heading, sku })) {
    throw new Error('ACTIVE_COMPONENT_IDENTITY_UNVERIFIED');
  }
  return { query: product, selectedSku: sku, source: 'Authenticated OCA owned component menu',
    capturedAt: new Date().toISOString(), ownerConfiguration: observed.owner,
    parentConfiguration: observed.parent,
    candidates: [{ sku, text: heading, visited: true }], excludedCandidates: [] };
}

async function discoverActiveComponent(product, sku) {
  const pageTarget = await cdp.getOCATarget();
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
module.exports = { validateComponentObservation, discoverActiveComponent };
