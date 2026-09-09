'use strict';

/**
 * Requirement-led catalog resolution.
 *
 * Part-number similarity is deliberately a tie-breaker only. A candidate must
 * first agree with the role inferred from the complete customer requirement.
 * Low-confidence candidates are returned for HITL review and are never applied.
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

const ROLE_PATTERNS = [
  ['Base Chassis', /\b(?:server|chassis|cto|configure.to.order|dl\d{3}a?|alletra|synergy)\b/i],
  ['Processor', /\b(?:processors?|cpus?|xeon|epyc|cores?)\b/i],
  ['Memory', /\b(?:memory|ram|dimm|rdimm|ddr[45])\b/i],
  ['GPU / Accelerator', /\b(?:gpu|accelerator|nvidia|l40s|a100|h100|h200|a16|a30|a40)\b/i],
  ['Drive Cage / Drive', /\b(?:drives?|drive\s+cage|ssd|hdd|nvme|sas\s+drive|sata\s+drive)\b/i],
  ['Storage Controller', /\b(?:storage controller|raid|smart array|megaraid|trimode|tri-mode|mr\d|sr\d)\b/i],
  ['Fibre Channel HBA', /\b(?:fibre channel|fiber channel|fc hba|host bus adapter)\b/i],
  ['Network Adapter', /\b(?:network|ethernet|nic|ocp|infiniband|base-t)\b/i],
  ['PCIe Riser', /\b(?:riser|pcie slots?|expansion slots?)\b/i],
  ['Power Supply', /\b(?:power supply|psu|titanium|platinum|\d{3,4}w)\b/i]
];

const STOP_WORDS = new Set(['hpe', 'for', 'the', 'and', 'with', 'kit', 'option', 'required', 'require', 'need', 'needs', 'want', 'fio', 'factory', 'integrated']);

function withoutPartNumbers(text) {
  return String(text || '').replace(/\b[A-Z0-9]{3,8}-[A-Z0-9]{3,4}\b/gi, ' ');
}

function rolesFromText(text) {
  return ROLE_PATTERNS.filter(([, pattern]) => pattern.test(text || '')).map(([role]) => role);
}

function tokenize(text) {
  return new Set(withoutPartNumbers(text).toLowerCase().match(/[a-z0-9]+(?:\.[0-9]+)?/g)?.filter(t => t.length > 1 && !STOP_WORDS.has(t)) || []);
}

function numericTokens(text) {
  return new Set(withoutPartNumbers(text).toLowerCase().match(/\d+(?:\.\d+)?(?:gb|tb|ghz|w|gbe|gb)?/g) || []);
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function levenshtein(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = old;
    }
  }
  return row[b.length];
}

function skuSimilarity(left, right) {
  const a = cleanBaseSKU(left).toUpperCase();
  const b = cleanBaseSKU(right).toUpperCase();
  if (!a || !b) return 0;
  return 1 - (levenshtein(a, b) / Math.max(a.length, b.length));
}

function flattenCatalog(catalogData) {
  const candidates = [];
  for (const entry of catalogData?.entries || []) {
    for (const skuData of entry.skus || []) {
      const sku = cleanBaseSKU(skuData['Product #'] || skuData.sku);
      const description = skuData.Description || skuData.description || '';
      if (!sku || !description) continue;
      const declaredRole = skuData['Component Role'] || '';
      const descriptionRole = classifyComponentRole('', description);
      // Description semantics take precedence when a scraped category/component
      // label is stale or misplaced. The disagreement remains observable.
      const role = descriptionRole !== 'Option Component' ? descriptionRole : (declaredRole || classifyComponentRole(entry.parentCategory, description));
      candidates.push({
        sku,
        description,
        role,
        declaredRole,
        categoryConflict: Boolean(declaredRole && descriptionRole !== 'Option Component' && declaredRole !== descriptionRole),
        parentCategory: entry.parentCategory || '',
        subCategory: entry.subCategory || '',
        lifecycleStatus: skuData['Lifecycle Status'] || skuData.Status || '',
        listPrice: Number(skuData.listPrice || skuData['Unit Price (USD)'] || 0)
      });
    }
  }
  return candidates;
}

function inferExpectedRole(line, requirementRoles, coveredRoles) {
  const direct = rolesFromText(line);
  if (direct.length === 1) return { role: direct[0], certainty: 1, source: 'LINE_REQUIREMENT' };
  if (direct.length > 1) return { role: direct[0], certainty: 0.7, source: 'AMBIGUOUS_LINE_REQUIREMENT', alternatives: direct.slice(1) };
  const missing = requirementRoles.filter(role => !coveredRoles.has(role));
  if (missing.length === 1) return { role: missing[0], certainty: 0.82, source: 'WHOLE_BOQ_MISSING_CATEGORY' };
  return { role: null, certainty: 0, source: 'CATEGORY_UNRESOLVED', alternatives: missing };
}

function scoreCandidate(candidate, line, suspectedSku, roleInference) {
  if (!roleInference.role || candidate.role !== roleInference.role) return null;
  const words = jaccard(tokenize(line), tokenize(candidate.description));
  const requestedNumbers = numericTokens(line);
  const candidateNumbers = numericTokens(candidate.description);
  const numeric = requestedNumbers.size ? jaccard(requestedNumbers, candidateNumbers) : 0.5;
  const sku = suspectedSku ? skuSimilarity(suspectedSku, candidate.sku) : 0;
  const lifecyclePenalty = /\b(?:ob|obsolete|eol|discontinued)\b/i.test(candidate.lifecycleStatus) ? 0.2 : 0;
  const score = Math.max(0, Math.min(1,
    (0.42 * roleInference.certainty) + (0.33 * words) + (0.2 * numeric) + (0.05 * sku) - lifecyclePenalty
  ));
  return { ...candidate, score: Number(score.toFixed(4)), scoreBreakdown: { category: roleInference.certainty, semantic: words, numeric, skuTieBreak: sku, lifecyclePenalty } };
}

function extractRequirementIntent(rawLines) {
  const lines = (rawLines || []).map(line => String(line || '').trim()).filter(Boolean);
  const text = lines.join('\n');
  const requestedRoles = Array.from(new Set(rolesFromText(text)));
  const budgetMatch = text.match(/\b(?:budget|maximum|max|under|upto|up to)\s*(?:of|is|:)?\s*\$?([\d,]+(?:\.\d+)?)\b/i);
  return {
    requestedRoles,
    budgetUsd: budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : null,
    hasBaseProductSignal: rolesFromText(text).includes('Base Chassis'),
    rawLineCount: lines.length
  };
}

function resolveRequirementIntent({ items = [], unresolvedRequirements = [], rawLines = [], catalogData = null, productConfirmed = false } = {}) {
  const intent = extractRequirementIntent(rawLines);
  const candidates = flattenCatalog(catalogData);
  const skuIndex = buildCatalogSkuIndex(catalogData);
  const coveredRoles = new Set();
  const unknownItems = [];

  for (const item of items) {
    const catalogItem = skuIndex.get(cleanBaseSKU(item.sku));
    if (!catalogItem) {
      unknownItems.push(item);
      continue;
    }
    const desc = catalogItem.skuData?.Description || catalogItem.skuData?.description || item.description || '';
    coveredRoles.add(catalogItem.skuData?.['Component Role'] || classifyComponentRole('', desc));
  }

  const targets = [
    ...unknownItems.map(item => ({ line: `${item.sku} ${item.description || ''}`.trim(), suspectedPartTokens: [item.sku], sourceItem: item })),
    ...unresolvedRequirements
  ];
  const resolutions = targets.map(target => {
    const suspectedSku = target.suspectedPartTokens?.[0] || target.sourceItem?.sku || '';
    const roleInference = inferExpectedRole(target.line, intent.requestedRoles, coveredRoles);
    const ranked = candidates
      .map(candidate => scoreCandidate(candidate, target.line, suspectedSku, roleInference))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const best = ranked[0] || null;
    const margin = best ? best.score - (ranked[1]?.score || 0) : 0;
    const autoApply = Boolean(productConfirmed && best && best.score >= 0.9 && margin >= 0.08 && roleInference.certainty >= 0.9);
    return {
      input: target.line,
      suspectedSku: suspectedSku || null,
      expectedRole: roleInference.role,
      categoryInference: roleInference,
      candidates: ranked,
      confidence: best?.score || 0,
      margin: Number(margin.toFixed(4)),
      status: autoApply ? 'AUTO_RESOLVED' : 'NEEDS_HUMAN_CLARIFICATION',
      appliedSku: autoApply ? best.sku : null,
      sourceItem: target.sourceItem || null
    };
  });

  const replacements = new Map(resolutions.filter(r => r.appliedSku && r.sourceItem).map(r => [cleanBaseSKU(r.sourceItem.sku), r]));
  for (const resolution of resolutions) {
    if (resolution.status === 'AUTO_RESOLVED' && resolution.expectedRole) coveredRoles.add(resolution.expectedRole);
  }
  const resolvedItems = items.map(item => {
    const resolution = replacements.get(cleanBaseSKU(item.sku));
    if (!resolution) return item;
    return { ...item, sku: resolution.appliedSku, description: resolution.candidates[0].description, correctedFromSku: item.sku, correctionConfidence: resolution.confidence };
  });

  const missingRoles = intent.requestedRoles.filter(role => !coveredRoles.has(role));
  const completeRequirement = rawLines.join(' ');
  const constructionPlan = missingRoles.map(role => {
    const inference = { role, certainty: 1, source: 'WHOLE_BOQ_REQUESTED_CATEGORY' };
    const ranked = candidates
      .map(candidate => scoreCandidate(candidate, completeRequirement, '', inference))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return {
      role,
      status: ranked.length === 1 && ranked[0].score >= 0.9 ? 'UNIQUE_CANDIDATE_REQUIRES_FINAL_VALIDATION' : 'OPTIONS_REQUIRE_HUMAN_SELECTION',
      candidates: ranked
    };
  });
  const requiresHumanClarification = !productConfirmed || resolutions.some(r => r.status !== 'AUTO_RESOLVED') || (items.length === 0 && missingRoles.length > 0);
  return {
    intent,
    resolvedItems,
    resolutions,
    categoryCoverage: { coveredRoles: Array.from(coveredRoles), missingRoles },
    constructionPlan,
    constructionMode: items.length === 0 || missingRoles.length > 0,
    productConfirmed,
    requiresHumanClarification,
    learningEligible: productConfirmed && !requiresHumanClarification
  };
}

module.exports = {
  extractRequirementIntent,
  flattenCatalog,
  resolveRequirementIntent,
  rolesFromText,
  skuSimilarity
};
