'use strict';
/**
 * scripts/lib/pipeline_logger.js — Scraping & Classification Pipeline Audit Trail & History Logger
 *
 * Provides structured logging and execution history tracking across scraper sessions and classification tasks.
 * Appends audit records to history/pipeline_history.json and history/pipeline_execution.log.
 */

const fs   = require('fs');
const path = require('path');

class PipelineLogger {
  /**
   * Initialize a new pipeline execution logger session.
   * @param {string} sessionName Chassis or solution label (e.g., 'DL380_Gen12_SFF')
   * @param {string} outputDir Path to output directory (e.g., 'outputs/ProLiant/Gen12/DL380_Gen12_SFF')
   */
  constructor(sessionName, outputDir) {
    this.sessionName = sessionName || 'Unknown_Session';
    this.outputDir   = outputDir || null;
    this.startTime   = new Date().toISOString();
    this.runId       = `run_${this.sessionName.replace(/[^a-zA-Z0-9_\-]/g, '_')}_${Date.now()}`;
    
    this.steps = [];
    this.skuClassifications = [];
    this.warnings = [];
    this.errors = [];
    this.summary = null;
  }

  /**
   * Set or update output directory path if determined dynamically during run.
   * @param {string} outputDir 
   */
  setOutputDir(outputDir) {
    this.outputDir = outputDir;
  }

  /**
   * Record a pipeline stage execution step.
   * @param {string} stepName e.g., 'Step 1: Subcategory Extraction'
   * @param {'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED'} status 
   * @param {object} [details={}] Additional contextual metrics/metadata
   */
  logStep(stepName, status, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      stepName,
      status,
      details
    };
    this.steps.push(entry);
    console.log(`[Pipeline ${status}] ${stepName}${details.message ? `: ${details.message}` : ''}`);
  }

  /**
   * Record an individual SKU classification or parsing task outcome.
   * @param {string} sku Part number or SKU
   * @param {string} parentCategory 
   * @param {string} subCategory 
   * @param {'CLASSIFIED' | 'AMBIGUOUS' | 'FAILED' | 'DUPLICATE'} status 
   * @param {object} [details={}]
   */
  logSKUClassification(sku, parentCategory, subCategory, status, details = {}) {
    this.skuClassifications.push({
      timestamp: new Date().toISOString(),
      sku,
      parentCategory,
      subCategory,
      status,
      details
    });
  }

  /**
   * Record a warning during scraping or parsing.
   * @param {string} msg 
   */
  logWarning(msg) {
    this.warnings.push({ timestamp: new Date().toISOString(), message: msg });
    console.warn(`[Pipeline WARNING] ${msg}`);
  }

  /**
   * Record an error during scraping or parsing.
   * @param {string} msg 
   */
  logError(msg) {
    this.errors.push({ timestamp: new Date().toISOString(), message: msg });
    console.error(`[Pipeline ERROR] ${msg}`);
  }

  /**
   * Finalize the pipeline execution run and persist audit trail logs to history directory.
   * @param {'COMPLETED' | 'FAILED' | 'PARTIAL_SUCCESS'} overallStatus 
   * @param {object} [summaryData={}] 
   */
  finalizeRun(overallStatus, summaryData = {}) {
    const endTime = new Date().toISOString();
    const durationMs = new Date(endTime).getTime() - new Date(this.startTime).getTime();

    this.summary = {
      runId: this.runId,
      sessionName: this.sessionName,
      startTime: this.startTime,
      endTime,
      durationMs,
      durationSec: (durationMs / 1000).toFixed(2),
      overallStatus,
      totalSteps: this.steps.length,
      totalSKUsProcessed: this.skuClassifications.length,
      warningCount: this.warnings.length,
      errorCount: this.errors.length,
      ...summaryData
    };

    if (this.outputDir) {
      this.persistLogs();
    }

    return this.summary;
  }

  /**
   * Writes history/pipeline_history.json and history/pipeline_execution.log files safely.
   */
  persistLogs() {
    try {
      const historyDir = path.join(this.outputDir, 'history');
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }

      // 1. Append/update cumulative JSON history
      const historyJsonPath = path.join(historyDir, 'pipeline_history.json');
      let historyRecords = [];
      if (fs.existsSync(historyJsonPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(historyJsonPath, 'utf-8'));
          if (Array.isArray(raw)) historyRecords = raw;
        } catch (_) {}
      }

      const runRecord = {
        summary: this.summary,
        steps: this.steps,
        warnings: this.warnings,
        errors: this.errors,
        skuSummary: {
          total: this.skuClassifications.length,
          classified: this.skuClassifications.filter(s => s.status === 'CLASSIFIED').length,
          ambiguous: this.skuClassifications.filter(s => s.status === 'AMBIGUOUS').length,
          failed: this.skuClassifications.filter(s => s.status === 'FAILED').length
        }
      };

      // Keep up to 50 historical runs
      historyRecords.unshift(runRecord);
      if (historyRecords.length > 50) historyRecords = historyRecords.slice(0, 50);

      fs.writeFileSync(historyJsonPath, JSON.stringify(historyRecords, null, 2), 'utf-8');

      // 2. Append to human-readable log file
      const logFilePath = path.join(historyDir, 'pipeline_execution.log');
      const logLines = [
        `================================================================`,
        `RUN ID:       ${this.runId}`,
        `SESSION:      ${this.sessionName}`,
        `START TIME:   ${this.startTime}`,
        `END TIME:     ${this.summary.endTime} (${this.summary.durationSec}s)`,
        `STATUS:       ${this.summary.overallStatus}`,
        `ERRORS:       ${this.errors.length}`,
        `WARNINGS:     ${this.warnings.length}`,
        `SKUS PROC:    ${this.skuClassifications.length}`,
        `----------------------------------------------------------------`,
        `STEPS EXECUTED:`,
        ...this.steps.map(s => `  [${s.timestamp}] [${s.status.padEnd(8)}] ${s.stepName}`),
        ...(this.errors.length > 0 ? [`ERRORS:`, ...this.errors.map(e => `  ❌ ${e.message}`)] : []),
        ...(this.warnings.length > 0 ? [`WARNINGS:`, ...this.warnings.map(w => `  ⚠️ ${w.message}`)] : []),
        `================================================================\n\n`
      ].join('\n');

      fs.appendFileSync(logFilePath, logLines, 'utf-8');
    } catch (err) {
      console.warn(`[PipelineLogger] Could not persist execution logs: ${err.message}`);
    }
  }
}

module.exports = PipelineLogger;
