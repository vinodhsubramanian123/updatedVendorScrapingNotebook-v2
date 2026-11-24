'use strict';
/**
 * scripts/lib/conflict/sizing/voi_clarification_ranker.js — Value-of-Information Intake Triage
 * & Scoped Pitfall Advisory Collector (INV-280)
 */

const { loadActiveKnowledgeRules } = require('../../catalog/active_knowledge_router.js');

const FIELD_VOI_WEIGHTS = Object.freeze({
  resilienceMode: { topologyImpactRank: 1, baseCapExSwingUsd: 24000, whyItMatters: 'Ha/failover policy (N+1 vs 2N) determines chassis node count and fabric redundancy.' },
  workloadFamily: { topologyImpactRank: 2, baseCapExSwingUsd: 20000, whyItMatters: 'Workload profile selects CPU core density, NUMA interleaving, and NVMe endurance tier.' },
  workingSetGb: { topologyImpactRank: 3, baseCapExSwingUsd: 14000, whyItMatters: 'Active working set RAM determines DIMM channel count and per-node vs cluster split.' },
  requiredCores: { topologyImpactRank: 4, baseCapExSwingUsd: 11000, whyItMatters: 'Total core requirement bounds CPU TDP class, High-Perf Fan kit, and PSU tier.' },
  usableStorageTb: { topologyImpactRank: 5, baseCapExSwingUsd: 9500, whyItMatters: 'Usable storage & RAID factor drive cage count, Tri-Mode controller, and SAS expander need.' },
  gpuCount: { topologyImpactRank: 6, baseCapExSwingUsd: 42000, whyItMatters: 'GPU accelerator count dictates DW chassis riser cage, aux 16-pin power cables, and 2400W PSUs.' },
  utilityLineVoltage: { topologyImpactRank: 7, baseCapExSwingUsd: 4500, whyItMatters: 'Low-line 110V vs high-line 208V-240V utility derates PSU capacity and rack power density.' },
  networkFabricSpeed: { topologyImpactRank: 8, baseCapExSwingUsd: 5200, whyItMatters: 'Fabric speed determines OCP3 vs PCIe NIC placement and SFP28/QSFP28 optic selection.' },
  targetSlaTier: { topologyImpactRank: 9, baseCapExSwingUsd: 3800, whyItMatters: 'Support SLA tier (Basic 3Y vs Essential/Critical 5Y) locks SKU service suffix across nodes.' }
});

const SCOPED_PLATFORM_TRAPS = Object.freeze({
  DL380A_GEN12: [
    { trapId: 'TRAP-DL380A-RAID', severity: 'HIGH', title: 'DL380a Gen12 Factory RAID & NS204i-u Decoupling (INV-228)', guidance: 'NS204i-u OS boot cannot co-mingle inside Tri-Mode data RAID volumes; verify FIO RAID levels against NVMe backplane bays.' },
    { trapId: 'TRAP-DL380A-GPU', severity: 'HIGH', title: 'GPU Auxiliary Power Cable & Fan Gate', guidance: 'Multi-GPU DL380a Gen12 builds mandate 16-pin GPU power cables, 2400W Titanium PSUs, and closed-loop High-Perf Fan kits.' }
  ],
  ALLETRA_MP_B10000: [
    { trapId: 'TRAP-B10K-TOPOLOGY', severity: 'HIGH', title: 'Switchless (B10100) vs Switched (B10200) Exclusivity (INV-265)', guidance: 'S0B84A switchless (<=24 drives) and S1R06A switched (1-8 JBOFs, mandatory NVMe-oF switches) cannot mix inside one array.' },
    { trapId: 'TRAP-B10K-NINJA', severity: 'MEDIUM', title: 'Ninja Online Sizing Prerequisite (INV-267)', guidance: 'Core controller node/drive/JBOF sizing must originate in HPE Ninja Online before OCA optical/service BOM completion.' }
  ],
  DL380_GEN12: [
    { trapId: 'TRAP-DL380G12-TDP', severity: 'HIGH', title: 'High-TDP >=240W Thermal & Ambient Gate', guidance: 'Processors >=240W TDP require High Performance Fan Kit, Max-Perf Heatsink, and inlet ambient <=30C unless derated.' },
    { trapId: 'TRAP-DL380G12-OCP', severity: 'MEDIUM', title: 'OCP 3.0 Adapter Contention', guidance: 'Dual OCP requirements trigger PCIe riser arbitration; confirm PCIe x16 riser headroom before committing storage+NIC mix.' }
  ],
  DL360_GEN12: [
    { trapId: 'TRAP-DL360G12-1U', severity: 'HIGH', title: '1U Thermal & Drive-Bay Density Gate', guidance: 'High-TDP CPUs inside 1U DL360 Gen12 restrict front NVMe/EDSFF bay airflow and force specific heatsink/fan assemblies.' }
  ]
});

function _codePointCompare(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

function rankClarificationsByValueOfInformation(missingInputs = [], demandContext = {}) {
  if (!Array.isArray(missingInputs) || missingInputs.length === 0) {
    return { prioritizedClarifications: [], topClarification: null };
  }
  const nodeScale = Math.max(1, Number(demandContext.nodeCount || demandContext.serverCount || 1));
  const seen = new Set();
  const scored = [];

  for (const rawItem of missingInputs) {
    const field = typeof rawItem === 'string' ? rawItem.trim() : String(rawItem?.field || rawItem?.id || '').trim();
    if (!field || seen.has(field)) continue;
    seen.add(field);

    const spec = FIELD_VOI_WEIGHTS[field] || {
      topologyImpactRank: 20,
      baseCapExSwingUsd: 2000,
      whyItMatters: `Missing ${field} leaves hardware sizing tolerances ambiguous.`
    };
    scored.push({
      field,
      topologyImpactRank: spec.topologyImpactRank,
      capExSwingEstimateUsd: Math.round(spec.baseCapExSwingUsd * nodeScale),
      whyItMatters: spec.whyItMatters
    });
  }

  scored.sort((a, b) =>
    a.topologyImpactRank - b.topologyImpactRank ||
    b.capExSwingEstimateUsd - a.capExSwingEstimateUsd ||
    _codePointCompare(a.field, b.field)
  );

  const prioritizedClarifications = scored.map((item, idx) => ({
    priority: idx + 1,
    ...item
  }));
  return {
    prioritizedClarifications,
    topClarification: prioritizedClarifications[0] || null
  };
}

function _normalizePlatformTrapKey(platformOrScope = '') {
  const upper = String(platformOrScope || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (!upper || upper === 'UNKNOWN_PRODUCT' || upper === 'UNSPECIFIED_PLATFORM') return null;
  if (upper.includes('DL380A') && upper.includes('12')) return 'DL380A_GEN12';
  if (upper.includes('ALLETRA') && upper.includes('B10')) return 'ALLETRA_MP_B10000';
  if (upper.includes('DL380') && upper.includes('12')) return 'DL380_GEN12';
  if (upper.includes('DL360') && upper.includes('12')) return 'DL360_GEN12';
  return upper;
}

function collectScopedIntakeTrapAdvisories(platformOrScope, context = {}) {
  const key = _normalizePlatformTrapKey(platformOrScope);
  if (!key) return [];
  const advisories = [...(SCOPED_PLATFORM_TRAPS[key] || [])].map(t => ({ ...t, platformScope: key, source: 'SCOPED_PLATFORM_PROFILE' }));

  try {
    if (context.chassisDir || Array.isArray(context.rawDeltas)) {
      const rules = loadActiveKnowledgeRules(key, context.chassisDir || '', {
        rawDeltas: context.rawDeltas,
        isolated: !context.includeGlobalRegistry
      });
      for (const r of (rules?.mandatoryDependencies || []).slice(0, 3)) {
        advisories.push({
          trapId: r.ruleId || 'SCOPED_RULE',
          severity: 'MEDIUM',
          title: `Mandatory Rule (${r.affectedSku || key} -> ${r.requiredDependencySku || 'kit'})`,
          guidance: r.reasoning || r.ruleUpdate || 'Certified scoped dependency rule applies.',
          platformScope: key,
          source: 'ACTIVE_KNOWLEDGE_ROUTER'
        });
      }
    }
  } catch { /* advisory lookup must never crash sizing */ }

  return advisories;
}

module.exports = {
  rankClarificationsByValueOfInformation,
  collectScopedIntakeTrapAdvisories,
  FIELD_VOI_WEIGHTS
};
