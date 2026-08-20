import React from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

export default function StepStageCard({
  stage,
  isSelected,
  onSelect,
  status,
  metrics,
  IconComponent
}) {
  const isRunning = status === 'IN_PROGRESS';
  const isComplete = status === 'COMPLETED';
  const isWarning = status === 'WARNING' || status === 'BLOCKED';

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
        isSelected
          ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-50'
          : isRunning
          ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-100 animate-pulse'
          : isComplete
          ? 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
          : isWarning
          ? 'bg-amber-50/50 border-amber-300'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              isComplete ? 'bg-emerald-100 text-emerald-700' :
              isRunning ? 'bg-blue-100 text-blue-700' :
              isWarning ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {IconComponent ? <IconComponent className="w-4 h-4" /> : null}
            </div>
            <span className="font-bold text-xs text-slate-800 truncate max-w-[120px]">
              {stage.title}
            </span>
          </div>

          <div>
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : isRunning ? (
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-slate-300" />
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug mb-2">
          {stage.subtitle || stage.description}
        </p>
      </div>

      {metrics && (
        <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-600 flex items-center justify-between">
          <span className="font-medium text-slate-500">{metrics.label || 'Status'}:</span>
          <span className="font-bold text-slate-800 font-mono">{metrics.value || 'Active'}</span>
        </div>
      )}
    </div>
  );
}
