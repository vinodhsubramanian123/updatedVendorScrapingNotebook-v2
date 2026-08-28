'use strict';
const XLSX = require('xlsx-js-style');

const file1 = '/home/vinodh/Downloads/HPE_DL380_Gen11_PartnerPortal_PathB_Upload_BOM.xlsx';
const file2 = '/home/vinodh/Downloads/DL380-Gen11-GID-RFQS-HPE-2026-006_5155411222-01 (1).xlsx';

const wb1 = XLSX.readFile(file1);
const wb2 = XLSX.readFile(file2);

const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { header: 1 });
const rows2 = XLSX.utils.sheet_to_json(wb2.Sheets['BOM'], { header: 1 });

// Parse File 2 (Official CLIC BOM)
const clicItems = [];
for (let i = 6; i < rows2.length; i++) {
  const r = rows2[i];
  if (!r || !r[1]) continue;
  const qty = parseInt(r[0], 10);
  const rawSku = String(r[1]).trim();
  const desc = r[2] || '';
  const configName = r[4] || '';
  const unitPrice = parseFloat(r[7]) || 0;
  const extPrice = parseFloat(r[8]) || 0;
  
  const is0D1 = rawSku.includes('0D1') || desc === 'Factory Integrated' || rawSku.includes('B19');
  clicItems.push({
    rawSku,
    cleanSku: rawSku.split(/\s+/)[0],
    qty,
    desc,
    configName,
    unitPrice,
    extPrice,
    is0D1
  });
}

// Parse File 1 (Partner Portal Upload BOM)
const uploadItems = [];
let currentConfig = 'CONFIG #1';
let currentSet = 20;

for (let i = 1; i < rows1.length; i++) {
  const r = rows1[i];
  if (!r || r.length === 0) continue;
  if (r[0] && String(r[0]).includes('CONFIGURATION #2')) {
    currentConfig = 'CONFIG #2';
    currentSet = 40;
    continue;
  }
  if (r[2] && String(r[2]).includes('SUBTOTAL')) {
    continue;
  }
  if (r[0] && String(r[0]).includes('GRAND TOTAL')) {
    continue;
  }
  const partNo = String(r[0]).trim();
  if (!partNo) continue;
  const qty = parseInt(r[1], 10);
  const set = parseInt(r[2], 10) || currentSet;
  const desc = r[3] || '';
  const unitPrice = parseFloat(r[4]) || 0;
  const extPrice = parseFloat(r[5]) || 0;
  const status = r[6] || '';
  
  uploadItems.push({
    partNo,
    qty,
    set,
    totalQty: qty * set,
    desc,
    unitPrice,
    extPrice,
    config: currentConfig,
    status
  });
}

console.log('CLIC Items count:', clicItems.length);
console.log('CLIC Non-0D1 Items count:', clicItems.filter(x => !x.is0D1).length);
console.log('Upload BOM Items count:', uploadItems.length);

console.log('\n================================================================');
console.log('🔍 LINE-BY-LINE RECONCILIATION: Upload BOM vs CLIC BOM');
console.log('================================================================\n');

let matchedCount = 0;
let priceDiffCount = 0;
let qtyDiffCount = 0;
const missingInClic = [];

uploadItems.forEach(u => {
  const clicMatch = clicItems.find(c => !c.is0D1 && c.cleanSku === u.partNo && 
    ((u.config === 'CONFIG #1' && c.configName.includes('Platinum')) || 
     (u.config === 'CONFIG #2' && c.configName.includes('Gold'))));
  
  if (!clicMatch) {
    console.log('❌ [' + u.config + '] ' + u.partNo + ' NOT FOUND in CLIC BOM: Qty=' + u.totalQty + ', UnitPrice=$' + u.unitPrice);
    missingInClic.push(u);
  } else {
    matchedCount++;
    const priceDiff = u.unitPrice - clicMatch.unitPrice;
    const qtyDiff = u.totalQty - clicMatch.qty;
    
    if (priceDiff !== 0 || qtyDiff !== 0) {
      console.log('⚠️ [' + u.config + '] ' + u.partNo + ' MISMATCH:');
      console.log('   Upload: Qty=' + u.totalQty + ', UnitPrice=$' + u.unitPrice + ', ExtPrice=$' + u.extPrice);
      console.log('   CLIC:   Qty=' + clicMatch.qty + ', UnitPrice=$' + clicMatch.unitPrice + ', ExtPrice=$' + clicMatch.extPrice);
      console.log('   Diff:   QtyDiff=' + qtyDiff + ', PriceDiff=$' + priceDiff);
      if (priceDiff !== 0) priceDiffCount++;
      if (qtyDiff !== 0) qtyDiffCount++;
    } else {
      console.log('✅ [' + u.config + '] ' + u.partNo + ' EXACT MATCH: Qty=' + u.totalQty + ', UnitPrice=$' + u.unitPrice + ', ExtPrice=$' + u.extPrice);
    }
  }
});

console.log('\n--- Items in CLIC BOM not in Upload BOM ---');
clicItems.filter(c => !c.is0D1).forEach(c => {
  const cfg = c.configName.includes('Platinum') ? 'CONFIG #1' : 'CONFIG #2';
  const inUpload = uploadItems.find(u => u.partNo === c.cleanSku && u.config === cfg);
  if (!inUpload) {
    console.log('ℹ️ [CLIC Only] [' + cfg + '] ' + c.cleanSku + ': Qty=' + c.qty + ', UnitPrice=$' + c.unitPrice + ', ExtPrice=$' + c.extPrice + ' (' + c.desc + ')');
  }
});

// Calculate Totals
const totalUpload = uploadItems.reduce((sum, u) => sum + u.extPrice, 0);
const totalClic = clicItems.filter(c => !c.is0D1).reduce((sum, c) => sum + c.extPrice, 0);

console.log('\n================================================================');
console.log('📊 FINANCIAL SUMMARY & TOTAL RECONCILIATION');
console.log('================================================================');
console.log('Upload BOM Total List Price : $' + totalUpload.toLocaleString('en-US', { minimumFractionDigits: 2 }));
console.log('CLIC BOM Total List Price   : $' + totalClic.toLocaleString('en-US', { minimumFractionDigits: 2 }));
console.log('Net Delta                   : $' + (totalUpload - totalClic).toLocaleString('en-US', { minimumFractionDigits: 2 }));
console.log('Matched SKUs                : ' + matchedCount + ' / ' + uploadItems.length);
console.log('Price Mismatches            : ' + priceDiffCount);
console.log('Quantity Mismatches         : ' + qtyDiffCount);
console.log('================================================================\n');
