import React from 'react';
import { 
  LayoutDashboard, Table, FileSpreadsheet, Activity, Terminal, MessageSquare, Settings, ShieldAlert, FileCode
} from 'lucide-react';

const TABS = [
  { id: 'orchestrator', label: 'BOQ Evaluator', icon: LayoutDashboard },
  { id: 'matrix', label: 'Resolution Matrix', icon: Table },
  { id: 'catalog', label: 'Catalog Explorer', icon: FileSpreadsheet },
  { id: 'artifacts', label: 'Artifacts & Audit', icon: FileCode },
  { id: 'telemetry', label: 'Agentic Insights', icon: Activity },
  { id: 'pipeline', label: 'Pipeline Ops', icon: Terminal }
];

export default function NavigationTabs({
  activeTab,
  setActiveTab,
  onOpenFeedbackDrawer,
  onOpenQuarantineDrawer,
  onOpenSettings
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
      <nav aria-label="Dashboard views" className="flex min-w-0 items-center py-1">
        <select
          aria-label="More dashboard views"
          className="max-w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 lg:hidden"
          value={TABS.some(tab => tab.id === activeTab) ? activeTab : 'pipeline'}
          onChange={event => setActiveTab(event.target.value)}
        >
          {TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
        </select>
        <div className="hidden items-center gap-1 lg:flex">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold motion-safe:transition-colors motion-safe:duration-150 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
        </div>
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <button
          aria-label="Knowledge Quarantine Vault"
          onClick={onOpenQuarantineDrawer}
          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
          title="Knowledge Quarantine Vault (Inspect / Promote AI Rules)"
        >
          <ShieldAlert className="w-4 h-4" />
        </button>
        <button
          aria-label="HITL Feedback & Learning"
          onClick={onOpenFeedbackDrawer}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="HITL Feedback & Learning"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          aria-label="Settings"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
