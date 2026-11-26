import React from 'react';
import { Cpu, Zap, HardDrive, Layers, ShieldAlert } from 'lucide-react';

function EnvelopeSectionCard({ icon: Icon, title, children }) {
  return (
    <div className="p-2.5 surface-panel rounded-lg space-y-1.5">
      <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px]">
        <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>{title}</span>
      </div>
      <div className="text-[11px] text-slate-600 space-y-0.5 leading-relaxed">{children}</div>
    </div>
  );
}

function CpuAndOcpCard({ cpu, ocp, pcie }) {
  const risers = Array.isArray(pcie?.riserCombinations) ? pcie.riserCombinations.length : 0;
  return (
    <EnvelopeSectionCard icon={Cpu} title="Compute, OCP & PCIe Topology">
      {cpu && (
        <div>
          Sockets: <strong>{cpu.minSockets ?? 1}–{cpu.maxSockets ?? 'N/A'}</strong>
          {' | '}Max Air TDP: <strong>{cpu.maxAirCooledTdpWatts ?? 'N/A'}W</strong>
        </div>
      )}
      {ocp && (
        <div>
          OCP Slots: <strong>{ocp.minSlots ?? 0}–{ocp.maxSlots ?? 'N/A'}</strong>
        </div>
      )}
      {pcie && (
        <div>
          PCIe Mechanical / Active: <strong>{pcie.baseMechanicalSlots ?? 0}–{pcie.maxMechanicalSlots ?? 'N/A'}</strong>
          {' / '}<strong>{pcie.maxElectricallyActiveSlots ?? 'N/A'}</strong>
          {pcie.maxX16Slots != null && <> (max x16: <strong>{pcie.maxX16Slots}</strong>)</>}
          {risers > 0 && <> · {risers} riser topologies</>}
        </div>
      )}
    </EnvelopeSectionCard>
  );
}

function GpuEnvelopeCard({ gpu }) {
  if (!gpu) return null;
  const dw = gpu.maxDoubleWideGpus ?? 0;
  const sw = gpu.maxSingleWideGpus ?? 0;
  return (
    <EnvelopeSectionCard icon={Zap} title="GPU & Thermal Power Ceiling">
      <div>
        Double-Wide: <strong>{dw}</strong> | Single-Wide: <strong>{sw}</strong>
        {gpu.maxRecommendedForTarget != null && (
          <> · Recommended Max: <strong>{gpu.maxRecommendedForTarget}</strong></>
        )}
      </div>
      <div>
        Catalog Qty Cap: <strong>{gpu.catalogReportedMaxQty ?? 'N/A'}</strong>
        {' | '}Min PSUs for Max GPU: <strong>{gpu.minPsuCountForMaxGpu ?? 'N/A'}</strong>
      </div>
      {gpu.requiresAuxiliaryPowerCables && (
        <div className="text-amber-700 font-medium">Aux GPU power cable kit required</div>
      )}
      {gpu.requiresHighLine220vAboveTdpWatts != null && (
        <div>High-line 200–240V required above <strong>{gpu.requiresHighLine220vAboveTdpWatts}W</strong></div>
      )}
      {gpu.thermalAmbientGatesCount > 0 && (
        <div className="text-amber-700 font-medium">{gpu.thermalAmbientGatesCount} thermal/ambient gate rule(s)</div>
      )}
    </EnvelopeSectionCard>
  );
}

function MemoryEnvelopeCard({ memory }) {
  if (!memory) return null;
  const balanced = Array.isArray(memory.validBalancedTotalDimms) ? memory.validBalancedTotalDimms.join(', ') : '';
  return (
    <EnvelopeSectionCard icon={Layers} title={`Memory Envelope (${memory.generation || 'DDR'})`}>
      <div>
        Chassis Max DIMMs: <strong>{memory.maxDimmsChassis ?? 'N/A'}</strong>
        {' | '}Current CPU Cap ({memory.cpuCountConsidered ?? 1}P): <strong>{memory.maxDimmsForCurrentCpus ?? 'N/A'}</strong>
      </div>
      <div>
        {memory.channelsPerSocket ?? '?'} ch/socket · {memory.minDimmsPerSocket ?? 1}–{memory.maxDimmsPerSocket ?? '?'} DIMMs/socket
        {' '}({memory.maxDimmsPerChannel ?? '?'} DPC)
      </div>
      <div>
        Max DIMM: <strong>{memory.maxDimmCapacityGb ?? 'N/A'} GB</strong>
        {' | '}Max Capacity: <strong>{memory.maxMemoryCapacityTb ?? 'N/A'} TB</strong>
      </div>
      {balanced && <div>Balanced totals: <span className="font-mono">{balanced}</span></div>}
      {memory.speedDeratingNotice && <div className="text-amber-700">{memory.speedDeratingNotice}</div>}
    </EnvelopeSectionCard>
  );
}

function StorageAndPowerCard({ storage, power, catalogRuleMetrics }) {
  const validPsus = Array.isArray(power?.validPsuCounts) ? power.validPsuCounts.join('/') : '';
  return (
    <EnvelopeSectionCard icon={HardDrive} title="Storage, Power & Rule Gates">
      {storage && (
        <div>
          Drives Min: <strong>{storage.minDrives ?? 0}</strong> | SFF: <strong>{storage.maxSffDrives ?? 0}</strong>
          {' '}LFF: <strong>{storage.maxLffDrives ?? 0}</strong> EDSFF: <strong>{storage.maxEdsffDrives ?? 0}</strong>
        </div>
      )}
      {storage?.requiresExpanderAboveDirectPorts && (
        <div className="text-amber-700">SAS Expander required above direct controller ports</div>
      )}
      {power && (
        <div>
          PSUs: <strong>{power.minPsusPerNode ?? 1}–{power.maxPsusPerNode ?? 2}</strong>
          {' '}(Rec. {power.recommendedRedundantPsus ?? 2}{validPsus ? `, valid: ${validPsus}` : ''})
          {power.supportsDc48V ? ' · -48VDC supported' : ''}
        </div>
      )}
      {catalogRuleMetrics && (
        <div>
          Rules: <strong>{catalogRuleMetrics.totalRules ?? 0}</strong>
          {' '}({catalogRuleMetrics.conditionalAndThermalGates ?? 0} conditional/thermal)
        </div>
      )}
    </EnvelopeSectionCard>
  );
}

function SubcategoryBoundsStrip({ catalogSubcategoryBounds }) {
  const subs = catalogSubcategoryBounds?.subcategories;
  if (!Array.isArray(subs) || subs.length === 0) return null;
  return (
    <div className="border-t border-slate-200 pt-2">
      <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
        <span>Catalog Subcategory Bounds ({catalogSubcategoryBounds.categoryKey || 'All'})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {subs.slice(0, 12).map((sub, idx) => {
          const label = sub.subCategory || sub.category || sub.name || sub.parentCategory || `Category ${idx + 1}`;
          return (
            <div key={sub.subCategory || sub.category || idx} className="surface-panel px-2 py-1 rounded text-[11px] flex justify-between gap-2">
              <span className="truncate font-medium text-slate-700" title={label}>{label}</span>
              <span className="font-mono text-slate-600 tabular-nums shrink-0">{sub.minQty ?? 0}–{sub.maxQty ?? '∞'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HardwareEnvelopeView({ envelope }) {
  if (!envelope) return null;
  const label = `${envelope.platformId || 'Platform'}${envelope.formFactor ? ` · ${envelope.formFactor}` : ''}`;

  return (
    <div className="surface-panel rounded-xl p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          Hardware Capability Envelope ({label})
        </span>
        <span className="badge badge-blue">COMPUTED CAPABILITY ENVELOPE</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <CpuAndOcpCard cpu={envelope.cpu} ocp={envelope.ocp} pcie={envelope.pcie} />
        <GpuEnvelopeCard gpu={envelope.gpu} />
        <MemoryEnvelopeCard memory={envelope.memory} />
        <StorageAndPowerCard
          storage={envelope.storage}
          power={envelope.power}
          catalogRuleMetrics={envelope.catalogRuleMetrics}
        />
      </div>

      <SubcategoryBoundsStrip catalogSubcategoryBounds={envelope.catalogSubcategoryBounds} />
    </div>
  );
}
