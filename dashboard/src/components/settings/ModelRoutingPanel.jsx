import React, { useState, useEffect } from 'react';
import { Cpu, Sun, Moon, Sparkles, Terminal, KeyRound } from 'lucide-react';
import { requestJson } from '../../services/api.js';

function AppearanceToggleCard({ theme = 'light', onThemeChange }) {
  return (
    <div className="surface-panel rounded-xl p-3 space-y-2">
      <div className="text-xs font-bold text-slate-800">Workspace Appearance</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onThemeChange?.('light')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
            theme !== 'dark' ? 'badge-emerald' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <Sun className="w-3.5 h-3.5" /> Light Default
        </button>
        <button
          type="button"
          onClick={() => onThemeChange?.('dark')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
            theme === 'dark' ? 'badge-indigo' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <Moon className="w-3.5 h-3.5" /> Dark Studio
        </button>
      </div>
    </div>
  );
}

function RuntimeTierRows({ tiers = {} }) {
  const entries = Object.entries(tiers);
  if (entries.length === 0) return <p className="text-[11px] text-slate-500">No model routing tiers configured.</p>;
  return (
    <div className="space-y-1.5">
      {entries.map(([tierName, cfg]) => (
        <div key={tierName} className="surface-panel rounded-lg px-2.5 py-2 flex items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-slate-800 block">{tierName}</span>
            <span className="text-[10px] font-mono text-slate-500">{(cfg?.fallbackModels || []).join(' → ') || 'No fallback'}</span>
          </div>
          <span className="badge badge-blue font-mono whitespace-nowrap shrink-0">{cfg?.model || 'default'}</span>
        </div>
      ))}
    </div>
  );
}

export default function ModelRoutingPanel({ theme = 'light', onThemeChange }) {
  const [routingData, setRoutingData] = useState(null);
  const [runtimeData, setRuntimeData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      requestJson('/api/config/model-routing', { signal: controller.signal }).catch(() => null),
      requestJson('/api/agent/runtime-status', { signal: controller.signal }).catch(() => null)
    ]).then(([routing, runtime]) => {
      if (controller.signal.aborted) return;
      if (routing) setRoutingData(routing);
      if (runtime) setRuntimeData(runtime);
    });
    return () => controller.abort();
  }, []);

  const tiers = routingData?.routing?.tiers || {};
  const promptVer = routingData?.activePromptVersion || 'v4';
  const keyPoolCount = runtimeData?.geminiKeyCount ?? routingData?.keyPool?.totalKeys ?? 0;
  const agyAvailable = Boolean(runtimeData?.agy?.available);

  return (
    <div className="space-y-4">
      <AppearanceToggleCard theme={theme} onThemeChange={onThemeChange} />

      <div className="surface-panel rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            3-Tier Agent Runtime & Prompt Contract
          </span>
          <span className="badge badge-indigo">Guardrail {promptVer}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="surface-panel p-2 rounded-lg flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" /> Gemini Key Pool</span>
            <span className="font-mono font-bold text-slate-800">{keyPoolCount} keys</span>
          </div>
          <div className="surface-panel p-2 rounded-lg flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> Antigravity CLI</span>
            <span className={`badge ${agyAvailable ? 'badge-emerald' : 'badge-amber'}`}>
              {agyAvailable ? 'READY' : 'UNAVAILABLE'}
            </span>
          </div>
        </div>
      </div>

      <div className="surface-panel rounded-xl p-3 space-y-2">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          Task-Tiered Model Routing (model_routing.json)
        </div>
        <RuntimeTierRows tiers={tiers} />
      </div>
    </div>
  );
}
