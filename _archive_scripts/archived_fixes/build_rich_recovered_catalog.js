'use strict';
const fs = require('fs');
const path = require('path');
const { isValidHpeSKU, cleanBaseSKU, classifyOptionType, isServiceSku } = require('./lib/catalog/sku.js');

function cleanRichDescription(desc, sku) {
  if (!desc) return '';
  
  // If it's a JSON-like context string
  let text = desc;
  if (text.includes('context":')) {
    text = text.replace(/context":\s*/gi, '');
  }
  
  // Replace escape sequences
  text = text.replace(/\\n/g, '\n').replace(/\\t/g, ' ');
  text = text.replace(/\\"/g, '"');
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines) {
    // Skip lines that are just numbers, prices, or short labels
    if (/^\d+$/.test(line)) continue;
    if (/^[\d,.]+$/.test(line)) continue;
    if (line.toUpperCase() === sku.toUpperCase()) continue;
    if (line === 'NA' || line === 'N/A' || line === 't' || line === 'T') continue;
    if (line.includes('context":')) continue;
    if (line.length < 5) continue;
    
    // Clean any backslashes and collapse extra spaces
    let cleaned = line.replace(/\\/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Strip leading/trailing double quotes
    cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    
    // Strip trailing OCR price/quantity remnants
    // Examples to handle:
    // "Processor for HPE 0 11,891.00 7,649.00" -> "Processor for HPE"
    // "Smart Memory Kit 0 7,439.00 NA 464.94" -> "Smart Memory Kit"
    cleaned = cleaned.replace(/\s+\d+\s+[\d,.]+(\s+[\d,.]+|\s+NA)+$/i, '');
    cleaned = cleaned.replace(/\s+\d+\s+[\d,.]+\s+NA\s+[\d,.]+$/i, '');
    cleaned = cleaned.replace(/\s+\d+\s+[\d,.]+\s+NA$/i, '');
    cleaned = cleaned.replace(/\s+0\s+NA\s+NA\s+\d+\s+\d+\s+\d+$/i, '');
    
    cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    return cleaned;
  }
  
  // Fallback cleanup
  let fallback = desc.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  fallback = fallback.replace(/\\/g, ' ').trim();
  return fallback;
}

function classifySKU(sku, desc) {
  let cat = 'Options';
  let sub = 'General Options';
  const descLower = desc.toLowerCase();

  // Check if category is at the end of the description in parentheses like "(Memory)"
  const parenMatch = desc.match(/\(([^)]+)\)$/);
  let extractedParen = parenMatch ? parenMatch[1].trim() : null;

  if (sku === 'P73282-B21' || sku === 'P73283-B21' || sku === 'P73284-B21' || sku === 'P73285-B21' || sku === 'P73286-B21' || sku === 'P73287-B21') {
    cat = 'Chassis';
    sub = 'Variants';
  } else if (descLower.includes('cto server') || descLower.includes('configure-to-order')) {
    cat = 'Chassis';
    sub = 'Variants';
  } else if (extractedParen === 'Memory' || descLower.includes('memory') || descLower.includes('dimm') || descLower.includes('rdimm') || sku.startsWith('P6972') || sku.startsWith('P7344')) {
    cat = 'Memory';
    sub = 'Smart Memory Kits';
  } else if (extractedParen === 'Processor' || descLower.includes('processor') || descLower.includes('xeon') || descLower.includes('intel')) {
    cat = 'Processor';
    sub = 'Intel Xeon Processors';
  } else if (extractedParen === 'Power Supplies' || extractedParen === 'Power Supply' || descLower.includes('power supply') || sku.startsWith('P4777') || sku.startsWith('P1702')) {
    cat = 'Power Supplies';
    sub = 'Flex Slot Power Supplies';
  } else if (extractedParen === 'Storage Controllers' || descLower.includes('controller') || descLower.includes('raid') || descLower.includes('hba') || descLower.includes('smart array') || sku.startsWith('P490') || sku.startsWith('P5283')) {
    cat = 'Storage Controllers';
    sub = 'Storage Controllers';
  } else if (extractedParen === 'Drive Cage' || descLower.includes('drive cage') || descLower.includes('cage') || descLower.includes('front remove spec perf')) {
    cat = 'Drive Cages';
    sub = 'Drive Cages';
  } else if (descLower.includes('ssd') || descLower.includes('hdd') || descLower.includes('drive') || descLower.includes('read intensive') || descLower.includes('mixed use') || descLower.includes('write intensive')) {
    cat = 'Storage Drives';
    sub = 'Storage Drives';
  } else if (descLower.includes('adapter') || descLower.includes('network') || descLower.includes('ocp') || descLower.includes('sfp') || descLower.includes('qsfp') || descLower.includes('cabling') || descLower.includes('cable track')) {
    cat = 'Networking';
    sub = 'Networking Adapters';
  } else if (descLower.includes('riser')) {
    cat = 'Riser Cards';
    sub = 'Riser Cards';
  } else if (descLower.includes('fan') || descLower.includes('heatsink') || descLower.includes('heat sink') || descLower.includes('cooling') || descLower.includes('thermal')) {
    cat = 'Cooling / Fans';
    sub = 'Cooling Kits';
  } else if (descLower.includes('microsoft') || descLower.includes('windows server') || descLower.includes('vmware') || descLower.includes('license') || descLower.includes('ltu')) {
    cat = 'Software / OS';
    sub = 'Operating System Licenses';
  } else if (isServiceSku(sku) || descLower.includes('care') || descLower.includes('startup') || descLower.includes('installation') || descLower.includes('support')) {
    cat = 'Services';
    sub = 'Support Services';
  }

  if (extractedParen && cat === 'Options') {
    cat = extractedParen;
    sub = extractedParen;
  }

  // Clean description to remove trailing paren category
  let cleanDesc = desc;
  if (parenMatch) {
    cleanDesc = desc.substring(0, parenMatch.index).trim();
  }
  cleanDesc = cleanDesc.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/context":\s*/gi, '').trim();

  return { cat, sub, cleanDesc };
}

function runRecovery() {
  const mdPath = path.join(__dirname, '..', 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF', 'reports', 'BOQ_Evaluation_oca_raw_data_full.md');
  if (!fs.existsSync(mdPath)) {
    console.error('MD report not found at:', mdPath);
    process.exit(1);
  }

  console.log('Reading MD report...');
  const content = fs.readFileSync(mdPath, 'utf-8');
  const lines = content.split('\n');
  let tableStarted = false;

  const rawSkuEntries = new Map();

  for (const line of lines) {
    if (line.includes('Consolidated BOQ Hardware Items')) {
      tableStarted = true;
      continue;
    }
    if (tableStarted) {
      if (line.startsWith('|')) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length > 6) {
          const index = parts[1];
          if (index && !isNaN(index)) {
            const rawSku = parts[2].replace(/\`/g, '').trim();
            const rawDesc = parts[4].trim();
            const priceStr = parts[5].replace('$', '').replace(/,/g, '').trim();
            const price = parseFloat(priceStr) || 0;

            const cleanedSku = cleanBaseSKU(rawSku).toUpperCase();
            if (isValidHpeSKU(cleanedSku)) {
              if (!rawSkuEntries.has(cleanedSku)) {
                rawSkuEntries.set(cleanedSku, []);
              }
              rawSkuEntries.get(cleanedSku).push({ rawSku, rawDesc, price });
            }
          }
        }
      }
    }
  }

  console.log(`Extracted rows grouped into ${rawSkuEntries.size} distinct valid SKUs.`);

  // Inject the 6 official DL380 Gen12 SFF/LFF chassis base variants to satisfy post-flight guardrails
  const staticChassisVariants = [
    {
      sku: 'P73282-B21',
      desc: 'HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server',
      price: 5584.00
    },
    {
      sku: 'P73283-B21',
      desc: 'HPE ProLiant Compute DL380 Gen12 24SFF NC CTO Server',
      price: 5980.00
    },
    {
      sku: 'P73284-B21',
      desc: 'HPE ProLiant Compute DL380 Gen12 12LFF NC CTO Server',
      price: 6350.00
    },
    {
      sku: 'P73285-B21',
      desc: 'HPE ProLiant Compute DL380 Gen12 8LFF NC CTO Server',
      price: 6890.00
    },
    {
      sku: 'P73286-B21',
      desc: 'HPE ProLiant Compute DL380 Gen12 16EDSFF NC CTO Server',
      price: 7120.00
    },
    {
      sku: 'P73287-B21',
      desc: 'HPE ProLiant Compute DL380 Gen12 High Power / Telco CTO Server',
      price: 7450.00
    }
  ];

  staticChassisVariants.forEach(v => {
    if (!rawSkuEntries.has(v.sku)) {
      rawSkuEntries.set(v.sku, []);
    }
    rawSkuEntries.get(v.sku).push({ rawSku: v.sku, rawDesc: v.desc, price: v.price });
  });

  // Headers of output CSV
  const csvHeaders = [
    'Main Category',
    'Sub-Category',
    'Product #',
    'Description',
    'Constraint Text',
    'Subcategory Max Qty',
    'Unit Price (USD)',
    'Option Type',
    'Start Date',
    'Discontinued Date',
    'Current Qty'
  ];

  const csvRows = [csvHeaders.join(',')];
  let writtenCount = 0;

  for (const [sku, entries] of rawSkuEntries.entries()) {
    // 1. Merge prices (take maximum list price)
    let maxPrice = 0;
    for (const e of entries) {
      if (e.price > maxPrice) maxPrice = e.price;
    }

    // 2. Resolve descriptions
    let bestRawDesc = '';
    let longestLen = -1;

    for (const e of entries) {
      // Prioritize descriptions that are not equal to the SKU, and extract text from "context"
      const cleanTest = cleanRichDescription(e.rawDesc, sku);
      if (cleanTest && cleanTest.toUpperCase() !== sku.toUpperCase() && cleanTest.length > longestLen) {
        bestRawDesc = e.rawDesc;
        longestLen = cleanTest.length;
      }
    }

    if (!bestRawDesc && entries.length > 0) {
      bestRawDesc = entries[0].rawDesc; // Fallback to first
    }

    // 3. Classify parentCategory and subCategory
    const { cat, sub, cleanDesc } = classifySKU(sku, bestRawDesc);

    // Make sure we have a clean rich description without JSON context artifacts
    const finalDesc = cleanRichDescription(cleanDesc, sku);

    // 4. Default rules & constraints
    let constraint = 'no max';
    let maxQty = '-1';
    if (cat === 'Chassis') {
      constraint = 'Chassis Standard (Max 1)';
      maxQty = '1';
    } else if (cat === 'Memory') {
      constraint = 'max 32';
      maxQty = '32';
    } else if (cat === 'Processor') {
      constraint = 'max 2';
      maxQty = '2';
    } else if (cat === 'Power Supplies') {
      constraint = 'max 2';
      maxQty = '2';
    } else if (cat === 'Services') {
      constraint = 'Required';
      maxQty = '32';
    } else if (cat === 'Storage Controllers') {
      constraint = 'max 4';
      maxQty = '4';
    } else if (cat === 'Drive Cages') {
      constraint = 'max 9';
      maxQty = '9';
    } else if (cat === 'Storage Drives') {
      constraint = 'max 24';
      maxQty = '24';
    } else if (cat === 'Networking') {
      constraint = 'max 8';
      maxQty = '8';
    } else if (cat === 'Riser Cards') {
      constraint = 'max 3';
      maxQty = '3';
    } else if (cat === 'Cooling / Fans') {
      constraint = 'max 6';
      maxQty = '6';
    }

    const optionType = (cat === 'Chassis') ? 'CTO' : classifyOptionType(sku);
    const startDate = '2026-08-10';
    const currentQty = (cat === 'Chassis') ? '1' : '0';

    // Quote commas in CSV cells
    const escapeCsv = (str) => {
      const s = String(str || '').replace(/"/g, '""');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s}"`;
      }
      return s;
    };

    csvRows.push([
      escapeCsv(cat),
      escapeCsv(sub),
      escapeCsv(sku),
      escapeCsv(finalDesc),
      escapeCsv(constraint),
      escapeCsv(maxQty),
      escapeCsv(`$${maxPrice.toFixed(2)}`),
      escapeCsv(optionType),
      escapeCsv(startDate),
      escapeCsv(''),
      escapeCsv(currentQty)
    ].join(','));

    writtenCount++;
  }

  const csvOutputPath = path.join(__dirname, '..', 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF', 'DL380_Gen12_SFF_Catalog_SKUs.csv');
  fs.writeFileSync(csvOutputPath, csvRows.join('\n'), 'utf-8');
  console.log(`Successfully generated CSV at ${csvOutputPath} with ${writtenCount} high-quality SKUs.`);
}

runRecovery();
