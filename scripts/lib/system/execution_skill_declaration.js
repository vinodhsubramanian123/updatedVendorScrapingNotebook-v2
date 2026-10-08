'use strict';
// Owned function-to-document declarations. They never attest that an agent read
// or followed a skill, or that any declared downstream capability was invoked.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../..');
const routerSkills = Object.freeze({
  executeRoutedQuery: 'presales-query-router',
  _handleCrossVendorTransformation: 'cross-vendor-transformation-skill',
  _handleHeterogeneousTenderModernization: 'heterogeneous-tender-modernizer',
  _handleFreeformQa: 'nlm-skill',
  _handleBoqEvaluation: 'boq-eval-skill',
  _handleOcrQuoteIngestion: 'ocr-quote-ingestion-skill',
  _handleCatalogIntelligence: 'catalog-intelligence-skill',
  _handleRfpSizing: 'rfp-sizing-synthesizer',
  _handleBomReconciliation: 'bom-reconciliation-skill',
  _handleWorkloadDna: 'workload-dna-skill',
  _handleValueEngineering: 'value-engineering-skill',
  _handleLeastDeltaSynthesis: 'least-delta-combinator-skill',
  _handleWorkbookGeneration: 'workbook-generator-skill',
  _handleRemarksReconciliation: 'boq-remarks-reconciliation-skill',
  _handleMultiClusterTender: 'multi-cluster-tender-skill',
  _handleAdversarialValidation: 'adversarial-validation-skill',
  _handleContinuousLearning: 'continuous-learning-skill',
  _handleKnowledgeSync: 'knowledge-sync-skill'
});
const mcpSkills = Object.freeze({
  'MCP:evaluate_aspect_thermal': 'boq-eval-skill',
  'MCP:evaluate_aspect_memory': 'boq-eval-skill',
  'MCP:evaluate_aspect_storage': 'boq-eval-skill',
  'MCP:evaluate_aspect_networking': 'boq-eval-skill',
  'MCP:evaluate_aspect_pcie': 'boq-eval-skill',
  'MCP:evaluate_aspect_power': 'boq-eval-skill',
  'MCP:evaluate_aspect_support': 'boq-eval-skill',
  'MCP:simulate_build': 'boq-eval-skill',
  'MCP:query_notebooklm': 'nlm-skill',
  'MCP:query_catalog_db': 'catalog-intelligence-skill',
  'MCP:record_knowledge_delta': 'continuous-learning-skill'
});

function declaredSkill(name, sourceFile) {
  const relative = path.relative(root, sourceFile).replace(/\\/g, '/');
  if (relative === 'scripts/evaluators/route_query.js') return Object.hasOwn(routerSkills, name) ? routerSkills[name] : null;
  if (relative === 'scripts/evaluators/eval_boq.js' && name === 'runEvaluationPipeline') return 'boq-eval-skill';
  if (relative === 'scripts/services/mcp_server.js') return Object.hasOwn(mcpSkills, name) ? mcpSkills[name] : null;
  return null;
}

function applicableSkillMetadata(name, sourceFile) {
  try {
    const skill = declaredSkill(name, sourceFile);
    if (!skill) return {};
    const applicableSkillPath = `.agents/skills/${skill}/SKILL.md`;
    const absolute = path.join(root, applicableSkillPath);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) return {};
    return {
      applicableSkillPath,
      applicableSkillFingerprint: crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex'),
      applicableSkillAssociation: 'DECLARATION_ONLY_NOT_AGENT_EXECUTION'
    };
  } catch { return {}; }
}

module.exports = { applicableSkillMetadata };
