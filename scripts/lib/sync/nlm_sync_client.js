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
const { safeWriteJsonAtomic } = require('../fs_compat.js');

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

  try {
    const envPath = process.env.PATH || '';
    const homeBin = path.join(process.env.HOME || '', '.local', 'bin');
    const extendedPath = `${homeBin}:${envPath}`;

    let notebookCfg = {};
    if (fs.existsSync(CONFIG_NOTEBOOKS)) {
      try {
        notebookCfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
      } catch (_) { /* ignore */ }
    }

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
      const listOutput = execFileSync('nlm', ['source', 'list', notebookId, '--json'], {
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

    // Upload fresh source
    const stdout = execFileSync('nlm', [
      'source', 'add', notebookId,
      '--file', payloadPath,
      '--title', canonicalSourceName,
      '--wait'
    ], {
      encoding: 'utf-8',
      timeout: 120000,
      env: { ...process.env, PATH: extendedPath }
    });

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
      message: `Replaced old source(s) and synced "${canonicalSourceName}" to NotebookLM (${notebookId}) via nlm CLI.`
    };
  } catch (cliErr) {
    result = {
      success: false,
      mode: 'MCP_OR_MANUAL',
      notebookId,
      payloadPath,
      canonicalSourceName,
      mcpToolName: 'source_add',
      mcpServer: 'gemini-notebook-mcp',
      message: `CLI sync unavailable (${cliErr.message}). Payload ready at ${payloadPath}. Upload as "${canonicalSourceName}" via gemini-notebook-mcp source_add or nlm CLI.`
    };
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
