'use strict';
/**
 * scripts/lib/system/uri_helper.js — Cross-Platform Clickable File URI Resolver
 *
 * Generates standards-compliant, machine-agnostic file:/// URLs for deliverables,
 * Excel workbooks, and Markdown reports. Enables single-click file opening in modern IDEs,
 * terminals, and markdown viewers across Windows, Linux, and macOS without hardcoding paths.
 */

const path = require('path');

/**
 * Converts a file path into a compliant, clickable file:/// URI machine-agnostically.
 * Works seamlessly across Windows (e.g. file:///C:/path/file.xlsx), macOS, and Linux.
 * Zero hardcoding.
 *
 * @param {string} filePath - Absolute or relative file path
 * @returns {string} Fully qualified, clickable file:/// URI
 */
function toClickableFileUri(filePath) {
  if (!filePath || typeof filePath !== 'string') return '';
  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  if (resolved.startsWith('/')) {
    return `file://${resolved}`;
  }
  return `file:///${resolved}`;
}

/**
 * Opens a file in the operating system's default registered application.
 * Cross-platform (Windows, macOS, Linux), zero hardcoding.
 *
 * @param {string} filePath Target file path
 * @returns {Promise<boolean>} Success boolean
 */
function openInDefaultApp(filePath) {
  if (!filePath) return Promise.resolve(false);
  const resolved = path.resolve(filePath);
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    let cmd;
    if (process.platform === 'win32') {
      // In Windows, Start-Process or Invoke-Item uses the shell association (e.g. Excel)
      cmd = `powershell -NoProfile -Command "Start-Process -FilePath '${resolved.replace(/'/g, "''")}'"`;
    } else if (process.platform === 'darwin') {
      cmd = `open "${resolved}"`;
    } else {
      cmd = `xdg-open "${resolved}"`;
    }

    exec(cmd, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Reveals a file or folder in the operating system's native file manager
 * (File Explorer on Windows, Finder on macOS, file manager on Linux).
 *
 * @param {string} filePath Target file or folder path
 * @returns {Promise<boolean>} Success boolean
 */
function revealInFileManager(filePath) {
  if (!filePath) return Promise.resolve(false);
  const resolved = path.resolve(filePath);
  const { exec } = require('child_process');

  return new Promise((resolve) => {
    let cmd;
    if (process.platform === 'win32') {
      cmd = `explorer.exe /select,"${resolved}"`;
    } else if (process.platform === 'darwin') {
      cmd = `open -R "${resolved}"`;
    } else {
      cmd = `xdg-open "${path.dirname(resolved)}"`;
    }

    exec(cmd, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

module.exports = {
  toClickableFileUri,
  openInDefaultApp,
  revealInFileManager
};
