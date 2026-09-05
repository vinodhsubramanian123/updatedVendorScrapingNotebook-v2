'use strict';
/**
 * scripts/lib/sync/nlm_sync_client.js — NotebookLM CLI Sync Client
 *
 * Handles source deduplication, canonical naming, and uploading markdown
 * payloads to Google NotebookLM via the `nlm` CLI or MCP fallback.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const CONFIG_NOTEBOOKS = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');

/**
 * Synchronize knowledge note directly into Gemini NotebookLM via nlm CLI.
 *
 * @param {string} notebookId
 * @param {string} payloadPath
 * @param {string} [chassisName='Unknown_Chassis']
 * @param {number} [totalRulesCount=0]
 * @param {object} [options]
 * @returns {{ success: boolean, mode: string, message: string, newSourceId?: string, newSourceName?: string }}
 */
function syncToNotebookLM(notebookId, payloadPath, chassisName = 'Unknown_Chassis', totalRulesCount = 0, options = {}) {
  let result = null;
  let driveSyncStatus = 'NOT_CONFIGURED';
  let driveSourceVerified = null;
  const payloadBasename = path.basename(payloadPath);
  const scrapeDate = new Date().toISOString().split('T')[0];
  const canonicalSourceName = `${chassisName}_OCA_Catalog_${scrapeDate}`;

  let notebookCfg = {};
  if (fs.existsSync(CONFIG_NOTEBOOKS)) {
    try {
      notebookCfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
    } catch (_) { /* ignore */ }
  }

  const effectiveNotebookId = (notebookId && notebookId.trim()) ||
    (notebookCfg.notebooks?.[chassisName]?.notebookId?.trim()) ||
    (notebookCfg.defaultNotebookId?.trim()) ||
    null;

  if (!effectiveNotebookId) {
    return {
      success: false,
      mode: 'FAIL_CLOSED_UNMAPPED',
      notebookId: null,
      payloadPath,
      canonicalSourceName,
      message: `Sync aborted: No dedicated NotebookLM mapping configured for "${chassisName}". Fails closed to local evaluation without corrupting other product notebooks.`
    };
  }

  // CI / Offline Guardrail
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    result = {
      success: false,
      cloudVerified: false,
      mode: 'CI_OFFLINE_LOCAL_ONLY',
      notebookId: effectiveNotebookId,
      payloadPath,
      canonicalSourceName,
      message: `CI Mode: local payload verified at ${payloadPath}; no NotebookLM cloud synchronization was attempted.`
    };
  } else {
    try {
      const envPath = process.env.PATH || '';
      const homeBin = path.join(process.env.HOME || '', '.local', 'bin');
      const extendedPath = [homeBin, envPath].filter(Boolean).join(path.delimiter);

      const cfgEntry = notebookCfg.notebooks && notebookCfg.notebooks[chassisName];
      const previousSourceId = (cfgEntry && typeof cfgEntry === 'object') ? cfgEntry.lastSyncedSourceId : null;
      const previousSourceName = (cfgEntry && typeof cfgEntry === 'object') ? cfgEntry.lastSyncedSourceName : null;
      const allowSourceDeletion = options.confirmSourceRetirement === true;

      // TRANSACTIONAL REPLACEMENT SEQUENCE (INV-49 / Transactional Source Sync)
      // Step 1: Upload fresh candidate source FIRST
      let stdout;
      let newSourceId = null;
      try {
        stdout = execFileSync('nlm', [
          'source', 'add', effectiveNotebookId,
          '--file', payloadPath,
          '--title', canonicalSourceName,
          '--wait',
          '--json'
        ], {
          encoding: 'utf-8',
          timeout: 600000,
          env: { ...process.env, PATH: extendedPath }
        });
        try {
          const parsed = JSON.parse(stdout);
          newSourceId = parsed.id || parsed.sourceId || parsed.source?.id;
        } catch (_) {}
        if (!newSourceId) {
          const idMatch = stdout.match(/source[^:]*(?:added|id)[^:]*:\s*([\w-]+)/i) ||
                          stdout.match(/"id"\s*:\s*"([^"]+)"/i) ||
                          stdout.match(/\bsrc_([\w-]+)/i);
          if (idMatch) newSourceId = idMatch[1];
        }
      } catch (uploadErr) {
        // Upload failed - existing source is completely preserved!
        throw new Error(`Transactional Sync Aborted during Candidate Upload: ${uploadErr.message}. Old source remains active.`);
      }

      // Step 2: Canary Query Verification
      let canaryOk = false;
      try {
        const canaryArgs = [
          'notebook', 'query', effectiveNotebookId,
          `Canary verification: Summarize base chassis model and SKUs for ${chassisName}.`
        ];
        if (newSourceId) {
          canaryArgs.push('--source-ids', newSourceId);
        }
        const canaryTimeoutMs = parseInt(process.env.NLM_SYNC_CANARY_TIMEOUT_MS || '600000', 10);
        canaryArgs.push('--timeout', String(Math.ceil(canaryTimeoutMs / 1000)), '--new-conversation', '--json');
        const canaryOutput = execFileSync('nlm', canaryArgs, {
          encoding: 'utf-8',
          timeout: canaryTimeoutMs,
          env: { ...process.env, PATH: extendedPath }
        });
        const parsedCanary = JSON.parse(canaryOutput);
        const canaryAnswer = String(parsedCanary.answer || parsedCanary.response || parsedCanary.result || '');
        canaryOk = Boolean(newSourceId && canaryAnswer.length > 20 && !/no (?:relevant )?source|cannot (?:find|verify)/i.test(canaryAnswer));
      } catch (_) {
        // A source-list check alone proves indexing, not grounded answer quality.
        canaryOk = false;
      }

      if (!canaryOk) {
        throw new Error(`Transactional Sync Failed Canary Verification for ${canonicalSourceName}. Candidate ${newSourceId || 'ID was not returned'} was not promoted; old source remains active.`);
      }

      // Step 3: Retire Old Source (Now that candidate is verified and active)
      if (allowSourceDeletion && previousSourceId && previousSourceId !== newSourceId) {
        try {
          execFileSync('nlm', ['source', 'delete', previousSourceId, '--confirm'], {
            encoding: 'utf-8',
            timeout: 10000,
            env: { ...process.env, PATH: extendedPath }
          });
        } catch (_) { /* ignore if already removed */ }
      }

      // Title-scan to clean any other duplicate stale sources matching chassis
      try {
        const listOutput = execFileSync('nlm', ['source', 'list', effectiveNotebookId, '--json'], {
          encoding: 'utf-8',
          timeout: 15000,
          env: { ...process.env, PATH: extendedPath }
        });
        const sources = JSON.parse(listOutput);
        const staleSources = Array.isArray(sources) ? sources.filter(s => {
          const title = String(s.title || s.filename || '');
          return (
            (title.includes(chassisName) || (previousSourceName && title === previousSourceName) || title.includes(payloadBasename)) &&
            s.id !== undefined &&
            s.id !== newSourceId
          );
        }) : [];

        for (const stale of allowSourceDeletion ? staleSources : []) {
          try {
            execFileSync('nlm', ['source', 'delete', stale.id, '--confirm'], {
              encoding: 'utf-8',
              timeout: 10000,
              env: { ...process.env, PATH: extendedPath }
            });
          } catch (_) { /* ignore */ }
        }
      } catch (_) { /* non-fatal */ }

      // Also check for Excel workbook and upload tabular CSV representation
      const payloadDir = path.dirname(payloadPath);
      const possibleExcel = path.join(payloadDir, `${chassisName}_OCA_Catalog.xlsx`);
      if (fs.existsSync(possibleExcel)) {
        try {
          const xlsx = require('xlsx-js-style');
          const wb = xlsx.readFile(possibleExcel);
          const sheet = wb.Sheets['All SKUs'] || wb.Sheets[wb.SheetNames[0]];
          if (sheet) {
            const csvData = xlsx.utils.sheet_to_csv(sheet);
            const csvPath = path.join(payloadDir, `${chassisName}_Master_Catalog.csv`);
            fs.writeFileSync(csvPath, csvData, 'utf-8');
          }
        } catch (csvErr) {
          const logger = require('../system/pipeline_logger.js');
          logger.warn('NLM_SYNC', `Tabular Master Catalog CSV generation/upload warning: ${csvErr.message}`);
        }
      }

      // Upload shared universal knowledge charter to this notebook
      const charterPath = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_universal_knowledge_charter.md');
      if (fs.existsSync(charterPath)) {
        const charterSourceName = `HPE_Universal_Knowledge_Charter_${scrapeDate}`;
        try {
          // Upload the fresh charter without destructive cleanup. Charter retirement
          // needs its own add-first/canary/retire transaction.
          execFileSync('nlm', [
            'source', 'add', effectiveNotebookId,
            '--file', charterPath,
            '--title', charterSourceName,
            '--wait',
            '--json'
          ], {
            encoding: 'utf-8',
            timeout: 600000,
            env: { ...process.env, PATH: extendedPath }
          });
        } catch (charterErr) {
          const logger = require('../system/pipeline_logger.js');
          logger.warn('NLM_SYNC', `Universal Knowledge Charter sync warning: ${charterErr.message}`);
        }
      }

      // If a Google Drive Sheet source is configured, sync it in-place using valid CLI contract
      if (cfgEntry && cfgEntry.driveSourceId) {
        try {
          const masterCsvPath = path.join(path.dirname(payloadPath), `${chassisName}_Master_Catalog.csv`);
          execFileSync(process.execPath, [
            path.join(__dirname, 'google_sheets_writer.js'),
            cfgEntry.driveSheetId,
            masterCsvPath,
            cfgEntry.driveSheetName || ''
          ], {
            encoding: 'utf-8',
            timeout: 600000,
            env: { ...process.env, PATH: extendedPath }
          });
          execFileSync('nlm', [
            'source', 'sync', effectiveNotebookId,
            '--source-ids', cfgEntry.driveSourceId,
            '--confirm'
          ], {
            encoding: 'utf-8',
            timeout: 600000,
            env: { ...process.env, PATH: extendedPath }
          });
          driveSyncStatus = 'SHEET_WRITTEN_AND_NOTEBOOK_SOURCE_REFRESHED';
          driveSourceVerified = cfgEntry.driveSourceId;
        } catch (driveErr) {
          driveSyncStatus = 'DRIVE_SYNC_FAILED_PRESERVED_OLD_SOURCE';
          const logger = require('../system/pipeline_logger.js');
          logger.warn('NLM_SYNC', `Google Sheet write/NotebookLM refresh warning for ${cfgEntry.driveSourceId}: ${driveErr.message}`);
        }
      }

      if (!newSourceId && stdout) {
        const idMatchFallback = stdout.match(/source[^:]*(?:added|id)[^:]*:\s*([\w-]+)/i) ||
                                stdout.match(/"id"\s*:\s*"([^"]+)"/i) ||
                                stdout.match(/\bsrc_([\w-]+)/i);
        if (idMatchFallback) newSourceId = idMatchFallback[1];
      }

      result = {
        success: true,
        cloudVerified: true,
        mode: 'CLI',
        newSourceId,
        newSourceName: canonicalSourceName,
        driveSyncStatus,
        staleSourceIds: allowSourceDeletion ? [] : [previousSourceId].filter(id => id && id !== newSourceId),
        message: `Uploaded and canary-verified "${canonicalSourceName}" in NotebookLM (${effectiveNotebookId}). Existing sources were preserved unless explicit retirement was confirmed.`
      };
    } catch (cliErr) {
      result = {
        success: false,
        mode: 'MCP_OR_MANUAL',
        notebookId: effectiveNotebookId,
        payloadPath,
        canonicalSourceName,
        mcpToolName: 'source_add',
        mcpServer: 'gemini-notebook-mcp',
        message: `CLI sync unavailable (${cliErr.message}). Payload ready at ${payloadPath}. Upload as "${canonicalSourceName}" via gemini-notebook-mcp source_add or nlm CLI.`
      };
    }
  }

  // Persist sync metadata ONLY on success
  if (result && result.success && fs.existsSync(CONFIG_NOTEBOOKS)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
      if (cfg.notebooks && cfg.notebooks[chassisName]) {
        const existing = typeof cfg.notebooks[chassisName] === 'string'
          ? { notebookId: cfg.notebooks[chassisName] }
          : cfg.notebooks[chassisName];
        let payloadChecksum = null;
        if (payloadPath && fs.existsSync(payloadPath)) {
          try {
            const crypto = require('crypto');
            payloadChecksum = crypto.createHash('sha256').update(fs.readFileSync(payloadPath)).digest('hex');
          } catch (_) {}
        }
        cfg.notebooks[chassisName] = {
          ...existing,
          queryEnabled: true,
          lastSyncedAt: new Date().toISOString(),
          lastSyncDeltaCount: totalRulesCount,
          isolationLevel: 'CHASSIS_SPECIFIC',
          lastSyncedSourceName: canonicalSourceName,
          trustedSourceIds: Array.from(new Set([
            ...(existing.trustedSourceIds || []).filter(id => !(options.confirmSourceRetirement === true && id === existing.lastSyncedSourceId)),
            result.newSourceId,
            driveSourceVerified
          ].filter(Boolean))),
          ...(payloadChecksum ? { lastPayloadChecksum: payloadChecksum } : {}),
          ...(result.newSourceId ? { lastSyncedSourceId: result.newSourceId } : {})
        };
        safeWriteJsonAtomic(CONFIG_NOTEBOOKS, cfg);
      }
    } catch (_) { /* ignore */ }
  }

  return result;
}

module.exports = {
  syncToNotebookLM
};
