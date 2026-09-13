'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const processors = [
  // Excellent (Immediate Channel Stock)
  { sku: 'P74503-B21', model: 'Intel Xeon 6505P', arch: 'P-Core', cores: 12, speed: '2.2 GHz', tdp: '150W', price: '$1,756.00', leadTime: 'Immediate Stock (3-5 Days)', tier: 'EXCELLENT' },
  { sku: 'P74504-B21', model: 'Intel Xeon 6507P', arch: 'P-Core', cores: 8, speed: '3.5 GHz', tdp: '150W', price: '$2,293.00', leadTime: 'Immediate Stock (3-5 Days)', tier: 'EXCELLENT' },
  { sku: 'P74506-B21', model: 'Intel Xeon 6515P', arch: 'P-Core', cores: 16, speed: '2.3 GHz', tdp: '150W', price: '$2,457.00', leadTime: 'Immediate Stock (3-5 Days)', tier: 'EXCELLENT' },
  { sku: 'P74568-B21', model: 'Intel Xeon 6520P', arch: 'P-Core', cores: 24, speed: '2.4 GHz', tdp: '210W', price: '$4,242.00', leadTime: 'Immediate Stock (3-5 Days)', tier: 'EXCELLENT' },
  { sku: 'P71117-B21', model: 'Intel Xeon 6710E', arch: 'E-Core (Cloud)', cores: 64, speed: '2.4 GHz', tdp: '205W', price: '$6,096.00', leadTime: 'Immediate Stock (3-5 Days)', tier: 'EXCELLENT' },
  { sku: 'P74571-B21', model: 'Intel Xeon 6530P', arch: 'P-Core', cores: 32, speed: '2.3 GHz', tdp: '225W', price: '$6,830.00', leadTime: 'Immediate Stock (3-5 Days)', tier: 'EXCELLENT' },
  { sku: 'P71119-B21', model: 'Intel Xeon 6740E', arch: 'E-Core (Cloud)', cores: 96, speed: '2.4 GHz', tdp: '250W', price: '$8,459.00', leadTime: 'Immediate Stock (3-5 Days)', tier: 'EXCELLENT' },
  { sku: 'P74573-B21', model: 'Intel Xeon 6730P', arch: 'P-Core', cores: 32, speed: '2.5 GHz', tdp: '250W', price: '$10,516.00', leadTime: 'Immediate Stock (3-5 Days)', tier: 'EXCELLENT' },

  // Good (Normal Channel SLA: 10-21 Days)
  { sku: 'P74507-B21', model: 'Intel Xeon 6517P', arch: 'P-Core', cores: 16, speed: '3.2 GHz', tdp: '190W', price: '$3,734.00', leadTime: 'Normal SLA (10-14 Days)', tier: 'GOOD' },
  { sku: 'P71118-B21', model: 'Intel Xeon 6731E', arch: 'E-Core (Cloud)', cores: 96, speed: '2.2 GHz', tdp: '250W', price: '$7,062.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P74572-B21', model: 'Intel Xeon 6728P', arch: 'P-Core', cores: 24, speed: '2.7 GHz', tdp: '210W', price: '$7,493.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P74570-B21', model: 'Intel Xeon 6527P', arch: 'P-Core', cores: 24, speed: '3.0 GHz', tdp: '255W', price: '$8,123.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P74508-B21', model: 'Intel Xeon 6714P', arch: 'P-Core (High GHz)', cores: 8, speed: '4.0 GHz', tdp: '165W', price: '$8,941.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P71120-B21', model: 'Intel Xeon 6746E', arch: 'E-Core (Cloud)', cores: 112, speed: '2.0 GHz', tdp: '250W', price: '$8,965.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P74575-B21', model: 'Intel Xeon 6736P', arch: 'P-Core', cores: 36, speed: '2.0 GHz', tdp: '205W', price: '$10,247.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P74509-B21', model: 'Intel Xeon 6724P', arch: 'P-Core', cores: 16, speed: '3.6 GHz', tdp: '210W', price: '$11,074.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P71121-B21', model: 'Intel Xeon 6756E', arch: 'E-Core (Cloud)', cores: 128, speed: '1.8 GHz', tdp: '225W', price: '$11,891.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P87302-B21', model: 'Intel Xeon 6725P', arch: 'P-Core', cores: 16, speed: '3.7 GHz', tdp: '235W', price: '$12,209.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P73829-B21', model: 'Intel Xeon 6740P', arch: 'P-Core', cores: 48, speed: '2.1 GHz', tdp: '270W', price: '$13,124.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P74578-B21', model: 'Intel Xeon 6732P', arch: 'P-Core', cores: 32, speed: '3.8 GHz', tdp: '350W', price: '$13,581.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P74576-B21', model: 'Intel Xeon 6737P', arch: 'P-Core', cores: 32, speed: '2.9 GHz', tdp: '270W', price: '$14,682.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P81591-B21', model: 'Intel Xeon 6745P', arch: 'P-Core', cores: 32, speed: '3.1 GHz', tdp: '300W', price: '$14,818.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P71124-B21', model: 'Intel Xeon 6780E', arch: 'E-Core (Cloud)', cores: 144, speed: '2.2 GHz', tdp: '330W', price: '$16,019.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P73832-B21', model: 'Intel Xeon 6760P', arch: 'P-Core', cores: 64, speed: '2.2 GHz', tdp: '330W', price: '$16,517.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P73831-B21', model: 'Intel Xeon 6747P', arch: 'P-Core', cores: 48, speed: '2.7 GHz', tdp: '330W', price: '$16,595.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P74577-B21', model: 'Intel Xeon 6738P', arch: 'P-Core', cores: 32, speed: '2.9 GHz', tdp: '270W', price: '$17,305.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P73834-B21', model: 'Intel Xeon 6767P', arch: 'P-Core', cores: 64, speed: '2.4 GHz', tdp: '350W', price: '$22,485.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' },
  { sku: 'P73837-B21', model: 'Intel Xeon 6787P', arch: 'P-Core', cores: 86, speed: '2.0 GHz', tdp: '350W', price: '$23,285.00', leadTime: 'Normal SLA (14-21 Days)', tier: 'GOOD' }
];

const rowsHtml = processors.map(p => `
      <tr>
        <td><span class="sku-tag">${p.sku}</span></td>
        <td class="model-name">${p.model}</td>
        <td><span class="${p.arch.includes('P-Core') ? 'arch-pcore' : 'arch-ecore'}">${p.arch}</span></td>
        <td><strong>${p.cores} Cores</strong></td>
        <td>${p.speed}</td>
        <td>${p.tdp}</td>
        <td class="price-cell">${p.price}</td>
        <td>
          <span class="lead-badge ${p.tier === 'EXCELLENT' ? 'lead-excellent' : 'lead-good'}">
            <span class="dot ${p.tier === 'EXCELLENT' ? 'dot-green' : 'dot-blue'}"></span>
            ${p.leadTime}
          </span>
        </td>
      </tr>`).join('\n');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>HPE ProLiant DL380 Gen12 - Intel Xeon 6 Series Processor Portfolio</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  body { background: #0b0f19; color: #f1f5f9; padding: 32px; width: 1320px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px; }
  .title-area h1 { font-size: 26px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 12px; }
  .badge-hpe { background: #00b388; color: #000000; font-size: 13px; font-weight: 800; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; }
  .title-area p { color: #94a3b8; font-size: 14px; margin-top: 6px; }
  .meta-stats { display: flex; gap: 16px; }
  .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 18px; text-align: center; }
  .stat-card .val { font-size: 20px; font-weight: 700; color: #38bdf8; }
  .stat-card .lbl { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .table-container { background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  thead th { background: #1f2937; color: #cbd5e1; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.75px; padding: 14px 16px; border-bottom: 1px solid #374151; }
  tbody tr { border-bottom: 1px solid #1f2937; }
  tbody tr:nth-child(even) { background: #131d2e; }
  tbody td { padding: 12px 16px; font-size: 13px; color: #e2e8f0; }
  .sku-tag { font-family: monospace; font-weight: 700; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.2); }
  .model-name { font-weight: 600; color: #ffffff; }
  .arch-pcore { color: #a78bfa; font-size: 12px; font-weight: 600; }
  .arch-ecore { color: #34d399; font-size: 12px; font-weight: 600; }
  .price-cell { font-weight: 700; color: #10b981; font-family: monospace; font-size: 14px; }
  .lead-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .lead-excellent { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.4); }
  .lead-good { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
  .dot { width: 6px; height: 6px; border-radius: 50%; }
  .dot-green { background: #10b981; }
  .dot-blue { background: #38bdf8; }
  .footer { margin-top: 20px; display: flex; justify-content: space-between; color: #64748b; font-size: 12px; }
</style>
</head>
<body>
<div class="header">
  <div class="title-area">
    <h1><span class="badge-hpe">HPE ProLiant Gen12</span> Intel Xeon 6 Series Available Processors</h1>
    <p>Live Catalog Procurement Matrix & Channel Lead Time Sizing | DL380 Gen12 ComputeScale</p>
  </div>
  <div class="meta-stats">
    <div class="stat-card"><div class="val">28</div><div class="lbl">Orderable SKUs</div></div>
    <div class="stat-card"><div class="val">8 - 144</div><div class="lbl">Core Range</div></div>
    <div class="stat-card"><div class="val">3 - 21 Days</div><div class="lbl">Decent Lead Time</div></div>
  </div>
</div>

<div class="table-container">
  <table>
    <thead>
      <tr>
        <th>Part Number</th>
        <th>Processor Model</th>
        <th>Architecture</th>
        <th>Physical Cores</th>
        <th>Base Speed</th>
        <th>TDP (Thermal)</th>
        <th>List Price (USD)</th>
        <th>Channel Lead Time</th>
      </tr>
    </thead>
    <tbody>
${rowsHtml}
    </tbody>
  </table>
</div>

<div class="footer">
  <span>Source: Official HPE One Config Advanced (OCA) Product Catalog & Distributor Inventory Database</span>
  <span>Thermal Note: Processors &gt;185W mandate High-Performance Heatsink; &gt;250W mandate High-Performance Fans</span>
</div>
</body>
</html>`;

(async () => {
  const artifactDir = '/home/vinodh/.gemini/antigravity-ide/brain/21301c73-cf9f-4047-bbce-8304bb330c8b';
  const htmlPath = path.join(artifactDir, 'intel_xeon_6_series.html');
  const pngPath = path.join(artifactDir, 'intel_xeon_6_series_processors.png');
  
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('Wrote HTML to:', htmlPath);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1320, height: 1650 } });
  await page.goto('file://' + htmlPath);
  await page.waitForTimeout(600);
  await page.screenshot({ path: pngPath, fullPage: true });
  await browser.close();
  
  console.log('Generated screenshot successfully at:', pngPath);
})();
