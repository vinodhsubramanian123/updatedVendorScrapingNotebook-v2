import React from 'react';
import { 
  LayoutDashboard, Table, FileSpreadsheet, Activity, Terminal, MessageSquare, Settings
} from 'lucide-react';

const TABS = [
  { id: 'evaluator', label: 'BOQ Evaluator', icon: LayoutDashboard },
  { id: 'matrix', label: 'Resolution Matrix', icon: Table },
  { id: 'catalog', label: 'Catalog Explorer', icon: FileSpreadsheet },
  { id: 'telemetry', label: 'Agentic Insights', icon: Activity },
  { id: 'pipeline', label: 'Pipeline Ops', icon: Terminal }
];

export default function NavigationTabs({
  activeTab,
  setActiveTab,
  onOpenFeedbackDrawer,
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
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
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
          onClick={onOpenFeedbackDrawer}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="HITL Feedback & Learning"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
