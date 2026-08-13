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
    if (err.code === 'EXDEV') {
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
    } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'fs_compat.js', e); }
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
      const { validateCatalogData } = require('./data_validator');
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
    const logger = require('./pipeline_logger');
    logger.error('FS_COMPAT', `Final verification failed for ${destPath} — restoring from .bak`, finalVerifyErr);
    if (backupCreated && fs.existsSync(bakPath)) {
      fs.copyFileSync(bakPath, destPath);
      logger.warn('FS_COMPAT', `Restored ${destPath} from backup`);
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
 * Creates a temporary backup of liveTargetDir and restores it if promotion fails.
 * Cleans up backup directory on success.
 * @param {string} stagingDir Path to temporary staging folder
 * @param {string} liveTargetDir Destination live workspace path
 * @returns {object} { success: boolean, liveTargetDir: string }
 */
function promoteStagingDirectory(stagingDir, liveTargetDir) {
  const logger = require('./pipeline_logger');
  if (!fs.existsSync(stagingDir)) {
    throw new Error(`Staging directory does not exist: ${stagingDir}`);
  }
  const backupDir = `${liveTargetDir}_promotion_bak_${Date.now()}`;
  let backupCreated = false;

  if (fs.existsSync(liveTargetDir)) {
    try {
      copyDirRecursive(liveTargetDir, backupDir);
      backupCreated = true;
      logger.info('FS_COMPAT', `Live workspace backed up to: ${path.basename(backupDir)}`);
    } catch (err) {
      logger.warn('FS_COMPAT', `Could not back up live target ${liveTargetDir}: ${err.message}`);
    }
  }

  try {
    copyDirRecursive(stagingDir, liveTargetDir);
    if (backupCreated && fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
      logger.info('FS_COMPAT', `Promotion backup cleaned up — live workspace promoted successfully: ${path.basename(liveTargetDir)}`);
    }
    return { success: true, liveTargetDir };
  } catch (err) {
    if (backupCreated && fs.existsSync(backupDir)) {
      logger.warn('FS_COMPAT', `Promotion failed — restoring live workspace from backup: ${liveTargetDir}`);
      fs.rmSync(liveTargetDir, { recursive: true, force: true });
      copyDirRecursive(backupDir, liveTargetDir);
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    throw new Error(`Failed to promote staging directory to live workspace: ${err.message}`);
  }
}

module.exports = { moveFile, toForwardSlash, cleanStrayPDFs, safeWriteJsonAtomic, copyDirRecursive, promoteStagingDirectory };
