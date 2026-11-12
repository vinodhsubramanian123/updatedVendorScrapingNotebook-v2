'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runInNewContext } = require('node:vm');
const { validateComponentObservation, captureViaParent } = require('../../scripts/lib/scraper/active_component_capture');
test('module identity and owned service suffix survive catalog normalization', () => {
  const { parseProductMeta } = require('../../scripts/lib/catalog/product_meta');
  const { isCanonicalCtoChassisCandidate } = require('../../scripts/catalogs/build_catalog');
  const { isValidHpeSKU, isServiceSku, cleanBaseSKU } = require('../../scripts/lib/catalog/sku');
  assert.equal(parseProductMeta('SY100Gb_F32_Module').family, 'Synergy');
  assert.equal(isCanonicalCtoChassisCandidate({ sku: '867796-B21', text: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy' }, 'SY100Gb_F32_Module'), true);
  assert.equal(isValidHpeSKU('HU4D5A5#Z1R'), true);
  assert.equal(isServiceSku('HU4D5A5#Z1R'), true);
  assert.equal(cleanBaseSKU('HU4D5A5#Z1R'), 'HU4D5A5#Z1R');
  assert.equal(isValidHpeSKU('HU4D5A5#UNKNOWN'), false);
});
test('unpublished selected support price cannot borrow a quantity, total or historical price', () => {
  const { parseSingleTableRow } = require('../../scripts/catalogs/build_catalog');
  const headers = ['Product #', 'Description', 'Price (USD)', 'Quantity', 'Extended Price (USD)'];
  const historical = new Map([['HU4D5A5#Z1R', '999.00']]);
  const row = ['HU4D5A5#Z1R', 'HPE 5Y Complete Care Service', '', '2', '123.00'];
  const result = parseSingleTableRow(row, headers, 0, historical);
  assert.equal(result.obj['Unit Price (USD)'], '');
  assert.equal(result.obj.listPrice, null);
  row[2] = '0.00';
  assert.equal(parseSingleTableRow(row, headers, 0, historical).obj.listPrice, 0);
});
test('optical reach and QSFP adapters do not become hard disks or PCIe cards', () => {
  const { synthesizeSubcategoryName } = require('../../scripts/lib/catalog/product_meta');
  assert.equal(synthesizeSubcategoryName('Networking', ['10Gb SFP+ 10km Transceiver', 'QSFP to SFP Adapter']), 'Optical Transceivers & DAC Cables');
  assert.equal(synthesizeSubcategoryName('Storage', ['SAS 10k Hard Drive']), 'Hard Disk Drives (SAS/SATA)');
});
test('owned F32 capture binds exact module, owner and parent without relabeling frame', () => {
  const observed = { heading: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy [867796-B21]',
    owner: '100Gb Virtual #1', parent: 'Synergy 12000 Frame #1' };
  const result = validateComponentObservation(observed, 'SY100Gb_F32_Module', '867796-B21');
  assert.equal(result.selectedSku, '867796-B21');
  assert.equal(result.parentConfiguration, observed.parent);
  for (const change of [{ parent: '' }, { owner: '' }, { heading: 'Synergy 12000 Frame [P51174-B21]' },
    { heading: 'HPE Virtual Connect SE 40Gb F8 Module [867796-B21]' }]) {
    assert.throws(() => validateComponentObservation({ ...observed, ...change }, 'SY100Gb_F32_Module', '867796-B21'), /IDENTITY_UNVERIFIED/);
  }
  assert.throws(() => validateComponentObservation(observed, 'SY100Gb_F32_Module', 'P06584-B21'), /IDENTITY_UNVERIFIED/);
});
test('owned Synergy modules require their registered base and reject an unrelated parent', () => {
  const { isCanonicalCtoChassisCandidate } = require('../../scripts/catalogs/build_catalog');
  for (const [product, sku, label] of [
    ['Synergy_4Port_Frame_Link_Module', '876852-B21', 'HPE Synergy 4-port Frame Link Module'],
    ['Synergy_Brocade_64Gb_FC_Module', 'P77653-B21', 'Brocade 64Gb Fibre Channel Module for HPE Synergy']
  ]) {
    const observed = { heading: `${label} [${sku}]`, owner: `${label} #2`, parent: 'Synergy 12000 Frame #1' };
    assert.equal(validateComponentObservation(observed, product, sku).selectedSku, sku);
    assert.equal(isCanonicalCtoChassisCandidate({ sku, text: label }, product), true);
    assert.equal(isCanonicalCtoChassisCandidate({ sku: 'P51174-B21', text: label }, product), false);
    assert.throws(() => validateComponentObservation({ ...observed, parent: 'Synergy 480 Gen12 #1' }, product, sku), /IDENTITY_UNVERIFIED/);
  }
});

test('owned OCA capture walks four levels and selects the correct instance at each depth', async () => {
  const ids = ['Root_Frame', 'Fabric_Carrier', 'Fabric_Module', 'Expansion_Blade'];
  const skus = ['P10000-B21', 'P20000-B21', 'P30000-B21', 'P40000-B21'];
  const names = ['Root frame', 'Fabric carrier', 'Fabric module', 'Expansion blade'];
  const owners = names.map(name => `${name} #1`);
  const notebooks = Object.fromEntries(ids.map((id, i) => [id, {
    baseSku: skus[i], ocaMenuName: names[i], ...(i ? { captureViaParent: true, parentProductId: ids[i - 1] } : {})
  }]));
  let depth = 0;
  let expandedDepth = -1;
  let activeTab = '#extended_overview_menu';
  const view = { innerText: 'loaded', getClientRects: () => [1], querySelectorAll: () => [1] };
  const tabs = ['#extended_overview_components', '#extended_overview_menu'].map(href => ({
    getAttribute: name => name === 'href' ? href : String(activeTab === href),
    closest: () => null, click: () => { activeTab = href; }
  }));
  const createTitle = (parentLabel, click) => ({
    getClientRects: () => [1], click, node: {
      data: { product_number: skus[depth + 1], default_tab: 'menu' },
      parent: { data: { product_number: skus[depth], subconfig_name: parentLabel } }
    }
  });
  const document = {
    querySelector: selector => selector === '#extended_overview_menu' ? {
      getClientRects: () => activeTab === '#extended_overview_menu' ? [1] : [],
      querySelector: () => ({ innerText: `${names[depth]} [${skus[depth]}]` })
    } : null,
    getElementById: () => view,
    querySelectorAll: selector => {
      if (selector === '.eo_nav_li') return ['Config', 'Icon', ...owners.slice(0, depth + 1)].map(innerText => ({ innerText }));
      if (selector === 'a.ui-tabs-anchor') return tabs;
      if (!selector.endsWith('.fancytree-title')) return [];
      const parentTitle = { getClientRects: () => [1], node: {
        data: { product_number: skus[depth], subconfig_name: owners[depth] }, expanded: expandedDepth === depth,
        span: { querySelector: () => ({ click: () => { expandedDepth = depth; } }) }
      } };
      if (expandedDepth !== depth) return [parentTitle];
      const correct = createTitle(owners[depth], () => { depth++; activeTab = '#extended_overview_menu'; });
      return depth ? [parentTitle, createTitle(`${names[depth]} #2`, () => assert.fail('selected sibling branch')), correct] : [parentTitle, correct];
    }
  };
  const read = expression => runInNewContext(expression, { document, window: { jQuery: { ui: { fancytree: { getNode: el => el.node } } } } });
  const api = {
    getOCATarget: async () => ({ id: 'test', webSocketDebuggerUrl: 'fixture' }),
    connectWS: async () => ({ close() {} }),
    sendCommand: async (_ws, _command, { expression }) => ({ result: { value: read(expression) } }),
    waitForDOMPredicate: async (_ws, expression) => Boolean(read(expression))
  };
  const navigate = async (id, options) => {
    assert.equal(id, ids[0]);
    assert.equal(options.targetSku, skus[0]);
    return { pageId: 'test', chassisDiscovery: { selectedSku: skus[0] } };
  };
  const result = await captureViaParent(ids.at(-1), { notebooks }, { api, navigate });
  assert.equal(depth, 3);
  assert.deepEqual(result.chassisDiscovery.scopePath.map(step => step.baseSku), skus);
  assert.equal(result.chassisDiscovery.parentBaseSku, skus.at(-2));
  assert.equal(result.chassisDiscovery.ownerConfiguration, owners.at(-1));
});
