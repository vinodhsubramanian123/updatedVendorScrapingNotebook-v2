'use strict';
const fs = require('fs');
const path = require('path');
const { isValidHpeSKU, cleanBaseSKU, classifyOptionType, isServiceSku } = require('./lib/sku');

function recover() {
  const mdPath = path.join(__dirname, '..', 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF', 'reports', 'BOQ_Evaluation_oca_raw_data_full.md');
  if (!fs.existsSync(mdPath)) {
    console.error('MD report not found at:', mdPath);
    return;
  }

  const content = fs.readFileSync(mdPath, 'utf-8');
  const lines = content.split('\n');
  const skuList = [];
  const seenSkus = new Set();
  let tableStarted = false;

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
          let sku = parts[2].replace(/\`/g, '').trim();
          let desc = parts[4].trim();
          let priceStr = parts[5].replace('$', '').replace(/,/g, '').trim();
          
          if (index && !isNaN(index)) {
            if (sku.startsWith('tP') || sku.startsWith('TP')) {
              sku = sku.substring(1);
            }
            if (isValidHpeSKU(sku)) {
              sku = cleanBaseSKU(sku).toUpperCase();
              if (!seenSkus.has(sku)) {
                seenSkus.add(sku);
                skuList.push({ sku, desc, price: parseFloat(priceStr) || 0 });
              }
            }
          }
        }
      } else if (seenSkus.size > 0 && !line.startsWith('|') && line.trim() !== '') {
        // Table finished, or we encountered an empty line after starting
      }
    }
  }

  console.log(`Extracted ${skuList.length} unique valid SKUs.`);

  // Classify with robust fallback
  const classified = {};
  for (const item of skuList) {
    let cat = 'Options';
    let sub = 'General Options';
    const desc = item.desc;
    const descLower = desc.toLowerCase();
    const sku = item.sku;

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
      // Use paren match as category fallback
      cat = extractedParen;
      sub = extractedParen;
    }

    // Clean description to remove trailing paren category if it's there
    let cleanDesc = desc;
    if (parenMatch) {
      cleanDesc = desc.substring(0, parenMatch.index).trim();
    }
    // Also strip newline indicators or raw DOM context if any
    cleanDesc = cleanDesc.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/context":\s*/gi, '').trim();

    classified[cat] = classified[cat] || {};
    classified[cat][sub] = classified[cat][sub] || [];
    classified[cat][sub].push({
      sku,
      desc: cleanDesc,
      price: item.price
    });
  }

  console.log('Classified categories and subcategories:');
  for (const cat in classified) {
    console.log(`\n• Parent Category: ${cat}`);
    for (const sub in classified[cat]) {
      console.log(`  - Sub-Category: ${sub} (${classified[cat][sub].length} SKUs)`);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'recovered_skus.json'), JSON.stringify(classified, null, 2));
  console.log('\nSaved classification schema to scripts/recovered_skus.json');
}

recover();
