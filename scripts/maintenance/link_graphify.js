'use strict';
/**
 * scripts/maintenance/link_graphify.js — Cross-Platform Graphify AST Graph Linker
 *
 * Ensures that the project's semantic AST knowledge graph (graphify-out/) is seamlessly
 * accessible to the graphify MCP server across all host platforms (macOS, Linux Mint/Debian, Windows),
 * eliminating the "graph.json not found" error regardless of where the MCP server daemon launches from.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function linkGraphify() {
  const projectGraphOut = path.join(PROJECT_ROOT, 'graphify-out');
  if (!fs.existsSync(projectGraphOut)) {
    return;
  }

  const home = os.homedir();
  const platform = process.platform;
  const isWin = platform === 'win32';
  const isMac = platform === 'darwin';

  const candidates = [];

  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const progFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    candidates.push(
      path.join(localAppData, 'Programs', 'antigravity'),
      path.join(progFiles, 'antigravity')
    );
  } else if (isMac) {
    candidates.push(
      '/Applications/Antigravity.app/Contents/MacOS',
      '/Applications/Antigravity.app/Contents/Resources',
      path.join(home, 'Applications', 'Antigravity.app'),
      path.join(home, 'Library', 'Application Support', 'Antigravity')
    );
  } else {
    // Linux Mint / Ubuntu / Debian
    candidates.push(
      path.join(home, '.local', 'share', 'antigravity'),
      '/opt/antigravity',
      path.join(home, '.antigravity')
    );
  }

  for (const appDir of candidates) {
    if (!fs.existsSync(appDir)) continue;

    const linkPath = path.join(appDir, 'graphify-out');
    try {
      if (fs.existsSync(linkPath)) {
        // Link or directory already exists
        continue;
      }
      fs.symlinkSync(projectGraphOut, linkPath, isWin ? 'junction' : 'dir');
      console.log(`🔗 Linked graphify-out to ${linkPath} for zero-config MCP access.`);
    } catch (err) {
      // Non-fatal, do not break workflows if permissions prevent linking
      console.warn(`[WARN] Could not link graphify-out to ${linkPath}: ${err.message}`);
    }
  }
}

if (require.main === module) {
  linkGraphify();
}

module.exports = { linkGraphify };
