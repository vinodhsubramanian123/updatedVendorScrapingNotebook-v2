import React from 'react';
import { X, AlertTriangle, Loader, Check } from 'lucide-react';

export default function RejectionModal({
  modalData,
  onClose,
  rejectionText,
  setRejectionText,
  onSubmit,
  isSubmitting,
  rejectionConfirmed,
  rejectionError
}) {
  if (!modalData) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-loop-title"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="badge badge-rose mb-1">Closed-Loop Learning</span>
            <h3 id="feedback-loop-title" className="text-base font-bold text-slate-900">
              Portal Rejection & Rule Feedback Loop
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tested for: <span className="font-semibold text-slate-700">{modalData.title}</span>
            </p>
          </div>
          <button aria-label="Close"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {rejectionConfirmed ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Check className="w-4 h-4 text-emerald-600" />
              Feedback Recorded into Master Knowledge Registry!
            </div>
            <p className="text-xs text-emerald-700">
              Delta ID: <code className="font-mono font-bold">{rejectionConfirmed.deltaId || 'LEARNED_DELTA'}</code>
            </p>
            <p className="text-xs text-slate-600">
              Rule saved to <code className="font-mono text-[11px]">catalog_deltas.json</code> and synced to master knowledge registry.
            </p>
            <button
              onClick={onClose}
              className="mt-3 w-full btn-primary text-xs py-2"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                How this works:
              </div>
              <p className="text-[11px] text-amber-800">
                Paste the exact error message from HPE OCA portal or describe what SKU was auto-inserted/rejected. The engine will extract the rule and update local pre-checks automatically.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Portal Error Message or Configuration Note:
              </label>
              <textarea
                value={rejectionText}
                onChange={e => setRejectionText(e.target.value)}
                placeholder="e.g. 'Rule 81392308 Violation: Chassis P73282-B21 requires P76453-B21 Box 1/2 Cable Kit when MR416i controller is selected' or 'Portal auto-inserted P48820-B21'"
                className="w-full text-xs border border-slate-300 rounded-xl p-3 h-28 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none font-mono"
                required
              />
            </div>

            {rejectionError && (
              <p className="text-xs text-rose-600 font-semibold">{rejectionError}</p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !rejectionText.trim()}
                className="btn-primary text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
                {isSubmitting ? 'Recording Rule...' : 'Record & Learn Rule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
