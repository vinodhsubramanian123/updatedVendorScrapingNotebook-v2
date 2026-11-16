'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { sendCommand, connectWS, sleep, getCdpPort } = require('../lib/scraper/cdp.js');
const { ensureChromeBrowserRunning } = require('../lib/scraper/browser_launcher.js');
const { moveFile } = require('../lib/system/fs_compat.js');

function resolveDocument(input) {
  const url = URL.canParse(input) ? new URL(input) : null;
  const directPdf = url?.protocol === 'https:' && url.hostname === 'www.hpe.com' &&
    url.pathname.startsWith('/psnow/downloadDoc/') && url.pathname.match(/([ac]\d{7,8}[a-z0-9]*)\.pdf$/i);
  const id = directPdf?.[1] || input.replace(/.*\/doc\//, '').split(/[?#]/)[0].replace(/\.pdf$/i, '').trim();
  if (!/^[a-z0-9_-]+$/i.test(id)) throw new Error('INVALID_QUICKSPECS_DOCUMENT_ID');
  return {
    id,
    downloadUrl: directPdf ? url.href : `https://support.hpe.com/hpesc/public/api/document/${id}`,
    browserUrl: directPdf ? url.href : `https://www.hpe.com/psnow/doc/${id}`,
    directPdf: Boolean(directPdf)
  };
}

function isValidPdf(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 100000) return false;
  const fd = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(5);
    fs.readSync(fd, header, 0, header.length, 0);
    return header.toString('latin1') === '%PDF-';
  } finally {
    fs.closeSync(fd);
  }
}

async function downloadViaHttps(url, filePath) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HPE document endpoint returned HTTP ${response.status}`);
  fs.writeFileSync(filePath, Buffer.from(await response.arrayBuffer()));
  if (!isValidPdf(filePath)) throw new Error('HPE document endpoint did not return a complete PDF');
  return filePath;
}

const PSNOW_DOWNLOAD_EXPRESSION = `(() => {
  const button = document.querySelector('#downloadButton, #downloadPdfLink, a[href*="downloadDoc"], a.download-button');
  if (!button) return false;
  if (button.href) window.location.href = button.href;
  else button.click();
  return true;
})()`;

async function waitForPdf(downloadDir) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const file = fs.readdirSync(downloadDir).find(name => name.toLowerCase().endsWith('.pdf') && isValidPdf(path.join(downloadDir, name)));
    if (file) return path.join(downloadDir, file);
    await sleep(1000);
  }
  throw new Error('No complete QuickSpecs PDF appeared within 30 seconds');
}

async function downloadViaIsolatedTab(document, downloadDir) {
  const launch = await ensureChromeBrowserRunning(getCdpPort(), 'about:blank', { headless: true, autoSelectFreePort: true });
  if (!launch?.ok) throw new Error(launch?.error || 'Chrome CDP is unavailable for the document download');
  const endpoint = await fetch(`http://localhost:${launch.port}/json/version`, { signal: AbortSignal.timeout(5000) });
  if (!endpoint.ok) throw new Error(`Chrome discovery returned HTTP ${endpoint.status}`);
  const { webSocketDebuggerUrl } = await endpoint.json();
  const browser = await connectWS(webSocketDebuggerUrl);
  let browserContextId;
  let tab;
  try {
    ({ browserContextId } = await sendCommand(browser, 'Target.createBrowserContext', { disposeOnDetach: true }));
    await sendCommand(browser, 'Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir, browserContextId });
    const { targetId } = await sendCommand(browser, 'Target.createTarget', { url: 'about:blank', background: true, browserContextId });
    tab = await connectWS(`ws://localhost:${launch.port}/devtools/page/${targetId}`);
    await sendCommand(tab, 'Page.navigate', { url: document.browserUrl });
    if (!document.directPdf) {
      await sleep(10000);
      await sendCommand(tab, 'Runtime.evaluate', { expression: PSNOW_DOWNLOAD_EXPRESSION, returnByValue: true });
    }
    return await waitForPdf(downloadDir);
  } finally {
    tab?.close();
    try {
      if (browserContextId) await sendCommand(browser, 'Target.disposeBrowserContext', { browserContextId }, 5000);
    } finally {
      browser.close();
    }
  }
}

async function downloadQuickSpecs(input, destination, { force = false } = {}) {
  const document = resolveDocument(input);
  const destPath = path.resolve(destination);
  if (!force && isValidPdf(destPath)) return { method: 'cache', destPath };

  const parent = path.dirname(destPath);
  fs.mkdirSync(parent, { recursive: true });
  const downloadDir = fs.mkdtempSync(path.join(parent, '.quickspecs-'));
  try {
    let downloaded;
    let method = 'HTTPS';
    try {
      downloaded = await downloadViaHttps(document.downloadUrl, path.join(downloadDir, 'quickspecs.part'));
    } catch (err) {
      console.warn(`QuickSpecs HTTPS download unavailable: ${err.message}. Using a separate Chrome context.`);
      downloaded = await downloadViaIsolatedTab(document, downloadDir);
      method = 'isolated Chrome tab';
    }
    moveFile(downloaded, destPath);
    return { method, destPath };
  } finally {
    if (path.dirname(path.resolve(downloadDir)) === parent) {
      fs.rmSync(downloadDir, { recursive: true, force: true });
    }
  }
}

async function main(args) {
  const [input, destination] = args;
  if (!input || !destination) {
    throw new Error('Usage: node scripts/scrapers/download_quickspecs_pdf.js <docId_or_url> <destination> [--force]');
  }
  const { method, destPath } = await downloadQuickSpecs(input, destination, { force: args.includes('--force') });
  const md5 = crypto.createHash('md5').update(fs.readFileSync(destPath)).digest('hex');
  console.log(`QuickSpecs PDF via ${method}: ${destPath}\nMD5: ${md5}`);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(err => {
    console.error('Error during QuickSpecs download:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { downloadQuickSpecs };
