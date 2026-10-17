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
