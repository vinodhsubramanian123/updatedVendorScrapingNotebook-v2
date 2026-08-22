'use strict';
/**
 * scripts/cli/index.js — Canonical CLI Entrypoints & Pipeline Controllers
 *
 * Core production pipelines for scraping, building, evaluating, and exporting catalogs.
 */

const path = require('path');

module.exports = {
  // 10-Stage Dynamic Scraper
  scrapeSolution: path.resolve(__dirname, '..', 'scrape_oca_solution.js'),
  // Catalog Classification Engine
  buildCatalog: path.resolve(__dirname, '..', 'build_catalog.js'),
  // Master Excel Generator
  generateXlsx: path.resolve(__dirname, '..', 'generate_xlsx.js'),
  // 6-Aspect BOQ Evaluator & Matrix Synthesizer
  evalBoq: path.resolve(__dirname, '..', 'eval_boq.js'),
  // Universal Agentic MCP Server
  mcpServer: path.resolve(__dirname, '..', 'mcp_server.js'),
  // QuickSpecs PDF Downloader
  downloadQuickspecs: path.resolve(__dirname, '..', 'download_quickspecs_pdf.js'),
  // Master Portfolio Synchronizer
  syncAllRegistered: path.resolve(__dirname, '..', 'sync_all_registered_catalogs.js')
};
