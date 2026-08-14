'use strict';
/**
 * /scripts/lib/index.js — Master Loose-Coupling Barrel Export for HPE BOQ Evaluator Library
 *
 * Provides organized domain access to all system subsystems:
 * - System: Telemetry, FS Compatibility, Progress Tracking, Structured Logging
 * - BOQ Engine: Preprocessor, Evaluator, Conflict Graph, Budget Optimizer, Vendor BOM Verifier
 * - Catalog Engine: Rules, Discovery, Formatter, Diffing, Meta, Registry
 * - RAG & AI: Knowledge Sync, OCR Vision, Notebook Query, Local RAG, Post-Flow Sync Hook
 * - Scraper Engine: CDP Sessions, DOM Extraction, OCA Navigation
 * - Feedback Engine: Feedback Loop, Feedback Queue
 */

module.exports = {
  // System Subsystem
  system: {
    telemetry: require('./system/telemetry.js'),
    fsCompat: require('./fs_compat.js'),
    progress: require('./progress.js'),
    logger: require('./pipeline_logger.js'),
    profileLoader: require('./profile_loader.js'),
    geminiRotator: require('./gemini_rotator.js')
  },

  // BOQ Processing & Evaluation Subsystem
  boq: {
    evaluator: require('./boq_evaluator.js'),
    preprocessor: require('./boq_preprocessor.js'),
    parser: require('./boq_parser.js'),
    conflictGraph: require('./conflict_graph.js'),
    budgetOptimizer: require('./budget_optimizer.js'),
    vendorBomVerifier: require('./vendor_bom_verifier.js'),
    xlsxExporter: require('./generate_boq_xlsx.js')
  },

  // Catalog Management Subsystem
  catalog: {
    rules: require('./catalog_rules.js'),
    discovery: require('./catalog_discovery.js'),
    formatter: require('./catalog_formatter.js'),
    diff: require('./diff_catalog.js'),
    productMeta: require('./product_meta.js'),
    sku: require('./sku.js'),
    registry: require('./registry.js'),
    validator: require('./data_validator.js'),
    checksumDiff: require('./checksum_diff.js'),
    skuVersioning: require('./sku_versioning.js'),
    syncRegistry: require('./sync_registry.js')
  },

  // RAG & Multimodal AI Subsystem
  rag: {
    ocrService: require('./ocr_service.js'),
    knowledgeSync: require('./knowledge_sync.js'),
    notebookQuery: require('./notebook_query_utils.js'),
    localSearch: require('./local_rag_search.js'),
    postFlowSync: require('./post_flow_sync.js'),
    geminiRotator: require('./gemini_rotator.js')
  },

  // Scraper Subsystem
  scraper: {
    cdp: require('./cdp.js'),
    domExtract: require('./dom_extract.js'),
    navigateOca: require('./navigate_oca.js')
  },

  // Feedback & Learning Subsystem
  feedback: {
    loop: require('./feedback_loop.js'),
    queue: require('./feedback_queue.js')
  }
};
