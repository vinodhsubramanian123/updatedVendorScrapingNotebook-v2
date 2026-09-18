'use strict';
/**
 * scripts/lib/budget_optimizer.js — Budget-Constrained Solution Optimization Engine
 *
 * Implements the Golden Rule: 100% Solution Validation WITHOUT ANY Unbuildable Errors.
 * Evaluates target CapEx budgets against mandatory buildable SKUs, computes minimum overrun deltas,
 * or allocates remaining surplus budget to highest-impact performance upgrades.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU } = require('../catalog/sku.js');

/**
 * Get unit list price for a SKU (USD) by looking it up in the parsed catalog.
 * @param {string} skuStr 
 * @param {object} catalogData 
 * @returns {number} Price in USD
 */
function getSkuListPrice(skuStr, catalogData = null, chassisDir = null) {
  const clean = cleanBaseSKU(skuStr);
  if (catalogData && Array.isArray(catalogData.entries)) {
    for (const sub of catalogData.entries) {
      if (Array.isArray(sub.skus)) {
        const match = sub.skus.find(s => s['Product #'] && cleanBaseSKU(s['Product #']) === clean);
        if (match) {
          const rawPrice = match['Unit Price (USD)'] || match['Price (USD)'] || match['Price'] || match.priceUsd;
          if (rawPrice) {
            const parsed = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
            if (!isNaN(parsed) && parsed > 0) return parsed;
          }
        }
      }
    }
  }

  // Dynamic fallback to historical price layer if catalog price is zero or missing (INV-33 & INV-34)
  if (chassisDir) {
    try {
      const { getHistoricalSkuPrice } = require('../catalog/sku_versioning.js');
      const histResult = getHistoricalSkuPrice(skuStr, chassisDir);
      const histPrice = Number(histResult?.priceUsd);
      if (Number.isFinite(histPrice) && histPrice > 0) return histPrice;
    } catch (_) {}
  }

  return 0.00; // Zero Hardcoding Rule: Return 0 if not found
}

/**
 * Load family upgrade templates from config file.
 * @param {string} chassisFamily (e.g. 'ProLiant', 'Synergy')
 * @returns {Array} List of upgrade template objects
 */
function loadFamilyUpgradeTemplates(chassisFamily = 'ProLiant') {
  try {
    const templatePath = path.join(__dirname, '..', '..', 'config', 'upgrade_templates.json');
    if (fs.existsSync(templatePath)) {
      const allTemplates = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
      const families = allTemplates.families || allTemplates;
      return families[chassisFamily] || families['ProLiant'] || [];
    }
  } catch (err) {
    console.warn(`[budget_optimizer] Warning: Failed to load budget upgrade templates: ${err.message}`);
  }
  return [];
}

const loadUpgradeTemplates = loadFamilyUpgradeTemplates;

/**
 * Executes post-buildability budget-constrained optimization on the BOM.
 * If baseline BOM cost is below targetBudgetUsd, suggests value upgrades.
 * If baseline BOM cost exceeds targetBudgetUsd, flags minimum CapEx overrun.
 * 
 * @param {Array} consolidatedItems 
 * @param {object} evalResults 
 * @param {number} targetBudgetUsd 
 * @param {object} catalogData
 * @param {string} chassisDir
 * @returns {object} Optimization analysis
 */
function optimizeForBudget(consolidatedItems, evalResults, targetBudgetUsd = 0, catalogData = null, chassisDir = null) {
  const { outputQuantities } = require('./configuration_context');
  const resolvedChassisDir = chassisDir || evalResults?.chassisDir || evalResults?.sourceDirectory || null;
  const multiplier = evalResults?.configurationContext?.multiplier || 1;
  let currentBomCost = 0;
  let zeroPriceCount = 0;

  // Calculate current baseline BOM cost
  const { isConfirmedFreeSku } = require('../catalog/sku_versioning.js');
  consolidatedItems.forEach(it => {
    const unitPrice = getSkuListPrice(it.sku, catalogData, resolvedChassisDir);
    const isFree = isConfirmedFreeSku(it.sku, it.description);
    if (unitPrice === 0 && !isFree) zeroPriceCount++;
    it.unitPriceUsd = unitPrice;
    it.extendedPriceUsd = unitPrice * it.quantity;
    currentBomCost += unitPrice * outputQuantities(it, multiplier).totalQty;
  });

  // Calculate mandatory buildable BOM cost (Injecting direct SKU fixes)
  let mandatoryBomCost = currentBomCost;
  const injectedSkus = [];

  if (evalResults && evalResults.missingDependencies) {
    const dedupedDeps = [];
    const skuMap = new Map();
    evalResults.missingDependencies.forEach(dep => {
      if (skuMap.has(dep.sku)) {
        skuMap.get(dep.sku).quantity = Math.max(skuMap.get(dep.sku).quantity, dep.quantity);
      } else {
        const depCopy = { ...dep };
        skuMap.set(dep.sku, depCopy);
        dedupedDeps.push(depCopy);
      }
    });

    dedupedDeps.forEach(dep => {
      const unitPrice = getSkuListPrice(dep.sku, catalogData, resolvedChassisDir);
      const isFree = isConfirmedFreeSku(dep.sku, dep.description);
      if (unitPrice === 0 && !isFree) zeroPriceCount++;
      const extPrice = unitPrice * outputQuantities(dep, multiplier).totalQty;
      mandatoryBomCost += extPrice;
      injectedSkus.push({
        sku: dep.sku,
        description: dep.description,
        quantity: dep.quantity,
        unitPriceUsd: unitPrice,
        extendedPriceUsd: extPrice,
        rule: dep.rule
      });
    });
  }

  const hasBudgetConstraint = targetBudgetUsd > 0;
  const isBudgetExceeded = hasBudgetConstraint && mandatoryBomCost > targetBudgetUsd;
  const budgetOverrunUsd = isBudgetExceeded ? (mandatoryBomCost - targetBudgetUsd) : 0;
  const remainingBudgetUsd = (!isBudgetExceeded && hasBudgetConstraint) ? (targetBudgetUsd - mandatoryBomCost) : 0;

  // Dynamic upgrade recommendations based on remaining surplus budget and family templates
  const recommendedUpgrades = [];
  if (remainingBudgetUsd > 0) {
    const family = (catalogData && catalogData.metadata && catalogData.metadata.family) ? catalogData.metadata.family : 'ProLiant';
    const templates = loadUpgradeTemplates(family);

    templates.forEach(tpl => {
      if (remainingBudgetUsd >= tpl.minSurplusUsd) {
        // Retrieve dynamic price from catalog if available, fallback to estimated
        const catalogPrice = getSkuListPrice(tpl.sku, catalogData, resolvedChassisDir);
        const finalPrice = catalogPrice > 0 ? catalogPrice : tpl.estimatedCostUsd;
        recommendedUpgrades.push({
          upgrade: tpl.upgrade,
          sku: tpl.sku,
          qty: tpl.qty || 1,
          costUsd: finalPrice,
          benefit: tpl.benefit
        });
      }
    });
  }

  const hasZeroPriceSkus = zeroPriceCount > 0;
  const goldenRuleSummary = !hasBudgetConstraint
    ? `ℹ️ No budget constraint provided — showing mandatory buildable cost only.`
    : (isBudgetExceeded
      ? `⚠️ GOLDEN RULE MANDATE: Target budget of $${targetBudgetUsd.toLocaleString('en-US')} is exceeded by +$${budgetOverrunUsd.toLocaleString('en-US')}. Mandatory buildable cost is $${mandatoryBomCost.toLocaleString('en-US')} to eliminate unbuildable errors.`
      : `✅ GOLDEN RULE COMPLIANT: Mandatory buildable cost $${mandatoryBomCost.toLocaleString('en-US')} fits within target budget of $${targetBudgetUsd.toLocaleString('en-US')} (Surplus: $${remainingBudgetUsd.toLocaleString('en-US')}).`);

  return {
    targetBudgetUsd,
    currentBomCostUsd: currentBomCost,
    mandatoryBomCostUsd: mandatoryBomCost,
    injectedSkus,
    hasBudgetConstraint,
    isBudgetExceeded,
    budgetOverrunUsd,
    remainingBudgetUsd,
    hasZeroPriceSkus,
    zeroPriceCount,
    recommendedUpgrades,
    goldenRuleSummary
  };
}

module.exports = {
  getSkuListPrice,
  optimizeForBudget,
  loadUpgradeTemplates: loadFamilyUpgradeTemplates,
  loadFamilyUpgradeTemplates
};
