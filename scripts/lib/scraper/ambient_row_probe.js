'use strict';

// OCA exposes ambient tracking as selectable SKU rows, not always a <select>.
const STATE_EXPRESSION = String.raw`(() => {
  const rows = Array.from(document.querySelectorAll('tr.item_tr'));
  const ambient = rows.filter(row => row.dataset.elementid === 'temperatureSection_ambientTemperature')
    .map(row => ({
      id: row.id,
      sku: row.querySelector('._pid')?.textContent.trim(),
      temperature: Number(row.querySelector('.item_desc')?.textContent.match(/(\d+)C\s+Maximum/i)?.[1]),
      selected: row.classList.contains('selected_item'),
      unavailable: row.classList.contains('unavailable') || !!row.closest('table.UavailableTable')
    }));
  const options = rows.map(row => ({ sku: row.querySelector('._pid')?.textContent.trim(),
    description: row.querySelector('.item_desc')?.textContent.trim(),
    unavailable: row.classList.contains('unavailable') || !!row.closest('table.UavailableTable'),
    rendered: !!row.getClientRects().length,
    price: row.querySelector('.item_price')?.textContent.trim() })).filter(row => row.sku);
  return { ambient, options, loading: options.some(row => /Loading/i.test(row.price || '')),
    rules: Array.from(document.querySelectorAll('.choice_header1')).map(e => e.textContent.trim()).filter(Boolean) };
})()`;

async function readAmbientRows(ws, sendCommand) {
  const result = await sendCommand(ws, 'Runtime.evaluate', { expression: STATE_EXPRESSION, returnByValue: true });
  if (!result?.result?.value) throw new Error('AMBIENT_ROW_SNAPSHOT_FAILED');
  return result.result.value;
}

async function selectAmbientRow(ws, sendCommand, row, options = {}) {
  const response = await sendCommand(ws, 'Runtime.evaluate', { expression: `(() => {
    const el = document.getElementById(${JSON.stringify(row.id)});
    if (!el) return { success: false, reason: 'ROW_NOT_FOUND' };
    if (el.classList.contains('unavailable') || !!el.closest('table.UavailableTable')) {
      return { success: false, reason: 'AMBIENT_ROW_UNAVAILABLE' };
    }
    if (!el.classList.contains('selected_item')) {
      const control = el.querySelector('.item_qty, input[type="radio"], input[type="checkbox"], td.td_qty');
      if (!control) return { success: false, reason: 'AMBIENT_CONTROL_MISSING' };
      control.scrollIntoView({ block: 'center', inline: 'center' });
      control.click();
    }
    return { success: true };
  })()`, returnByValue: true });

  const val = response?.result?.value;
  if (!val?.success) {
    if (val?.reason === 'AMBIENT_ROW_UNAVAILABLE') {
      return null; // Row is unavailable under current config, skip gracefully
    }
    throw new Error(`AMBIENT_ROW_SELECTION_FAILED: ${val?.reason || 'unknown'}`);
  }

  const timeoutMs = options.timeoutMs || 45000;
  const pause = options.pause || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const start = Date.now();
  let previous = null;
  do {
    await pause(500);
    const state = await readAmbientRows(ws, sendCommand);
    const selected = state.ambient.filter(item => item.selected);
    if (selected.length === 1 && selected[0].id === row.id && !state.loading) {
      const signature = JSON.stringify(state);
      if (signature === previous) return state;
      previous = signature;
    } else previous = null;
  } while (Date.now() - start < timeoutMs);
  throw new Error('AMBIENT_ROW_READBACK_TIMEOUT');
}

async function probeAmbientRows(ws, sendCommand, thresholds, captureState = null, options = {}) {
  const baseline = await readAmbientRows(ws, sendCommand);
  if (!baseline.ambient.length) return null; // unsupported adapter, not an empty successful sweep
  const selected = baseline.ambient.filter(row => row.selected);
  if (selected.length !== 1) throw new Error('AMBIENT_BASELINE_AMBIGUOUS');
  const original = selected[0];
  const results = [];
  const defaultAvailable = new Set(baseline.options.filter(row => !row.unavailable).map(row => row.sku));
  try {
    for (const temperature of thresholds) {
      const row = baseline.ambient.find(item => item.temperature === temperature);
      if (!row || row.unavailable) continue;
      const state = await selectAmbientRow(ws, sendCommand, row, options);
      if (!state) continue; // Row was unavailable
      if (captureState) await captureState({ conditionKey: 'ambientTempC', thresholdValue: temperature,
        selectorKind: 'OCA_TRACKING_SKU_ROW', selectedSku: row.sku, state });
      for (const item of state.options.filter(item => !item.unavailable && !defaultAvailable.has(item.sku))) {
        results.push({ sku: item.sku, conditionType: 'AMBIENT_GATE', operator: 'eq', thresholdDegC: temperature,
          visibleAtDefaultC: false, availableAtTestedAmbient: true, defaultAmbientC: original.temperature,
          evidence: `Present and not marked unavailable at tested ambient ${temperature}C; baseline ${original.temperature}C marked unavailable or absent. This does not prove all lower temperatures or full compatibility.`,
          portalVerificationRequired: true });
      }
    }
  } finally {
    try {
      const restored = await selectAmbientRow(ws, sendCommand, original, options);
      if (!restored) throw new Error('Original ambient row is unavailable');
      if (restored && captureState) {
        await captureState({ conditionKey: 'ambientTempC', thresholdValue: original.temperature,
          selectorKind: 'OCA_TRACKING_SKU_ROW', selectedSku: original.sku, restored: true, state: restored });
      }
    } catch (restoreErr) {
      throw new Error(`AMBIENT_RESTORE_FAILED: ${restoreErr.message}`);
    }
  }
  return results;
}

module.exports = { readAmbientRows, selectAmbientRow, probeAmbientRows };
