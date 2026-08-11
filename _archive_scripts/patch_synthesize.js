const fs = require('fs');
let content = fs.readFileSync('scripts/lib/conflict_graph.js', 'utf8');

const oldFunc = `function synthesize5TierRankedSolutions(items = [], evalResults = {}, graphResults = {}, chassisInfo = {}, targetDir = '') {
  const dna = extractWorkloadDna(items);
  const baseCost = items.reduce((acc, it) => acc + ((it.unitPriceUsd || 500) * (it.quantity || 1)), 0);
  const fixes = evalResults.missingDependencies || [];
  const fixCost = fixes.reduce((acc, f) => {
    let unitPrice = 350;
    if (f.sku) {
      const match = items.find(i => cleanBaseSKU(i.sku) === cleanBaseSKU(f.sku));
      if (match && match.unitPriceUsd) unitPrice = match.unitPriceUsd;
    }
    return acc + ((f.quantity || 1) * unitPrice);
  }, 0);

  // Base hardware parts list
  const baseParts = items.map(it => {
    const role = classifyComponentRole(it.category || '', it.description || '');
    return {
      sku: cleanBaseSKU(it.sku),
      description: it.description || \`HPE Hardware Option (\${cleanBaseSKU(it.sku)})\`,
      quantity: it.quantity || 1,
      unitPriceUsd: it.unitPriceUsd || 500,
      extendedPriceUsd: (it.unitPriceUsd || 500) * (it.quantity || 1),
      isFixInjected: false,
      category: role !== 'Option Component' ? role : (it.category || 'Base Hardware')
    };
  });

  // Injected aspect fix parts list
  const fixParts = fixes.map(f => {
    const role = classifyComponentRole(f.category || '', f.description || '');
    return {
      sku: cleanBaseSKU(f.sku),
      description: f.description || \`Injected Aspect Rule Fix (\${cleanBaseSKU(f.sku)})\`,
      quantity: f.quantity || 1,
      unitPriceUsd: f.unitPriceUsd || 350,
      extendedPriceUsd: (f.unitPriceUsd || 350) * (f.quantity || 1),
      isFixInjected: true,
      category: role !== 'Option Component' ? role : 'Aspect Rule Fix'
    };
  });

  // Rank 1 Parts (Intent Preserved - Base + Mandatory Fixes)
  const rank1Parts = [...baseParts, ...fixParts];
  const rank1Cost = rank1Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  // Strategy 2 Add-ons: Standard Factory Cable/Rail/Management Kit ($250)
  const rank2Addons = [
    {
      sku: 'P76471-B21',
      description: 'HPE DL380 Gen12 Standard Factory Cable/Rail Kit',
      quantity: 1,
      unitPriceUsd: 250,
      extendedPriceUsd: 250,
      isFixInjected: false,
      category: 'Factory CTO Standard'
    }
  ];
  const rank2Parts = [...rank1Parts, ...rank2Addons];
  const rank2Cost = rank2Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  // Strategy 3 Add-ons: Storage Controller Cache & Smart Storage Battery ($850)
  const rank3Addons = [
    {
      sku: 'P01366-B21',
      description: 'HPE Smart Storage Hybrid Capacitor Battery with 145mm Cable',
      quantity: 1,
      unitPriceUsd: 350,
      extendedPriceUsd: 350,
      isFixInjected: false,
      category: 'Storage Performance'
    },
    {
      sku: 'P49025-B21',
      description: 'HPE 4GB Cache High-IOPS Controller Cache Expansion',
      quantity: 1,
      unitPriceUsd: 500,
      extendedPriceUsd: 500,
      isFixInjected: false,
      category: 'Storage Performance'
    }
  ];
  const rank3Parts = [...rank1Parts, ...rank3Addons];
  const rank3Cost = rank3Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  // Strategy 4 Add-ons: Full PCIe Riser & High-Performance Thermal Fan Kit ($1,850)
  const rank4Addons = [
    {
      sku: 'P76453-B21',
      description: 'HPE DL380 Gen12 Primary/Secondary Full PCIe x16 Riser Kit',
      quantity: 1,
      unitPriceUsd: 1200,
      extendedPriceUsd: 1200,
      isFixInjected: false,
      category: 'Scalability Expansion'
    },
    {
      sku: 'P40502-B21',
      description: 'HPE High Performance Fan Kit (6 Fans)',
      quantity: 1,
      unitPriceUsd: 650,
      extendedPriceUsd: 650,
      isFixInjected: false,
      category: 'Scalability Expansion'
    }
  ];
  const rank4Parts = [...rank1Parts, ...rank4Addons];
  const rank4Cost = rank4Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);`;

const newFunc = `function synthesize5TierRankedSolutions(items = [], evalResults = {}, graphResults = {}, chassisInfo = {}, targetDir = '') {
  const dna = extractWorkloadDna(items);
  
  // Try loading price history
  let priceMap = {};
  if (targetDir && fs.existsSync(path.join(targetDir, 'price_history.json'))) {
    try {
      priceMap = JSON.parse(fs.readFileSync(path.join(targetDir, 'price_history.json'), 'utf8'));
    } catch (err) {
      console.error('Failed to parse price_history.json:', err);
    }
  }

  // Helper to get real price
  const getPrice = (sku, defaultPrice = 500) => {
    const clean = cleanBaseSKU(sku);
    if (priceMap[clean] && priceMap[clean].price) return priceMap[clean].price;
    const match = items.find(i => cleanBaseSKU(i.sku) === clean);
    if (match && match.unitPriceUsd) return match.unitPriceUsd;
    return defaultPrice;
  };

  const baseCost = items.reduce((acc, it) => acc + (getPrice(it.sku, it.unitPriceUsd || 500) * (it.quantity || 1)), 0);
  const fixes = evalResults.missingDependencies || [];
  const fixCost = fixes.reduce((acc, f) => {
    const unitPrice = getPrice(f.sku, f.unitPriceUsd || 350);
    return acc + ((f.quantity || 1) * unitPrice);
  }, 0);

  // Base hardware parts list
  const baseParts = items.map(it => {
    const role = classifyComponentRole(it.category || '', it.description || '');
    const price = getPrice(it.sku, it.unitPriceUsd || 500);
    return {
      sku: cleanBaseSKU(it.sku),
      description: it.description || \`HPE Hardware Option (\${cleanBaseSKU(it.sku)})\`,
      quantity: it.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (it.quantity || 1),
      isFixInjected: false,
      category: role !== 'Option Component' ? role : (it.category || 'Base Hardware')
    };
  });

  // Injected aspect fix parts list
  const fixParts = fixes.map(f => {
    const role = classifyComponentRole(f.category || '', f.description || '');
    const price = getPrice(f.sku, f.unitPriceUsd || 350);
    return {
      sku: cleanBaseSKU(f.sku),
      description: f.description || \`Injected Aspect Rule Fix (\${cleanBaseSKU(f.sku)})\`,
      quantity: f.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (f.quantity || 1),
      isFixInjected: true,
      category: role !== 'Option Component' ? role : 'Aspect Rule Fix'
    };
  });

  // Rank 1 Parts (Intent Preserved - Base + Mandatory Fixes)
  const rank1Parts = [...baseParts, ...fixParts];
  const rank1Cost = rank1Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  // Load Strategy Config
  let strategyConfig = { default: { rank2: [], rank3: [], rank4: [] } };
  try {
    const configPath = path.join(__dirname, '..', 'config', 'strategy_addons.json');
    if (fs.existsSync(configPath)) {
      strategyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to parse strategy_addons.json:', err);
  }

  const modelKey = (chassisInfo.model || '').toLowerCase();
  const familyKey = (chassisInfo.family || '').toLowerCase();
  
  let key = 'default';
  if (modelKey.includes('dl380')) key = 'dl380';
  else if (familyKey.includes('alletra')) key = 'alletra';
  
  const addons = strategyConfig[key] || strategyConfig['default'];

  const mapAddons = (addonList) => addonList.map(a => {
    const price = getPrice(a.sku, a.unitPriceUsd || 250);
    return {
      ...a,
      unitPriceUsd: price,
      extendedPriceUsd: price * (a.quantity || 1),
      isFixInjected: false
    };
  });

  const rank2Addons = mapAddons(addons.rank2 || []);
  const rank2Parts = [...rank1Parts, ...rank2Addons];
  const rank2Cost = rank2Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  const rank3Addons = mapAddons(addons.rank3 || []);
  const rank3Parts = [...rank1Parts, ...rank3Addons];
  const rank3Cost = rank3Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  const rank4Addons = mapAddons(addons.rank4 || []);
  const rank4Parts = [...rank1Parts, ...rank4Addons];
  const rank4Cost = rank4Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('scripts/lib/conflict_graph.js', content);
