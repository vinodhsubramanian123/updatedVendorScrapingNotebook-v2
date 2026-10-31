'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { captureSupplementalCatalogTabs } = require('../../scripts/lib/scraper/catalog_tab_capture.js');

function fixture(failOnServices = false) {
  let active = '#extended_overview_menu';
  const visited = [];
  return { visited, api: {
    async sendCommand(ws, method, params) {
      if (params.expression.includes('CATALOG_TAB_LIST')) return { result: { value: ['#extended_overview_bom', '#extended_overview_suisvc'] } };
      if (params.expression.includes('CATALOG_TAB_SELECT')) {
        active = params.expression.match(/=== "(#[^"]+)"/)[1];
        visited.push(active);
        assert.equal(params.awaitPromise, undefined, 'Tab selection must not await browser timers across navigation');
        return { result: { value: true } };
      }
      return { result: { value: active } };
    },
    async waitForDOMPredicate() { return true; },
    async extractTablesAsRows() {
      if (failOnServices && active === '#extended_overview_suisvc') throw new Error('services capture failed');
      return [{ tableId: 'shared-table-id', rows: [[active, 'distinct content']] }];
    },
    async extractChunkedText() { return { fullText: active }; }
  } };
}

test('Captures BOM and service content independently before restoring product menu', async () => {
  const { api, visited } = fixture();
  const capture = await captureSupplementalCatalogTabs({}, 'services|bom', api);
  assert.deepEqual(capture.tables.map(t => t.rows[0][0]), ['#extended_overview_bom', '#extended_overview_suisvc']);
  assert.match(capture.fullText, /extended_overview_bom\n#extended_overview_suisvc/);
  assert.deepEqual(visited, ['#extended_overview_bom', '#extended_overview_suisvc', '#extended_overview_menu']);
});

test('A service extraction failure still restores Menu and fails capture', async () => {
  const { api, visited } = fixture(true);
  await assert.rejects(captureSupplementalCatalogTabs({}, 'services|bom', api), /services capture failed/);
  assert.equal(visited.at(-1), '#extended_overview_menu');
});

test('component capture retains unscoped service evidence without mixing it into its catalog', async () => {
  const { api } = fixture();
  const original = api.sendCommand;
  api.sendCommand = async (ws, method, params) => params.expression.includes('data?.ucid')
    ? { result: { value: [{ owner: 'child-1', support: 'HU4D5A5#Z1R HPE 5Y Complete Care Service', install: 'N/A' }] } }
    : original(ws, method, params);
  const ws = { _captureComponentSku: '867796-B21' };
  const capture = await captureSupplementalCatalogTabs(ws, 'services|bom', api);
  assert.equal(capture.tables.length, 2);
  assert.equal(capture.tables[1].tableId, 'component_owned_services');
  assert.equal(capture.tables[1].rows[1][0], 'HU4D5A5#Z1R');
  assert.equal(capture.tables[1].rows[1][2], '', 'unpublished price remains unknown');
  assert.equal(ws._unscopedServiceTables.length, 1);
  assert.equal(ws._componentServiceEvidence.scope, 'OBSERVED_SELECTED_SERVICES_ONLY');
});
