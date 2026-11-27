import React from 'react';
import { LifecycleAlternatives } from '../uploader/EvaluationOutcomeCard';
import { formatPrice } from '../../services/pricing.js';
import { getCandidateExportEligibility } from '../../services/exportEligibility.js';
import { humanizeEnum } from '../../utils/formatters.js';
import HardwareEnvelopeView from './HardwareEnvelopeView';
import SolutionComparisonView from './SolutionComparisonView';
import ClarificationPromptCard from './ClarificationPromptCard';
import InlineOutcomeFeedback from './InlineOutcomeFeedback';

export const INTENT_FRIENDLY_NAMES = {
  RFP_SIZING_TO_BOM: 'Natural Language Sizing to Buildable BOM',
  BOQ_EVALUATION: 'Hardware Evaluation & Strategy Matrix',
  BOM_RECONCILIATION: 'Tender vs. Vendor Quote Reconciliation',
  CROSS_VENDOR_TRANSFORMATION: 'Cross-Vendor Hardware Transpiler',
  HETEROGENEOUS_TENDER_MODERNIZATION: 'Heterogeneous Multi-Domain Tender Modernization',
  MULTI_CLUSTER_TENDER: 'Multi-Cluster Architecture & Rack Layout',
  OCR_QUOTE_INGESTION: 'Scanned Quote & Image OCR Ingestion',
  CATALOG_INTELLIGENCE: 'SKU Lifecycle & Pricing Intelligence',
  PRESALES_CLEARANCE_STRATEGY: '90-Day Clearance vs. Production Baseline Strategy',
  WORKLOAD_DNA: 'Workload DNA & Topology Analysis',
  VALUE_ENGINEERING: 'Value Engineering & CapEx/OpEx Optimization',
  LEAST_DELTA_SYNTHESIS: 'Least-Delta Conflict Synthesis',
  WORKBOOK_GENERATION: 'Portal & Customer Workbook Generation',
  REMARKS_RECONCILIATION: 'Commercial Remarks & Reconciliation Annotation',
  ADVERSARIAL_VALIDATION: 'Adversarial Red-Team Stress Validation',
  CONTINUOUS_LEARNING: 'Continuous Learning & Feedback Governance',
  KNOWLEDGE_SYNC: 'Catalog & NotebookLM Knowledge Sync',
  HARDWARE_ENVELOPE_ANALYTICS: 'Hardware capability envelope',
  SOLUTION_COMPARISON: 'Solution comparison',
  FREEFORM_QA: 'Architecture & QuickSpecs Grounded Q&A',
  AMBIGUOUS_QUERY: 'Clarification Required (Ambiguous Requirements)'
};

function OutcomeHeader({ envelope, result, exportEligibility, onExportExcel, onEvaluateCandidateBom }) {
  const intent = envelope.classification?.intent;
  const friendlyIntent = INTENT_FRIENDLY_NAMES[intent] || intent || 'Presales Solution';
  const isClean = ['SUCCESS', '100% BUILDABLE', 'CERTIFIED'].includes(result.status);
  const isActionRequired = ['ACTION_REQUIRED', 'PARTIAL', 'AMBIGUOUS_QUERY', 'DELIVERY_BLOCKED_UNBUILDABLE'].includes(result.status);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="badge badge-emerald text-xs font-bold">{friendlyIntent}</span>
          <span className={`badge ${isClean ? 'badge-emerald' : isActionRequired ? 'badge-amber' : 'badge-slate'} text-xs`} title={result.status || 'OUTCOME_RETURNED'}>
            {humanizeEnum(result.status || 'OUTCOME_RETURNED')}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Query: <span className="font-medium text-slate-700">{envelope.query}</span></p>
      </div>
      <div className="flex items-center gap-2">
        {onEvaluateCandidateBom && (
          <button onClick={onEvaluateCandidateBom} className="btn-secondary text-xs py-1 px-3 shadow-sm">
            Evaluate in 5-Tier Matrix
          </button>
        )}
        {onExportExcel && (
          <button
            onClick={onExportExcel}
            disabled={!exportEligibility?.eligible}
            title={exportEligibility?.eligible ? 'Download authorized customer Excel workbook' : exportEligibility?.reason}
            className={`btn-primary text-xs py-1 px-3 shadow-sm ${!exportEligibility?.eligible ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Download Official Excel
          </button>
        )}
      </div>
    </div>
  );
}

function PriceDriftView({ report }) {
  if (!report) return null;
  const { catalogsScanned, snapshotsRead, trailConflictCount, trailConflictExamples, issues } = report.coverage;
  return (
    <section className="space-y-3 text-xs">
      <p className="text-slate-600">{snapshotsRead} dated snapshots across {catalogsScanned.length} catalogs · USD list price</p>
      {trailConflictCount > 0 && (
        <details className="text-amber-800">
          <summary className="cursor-pointer">{trailConflictCount} historical price entries disagree with their dated snapshots.</summary>
          <ul className="list-disc pl-4 pt-1">
            {trailConflictExamples.map(example => (
              <li key={[example.catalog, example.sku, example.date].join('|')}>
                {example.sku} · {example.catalog} · {example.date} · price trail {formatPrice(example.recordedPriceUsd)} · snapshot {formatPrice(example.snapshotPriceUsd)}
              </li>
            ))}
          </ul>
        </details>
      )}
      {issues.length > 0 && <p className="text-amber-800">{issues.length} catalog evidence files could not be read.</p>}
      {report.groups.map(({ category, changes, totalChanges }) => (
        <div key={category} className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-900">{category === 'All' ? 'Price changes' : category}</h4>
          {changes.length === 0 ? <p className="text-slate-600">No changes established from the available snapshots.</p> : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>{['SKU', 'Last old price', 'First new price', 'Change', 'Catalog evidence'].map(label => (
                    <th scope="col" key={label} className="px-2 py-1.5">{label}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changes.map(change => (
                    <tr key={[change.sku, change.firstNewPriceDate, change.previousPriceUsd, change.currentPriceUsd].join('|')}>
                      <td className="p-2"><div className="font-mono font-semibold">{change.sku}</div>{change.description}</td>
                      <td className="p-2 whitespace-nowrap">{formatPrice(change.previousPriceUsd)}<br />{change.lastOldPriceDate}</td>
                      <td className="p-2 whitespace-nowrap">{formatPrice(change.currentPriceUsd)}<br />{change.firstNewPriceDate}</td>
                      <td className="p-2 whitespace-nowrap">{change.changeUsd > 0 ? '+' : ''}{formatPrice(change.changeUsd)}<br />{change.changePct}%</td>
                      <td className="p-2">{change.sources.map(source => (
                        <div key={source.catalog} className="whitespace-nowrap">{source.catalog} · {source.previousDate} → {source.currentDate}</div>
                      ))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalChanges > changes.length && <p className="text-slate-600">Showing {changes.length} of {totalChanges} changes.</p>}
        </div>
      ))}
    </section>
  );
}

function GroundedAnswerView({ answer, citations }) {
  if (!answer) return null;
  return (
    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
      <h4 className="text-xs font-bold text-emerald-900">Grounded Architecture Synthesis</h4>
      <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{answer}</p>
      {Array.isArray(citations) && citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {citations.map((cite, i) => (
            <span key={i} className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-md">
              {typeof cite === 'string' ? cite : (cite.title || cite.source || cite.sourceId || 'Source')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReconciliationSummaryView({ report }) {
  if (!report) return null;
  const directMatches = report.directMatches?.length ?? report.matchedCount ?? 0;
  const missing = report.missingItems?.length ?? report.missingCount ?? 0;
  const extras = report.unsolicitedExtras?.length ?? report.extrasCount ?? 0;
  const substitutions = report.substitutions?.length ?? report.subsCount ?? 0;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-slate-800">Tender vs. Vendor Quote Audit</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="block font-bold text-emerald-700 text-base">{directMatches}</span>
          <span className="text-[10px] text-slate-500">Direct Matches</span>
        </div>
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="block font-bold text-amber-700 text-base">{missing}</span>
          <span className="text-[10px] text-slate-500">Missing in Quote</span>
        </div>
        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
          <span className="block font-bold text-rose-700 text-base">{extras}</span>
          <span className="text-[10px] text-slate-500">Unsolicited Extras</span>
        </div>
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="block font-bold text-blue-700 text-base">{substitutions}</span>
          <span className="text-[10px] text-slate-500">Substitutions</span>
        </div>
      </div>
    </div>
  );
}

function ReasoningNarrativeView({ reasoningAnalysis, rawNarrative }) {
  const narrative = reasoningAnalysis?.reasoningNarrative || rawNarrative;
  const counterfactuals = reasoningAnalysis?.counterfactualDerivations;
  if (!narrative && (!Array.isArray(counterfactuals) || counterfactuals.length === 0)) return null;

  return (
    <details className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <summary className="text-xs font-bold text-slate-800 cursor-pointer select-none">
        Lead Architect Autonomous Reasoning (Phase 9 & Self-Correction)
      </summary>
      <div className="mt-2 space-y-2 text-xs text-slate-700">
        {narrative && <p className="whitespace-pre-line leading-relaxed">{narrative}</p>}
        {Array.isArray(counterfactuals) && counterfactuals.length > 0 && (
          <div className="border-t border-slate-200 pt-2 space-y-1">
            <h5 className="font-semibold text-slate-800 text-[11px]">Counterfactual Backtracking Trail:</h5>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              {counterfactuals.map((cf, idx) => (
                <li key={idx}><strong className="text-slate-900">{cf.mutationType || 'Resolution'}:</strong> {cf.hypothesis || cf.action || JSON.stringify(cf)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function RoutedBOMTable({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800">Candidate Bill of Materials ({items.length} items)</span>
        <span className="text-slate-500">Showing first {Math.min(items.length, 100)} line items</span>
      </div>
      <div className="overflow-auto max-h-72 border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="p-2 font-semibold">Qty</th>
              <th className="p-2 font-semibold">Scope</th>
              <th className="p-2 font-semibold">SKU</th>
              <th className="p-2 font-semibold">Description</th>
              <th className="p-2 font-semibold">Unit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.slice(0, 100).map((item, index) => {
              const scopeLabel = item.quantityScope === 'global'
                ? 'global'
                : (item.perNodeQuantity && item.configurationMultiplier > 1
                  ? `${item.perNodeQuantity}/node × ${item.configurationMultiplier}`
                  : (item.quantityBasis || 'node'));
              return (
              <tr key={index} className="hover:bg-slate-50/60">
                <td className="p-2 font-mono font-medium">{item.quantity ?? '1'}</td>
                <td className="p-2 font-mono text-[11px] text-slate-600">{scopeLabel}</td>
                <td className="p-2 font-mono text-emerald-700 font-semibold">{item.sku}</td>
                <td className="p-2 text-slate-700">{item.description}</td>
                <td className="p-2 font-mono text-slate-900">{formatPrice(item.unitPriceUsd)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogSearchCoverage({ report }) {
  const summary = report.summary || {};
  const unresolvedProducts = report.filters?.unresolvedProducts || [];
  const unresolvedFilters = report.filters?.unresolvedFilters || [];
  return (<>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-900">
          Catalog Search Results ({summary.returnedCount ?? report.results.length} of {summary.matchedCount ?? report.results.length})
        </span>
        <span className="text-slate-600">
          Products searched: {(summary.productsSearched || []).join(', ') || 'None'}
          {summary.excludedUnmeasuredCount > 0 ? ` · Excluded unverified fields: ${summary.excludedUnmeasuredCount}` : ''}
          {summary.excludedUnpricedCount > 0 ? ` · Unpriced: ${summary.excludedUnpricedCount}` : ''}
          {summary.excludedConflictCount > 0 ? ` · Flagged conflicts: ${summary.excludedConflictCount}` : ''}
        </span>
      </div>
      {summary.incompleteCatalogCoverage && (
        <p role="alert" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
          Catalog evidence is incomplete for the requested scope or fields.
          {unresolvedProducts.length > 0 && ` Unresolved products: ${unresolvedProducts.join(', ')}.`}
          {unresolvedFilters.length > 0 && ` ${unresolvedFilters.join('. ')}.`}
        </p>
      )}
  </>);
}

function CatalogSearchView({ report }) {
  if (!report || !Array.isArray(report.results)) return null;
  const excludedUnmeasured = Array.isArray(report.excludedUnmeasured) ? report.excludedUnmeasured : [];
  const excludedConflicts = Array.isArray(report.excludedConflicts) ? report.excludedConflicts : [];
  return (
    <div data-testid="catalog-search-view" className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
      <CatalogSearchCoverage report={report} />
      {report.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1 pr-2">Product</th>
                <th className="py-1 pr-2">SKU</th>
                <th className="py-1 pr-2">Description</th>
                <th className="py-1 pr-2">Role</th>
                <th className="py-1 pr-2">Price (USD)</th>
                <th className="py-1 pr-2">Lead Time</th>
                <th className="py-1 pr-2">Availability / lifecycle</th>
                <th className="py-1">Catalog capture</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((row, idx) => (
                <tr key={`${row.product}-${row.sku}-${idx}`} className="border-b border-slate-100">
                  <td className="py-1 pr-2 font-medium text-slate-800">{row.product}</td>
                  <td className="py-1 pr-2 font-mono">{row.sku}</td>
                  <td className="py-1 pr-2 text-slate-700">{row.description}</td>
                  <td className="py-1 pr-2 text-slate-600">{row.componentRole || row.rowType}</td>
                  <td className="py-1 pr-2">
                    {typeof row.listPriceUsd === 'number' ? `$${row.listPriceUsd.toLocaleString()}` : (row.priceState || 'UNPRICED')}
                  </td>
                  <td className="py-1 pr-2">
                    {row.leadTimeDays !== null && row.leadTimeDays !== undefined
                      ? (row.leadTimeText || `${row.leadTimeDays} days`)
                      : (row.leadTime?.etaDate || 'Unpublished')}
                  </td>
                  <td className="py-1 pr-2">{(row.availability || 'UNKNOWN').replaceAll('_', ' ')} · {row.lifecycleCanonical || 'Unknown'}{row.conditionSummary && <div>{row.conditionSummary}</div>}</td>
                  <td className="py-1">{row.evidence?.capturedAt?.slice(0, 10) || row.scrapeDate || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {excludedUnmeasured.length > 0 && (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer font-medium">
            Candidates with unverified fields ({excludedUnmeasured.length})
          </summary>
          <ul className="mt-1 space-y-0.5 pl-4 list-disc">
            {excludedUnmeasured.slice(0, 20).map((ex, i) => (
              <li key={i}><span className="font-mono">{ex.sku}</span> ({ex.product}) · {String(ex.reason || 'UNVERIFIED').replaceAll('_', ' ')}{ex.leadTimeText && ` · ${ex.leadTimeText}`}</li>
            ))}
          </ul>
        </details>
      )}
      {excludedConflicts.length > 0 && (
        <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded px-2 py-1">
          Excluded {excludedConflicts.length} SKU(s) with malformed or conflicting prices: {excludedConflicts.map(c => c.sku).slice(0, 8).join(', ')}
        </p>
      )}
    </div>
  );
}

function buildEvalPayloadForAuth(result, envelope) {
  const base = result.evalResults || result;
  return { ...base, runId: base.runId || envelope.runId || result.runId };
}

function CandidateReferenceSummary({ candidateRef }) {
  if (!candidateRef) return null;
  return (
    <div data-testid="candidate-reference-summary" className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap justify-between items-center gap-2">
      <span>Target Architecture: <strong>{candidateRef.product || 'Unknown'}</strong></span>
      <span>Nodes: <strong>{candidateRef.nodeCount || candidateRef.serverCount || 1}</strong> ({candidateRef.quantityBasis || 'SINGLE_NODE'})</span>
      {candidateRef.parentRunId && (
        <span className="font-mono text-[11px] text-slate-500">Origin Run: {candidateRef.parentRunId}</span>
      )}
    </div>
  );
}

export default function RoutedOutcome({ envelope, onExportExcel, onEvaluateCandidateBom, onFollowUp, busy = false, localOnly = false }) {
  if (!envelope) return null;
  const result = envelope.result || {};
  const items = result.items || result.candidateBOM || result.evalResults?.items || [];
  const preview = JSON.stringify(envelope, null, 2);
  const candidateRef = result.candidateReference || envelope.candidateReference;
  const requiresClarification = Boolean(
    result.requiresHumanClarification || result.status === 'REQUIRES_HUMAN_CLARIFICATION' || envelope.hitlRequired || result.hitlRequired || result.code === 'PLATFORM_CLARIFICATION_REQUIRED'
  );
  const exportEligibility = getCandidateExportEligibility(buildEvalPayloadForAuth(result, envelope));
  const missingReqs = result.missingRequirements || candidateRef?.missingRequirements;
  const showActions = items.length > 0 && !requiresClarification;

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3">
      <OutcomeHeader
        envelope={envelope}
        result={result}
        exportEligibility={exportEligibility}
        onExportExcel={showActions ? onExportExcel : null}
        onEvaluateCandidateBom={showActions ? onEvaluateCandidateBom : null}
      />

      {envelope.providerFallbackNotice && (
        <p role="status" className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          {envelope.providerFallbackNotice}
        </p>
      )}

      {showActions && !exportEligibility.eligible && (
        <p className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Customer export locked until evaluated & authorized: {exportEligibility.reason}
        </p>
      )}

      <CandidateReferenceSummary candidateRef={candidateRef} />
      {(envelope.clarificationPrompt || (requiresClarification && result.code !== 'PRICE_DRIFT_SCOPE_REQUIRED')) && (
        <ClarificationPromptCard
          prompt={envelope.clarificationPrompt}
          requiresClarification={requiresClarification}
          missingReqs={missingReqs}
          onRespond={onFollowUp}
          busy={busy}
        />
      )}

      {envelope.cancellationRequested && (
        <p role="alert" className="text-xs font-semibold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
          Cancellation was requested. Completed effects and candidate BOM are preserved below.
        </p>
      )}

      {result.envelope && <HardwareEnvelopeView envelope={result.envelope} />}
      {(result.comparedPlatforms?.length > 0 || result.comparisonMatrix?.length > 0 || result.crossVendorReport || (Array.isArray(result.parityGaps) && result.parityGaps.length > 0)) && (
        <SolutionComparisonView
          comparison={result}
          crossVendorReport={result.crossVendorReport}
          parityGaps={result.parityGaps || []}
        />
      )}
      {envelope.modeUsed && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="badge badge-indigo">Runtime Tier: {envelope.modeUsed}</span>
          {Array.isArray(envelope.tierTrail) && envelope.tierTrail.length > 1 && (
            <span className="font-mono text-slate-500">Trail: {envelope.tierTrail.join(' → ')}</span>
          )}
          {envelope.agyEscalated && <span className="badge badge-purple">AGY Escalated</span>}
        </div>
      )}
      {result.message && <p className="text-xs text-slate-700">{String(result.message)}</p>}
      <PriceDriftView report={result.priceDrifts} />
      <CatalogSearchView report={result.catalogSearch} />
      <LifecycleAlternatives recommendations={result.lifecycleRecommendations} />
      {result.historicalPricing && (
        <p className="text-xs text-slate-700">
          {result.targetSku} · As of {result.historicalPricing.targetDate} · {formatPrice(result.historicalPricing.nullablePriceUsd)}
          {result.historicalPricing.effectiveDate && ` · Observed ${result.historicalPricing.effectiveDate}`}
        </p>
      )}
      {result.answer && result.isCloudGrounded === false && result.effectivePolicy?.offline === false && (
        <span className="badge badge-amber">Local RAG fallback · Cloud grounding unavailable</span>
      )}
      <GroundedAnswerView answer={result.answer} citations={result.citations} />
      {envelope.agentAnswer && (
        <section className="rounded-xl border border-slate-200 p-3 text-xs space-y-2">
          <h4 className="font-semibold">Agent synthesis · {envelope.modeUsed?.replaceAll('_', ' ')}</h4>
          <p className="whitespace-pre-line break-words">{envelope.agentAnswer}</p>
        </section>
      )}
      <ReconciliationSummaryView report={result.reconciliationReport || result.auditReport} />
      <RoutedBOMTable items={items} />
      <ReasoningNarrativeView reasoningAnalysis={envelope.reasoningAnalysis} rawNarrative={result.reasoningNarrative} />

      <InlineOutcomeFeedback key={envelope.runId || envelope.query} envelope={envelope} localOnly={localOnly} />

      <details>
        <summary className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer">Structured outcome and evidence JSON</summary>
        <pre className="text-[11px] overflow-auto max-h-80 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1">{preview.slice(0, 50000)}</pre>
        {preview.length > 50000 && <p className="text-[10px] text-slate-500">Preview shortened to 50,000 characters.</p>}
      </details>
    </div>
  );
}

