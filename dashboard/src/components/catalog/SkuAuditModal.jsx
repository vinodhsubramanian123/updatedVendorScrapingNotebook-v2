import React from 'react';
import { History, ShieldCheck, Tag, X } from 'lucide-react';

export default function SkuAuditModal({ selectedSkuAudit, onClose, loadingAudit, skuAuditData }) {
  if (!selectedSkuAudit) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                File-Versioning Audit
              </span>
              <span className="text-xs font-mono text-slate-500">{selectedSkuAudit.sku}</span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-base mt-1 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              SKU Data Layer Versioning & Mutation Audit
            </h3>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingAudit ? (
          <div className="p-8 text-center text-xs text-slate-500">Querying historical catalog snapshots & checksums...</div>
        ) : skuAuditData ? (
          <div className="space-y-4 text-xs">
            {/* Current Status Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Ecosystem Status</span>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Status: {skuAuditData.currentStatus}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Snapshot Occurrences</span>
                <div className="text-sm font-extrabold text-blue-600">{skuAuditData.snapshotOccurrences?.length || 0} Snapshots</div>
              </div>
            </div>

            {/* Historical Snapshot Hashes */}
            {skuAuditData.snapshotOccurrences?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Cryptographic Catalog Snapshots (SHA-256 Hashes)
                </h4>
                <div className="space-y-1.5">
                  {skuAuditData.snapshotOccurrences.map((snap, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between font-mono text-[11px]">
                      <div>
                        <span className="font-bold text-slate-800">{snap.snapshotFile}</span>
                        <span className="ml-2 text-slate-400 text-[10px]">({snap.scrapeDate})</span>
                      </div>
                      <div className="text-slate-500 truncate max-w-[200px]" title={snap.snapshotChecksum}>
                        SHA: {snap.snapshotChecksum.substring(0, 16)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attribute Mutations */}
            {skuAuditData.attributeMutations?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">Attribute & Specification Mutations</h4>
                <div className="space-y-1.5">
                  {skuAuditData.attributeMutations.map((mut, i) => (
                    <div key={i} className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200 text-amber-900">
                      <div className="font-semibold text-[11px]">{mut.field} modified on {mut.date}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        From <span className="line-through">{mut.oldValue}</span> to <span className="font-bold text-emerald-700">{mut.newValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discontinued EOL Info */}
            {skuAuditData.discontinuedInfo && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                <div className="font-bold text-xs">End-Of-Life / Discontinued SKU Record</div>
                <p className="text-[11px]">Discontinued on {skuAuditData.discontinuedInfo.discontinuedDate || 'Recent Scrape'}. Note: {skuAuditData.discontinuedInfo['Table Rule/Note'] || 'SKU removed from HPE OCA catalog.'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400">No version audit data found for this SKU.</div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs cursor-pointer">
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
}
