import RoutedOutcome, { INTENT_FRIENDLY_NAMES } from './presales/RoutedOutcome';
import AgentConversationThread from './presales/AgentConversationThread';
import React, { useEffect, useRef, useState } from 'react';
import { postJson, requestJson, uploadBoqFile } from '../services/api.js';
import { getCandidateExportEligibility } from '../services/exportEligibility.js';

const PRESET_QUERIES = [
  { label: 'Hardware envelope', query: 'What is the maximum PCIe, OCP and GPU capacity for DL380 Gen12?' },
  { label: 'Compare platforms', query: 'Compare DL380 Gen12 vs DL360 Gen12 for 32 cores and 256 GB RAM per node' },
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
      const next = { input, classification, version, originProduct: product ? { id: product.id, chassisDir: product.chassisDir } : null };
      setPlan(next);
      return next;
    }
  } catch (err) {
    if (version === revision.current) setError(err.message);
  } finally {
    setBusy(false);
  }
}

async function runExecution({ plan, mode, sessionId, revision, primary, query, localOnly, onEvaluateBoq, setBusy, setError, setResult, setActiveRunId, activeRunIdRef }) {
  if (!plan || plan.version !== revision.current || plan.classification.scope?.conflict) return;
  const version = revision.current;
  setBusy(true); setError(null);
  try {
    if (plan.classification.intent === 'BOQ_EVALUATION') {
      const payload = primary ? { filepath: plan.input.context.filePath } : { rawText: query };
      const products = plan.classification.scope?.products;
      const resolvedProduct = products?.length === 1 ? products[0] : null;
      await onEvaluateBoq({
        ...payload,
        chassisDir: plan.input?.context?.chassisDir || plan.originProduct?.chassisDir,
        chassisName: plan.input?.context?.chassisName || plan.originProduct?.id || resolvedProduct?.id,
        ...(!plan.originProduct && !resolvedProduct ? { autoScope: true } : {}),
        offline: plan.input?.context?.offline ?? localOnly
      });
    } else {
      const runId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      writeSessionValue(SESSION_PRESALES_RUN_KEY, runId);
      if (activeRunIdRef) activeRunIdRef.current = runId;
      if (setActiveRunId) setActiveRunId(runId);
      const envelope = await postJson('/api/agent/query', { ...plan.input, runId, sessionId, mode: localOnly ? 'DETERMINISTIC' : mode }, { timeoutMs: 15 * 60 * 1000 });
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
  const initiallyOwned = useRef(activeRunId);
  const recoverRunById = async (runId, signal) => {
    if (!runId) return;
    try {
      const data = await requestJson(`/api/run/${encodeURIComponent(runId)}`, { signal });
      if (signal?.aborted || activeRunIdRef.current !== runId) return;
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
    if (activeRunId && activeRunId === initiallyOwned.current) {
      initiallyOwned.current = null;
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

function usePresalesRunner(query, product, primary, secondary, localOnly, onEvaluateBoq, pinnedProductId, mode) {
  const initialRunId = readSessionValue(SESSION_PRESALES_RUN_KEY);
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState(null);
  const [activeRunId, setActiveRunId] = useState(initialRunId);
  const activeRunIdRef = useRef(initialRunId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const revision = useRef(0);
  const submitting = useRef(false);
  const [sessionId] = useState(() => {
    const key = 'presales.sessionId';
    const value = readSessionValue(key) || crypto.randomUUID();
    writeSessionValue(key, value);
    return value;
  });

  useEffect(() => {
    revision.current++;
    setPlan(null);
    setError(null);
  }, [query, primary, secondary, localOnly, pinnedProductId]);

  usePresalesSnapshot(setResult, setError, activeRunId, setActiveRunId, activeRunIdRef);

  const classify = () => runClassification({ query, product, primary, secondary, localOnly, activeRunIdRef, revision, setBusy, setError, setPlan, setResult });
  const executePlan = next => runExecution({ plan: next, mode, sessionId, revision, primary, query, localOnly, onEvaluateBoq, setBusy, setError, setResult, setActiveRunId, activeRunIdRef });
  const execute = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const next = plan || await classify();
      if (next) await executePlan(next);
    } finally { submitting.current = false; }
  };
  const exportExcel = () => runExportExcel(result, product, setError);
  const evaluateCandidateBom = () => runCandidateEvaluation(result, onEvaluateBoq, localOnly);

  return { plan, result, busy, error, classify, execute, exportExcel, evaluateCandidateBom };
}

function PresalesInputControls({ query, setQuery, primary, setPrimary, secondary, setSecondary, localOnly, setLocalOnly, serverOffline, onKeyDown }) {
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
          onKeyDown={onKeyDown}
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
      <div className="flex flex-wrap items-end gap-4 text-xs">
        <label className="block text-slate-700 font-medium">
          <span className="block mb-1">Customer tender / input file (optional)</span>
          <input
            type="file"
            className="block w-full max-w-[260px] text-xs text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer"
            onChange={event => setPrimary(event.target.files?.[0] || null)}
          />
        </label>
        <label className="block text-slate-700 font-medium">
          <span className="block mb-1">Vendor quote / second baseline (optional)</span>
          <input
            type="file"
            className="block w-full max-w-[260px] text-xs text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer"
            onChange={event => setSecondary(event.target.files?.[0] || null)}
          />
        </label>
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 pb-1.5">
          <input type="checkbox" checked={localOnly} disabled={serverOffline} onChange={event => setLocalOnly(event.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
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

function describePlanScope(plan) {
  const scope = plan.classification.scope;
  if (scope?.unresolvedProducts?.length) return `Unresolved · ${scope.unresolvedProducts.join(', ')}`;
  if (scope?.products?.length) return scope.products.map(product => product.label).join(' + ');
  if (scope?.generations?.length) return scope.generations.join(' + ');
  if (plan.originProduct) return plan.originProduct.id.replaceAll('_', ' ');
  if (['CATALOG_INTELLIGENCE', 'SOLUTION_COMPARISON'].includes(plan.classification.intent)) return 'Portfolio-wide';
  if (plan.input.context.filePath || plan.input.context.secondaryFilePath) return 'Auto · Identify from attachments during intake';
  if (plan.classification.intent === 'BOQ_EVALUATION') return 'Auto · Identify from BOQ';
  return 'Auto · No product selected';
}

function PresalesActionToolbar({ busy, isTaskRunning, queryEmpty, classify, plan, execute, primary, secondary }) {
  const friendlyIntent = plan ? (INTENT_FRIENDLY_NAMES[plan.classification.intent] || plan.classification.intent) : '';
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <button className="btn-primary text-xs" disabled={busy || isTaskRunning || queryEmpty || Boolean(plan?.classification.scope?.conflict)} onClick={execute}>
        {busy ? 'Working…' : 'Run query'}
      </button>
      <button className="btn-secondary text-xs" disabled={busy || isTaskRunning || queryEmpty} onClick={classify}>Preview route</button>
      {plan && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-emerald text-xs">{friendlyIntent}</span>
          <span className="text-xs text-slate-600">{plan.classification.rationale}</span>
          <p className="basis-full text-sm text-slate-700">
            <strong>Scope</strong> {describePlanScope(plan)} · {plan.input.context.offline ? 'Local catalog only' : 'Cloud services allowed'}
          </p>
          {(primary || secondary) && (
            <p className="basis-full break-words text-sm text-slate-700">
              <strong>Files</strong> {[primary?.name, secondary?.name].filter(Boolean).join(' · ')}
            </p>
          )}
          {plan.classification.scope?.conflict && <p role="alert" className="basis-full text-sm text-rose-800">{plan.classification.scope.conflict}</p>}

        </div>
      )}
    </div>
  );
}

/** Route supported presales requests through the existing canonical engine. */
export default function PresalesRequestPanel({ product: initialProduct, catalogs = [], isTaskRunning, onEvaluateBoq, localOnly: localOnlyProp, onLocalOnlyChange, serverOffline, omniboxRequest, onConsumeOmnibox }) {
  const [pinnedProductId, setPinnedProductId] = useState(null);
  const product = catalogs.find(catalog => catalog.id === pinnedProductId)
    || (pinnedProductId === null ? initialProduct : null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('SMART_AUTO');
  const [pending, setPending] = useState(null);
  const accepted = useRef(null);
  const [primary, setPrimary] = useState(null);
  const [secondary, setSecondary] = useState(null);
  const [localOnlyPreference, setLocalOnlyPreference] = useState(false);
  const localOnly = Boolean(serverOffline || (localOnlyProp ?? localOnlyPreference));
  const setLocalOnly = onLocalOnlyChange || setLocalOnlyPreference;

  const { plan, result, busy, error, classify, execute, exportExcel, evaluateCandidateBom } = usePresalesRunner(
    query, product, primary, secondary, localOnly, onEvaluateBoq, pinnedProductId, mode
  );

  useEffect(() => {
    if (!omniboxRequest?.id || accepted.current === omniboxRequest.id) return;
    accepted.current = omniboxRequest.id;
    setPrimary(null); setSecondary(null);
    setQuery(omniboxRequest.query);
    setPending(omniboxRequest);
    onConsumeOmnibox?.();
  }, [omniboxRequest, onConsumeOmnibox]);
  useEffect(() => {
    if (!pending || serverOffline === null || pending.query !== query) return;
    setPending(null);
    if (!isTaskRunning && !busy) void (pending.preview ? classify() : execute());
  }, [pending, serverOffline, query, isTaskRunning, busy, classify, execute]);

  const runFromKeyboard = event => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!busy && !isTaskRunning && (query.trim() || primary)) void execute();
  };
  if (serverOffline === null) return <p role="status" className="text-xs text-slate-600">Reading server evaluation policy…</p>;

  return (
    <section className="glass-card p-5 mb-5 space-y-3">
      <h2 className="font-bold text-base">Presales request</h2>
      <p className="text-xs text-slate-600">
        Enter runs your query. Use Shift+Enter for a new line, or preview the route before running.
      </p>
      <div className="space-y-1">
        <label htmlFor="presales-product-scope" className="block text-sm font-medium text-slate-700">
          Product scope
        </label>
        <select
          id="presales-product-scope"
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={pinnedProductId ?? initialProduct?.id ?? ''}
          onChange={event => setPinnedProductId(event.target.value)}
        >
          <option value="">Auto · Use request context</option>
          {(catalogs.length ? catalogs : [initialProduct].filter(Boolean)).map(catalog => (
            <option key={catalog.id} value={catalog.id}>{catalog.chassis || catalog.label || catalog.id}</option>
          ))}
        </select>
      </div>
      <PresalesInputControls
        onKeyDown={runFromKeyboard} query={query} setQuery={setQuery}
        primary={primary} setPrimary={setPrimary}
        secondary={secondary} setSecondary={setSecondary}
        localOnly={localOnly} setLocalOnly={setLocalOnly} serverOffline={serverOffline}
      />
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label htmlFor="presales-execution-mode" className="font-semibold text-slate-700">Execution mode</label>
        <select
          id="presales-execution-mode"
          aria-label="Execution mode"
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
          value={localOnly ? 'DETERMINISTIC' : mode}
          disabled={localOnly || busy}
          onChange={e => setMode(e.target.value)}
        >
          <option value="SMART_AUTO">Smart Auto</option>
          <option value="DETERMINISTIC">Deterministic only</option>
          <option value="GEMINI_AGENT">Gemini Copilot</option>
          <option value="AGY_DEEP">Antigravity Deep</option>
        </select>
      </div>
      <PresalesActionToolbar
        busy={busy} isTaskRunning={isTaskRunning} queryEmpty={!query.trim() && !primary && !secondary}
        classify={classify} plan={plan} execute={execute} primary={primary} secondary={secondary}
      />
      {error && <p role="alert" className="text-sm text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200">{error}</p>}
      <AgentConversationThread envelope={result} />
      <RoutedOutcome envelope={result} onExportExcel={exportExcel} onEvaluateCandidateBom={evaluateCandidateBom} />
    </section>
  );
}
