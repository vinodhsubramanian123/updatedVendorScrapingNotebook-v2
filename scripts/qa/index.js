'use strict';
/**
 * scripts/qa/index.js — Quality Assurance, Portfolio Audits & Benchmark Test Runners
 *
 * Provides organized access to all system audit and certification suites.
 */

const path = require('path');

module.exports = {
  // 7/7 Portfolio Certification Suite (npm test)
  verifyAll: path.resolve(__dirname, '..', 'verify_all.js'),
  // 7-Check Staging Gate Quality Validator
  verifyExcelTally: path.resolve(__dirname, '..', 'verify_excel_tally.js'),
  // 34-Test Aspect Math Unit Suite
  testAllAspects: path.resolve(__dirname, '..', 'test_all_aspects.js'),
  // 5-Scenario Automated Evaluation Benchmark Suite
  testBoqEvalBenchmarks: path.resolve(__dirname, '..', 'test_boq_eval_benchmarks.js'),
  // Combinatorial Stress Testing Suite
  testDl380Combinations: path.resolve(__dirname, '..', 'test_dl380_gen12_combinations.js'),
  // Excel and Knowledge Sync Verification
  testExcelAndSync: path.resolve(__dirname, '..', 'test_excel_and_sync_verification.js'),
  // NotebookLM Query & MCP Test Runners
  testNotebookQueryUtils: path.resolve(__dirname, '..', 'test_notebook_query_utils.js'),
  testNotebookScenarios: path.resolve(__dirname, '..', 'test_notebook_scenarios.js'),
  testNotebooklmMcp: path.resolve(__dirname, '..', 'test_notebooklm_mcp.js'),
  // Live CLIC Inspection Tests
  testLiveClic: path.resolve(__dirname, '..', 'test_live_clic.js'),
  testPipelineEvals: path.resolve(__dirname, '..', 'test_pipeline_evals.js')
};
