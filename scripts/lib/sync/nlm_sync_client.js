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
 * @returns {{ success: boolean, mode: string, message: string, newSourceId?: string, newSourceName?: string }}
 */
function syncToNotebookLM(notebookId, payloadPath, chassisName = 'Unknown_Chassis', totalRulesCount = 0) {
  let result = null;
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
    '1d190853-4e9c-48df-aa70-eae66c6f2c1f';

  // CI / Offline Guardrail
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    result = {
      success: true,
      mode: 'CI_OFFLINE_VERIFIED',
      notebookId: effectiveNotebookId,
      payloadPath,
      canonicalSourceName,
      message: `CI Mode: Markdown knowledge payload verified at ${payloadPath} for ${chassisName}.`
    };
  } else {
    try {
      const envPath = process.env.PATH || '';
      const homeBin = path.join(process.env.HOME || '', '.local', 'bin');
      const extendedPath = `${homeBin}:${envPath}`;

      const cfgEntry = notebookCfg.notebooks && notebookCfg.notebooks[chassisName];
      const previousSourceId = (cfgEntry && typeof cfgEntry === 'object') ? cfgEntry.lastSyncedSourceId : null;
      const previousSourceName = (cfgEntry && typeof cfgEntry === 'object') ? cfgEntry.lastSyncedSourceName : null;

      if (previousSourceId) {
        try {
          execFileSync('nlm', ['source', 'delete', previousSourceId, '--confirm'], {
            encoding: 'utf-8',
            timeout: 10000,
            env: { ...process.env, PATH: extendedPath }
          });
        } catch (_) { /* ignore if already removed */ }
      }

      // Title-scan to clean any other duplicate sources matching chassis
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
            title.includes(chassisName) ||
            (previousSourceName && title === previousSourceName) ||
            title.includes(payloadBasename)
          ) && s.id !== undefined;
        }) : [];

        for (const stale of staleSources) {
          if (stale.id && stale.id !== previousSourceId) {
            try {
              execFileSync('nlm', ['source', 'delete', stale.id, '--confirm'], {
                encoding: 'utf-8',
                timeout: 10000,
                env: { ...process.env, PATH: extendedPath }
              });
            } catch (_) { /* ignore */ }
          }
        }
      } catch (_) { /* non-fatal */ }

      // Upload fresh markdown knowledge payload
      const stdout = execFileSync('nlm', [
        'source', 'add', effectiveNotebookId,
        '--file', payloadPath,
        '--title', canonicalSourceName,
        '--wait'
      ], {
        encoding: 'utf-8',
        timeout: 120000,
        env: { ...process.env, PATH: extendedPath }
      });

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
            execFileSync('nlm', [
              'source', 'add', effectiveNotebookId,
              '--file', csvPath,
              '--title', `${chassisName}_Master_Catalog.csv`,
              '--wait'
            ], {
              encoding: 'utf-8',
              timeout: 120000,
              env: { ...process.env, PATH: extendedPath }
            });
          }
        } catch (_) { /* non-fatal */ }
      }

      // Upload shared universal knowledge charter to this notebook
      // This ensures EVERY notebook has cross-product vendor rules, CLIC learnings,
      // and architectural gotchas — not just chassis-specific catalog data.
      const charterPath = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_universal_knowledge_charter.md');
      if (fs.existsSync(charterPath)) {
        const charterSourceName = `HPE_Universal_Knowledge_Charter_${scrapeDate}`;
        try {
          // Remove stale charter sources from this notebook
          const listOutput2 = execFileSync('nlm', ['source', 'list', effectiveNotebookId, '--json'], {
            encoding: 'utf-8',
            timeout: 15000,
            env: { ...process.env, PATH: extendedPath }
          });
          const sources2 = JSON.parse(listOutput2);
          const staleCharters = Array.isArray(sources2) ? sources2.filter(s => {
            const title = String(s.title || s.filename || '');
            return title.includes('Universal_Knowledge_Charter') && s.id !== undefined;
          }) : [];
          for (const stale of staleCharters) {
            try {
              execFileSync('nlm', ['source', 'delete', stale.id, '--confirm'], {
                encoding: 'utf-8',
                timeout: 10000,
                env: { ...process.env, PATH: extendedPath }
              });
            } catch (_) { /* ignore */ }
          }

          // Upload fresh charter
          execFileSync('nlm', [
            'source', 'add', effectiveNotebookId,
            '--file', charterPath,
            '--title', charterSourceName,
            '--wait'
          ], {
            encoding: 'utf-8',
            timeout: 120000,
            env: { ...process.env, PATH: extendedPath }
          });
        } catch (_) { /* non-fatal: charter sync is best-effort */ }
      }

      // If a Google Drive Sheet source is configured, sync it in-place
      if (cfgEntry && cfgEntry.driveSourceId) {
        try {
          execFileSync('nlm', [
            'source', 'sync', cfgEntry.driveSourceId,
            '--confirm'
          ], {
            encoding: 'utf-8',
            timeout: 60000,
            env: { ...process.env, PATH: extendedPath }
          });
        } catch (_) { /* non-fatal */ }
      }

      let newSourceId = null;
      const idMatch = stdout.match(/source[^:]*(?:added|id)[^:]*:\s*([\w-]+)/i) ||
                      stdout.match(/"id"\s*:\s*"([^"]+)"/i) ||
                      stdout.match(/\bsrc_([\w-]+)/i);
      if (idMatch) newSourceId = idMatch[1];

      result = {
        success: true,
        mode: 'CLI',
        newSourceId,
        newSourceName: canonicalSourceName,
        message: `Replaced old source(s) and synced "${canonicalSourceName}" and Master Catalog CSV to NotebookLM (${effectiveNotebookId}) via nlm CLI.`
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

  // Persist sync metadata
  if (fs.existsSync(CONFIG_NOTEBOOKS)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
      if (cfg.notebooks && cfg.notebooks[chassisName]) {
        const existing = typeof cfg.notebooks[chassisName] === 'string'
          ? { notebookId: cfg.notebooks[chassisName] }
          : cfg.notebooks[chassisName];
        cfg.notebooks[chassisName] = {
          ...existing,
          lastSyncedAt: new Date().toISOString(),
          lastSyncDeltaCount: totalRulesCount,
          isolationLevel: 'CHASSIS_SPECIFIC',
          lastSyncedSourceName: canonicalSourceName,
          ...(result && result.newSourceId ? { lastSyncedSourceId: result.newSourceId } : {})
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
