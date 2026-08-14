import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft,
  CheckCircle2, RefreshCw, Zap,
  Brain, ShieldCheck, FileUp, Layers, Repeat,
  Database,
  Cpu, Thermometer, BatteryCharging,
  Sparkles
} from 'lucide-react';

const SCENARIOS = [
  {
    id: 'gen12-thermal-battery',
    title: 'HPE ProLiant DL380 Gen12 — High-TDP & Smart Storage Battery Remediation',
    family: 'ProLiant',
    gen: 'Gen12',
    genIsolated: true,
    chassis: 'DL380_Gen12_SFF',
    chassisName: 'HPE ProLiant DL380 Gen12 SFF CTO Server (P73282-B21)',
    skus: [
      { sku: 'P73282-B21', qty: 1, name: 'HPE ProLiant DL380 Gen12 SFF CTO Server', category: 'Chassis', type: 'CTO' },
      { sku: 'P74573-B21', qty: 2, name: 'Intel Xeon 6730P 2.5GHz 32C 250W Processor', category: 'Processor', type: 'Standard', tdp: 250 },
      { sku: 'P69728-B21', qty: 16, name: 'HPE 64GB Dual Rank x4 DDR5-6400 Smart Memory Kit', category: 'Memory', type: 'Standard' },
      { sku: 'P47777-B21', qty: 1, name: 'HPE MR416i-p Gen11 Storage Controller', category: 'Storage Controller', type: 'Standard' },
      { sku: 'P03178-B21', qty: 2, name: 'HPE 1000W Flex Slot Titanium Power Supply', category: 'Power Supply', type: 'Standard', watts: 1000 }
    ],
    remediationSkus: [
      { sku: 'P48820-B21', qty: 1, name: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit', reason: 'High CPU TDP (>240W) Thermal Requirement' },
      { sku: 'P01366-B21', qty: 1, name: 'HPE 96W Smart Storage Battery 145mm Cable', reason: 'MR416i-p Storage Controller Write Cache Power' }
    ]
  },
  {
    id: 'telco-dc-memory',
    title: 'Telco -48VDC Power Supply Lug Kit & 16-Channel Balanced Population',
    family: 'ProLiant',
    gen: 'Gen12',
    genIsolated: true,
    chassis: 'DL380_Gen12_SFF',
    chassisName: 'HPE ProLiant DL380 Gen12 Telco NEBS SFF CTO (P73282-B21)',
    skus: [
      { sku: 'P73282-B21', qty: 1, name: 'HPE ProLiant DL380 Gen12 SFF CTO Server', category: 'Chassis', type: 'CTO' },
      { sku: 'P74571-B21', qty: 2, name: 'Intel Xeon 6710 2.4GHz 16C 185W Processor', category: 'Processor', type: 'Standard', tdp: 185 },
      { sku: 'P69728-B21', qty: 16, name: 'HPE 64GB Dual Rank x4 DDR5-6400 Smart Memory Kit', category: 'Memory', type: 'Standard' },
      { sku: 'P18967-B21', qty: 2, name: 'HPE 1600W -48VDC Hot Plug Power Supply Kit', category: 'Power Supply', type: 'Standard', isDC: true }
    ],
    remediationSkus: [
      { sku: 'P36877-B21', qty: 2, name: 'HPE 48VDC Power Supply Lug Kit', reason: 'Mandatory DC Power Cable Lug Connection' }
    ]
  }
];

const STEPS = [
  {
    stageId: 1,
    title: 'BOM Quote Ingestion & SKU Tokenization',
    subtitle: 'Extract raw text/CSV, normalize HPE -B21 SKUs, check Option Types & MEA exclusions',
    icon: FileUp,
    badge: 'Stage 1.1',
    durationSec: 2.2,
    substeps: [
      'Normalizing SKU string patterns against centralized regex (Rule #35)',
      'Validating Option Types (CTO Base vs BTO vs FIO Factory-Integrated)',
      'Checking Dubai MEA TAA/GTA exclusion rules (Rule #33)',
      'Calculating total BOM cost and BOM item count'
    ]
  },
  {
    stageId: 2,
    title: '6-Aspect Deterministic Physical Math Engine',
    subtitle: 'Run deterministic math for TDP, memory channels, storage tri-mode, PCIe, power, and support',
    icon: ShieldCheck,
    badge: 'Stage 1.2',
    durationSec: 3.0,
    substeps: [
      'Thermal & TDP Math: 2x 250W CPUs = 500W TDP (>240W threshold) → Missing High-Perf Fan Kit P48820-B21',
      'Memory Topology: 16 DIMMs / 2 Sockets = 8 DIMMs/socket (1DPC Balanced Symmetry Certified)',
      'Storage Tri-Mode: MR416i-p Controller detected → Missing 96W Smart Storage Battery P01366-B21',
      'Power Redundancy: 2x 1000W Flex Slot PSUs = 2000W Capacity (N+1 Redundancy Certified)',
      'PCIe Risers & OCP NICs: Primary 3-slot PCIe Gen5 riser math verified',
      'Pointnext Tech Care: 3-Year 24x7 Support SKU verified'
    ]
  },
  {
    stageId: 3,
    title: 'Dual-Brain Agentic Guardrail & NotebookLM RAG',
    subtitle: 'Query Gemini LLM intent verifier and NotebookLM QuickSpecs source grounding',
    icon: Brain,
    badge: 'Stage 1.3',
    durationSec: 2.5,
    substeps: [
      'Gemini LLM Intent Verification: Fact-checking workload DNA for High Performance Fan requirement',
      'NotebookLM QuickSpecs RAG: Grounding against official DL380 Gen12 PDF source docs',
      'Cross-checking CTO base rules with 98 scraped OCA catalog entries',
      'Confidence Score deduction calculation: Base 1.00 - 0.20 (Thermal) - 0.20 (Battery) = 60% Initial'
    ]
  },
  {
    stageId: 4,
    title: '5-Tier Strategic Resolution Matrix Synthesis',
    subtitle: 'Generate Rank 1 (Intent Preserved) through Rank 5 (Budget Minimized) without hallucinated SKUs',
    icon: Layers,
    badge: 'Stage 1.4',
    durationSec: 2.8,
    substeps: [
      'Rank 1 (Intent Match): Injected High-Perf Fan (P48820-B21) + Smart Battery (P01366-B21) → 100% Confidence',
      'Rank 2 (Performance Optimized): Upgraded 96GB DIMMs + Dual MR416i-p controllers',
      'Rank 3 (Cost Balanced): Standard fans with 205W Xeon CPUs',
      'Rank 4 (High-Availability): 2x Redundant Storage Batteries + 1600W Titanium PSUs',
      'Rank 5 (Budget Minimized): Removed redundant options, trimmed accessories ($6,420 budget savings)'
    ]
  },
  {
    stageId: 5,
    title: 'HPE Partner Portal Quote Reconciliation',
    subtitle: 'Line-by-line verification between vendor quote BOM and Rank 1 Strategy Matrix',
    icon: Repeat,
    badge: 'Stage 2.1',
    durationSec: 2.5,
    substeps: [
      'Tokenizing Partner Portal Quote items and mapping to OCA internal IDs',
      'Matching chassis base variant P73282-B21 (100% Match)',
      'Detecting missing Fan Kit in initial quote and certifying remediation in Rank 1',
      'Synthesizing discrepancy audit ledger and variance report'
    ]
  },
  {
    stageId: 6,
    title: 'Closed-Loop HITL Ambiguity Learning & Knowledge Sync',
    subtitle: 'Capture human-in-the-loop decisions, record atomic KnowledgeDeltas, and update RAG registry',
    icon: Database,
    badge: 'Stage 2.2',
    durationSec: 2.2,
    substeps: [
      'Human-in-the-Loop clarification recorded: Verified High-Perf Fan rule for Gen12 250W CPUs',
      'Writing KnowledgeDelta atomically to outputs/history/catalog_deltas.json via safeWriteJsonAtomic',
      'Updating Master Catalog Registry (785 SKUs across 5 certified product lines)',
      'Generating NotebookLM markdown sync payload: notebook_sync_payload_DL380_Gen12_SFF.md'
    ]
  }
];

export default function AutonomousWorkflowSimulator({
  _onApplyScenarioResults,
  _onClose
}) {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5x, 1x, 2x
  const [substepProgress, setSubstepProgress] = useState(0);

  const scenario = SCENARIOS[selectedScenarioIdx];
  const step = STEPS[currentStepIdx];
  const timerRef = useRef(null);
  const substepTimerRef = useRef(null);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (substepTimerRef.current) clearInterval(substepTimerRef.current);
      return;
    }

    const duration = (step.durationSec * 1000) / playbackSpeed;
    const intervalTime = duration / (step.substeps.length + 1);

    setSubstepProgress(0);
    let currentSub = 0;

    substepTimerRef.current = setInterval(() => {
      currentSub += 1;
      setSubstepProgress(prev => Math.min(prev + 1, step.substeps.length));
    }, intervalTime);

    timerRef.current = setTimeout(() => {
      clearInterval(substepTimerRef.current);
      setSubstepProgress(step.substeps.length);

      if (currentStepIdx < STEPS.length - 1) {
        setCurrentStepIdx(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, duration);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(substepTimerRef.current);
    };
  }, [isPlaying, currentStepIdx, selectedScenarioIdx, playbackSpeed]);

  const handlePlayPause = () => {
    if (!isPlaying && currentStepIdx === STEPS.length - 1) {
      setCurrentStepIdx(0);
      setSubstepProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
    setSubstepProgress(0);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStepIdx < STEPS.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
      setSubstepProgress(0);
    }
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
      setSubstepProgress(0);
    }
  };

  // Confidence calculations
  const isPostResolution = currentStepIdx >= 3;
  const confidenceScore = isPostResolution ? 100 : (currentStepIdx === 0 ? 95 : 60);

  return (
    <div className="glass-card border border-blue-200/80 bg-gradient-to-b from-blue-50/40 via-white to-slate-50/50 rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in relative overflow-hidden">
      
      {/* Background Accent Graphics */}
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Sparkles className="w-48 h-48 text-blue-900" />
      </div>

      {/* HEADER & SCENARIO SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-blue flex items-center gap-1 text-[11px] font-bold">
              <Zap className="w-3.5 h-3.5 text-blue-600" /> Autonomous Workflow Orchestrator
            </span>
            <span className="badge badge-emerald flex items-center gap-1 text-[11px] font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Real-time Execution
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Automated Lifecycle Simulation &amp; Live Step Execution
          </h2>
          <p className="text-xs text-slate-500">
            Witness the entire 6-stage lifecycle execute autonomously with deliberate pacing, aspect checks, confidence scoring, and closed-loop learning.
          </p>
        </div>

        {/* Scenario Picker */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Scenario:</label>
          <select
            value={selectedScenarioIdx}
            onChange={(e) => {
              setSelectedScenarioIdx(Number(e.target.value));
              handleReset();
            }}
            disabled={isPlaying}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-2xs cursor-pointer [color-scheme:light]"
          >
            {SCENARIOS.map((sc, sIdx) => (
              <option key={sc.id} value={sIdx}>{sc.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CONTEXT HIERARCHY BANNER (Strict Generation Isolation) */}
      <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Context Hierarchy:</span>
          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold border border-blue-800">
            Family: {scenario.family}
          </span>
          <span className="text-slate-600">/</span>
          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-800">
            Gen: {scenario.gen} (Isolated — No DL380a cross-bleed)
          </span>
          <span className="text-slate-600">/</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
            Chassis: {scenario.chassis}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-300 font-medium">
            Active Workitem: <strong className="text-white">{scenario.skus.length} Items</strong>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-mono border border-slate-700">
            Dual-Brain MCP: ONLINE
          </span>
        </div>
      </div>

      {/* WORKFLOW PLAYBACK CONTROLS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isPlaying ? 'Pause Simulation' : (currentStepIdx === STEPS.length - 1 ? 'Replay Workflow' : '▶ Run Autonomous Workflow')}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Reset to beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-6 w-[1px] bg-slate-200 mx-1" />

          <button
            onClick={handleStepBackward}
            disabled={currentStepIdx === 0 || isPlaying}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              currentStepIdx === 0 || isPlaying ? 'text-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-slate-700 font-mono px-2">
            Step {currentStepIdx + 1} of {STEPS.length}
          </span>

          <button
            onClick={handleStepForward}
            disabled={currentStepIdx === STEPS.length - 1 || isPlaying}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              currentStepIdx === STEPS.length - 1 || isPlaying ? 'text-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Pacing:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  playbackSpeed === spd ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-slate-200 mx-1" />

          {/* Dynamic Confidence Score Gauge */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-slate-500 font-medium">Confidence:</span>
            <span className={`text-xs font-mono font-extrabold ${
              confidenceScore >= 85 ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {confidenceScore}%
            </span>
            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full progress-bar-fill ${
                  confidenceScore >= 85 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6-STAGE HORIZONTAL STEPPER WITH REAL-TIME ACTIVE GLOW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {STEPS.map((s, idx) => {
          const isCurrent = currentStepIdx === idx;
          const isDone = currentStepIdx > idx;
          const StepIcon = s.icon;

          let cardStyle = 'border-slate-200 bg-slate-50/70 text-slate-500 opacity-80 hover:border-slate-300 hover:opacity-100';
          if (isCurrent) {
            cardStyle = 'border-blue-500 bg-blue-50/90 text-blue-900 shadow-md animate-step-active scale-[1.02]';
          } else if (isDone) {
            cardStyle = 'border-emerald-200 bg-emerald-50/60 text-emerald-900 shadow-2xs';
          }

          return (
            <button
              key={s.stageId}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIdx(idx);
                setSubstepProgress(idx < currentStepIdx ? s.substeps.length : 0);
              }}
              className={`p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer relative overflow-hidden ${cardStyle} ${isDone ? 'animate-step-complete' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                  isCurrent ? 'bg-blue-600 text-white shadow-2xs' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {s.badge}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent && isPlaying ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                ) : (
                  <StepIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                )}
              </div>

              <h4 className="text-xs font-bold truncate leading-tight">{s.title}</h4>

              {/* Mini Substep Progress Bar */}
              {isCurrent && (
                <div className="w-full h-1 bg-blue-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 progress-bar-fill"
                    style={{ width: `${(substepProgress / s.substeps.length) * 100}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ACTIVE STAGE DEEP-DIVE CARD WITH SUB-STEPS & CALCULATION GAUGES */}
      <div className="bg-white border-2 border-blue-300/80 rounded-2xl p-5 shadow-lg space-y-4 animate-fade-in relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md shadow-blue-600/20">
              0{step.stageId}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">{step.title}</h3>
                <span className="badge badge-blue text-[10px] font-bold">{step.badge}</span>
              </div>
              <p className="text-xs text-slate-500">{step.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Completed: <strong>{substepProgress}</strong> / {step.substeps.length} checks
            </span>
          </div>
        </div>

        {/* SUBSTEPS EXECUTION LOG WITH ANIMATED CHECKMARKS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {step.substeps.map((sub, sIdx) => {
            const isSubDone = substepProgress > sIdx;
            const isSubActive = substepProgress === sIdx && isPlaying;

            return (
              <div
                key={sIdx}
                className={`p-3 rounded-xl border text-xs transition-all duration-200 flex items-start gap-2.5 ${
                  isSubDone
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                    : isSubActive
                    ? 'border-blue-300 bg-blue-50 text-blue-950 font-bold ring-1 ring-blue-400 animate-pulse'
                    : 'border-slate-200 bg-slate-50/40 text-slate-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isSubDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isSubActive ? (
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                  )}
                </div>
                <span className="leading-snug">{sub}</span>
              </div>
            );
          })}
        </div>

        {/* SPECIAL INTERACTIVE WORKLOAD CONTEXT & REMEDIATION PANEL */}
        {currentStepIdx >= 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Aspect 1: Thermal Math */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Thermal TDP
                </span>
                <span className="font-mono text-[11px] text-rose-600">500W TDP</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                2x 250W CPUs exceed standard fan limit (240W).
              </p>
              <div className="pt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isPostResolution ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isPostResolution ? '✅ High-Perf Fan Injected' : '⚠️ Fan Kit Required'}
                </span>
              </div>
            </div>

            {/* Aspect 2: Storage Battery */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <BatteryCharging className="w-3.5 h-3.5 text-amber-500" /> Storage Battery
                </span>
                <span className="font-mono text-[11px] text-amber-600">MR416i-p</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Controller requires Smart Storage Battery for write-cache.
              </p>
              <div className="pt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isPostResolution ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isPostResolution ? '✅ 96W Battery Injected' : '⚠️ Battery Required'}
                </span>
              </div>
            </div>

            {/* Aspect 3: Memory Topology */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-500" /> Memory 1DPC
                </span>
                <span className="font-mono text-[11px] text-emerald-600">1024 GB</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                16x 64GB DDR5 DIMMs across 16 channels.
              </p>
              <div className="pt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  ✅ 100% Symmetrical
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
