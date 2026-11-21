import React, { useEffect, useRef, useState } from 'react';
import { postJson, requestJson, uploadBoqFile } from '../services/api.js';
import { formatPrice } from '../services/pricing.js';
import { getCandidateExportEligibility } from '../services/exportEligibility.js';

const INTENT_FRIENDLY_NAMES = {
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
  FREEFORM_QA: 'Architecture & QuickSpecs Grounded Q&A',
  AMBIGUOUS_QUERY: 'Clarification Required (Ambiguous Requirements)'
};

const PRESET_QUERIES = [
  { label: 'Catalog Price Drifts', query: 'List the last 3 price drifts for memory, CPU and GPU across catalogs' },
  { label: 'Sizing (4x DL380)', query: 'Size 4 nodes of DL380 Gen12 with 64 cores, 512GB RAM, 4x 3.84TB NVMe SSDs, 25GbE networking, and 3yr Tech Care Basic' },
  { label: 'Thermal & Fan Check', query: 'Does an Intel Xeon Platinum 8480+ (350W TDP) processor require High Performance Fan Kits and Heatsinks on DL380 Gen12?' },
  { label: 'Memory Balance', query: 'What are the DIMM interleaving and channel symmetry rules when installing 16x 64GB DDR5 DIMMs across 2 sockets on DL380 Gen12?' }
];

async function prepareRequest(query, product, primary, secondary, localOnly, priorPriceDriftRunId) {
  const context = { chassisName: product?.id, chassisDir: product?.chassisDir, offline: localOnly, offlineMode: localOnly, priorPriceDriftRunId };
  if (primary) context.filePath = (await uploadBoqFile(primary)).filepath;
  if (secondary) context.secondaryFilePath = (await uploadBoqFile(secondary)).filepath;
  const effectiveQuery = String(query || '').trim()
    || (primary ? `Evaluate attached tender/quote file: ${primary.name}` : '');
  return { query: effectiveQuery, context };
}

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
          <span className={`badge ${isClean ? 'badge-emerald' : isActionRequired ? 'badge-amber' : 'badge-slate'} text-xs font-mono`}>
            {result.status || 'OUTCOME_RETURNED'}
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
              {cite.source || cite.title || cite}
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

function ClarificationAlert({ missingReqs }) {
  const missingList = Array.isArray(missingReqs) && missingReqs.length > 0 ? ` (Missing: ${missingReqs.join(', ')})` : '';
  return (
    <div role="alert" className="text-xs font-semibold text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-300">
      ⚠️ <strong>Human Clarification Required:</strong> Sizing requirements are incomplete or ambiguous{missingList}. Please refine the query before evaluation.
    </div>
  );
}

function RoutedOutcome({ envelope, onExportExcel, onEvaluateCandidateBom }) {
  if (!envelope) return null;
  const result = envelope.result || {};
  const items = result.items || result.candidateBOM || result.evalResults?.items || [];
  const preview = JSON.stringify(envelope, null, 2);
  const candidateRef = result.candidateReference || envelope.candidateReference;
  const requiresClarification = Boolean(
    result.requiresHumanClarification || result.status === 'REQUIRES_HUMAN_CLARIFICATION' || envelope.hitlRequired || result.hitlRequired
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

      {showActions && !exportEligibility.eligible && (
        <p className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Customer export locked until evaluated & authorized: {exportEligibility.reason}
        </p>
      )}

      <CandidateReferenceSummary candidateRef={candidateRef} />
      {requiresClarification && result.code !== 'PRICE_DRIFT_SCOPE_REQUIRED' && <ClarificationAlert missingReqs={missingReqs} />}

      {envelope.cancellationRequested && (
        <p role="alert" className="text-xs font-semibold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
          Cancellation was requested. Completed effects and candidate BOM are preserved below.
        </p>
      )}

      {result.message && <p className="text-xs text-slate-700">{String(result.message)}</p>}
      <PriceDriftView report={result.priceDrifts} />
      <CatalogSearchView report={result.catalogSearch} />
      {result.historicalPricing && (
        <p className="text-xs text-slate-700">
          {result.targetSku} · As of {result.historicalPricing.targetDate} · {formatPrice(result.historicalPricing.nullablePriceUsd)}
          {result.historicalPricing.effectiveDate && ` · Observed ${result.historicalPricing.effectiveDate}`}
        </p>
      )}
      <GroundedAnswerView answer={result.answer} citations={result.citations} />
      <ReconciliationSummaryView report={result.reconciliationReport || result.auditReport} />
      <RoutedBOMTable items={items} />
      <ReasoningNarrativeView reasoningAnalysis={envelope.reasoningAnalysis} rawNarrative={result.reasoningNarrative} />

      <details>
        <summary className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer">Structured outcome and evidence JSON</summary>
        <pre className="text-[11px] overflow-auto max-h-80 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1">{preview.slice(0, 50000)}</pre>
        {preview.length > 50000 && <p className="text-[10px] text-slate-500">Preview shortened to 50,000 characters.</p>}
      </details>
    </div>
  );
}

const SESSION_PRESALES_RUN_KEY = 'presales.ownedRunId';

function readSessionValue(key) {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage?.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeSessionValue(key, val) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (!val) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, val);
  } catch {}
}

async function runClassification({ query, product, primary, secondary, localOnly, activeRunIdRef, revision, setBusy, setError, setPlan, setResult }) {
  const version = revision.current;
  setBusy(true); setError(null); setResult(null);
  try {
    const input = await prepareRequest(query, product, primary, secondary, localOnly, activeRunIdRef.current);
    const classification = await postJson('/api/query/classify', input);
    if (version === revision.current) {
      setPlan({ input, classification, version, originProduct: product ? { id: product.id, chassisDir: product.chassisDir } : null });
    }
  } catch (err) {
    if (version === revision.current) setError(err.message);
  } finally {
    setBusy(false);
  }
}

async function runExecution({ plan, revision, primary, query, localOnly, onEvaluateBoq, setBusy, setError, setResult, setActiveRunId, activeRunIdRef }) {
  if (!plan || plan.version !== revision.current) return;
  const version = revision.current;
  setBusy(true); setError(null);
  try {
    if (plan.classification.intent === 'BOQ_EVALUATION') {
      const payload = primary ? { filepath: plan.input.context.filePath } : { rawText: query };
      await onEvaluateBoq({
        ...payload,
        chassisDir: plan.input?.context?.chassisDir || plan.originProduct?.chassisDir,
        chassisName: plan.input?.context?.chassisName || plan.originProduct?.id,
        offline: plan.input?.context?.offline ?? localOnly
      });
    } else {
      const runId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      writeSessionValue(SESSION_PRESALES_RUN_KEY, runId);
      if (activeRunIdRef) activeRunIdRef.current = runId;
      if (setActiveRunId) setActiveRunId(runId);
      const envelope = await postJson('/api/query/route', { ...plan.input, runId }, { timeoutMs: 15 * 60 * 1000 });
      if (version === revision.current) setResult(envelope);
    }
  } catch (err) {
    if (version === revision.current) setError(err.message);
  } finally {
    setBusy(false);
  }
}

async function runExportExcel(result, product, setError) {
  if (!result) return;
  const evalData = result.result?.evalResults || result.result || result;
  const candidateRef = result.result?.candidateReference || result.candidateReference || evalData?.candidateReference;
  const runId = result.runId || result.result?.runId || evalData?.runId;
  const eligibility = getCandidateExportEligibility({ ...evalData, runId });
  if (!eligibility.eligible) {
    if (setError) setError(`Export blocked: ${eligibility.reason}`);
    return;
  }
  const resolvedChassis = candidateRef?.product || result.result?.chassis || evalData?.chassis || product?.id;
  if (!resolvedChassis) {
    if (setError) setError('Export blocked: target chassis could not be determined.');
    return;
  }
  try {
    if (setError) setError(null);
    const resp = await postJson('/api/export-boq', {
      runId,
      chassisId: resolvedChassis
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dashboard-export-created', { detail: resp }));
    }
    if (resp?.downloadPath) window.open(resp.downloadPath, '_blank');
  } catch (err) {
    if (setError) setError(`Export blocked: ${err.message}`);
  }
}

function firstTruthy(values, fallback = undefined) {
  for (const val of values) {
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
}

function buildCandidateEvaluationPayload(result, localOnly) {
  if (!result) return null;
  const resObj = result.result || result;
  const items = firstTruthy([resObj.items, resObj.candidateBOM, resObj.evalResults?.items], []);
  const candidateReference = resObj.candidateReference || result.candidateReference || null;
  if (!items.length || resObj.requiresHumanClarification === true || candidateReference?.requiresHumanClarification === true) {
    return null;
  }
  const serverCount = firstTruthy([candidateReference?.serverCount, candidateReference?.nodeCount, resObj.serverCount], 1);
  const effectivePolicy = firstTruthy([candidateReference?.effectivePolicy, resObj.effectivePolicy, result.effectivePolicy], undefined);
  return {
    rawText: items.map(it => `${it.quantity ?? 1}x ${it.sku} ${it.description || ''}`).join('\n'),
    items,
    candidateReference,
    serverCount,
    nodeCount: candidateReference?.nodeCount || serverCount,
    quantityBasis: candidateReference?.quantityBasis || (serverCount > 1 ? 'CLUSTER_MULTIPLIED' : 'SINGLE_NODE'),
    parentRunId: firstTruthy([candidateReference?.parentRunId, result.runId, resObj.traceId]),
    candidateDigest: candidateReference?.digest,
    effectivePolicy,
    chassisDir: candidateReference?.chassisDir || resObj.chassisDir,
    chassisName: firstTruthy([candidateReference?.product, resObj.chassis, resObj.targetChassis]),
    offline: effectivePolicy?.offline ?? candidateReference?.offlineMode ?? localOnly
  };
}

async function runCandidateEvaluation(result, onEvaluateBoq, localOnly) {
  const payload = onEvaluateBoq ? buildCandidateEvaluationPayload(result, localOnly) : null;
  if (payload) await onEvaluateBoq(payload);
}

function usePresalesSnapshot(setResult, setError, activeRunId, setActiveRunId, activeRunIdRef) {
  const recoverRunById = async (runId, signal) => {
    if (!runId) return;
    try {
      const data = await requestJson(`/api/run/${encodeURIComponent(runId)}`, { signal });
      if (signal?.aborted) return;
      const run = data?.run || data;
      if (!run) return;
      if (run.queryResult) {
        setResult(run.queryResult.data || run.queryResult);
      } else if (run.status === 'INTERRUPTED') {
        setError(`Previous presales run (${runId}) was interrupted by backend restart.`);
      } else if (run.status === 'CANCELLED') {
        setError(`Presales run (${runId}) was cancelled.`);
      }
    } catch (err) {
      if (!signal?.aborted && err?.status !== 404) setError(err.message);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (activeRunId) {
      void recoverRunById(activeRunId, controller.signal);
    }
    const onRoutedResult = event => {
      const detail = event?.detail;
      if (!detail || !activeRunIdRef.current) return;
      if (detail.runId !== activeRunIdRef.current) return;
      setResult(detail.data || detail);
    };
    const onReopenResult = event => {
      const detail = event?.detail;
      if (!detail) return;
      const runId = detail.runId || detail.data?.runId;
      if (runId) {
        writeSessionValue(SESSION_PRESALES_RUN_KEY, runId);
        activeRunIdRef.current = runId;
        setActiveRunId(runId);
      }
      setError(null);
      setResult(detail.data || detail);
    };
    const onSnapshotReconnect = () => {
      if (activeRunIdRef.current) void recoverRunById(activeRunIdRef.current, controller.signal);
    };
    const onTaskCompleted = event => {
      const detail = event?.detail;
      if (detail?.runId && detail.runId === activeRunIdRef.current) {
        void recoverRunById(detail.runId, controller.signal);
      }
    };

    window.addEventListener('dashboard-routed-result', onRoutedResult);
    window.addEventListener('dashboard-reopen-routed-result', onReopenResult);
    window.addEventListener('dashboard-sse-snapshot', onSnapshotReconnect);
    window.addEventListener('dashboard-task-completed', onTaskCompleted);
    return () => {
      controller.abort();
      window.removeEventListener('dashboard-routed-result', onRoutedResult);
      window.removeEventListener('dashboard-reopen-routed-result', onReopenResult);
      window.removeEventListener('dashboard-sse-snapshot', onSnapshotReconnect);
      window.removeEventListener('dashboard-task-completed', onTaskCompleted);
    };
  }, [activeRunId, setResult, setError, setActiveRunId, activeRunIdRef]);
}

function usePresalesRunner(query, product, primary, secondary, localOnly, onEvaluateBoq) {
  const initialRunId = readSessionValue(SESSION_PRESALES_RUN_KEY);
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState(null);
  const [activeRunId, setActiveRunId] = useState(initialRunId);
  const activeRunIdRef = useRef(initialRunId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const revision = useRef(0);

  useEffect(() => {
    revision.current++;
    setPlan(null);
    setError(null);
  }, [query, primary, secondary, localOnly]);

  usePresalesSnapshot(setResult, setError, activeRunId, setActiveRunId, activeRunIdRef);

  const classify = () => runClassification({ query, product, primary, secondary, localOnly, activeRunIdRef, revision, setBusy, setError, setPlan, setResult });
  const execute = () => runExecution({ plan, revision, primary, query, localOnly, onEvaluateBoq, setBusy, setError, setResult, setActiveRunId, activeRunIdRef });
  const exportExcel = () => runExportExcel(result, product, setError);
  const evaluateCandidateBom = () => runCandidateEvaluation(result, onEvaluateBoq, localOnly);

  return { plan, result, busy, error, classify, execute, exportExcel, evaluateCandidateBom };
}

function PresalesInputControls({ query, setQuery, primary, setPrimary, secondary, setSecondary, localOnly, setLocalOnly }) {
  return (
    <>
      <label className="block text-sm">
        Requirements or presales question
        <textarea
          className="block w-full border rounded-lg p-2 mt-1 text-sm font-sans"
          rows={3}
          value={query}
          placeholder="e.g., Size 4 nodes of DL380 Gen12 with 64 cores, 512GB RAM, 4x 3.84TB NVMe SSDs, 25GbE networking, and 3yr Tech Care Basic..."
          onChange={event => setQuery(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Presets:</span>
        {PRESET_QUERIES.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setQuery(preset.query)}
            className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        <label>
          Customer tender / input file (optional)
          <input type="file" className="block mt-1" onChange={event => setPrimary(event.target.files?.[0] || null)} />
        </label>
        <label>
          Vendor quote / second baseline (optional)
          <input type="file" className="block mt-1" onChange={event => setSecondary(event.target.files?.[0] || null)} />
        </label>
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
          <input type="checkbox" checked={localOnly} onChange={event => setLocalOnly(event.target.checked)} />
          Use local catalog only
        </label>
      </div>
      {(primary || secondary) && !query.trim() && (
        <p className="text-xs text-slate-600">
          Attached file ready without prompt text: {primary ? primary.name : ''}{primary && secondary ? ', ' : ''}{secondary ? secondary.name : ''}
        </p>
      )}
    </>
  );
}

function PresalesActionToolbar({ busy, isTaskRunning, queryEmpty, classify, plan, execute }) {
  const friendlyIntent = plan ? (INTENT_FRIENDLY_NAMES[plan.classification.intent] || plan.classification.intent) : '';
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <button
        className="btn-secondary text-xs"
        disabled={busy || isTaskRunning || queryEmpty}
        onClick={classify}
      >
        {busy && !plan ? 'Identifying…' : 'Identify workflow'}
      </button>
      {plan && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-emerald text-xs">{friendlyIntent}</span>
          <span className="text-xs text-slate-600">({plan.classification.rationale})</span>
          <button
            className="btn-primary text-xs"
            disabled={busy || isTaskRunning || plan.classification.intent === 'AMBIGUOUS_QUERY'}
            onClick={execute}
          >
            {busy ? 'Running…' : 'Run workflow'}
          </button>
        </div>
      )}
    </div>
  );
}

/** Route supported presales requests through the existing canonical engine. */
export default function PresalesRequestPanel({ product, isTaskRunning, onEvaluateBoq }) {
  const [query, setQuery] = useState('');
  const [primary, setPrimary] = useState(null);
  const [secondary, setSecondary] = useState(null);
  const [localOnly, setLocalOnly] = useState(true);

  const { plan, result, busy, error, classify, execute, exportExcel, evaluateCandidateBom } = usePresalesRunner(
    query, product, primary, secondary, localOnly, onEvaluateBoq
  );

  return (
    <section className="glass-card p-5 mb-5 space-y-3">
      <h2 className="font-bold text-base">Presales request</h2>
      <p className="text-xs text-slate-600">
        Describe what you need or attach a quote. Review the proposed workflow before running it for {product?.chassis || 'the selected product'}.
      </p>
      <PresalesInputControls
        query={query} setQuery={setQuery}
        primary={primary} setPrimary={setPrimary}
        secondary={secondary} setSecondary={setSecondary}
        localOnly={localOnly} setLocalOnly={setLocalOnly}
      />
      <PresalesActionToolbar
        busy={busy} isTaskRunning={isTaskRunning} queryEmpty={!query.trim() && !primary && !secondary}
        classify={classify} plan={plan} execute={execute}
      />
      {error && <p role="alert" className="text-sm text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200">{error}</p>}
      <RoutedOutcome envelope={result} onExportExcel={exportExcel} onEvaluateCandidateBom={evaluateCandidateBom} />
    </section>
  );
}
