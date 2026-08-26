'use strict';
/**
 * /scripts/lib/index.js — Master Barrel Export for HPE BOQ Evaluator Library
 *
 * Provides organized domain access to all system subsystems:
 * - System: Telemetry, FS Compatibility, Progress Tracking, Structured Logging, Schemas, Key Rotator
 * - BOQ Engine: Preprocessor, Evaluator, Parser, Budget Optimizer, Vendor BOM Verifier, XLSX Exporter
 * - Catalog Engine: Rules, Discovery, Formatter, Diffing, Meta, Registry, SKU Versioning
 * - RAG & Multimodal AI: Knowledge Sync, OCR Vision, Notebook Query, Local RAG, Post-Flow Sync Hook, Guardrail
 * - Scraper Engine: CDP Sessions, DOM Extraction, OCA Navigation
 * - Feedback Engine: Feedback Loop, Feedback Queue
 */

module.exports = {
  // System Subsystem
  system: {
    telemetry: require('./system/telemetry.js'),
    fsCompat: require('./system/fs_compat.js'),
    progress: require('./system/progress.js'),
    logger: require('./system/pipeline_logger.js'),
    profileLoader: require('./system/profile_loader.js'),
    geminiRotator: require('./system/gemini_rotator.js'),
    schemas: require('./system/schemas.js'),
    errorEnvelope: require('./system/error_envelope.js'),
    dataValidator: require('./system/data_validator.js')
  },

  // BOQ Processing & Evaluation Subsystem
  boq: {
    evaluator: require('./boq/boq_evaluator.js'),
    preprocessor: require('./boq/boq_preprocessor.js'),
    parser: require('./boq/boq_parser.js'),
    conflictGraph: require('./conflict/conflict_graph.js'),
    workloadDna: require('./conflict/workload_dna.js'),
    strategySynthesizer: require('./conflict/strategy_synthesizer.js'),
    budgetOptimizer: require('./boq/budget_optimizer.js'),
    vendorBomVerifier: require('./boq/vendor_bom_verifier.js'),
    xlsxExporter: require('./boq/generate_boq_xlsx.js')
  },

  // Catalog Management Subsystem
  catalog: {
    rules: require('./catalog/catalog_rules.js'),
    discovery: require('./catalog/catalog_discovery.js'),
    formatter: require('./catalog/catalog_formatter.js'),
    diff: require('./catalog/diff_catalog.js'),
    productMeta: require('./catalog/product_meta.js'),
    sku: require('./catalog/sku.js'),
    registry: require('./catalog/registry.js'),
    validator: require('./system/data_validator.js'),
    checksumDiff: require('./catalog/checksum_diff.js'),
    skuVersioning: require('./catalog/sku_versioning.js'),
    syncRegistry: require('./catalog/sync_registry.js'),
    profileLoader: require('./system/profile_loader.js')
  },

  // RAG & Multimodal AI Subsystem
  rag: {
    ocrService: require('./ocr/ocr_service.js'),
    knowledgeSync: require('./sync/knowledge_sync.js'),
    notebookQuery: require('./notebook/notebook_query_utils.js'),
    localSearch: require('./rag/local_rag_search.js'),
    postFlowSync: require('./sync/post_flow_sync.js'),
    agenticGuardrail: require('./rag/agentic_guardrail.js'),
    guardrailPrompt: require('./prompts/guardrail_prompt.js')
  },

  // Scraper Subsystem
  scraper: {
    cdp: require('./scraper/cdp.js'),
    domExtract: require('./scraper/dom_extract.js'),
    navigateOca: require('./scraper/navigate_oca.js')
  },

  // Feedback & Learning Subsystem
  feedback: {
    loop: require('./feedback/feedback_loop.js'),
    queue: require('./feedback/feedback_queue.js')
  },

  // Preprocessor Subsystem
  preprocessor: {
    ctoNormalizer: require('./preprocessor/cto_normalizer.js'),
    variationClusterer: require('./preprocessor/variation_clusterer.js'),
    feedbackPersister: require('./preprocessor/feedback_persister.js')
  }
};
