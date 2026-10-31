'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const { selectAmbientRow } = require('../../scripts/lib/scraper/ambient_row_probe');
test('ambient row selection clicks the inner portal control and verifies selected state', async () => {
  const dom = new JSDOM('<table><tr id="ambient27" class="item_tr" data-elementid="temperatureSection_ambientTemperature"><td class="item_desc">27C Maximum</td><td class="item_qty"><div class="item_qty_div">0</div></td><td><span class="_pid">P79555-B21</span></td></tr></table>');
  const document = dom.window.document;
  const row = document.getElementById('ambient27');
  row.querySelector('.item_qty_div').scrollIntoView = () => {};
  row.querySelector('.item_qty_div').addEventListener('click', () => row.classList.add('selected_item'));
  const send = async (_, method, args) => ({ result: { value: vm.runInNewContext(args.expression, { document }) } });
  const selected = await selectAmbientRow(null, send, { id: 'ambient27' }, { pause: async () => {} });
  assert.equal(selected.ambient[0].selected, true);
  row.classList.add('unavailable');
  assert.equal(await selectAmbientRow(null, send, { id: 'ambient27' }), null);
  dom.window.close();
});
