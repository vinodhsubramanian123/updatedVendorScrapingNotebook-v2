'use strict';
/**
 * scripts/tools/index.js — Diagnostic, Inspection & Maintenance Tooling Suite
 *
 * Provides organized access to specialized operational tools.
 */

const path = require('path');

module.exports = {
  // Session & CDP Inspectors
  inspectOcaSession: path.resolve(__dirname, '..', 'inspect_oca_session.js'),
  visualClicInspector: path.resolve(__dirname, '..', 'visual_clic_inspector.js'),
  parseClicModal: path.resolve(__dirname, '..', 'parse_clic_modal.js'),
  demoQsVsMenuCdp: path.resolve(__dirname, '..', 'demo_qs_vs_menu_cdp.js'),
  liveVisualDemoCdp: path.resolve(__dirname, '..', 'live_visual_demo_cdp.js'),
  interactiveBrowserEvalSuite: path.resolve(__dirname, '..', 'interactive_browser_eval_suite.js'),
  
  // Feedback & Observability
  feedbackListener: path.resolve(__dirname, '..', 'feedback_listener.js'),
  observabilityStatus: path.resolve(__dirname, '..', 'observability_status.js'),
  analyzeComplexity: path.resolve(__dirname, '..', 'analyze_complexity.js'),
  adversarialAgent: path.resolve(__dirname, '..', 'adversarial_agent.js'),
  agenticEval: path.resolve(__dirname, '..', 'agentic_eval.js'),
  
  // Catalog & Format Converters
  csvToCatalog: path.resolve(__dirname, '..', 'csv_to_catalog.js'),
  xlsxToCatalog: path.resolve(__dirname, '..', 'xlsx_to_catalog.js'),
  rebuildAll: path.resolve(__dirname, '..', 'rebuild_all.js'),
  generatePortfolioStatus: path.resolve(__dirname, '..', 'generate_portfolio_status.js'),
  expandAndRescrape: path.resolve(__dirname, '..', 'expand_and_rescrape.js'),
  scrapeStorageSolution: path.resolve(__dirname, '..', 'scrape_oca_storage_solution.js'),
  evalMultiBoq: path.resolve(__dirname, '..', 'eval_multi_boq.js')
};
