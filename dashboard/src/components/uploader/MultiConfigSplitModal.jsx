import React from 'react';
import { X, Layers, CheckCircle2 } from 'lucide-react';

export default function MultiConfigSplitModal({
  isOpen,
  onClose,
  preflightData,
  confirmedSplits,
  onConfirmSplit,
  onEvaluateSplit
}) {
  if (!isOpen || !preflightData) return null;

  const variations = preflightData.configVariations || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-config-modal-title"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between mb-4 shrink-0">
          <div>
            <span className="badge badge-purple mb-1">Multi-Configuration Split Analysis</span>
            <h3 id="multi-config-modal-title" className="text-base font-bold text-slate-900">
              Isolated Hardware BOM Variation Cluster(s)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The engine partitioned your quote into {variations.length} distinct server build(s).
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {variations.map((v, idx) => {
            const isConfirmed = confirmedSplits.has(v.id || idx);
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      Configuration Variation #{idx + 1}
                    </span>
                    <span className="badge badge-blue font-mono text-[10px]">
                      {v.multiplier || 1}x Node(s)
                    </span>
                  </div>
                  <button
                    onClick={() => onConfirmSplit(v.id || idx, v.splitReason || 'User Confirmed')}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                      isConfirmed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {isConfirmed ? 'Rule Saved' : 'Confirm Split & Learn Rule'}
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p><span className="font-medium text-slate-700">Split Reason: </span>{v.splitReason || 'Distinct CTO baseline and hardware envelope'}</p>
                  <p><span className="font-medium text-slate-700">Identified SKUs: </span>{v.items?.length || 0} component lines</p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => onEvaluateSplit(v)}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Evaluate Only Variation #{idx + 1}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
