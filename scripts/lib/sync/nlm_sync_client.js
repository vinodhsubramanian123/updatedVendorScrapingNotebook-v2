'use strict';
/**
 * scripts/lib/sync/nlm_sync_client.js — NotebookLM CLI Sync Client
 *
 * Handles source deduplication, canonical naming, and uploading markdown
 * payloads to Google NotebookLM via the `nlm` CLI or MCP fallback.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync: defaultExecFileSync } = require('child_process');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { normalizeLearningText } = require('./google_sheets_writer.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const RECOVERY_QUEUE_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'source_recovery_queue.json');
const { acquireWorkflowLease } = require('../system/workflow_lease.js');
function protectedNotebookSources(config, notebookId) {
  return Object.values(config.notebooks || {}).filter(mapping => mapping.notebookId === notebookId).flatMap(mapping =>
    [mapping.lastSyncedSourceId, mapping.driveSourceId, mapping.runningKnowledgeSourceId,
      ...(mapping.officialSourceIds || []), ...(mapping.certifiedCatalogSourceIds || []),
      ...(mapping.canonicalKnowledgeSourceIds || []), ...(mapping.verifiedLearningSourceIds || []), ...(mapping.trustedSourceIds || [])]).filter(Boolean);
}
function readRecoveryQueue() {
  const legacy = path.join(PROJECT_ROOT, 'history', 'source_recovery_queue.json');
  if (!fs.existsSync(RECOVERY_QUEUE_PATH) && fs.existsSync(legacy)) {
    let queue;
    try {
      queue = JSON.parse(fs.readFileSync(legacy, 'utf8'));
      if (!Array.isArray(queue)) throw new Error('Legacy recovery queue is not an array');
    } catch (error) {
      fs.renameSync(legacy, legacy + '.corrupt-' + require('crypto').randomUUID());
      throw new Error('Legacy recovery queue quarantined: ' + error.message);
    }
    safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, queue);
  }
  if (!fs.existsSync(RECOVERY_QUEUE_PATH)) return [];
  try {
    const queue = JSON.parse(fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8'));
    if (!Array.isArray(queue)) throw new Error('Recovery queue is not an array');
    return queue;
  } catch (error) {
    fs.renameSync(RECOVERY_QUEUE_PATH, RECOVERY_QUEUE_PATH + '.corrupt-' + require('crypto').randomUUID());
    throw new Error('Recovery queue quarantined: ' + error.message);
  }
}
function recordSourceRecoveryAction(entry) {
  const release = acquireWorkflowLease('source-recovery-queue');
  try {
    const queue = readRecoveryQueue();
    const item = { ...entry, id: require('crypto').randomUUID(), timestamp: new Date().toISOString() };
    queue.push(item);
    safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, queue);
    return item.id;
  } finally { release(); }
}
function updateSourceRecoveryAction(id, changes) {
  const release = acquireWorkflowLease('source-recovery-queue');
  try {
    const queue = readRecoveryQueue();
    const item = queue.find(entry => entry.id === id);
    if (!item) throw new Error('Missing recovery attempt');
    Object.assign(item, changes);
    safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, queue);
  } finally { release(); }
}
function processSourceRecoveryQueue(notebookId, extendedPath = process.env.PATH, execFn = defaultExecFileSync, options = {}) {
  if (!notebookId) throw new Error('Scoped notebook identity is required for recovery');
  const release = acquireWorkflowLease('source-recovery-queue');
  try {
    const queue = readRecoveryQueue();
    const config = JSON.parse(fs.readFileSync(options.configPath || path.join(PROJECT_ROOT, 'scripts/config/notebooks.json'), 'utf8'));
    const inventories = new Map();
    let purged = 0;
    for (const item of queue.filter(entry => entry.notebookId === notebookId && ['PURGE_REQUIRED', 'AUDIT_TIMEOUT_REQUIRED', 'UPLOAD_IN_FLIGHT'].includes(entry.status))) {
      const mapping = config.notebooks?.[item.chassisName];
      if (!mapping || mapping.notebookId !== notebookId) { item.lastPurgeError = 'Current product mapping mismatch'; continue; }
      const protectedIds = new Set(protectedNotebookSources(config, notebookId));
      try {
        if (!inventories.has(notebookId)) {
          const inventory = JSON.parse(execFn('nlm', ['source', 'list', notebookId, '--json'], { encoding: 'utf8', env: { ...process.env, PATH: extendedPath }, timeout: 30000 }));
          if (!Array.isArray(inventory)) throw new Error('Invalid live source inventory');
          inventories.set(notebookId, inventory);
        }
        const inventory = inventories.get(notebookId);
        if (item.sourceId === 'TIMEOUT_UNKNOWN_ID') {
          if (!Array.isArray(item.previousSourceIds) || !item.ownedTitle) throw new Error('Unknown candidate ownership requires manual audit');
          const candidates = inventory.filter(source => (source.title || source.filename) === item.ownedTitle && !item.previousSourceIds.includes(source.id));
          if (candidates.length !== 1) throw new Error('Candidate discovery remains pending or ambiguous');
          item.sourceId = candidates[0].id;
          item.createdThisRun = true;
        }
        const source = inventory.find(source => source.id === item.sourceId);
        if (protectedIds.has(item.sourceId)) throw new Error('Candidate is currently protected or active; deletion blocked');
        if (item.previousSourceIds?.includes(item.sourceId)) throw new Error('Pre-existing source cannot be purged');
        if (item.createdThisRun !== true || !item.ownedTitle || (source && (source.title || source.filename) !== item.ownedTitle)) throw new Error('Candidate ownership is unverified');
        const freshConfig = JSON.parse(fs.readFileSync(options.configPath || path.join(PROJECT_ROOT, 'scripts/config/notebooks.json'), 'utf8'));
        if (freshConfig.notebooks?.[item.chassisName]?.notebookId !== notebookId || protectedNotebookSources(freshConfig, notebookId).includes(item.sourceId)) throw new Error('Current governance changed; deletion blocked');
        if (source) {
          execFn('nlm', ['source', 'delete', item.sourceId, '--confirm'], { encoding: 'utf8', timeout: 30000, env: { ...process.env, PATH: extendedPath } });
          const after = JSON.parse(execFn('nlm', ['source', 'list', notebookId, '--json'], { encoding: 'utf8', timeout: 30000, env: { ...process.env, PATH: extendedPath } }));
          if (!Array.isArray(after) || after.some(candidate => candidate.id === item.sourceId)) throw new Error('Source deletion readback is unverified');
          inventories.set(notebookId, after);
        }
        item.status = 'PURGED'; item.purgedAt = new Date().toISOString(); purged++;
      } catch (error) { item.lastPurgeError = error.message; }
    }
    safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, queue);
    return { processed: queue.length, purged, pending: queue.filter(item => item.notebookId === notebookId && item.status !== 'PURGED' && item.status !== 'VERIFIED').length };
  } finally { release(); }
}

function refreshMasterCatalogCsv(payloadPath, chassisName) {
  const payloadDir = path.dirname(payloadPath);
  const excelPath = path.join(payloadDir, `${chassisName}_OCA_Catalog.xlsx`);
  const csvPath = path.join(payloadDir, `${chassisName}_Master_Catalog.csv`);
  if (!fs.existsSync(excelPath)) {
    if (!fs.existsSync(csvPath)) throw new Error(`Certified catalog workbook/CSV not found for ${chassisName}`);
    return csvPath;
  }
  const xlsx = require('xlsx-js-style');
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets['All SKUs'];
  if (!sheet) throw new Error(`Certified workbook has no readable sheet: ${excelPath}`);
  const temporaryPath = `${csvPath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, xlsx.utils.sheet_to_csv(sheet), 'utf8');
  fs.renameSync(temporaryPath, csvPath);
  return csvPath;
}

function assertPayloadProductIsolation(payloadText, chassisName, notebookCfg) {
  const text = String(payloadText || '');
  const isVerifiedSharedLine = line => {
    const marker = line.match(/\[SHARED_ACCESSORY_VERIFIED target=([^\]]+)\]/);
    if (marker) {
      const targetListed = marker[1].split(',').some(product =>
        normalizeLearningText(product) === normalizeLearningText(chassisName)
      );
      if (!targetListed) return false;

      // Strict invariant: Isolated core components (CPU, memory, chassis, motherboards) can NEVER be shared accessories
      const isIsolatedComponent = /\b(processor|xeon|epyc|ddr4|ddr5|memory\s+kit|chassis\s+cto|system\s+board|motherboard)\b/i.test(line);
      if (isIsolatedComponent) return false;

      return /\b[A-Z0-9]{5,}(?:-[A-Z0-9]{2,3})?\b/.test(line) &&
        /Evidence: (?:OFFICIAL_VENDOR_DOC|CERTIFIED_OCA_CATALOG|VERIFIED_PORTAL_RULE); Sources: [A-Za-z0-9_.:-]+(?:,[A-Za-z0-9_.:-]+)*\)/.test(line);
    }

    // In a managed catalog table row, non-isolated hardware options (risers, kits, cables, rails, shipping)
    // whose vendor name references another product generation (e.g. DL380 Gen11 Riser Kit on DL380 Gen12)
    // are official certified options within this chassis catalog.
    const isTableRow = /^\s*\|\s*\d+\s*\|/.test(line);
    if (isTableRow) {
      const isIsolatedComponent = /\b(processor|xeon|epyc|ddr4|ddr5|memory\s+kit|chassis\s+cto|system\s+board|motherboard)\b/i.test(line);
      if (isIsolatedComponent) return false;
      const hasSku = /\b[A-Z0-9]{5,}(?:-[A-Z0-9]{2,3})?\b/.test(line);
      const isAccessoryOption = /\b(riser|shipping|kit|cable|rail|bracket|fan|bezel|heatsink|power\s*cord|transceiver|adapter)\b/i.test(line);
      return hasSku && isAccessoryOption;
    }

    return false;
  };
  const otherProducts = Object.keys(notebookCfg?.notebooks || {}).filter(name => name !== chassisName);
  for (const product of otherProducts) {
    const aliases = [product, product.replace(/_/g, ' ')];
    const offendingLine = text.split(/\r?\n/).find(line =>
      aliases.some(alias => new RegExp(`(^|[^A-Za-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`, 'i').test(line)) &&
      !isVerifiedSharedLine(line)
    );
    if (offendingLine) {
      throw new Error(`Product isolation rejected ${chassisName} payload: reference to registered product ${product}`);
    }
  }
  return true;
}

function isGroundedCanary(parsed, sourceId, chassisName) {
  const answer = String(parsed?.answer || parsed?.response || parsed?.result || '').toLowerCase();
  const citedIds = new Set([
    ...(Array.isArray(parsed?.sources_used) ? parsed.sources_used : []),
    ...Object.values(parsed?.citations || {})
  ].map(String));
  const rawTarget = String(chassisName || '').toLowerCase();
  const spacedTarget = rawTarget.replace(/_/g, ' ');
  const mentionsProduct = (rawTarget && answer.includes(rawTarget)) || (spacedTarget && answer.includes(spacedTarget));
  return answer.length > 20 && mentionsProduct &&
    citedIds.has(String(sourceId)) && !/no (?:relevant )?source|cannot (?:find|verify)/i.test(answer);
}

function isTargetDriveSourceFresh(output, targetSourceId = null, quarantinedSourceIds = []) {
  const text = String(output || '').trim();
  if (!text) return false;
  if (/all drive sources are up to date/i.test(text) || /(?:sources? (?:are )?up to date|in sync|no stale sources?)/i.test(text)) {
    return true;
  }
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return true;
      const quarantinedSet = new Set((quarantinedSourceIds || []).map(String));
      if (targetSourceId) {
        // Ensure our specific target canonical source is not reported stale
        const targetIsStale = parsed.some(s => String(s.id || s.source_id) === String(targetSourceId));
        return !targetIsStale;
      }
      const relevantStale = parsed.filter(s => !quarantinedSet.has(String(s.id || s.source_id)));
      return relevantStale.length === 0;
    }
    if (parsed && typeof parsed === 'object') {
      if (parsed.upToDate === true || parsed.stale === false) return true;
      if (Array.isArray(parsed.stale_sources || parsed.staleSources)) {
        const list = parsed.stale_sources || parsed.staleSources;
        if (targetSourceId) {
          return !list.some(s => String(s.id || s.source_id || s) === String(targetSourceId));
        }
        return list.length === 0;
      }
    }
  } catch {
    // Unrecognized or invalid output cannot be verified as fresh
  }
  return false;
}

function isDriveFreshnessReportClean(output) {
  return isTargetDriveSourceFresh(output);
}

function buildTrustedSourceIds(existing = {}, newSourceId = null, driveSourceVerified = null) {
  const quarantined = new Set((existing.quarantinedSourceIds || []).map(String));
  return Array.from(new Set([
    ...(existing.officialSourceIds || []),
    ...(existing.certifiedCatalogSourceIds || []),
    ...(existing.verifiedLearningSourceIds || []),
    newSourceId,
    driveSourceVerified
  ].filter(sourceId => sourceId && !quarantined.has(String(sourceId)))));
}

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
  let release;
  try {
    release = require('../system/workflow_lease.js').acquireWorkflowLease('notebook-catalog-sync');
    return syncToNotebookLMWithinLease(notebookId, payloadPath, chassisName, totalRulesCount, options);
  } catch (error) {
    return { success: false, cloudVerified: false, mode: 'SYNC_BLOCKED', message: error.message };
  } finally { release?.(); }
}

function uploadAndVerifyLegacyFileCandidate({
  effectiveNotebookId,
  payloadPath,
  canonicalSourceName,
  chassisName,
  execFileSync,
  extendedPath,
  legacyFingerprint,
  configPath
}) {
  processSourceRecoveryQueue(effectiveNotebookId, extendedPath, execFileSync, { configPath });
  const ownedTitle = canonicalSourceName + '_' + require('crypto').randomUUID();
  const before = JSON.parse(execFileSync('nlm', ['source', 'list', effectiveNotebookId, '--json'], { encoding: 'utf8', timeout: 30000, env: { ...process.env, PATH: extendedPath } }));
  if (!Array.isArray(before)) throw new Error('Cannot establish candidate ownership before upload.');
  const previousSourceIds = before.map(source => source.id);
  const attemptId = recordSourceRecoveryAction({ notebookId: effectiveNotebookId, chassisName, canonicalSourceName, ownedTitle, previousSourceIds, sourceId: 'TIMEOUT_UNKNOWN_ID', status: 'UPLOAD_IN_FLIGHT' });
  let stdout = '';
  let newSourceId = null;
  try {
    stdout = execFileSync('nlm', [
      'source', 'add', effectiveNotebookId,
      '--file', payloadPath,
      '--title', ownedTitle,
      '--wait',
      '--json'
    ], {
      encoding: 'utf-8',
      timeout: 600000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, PATH: extendedPath }
    });
    try {
      const parsed = JSON.parse(stdout);
      newSourceId = parsed.source_id || parsed.id || parsed.sourceId || parsed.source?.id;
    } catch {}
    if (!newSourceId) {
      const idMatch = stdout.match(/source[^:]*(?:added|id)[^:]*:\s*([\w-]+)/i) ||
                      stdout.match(/"id"\s*:\s*"([^"]+)"/i) ||
                      stdout.match(/\bsrc_([\w-]+)/i);
      if (idMatch) newSourceId = idMatch[1];
    }
  } catch (uploadErr) {
    updateSourceRecoveryAction(attemptId, { status: 'AUDIT_TIMEOUT_REQUIRED', reason: uploadErr.message });
    throw new Error(`Transactional Sync Aborted during Candidate Upload: ${uploadErr.message}. Old source remains active.`);
  }

  function attemptCandidatePurge(sourceId) {
    if (previousSourceIds.includes(sourceId)) return { attempted: false, succeeded: false, error: 'Pre-existing source cannot be purged' };
    if (!sourceId) return { attempted: false, succeeded: false, error: 'No candidate source ID' };
    try {
      const governance = JSON.parse(fs.readFileSync(configPath || path.join(PROJECT_ROOT, 'scripts/config/notebooks.json'), 'utf8'));
      const mapping = governance.notebooks?.[chassisName];
      const protectedIds = protectedNotebookSources(governance, effectiveNotebookId);
      if (mapping?.notebookId !== effectiveNotebookId || protectedIds.includes(sourceId)) throw new Error('Current source governance blocks candidate purge');
      const inventory = JSON.parse(execFileSync('nlm', ['source', 'list', effectiveNotebookId, '--json'], { encoding: 'utf8', timeout: 30000, env: { ...process.env, PATH: extendedPath } }));
      const source = Array.isArray(inventory) && inventory.find(item => item.id === sourceId);
      if (!source || (source.title || source.filename) !== ownedTitle) throw new Error('Candidate ownership is not verified in live inventory');
      execFileSync('nlm', ['source', 'delete', sourceId, '--confirm'], {
        encoding: 'utf-8', timeout: 30000, env: { ...process.env, PATH: extendedPath }
      });
      const after = JSON.parse(execFileSync('nlm', ['source', 'list', effectiveNotebookId, '--json'], { encoding: 'utf8', timeout: 30000, env: { ...process.env, PATH: extendedPath } }));
      if (!Array.isArray(after) || after.some(item => item.id === sourceId)) throw new Error('Candidate deletion readback is unverified');
      return { attempted: true, succeeded: true };
    } catch (delErr) {
      return { attempted: true, succeeded: false, error: delErr.message };
    }
  }

  try {
    if (!newSourceId) throw new Error('Uploaded candidate has no source ID; restricted verification cannot run.');
    const canaryArgs = [
      'notebook', 'query', effectiveNotebookId,
      `Canary verification: Summarize base chassis model and SKUs for ${chassisName}.`
    ];
    if (newSourceId) canaryArgs.push('--source-ids', newSourceId);
    const canaryTimeoutMs = parseInt(process.env.NLM_SYNC_CANARY_TIMEOUT_MS || '600000', 10);
    canaryArgs.push('--timeout', String(Math.ceil(canaryTimeoutMs / 1000)), '--new-conversation', '--json');
    const canaryOutput = execFileSync('nlm', canaryArgs, {
      encoding: 'utf-8',
      timeout: canaryTimeoutMs,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, PATH: extendedPath }
    });
    const parsedCanary = JSON.parse(canaryOutput);
    const canaryOk = Boolean(newSourceId && isGroundedCanary(parsedCanary, newSourceId, chassisName));
    if (!canaryOk) {
      throw new Error(`Canary verification failed for ${canonicalSourceName}`);
    }

    const indexedContent = execFileSync('nlm', ['source', 'content', newSourceId, '--json'], {
      encoding: 'utf-8', timeout: 60000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PATH: extendedPath }
    });

    if (!legacyFingerprint || !String(indexedContent).includes(legacyFingerprint)) {
      throw new Error('Legacy source lacks the current complete-workbook fingerprint');
    }

    require('./semantic_workbook_projection').verifySemanticProjectionReadback(
      fs.readFileSync(payloadPath, 'utf8'), indexedContent);

    updateSourceRecoveryAction(attemptId, { sourceId: newSourceId, status: 'VERIFIED', createdThisRun: true });
    return { newSourceId, stdout };
  } catch (verifyErr) {
    const purge = attemptCandidatePurge(newSourceId);
    updateSourceRecoveryAction(attemptId, { sourceId: newSourceId || 'TIMEOUT_UNKNOWN_ID', createdThisRun: newSourceId && !previousSourceIds.includes(newSourceId), status: purge.succeeded ? 'PURGED' : 'PURGE_REQUIRED', lastPurgeError: purge.error || verifyErr.message });

    const purgeDetail = purge.succeeded
      ? `Candidate ${newSourceId} was purged.`
      : `Candidate ${newSourceId} purge failed (${purge.error || 'unknown error'}); recorded in durable recovery queue for automatic cleanup.`;
    throw new Error(`Transactional Sync Failed Candidate Verification for ${canonicalSourceName} (${verifyErr.message}). ${purgeDetail} Old source remains active.`);
  }
}

function syncAndVerifyCanonicalDriveWorkbook({
  effectiveNotebookId,
  payloadPath,
  chassisName,
  cfgEntry,
  execFileSync,
  extendedPath,
  canonicalDriveSheetId,
  canonicalDriveSheetUrl,
  canonicalDriveSourceId
}) {
  let sheetId = canonicalDriveSheetId;
  let sheetUrl = canonicalDriveSheetUrl;
  let sourceId = canonicalDriveSourceId;
  let contentFingerprints = null;

  try {
    const masterCsvPath = refreshMasterCatalogCsv(payloadPath, chassisName);
    const writerArgs = [path.join(__dirname, 'google_sheets_writer.js')];
    if (sheetId) {
      writerArgs.push(sheetId, masterCsvPath, payloadPath, chassisName);
    } else {
      writerArgs.push('--create', `${chassisName} Canonical Knowledge`, masterCsvPath, payloadPath, chassisName);
    }
    const writerOutput = execFileSync(process.execPath, writerArgs, {
      encoding: 'utf-8',
      timeout: 600000,
      env: { ...process.env, PATH: extendedPath }
    });
    const writerResult = JSON.parse(writerOutput);
    if (writerResult.success !== true || writerResult.readbackVerified !== true || !writerResult.fingerprints?.combined) {
      throw new Error('Canonical workbook write lacks verified readback and content fingerprints');
    }
    contentFingerprints = writerResult.fingerprints || null;
    sheetId = writerResult.spreadsheetId || sheetId;
    sheetUrl = writerResult.spreadsheetUrl || sheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

    if (sourceId) {
      const liveSourceOutput = execFileSync('nlm', ['source', 'list', effectiveNotebookId, '--json'], {
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, PATH: extendedPath }
      });
      const liveSources = JSON.parse(liveSourceOutput);
      if (!Array.isArray(liveSources) || !liveSources.some(source => source.id === sourceId)) {
        sourceId = null;
      }
    }
    if (!sourceId) {
      const addDriveOutput = execFileSync('nlm', [
        'source', 'add', effectiveNotebookId,
        '--drive', sheetId,
        '--type', 'sheets',
        '--title', `${chassisName} Canonical Knowledge`,
        '--wait',
        '--json'
      ], {
        encoding: 'utf-8',
        timeout: 600000,
        env: { ...process.env, PATH: extendedPath }
      });
      const addedDrive = JSON.parse(addDriveOutput);
      sourceId = addedDrive.source_id || addedDrive.id || addedDrive.sourceId || addedDrive.source?.id || null;
      if (!sourceId && typeof addDriveOutput === 'string') {
        const match = addDriveOutput.match(/source_id["']?\s*:\s*["']?([\w-]+)/i) ||
                      addDriveOutput.match(/"id"\s*:\s*"([^"]+)"/i) ||
                      addDriveOutput.match(/\bsrc_([\w-]+)/i);
        if (match) sourceId = match[1];
      }
      if (!sourceId) throw new Error('NotebookLM did not return a Drive source ID');
    } else {
      execFileSync('nlm', [
        'source', 'sync', effectiveNotebookId,
        '--source-ids', sourceId,
        '--confirm'
      ], {
        encoding: 'utf-8',
        timeout: 600000,
        env: { ...process.env, PATH: extendedPath }
      });
    }

    const staleOutput = execFileSync('nlm', ['source', 'stale', effectiveNotebookId, '--json'], {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, PATH: extendedPath }
    });
    const quarantined = cfgEntry?.quarantinedSourceIds || [];
    if (!isTargetDriveSourceFresh(staleOutput, sourceId, quarantined)) {
      throw new Error(`NotebookLM reports canonical Drive source (${sourceId}) is still stale after synchronization: ${String(staleOutput).trim()}`);
    }

    const driveCanaryOutput = execFileSync('nlm', [
      'notebook', 'query', effectiveNotebookId,
      `Drive source canary: identify ${chassisName} and summarize one certified catalog change or verified rule.`,
      '--source-ids', sourceId,
      '--timeout', '600',
      '--new-conversation',
      '--json'
    ], {
      encoding: 'utf-8',
      timeout: 600000,
      env: { ...process.env, PATH: extendedPath }
    });
    const driveCanary = JSON.parse(driveCanaryOutput);
    if (!isGroundedCanary(driveCanary, sourceId, chassisName)) {
      throw new Error('restricted Drive-source canary did not return a grounded answer');
    }

    const indexedContent = execFileSync('nlm', ['source', 'content', sourceId, '--json'], {
      encoding: 'utf-8', timeout: 60000, env: { ...process.env, PATH: extendedPath }
    });
    if (!String(indexedContent).includes(contentFingerprints.combined)) {
      throw new Error('NotebookLM indexed source does not contain the current workbook fingerprint');
    }

    return {
      newSourceId: sourceId,
      canonicalDriveSheetId: sheetId,
      canonicalDriveSheetUrl: sheetUrl,
      canonicalDriveSourceId: sourceId,
      contentFingerprints,
      driveSyncStatus: 'KNOWLEDGE_WORKBOOK_WRITTEN_REFRESHED_AND_CANARY_VERIFIED',
      driveSourceVerified: sourceId
    };
  } catch (driveErr) {
    throw new Error(`Canonical Google Sheet synchronization failed before retirement: ${driveErr.message}. Old source remains active.`);
  }
}

function retireStaleNotebookSources({
  effectiveNotebookId,
  chassisName,
  newSourceId,
  previousSourceId,
  canonicalDriveSheetId,
  allowSourceDeletion,
  cfgEntry,
  execFileSync,
  extendedPath,
  payloadPath,
  contentFingerprints,
  legacyFingerprint
}) {
  const isManagedTitle = title => String(title || '').startsWith(`${chassisName}_OCA_Catalog_`)
    || String(title || '') === `notebook_sync_payload_${chassisName}.md`
    || String(title || '') === `${chassisName} Canonical Knowledge`
    || String(title || '').includes(`${chassisName} Canonical Knowledge`)
    || String(title || '').includes(`${chassisName}_OCA_Catalog`)
    || String(title || '').includes(`${chassisName} Master Catalog`);

  const retiredSourceIds = [];
  const retirementErrors = [];
  let remainingSourceIds = [previousSourceId].filter(id => id && id !== newSourceId);

  try {
    const listOutput = execFileSync('nlm', ['source', 'list', effectiveNotebookId, '--json'], {
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, PATH: extendedPath }
    });
    const sources = JSON.parse(listOutput);
    const protectedIds = new Set([...(cfgEntry?.officialSourceIds || []), ...(cfgEntry?.verifiedLearningSourceIds || []), cfgEntry?.runningKnowledgeSourceId].filter(Boolean));
    const staleSources = Array.isArray(sources) ? sources.filter(s => {
      const title = String(s.title || s.filename || '');
      const isDriveDuplicate = canonicalDriveSheetId && (s.drive_id === canonicalDriveSheetId || s.doc_id === canonicalDriveSheetId);
      const isManagedSource = isManagedTitle(title) || isDriveDuplicate;
      return (
        isManagedSource &&
        s.id !== undefined &&
        !protectedIds.has(s.id) &&
        s.id !== newSourceId
      );
    }) : [];

    if (!Array.isArray(sources)) throw new Error('Unrecognized NotebookLM source inventory');
    if (!sources.some(source => source.id === newSourceId)) throw new Error('Verified source absent from notebook inventory');

    remainingSourceIds = staleSources.map(source => source.id);
    const attemptDir = path.join(path.dirname(payloadPath), 'history', 'source_sync_attempts');
    fs.mkdirSync(attemptDir, { recursive: true });
    const attemptPath = path.join(attemptDir, `${Date.now()}-${process.pid}.json`);
    const attempt = {
      product: chassisName, notebookId: effectiveNotebookId, replacementSourceId: newSourceId,
      verifiedAt: new Date().toISOString(), contentFingerprints, legacyFingerprint,
      retirementRequested: allowSourceDeletion, plannedRetirementIds: remainingSourceIds, status: 'REPLACEMENT_VERIFIED'
    };
    safeWriteJsonAtomic(attemptPath, attempt);

    const ownedIds = new Set([previousSourceId, cfgEntry?.lastSyncedSourceId, cfgEntry?.driveSourceId,
      ...(cfgEntry?.certifiedCatalogSourceIds || []), ...(cfgEntry?.canonicalKnowledgeSourceIds || [])].filter(Boolean));
    // A familiar title is a discovery hint, not authority to delete that source.
    for (const stale of allowSourceDeletion ? staleSources.filter(source => ownedIds.has(source.id)) : []) {
      try {
        execFileSync('nlm', ['source', 'delete', stale.id, '--confirm'], {
          encoding: 'utf-8',
          timeout: 10000,
          env: { ...process.env, PATH: extendedPath }
        });
        retiredSourceIds.push(stale.id);
      } catch (error) { retirementErrors.push(error.message); }
    }

    if (allowSourceDeletion) {
      const after = JSON.parse(execFileSync('nlm', ['source', 'list', effectiveNotebookId, '--json'], {
        encoding: 'utf-8', timeout: 30000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PATH: extendedPath }
      }));
      if (!Array.isArray(after) || !after.some(source => source.id === newSourceId)) {
        throw new Error('Replacement source missing from post-retirement inventory');
      }
      remainingSourceIds = after.filter(source => source.id !== newSourceId &&
        !protectedIds.has(source.id) && isManagedTitle(source.title || source.filename)).map(source => source.id);
    }

    safeWriteJsonAtomic(attemptPath, {
      ...attempt, retiredSourceIds, remainingSourceIds, retirementErrors,
      status: remainingSourceIds.length || retirementErrors.length ? 'RETIREMENT_PENDING' : 'CONSOLIDATED'
    });
  } catch (error) { retirementErrors.push(error.message); }

  if (allowSourceDeletion && (retirementErrors.length || remainingSourceIds.length)) {
    throw new Error(`Source retirement unverified: ${remainingSourceIds.length} old source(s); ${retirementErrors.join('; ')}`);
  }

  return { retiredSourceIds, remainingSourceIds, retirementErrors };
}

function syncToNotebookLMWithinLease(notebookId, payloadPath, chassisName = 'Unknown_Chassis', totalRulesCount = 0, options = {}) {
  const execFileSync = options.execFileSync || defaultExecFileSync;
  const CONFIG_NOTEBOOKS = options.notebookConfigPath || path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');
  let result = null;
  let retirementRequest = null;
  let driveSyncStatus = 'NOT_CONFIGURED';
  let driveSourceVerified = null;
  let contentFingerprints = options.contentFingerprints || null;
  const scrapeDate = new Date().toISOString().split('T')[0];
  const canonicalSourceName = `${chassisName}_OCA_Catalog_${scrapeDate}`;

  let notebookCfg = {};
  if (fs.existsSync(CONFIG_NOTEBOOKS)) {
    try {
      notebookCfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
    } catch { /* ignore */ }
  }

  const mapped = notebookCfg.notebooks?.[chassisName];
  const mappedId = typeof mapped === 'string' ? mapped : mapped?.notebookId;
  const effectiveNotebookId = mappedId && (!notebookId || notebookId.trim() === mappedId.trim())
    ? mappedId.trim() : null;

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
    return {
      success: false,
      cloudVerified: false,
      mode: 'CI_OFFLINE_LOCAL_ONLY',
      notebookId: effectiveNotebookId,
      payloadPath,
      canonicalSourceName,
      message: `CI Mode: local payload verified at ${payloadPath}; no NotebookLM cloud synchronization was attempted.`
    };
  }

  try {
    const envPath = process.env.PATH || '';
    const homeBin = path.join(os.homedir(), '.local', 'bin');
    const extendedPath = [homeBin, envPath].filter(Boolean).join(path.delimiter);

    const cfgEntry = notebookCfg.notebooks && notebookCfg.notebooks[chassisName];
    const previousSourceId = (cfgEntry && typeof cfgEntry === 'object') ? cfgEntry.lastSyncedSourceId : null;
    const allowSourceDeletion = options.confirmSourceRetirement === true;
    const useCanonicalDrive = cfgEntry?.canonicalDriveEnabled === true;
    let canonicalDriveSheetId = cfgEntry?.driveSheetId || null;
    let canonicalDriveSheetUrl = cfgEntry?.driveSheetUrl || null;
    let canonicalDriveSourceId = cfgEntry?.driveSourceId || null;
    assertPayloadProductIsolation(fs.readFileSync(payloadPath, 'utf8'), chassisName, notebookCfg);
    let legacyFingerprint = null;
    if (!useCanonicalDrive) {
      const csv = refreshMasterCatalogCsv(payloadPath, chassisName);
      const datasets = require('./google_sheets_writer.js').buildKnowledgeWorkbookDatasets(csv, payloadPath, { chassisName });
      legacyFingerprint = datasets.fingerprints.combined;
      const baseText = fs.readFileSync(payloadPath, 'utf8').split('\n<!-- MANAGED_FULL_CATALOG -->')[0];
      const projection = require('./semantic_workbook_projection').projectWorkbookToMarkdown(datasets.workbookTabs);
      fs.writeFileSync(payloadPath, `${baseText}\n<!-- MANAGED_FULL_CATALOG -->\nContent fingerprint: ${legacyFingerprint}\n\n${projection.markdown}\n`, 'utf8');
    }

    let newSourceId = null;
    let stdout = '';

    if (!useCanonicalDrive) {
      const legacyResult = uploadAndVerifyLegacyFileCandidate({
        effectiveNotebookId,
        payloadPath,
        canonicalSourceName,
        chassisName,
        execFileSync,
        extendedPath,
        legacyFingerprint,
        configPath: CONFIG_NOTEBOOKS
      });
      newSourceId = legacyResult.newSourceId;
      stdout = legacyResult.stdout;
    } else {
      const driveResult = syncAndVerifyCanonicalDriveWorkbook({
        effectiveNotebookId,
        payloadPath,
        chassisName,
        cfgEntry,
        execFileSync,
        extendedPath,
        canonicalDriveSheetId,
        canonicalDriveSheetUrl,
        canonicalDriveSourceId
      });
      newSourceId = driveResult.newSourceId;
      canonicalDriveSheetId = driveResult.canonicalDriveSheetId;
      canonicalDriveSheetUrl = driveResult.canonicalDriveSheetUrl;
      canonicalDriveSourceId = driveResult.canonicalDriveSourceId;
      contentFingerprints = driveResult.contentFingerprints;
      driveSyncStatus = driveResult.driveSyncStatus;
      driveSourceVerified = driveResult.driveSourceVerified;
    }

    if (!newSourceId) {
      throw new Error(`Transactional Sync Failed: no verified canonical source is active for ${chassisName}. Old source remains active.`);
    }

    // Retire only after the verified replacement's trust mapping is committed.
    retirementRequest = {
      effectiveNotebookId,
      chassisName,
      newSourceId,
      previousSourceId,
      canonicalDriveSheetId,
      allowSourceDeletion,
      cfgEntry,
      execFileSync,
      extendedPath,
      payloadPath,
      contentFingerprints,
      legacyFingerprint
    };
    const retiredSourceIds = [], retirementErrors = [];
    const remainingSourceIds = [previousSourceId].filter(id => id && id !== newSourceId);

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
      newSourceName: useCanonicalDrive ? `${chassisName} Canonical Knowledge` : canonicalSourceName,
      driveSyncStatus,
      consolidationVerified: remainingSourceIds.length === 0,
      retiredSourceIds: [...new Set(retiredSourceIds)],
        retirementErrors,
        contentFingerprints,
        canonicalDriveSheetId,
        canonicalDriveSheetUrl,
        canonicalDriveSourceId,
        staleSourceIds: remainingSourceIds,
        message: `${useCanonicalDrive ? 'Refreshed' : 'Uploaded'} and canary-verified "${useCanonicalDrive ? `${chassisName} Canonical Knowledge` : canonicalSourceName}" in NotebookLM (${effectiveNotebookId}). Existing sources were preserved unless explicit retirement was confirmed.`
      };
    } catch (cliErr) {
      result = {
        success: false,
        cloudVerified: false,
        mode: 'MCP_OR_MANUAL',
        notebookId: effectiveNotebookId,
        payloadPath,
        canonicalSourceName,
        mcpToolName: 'source_add',
        mcpServer: 'gemini-notebook-mcp',
        message: `CLI sync unavailable (${cliErr.message}). Payload ready at ${payloadPath}. Upload as "${canonicalSourceName}" via gemini-notebook-mcp source_add or nlm CLI.`
      };

      if (fs.existsSync(CONFIG_NOTEBOOKS)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
          if (cfg.notebooks && cfg.notebooks[chassisName]) {
            const existing = cfg.notebooks[chassisName];
            cfg.notebooks[chassisName] = {
              ...(typeof existing === 'object' ? existing : { notebookId: existing }),
              lastSyncAttemptAt: new Date().toISOString(),
              lastSyncError: cliErr.message,
              cloudSyncState: 'FAILED'
            };
            safeWriteJsonAtomic(CONFIG_NOTEBOOKS, cfg);
          }
        } catch {}
      }
    }

  // Activate the verified candidate durably before retiring any prior source.
  let activationCommitted = false;
  if (result && result.success) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
      if (!cfg.notebooks?.[chassisName] || (cfg.notebooks[chassisName].notebookId || cfg.notebooks[chassisName]) !== effectiveNotebookId) {
        throw new Error('Notebook mapping changed or disappeared before candidate activation.');
      }
      if (cfg.notebooks && cfg.notebooks[chassisName]) {
        const existing = typeof cfg.notebooks[chassisName] === 'string'
          ? { notebookId: cfg.notebooks[chassisName] }
          : cfg.notebooks[chassisName];
        let payloadChecksum = null;
        if (payloadPath && fs.existsSync(payloadPath)) {
          try {
            const crypto = require('crypto');
            const normalizedPayload = normalizeLearningText(fs.readFileSync(payloadPath, 'utf8'));
            payloadChecksum = crypto.createHash('sha256').update(normalizedPayload).digest('hex');
          } catch {}
        }
        cfg.notebooks[chassisName] = {
          ...existing,
          queryEnabled: true,
          lastSyncedAt: new Date().toISOString(),
          lastSyncDeltaCount: totalRulesCount,
          cloudSyncState: 'VERIFIED',
          lastSyncError: null,
          isolationLevel: 'CHASSIS_SPECIFIC',
          lastSyncedSourceName: result.newSourceName,
          trustedSourceIds: buildTrustedSourceIds({ ...existing, certifiedCatalogSourceIds: [] }, result.newSourceId, driveSourceVerified),
          lastCatalogSha256: require('crypto').createHash('sha256').update(fs.readFileSync(
            path.join(path.dirname(payloadPath), `${chassisName}_Catalog.json`))).digest('hex'),
          lastArtifactHashes: Object.fromEntries(['Catalog.json', 'Services.json', 'Catalog_Rules.json', 'OCA_Catalog.xlsx'].map(suffix => [suffix,
            require('crypto').createHash('sha256').update(fs.readFileSync(path.join(path.dirname(payloadPath), `${chassisName}_${suffix}`))).digest('hex')])),
          canonicalKnowledgeSourceIds: Array.from(new Set([
            result.newSourceId,
            driveSourceVerified
          ].filter(Boolean))),
          certifiedCatalogSourceIds: Array.from(new Set([
            result.newSourceId,
            driveSourceVerified
          ].filter(Boolean))),
          ...(payloadChecksum ? { lastPayloadChecksum: payloadChecksum } : {}),
          ...(result.contentFingerprints ? { lastContentFingerprints: result.contentFingerprints } : {}),
          ...(result.canonicalDriveSheetId ? { driveSheetId: result.canonicalDriveSheetId } : {}),
          ...(result.canonicalDriveSheetUrl ? { driveSheetUrl: result.canonicalDriveSheetUrl } : {}),
          ...(result.canonicalDriveSourceId ? { driveSourceId: result.canonicalDriveSourceId } : {}),
          ...(result.newSourceId ? { lastSyncedSourceId: result.newSourceId } : {})
        };
        safeWriteJsonAtomic(CONFIG_NOTEBOOKS, cfg);
        activationCommitted = true;
      }
    } catch (metadataErr) {
      result = {
        ...result,
        success: false,
        mode: 'CLOUD_VERIFIED_METADATA_FAILED',
        message: `${result.message} Local NotebookLM trust metadata could not be persisted: ${metadataErr.message}`
      };
      result.activationStatus = 'ACTIVATION_PENDING';
      result.candidateCleanupPending = true;
      try {
        const pendingPath = path.join(path.dirname(payloadPath), 'history', 'source_sync_attempts', `${Date.now()}-${process.pid}-activation-pending.json`);
        safeWriteJsonAtomic(pendingPath, { product: chassisName, notebookId: effectiveNotebookId,
          sourceId: result.newSourceId, status: 'ACTIVATION_PENDING', candidateCleanupPending: true,
          previousSourcePreserved: true, error: metadataErr.message, recordedAt: new Date().toISOString() });
        result.pendingAttemptPath = pendingPath;
      } catch (receiptError) { result.pendingReceiptError = receiptError.message; }
    }
  }

  if (result?.success && activationCommitted && retirementRequest) {
    try {
      const retirement = retireStaleNotebookSources(retirementRequest);
      result.retiredSourceIds = [...new Set(retirement.retiredSourceIds)];
      result.staleSourceIds = retirement.remainingSourceIds;
      result.retirementErrors = retirement.retirementErrors;
      result.consolidationVerified = retirement.remainingSourceIds.length === 0;
    } catch (error) {
      if (options.confirmSourceRetirement === true) {
        result.success = false;
        result.message = `Source retirement failed: ${error.message}`;
      }
      result.consolidationVerified = false;
      result.retirementErrors = [error.message];
    }
  }

  return result;
}

module.exports = {
  assertPayloadProductIsolation,
  buildTrustedSourceIds,
  isGroundedCanary,
  isDriveFreshnessReportClean,
  isTargetDriveSourceFresh,
  refreshMasterCatalogCsv,
  syncToNotebookLM,
  recordSourceRecoveryAction,
  processSourceRecoveryQueue,
  readRecoveryQueue,
  RECOVERY_QUEUE_PATH
};
