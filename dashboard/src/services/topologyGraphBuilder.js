/**
 * dashboard/src/services/topologyGraphBuilder.js
 *
 * Universal transformation service that constructs an interactive hierarchical mindmap
 * graph from BOQ evaluation results, multi-product configurations, conflict graphs,
 * and strategy matrix tiers.
 *
 * Supported Product Topologies:
 *   1. ProLiant Rack Servers (DL380, DL360, DL385, Gen11, Gen12)
 *   2. Synergy Composable Infrastructure (Synergy 12000 Frame -> Compute & VC Modules)
 *   3. Alletra / Nimble Storage Systems (Base Controller -> Drive Enclosures)
 *   4. StoreEver Tape Libraries (Base Module -> Expansion Drawers -> LTO Drives)
 *   5. Cray Supercomputing (GX5000 Rack -> Slingshot Nodes)
 *   6. Multi-Chassis / Multi-Node Solution Quotes (Cluster Nodes A/B/C)
 */

export const SUBSYSTEM_DEFS = [
  { id: 'COMPUTE', label: 'Compute & Sockets', icon: 'Cpu', color: 'emerald' },
  { id: 'MEMORY', label: 'Memory Channels', icon: 'Layers', color: 'purple' },
  { id: 'STORAGE', label: 'Storage & Controllers', icon: 'HardDrive', color: 'blue' },
  { id: 'PCIE_NETWORK', label: 'PCIe & Networking', icon: 'Network', color: 'cyan' },
  { id: 'POWER_THERMAL', label: 'Power & Thermal', icon: 'Zap', color: 'amber' },
  { id: 'SERVICES', label: 'Services & Care', icon: 'ShieldCheck', color: 'indigo' }
];

/**
 * Detect product family from chassis info, items, or descriptions.
 */
export function detectProductFamily(evalResults, items = []) {
  const combined = [
    evalResults?.chassis || '',
    evalResults?.workloadDna?.detectedChassis || '',
    evalResults?.conflictGraph?.chassisInfo?.chassisSku || '',
    evalResults?.conflictGraph?.chassisInfo?.formFactor || '',
    ...items.map(i => `${i.sku || ''} ${i.description || ''} ${i.category || ''}`)
  ].join(' ').toLowerCase();

  if (combined.includes('synergy') || combined.includes('vc 100gb') || combined.includes('sy480') || combined.includes('sy660') || combined.includes('f32')) {
    return 'Synergy';
  }
  if (combined.includes('alletra') || combined.includes('nimble') || combined.includes('storeonce') || combined.includes('msa')) {
    return 'Alletra';
  }
  if (combined.includes('storeever') || combined.includes('msl') || combined.includes('tape')) {
    return 'StoreEver';
  }
  if (combined.includes('cray') || combined.includes('gx5000') || combined.includes('slingshot')) {
    return 'Cray';
  }
  return 'ProLiant';
}

/**
 * Categorize a SKU item into one of the 6 canonical subsystem buckets.
 */
export function getSubsystemForSku(item) {
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();

  if (cat.includes('processor') || cat.includes('cpu') || sub.includes('processor') || desc.includes('xeon') || desc.includes('epyc') || desc.includes('processor') || desc.includes('heatsink') || desc.includes('fan')) {
    return 'COMPUTE';
  }
  if (cat.includes('memory') || sub.includes('memory') || cat.includes('dimm') || desc.includes('dimm') || desc.includes('ddr5') || desc.includes('ddr4') || desc.includes('smart memory')) {
    return 'MEMORY';
  }
  if (cat.includes('storage') || cat.includes('drive') || cat.includes('controller') || sub.includes('storage') || sub.includes('drive') || desc.includes('ssd') || desc.includes('nvme') || desc.includes('hdd') || desc.includes('smart array') || desc.includes('tri-mode') || desc.includes('storage battery') || desc.includes('cage') || desc.includes('tape')) {
    return 'STORAGE';
  }
  if (cat.includes('network') || cat.includes('pcie') || cat.includes('adapter') || cat.includes('riser') || cat.includes('gpu') || sub.includes('riser') || sub.includes('network') || desc.includes('ocp') || desc.includes('ethernet') || desc.includes('fibre channel') || desc.includes('gpu') || desc.includes('accelerator') || desc.includes('riser') || desc.includes('virtual connect') || desc.includes('transceiver')) {
    return 'PCIE_NETWORK';
  }
  if (cat.includes('power') || cat.includes('psu') || cat.includes('thermal') || sub.includes('power') || desc.includes('power supply') || desc.includes('lug kit') || desc.includes('flex slot') || desc.includes('cable') || desc.includes('pdu') || desc.includes('ambient') || desc.includes('flm') || desc.includes('power cord')) {
    return 'POWER_THERMAL';
  }
  if (cat.includes('service') || cat.includes('support') || cat.includes('care') || sub.includes('service') || desc.includes('tech care') || desc.includes('complete care') || desc.includes('installation') || desc.includes('proactive')) {
    return 'SERVICES';
  }
  return 'STORAGE';
}

/**
 * Identify distinct sub-products or modular chassis in the BOM (e.g. multi-node quotes or Synergy modules).
 */
export function identifySubProducts(items = [], productFamily = 'ProLiant') {
  const subProducts = [];

  // Group by base chassis / compute modules
  const chassisItems = items.filter(it => {
    const desc = (it.description || '').toLowerCase();
    const cat = (it.category || '').toLowerCase();
    return desc.includes('cto server') || desc.includes('base chassis') || desc.includes('compute module') || desc.includes('module') || desc.includes('enclosure') || cat.includes('chassis') || cat.includes('base');
  });

  if (chassisItems.length > 1) {
    chassisItems.forEach((ch, idx) => {
      subProducts.push({
        id: `subprod-${ch.sku || idx}-${idx}`,
        sku: ch.sku || `MODULE-${idx + 1}`,
        name: ch.description || ch.sku || `Chassis Node ${idx + 1}`,
        quantity: ch.quantity || 1,
        type: 'SUB_PRODUCT_MODULE'
      });
    });
  } else if (productFamily === 'Synergy') {
    subProducts.push({
      id: 'subprod-synergy-compute',
      sku: 'SY480-GEN11',
      name: 'Synergy 480 Gen11 Compute Module',
      quantity: 1,
      type: 'SUB_PRODUCT_MODULE'
    });
    subProducts.push({
      id: 'subprod-synergy-vc',
      sku: 'SY100Gb_F32_Module',
      name: 'Synergy Virtual Connect 100Gb F32 Module',
      quantity: 2,
      type: 'SUB_PRODUCT_MODULE'
    });
  }

  return subProducts;
}

/**
 * Build the topology graph for a specific rank or baseline.
 *
 * @param {object} evalResults Normalized evalResults object
 * @param {string|number} selectedRank 'BASELINE' or 1, 2, 3, 4, 5
 * @returns {object} { rootNode, subProducts: [], nodes: [], edges: [], gaps: [], fixes: [], stats: {}, diagnostics: {} }
 */
export function buildTopologyGraph(evalResults, selectedRank = 'BASELINE') {
  const startTime = Date.now();

  if (!evalResults) {
    return {
      rootNode: null,
      subProducts: [],
      nodes: [],
      edges: [],
      gaps: [],
      fixes: [],
      stats: { totalNodes: 0, validCount: 0, gapCount: 0, fixCount: 0, isBuildable: false },
      diagnostics: { renderLatencyMs: 0, productFamily: 'ProLiant', subProductsCount: 0 }
    };
  }

  const nodes = [];
  const edges = [];
  const gaps = [];
  const fixes = [];
  const ambiguities = [];

  const rawItems = evalResults.items || evalResults.bomItems || [];
  const productFamily = detectProductFamily(evalResults, rawItems);
  const subProducts = identifySubProducts(rawItems, productFamily);

  // 1. Identify Solution / Chassis Root Node
  const chassisSku = evalResults.conflictGraph?.chassisInfo?.chassisSku ||
                     evalResults.workloadDna?.detectedChassis ||
                     evalResults.chassis ||
                     (productFamily === 'Synergy' ? 'SY12000-FRAME' : 'P73282-B21');

  let chassisName = '';
  if (productFamily === 'Synergy') {
    chassisName = 'HPE Synergy 12000 Composable Frame Solution';
  } else if (productFamily === 'Alletra') {
    chassisName = 'HPE Alletra Storage System (Base Controller Array)';
  } else if (productFamily === 'StoreEver') {
    chassisName = 'HPE StoreEver MSL3040 Tape Library System';
  } else if (productFamily === 'Cray') {
    chassisName = 'HPE Cray Supercomputing GX5000 Rack';
  } else {
    chassisName = evalResults.conflictGraph?.chassisInfo?.formFactor
      ? `HPE ProLiant DL380 Gen12 (${evalResults.conflictGraph.chassisInfo.formFactor})`
      : 'HPE ProLiant Server Chassis (CTO Base)';
  }

  const rootNode = {
    id: 'node-chassis-root',
    type: 'CHASSIS_ROOT',
    sku: chassisSku,
    label: chassisName,
    subsystem: 'ROOT',
    productFamily,
    status: 'VALID',
    category: 'Solution Root Enclosure',
    quantity: evalResults.preflightData?.ctoNodeMultiplier || 1,
    details: {
      productFamily,
      formFactor: evalResults.conflictGraph?.chassisInfo?.formFactor || (productFamily === 'Synergy' ? '10U Frame' : '8SFF'),
      maxSockets: evalResults.conflictGraph?.chassisInfo?.maxSockets || 2,
      maxDimms: evalResults.conflictGraph?.chassisInfo?.maxDimms || 32,
      maxPcieSlots: evalResults.totalPcieSlotsAvailable || 8,
      detectedTdp: evalResults.maxCpuTdpWatts || 0,
      subProductsCount: subProducts.length
    }
  };
  nodes.push(rootNode);

  // 2. Add Sub-Product Module Nodes if Composable / Multi-Node Solution
  if (subProducts.length > 0) {
    subProducts.forEach(sp => {
      const spNode = {
        id: sp.id,
        type: 'SUB_PRODUCT_MODULE',
        sku: sp.sku,
        label: sp.name,
        subsystem: 'ROOT',
        productFamily,
        status: 'VALID',
        category: 'Sub-Product Assembly',
        quantity: sp.quantity
      };
      nodes.push(spNode);
      edges.push({
        id: `edge-root-to-${sp.id}`,
        source: rootNode.id,
        target: sp.id,
        type: 'MODULE_BAY_LINK',
        status: 'VALID'
      });
    });
  }

  // 3. Create Subsystem Hub Nodes
  SUBSYSTEM_DEFS.forEach(sub => {
    const subNode = {
      id: `node-sub-${sub.id}`,
      type: 'SUBSYSTEM_HUB',
      subsystem: sub.id,
      label: sub.label,
      icon: sub.icon,
      color: sub.color,
      productFamily,
      status: 'VALID',
      sku: '',
      itemCount: 0
    };
    nodes.push(subNode);

    // Edge from Chassis Root to Subsystem Hub
    edges.push({
      id: `edge-root-to-${sub.id}`,
      source: rootNode.id,
      target: subNode.id,
      type: 'BUS_LINK',
      status: 'VALID'
    });
  });

  // 4. Collect active items based on selected rank
  let activeItems = [];
  if (selectedRank === 'BASELINE' || !evalResults.rankedSolutions) {
    activeItems = [...rawItems];
  } else {
    const tier = (evalResults.rankedSolutions || []).find(r => String(r.rank) === String(selectedRank));
    if (tier && tier.items && tier.items.length > 0) {
      activeItems = [...tier.items];
    } else {
      activeItems = [...rawItems];
    }
  }

  // 5. Populate SKU Nodes
  activeItems.forEach((item, idx) => {
    const subsystem = getSubsystemForSku(item);
    const isFixInjected = item.isFixInjected || item.isResolved || (item.rule && item.rule.includes('CLIC'));
    const isAmbiguous = item.isAmbiguous ||
                        item.needsHumanClarification ||
                        item.category === 'Unknown' ||
                        (evalResults.unclassifiedSkus && evalResults.unclassifiedSkus.includes(item.sku)) ||
                        (evalResults.errors && evalResults.errors.some(e => typeof e === 'string' && e.includes(item.sku) && (e.includes('ambiguous') || e.includes('unknown'))));

    let status = 'VALID';
    if (isAmbiguous) {
      status = 'NEEDS_HUMAN_CLARIFICATION';
    } else if (isFixInjected) {
      status = 'FIX_APPLIED';
    }

    const skuNode = {
      id: `node-sku-${item.sku || idx}-${idx}`,
      type: 'SKU_ITEM',
      sku: item.sku || `ITEM-${idx + 1}`,
      label: item.description || item.sku || 'Server Component',
      category: item.category || 'Hardware',
      subCategory: item.subCategory || '',
      quantity: Number(item.quantity || item.qty || 1),
      unitPriceUsd: Number(item.unitPriceUsd || item.price || 0),
      extendedPriceUsd: Number(item.extendedPriceUsd || (item.quantity || 1) * (item.unitPriceUsd || 0)),
      subsystem,
      productFamily,
      status,
      optionType: item.optionType || 'CTO',
      rationale: item.rationale || item.rule || (isAmbiguous ? 'Requires Human-in-the-Loop review & classification.' : null)
    };

    nodes.push(skuNode);

    if (isFixInjected) {
      fixes.push(skuNode);
    }
    if (isAmbiguous) {
      ambiguities.push(skuNode);
    }

    // Edge from Subsystem Hub to SKU Node
    edges.push({
      id: `edge-${subsystem}-to-${skuNode.id}`,
      source: `node-sub-${subsystem}`,
      target: skuNode.id,
      type: 'COMPONENT_LINK',
      status
    });
  });

  // 6. Detect Gaps / Missing Mandatory Hardware (when in BASELINE mode)
  if (selectedRank === 'BASELINE') {
    const errors = evalResults.errors || [];
    const missingDeps = evalResults.missingDependencies || [];

    // Aspect 1: Thermal Fans Gap
    if (evalResults.hasHighPerfFans === false || errors.some(e => typeof e === 'string' && e.toLowerCase().includes('fan'))) {
      const gapNode = {
        id: 'gap-thermal-fans',
        type: 'GAP_MISSING',
        subsystem: 'COMPUTE',
        sku: 'P69728-B21/P67000-B21',
        label: 'Missing High-Performance Fan Kit',
        reason: `Processors exceed 300W TDP (${evalResults.maxCpuTdpWatts || 350}W detected). Standard fans will cause thermal throttling.`,
        severity: 'CRITICAL',
        status: 'GAP_MISSING',
        suggestedFix: 'HPE DL380 Gen12 High Performance Fan Kit',
        category: 'Thermal Subsystem'
      };
      nodes.push(gapNode);
      gaps.push(gapNode);
      edges.push({
        id: 'edge-gap-thermal-fans',
        source: 'node-sub-COMPUTE',
        target: gapNode.id,
        type: 'DEPENDENCY_GAP',
        status: 'GAP_MISSING'
      });
    }

    // Aspect 2: Memory Symmetry Gap
    if (evalResults.isBalancedChannel === false || errors.some(e => typeof e === 'string' && (e.toLowerCase().includes('memory') || e.toLowerCase().includes('dimm')))) {
      const gapNode = {
        id: 'gap-memory-balance',
        type: 'GAP_MISSING',
        subsystem: 'MEMORY',
        sku: 'DIMM-SYMMETRY',
        label: 'Unbalanced Memory Channel Population',
        reason: `${evalResults.memoryCount || 0} DIMMs populated across sockets. Requires 8 or 16 DIMMs per CPU for 100% bus bandwidth.`,
        severity: 'WARNING',
        status: 'GAP_MISSING',
        suggestedFix: 'Populate DIMMs in multiples of 8 per socket (1DPC)',
        category: 'Memory Subsystem'
      };
      nodes.push(gapNode);
      gaps.push(gapNode);
      edges.push({
        id: 'edge-gap-memory-balance',
        source: 'node-sub-MEMORY',
        target: gapNode.id,
        type: 'DEPENDENCY_GAP',
        status: 'GAP_MISSING'
      });
    }

    // Aspect 3: Smart Storage Battery Gap
    if (evalResults.hasSmartBattery === false && evalResults.hasStorageController === true) {
      const gapNode = {
        id: 'gap-storage-battery',
        type: 'GAP_MISSING',
        subsystem: 'STORAGE',
        sku: 'P01366-B21 / P02377-B21',
        label: 'Missing Smart Storage Hybrid Battery / Capacitor',
        reason: 'Tri-Mode / MR Storage Controller is selected with Write-Back Cache, but no battery backup capacitor is present in BOM.',
        severity: 'CRITICAL',
        status: 'GAP_MISSING',
        suggestedFix: 'HPE 96W Smart Storage Battery (145mm Cable) Kit',
        category: 'Storage Controllers'
      };
      nodes.push(gapNode);
      gaps.push(gapNode);
      edges.push({
        id: 'edge-gap-storage-battery',
        source: 'node-sub-STORAGE',
        target: gapNode.id,
        type: 'DEPENDENCY_GAP',
        status: 'GAP_MISSING'
      });
    }

    // Aspect 4: Power DC Lug Kit Gap
    if (evalResults.hasDcPowerSupply === true && evalResults.hasDcLugKit === false) {
      const gapNode = {
        id: 'gap-power-dc-lug',
        type: 'GAP_MISSING',
        subsystem: 'POWER_THERMAL',
        sku: '800W-DC-LUG-KIT',
        label: 'Missing -48VDC Power Supply Cable Lug Kit',
        reason: 'DC Flex Slot Power Supplies selected without mandatory terminal lug cable connection kit.',
        severity: 'CRITICAL',
        status: 'GAP_MISSING',
        suggestedFix: 'HPE DC Power Cable Lug Kit',
        category: 'Power Infrastructure'
      };
      nodes.push(gapNode);
      gaps.push(gapNode);
      edges.push({
        id: 'edge-gap-power-dc-lug',
        source: 'node-sub-POWER_THERMAL',
        target: gapNode.id,
        type: 'DEPENDENCY_GAP',
        status: 'GAP_MISSING'
      });
    }

    // Aspect 5: Missing Dependencies from Evaluator
    missingDeps.forEach((dep, idx) => {
      const gapNode = {
        id: `gap-eval-dep-${idx}`,
        type: 'GAP_MISSING',
        subsystem: getSubsystemForSku({ description: dep.name || dep.text || dep }),
        sku: dep.sku || 'DEPENDENCY-GAP',
        label: dep.name || dep.text || String(dep),
        reason: dep.reason || 'Required companion SKU missing from customer quote.',
        severity: 'CRITICAL',
        status: 'GAP_MISSING',
        suggestedFix: dep.suggestedSku || 'Auto-inject mandatory SKU',
        category: 'Aspect Rule Check'
      };
      nodes.push(gapNode);
      gaps.push(gapNode);
      edges.push({
        id: `edge-gap-dep-${idx}`,
        source: `node-sub-${gapNode.subsystem}`,
        target: gapNode.id,
        type: 'DEPENDENCY_GAP',
        status: 'GAP_MISSING'
      });
    });
  }

  // Calculate Subsystem Item Counts
  SUBSYSTEM_DEFS.forEach(sub => {
    const hub = nodes.find(n => n.id === `node-sub-${sub.id}`);
    if (hub) {
      hub.itemCount = nodes.filter(n => n.subsystem === sub.id && n.type !== 'SUBSYSTEM_HUB').length;
      hub.hasGaps = nodes.some(n => n.subsystem === sub.id && n.type === 'GAP_MISSING');
    }
  });

  const validCount = nodes.filter(n => n.status === 'VALID' && n.type === 'SKU_ITEM').length;
  const gapCount = gaps.length;
  const fixCount = fixes.length;
  const renderLatencyMs = Date.now() - startTime;

  return {
    rootNode,
    subProducts,
    nodes,
    edges,
    gaps,
    fixes,
    ambiguities,
    stats: {
      totalNodes: nodes.length,
      validCount,
      gapCount,
      fixCount,
      ambiguityCount: ambiguities.length,
      isBuildable: gapCount === 0 && ambiguities.length === 0,
      subsystemsCount: SUBSYSTEM_DEFS.length
    },
    diagnostics: {
      renderLatencyMs,
      productFamily,
      subProductsCount: subProducts.length,
      totalSkusMapped: validCount + fixCount,
      completenessScore: gapCount === 0 ? 100 : Math.max(10, Math.round((validCount / (validCount + gapCount)) * 100)),
      validationTimestamp: new Date().toISOString()
    }
  };
}
