'use strict';
/**
 * scripts/lib/fs_compat.js — Cross-Platform Filesystem Helpers
 *
 * Safe file movement across drives (Windows EXDEV fallback), path normalization,
 * and safe directory cleanup.
 */

const fs   = require('fs');
const path = require('path');

/**
 * Move a file cross-platform. Handles EXDEV error when moving across drive boundaries on Windows.
 * @param {string} src
 * @param {string} dest
 */
function moveFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err.code === 'EXDEV' || err.code === 'EPERM') {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    } else {
      throw err;
    }
  }
}

/**
 * Normalize path to forward slashes for cross-platform regex matching and Markdown links.
 * @param {string} p
 * @returns {string}
 */
function toForwardSlash(p) {
  if (!p) return '';
  return p.replace(/\\/g, '/');
}

/**
 * Safe PDF cleanup helper — only removes stray PDFs created within maxAgeMs (default: 2 minutes)
 * to avoid deleting unrelated user documents.
 * @param {string} dir
 * @param {string} destPath
 * @param {number} [maxAgeMs=120000]
 */
function cleanStrayPDFs(dir, destPath, maxAgeMs = 120000) {
  if (!fs.existsSync(dir)) return;
  const now = Date.now();
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (!file.endsWith('.pdf')) continue;
    const fullPath = path.join(dir, file);
    if (path.resolve(fullPath) === path.resolve(destPath)) continue;

    try {
      const stats = fs.statSync(fullPath);
      if (now - stats.mtimeMs <= maxAgeMs) {
        fs.unlinkSync(fullPath);
        console.log(`Cleaned stray temporary PDF: ${file}`);
      }
    } catch (e) {
      console.warn(`[WARN] [FS_COMPAT] Failed cleaning stray PDF ${file}: ${e.message}`);
    }
  }
}

/**
 * Safe atomic JSON write guardrail.
 * Validates JSON structure & non-emptiness before overwriting any rule or catalog JSON file.
 * Creates a .bak backup of existing file before atomic replace via .tmp file.
 * @param {string} destPath Target JSON filepath
 * @param {object} data Object to serialize
 * @param {object} options { minEntriesKey, minCount = 1, validateSchema = false }
 * @returns {object} { success: boolean, backupCreated: boolean, validation: object }
 */
function safeWriteJsonAtomic(destPath, data, options = {}) {
  if (!data || typeof data !== 'object') {
    throw new Error(`safeWriteJsonAtomic aborted: data is not a valid object for ${destPath}`);
  }

  // Schema Non-Emptiness Guardrail
  if (options.minEntriesKey) {
    const arr = data[options.minEntriesKey];
    const minCount = options.minCount || 1;
    if (!Array.isArray(arr) || arr.length < minCount) {
      throw new Error(`safeWriteJsonAtomic guardrail triggered: '${options.minEntriesKey}' has ${Array.isArray(arr) ? arr.length : 0} items, expected >= ${minCount}. Aborting overwrite of ${destPath}`);
    }
  }

  // Optional Schema Validation for Catalog JSON files
  let validationResult = null;
  const isCatalogJson = destPath.endsWith('_Catalog.json') || options.validateSchema;
  if (isCatalogJson && data.entries) {
    try {
      const { validateCatalogData } = require('./data_validator.js');
      validationResult = validateCatalogData(data, { strictMode: options.strictMode !== false });
      if (!validationResult.isValid && options.rejectInvalid !== false) {
        throw new Error(`safeWriteJsonAtomic aborted: Schema integrity validation failed with ${validationResult.errors.length} error(s):\n  - ${validationResult.errors.join('\n  - ')}`);
      }
    } catch (valErr) {
      if (valErr.message.includes('safeWriteJsonAtomic aborted')) {
        throw valErr;
      }
      console.warn(`Warning: Could not run schema validator during safeWriteJsonAtomic for ${destPath}: ${valErr.message}`);
    }
  }

  const jsonString = JSON.stringify(data, null, 2);
  const trimmedJson = jsonString ? jsonString.trim() : '';
  if (!jsonString || (jsonString.length < 10 && trimmedJson !== '{}' && trimmedJson !== '[]')) {
    throw new Error(`safeWriteJsonAtomic aborted: generated JSON string is suspiciously small (${jsonString?.length || 0} bytes) for ${destPath}`);
  }

  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Backup existing file if present
  let backupCreated = false;
  if (fs.existsSync(destPath)) {
    try {
      const bakPath = `${destPath}.bak`;
      fs.copyFileSync(destPath, bakPath);
      backupCreated = true;
    } catch (bakErr) {
      console.warn(`Warning: Could not create backup file for ${destPath}: ${bakErr.message}`);
    }
  }

  // Write to temporary buffer file first
  const tmpPath = `${destPath}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, jsonString, 'utf-8');

  // Verify temporary file reads back cleanly
  try {
    const verifyRead = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    if (!verifyRead || typeof verifyRead !== 'object') {
      throw new Error('Temporary file verification failed');
    }
  } catch (verifyErr) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    throw new Error(`safeWriteJsonAtomic verification failed for ${tmpPath}: ${verifyErr.message}`);
  }

  // Atomic move: .tmp → final destination
  moveFile(tmpPath, destPath);

  // Verify final file is valid JSON, then clean up .bak
  const bakPath = `${destPath}.bak`;
  try {
    const finalRead = JSON.parse(fs.readFileSync(destPath, 'utf-8'));
    if (!finalRead || typeof finalRead !== 'object') throw new Error('Final file is not a valid object');
    // .bak verified no longer needed — clean it up
    if (backupCreated && fs.existsSync(bakPath)) {
      fs.unlinkSync(bakPath);
    }
  } catch (finalVerifyErr) {
    console.error(`[ERROR] [FS_COMPAT] Final verification failed for ${destPath} — restoring from .bak: ${finalVerifyErr.message}`);
    if (backupCreated && fs.existsSync(bakPath)) {
      fs.copyFileSync(bakPath, destPath);
      console.warn(`[WARN] [FS_COMPAT] Restored ${destPath} from backup`);
    }
    throw new Error(`safeWriteJsonAtomic: final verification failed, reverted from backup: ${finalVerifyErr.message}`);
  }

  return { success: true, backupCreated, validation: validationResult };
}

/**
 * Recursively copy directory contents from srcDir to destDir.
 * @param {string} srcDir 
 * @param {string} destDir 
 */
function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Promote an isolated staging directory to live workspace output path.
 * Prepare a complete sibling snapshot, then swap directories. Never merge a
 * partial capture into the active directory. Retain the prior snapshot/journal
 * for recovery; Windows has a short gap between the two rename operations.
 * @param {string} stagingDir Path to temporary staging folder
 * @param {string} liveTargetDir Destination live workspace path
 * @returns {object} { success: boolean, liveTargetDir: string }
 */
function mergeDirRecursive(sourceDir, destDir) {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name);
    const dstPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      mergeDirRecursive(srcPath, dstPath);
    } else if (!fs.existsSync(dstPath)) {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function promotionLease(target) {
  const name = 'promotion-' + require('crypto').createHash('sha256').update(target.toLowerCase()).digest('hex').slice(0, 24);
  return require('./workflow_lease.js').acquireWorkflowLease(name, path.join(path.dirname(target), '.promotion-locks'));
}

function recoverPromotionUnderLease(target) {
  const parent = path.dirname(target);
  const prefix = path.join(parent, '.' + path.basename(target) + '.promotion');
  if (fs.existsSync(prefix + '.lock')) throw new Error('Legacy promotion lock requires verified owner recovery.');
  const journalFiles = fs.existsSync(parent) ? fs.readdirSync(parent)
    .filter(name => name.startsWith(path.basename(prefix) + '.') && name.endsWith('.json')) : [];
  const recoveries = [];
  for (const file of journalFiles) {
    const journalPath = path.join(parent, file);
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    const identity = prefix + '.' + journal.transactionId;
    if (!/^[a-z0-9-]+$/i.test(journal.transactionId || '') || path.resolve(journal.target || '') !== target ||
        journalPath !== identity + '.json' || journal.backup !== identity + '.previous' ||
        journal.prepared !== identity + '.next') throw new Error('Invalid promotion journal paths.');
    for (const location of [target, journal.backup, journal.prepared]) {
      if (fs.existsSync(location) && (!fs.lstatSync(location).isDirectory() || fs.lstatSync(location).isSymbolicLink())) throw new Error('Promotion recovery requires real directories.');
    }
    if (['COMMITTED', 'ROLLED_BACK'].includes(journal.status)) continue;
    if (fs.existsSync(journal.backup)) {
      if (fs.existsSync(target)) {
        if (fs.existsSync(journal.prepared)) throw new Error('Ambiguous promotion recovery; preserve all snapshots.');
        fs.renameSync(target, journal.prepared);
      }
      fs.renameSync(journal.backup, target);
    } else if (journal.baselineExisted === false && fs.existsSync(target) && !fs.existsSync(journal.prepared)) {
      fs.renameSync(target, journal.prepared);
    } else if (!fs.existsSync(journal.prepared)) {
      throw new Error('Promotion recovery has no verified prior/prepared snapshot.');
    }
    journal.status = 'ROLLED_BACK';
    journal.recoveryNote = 'Baseline restored; uncommitted snapshot retained';
    safeWriteJsonAtomic(journalPath, journal);
    recoveries.push({ file, action: 'RECOVERED_BASELINE' });
  }
  return { recovered: recoveries.length > 0, recoveries };
}

function recoverUnfinishedPromotion(liveTargetDir) {
  const target = path.resolve(liveTargetDir);
  if (target === path.parse(target).root) throw new Error('Root recovery is forbidden.');
  const release = promotionLease(target);
  try { return recoverPromotionUnderLease(target); } finally { release(); }
}

function promoteStagingDirectory(stagingDir, liveTargetDir) {
  const stage = path.resolve(stagingDir);
  const target = path.resolve(liveTargetDir);
  const within = (parent, child) => { const rel = path.relative(parent, child); return !rel || (!rel.startsWith('..') && !path.isAbsolute(rel)); };
  if (within(stage, target) || within(target, stage) || target === path.parse(target).root) throw new Error('Overlapping or root promotion paths are forbidden.');
  if (!fs.statSync(stage).isDirectory() || fs.lstatSync(stage).isSymbolicLink()) throw new Error('Staging must be a real directory.');
  if (fs.existsSync(target) && (!fs.statSync(target).isDirectory() || fs.lstatSync(target).isSymbolicLink())) throw new Error('Live target must be a real directory.');
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  const prefix = path.join(parent, `.${path.basename(target)}.promotion`);
  const release = promotionLease(target);
  const transactionId = require('crypto').randomUUID();
  const prepared = `${prefix}.${transactionId}.next`;
  const backup = `${prefix}.${transactionId}.previous`;
  const journalPath = `${prefix}.${transactionId}.json`;
  let baselineMoved = false;
  let preparedPublished = false;
  const journal = { transactionId, stage, target, prepared, backup, status: 'PREPARING', baselineExisted: fs.existsSync(target), startedAt: new Date().toISOString() };
  try {
    recoverPromotionUnderLease(target);
    for (const file of fs.readdirSync(parent).filter(name => name.startsWith(path.basename(prefix)) && name.endsWith('.json'))) {
      const previous = JSON.parse(fs.readFileSync(path.join(parent, file), 'utf8'));
      if (!['COMMITTED', 'ROLLED_BACK'].includes(previous.status)) throw new Error(`Unfinished promotion requires recovery: ${file}`);
    }
    safeWriteJsonAtomic(journalPath, journal);
    copyDirRecursive(stage, prepared);
    // Retain historical customer/evidence records without inheriting current
    // raw captures, TSVs, catalog artifacts or NotebookLM payloads.
    // Deep merge so older records are preserved even if staging contains partial history.
    for (const folder of ['history', 'services_history', 'evidence', 'reports']) {
      const prior = path.join(target, folder);
      const next = path.join(prepared, folder);
      if (fs.existsSync(prior)) mergeDirRecursive(prior, next);
    }
    journal.status = 'PREPARED';
    safeWriteJsonAtomic(journalPath, journal);
    if (fs.existsSync(target)) { fs.renameSync(target, backup); baselineMoved = true; }
    journal.status = 'BASELINE_MOVED';
    safeWriteJsonAtomic(journalPath, journal);
    fs.renameSync(prepared, target);
    preparedPublished = true;
    journal.status = 'COMMITTED';
    safeWriteJsonAtomic(journalPath, journal);
    return { success: true, liveTargetDir: target, backupDir: baselineMoved ? backup : null, journalPath };
  } catch (error) {
    if (baselineMoved) {
      if (fs.existsSync(target) && !fs.existsSync(prepared)) fs.renameSync(target, prepared);
      if (!fs.existsSync(target)) fs.renameSync(backup, target);
    } else if (preparedPublished && journal.baselineExisted === false && fs.existsSync(target) && !fs.existsSync(prepared)) {
      fs.renameSync(target, prepared);
    }
    if (fs.existsSync(journalPath)) {
      journal.status = fs.existsSync(prepared) ? 'ROLLED_BACK' : 'RECOVERY_REQUIRED';
      journal.error = error.message;
      safeWriteJsonAtomic(journalPath, journal);
    }
    throw new Error(`Failed to promote staging directory: ${error.message}`);
  } finally {
    release();
  }
}

module.exports = {
  moveFile,
  toForwardSlash,
  cleanStrayPDFs,
  safeWriteJsonAtomic,
  copyDirRecursive,
  mergeDirRecursive,
  promoteStagingDirectory,
  recoverUnfinishedPromotion
};
