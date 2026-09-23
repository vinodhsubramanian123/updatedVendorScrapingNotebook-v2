'use strict';
/** Portable links for saved reports; native file URLs for local launchers. */
const path = require('path');
const { execFile } = require('child_process');

const isWindowsPath = value => /^[a-z]:[\\/]/i.test(value) || /^\\\\/.test(value);
const encodePath = value => value.split('/').map(segment => encodeURIComponent(segment).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase())).join('/');
function absolutePath(value) {
  if (isWindowsPath(value)) return path.win32.normalize(value);
  if (value.startsWith('/')) return path.posix.normalize(value);
  return path.resolve(value);
}

/** Encode spaces, Unicode and URI/Markdown delimiters, including foreign OS paths. */
function toClickableFileUri(filePath) {
  if (!filePath || typeof filePath !== 'string') return '';
  if (/^file:/i.test(filePath)) return new URL(filePath).href;
  const resolved = absolutePath(filePath).replace(/\\/g, '/');
  if (resolved.startsWith('//')) {
    const [host, ...parts] = resolved.slice(2).split('/');
    return new URL(`file://${host}/${encodePath(parts.join('/'))}`).href;
  }
  if (/^[a-z]:\//i.test(resolved)) return `file:///${resolved.slice(0, 2)}/${encodePath(resolved.slice(3))}`;
  return `file://${encodePath(resolved)}`;
}

/** Saved Markdown uses report-relative links so a moved checkout remains usable.
 * Cross-drive/share targets necessarily fall back to an encoded local file URL.
 */
function toReportLink(filePath, reportPath) {
  const target = absolutePath(filePath);
  const report = absolutePath(reportPath);
  if (isWindowsPath(target) !== isWindowsPath(report)) return toClickableFileUri(target);
  const paths = isWindowsPath(target) ? path.win32 : path.posix;
  const relative = paths.relative(paths.dirname(report), target);
  if (paths.isAbsolute(relative)) return toClickableFileUri(target);
  return encodePath(relative.replace(/\\/g, '/'));
}

function launch(command, args) {
  return new Promise(resolve => execFile(command, args, { windowsHide: true }, error => resolve(!error)));
}

function openInDefaultApp(filePath) {
  if (!filePath) return Promise.resolve(false);
  const resolved = path.resolve(filePath);
  if (process.platform === 'win32') {
    return launch('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'; Invoke-Item -LiteralPath '${resolved.replace(/'/g, "''")}'`]);
  }
  return launch(process.platform === 'darwin' ? 'open' : 'xdg-open', [resolved]);
}

function revealInFileManager(filePath) {
  if (!filePath) return Promise.resolve(false);
  const resolved = path.resolve(filePath);
  if (process.platform === 'win32') return launch('explorer.exe', [`/select,${resolved}`]);
  if (process.platform === 'darwin') return launch('open', ['-R', resolved]);
  return launch('xdg-open', [path.dirname(resolved)]);
}

module.exports = { toClickableFileUri, toReportLink, openInDefaultApp, revealInFileManager };
