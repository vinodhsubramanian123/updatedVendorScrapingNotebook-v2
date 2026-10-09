'use strict';
// A user platform choice is an auditable local preference, never a hardware rule.
const path = require('path');
const { listAllCatalogs } = require('../catalog/catalog_discovery.js');
const { recordPlatformSelection } = require('./user_platform_selection_store.js');
const {
  formatDisambiguationPrompt,
  parseDisambiguationChoice
} = require('./platform_disambiguation_prompt.js');

function router() { return require('../../evaluators/route_query.js'); }

function getBaseChassisSku(chassisName = '') {
  // Use only an explicit SKU carried by the selected catalog's metadata.
  const catalog = router().getChassisCatalog('', { chassisName });
  if (catalog.isAmbiguous) return null;
  const meta = catalog.catalogData?.metadata;
  const candidates = [meta?.baseSku, meta?.baseSKU, meta?.chassisSku].filter(s => typeof s === 'string' && s.trim());
  const unique = [...new Set(candidates)];
  return unique.length === 1 ? unique[0] : null;
}

function recordDisambiguationDecision(queryText, selectedChassis, options = {}) {
  const ambiguity = router().getChassisCatalog(queryText);
  const candidates = ambiguity.candidates || [];
  if (!ambiguity.isAmbiguous || !candidates.includes(selectedChassis)) throw new Error('Selected chassis must be an actual query candidate');
  const catalogs = listAllCatalogs();
  const catalog = catalogs.find(c => c.id === selectedChassis);
  if (!catalog) throw new Error(`Catalog not found for ${selectedChassis}`);
  if (options.targetDir && path.resolve(options.targetDir) !== path.resolve(catalog.catalogDir)) throw new Error('Preference target must be the selected platform catalog history');
  const delta = recordPlatformSelection(queryText, selectedChassis, candidates, catalog.catalogDir, options);
  return { success: true, chassis: selectedChassis, targetDir: catalog.catalogDir, delta, preferenceRecord: delta, governanceStatus: delta.governanceStatus };
}

async function runDisambiguationLoopTest(queryText, selectedChassis, context = {}) {
  // Original query and caller context: selectedChassis must never be injected.
  const rerun = await router().executeRoutedQuery(queryText, context);
  const expectedIntent = context.intent || router().classifyQueryIntent(queryText, context).intent;
  const used = rerun.platformSelectionMemory?.usedIds || [];
  const platformMatches = rerun.resolvedPlatform === selectedChassis;
  const intentMatches = rerun.classification?.intent === expectedIntent;
  const clarifiedRouteVerified = platformMatches && intentMatches && rerun.hitlRequired === false;
  return {
    verified: clarifiedRouteVerified && used.length === 1,
    clarifiedRouteVerified, usedPreferenceIds: used, retrievedPreferenceIds: rerun.platformSelectionMemory?.retrievedIds || [],
    query: queryText, targetChassis: selectedChassis,
    confidence: rerun.classificationConfidence, hitlRequired: rerun.hitlRequired,
    intent: rerun.classification?.intent, executionTimeMs: rerun.executionTimeMs, result: rerun.result
  };
}

module.exports = {
  formatDisambiguationPrompt,
  parseDisambiguationChoice,
  recordDisambiguationDecision,
  runDisambiguationLoopTest,
  getBaseChassisSku
};
