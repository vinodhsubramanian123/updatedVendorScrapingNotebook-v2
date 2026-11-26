import React, { useState } from "react";
import { createPortal } from "react-dom";
import BoqUploader from "../BoqUploader";
import WorkloadDnaCard from "../WorkloadDnaCard";
import ResolutionMatrix from "../ResolutionMatrix";
import AmbiguityInbox from "../AmbiguityInbox";
import PartnerReconciliationView from "../PartnerReconciliationView";
import { BoqTopologyModal } from "../topology";
import { useModalFocus } from "../../hooks/useModalFocus.js";
import { buildBoqRequestPayload, STANDARD_SAMPLE_TEXT } from "../../services/workspaceRequests.js";

function ToolModal({ isOpen, onClose, title, children }) {
  const dialogRef = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;
  const content = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-modal-backdrop"
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="bg-slate-50 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/90 animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</div>
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
export function AppToolModals({
  catalogs,
  activeModal,
  setActiveModal,
  evalResults,
  intakeTopologyData,
  setIntakeTopologyData,
  logStream,
  activeProgress,
  selectedChassis,
  setSelectedCardForFeedback,
  setIsRagOpen,
  handleSmartSearch,
  handleEvaluateBoq,
  handleReEvaluate,
  handleTriggerScrape,
  auditReport,
  setAuditReport,
  boqLocalOnly,
  serverOffline,
  setBoqLocalOnly
}) {
  const [boqProductId, setBoqProductId] = useState('');
  const boqProduct = catalogs.find(catalog => catalog.id === boqProductId);
  const handleTriggerDemoBoq = () => handleEvaluateBoq(null, STANDARD_SAMPLE_TEXT);

  return (
    <>
      <ToolModal isOpen={activeModal === 'boqUploader'} onClose={() => setActiveModal(null)} title="Stage 1: BOQ Quote Ingestion & 7-Aspect Math Engine">
        <div className="mb-4 space-y-1">
          <label htmlFor="boq-modal-product-scope" className="block text-sm font-semibold text-slate-700">
            Product scope
          </label>
          <select id="boq-modal-product-scope" className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" value={boqProductId} onChange={event => setBoqProductId(event.target.value)}>
            <option value="">Auto · Identify from BOQ</option>
            {catalogs.map(catalog => <option key={catalog.id} value={catalog.id}>{catalog.chassis || catalog.id}</option>)}
          </select>
        </div>
        <BoqUploader
          chassisDir={boqProduct ? boqProduct.chassisDir || boqProduct.id : undefined}
          onEvaluateBoq={async (input, rawText) => {
            const payload = await buildBoqRequestPayload(input, rawText);
            return handleEvaluateBoq({
              ...payload,
              ...(boqProduct
                ? { chassisName: boqProduct.id, chassisDir: boqProduct.chassisDir || boqProduct.id }
                : { autoScope: true })
            });
          }}
          evalResults={evalResults}
          logStream={logStream}
          activeProgress={activeProgress}
          localOnly={boqLocalOnly}
          serverOffline={serverOffline}
          onLocalOnlyChange={setBoqLocalOnly}
          onOpenMatrix={() => setActiveModal('resolutionMatrix')}
          onOpenReconciliation={() => setActiveModal('reconciliation')}
          onOpenTopology={(customData) => {
            if (customData) setIntakeTopologyData(customData);
            setActiveModal('boqTopology');
          }}
        />
        {evalResults && (
          <div className="mt-6 space-y-6 animate-fade-in">
            <AmbiguityInbox
              evalResults={evalResults}
              chassisContext={evalResults.chassisPrefix || evalResults.chassis || selectedChassis || 'Unknown Chassis'}
              onReEvaluate={handleReEvaluate}
            />
            <WorkloadDnaCard dnaData={evalResults.workloadDna} />
          </div>
        )}
      </ToolModal>

      <ToolModal isOpen={activeModal === 'resolutionMatrix'} onClose={() => setActiveModal(null)} title="Stage 1.5: 5-Tier Strategic Resolution Matrix">
        <ResolutionMatrix
          evalResults={evalResults}
          onOpenPortalFeedback={setSelectedCardForFeedback}
          selectedChassis={selectedChassis}
          onTriggerDemoBoq={handleTriggerDemoBoq}
          onOpenTopology={() => setActiveModal('boqTopology')}
        />
      </ToolModal>

      <ToolModal isOpen={activeModal === 'boqTopology'} onClose={() => setActiveModal(null)} title="Visual BOQ Configuration Topology & Subsystem Mindmap">
        <BoqTopologyModal
          isOpen={activeModal === 'boqTopology'}
          onClose={() => setActiveModal(null)}
          evalResults={evalResults || intakeTopologyData}
          onOpenRag={(query) => {
            setIsRagOpen(true);
            if (query) handleSmartSearch(query);
          }}
          onOpenMatrix={() => setActiveModal('resolutionMatrix')}
          onOpenAmbiguity={() => setActiveModal('boqUploader')}
        />
      </ToolModal>

      <ToolModal isOpen={activeModal === 'reconciliation'} onClose={() => setActiveModal(null)} title="Stage 3: Partner Quote Reconciliation">
        <PartnerReconciliationView
          evalResults={evalResults}
          selectedChassis={selectedChassis}
          onTriggerScrape={handleTriggerScrape}
          auditReport={auditReport}
          onAuditReportChange={setAuditReport}
          onOpenTopology={(customData) => {
            if (customData) setIntakeTopologyData(customData);
            setActiveModal('boqTopology');
          }}
        />
      </ToolModal>
    </>
  );
}
