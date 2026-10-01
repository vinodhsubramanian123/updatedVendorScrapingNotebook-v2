'use strict';
/**
 * tests/unit/test_dom_unavailable_rules.js
 *
 * Unit tests for universal DOM extraction of unavailable/conditional SKUs and explicit portal reasoning rules.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const {
  classifyDomRuleReason,
  parseUnavailableDomRules
} = require('../../scripts/lib/scraper/dom_unavailable_rules.js');

const {
  applyUnavailableDomRulesAndSkus
} = require('../../scripts/lib/catalog/conditional_discovery.js');

test('classifyDomRuleReason accurately categorizes portal gating phrases', () => {
  assert.equal(classifyDomRuleReason('RTX Pro 6000 and 30C Ambient Temperature cannot be selected together.'), 'AMBIENT_GATE');
  assert.equal(classifyDomRuleReason('Max 25 deg C ambient required.'), 'AMBIENT_GATE');
  assert.equal(classifyDomRuleReason('Supported with EDSFF CTO Server only.'), 'CHASSIS_GATE');
  assert.equal(classifyDomRuleReason('x4 and x8 memory cannot be mixed in the same channel.'), 'MEMORY_MIXING');
  assert.equal(classifyDomRuleReason('Mixing of 3DS and standard DIMMs is not allowed.'), 'MEMORY_MIXING');
  assert.equal(classifyDomRuleReason('Secondary Riser and OCP slot 2 cannot be selected together.'), 'SLOT_COLLISION');
  assert.equal(classifyDomRuleReason('Requires High Performance Fan Kit.'), 'PAIRED_KIT_REQUIRED');
  assert.equal(classifyDomRuleReason('Supported only with 1600W Titanium Power Supply.'), 'PAIRED_KIT_REQUIRED');
  assert.equal(classifyDomRuleReason('Customer Specific - Supply Constraint active.'), 'SUPPLY_RESTRICTED');
  assert.equal(classifyDomRuleReason('BTO server configuration disallowed for CTO chassis.'), 'BTO_DISALLOWED');
  assert.equal(classifyDomRuleReason('Mixing of Heat sink is not allowed.'), 'MUTUAL_EXCLUSION');
});

test('parseUnavailableDomRules extracts rules and SKUs from synthetic DOM', () => {
  const html = `
    <html>
      <body>
        <table>
          <tr class="section_header"><td>Graphics Options</td></tr>
          <tr class="uavailableTable_tr">
            <td>
              <table class="UavailableTable">
                <tr>
                  <td class="choice_header1" style="color: red;">
                    RTX Pro 6000/ RTX Pro 6000D/ H200 NVL GPU and 30C Ambient Temperature cannot be selected together.
                  </td>
                </tr>
                <tr class="item_tr unavailable" id="row_1">
                  <td class="td_prod" title="Supply Constrained"><span class="_pid">CS\n S3Z84AAE</span></td>
                  <td class="item_desc">NVIDIA H200 NVL 141GB GPU Module</td>
                  <td class="item_price">$32,500.00</td>
                  <td class="item_start_date">2024-05-01</td>
                  <td class="item_end_date"></td>
                </tr>
                <tr class="item_tr unavailable" id="row_2">
                  <td class="td_prod"><span class="_pid">P69726-B21</span></td>
                  <td class="item_desc">NVIDIA RTX Pro 6000 Ada 48GB GPU</td>
                  <td class="item_price">$7,800.00</td>
                  <td class="item_start_date">2024-01-15</td>
                  <td class="item_end_date"></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const dom = new JSDOM(html);
  const result = parseUnavailableDomRules(dom.window.document);

  assert.equal(result.unavailableRules.length, 1);
  const rule = result.unavailableRules[0];
  assert.equal(rule.ruleType, 'AMBIENT_GATE');
  assert.equal(rule.section, 'Graphics Options');
  assert.equal(rule.affectedSkusCount, 2);
  assert.deepEqual(rule.affectedSkus, ['S3Z84AAE', 'P69726-B21']);

  assert.equal(result.unavailableSkus.length, 2);
  const sku1 = result.unavailableSkus[0];
  assert.equal(sku1.sku, 'S3Z84AAE'); // 'CS\n ' prefix cleaned
  assert.equal(sku1.description, 'NVIDIA H200 NVL 141GB GPU Module');
  assert.equal(sku1.listPrice, 32500);
  assert.equal(sku1.supplyBadge, 'CS');
  assert.equal(sku1.supplyTitle, 'Supply Constrained');
  assert.equal(sku1.isSelectable, false);
  assert.equal(sku1.status, 'PORTAL_CONDITIONAL');
  assert.match(sku1.ineligibilityReason, /30C Ambient Temperature cannot be selected together/);

  const sku2 = result.unavailableSkus[1];
  assert.equal(sku2.sku, 'P69726-B21');
  assert.equal(sku2.listPrice, 7800);
  assert.equal(sku2.isSelectable, false);
});

test('parseUnavailableDomRules handles fallback row IDs with choice_column_titles', () => {
  const html = `
    <html>
      <body>
        <table>
          <tr class="section_header"><td>Memory Options</td></tr>
          <tr class="uavailableTable_tr">
            <td>
              <table class="UavailableTable">
                <tr id="choice_column_titles_49201-Mixing of Heat sink is not allowed.">
                  <td class="choice_header1">Unavailable Options</td>
                </tr>
                <tr class="item_tr unavailable">
                  <td><span class="_pid">P45916-B21</span></td>
                  <td class="item_desc">HPE Standard Heat Sink Kit</td>
                  <td class="item_price">$150.00</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const dom = new JSDOM(html);
  const result = parseUnavailableDomRules(dom.window.document);

  assert.equal(result.unavailableRules.length, 1);
  assert.equal(result.unavailableRules[0].ruleType, 'MUTUAL_EXCLUSION');
  assert.equal(result.unavailableRules[0].reason, 'Mixing of Heat sink is not allowed.');
  assert.equal(result.unavailableSkus.length, 1);
  assert.equal(result.unavailableSkus[0].sku, 'P45916-B21');
});

test('applyUnavailableDomRulesAndSkus enriches existing SKUs and inserts new conditional catalog entries', () => {
  const hardwareEntries = [
    {
      parentCategory: 'Graphics Options',
      subCategory: 'GPU Modules',
      constraint: '',
      rules: [],
      skus: [
        {
          'Product #': 'S3Z84AAE',
          sku: 'S3Z84AAE',
          Description: 'NVIDIA H200 NVL 141GB GPU',
          'Unit Price (USD)': '32500.00',
          listPrice: 32500,
          'Option Type': 'CTO'
        }
      ]
    }
  ];

  const unavailableRules = [
    {
      ruleId: 'RULE_1',
      ruleType: 'AMBIENT_GATE',
      section: 'Graphics Options',
      reason: 'RTX Pro 6000/ H200 NVL GPU and 30C Ambient Temperature cannot be selected together.',
      affectedSkus: ['S3Z84AAE', 'P69726-B21']
    }
  ];

  const unavailableSkus = [
    {
      sku: 'S3Z84AAE',
      description: 'NVIDIA H200 NVL 141GB GPU',
      listPrice: 32500,
      section: 'Graphics Options',
      ruleType: 'AMBIENT_GATE',
      ineligibilityReason: 'RTX Pro 6000/ H200 NVL GPU and 30C Ambient Temperature cannot be selected together.',
      isSelectable: false
    },
    {
      sku: 'P69726-B21',
      description: 'NVIDIA RTX Pro 6000 Ada 48GB GPU',
      listPrice: 7800,
      section: 'Graphics Options',
      ruleType: 'AMBIENT_GATE',
      ineligibilityReason: 'RTX Pro 6000/ H200 NVL GPU and 30C Ambient Temperature cannot be selected together.',
      isSelectable: false
    }
  ];

  const rules = applyUnavailableDomRulesAndSkus(hardwareEntries, [], unavailableRules, unavailableSkus);

  // 1. Rules compiled
  assert.equal(rules.length, 1);
  assert.equal(rules[0].ruleType, 'CONDITIONAL_VISIBILITY');
  assert.equal(rules[0].vendorRuleClassification, 'AMBIENT_GATE');
  assert.equal(rules[0].conditionKey, 'ambientTempC');
  assert.equal(rules[0].conditionOperator, 'unknown');
  assert.equal(rules[0].thresholdValue, null);
  assert.equal(rules[0].observedTemperatureC, 30);
  assert.equal(rules[0].source, 'HPE_OCA_DOM_UNAVAILABLE_TABLE');

  // 2. Existing SKU S3Z84AAE enriched
  const existingSku = hardwareEntries[0].skus.find(s => s.sku === 'S3Z84AAE');
  assert.ok(existingSku);
  assert.equal(existingSku.isSelectable, false);
  assert.equal(existingSku.status, 'PORTAL_CONDITIONAL');
  assert.equal(existingSku.visibilityState, 'PORTAL_CONDITIONAL');
  assert.match(existingSku.ineligibilityReason, /30C Ambient Temperature/);

  // 3. New SKU P69726-B21 inserted under Graphics Options
  const newSku = hardwareEntries[0].skus.find(s => s.sku === 'P69726-B21');
  assert.ok(newSku);
  assert.equal(newSku.isSelectable, false);
  assert.equal(newSku.status, 'PORTAL_CONDITIONAL');
  assert.equal(newSku.listPrice, 7800);
});

test('parseUnavailableDomRules against real user DOM sample if present', () => {
  const samplePath = 'C:/Users/latha/OneDrive/Documents/HiddenSkuwithReasoning.md';
  if (!fs.existsSync(samplePath)) {
    // Optional fixture verification when run in isolated CI
    return;
  }

  const html = fs.readFileSync(samplePath, 'utf8');
  const dom = new JSDOM(html);
  const result = parseUnavailableDomRules(dom.window.document);

  assert.ok(result.unavailableRules.length >= 30, `Expected at least 30 rules, found ${result.unavailableRules.length}`);
  assert.ok(result.unavailableSkus.length >= 100, `Expected at least 100 SKUs, found ${result.unavailableSkus.length}`);

  // Validate presence of key enterprise rules
  const ruleTypes = new Set(result.unavailableRules.map(r => r.ruleType));
  assert.ok(ruleTypes.has('AMBIENT_GATE'), 'Must detect AMBIENT_GATE rules');
  assert.ok(ruleTypes.has('CHASSIS_GATE'), 'Must detect CHASSIS_GATE rules');
  assert.ok(ruleTypes.has('MUTUAL_EXCLUSION'), 'Must detect MUTUAL_EXCLUSION rules');
  assert.ok(ruleTypes.has('MEMORY_MIXING'), 'Must detect MEMORY_MIXING rules');

  // Validate that no SKU contains the status prefix
  for (const s of result.unavailableSkus) {
    assert.doesNotMatch(s.sku, /^(?:OB|CS|90)\s+/i, `SKU ${s.sku} contains unstripped status badge`);
    assert.equal(s.isSelectable, false);
    assert.equal(s.status, 'PORTAL_CONDITIONAL');
  }
});
