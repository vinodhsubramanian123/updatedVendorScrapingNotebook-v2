'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { evalNetworkingOcp } = require('../../scripts/lib/aspects/networking_ocp.js');
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');

test('Synergy Composable Fabric Chaos Suite', async (t) => {

    await t.test('1. Validates Mezzanine Card Slot mapping to specific Bays (Mezz 1 -> Bay 1/4)', () => {
        // Correct Ethernet Mezz 1 mapping to Ethernet Switch in Bay 1/4
        const items = [
            { sku: '111', description: 'HPE Synergy 4820C 10/25/50Gb Ethernet Mezzanine 1 Card' },
            { sku: '222', description: 'HPE Synergy 100Gb Interconnect Module for Bay 1/4' }
        ];
        const res = evalNetworkingOcp(items);
        assert.strictEqual(res.hasSynergyFabricMismatch, false);
    });

    await t.test('2. Validates Fabric Type Consistency (Ethernet Mezzanine to Fibre Channel Interconnect mismatch)', () => {
        // Mismatch: Ethernet Mezz to FC Interconnect
        const items = [
            { sku: '111', description: 'HPE Synergy 4820C 10/25/50Gb Ethernet Mezzanine 1 Card' },
            { sku: '222', description: 'HPE Synergy 16Gb Fibre Channel Interconnect Module for Bay 1/4' }
        ];
        const res = evalNetworkingOcp(items);
        assert.strictEqual(res.hasSynergyFabricMismatch, true);
        assert.ok(res.synergyFabricErrors.length > 0);
        assert.ok(res.synergyFabricErrors[0].includes('mismatch'));
    });

    await t.test('3. Validates Synergy Frame redundant power supply rule (6x 2650W Titanium PSUs)', () => {
        // Chaos: Missing redundant power
        const invalidItems = [
            { sku: '1', description: 'HPE Synergy 12000 Configure-to-order Frame Chassis' },
            { sku: '2', description: 'HPE Synergy 2650W Titanium Hot Plug Power Supply', quantity: 4 }
        ];
        const resInvalid = evalPowerEnvironment(invalidItems);
        assert.strictEqual(resInvalid.hasSynergyRedundantPowerError, true);

        // Correct: 6x power
        const validItems = [
            { sku: '1', description: 'HPE Synergy 12000 Frame' },
            { sku: '2', description: 'HPE Synergy 2650W Titanium Power Supply Kit', quantity: 6 }
        ];
        const resValid = evalPowerEnvironment(validItems);
        assert.strictEqual(resValid.hasSynergyRedundantPowerError, false);
    });

    await t.test('4. Validates D3940 Storage Module direct SAS connectivity to Compute Modules', () => {
        // Chaos: D3940 without SAS Connection/Mezz
        const invalidItems = [
            { sku: '1', description: 'HPE Synergy D3940 Storage Module' },
            { sku: '2', description: 'HPE Synergy 480 Gen10 Plus Compute Module' }
        ];
        const resInvalid = evalStorageTriMode(invalidItems);
        assert.strictEqual(resInvalid.hasD3940ConnectivityError, true);

        // Correct: Has SAS Connection Module & Mezz
        const validItems = [
            { sku: '1', description: 'HPE Synergy D3940 Storage Module' },
            { sku: '2', description: 'HPE Synergy 480 Gen10 Plus Compute Module' },
            { sku: '3', description: 'HPE Synergy 12Gb SAS Connection Module' },
            { sku: '4', description: 'HPE Synergy 12Gb SAS Mezzanine Card' }
        ];
        const resValid = evalStorageTriMode(validItems);
        assert.strictEqual(resValid.hasD3940ConnectivityError, false);
    });
});
