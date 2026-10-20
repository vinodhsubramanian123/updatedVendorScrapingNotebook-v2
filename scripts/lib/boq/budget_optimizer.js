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
const { parseObservedUnitPrice } = require('./pricing_presence');

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
          const rawPrice = match['Unit Price (USD)'] ?? match['Price (USD)'] ?? match['Price'] ?? match.priceUsd;
          const parsed = parseObservedUnitPrice(rawPrice);
          if (parsed !== null && parsed > 0) return parsed;
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
    } catch {}
  }

  return null; // Nullable observed pricing contract (F16): Return null if not found
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
      return families[chassisFamily] || [];
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
  let knownCurrentBomCost = 0;
  let zeroPriceCount = 0;
  const { readPortalReceipt, receiptMatches, normalizeSku } = require('./portal_receipt');
  const portalReceipt = resolvedChassisDir ? readPortalReceipt(resolvedChassisDir) : null;
  const isReceiptValidForBOM = Boolean(
    portalReceipt &&
    receiptMatches(portalReceipt, evalResults?.candidate || evalResults, {
      chassisKey: evalResults?.chassisKey || evalResults?.chassisInfo?.model || evalResults?.model,
      baseSku: evalResults?.baseSku || evalResults?.chassisInfo?.baseSku,
      configurationName: evalResults?.configurationName || evalResults?.configName,
      selectors: evalResults?.selectors,
      serverCount: multiplier
    })
  );

  // GAP-10: Buildability gate — upgrades MUST NOT run on unbuildable configurations
  const _buildabilityConfirmed = evalResults?.isMathClean === true && evalResults?.isGraphClean === true;

  // Calculate current baseline BOM cost (preserving quoted vs. catalog estimate provenance, INV-158)
  const { isConfirmedFreeSku } = require('../catalog/sku_versioning.js');
  let hasUnquotedCustomerItems = false;
  let hasUnpricedCustomerItems = false;
  const unavailableSkus = [];
  let quotedSubtotal = 0;
  let catalogEstimatedSubtotal = 0;

  consolidatedItems.forEach(it => {
    if (it.inputUnitPriceUsd === undefined) {
      it.inputUnitPriceUsd = (typeof it.unitPriceUsd === 'number' && Number.isFinite(it.unitPriceUsd)) ? it.unitPriceUsd : null;
    }
    const receiptRow = isReceiptValidForBOM ? portalReceipt?.rows.find(row => row.sku === normalizeSku(it.sku) && row.quantity === outputQuantities(it, multiplier).totalQty) : null;
    const catalogEstimatePrice = receiptRow ? receiptRow.unitPriceUsd : getSkuListPrice(it.sku, catalogData, resolvedChassisDir);
    const isFree = receiptRow ? catalogEstimatePrice === 0 : isConfirmedFreeSku(it.sku, it.description);
    if (receiptRow) {
      it.receiptPriceSource = `Live OCA BOM ${portalReceipt.capturedAt}`;
      it.isConfirmedZeroPrice = isFree;
    }
    it.catalogListPriceUsd = catalogEstimatePrice;

    const observedQuote = parseObservedUnitPrice(it.inputUnitPriceUsd);
    const hasQuotedPrice = observedQuote !== null && (observedQuote > 0 || isFree || it.isConfirmedZeroPrice === true) && it.priceConflict !== true;
    const lineQty = outputQuantities(it, multiplier).totalQty;

    if (hasQuotedPrice) {
      it.quotedUnitPriceUsd = observedQuote;
      it.unitPriceUsd = observedQuote;
      it.extendedPriceUsd = it.unitPriceUsd * it.quantity;
      it.priceSource = it.priceSource || 'CUSTOMER_QUOTE';
      if (it.unitPriceUsd === 0 && !isFree && !it.isConfirmedZeroPrice) zeroPriceCount++;
      quotedSubtotal += it.unitPriceUsd * lineQty;
      knownCurrentBomCost += it.unitPriceUsd * lineQty;
      catalogEstimatedSubtotal += it.unitPriceUsd * lineQty;
    } else {
      hasUnquotedCustomerItems = true;
      it.quotedUnitPriceUsd = null;
      it.unitPriceUsd = null;
      it.extendedPriceUsd = null;
      it.estimatedUnitPriceUsd = catalogEstimatePrice;
      if (receiptRow) {
        it.priceSource = `Live OCA BOM ${portalReceipt.capturedAt}`;
      } else if (catalogEstimatePrice !== null) {
        it.priceSource = 'CATALOG_ESTIMATE';
      } else {
        it.priceSource = 'UNPRICED';
        unavailableSkus.push(it.sku);
        hasUnpricedCustomerItems = true;
      }
      if (catalogEstimatePrice === null) {
        // Unpriced SKU
      } else if (catalogEstimatePrice === 0 && !isFree) {
        zeroPriceCount++;
      } else {
        knownCurrentBomCost += catalogEstimatePrice * lineQty;
        catalogEstimatedSubtotal += catalogEstimatePrice * lineQty;
      }
    }
  });

  // Calculate mandatory buildable BOM cost (Injecting direct SKU fixes)
  let knownMandatoryBomCost = knownCurrentBomCost;
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
      const receiptDepRow = isReceiptValidForBOM ? portalReceipt?.rows.find(row => row.sku === normalizeSku(dep.sku) && row.quantity === outputQuantities(dep, multiplier).totalQty) : null;
      const unitPrice = receiptDepRow ? receiptDepRow.unitPriceUsd : getSkuListPrice(dep.sku, catalogData, resolvedChassisDir);
      const isFree = receiptDepRow ? unitPrice === 0 : isConfirmedFreeSku(dep.sku, dep.description);
      if (unitPrice === null) {
        unavailableSkus.push(dep.sku);
      } else if (unitPrice === 0 && !isFree) {
        zeroPriceCount++;
      }
      const knownExtPrice = unitPrice !== null ? unitPrice * outputQuantities(dep, multiplier).totalQty : null;
      if (knownExtPrice !== null) {
        knownMandatoryBomCost += knownExtPrice;
      }
      injectedSkus.push({
        sku: dep.sku,
        description: dep.description,
        quantity: dep.quantity,
        unitPriceUsd: unitPrice,
        extendedPriceUsd: knownExtPrice,
        rule: dep.rule
      });
    });
  }

  const hasUnavailableSkus = unavailableSkus.length > 0;
  const budgetAssessmentComplete = consolidatedItems.length > 0 &&
    zeroPriceCount === 0 &&
    !hasUnavailableSkus &&
    Number.isFinite(knownMandatoryBomCost);

  const currentBomCostUsd = (!hasUnpricedCustomerItems && consolidatedItems.length > 0) ? knownCurrentBomCost : (consolidatedItems.length === 0 ? 0 : null);
  const mandatoryBomCostUsd = budgetAssessmentComplete ? knownMandatoryBomCost : (consolidatedItems.length === 0 ? 0 : null);
  const totalOrderCostUsd = mandatoryBomCostUsd;

  const hasBudgetConstraint = targetBudgetUsd > 0;
  const knownCostExceedsBudget = hasBudgetConstraint && Number.isFinite(knownMandatoryBomCost) && knownMandatoryBomCost > targetBudgetUsd;
  const isBudgetExceeded = knownCostExceedsBudget ? true : budgetAssessmentComplete ? false : null;
  const budgetOverrunUsd = isBudgetExceeded ? (knownMandatoryBomCost - targetBudgetUsd) : !budgetAssessmentComplete ? null : 0;
  const remainingBudgetUsd = !budgetAssessmentComplete ? null : (!isBudgetExceeded && hasBudgetConstraint) ? (targetBudgetUsd - knownMandatoryBomCost) : 0;

  // Dynamic upgrade recommendations based on remaining surplus budget and family templates
  const recommendedUpgrades = [];
  if (_buildabilityConfirmed && budgetAssessmentComplete && remainingBudgetUsd > 0) {
    const family = (catalogData && catalogData.metadata && catalogData.metadata.family) ? catalogData.metadata.family : 'ProLiant';
    const templates = loadUpgradeTemplates(family);

    templates.forEach(tpl => {
      if (remainingBudgetUsd >= tpl.minSurplusUsd) {
        // Retrieve dynamic price from catalog if available, fallback to estimated
        const catalogPrice = getSkuListPrice(tpl.sku, catalogData, resolvedChassisDir);
        const finalPrice = catalogPrice > 0 ? catalogPrice : tpl.estimatedCostUsd;
        const qty = tpl.qty || 1;
        const orderCost = finalPrice * qty * multiplier;
        if (!Number.isFinite(orderCost) || orderCost <= 0 || orderCost > remainingBudgetUsd) return;
        recommendedUpgrades.push({
          upgrade: tpl.upgrade,
          sku: tpl.sku,
          qty: qty * multiplier,
          costUsd: orderCost,
          benefit: tpl.benefit
        });
      }
    });
  }

  const hasZeroPriceSkus = zeroPriceCount > 0 || hasUnavailableSkus;
  const goldenRuleSummary = !budgetAssessmentComplete
    ? `PRICING INCOMPLETE: Complete cost and surplus are unknown.${knownCostExceedsBudget ? ' The known-price subtotal already exceeds the target budget.' : ' Budget compliance cannot be determined from the known-price subtotal.'}`
    : !hasBudgetConstraint
    ? `ℹ️ No budget constraint provided — showing mandatory buildable cost only.`
    : (isBudgetExceeded
      ? `⚠️ GOLDEN RULE MANDATE: Target budget of $${targetBudgetUsd.toLocaleString('en-US')} is exceeded by +$${budgetOverrunUsd.toLocaleString('en-US')}. Mandatory buildable cost is $${mandatoryBomCostUsd.toLocaleString('en-US')} to eliminate unbuildable errors.`
      : `${_buildabilityConfirmed ? 'BUDGET ESTIMATE WITHIN TARGET' : 'BASELINE VALIDATION REQUIRED'}: Estimated component cost $${mandatoryBomCostUsd.toLocaleString('en-US')} fits within target budget of $${targetBudgetUsd.toLocaleString('en-US')} (Surplus: $${remainingBudgetUsd.toLocaleString('en-US')}).`);

  return {
    targetBudgetUsd,
    currentBomCostUsd,
    mandatoryBomCostUsd,
    totalOrderCostUsd,
    knownCurrentBomCostUsd: knownCurrentBomCost,
    knownMandatorySubtotalUsd: knownMandatoryBomCost,
    knownOrderSubtotalUsd: knownMandatoryBomCost,
    quotedBomCostUsd: hasUnquotedCustomerItems ? null : quotedSubtotal,
    knownQuotedSubtotalUsd: quotedSubtotal,
    catalogEstimatedSubtotalUsd: catalogEstimatedSubtotal,
    hasUnquotedCustomerItems,
    unavailableSkus,
    priceUnavailableSkus: unavailableSkus,
    pricingBasis: (!hasUnquotedCustomerItems && consolidatedItems.length > 0 && !hasUnavailableSkus)
      ? 'CUSTOMER_QUOTE'
      : (quotedSubtotal > 0 ? 'HYBRID_QUOTE_ESTIMATE' : 'CATALOG_ESTIMATE'),
    pricingComplete: !hasUnquotedCustomerItems && !hasUnavailableSkus,
    injectedSkus,
    hasBudgetConstraint,
    budgetAssessmentComplete,
    isBudgetExceeded,
    budgetOverrunUsd,
    remainingBudgetUsd,
    hasZeroPriceSkus,
    zeroPriceCount,
    recommendedUpgrades,
    upgradeStatus: _buildabilityConfirmed ? 'ADVISORY' : 'BASELINE_VALIDATION_REQUIRED',
    goldenRuleSummary
  };
}

module.exports = {
  getSkuListPrice,
  optimizeForBudget,
  loadUpgradeTemplates: loadFamilyUpgradeTemplates,
  loadFamilyUpgradeTemplates
};
