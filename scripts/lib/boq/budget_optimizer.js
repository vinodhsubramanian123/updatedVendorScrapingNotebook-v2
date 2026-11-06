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
          if (parsed === 0 && (match.isConfirmedZeroPrice === true ||
            require('../catalog/sku_versioning').isConfirmedFreeSku(skuStr, match.Description || match.description))) return 0;
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
function _processItemPricing(it, ctx) {
  const { isReceiptValidForBOM, portalReceipt, catalogData, resolvedChassisDir, multiplier, outputQuantities, normalizeSku, isConfirmedFreeSku } = ctx;
  const previousReceiptSource = it.receiptPriceSource;
  if (previousReceiptSource) {
    delete it.receiptPriceSource;
    delete it.isConfirmedZeroPrice;
    if (it.priceSource === previousReceiptSource) delete it.priceSource;
  }
  if (it.inputUnitPriceUsd === undefined) {
    it.inputUnitPriceUsd = (typeof it.unitPriceUsd === 'number' && Number.isFinite(it.unitPriceUsd)) ? it.unitPriceUsd : null;
  }
  const lineQty = outputQuantities(it, multiplier).totalQty;
  const receiptRow = isReceiptValidForBOM ? portalReceipt?.rows.find(row => row.sku === normalizeSku(it.sku) && row.quantity === lineQty) : null;
  const catalogEstimatePrice = receiptRow ? receiptRow.unitPriceUsd : getSkuListPrice(it.sku, catalogData, resolvedChassisDir);
  const isFree = catalogEstimatePrice === 0 || isConfirmedFreeSku(it.sku, it.description);
  if (receiptRow) {
    it.receiptPriceSource = `Live OCA BOM ${portalReceipt.capturedAt}`;
    it.isConfirmedZeroPrice = isFree;
  }
  it.catalogListPriceUsd = catalogEstimatePrice;

  const observedQuote = parseObservedUnitPrice(it.inputUnitPriceUsd);
  const hasQuotedPrice = observedQuote !== null && (observedQuote > 0 || isFree || it.isConfirmedZeroPrice === true) && it.priceConflict !== true;

  if (hasQuotedPrice) {
    it.quotedUnitPriceUsd = observedQuote;
    it.unitPriceUsd = observedQuote;
    it.extendedPriceUsd = it.unitPriceUsd * it.quantity;
    it.priceSource = it.priceSource || 'CUSTOMER_QUOTE';
    if (it.unitPriceUsd === 0 && !isFree && !it.isConfirmedZeroPrice) ctx.zeroPriceCount++;
    ctx.quotedSubtotal += it.unitPriceUsd * lineQty;
    ctx.knownCurrentBomCost += it.unitPriceUsd * lineQty;
    ctx.catalogEstimatedSubtotal += it.unitPriceUsd * lineQty;
  } else {
    ctx.hasUnquotedCustomerItems = true;
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
      ctx.unavailableSkus.push(it.sku);
      ctx.hasUnpricedCustomerItems = true;
    }
    if (catalogEstimatePrice === 0 && !isFree) {
      ctx.zeroPriceCount++;
    } else if (catalogEstimatePrice !== null) {
      ctx.knownCurrentBomCost += catalogEstimatePrice * lineQty;
      ctx.catalogEstimatedSubtotal += catalogEstimatePrice * lineQty;
    }
  }
}

function _processDependenciesPricing(missingDependencies, ctx) {
  if (!missingDependencies || !Array.isArray(missingDependencies)) return [];
  const { isReceiptValidForBOM, portalReceipt, catalogData, resolvedChassisDir, multiplier, outputQuantities, normalizeSku, isConfirmedFreeSku } = ctx;

  const dedupedDeps = [];
  const skuMap = new Map();
  missingDependencies.forEach(dep => {
    if (skuMap.has(dep.sku)) {
      skuMap.get(dep.sku).quantity = Math.max(skuMap.get(dep.sku).quantity, dep.quantity);
    } else {
      const depCopy = { ...dep };
      skuMap.set(dep.sku, depCopy);
      dedupedDeps.push(depCopy);
    }
  });

  const injectedSkus = [];
  dedupedDeps.forEach(dep => {
    const lineQty = outputQuantities(dep, multiplier).totalQty;
    const receiptDepRow = isReceiptValidForBOM ? portalReceipt?.rows.find(row => row.sku === normalizeSku(dep.sku) && row.quantity === lineQty) : null;
    const unitPrice = receiptDepRow ? receiptDepRow.unitPriceUsd : getSkuListPrice(dep.sku, catalogData, resolvedChassisDir);
    const isFree = unitPrice === 0 || isConfirmedFreeSku(dep.sku, dep.description);
    if (unitPrice === null) {
      ctx.unavailableSkus.push(dep.sku);
    } else if (unitPrice === 0 && !isFree) {
      ctx.zeroPriceCount++;
    }
    const knownExtPrice = unitPrice !== null ? unitPrice * lineQty : null;
    if (knownExtPrice !== null) {
      ctx.knownMandatoryBomCost += knownExtPrice;
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

  return injectedSkus;
}

function _buildUpgradeRecommendations(remainingBudgetUsd, catalogData, resolvedChassisDir, multiplier) {
  if (remainingBudgetUsd <= 0) return [];
  const family = catalogData?.metadata?.family || 'ProLiant';
  const templates = loadUpgradeTemplates(family);
  const recommendedUpgrades = [];

  templates.forEach(tpl => {
    if (remainingBudgetUsd >= tpl.minSurplusUsd) {
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

  return recommendedUpgrades;
}

function _isReceiptValid(resolvedChassisDir, evalResults, consolidatedItems, multiplier) {
  if (!resolvedChassisDir) return false;
  const { readPortalReceipt, receiptMatches } = require('./portal_receipt');
  const portalReceipt = readPortalReceipt(resolvedChassisDir);
  if (!portalReceipt) return false;

  const receiptScope = evalResults?.candidate || evalResults || {};
  return Boolean(
    receiptMatches(portalReceipt, consolidatedItems, {
      chassisKey: receiptScope.chassisKey || receiptScope.chassisInfo?.model || receiptScope.model || receiptScope.chassis,
      baseSku: receiptScope.baseSku || receiptScope.chassisInfo?.baseSku,
      configurationName: receiptScope.configurationName || receiptScope.configName,
      configurationId: receiptScope.configurationId,
      selectors: receiptScope.selectors,
      serverCount: multiplier
    })
  );
}

function _computeBomCosts(ctx, consolidatedItems, budgetAssessmentComplete) {
  let currentBomCostUsd = null;
  if (!ctx.hasUnpricedCustomerItems && consolidatedItems.length > 0) {
    currentBomCostUsd = ctx.knownCurrentBomCost;
  } else if (consolidatedItems.length === 0) {
    currentBomCostUsd = 0;
  }

  let mandatoryBomCostUsd = null;
  if (budgetAssessmentComplete) {
    mandatoryBomCostUsd = ctx.knownMandatoryBomCost;
  } else if (consolidatedItems.length === 0) {
    mandatoryBomCostUsd = 0;
  }

  return {
    currentBomCostUsd,
    mandatoryBomCostUsd,
    totalOrderCostUsd: mandatoryBomCostUsd
  };
}

function _computeBudgetSurplusAndOverrun(ctx, targetBudgetUsd, budgetAssessmentComplete) {
  const hasBudgetConstraint = targetBudgetUsd > 0;
  const knownCostExceedsBudget = hasBudgetConstraint && Number.isFinite(ctx.knownMandatoryBomCost) && ctx.knownMandatoryBomCost > targetBudgetUsd;

  let isBudgetExceeded = null;
  if (knownCostExceedsBudget) {
    isBudgetExceeded = true;
  } else if (budgetAssessmentComplete) {
    isBudgetExceeded = false;
  }

  let budgetOverrunUsd = null;
  if (isBudgetExceeded) {
    budgetOverrunUsd = ctx.knownMandatoryBomCost - targetBudgetUsd;
  } else if (budgetAssessmentComplete) {
    budgetOverrunUsd = 0;
  }

  let remainingBudgetUsd = null;
  if (budgetAssessmentComplete) {
    remainingBudgetUsd = (!isBudgetExceeded && hasBudgetConstraint) ? (targetBudgetUsd - ctx.knownMandatoryBomCost) : 0;
  }

  return {
    hasBudgetConstraint,
    knownCostExceedsBudget,
    isBudgetExceeded,
    budgetOverrunUsd,
    remainingBudgetUsd
  };
}

function _resolvePricingBasis(ctx, consolidatedItems, hasUnavailableSkus) {
  if (!ctx.hasUnquotedCustomerItems && consolidatedItems.length > 0 && !hasUnavailableSkus) {
    return 'CUSTOMER_QUOTE';
  }
  return ctx.quotedSubtotal > 0 ? 'HYBRID_QUOTE_ESTIMATE' : 'CATALOG_ESTIMATE';
}

function _buildGoldenRuleSummary(targetBudgetUsd, budgetState, mandatoryBomCostUsd, buildabilityConfirmed) {
  const { budgetAssessmentComplete, knownCostExceedsBudget, hasBudgetConstraint, isBudgetExceeded, budgetOverrunUsd, remainingBudgetUsd } = budgetState;

  if (!budgetAssessmentComplete) {
    const clause = knownCostExceedsBudget ? ' The known-price subtotal already exceeds the target budget.' : ' Budget compliance cannot be determined from the known-price subtotal.';
    return `PRICING INCOMPLETE: Complete cost and surplus are unknown.${clause}`;
  }
  if (!hasBudgetConstraint) {
    return 'ℹ️ No budget constraint provided — showing mandatory buildable cost only.';
  }
  if (isBudgetExceeded) {
    return `⚠️ GOLDEN RULE MANDATE: Target budget of $${targetBudgetUsd.toLocaleString('en-US')} is exceeded by +$${budgetOverrunUsd.toLocaleString('en-US')}. Mandatory buildable cost is $${mandatoryBomCostUsd.toLocaleString('en-US')} to eliminate unbuildable errors.`;
  }
  const prefix = buildabilityConfirmed ? 'BUDGET ESTIMATE WITHIN TARGET' : 'BASELINE VALIDATION REQUIRED';
  return `${prefix}: Estimated component cost $${mandatoryBomCostUsd.toLocaleString('en-US')} fits within target budget of $${targetBudgetUsd.toLocaleString('en-US')} (Surplus: $${remainingBudgetUsd.toLocaleString('en-US')}).`;
}

/**
 * Perform comprehensive budget optimization and surplus/overrun analysis.
 */
function optimizeForBudget(consolidatedItems, evalResults, targetBudgetUsd = 0, catalogData = null, chassisDir = null) {
  const { outputQuantities } = require('./configuration_context');
  const resolvedChassisDir = chassisDir || evalResults?.chassisDir || evalResults?.sourceDirectory || null;
  const multiplier = evalResults?.configurationContext?.multiplier || 1;
  const { readPortalReceipt, normalizeSku } = require('./portal_receipt');
  const portalReceipt = resolvedChassisDir ? readPortalReceipt(resolvedChassisDir) : null;
  const isReceiptValidForBOM = _isReceiptValid(resolvedChassisDir, evalResults, consolidatedItems, multiplier);

  const _buildabilityConfirmed = evalResults?.isMathClean === true && evalResults?.isGraphClean === true;
  const { isConfirmedFreeSku } = require('../catalog/sku_versioning.js');

  const ctx = {
    isReceiptValidForBOM,
    portalReceipt,
    catalogData,
    resolvedChassisDir,
    multiplier,
    outputQuantities,
    normalizeSku,
    isConfirmedFreeSku,
    knownCurrentBomCost: 0,
    knownMandatoryBomCost: 0,
    zeroPriceCount: 0,
    quotedSubtotal: 0,
    catalogEstimatedSubtotal: 0,
    unavailableSkus: [],
    hasUnquotedCustomerItems: false,
    hasUnpricedCustomerItems: false
  };

  consolidatedItems.forEach(it => _processItemPricing(it, ctx));
  ctx.knownMandatoryBomCost = ctx.knownCurrentBomCost;

  const injectedSkus = _processDependenciesPricing(evalResults?.missingDependencies, ctx);

  const hasUnavailableSkus = ctx.unavailableSkus.length > 0;
  const budgetAssessmentComplete = consolidatedItems.length > 0 &&
    ctx.zeroPriceCount === 0 &&
    !hasUnavailableSkus &&
    Number.isFinite(ctx.knownMandatoryBomCost);

  const { currentBomCostUsd, mandatoryBomCostUsd, totalOrderCostUsd } = _computeBomCosts(ctx, consolidatedItems, budgetAssessmentComplete);
  const budgetState = _computeBudgetSurplusAndOverrun(ctx, targetBudgetUsd, budgetAssessmentComplete);
  budgetState.budgetAssessmentComplete = budgetAssessmentComplete;

  const recommendedUpgrades = (_buildabilityConfirmed && budgetAssessmentComplete)
    ? _buildUpgradeRecommendations(budgetState.remainingBudgetUsd, catalogData, resolvedChassisDir, multiplier)
    : [];

  const goldenRuleSummary = _buildGoldenRuleSummary(targetBudgetUsd, budgetState, mandatoryBomCostUsd, _buildabilityConfirmed);

  return {
    targetBudgetUsd,
    currentBomCostUsd,
    mandatoryBomCostUsd,
    totalOrderCostUsd,
    knownCurrentBomCostUsd: ctx.knownCurrentBomCost,
    knownMandatorySubtotalUsd: ctx.knownMandatoryBomCost,
    knownOrderSubtotalUsd: ctx.knownMandatoryBomCost,
    quotedBomCostUsd: ctx.hasUnquotedCustomerItems ? null : ctx.quotedSubtotal,
    knownQuotedSubtotalUsd: ctx.quotedSubtotal,
    catalogEstimatedSubtotalUsd: ctx.catalogEstimatedSubtotal,
    hasUnquotedCustomerItems: ctx.hasUnquotedCustomerItems,
    unavailableSkus: ctx.unavailableSkus,
    priceUnavailableSkus: ctx.unavailableSkus,
    pricingBasis: _resolvePricingBasis(ctx, consolidatedItems, hasUnavailableSkus),
    pricingComplete: !ctx.hasUnquotedCustomerItems && !hasUnavailableSkus,
    injectedSkus,
    hasBudgetConstraint: budgetState.hasBudgetConstraint,
    budgetAssessmentComplete,
    isBudgetExceeded: budgetState.isBudgetExceeded,
    budgetOverrunUsd: budgetState.budgetOverrunUsd,
    remainingBudgetUsd: budgetState.remainingBudgetUsd,
    hasZeroPriceSkus: ctx.zeroPriceCount > 0 || hasUnavailableSkus,
    zeroPriceCount: ctx.zeroPriceCount,
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
