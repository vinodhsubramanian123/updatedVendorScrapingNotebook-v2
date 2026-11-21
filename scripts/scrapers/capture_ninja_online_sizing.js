'use strict';
/**
 * scripts/scrapers/capture_ninja_online_sizing.js
 *
 * Captures authoritative sizing catalogs, physical/power/performance envelopes,
 * QuickSpecs references, and sample OCA JSON exports from authenticated
 * HPE Ninja Online (https://ninjaonline.ext.hpe.com/) over Chrome CDP.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { sendCommand, connectWS, sleep, getCdpPort } = require('../lib/scraper/cdp.js');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');

const ROOT = path.resolve(__dirname, '../..');
const B10K_RAW_DIR = path.join(ROOT, 'outputs/Alletra/Storage/Alletra_MP_B10000/raw_data');
const X10K_RAW_DIR = path.join(ROOT, 'outputs/Alletra/Storage/Alletra_MP_X10000/raw_data');

function sha256Of(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return crypto.createHash('sha256').update(str).digest('hex');
}

function listCdpPages(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body).filter((t) => t.type === 'page'));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function openOrFindNinjaTarget(targetUrl) {
  const port = getCdpPort();
  const pages = await listCdpPages(port);
  let target = pages.find((p) => (p.url || '').includes('ninjaonline.ext.hpe.com'));
  if (!target) {
    const newUrl = `http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`;
    target = await new Promise((resolve, reject) => {
      http.get(newUrl, (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  }
  const ws = await connectWS(target.webSocketDebuggerUrl);
  await sendCommand(ws, 'Page.enable');
  await sendCommand(ws, 'Runtime.enable');
  return { ws, target };
}

async function evalInPage(ws, expression, timeoutMs = 45000) {
  const res = await sendCommand(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, timeoutMs);
  return res?.result?.value;
}

async function navigateAndSettle(ws, url, waitMs = 6000) {
  const currentUrl = await evalInPage(ws, 'location.href');
  if (!currentUrl || currentUrl !== url) {
    await sendCommand(ws, 'Page.navigate', { url });
    await sleep(waitMs);
  }
  const settled = await evalInPage(ws, '({ url: location.href, title: document.title })');
  if ((settled?.url || '').includes('auth.hpe.com') || (settled?.url || '').includes('login')) {
    throw new Error(`Ninja Online session requires login (redirected to ${settled.url}).`);
  }
  return settled;
}

function summarizeMspEnvelopes(msp) {
  if (!msp || typeof msp !== 'object') return null;
  const summary = {};
  for (const [section, items] of Object.entries(msp)) {
    if (!Array.isArray(items)) {
      summary[section] = items;
      continue;
    }
    const models = [...new Set(items.map((x) => x.model).filter(Boolean))];
    const protocols = [...new Set(items.map((x) => x.protocol).filter(Boolean))];
    const workloads = [...new Set(items.map((x) => x.fileWorkload || x.workload).filter(Boolean))];
    summary[section] = {
      count: items.length,
      models,
      protocols,
      workloads: workloads.slice(0, 30),
      sample: items.slice(0, 3)
    };
  }
  return summary;
}

async function fetchB10kSizerCatalog(ws) {
  const raw = await evalInPage(ws, `(async () => {
    const tok = JSON.parse(localStorage.getItem('okta-token-storage') || '{}');
    const accessToken = tok?.accessToken?.accessToken || '';
    if (!accessToken) return { error: 'NO_OKTA_TOKEN' };
    const hdr = { Authorization: 'Bearer ' + accessToken };
    const arcRes = await fetch('https://b10k-api.sizer-app.com/api/v1/arcus', { headers: hdr });
    const mspRes = await fetch('https://b10k-api.sizer-app.com/api/v1/Arcus/MSP', { headers: hdr });
    return {
      arcStatus: arcRes.status,
      arcB64: arcRes.ok ? (await arcRes.text()).trim() : null,
      mspStatus: mspRes.status,
      mspB64: mspRes.ok ? (await mspRes.text()).trim() : null
    };
  })()`, 60000);

  if (raw?.error) throw new Error(`Ninja B10000 token error: ${raw.error}`);
  if (raw?.arcStatus !== 200 || !raw.arcB64) {
    throw new Error(`Ninja B10000 catalog API failed (HTTP ${raw?.arcStatus})`);
  }
  const arcusCatalog = JSON.parse(Buffer.from(raw.arcB64, 'base64').toString('utf8'));
  const mspFull = raw.mspStatus === 200 && raw.mspB64
    ? JSON.parse(Buffer.from(raw.mspB64, 'base64').toString('utf8'))
    : null;
  return { arcusCatalog, mspSummary: summarizeMspEnvelopes(mspFull) };
}

async function installDownloadInterceptor(ws) {
  await evalInPage(ws, `(() => {
    if (window.__ninjaDownloadHooked) { window.__ninjaCapturedDownloads = []; return true; }
    window.__ninjaDownloadHooked = true;
    window.__ninjaCapturedDownloads = [];
    const origCreate = URL.createObjectURL.bind(URL);
    const blobs = new Map();
    URL.createObjectURL = function(obj) {
      const url = origCreate(obj);
      if (obj instanceof Blob) {
        obj.text().then((txt) => {
          blobs.set(url, { text: txt, type: obj.type, size: obj.size });
          window.__ninjaCapturedDownloads.push({ filename: 'blob', url, type: obj.type, size: obj.size, text: txt });
        }).catch(() => {});
      }
      return url;
    };
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
      const meta = blobs.get(this.href);
      if (meta || this.download) {
        window.__ninjaCapturedDownloads.push({
          filename: this.download || 'download',
          href: this.href,
          text: meta?.text || null,
          type: meta?.type || null
        });
      }
      return origClick.apply(this, arguments);
    };
    return true;
  })()`);
}

async function collectCapturedOcaJson(ws) {
  const downloads = await evalInPage(ws, '(window.__ninjaCapturedDownloads || []).filter(d => d.text)');
  if (!Array.isArray(downloads)) return null;
  for (let i = downloads.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(downloads[i].text);
      return { filename: downloads[i].filename, payload: parsed };
    } catch (_) {}
  }
  return null;
}

async function captureB10kOcaExportAndHelp(ws) {
  await installDownloadInterceptor(ws);
  const helpDocs = await evalInPage(ws, `(async () => {
    const resume = [...document.querySelectorAll('button')].find(b => /Resume sizing/i.test(b.innerText));
    if (resume) { resume.click(); await new Promise(r => setTimeout(r, 1200)); }
    const emptyCreate = [...document.querySelectorAll('button')].find(b => /Create a new configuration/i.test(b.innerText));
    if (emptyCreate) {
      const cb = document.querySelector('input[type="checkbox"][aria-label="select 1"]');
      if (cb && !cb.checked) cb.click();
      await new Promise(r => setTimeout(r, 300));
      const sub = [...document.querySelectorAll('button')].find(b => /Create configuration/i.test(b.innerText));
      if (sub && !sub.disabled) sub.click();
      await new Promise(r => setTimeout(r, 2500));
    }
    const helpBtn = document.querySelector('button[aria-label="Help and resources"]');
    let docs = [];
    if (helpBtn) {
      helpBtn.click();
      await new Promise(r => setTimeout(r, 400));
      docs = [...document.querySelectorAll('a[href]')].map(a => ({ title: a.innerText.trim(), url: a.href }));
      helpBtn.click();
    }
    const bomTab = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'BOM');
    if (bomTab) { bomTab.click(); await new Promise(r => setTimeout(r, 1000)); }
    const openExport = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Export BOM');
    if (openExport) {
      openExport.click();
      await new Promise(r => setTimeout(r, 500));
      const ocaOption = [...document.querySelectorAll('label, button, div, span')].find(el => el.children.length <= 2 && /^OCA file$/i.test((el.innerText || '').trim()));
      if (ocaOption) ocaOption.click();
      await new Promise(r => setTimeout(r, 300));
      const confirmBtn = [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === 'Export BOM').pop();
      if (confirmBtn) confirmBtn.click();
      await new Promise(r => setTimeout(r, 1200));
    }
    return docs;
  })()`);
  const ocaExport = await collectCapturedOcaJson(ws);
  return { helpDocs: Array.isArray(helpDocs) ? helpDocs : [], ocaExport };
}

function summarizeArcusCatalog(arcus) {
  const counts = {};
  for (const [k, v] of Object.entries(arcus || {})) {
    counts[k] = Array.isArray(v) ? v.length : (v ? 1 : 0);
  }
  const uniqueSkus = new Set();
  for (const val of Object.values(arcus || {})) {
    if (!Array.isArray(val)) continue;
    for (const row of val) {
      if (row?.partNumber) uniqueSkus.add(row.partNumber);
    }
  }
  return { sectionCounts: counts, uniquePartNumbers: uniqueSkus.size };
}

async function captureB10000(ws) {
  console.log('\n--- Capturing HPE Ninja Online Block Storage Sizer (Alletra MP B10000) ---');
  await navigateAndSettle(ws, 'https://ninjaonline.ext.hpe.com/storage-sizer', 5000);
  const { arcusCatalog, mspSummary } = await fetchB10kSizerCatalog(ws);
  const { helpDocs, ocaExport } = await captureB10kOcaExportAndHelp(ws);
  const summary = summarizeArcusCatalog(arcusCatalog);
  const outDoc = {
    schemaVersion: '1.0.0',
    source: 'HPE_NINJA_ONLINE_SIZER',
    evidenceTier: 'VENDOR_SIZER_TELEMETRY',
    product: 'Alletra_MP_B10000',
    sizerUrl: 'https://ninjaonline.ext.hpe.com/storage-sizer',
    endpoints: [
      'https://b10k-api.sizer-app.com/api/v1/arcus',
      'https://b10k-api.sizer-app.com/api/v1/Arcus/MSP'
    ],
    capturedAt: new Date().toISOString(),
    helpDocs,
    summary,
    catalog: arcusCatalog,
    mspWorkloadEnvelopes: mspSummary
  };
  outDoc.sha256 = sha256Of(outDoc.catalog);
  safeWriteJsonAtomic(path.join(B10K_RAW_DIR, 'ninja_online_sizing_catalog.json'), outDoc);
  if (ocaExport?.payload) {
    safeWriteJsonAtomic(path.join(B10K_RAW_DIR, 'ninja_oca_export_sample.json'), {
      source: 'HPE_NINJA_ONLINE_SIZER_OCA_EXPORT',
      capturedAt: new Date().toISOString(),
      filename: ocaExport.filename,
      exportPayload: ocaExport.payload
    });
    console.log(`   Saved B10000 OCA export sample (${ocaExport.filename})`);
  }
  console.log(`   Saved B10000 Ninja catalog (${summary.uniquePartNumbers} part numbers, sha256=${outDoc.sha256.slice(0, 12)})`);
  return outDoc;
}

function parseX10kDriveMap(chunkText) {
  const drives = [];
  const re = /\["([^"]+)",\{partNumber:"([A-Z0-9-]+)",description:"([^"]+)"\}\]/g;
  let m;
  while ((m = re.exec(chunkText)) !== null) {
    if (/(?:TB|GB|SSD|NVMe)/i.test(m[1] + ' ' + m[3])) {
      drives.push({ key: m[1], partNumber: m[2], description: m[3] });
    }
  }
  return drives;
}

function parseX10kSkuRecords(chunkText) {
  const records = new Map();
  const re = /partNumber:"([A-Z0-9-]+)",description:"([^"]+)"/g;
  let m;
  while ((m = re.exec(chunkText)) !== null) {
    if (!records.has(m[1])) {
      records.set(m[1], { partNumber: m[1], description: m[2] });
    }
  }
  return [...records.values()];
}

async function fetchX10kBundleAndPerfGrids(ws) {
  return evalInPage(ws, `(async () => {
    const tok = JSON.parse(localStorage.getItem('okta-token-storage') || '{}');
    const accessToken = tok?.accessToken?.accessToken || '';
    const hdr = accessToken ? { Authorization: 'Bearer ' + accessToken } : {};
    const mf = await (await fetch('https://dk5w42dl187qw.cloudfront.net/mf-manifest.json')).json();
    const assets = [...(mf.exposes?.[0]?.assets?.js?.sync || []), ...(mf.exposes?.[0]?.assets?.js?.async || [])];
    const chunkTexts = {};
    for (const name of assets) {
      const txt = await (await fetch('https://dk5w42dl187qw.cloudfront.net/' + name)).text();
      if (/partNumber:\\s*"/.test(txt)) chunkTexts[name] = txt;
    }
    const grids = {};
    for (const driveType of ['TLC', 'QLC']) {
      const url = 'https://x10k-api.sizer-app.com/api/Homefleet/performance/grid?numHBAperNode=1&numPortsPerHBA=2&frontEnd=100+Gbit&driveType=' + driveType + '&workloadType=Object&keys=64K%7CPUT%7C1,1M%7CPUT%7C1';
      try {
        const res = await fetch(url, { headers: hdr });
        grids[driveType] = res.ok ? await res.json() : { status: res.status };
      } catch (e) { grids[driveType] = { error: e.message }; }
    }
    return { chunkTexts, grids };
  })()`, 60000);
}

async function stepX10kWizardAndCaptureExport(ws) {
  await installDownloadInterceptor(ws);
  const ui = await evalInPage(ws, `(async () => {
    const tile = [...document.querySelectorAll('button, [role="button"], div')]
      .filter((e) => e.children.length <= 4 && /Size an X10000 from the data/i.test(e.innerText || ''))
      .pop();
    if (tile) { tile.click(); await new Promise(r => setTimeout(r, 1200)); }
    const nextBtn = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Next');
    if (nextBtn) { nextBtn.click(); await new Promise(r => setTimeout(r, 1800)); }
    const createBtn = [...document.querySelectorAll('button')].find(b => /Create configuration/i.test(b.innerText));
    if (createBtn && !createBtn.disabled) { createBtn.click(); await new Promise(r => setTimeout(r, 2500)); }
    const helpBtn = document.querySelector('button[aria-label="Help and resources"]');
    let helpDocs = [];
    if (helpBtn) {
      helpBtn.click();
      await new Promise(r => setTimeout(r, 400));
      helpDocs = [...document.querySelectorAll('a[href]')].map(a => ({ title: a.innerText.trim(), url: a.href }));
      helpBtn.click();
    }
    const bomBtn = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'BOM');
    let bomPreview = '';
    if (bomBtn) {
      bomBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      bomPreview = document.body.innerText.slice(0, 1500);
    }
    const expBtn = [...document.querySelectorAll('button')].find(b => /Export BOM/i.test(b.innerText));
    if (expBtn) {
      expBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const ocaOption = [...document.querySelectorAll('label, button, div, span')].find(el => el.children.length <= 2 && /^OCA file$/i.test((el.innerText || '').trim()));
      if (ocaOption) ocaOption.click();
      await new Promise(r => setTimeout(r, 300));
      const confirmBtn = [...document.querySelectorAll('button')].filter(b => /Export BOM/i.test(b.innerText)).pop();
      if (confirmBtn) confirmBtn.click();
      await new Promise(r => setTimeout(r, 1200));
    }
    return { helpDocs, bomPreview, url: location.href };
  })()`);
  const ocaExport = await collectCapturedOcaJson(ws);
  return { helpDocs: ui?.helpDocs || [], bomPreview: ui?.bomPreview || '', ocaExport };
}

async function captureX10000(ws) {
  console.log('\n--- Capturing HPE Ninja Online Unstructured Sizer (Alletra MP X10000) ---');
  await navigateAndSettle(ws, 'https://ninjaonline.ext.hpe.com/unstructured-storage-sizer', 6000);
  const { chunkTexts, grids } = await fetchX10kBundleAndPerfGrids(ws);
  const drives = [];
  const allParts = new Map();
  for (const text of Object.values(chunkTexts || {})) {
    for (const d of parseX10kDriveMap(text)) drives.push(d);
    for (const rec of parseX10kSkuRecords(text)) {
      if (!allParts.has(rec.partNumber)) allParts.set(rec.partNumber, rec);
    }
  }
  const { helpDocs, bomPreview, ocaExport } = await stepX10kWizardAndCaptureExport(ws);
  const catalog = {
    drives,
    skuCatalog: [...allParts.values()],
    performanceGrids: grids || {},
    maxBounds: { nodes: 8, jbofs: 12 }
  };
  const outDoc = {
    schemaVersion: '1.0.0',
    source: 'HPE_NINJA_ONLINE_SIZER',
    evidenceTier: 'VENDOR_SIZER_TELEMETRY',
    product: 'Alletra_MP_X10000',
    sizerUrl: 'https://ninjaonline.ext.hpe.com/unstructured-storage-sizer',
    endpoints: ['https://x10k-api.sizer-app.com/api/Homefleet/performance/grid'],
    capturedAt: new Date().toISOString(),
    helpDocs,
    bomPreview,
    summary: { drivesCount: drives.length, uniquePartNumbers: allParts.size },
    catalog
  };
  outDoc.sha256 = sha256Of(catalog);
  safeWriteJsonAtomic(path.join(X10K_RAW_DIR, 'ninja_online_sizing_catalog.json'), outDoc);
  if (ocaExport?.payload) {
    safeWriteJsonAtomic(path.join(X10K_RAW_DIR, 'ninja_oca_export_sample.json'), {
      source: 'HPE_NINJA_ONLINE_SIZER_OCA_EXPORT',
      capturedAt: new Date().toISOString(),
      filename: ocaExport.filename,
      exportPayload: ocaExport.payload
    });
    console.log(`   Saved X10000 OCA export sample (${ocaExport.filename})`);
  }
  console.log(`   Saved X10000 Ninja catalog (${allParts.size} part numbers, sha256=${outDoc.sha256.slice(0, 12)})`);
  return outDoc;
}

function _buildB10kTopologyRules(cat) {
  const nodes = (cat.nodes || []).filter((n) => n.nodeType === 'Controller' && !n.isTAA && !n.isDHCI);
  const ubers = (cat.uberSKU || []).filter((u) => !u.geo && !u.isDHCI);
  const switchlessNodes = nodes.filter((n) => !n.cluster);
  const switchedNodes = nodes.filter((n) => Boolean(n.cluster));
  const swlessBase = ubers.filter((u) => !u.cluster).map((u) => `${u.partNumber} (${u.descriptionShort || u.description})`).join(', ');
  const swBase = ubers.filter((u) => Boolean(u.cluster)).map((u) => `${u.partNumber} (${u.descriptionShort || u.description})`).join(', ');
  const swlessList = switchlessNodes.map((n) => `${n.model} [${n.partNumber}, ${n.cpuCores}c, JBOF ${n.minJBOF}-${n.maxJBOF}, maxDrives=${n.maxDrives}, maxTotal=${n.maxTotalSystemDrives}]`).join('; ');
  const swList = switchedNodes.map((n) => `${n.model} [${n.partNumber}, ${n.cpuCores}c, JBOF ${n.minJBOF}-${n.maxJBOF}, maxInternalDrives=${n.maxDrives}, maxTotal=${n.maxTotalSystemDrives}]`).join('; ');
  return [
    {
      ruleId: 'NINJA_B10K_SWITCHLESS_B10100_TOPOLOGY',
      parentCategory: 'Chassis',
      subCategory: 'Switchless Topology (B10100)',
      type: 'NINJA_TOPOLOGY_SWITCHLESS',
      source: 'HPE_NINJA_ONLINE_SIZER',
      evidenceTier: 'VENDOR_SIZER_TELEMETRY',
      rule: `Switchless B10100 topology (direct-attached, no backend NVMe-oF switches): uberSKUs ${swlessBase || 'S0B84A / S0U38A'}; controller chassis R7C75A hosts up to 24 internal NVMe SSDs; expansion uses S1J10A JBOF shelves (2x S1R28A). Nodes: ${swlessList}.`,
      ruleText: `Switchless B10100 topology (direct-attached, no backend NVMe-oF switches): uberSKUs ${swlessBase || 'S0B84A / S0U38A'}; controller chassis R7C75A hosts up to 24 internal NVMe SSDs; expansion uses S1J10A JBOF shelves (2x S1R28A). Nodes: ${swlessList}.`
    },
    {
      ruleId: 'NINJA_B10K_SWITCHED_B10200_TOPOLOGY',
      parentCategory: 'Chassis',
      subCategory: 'Switched Topology (B10200)',
      type: 'NINJA_TOPOLOGY_SWITCHED',
      source: 'HPE_NINJA_ONLINE_SIZER',
      evidenceTier: 'VENDOR_SIZER_TELEMETRY',
      rule: `Switched / Clustered B10200 topology (requires backend NVMe-oF switches): uberSKUs ${swBase || 'S1R06A / S1R07A'}; controller chassis R7C75A hosts 0 internal drives (all drives reside in mandatory external JBOFs, 1-8 JBOFs, up to 384 drives). Nodes: ${swList}.`,
      ruleText: `Switched / Clustered B10200 topology (requires backend NVMe-oF switches): uberSKUs ${swBase || 'S1R06A / S1R07A'}; controller chassis R7C75A hosts 0 internal drives (all drives reside in mandatory external JBOFs, 1-8 JBOFs, up to 384 drives). Nodes: ${swList}.`
    },
    {
      ruleId: 'NINJA_B10K_TOPOLOGY_MUTUAL_EXCLUSION',
      parentCategory: 'Storage Controllers',
      subCategory: 'Topology Mutual Exclusion',
      type: 'INTRA_CATEGORY_EXCLUSION',
      source: 'HPE_NINJA_ONLINE_SIZER',
      evidenceTier: 'VENDOR_SIZER_TELEMETRY',
      rule: 'Switchless B10100 controller nodes (S0S38A, S0R21A, S4V66A) and Switched B10200 controller nodes (R7D02A, R7D03A) are mutually exclusive and MUST NOT be mixed in one array. Select Switchless B10100 vs. Switched B10200 based on customer drive scale (>72 drives or multi-node cluster mandates Switched B10200).',
      ruleText: 'Switchless B10100 controller nodes (S0S38A, S0R21A, S4V66A) and Switched B10200 controller nodes (R7D02A, R7D03A) are mutually exclusive and MUST NOT be mixed in one array. Select Switchless B10100 vs. Switched B10200 based on customer drive scale (>72 drives or multi-node cluster mandates Switched B10200).'
    }
  ];
}

function buildB10kSizingRules(ninja) {
  const cat = ninja.catalog || {};
  const rules = [..._buildB10kTopologyRules(cat)];
  const ubers = (cat.uberSKU || []).filter((u) => !u.geo && !u.isUpgrade).map((u) => `${u.partNumber} (${u.descriptionShort || u.description})`);
  if (ubers.length) {
    const txt = `Ninja Online B10000 global base configuration SKUs: ${ubers.join('; ')}.`;
    rules.push({
      ruleId: 'NINJA_B10K_BASE_CONFIGS',
      parentCategory: 'Chassis',
      subCategory: 'Base Configs',
      type: 'NINJA_SIZING_BASELINE',
      source: 'HPE_NINJA_ONLINE_SIZER',
      evidenceTier: 'VENDOR_SIZER_TELEMETRY',
      rule: txt,
      ruleText: txt
    });
  }
  for (const n of (cat.nodes || []).slice(0, 12)) {
    const txt = `B10000 Node ${n.partNumber} (Model ${n.model}, ${n.nodeType}): ${n.cpuCores} cores, ${n.cacheMemoryPerNodeGB} GB cache, maxDrives=${n.maxDrives}, maxTotalSystemDrives=${n.maxTotalSystemDrives}, JBOF range=${n.minJBOF}-${n.maxJBOF}, power max=${n.powerMax_w}W.`;
    rules.push({
      ruleId: `NINJA_B10K_NODE_${n.partNumber}`,
      parentCategory: 'Storage Controllers',
      subCategory: 'Controller Nodes',
      affectedSku: n.partNumber,
      type: 'NINJA_NODE_ENVELOPE',
      source: 'HPE_NINJA_ONLINE_SIZER',
      evidenceTier: 'VENDOR_SIZER_TELEMETRY',
      rule: txt,
      ruleText: txt
    });
  }
  for (const p of cat.powerSupply || []) {
    const txt = `B10000 PSU ${p.partNumber}: ${p.powerMaxWatt}W ${p.currentType} (${p.inputVAC} VAC), ErP Lot9=${Boolean(p.isLot9)}.`;
    rules.push({
      ruleId: `NINJA_B10K_PSU_${p.partNumber}`,
      parentCategory: 'Power Supplies',
      subCategory: 'Power Supplies',
      affectedSku: p.partNumber,
      type: 'NINJA_POWER_ENVELOPE',
      source: 'HPE_NINJA_ONLINE_SIZER',
      evidenceTier: 'VENDOR_SIZER_TELEMETRY',
      rule: txt,
      ruleText: txt
    });
  }
  const handoffTxt = 'Alletra Storage MP B10000 workflow: size controller nodes, switch topology (B10100/B10200), JBOFs, NVMe drives, capacity DRR, performance, and power in HPE Ninja Online, export OCA JSON, import into HPE OCA, then adapt transceivers (SFPs/QSFPs), cabling, support services, and run CLIC validation in OCA.';
  rules.push({
    ruleId: 'NINJA_B10K_OCA_HANDOFF_WORKFLOW',
    parentCategory: 'Chassis',
    subCategory: 'Sizing & Import Workflow',
    type: 'NINJA_OCA_HANDOFF_WORKFLOW',
    source: 'HPE_NINJA_ONLINE_SIZER',
    evidenceTier: 'VENDOR_SIZER_TELEMETRY',
    rule: handoffTxt,
    ruleText: handoffTxt
  });
  return rules;
}

function buildX10kSizingRules(ninja) {
  const cat = ninja.catalog || {};
  const rules = [];
  if (cat.maxBounds) {
    const txt = `Ninja Online X10000 cluster envelope: up to ${cat.maxBounds.nodes} controller nodes and ${cat.maxBounds.jbofs} NVMe JBOF enclosures; drives include TLC and QLC SED SKUs (${(cat.drives || []).length} models).`;
    rules.push({
      ruleId: 'NINJA_X10K_CLUSTER_ENVELOPE',
      parentCategory: 'Drive Enclosures / Drives',
      subCategory: 'Cluster Topology',
      type: 'NINJA_CLUSTER_ENVELOPE',
      source: 'HPE_NINJA_ONLINE_SIZER',
      evidenceTier: 'VENDOR_SIZER_TELEMETRY',
      rule: txt,
      ruleText: txt
    });
  }
  if ((cat.skuCatalog || []).length > 0) {
    const skuList = cat.skuCatalog.slice(0, 20).map((s) => `${s.partNumber}: ${s.description}`).join('; ');
    const txt = `Ninja Online X10000 validated BOM SKU references (${cat.skuCatalog.length} total): ${skuList}.`;
    rules.push({
      ruleId: 'NINJA_X10K_SKU_REFERENCE',
      parentCategory: 'Accessories & Infrastructure',
      subCategory: 'Ninja Online BOM Matrix',
      type: 'NINJA_SIZING_BASELINE',
      source: 'HPE_NINJA_ONLINE_SIZER',
      evidenceTier: 'VENDOR_SIZER_TELEMETRY',
      rule: txt,
      ruleText: txt
    });
  }
  const handoffTxt = 'Alletra Storage MP X10000 workflow: size object/unstructured capacity, TLC/QLC drive tiers, controller nodes, and JBOFs in HPE Ninja Online, export OCA JSON, import into HPE OCA, then adapt transceivers (SFPs/QSFPs), cabling, support services, and run CLIC validation in OCA.';
  rules.push({
    ruleId: 'NINJA_X10K_OCA_HANDOFF_WORKFLOW',
    parentCategory: 'Accessories & Infrastructure',
    subCategory: 'Sizing & Import Workflow',
    type: 'NINJA_OCA_HANDOFF_WORKFLOW',
    source: 'HPE_NINJA_ONLINE_SIZER',
    evidenceTier: 'VENDOR_SIZER_TELEMETRY',
    rule: handoffTxt,
    ruleText: handoffTxt
  });
  return rules;
}

function enrichRulesWithNinjaSizing(productDir, productKey) {
  const rulesFile = path.join(productDir, `${productKey}_Catalog_Rules.json`);
  const ninjaFile = path.join(productDir, 'raw_data', 'ninja_online_sizing_catalog.json');
  if (!fs.existsSync(rulesFile) || !fs.existsSync(ninjaFile)) return { updated: false };
  const rulesJson = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
  const ninja = JSON.parse(fs.readFileSync(ninjaFile, 'utf8'));
  const additions = productKey === 'Alletra_MP_B10000'
    ? buildB10kSizingRules(ninja)
    : buildX10kSizingRules(ninja);
  const existing = (Array.isArray(rulesJson.rules) ? rulesJson.rules : [])
    .filter((r) => r?.source !== 'HPE_NINJA_ONLINE_SIZER');
  rulesJson.rules = [...existing, ...additions];
  rulesJson.metadata = {
    ...rulesJson.metadata,
    rulesCount: rulesJson.rules.length,
    ninjaSizingIntegratedAt: new Date().toISOString(),
    ninjaSizingSha256: ninja.sha256 || null
  };
  safeWriteJsonAtomic(rulesFile, rulesJson);
  return { updated: true, added: additions.length, total: rulesJson.rules.length };
}

function parseCliArgs(argv) {
  let product = 'ALL';
  let enrich = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--product' && argv[i + 1]) product = String(argv[++i]).toUpperCase();
    if (argv[i] === '--enrich') enrich = true;
  }
  return { product, enrich };
}

async function runCli() {
  const { product, enrich } = parseCliArgs(process.argv.slice(2));
  const { ws } = await openOrFindNinjaTarget('https://ninjaonline.ext.hpe.com/storage-sizer');
  try {
    if (product === 'ALL' || product === 'B10000' || product === 'ALLETRA_MP_B10000') {
      await captureB10000(ws);
      if (enrich) enrichRulesWithNinjaSizing(path.dirname(B10K_RAW_DIR), 'Alletra_MP_B10000');
    }
    if (product === 'ALL' || product === 'X10000' || product === 'ALLETRA_MP_X10000') {
      await captureX10000(ws);
      if (enrich) enrichRulesWithNinjaSizing(path.dirname(X10K_RAW_DIR), 'Alletra_MP_X10000');
    }
  } finally {
    try { ws.close(); } catch (_) {}
  }
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error('❌ Ninja Online capture failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  captureB10000,
  captureX10000,
  enrichRulesWithNinjaSizing
};
