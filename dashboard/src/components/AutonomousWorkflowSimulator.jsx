import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft,
  CheckCircle2, Check, RefreshCw, Zap,
  Brain, ShieldCheck, FileUp, Layers, Repeat,
  Database, BarChart3, LayoutDashboard, Sparkles,
  Cpu, Thermometer, BatteryCharging
} from 'lucide-react';
import { 
  ALL_STAGES, 
  SIMULATOR_SCENARIOS 
} from '../config/workflowStages';

const ICON_MAP = {
  FileUp,
  Sparkles,
  ShieldCheck,
  Layers,
  Brain,
  LayoutDashboard,
  Repeat,
  BarChart3,
  Database
};

function getIcon(name) {
  return ICON_MAP[name] || FileUp;
}

export default function AutonomousWorkflowSimulator({
  onApplyScenarioResults: _onApplyScenarioResults,
  onClose: _onClose
}) {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5x, 1x, 2x
  const [substepProgress, setSubstepProgress] = useState(0);

  const scenario = SIMULATOR_SCENARIOS[selectedScenarioIdx] || SIMULATOR_SCENARIOS[0];
  const step = ALL_STAGES[currentStepIdx] || ALL_STAGES[0];
  const timerRef = useRef(null);
  const substepTimerRef = useRef(null);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (substepTimerRef.current) clearInterval(substepTimerRef.current);
      return;
    }

    const duration = (step.durationSec * 1000) / playbackSpeed;
    const substepCount = step.substeps?.length || 1;
    const intervalTime = duration / (substepCount + 1);

    setSubstepProgress(0);

    substepTimerRef.current = setInterval(() => {
      setSubstepProgress(prev => Math.min(prev + 1, substepCount));
    }, intervalTime);

    timerRef.current = setTimeout(() => {
      clearInterval(substepTimerRef.current);
      setSubstepProgress(substepCount);

      if (currentStepIdx < ALL_STAGES.length - 1) {
        setCurrentStepIdx(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, duration);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(substepTimerRef.current);
    };
  }, [isPlaying, currentStepIdx, selectedScenarioIdx, playbackSpeed, step]);

  const handlePlayPause = () => {
    if (!isPlaying && currentStepIdx === ALL_STAGES.length - 1) {
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
    if (currentStepIdx < ALL_STAGES.length - 1) {
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
            Automated Lifecycle Simulation & Live Step Execution
          </h2>
          <p className="text-xs text-slate-500">
            Witness the entire 9-stage lifecycle execute autonomously with deliberate pacing, aspect checks, confidence scoring, and closed-loop learning.
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
            {SIMULATOR_SCENARIOS.map((sc, sIdx) => (
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
            Gen: {scenario.gen} (Isolated &mdash; No DL380a cross-bleed)
          </span>
          <span className="text-slate-600">/</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
            Chassis: {scenario.chassis}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-300 font-medium">
            Active Workitem: <strong className="text-white">{scenario.skus?.length || 0} Items</strong>
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
            <span>{isPlaying ? 'Pause Simulation' : (currentStepIdx === ALL_STAGES.length - 1 ? 'Replay Workflow' : '▶ Run Autonomous Workflow')}</span>
          </button>

          <button aria-label="Reset to beginning"
            onClick={handleReset}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Reset to beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-6 w-[1px] bg-slate-200 mx-1" />

          <button aria-label="Previous Step"
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
            Step {currentStepIdx + 1} of {ALL_STAGES.length}
          </span>

          <button aria-label="Next Step"
            onClick={handleStepForward}
            disabled={currentStepIdx === ALL_STAGES.length - 1 || isPlaying}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              currentStepIdx === ALL_STAGES.length - 1 || isPlaying ? 'text-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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

      {/* 9-STAGE HORIZONTAL STEPPER WITH REAL-TIME ACTIVE GLOW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2">
        {ALL_STAGES.map((s, idx) => {
          const isCurrent = currentStepIdx === idx;
          const isDone = currentStepIdx > idx;
          const StepIcon = getIcon(s.iconName);

          let cardStyle = 'border-slate-200 bg-slate-50/70 text-slate-500 opacity-80 hover:border-slate-300 hover:opacity-100';
          if (isCurrent) {
            cardStyle = 'border-blue-500 bg-blue-50/90 text-blue-900 shadow-md animate-step-active scale-[1.02]';
          } else if (isDone) {
            cardStyle = 'border-emerald-200 bg-emerald-50/60 text-emerald-900 shadow-2xs';
          }

          return (
            <button
              key={s.id}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIdx(idx);
                setSubstepProgress(idx < currentStepIdx ? (s.substeps?.length || 1) : 0);
              }}
              className={`p-2.5 rounded-xl border text-left transition-all duration-300 cursor-pointer relative overflow-hidden ${cardStyle} ${isDone ? 'animate-step-complete' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                  isCurrent ? 'bg-blue-600 text-white shadow-2xs' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  0{s.stageNumber}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : isCurrent && isPlaying ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                ) : (
                  <StepIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                )}
              </div>

              <h4 className="text-[11px] font-bold truncate leading-tight">{s.shortTitle}</h4>

              {/* Mini Substep Progress Bar */}
              {isCurrent && s.substeps && (
                <div className="w-full h-1 bg-blue-200 rounded-full mt-1.5 overflow-hidden">
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
              0{step.stageNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">{step.title}</h3>
                <span className="badge badge-blue text-[10px] font-bold">{step.badge}</span>
                {step.category && (
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono font-bold border border-indigo-200">
                    {step.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{step.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Completed: <strong>{substepProgress}</strong> / {step.substeps?.length || 0} checks
            </span>
          </div>
        </div>

        {/* SUBSTEPS EXECUTION LOG WITH ANIMATED CHECKMARKS & RULE CODES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {step.substeps?.map((sub, sIdx) => {
            const isSubDone = substepProgress > sIdx;
            const isSubActive = substepProgress === sIdx && isPlaying;

            return (
              <div
                key={sub.id || sIdx}
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold truncate">{sub.title}</span>
                    {sub.ruleCode && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-200 text-slate-700 shrink-0">
                        {sub.ruleCode}
                      </span>
                    )}
                  </div>
                  {sub.detail && (
                    <p className="text-[10px] opacity-80 mt-0.5 leading-tight line-clamp-1">{sub.detail}</p>
                  )}
                </div>
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
