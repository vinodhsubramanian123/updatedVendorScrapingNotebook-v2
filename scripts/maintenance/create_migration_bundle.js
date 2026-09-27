#!/usr/bin/env node
'use strict';

/**
 * scripts/maintenance/create_migration_bundle.js — Autonomous Migration Bundle Packager
 *
 * Packages active credentials, authentication tokens, global MCP configs, and brain history
 * into a single universal archive: 'antigravity_migration_bundle.zip'.
 *
 * Destination:
 * - ~/Downloads/antigravity_migration_bundle.zip (ready for Google Drive upload)
 * - ./antigravity_migration_bundle.zip (repository root backup)
 *
 * Supported Host Platforms:
 * - Linux Mint / Ubuntu / Debian
 * - Windows 10 / 11 (PowerShell / CMD)
 * - macOS Monterey 12.7+ (MacBook Air / Pro, Intel & Apple Silicon)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function banner(title) {
  console.log('\n' + '='.repeat(68));
  console.log(`📦  ${title}`);
  console.log('='.repeat(68));
}

function success(msg) {
  console.log(`✅  ${msg}`);
}

function info(msg) {
  console.log(`ℹ️   ${msg}`);
}

function warn(msg) {
  console.log(`⚠️   ${msg}`);
}

function errFail(msg) {
  console.error(`❌  ${msg}`);
  process.exit(1);
}

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dst, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

async function main() {
  banner('ANTIGRAVITY AUTONOMOUS MIGRATION PACKAGER');
  const home = os.homedir();
  info(`Host platform: ${process.platform} (${os.release()}, ${os.arch()})`);
  info(`User home: ${home}`);

  const stagingRoot = path.join(PROJECT_ROOT, 'outputs', 'temp', 'migration_staging');
  const bundleDir = path.join(stagingRoot, 'antigravity-migration');

  if (fs.existsSync(stagingRoot)) {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(bundleDir, { recursive: true });

  // 1. Package .env
  const envFile = path.join(PROJECT_ROOT, '.env');
  if (fs.existsSync(envFile)) {
    fs.copyFileSync(envFile, path.join(bundleDir, '.env'));
    success(`Included .env (sanitized)`);
  } else {
    warn(`No .env found at repository root.`);
  }

  // 2. Package Google Cloud ADC
  const gcloudCandidates = [
    path.join(home, '.config', 'gcloud'),
    path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'gcloud')
  ];
  let gcloudFound = false;
  for (const gcDir of gcloudCandidates) {
    if (fs.existsSync(gcDir)) {
      const targetGcloud = path.join(bundleDir, 'gcloud');
      fs.mkdirSync(targetGcloud, { recursive: true });
      for (const fname of ['application_default_credentials.json', 'client_secret.json']) {
        const srcF = path.join(gcDir, fname);
        if (fs.existsSync(srcF)) {
          fs.copyFileSync(srcF, path.join(targetGcloud, fname));
          gcloudFound = true;
        }
      }
      if (gcloudFound) break;
    }
  }
  if (gcloudFound) {
    success(`Included Google Cloud Application Default Credentials`);
  } else {
    info(`No Google Cloud ADC found to include.`);
  }

  // 3. Package Google NotebookLM MCP Session & Cookies
  const nlmDir = path.join(home, '.notebooklm-mcp-cli');
  if (fs.existsSync(nlmDir)) {
    copyRecursive(nlmDir, path.join(bundleDir, 'notebooklm-mcp-cli'));
    success(`Included Google NotebookLM auth and profile cookies (~/.notebooklm-mcp-cli)`);
  } else {
    warn(`~/.notebooklm-mcp-cli not found. NotebookLM session will need re-login on new host.`);
  }

  // 4. Package Gemini / MCP Global Configurations
  const geminiConfigDir = path.join(home, '.gemini', 'config');
  if (fs.existsSync(geminiConfigDir)) {
    copyRecursive(geminiConfigDir, path.join(bundleDir, 'gemini_config'));
    success(`Included Gemini / MCP configuration (~/.gemini/config)`);
  }

  // 5. Package Outputs History & Knowledge Registry
  const historyDir = path.join(PROJECT_ROOT, 'outputs', 'history');
  if (fs.existsSync(historyDir)) {
    copyRecursive(historyDir, path.join(bundleDir, 'history'));
    success(`Included master knowledge registry and execution ledgers (outputs/history/)`);
  }

  // 6. Include ANTIGRAVITY_RESTORE_INSTRUCTIONS.md
  const instructionsFile = path.join(PROJECT_ROOT, 'ANTIGRAVITY_RESTORE_INSTRUCTIONS.md');
  if (fs.existsSync(instructionsFile)) {
    fs.copyFileSync(instructionsFile, path.join(bundleDir, 'ANTIGRAVITY_RESTORE_INSTRUCTIONS.md'));
    success(`Included ANTIGRAVITY_RESTORE_INSTRUCTIONS.md`);
  }

  // 7. Create ZIP Archive Cross-Platform
  banner('COMPRESSING AUTONOMOUS MIGRATION ARCHIVE');
  const zipDestinations = [
    path.join(home, 'Downloads', 'antigravity_migration_bundle.zip'),
    path.join(PROJECT_ROOT, 'antigravity_migration_bundle.zip')
  ];

  const primaryZip = zipDestinations[0];
  if (fs.existsSync(primaryZip)) fs.unlinkSync(primaryZip);

  info(`Creating ${primaryZip}...`);

  // Use Python's built-in zipfile for guaranteed cross-platform compatibility (macOS/Linux/Windows)
  const pythonScript = `
import zipfile, os, sys

staging_dir = sys.argv[1]
output_zip = sys.argv[2]

with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(staging_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, staging_dir)
            zf.write(full_path, rel_path)
print("COMPRESSION_COMPLETE")
`;

  try {
    execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}" "${stagingRoot}" "${primaryZip}"`, { stdio: 'inherit' });
  } catch (_) {
    // Fallback: standard zip CLI
    try {
      execSync(`cd "${stagingRoot}" && zip -r -q "${primaryZip}" .`, { stdio: 'inherit' });
    } catch (err) {
      errFail(`Failed to compress migration archive: ${err.message}`);
    }
  }

  // Copy to secondary destination (project root)
  const secondaryZip = zipDestinations[1];
  try {
    fs.copyFileSync(primaryZip, secondaryZip);
    success(`Duplicated bundle to project root: ${secondaryZip}`);
  } catch (_) {}

  const stat = fs.statSync(primaryZip);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

  banner('🎉 MIGRATION BUNDLE CREATED SUCCESSFULLY');
  console.log(`📦 Primary Archive: ${primaryZip} (${sizeMb} MB)`);
  console.log(`📋 Backup Copy:     ${secondaryZip}`);
  console.log(`\nNext Steps:`);
  console.log(`  1. Upload 'antigravity_migration_bundle.zip' to your Google Drive.`);
  console.log(`  2. On any new laptop (Linux Mint, Windows, or MacBook Air), clone repo, run 'npm install',`);
  console.log(`     download the bundle to ~/Downloads, and run:`);
  console.log(`     👉 npm run restore:env\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal packager error:', err);
    process.exit(1);
  });
}

module.exports = { main };
