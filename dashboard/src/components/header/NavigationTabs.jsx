import React from 'react';
import { 
  LayoutDashboard, Table, FileSpreadsheet, Activity, Terminal, MessageSquare, Settings, ShieldAlert
} from 'lucide-react';

const TABS = [
  { id: 'orchestrator', label: 'BOQ Evaluator', icon: LayoutDashboard },
  { id: 'matrix', label: 'Resolution Matrix', icon: Table },
  { id: 'catalog', label: 'Catalog Explorer', icon: FileSpreadsheet },
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
      <nav className="flex items-center gap-1 overflow-x-auto py-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
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
