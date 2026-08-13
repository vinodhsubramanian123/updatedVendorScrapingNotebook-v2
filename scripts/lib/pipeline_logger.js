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

// ─────────────────────────────────────────────────────────────────────────────
// Module-level structured logging interface
// Usage: const logger = require('./pipeline_logger');
//        logger.info('MODULE', 'message', optionalData)
//        logger.warn('MODULE', 'message', optionalError)
//        logger.error('MODULE', 'message', error)
//        logger.debug('MODULE', 'message', optionalData)
//
// Control verbosity with LOG_LEVEL env var: error | warn | info | debug
// ─────────────────────────────────────────────────────────────────────────────

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[String(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? 1;

function formatLog(level, context, message, extra) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase().padEnd(5)}] [${context}] ${message}`;
  if (extra instanceof Error) {
    return `${base}\n  ↳ ${extra.constructor.name}: ${extra.message}${extra.stack ? '\n' + extra.stack.split('\n').slice(1, 4).join('\n') : ''}`;
  }
  if (extra !== undefined && extra !== null) {
    return `${base} ${typeof extra === 'object' ? JSON.stringify(extra) : extra}`;
  }
  return base;
}

function log(level, context, message, extra) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  const formatted = formatLog(level, context, message, extra);
  if (level === 'error') {
    process.stderr.write(formatted + '\n');
  } else if (level === 'warn') {
    process.stderr.write(formatted + '\n');
  } else {
    process.stdout.write(formatted + '\n');
  }
}

PipelineLogger.info  = (context, message, extra) => log('info',  context, message, extra);
PipelineLogger.warn  = (context, message, extra) => log('warn',  context, message, extra);
PipelineLogger.error = (context, message, extra) => log('error', context, message, extra);
PipelineLogger.debug = (context, message, extra) => log('debug', context, message, extra);

module.exports = PipelineLogger;
