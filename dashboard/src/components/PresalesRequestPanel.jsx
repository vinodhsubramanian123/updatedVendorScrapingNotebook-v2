import React, { useEffect, useRef, useState } from 'react';
import { postJson, requestJson, uploadBoqFile } from '../services/api.js';
import { formatPrice } from '../services/pricing.js';

const INTENT_FRIENDLY_NAMES = {
  RFP_SIZING_TO_BOM: 'Natural Language Sizing to Buildable BOM',
  BOQ_EVALUATION: 'Hardware Evaluation & Strategy Matrix',
  BOM_RECONCILIATION: 'Tender vs. Vendor Quote Reconciliation',
  CROSS_VENDOR_TRANSLATION: 'Cross-Vendor Hardware Transpiler',
  CATALOG_INTELLIGENCE: 'SKU Lifecycle & Pricing Intelligence',
  FREEFORM_QA: 'Architecture & QuickSpecs Grounded Q&A',
  AMBIGUOUS_QUERY: 'Clarification Required (Ambiguous Requirements)'
};

const PRESET_QUERIES = [
  { label: 'Sizing (4x DL380)', query: 'Size 4 nodes of DL380 Gen12 with 64 cores, 512GB RAM, 4x 3.84TB NVMe SSDs, 25GbE networking, and 3yr Tech Care Basic' },
  { label: 'Thermal & Fan Check', query: 'Does an Intel Xeon Platinum 8480+ (350W TDP) processor require High Performance Fan Kits and Heatsinks on DL380 Gen12?' },
  { label: 'Memory Balance', query: 'What are the DIMM interleaving and channel symmetry rules when installing 16x 64GB DDR5 DIMMs across 2 sockets on DL380 Gen12?' }
];

async function prepareRequest(query, product, primary, secondary, localOnly) {
  const context = { chassisName: product?.id, chassisDir: product?.chassisDir, offlineMode: localOnly };
  if (primary) context.filePath = (await uploadBoqFile(primary)).filepath;
  if (secondary) context.secondaryFilePath = (await uploadBoqFile(secondary)).filepath;
  return { query, context };
}

function OutcomeHeader({ envelope, result, onExportExcel, onEvaluateCandidateBom }) {
  const intent = envelope.classification?.intent;
  const friendlyIntent = INTENT_FRIENDLY_NAMES[intent] || intent || 'Presales Solution';
  const isClean = ['SUCCESS', '100% BUILDABLE', 'CERTIFIED'].includes(result.status);
  const isActionRequired = ['ACTION_REQUIRED', 'AMBIGUOUS_QUERY', 'DELIVERY_BLOCKED_UNBUILDABLE'].includes(result.status);

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
          <button onClick={onExportExcel} className="btn-primary text-xs py-1 px-3 shadow-sm">
            Download Official Excel
          </button>
        )}
      </div>
    </div>
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
              <th className="p-2 font-semibold">SKU</th>
              <th className="p-2 font-semibold">Description</th>
              <th className="p-2 font-semibold">Unit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.slice(0, 100).map((item, index) => (
              <tr key={index} className="hover:bg-slate-50/60">
                <td className="p-2 font-mono font-medium">{item.quantity ?? '1'}</td>
                <td className="p-2 font-mono text-emerald-700 font-semibold">{item.sku}</td>
                <td className="p-2 text-slate-700">{item.description}</td>
                <td className="p-2 font-mono text-slate-900">{formatPrice(item.unitPriceUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoutedOutcome({ envelope, onExportExcel, onEvaluateCandidateBom }) {
  if (!envelope) return null;
  const result = envelope.result || {};
  const items = result.items || result.evalResults?.items || [];
  const preview = JSON.stringify(envelope, null, 2);

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3">
      <OutcomeHeader
        envelope={envelope}
        result={result}
        onExportExcel={items.length > 0 ? onExportExcel : null}
        onEvaluateCandidateBom={items.length > 0 ? onEvaluateCandidateBom : null}
      />

      {envelope.cancellationRequested && (
        <p role="alert" className="text-xs font-semibold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
          Cancellation was requested. Completed effects and candidate BOM are preserved below.
        </p>
      )}

      {result.message && <p className="text-xs text-slate-700">{String(result.message)}</p>}

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

async function runClassification({ query, product, primary, secondary, localOnly, revision, setBusy, setError, setPlan, setResult }) {
  const version = revision.current;
  setBusy(true); setError(null); setResult(null);
  try {
    const input = await prepareRequest(query, product, primary, secondary, localOnly);
    const classification = await postJson('/api/query/classify', input);
    if (version === revision.current) setPlan({ input, classification, version });
  } catch (err) {
    if (version === revision.current) setError(err.message);
  } finally {
    setBusy(false);
  }
}

async function runExecution({ plan, revision, primary, query, localOnly, onEvaluateBoq, setBusy, setError, setResult }) {
  if (!plan || plan.version !== revision.current) return;
  const version = revision.current;
  setBusy(true); setError(null);
  try {
    if (plan.classification.intent === 'BOQ_EVALUATION') {
      const payload = primary ? { filepath: plan.input.context.filePath } : { rawText: query };
      await onEvaluateBoq({ ...payload, offline: localOnly });
    } else {
      const envelope = await postJson('/api/query/route', plan.input, { timeoutMs: 15 * 60 * 1000 });
      if (version === revision.current) setResult(envelope);
    }
  } catch (err) {
    if (version === revision.current) setError(err.message);
  } finally {
    setBusy(false);
  }
}

async function runExportExcel(result, product) {
  if (!result) return;
  try {
    const evalData = result.result?.evalResults || result.result || result;
    const resp = await postJson('/api/export-boq', {
      evalResults: evalData,
      chassisId: product?.id || result.result?.chassis || 'DL380_Gen12'
    });
    if (resp?.downloadPath) window.open(resp.downloadPath, '_blank');
  } catch (err) {
    alert(`Export blocked: ${err.message}`);
  }
}

async function runCandidateEvaluation(result, onEvaluateBoq, localOnly) {
  if (!result || !onEvaluateBoq) return;
  const items = result.result?.items || result.result?.evalResults?.items || result.items || [];
  if (!items.length) return;
  const rawText = items.map(it => `${it.quantity ?? 1}x ${it.sku} ${it.description || ''}`).join('\n');
  await onEvaluateBoq({ rawText, offline: localOnly });
}

function usePresalesSnapshot(product, setResult, setError) {
  useEffect(() => {
    setResult(null);
    const controller = new AbortController();
    const receive = event => {
      if (!event) return;
      if (!product?.id || event.product === product?.id) setResult(event.data || event);
    };
    const listener = event => receive(event.detail);
    window.addEventListener('dashboard-routed-result', listener);
    requestJson('/api/run-snapshot', { signal: controller.signal })
      .then(data => { if (data.latestQueryResult) receive(data.latestQueryResult); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => {
      controller.abort();
      window.removeEventListener('dashboard-routed-result', listener);
    };
  }, [product?.id, setResult, setError]);
}

function usePresalesRunner(query, product, primary, secondary, localOnly, onEvaluateBoq) {
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const revision = useRef(0);

  useEffect(() => {
    revision.current++;
    setPlan(null);
    setError(null);
  }, [query, product?.id, primary, secondary, localOnly]);

  usePresalesSnapshot(product, setResult, setError);

  const classify = () => runClassification({ query, product, primary, secondary, localOnly, revision, setBusy, setError, setPlan, setResult });
  const execute = () => runExecution({ plan, revision, primary, query, localOnly, onEvaluateBoq, setBusy, setError, setResult });
  const exportExcel = () => runExportExcel(result, product);
  const evaluateCandidateBom = () => runCandidateEvaluation(result, onEvaluateBoq, localOnly);

  return { plan, result, busy, error, classify, execute, exportExcel, evaluateCandidateBom };
}

function PresalesInputControls({ query, setQuery, setPrimary, setSecondary, localOnly, setLocalOnly }) {
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
          Use local catalog only (strictly air-gapped / offline)
        </label>
      </div>
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
        {busy ? 'Analyzing…' : 'Classify Intent'}
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
            Execute Solution
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
      <h2 className="font-bold text-base">Presales Request & Autonomous Sizing</h2>
      <p className="text-xs text-slate-600">
        Enter natural language sizing requirements, paste tender text, or drop customer quotes. The engine autonomously routes across Sizing, Validation, Reconciliation, and Catalog Intelligence for {product?.chassis || 'the selected platform'}.
      </p>
      <PresalesInputControls
        query={query} setQuery={setQuery}
        setPrimary={setPrimary} setSecondary={setSecondary}
        localOnly={localOnly} setLocalOnly={setLocalOnly}
      />
      <PresalesActionToolbar
        busy={busy} isTaskRunning={isTaskRunning} queryEmpty={!query.trim()}
        classify={classify} plan={plan} execute={execute}
      />
      {error && <p role="alert" className="text-sm text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200">{error}</p>}
      <RoutedOutcome envelope={result} onExportExcel={exportExcel} onEvaluateCandidateBom={evaluateCandidateBom} />
    </section>
  );
}