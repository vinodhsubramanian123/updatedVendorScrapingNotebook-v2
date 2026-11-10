import React, { useEffect, useRef, useState } from 'react';
import { postJson, requestJson, uploadBoqFile } from '../services/api.js';
import { formatPrice } from '../services/pricing.js';

async function prepareRequest(query, product, primary, secondary, localOnly) {
  const context = { chassisName: product.id, chassisDir: product.chassisDir, offlineMode: localOnly };
  if (primary) context.filePath = (await uploadBoqFile(primary)).filepath;
  if (secondary) context.secondaryFilePath = (await uploadBoqFile(secondary)).filepath;
  return { query, context };
}

function RoutedOutcome({ envelope }) {
  if (!envelope) return null;
  const result = envelope.result || {};
  const items = result.items || result.evalResults?.items || [];
  const preview = JSON.stringify(envelope, null, 2);
  return <div className="space-y-3 border-t border-slate-200 pt-3">
    <h3 className="font-semibold text-sm">{result.status || 'Workflow outcome returned'}</h3>
    <p className="text-xs text-slate-600">Request: {envelope.query}</p>
    {envelope.cancellationRequested && <p role="alert" className="text-sm text-amber-900">Cancellation was requested. Review the actual outcome and completed effects below.</p>}
    {result.message && <p className="text-sm">{String(result.message)}</p>}
    <p className="text-xs text-amber-900">Review the reported blockers and evidence. Generated candidates require the evaluation and vendor acceptance gates before customer delivery.</p>
    {Array.isArray(items) && items.length > 0 && <div className="overflow-auto max-h-72">
      <table className="w-full text-xs text-left"><thead><tr><th>Quantity</th><th>SKU</th><th>Description</th><th>Unit price</th></tr></thead>
        <tbody>{items.slice(0, 100).map((item, index) => <tr key={index}><td>{item.quantity ?? 'Unknown'}</td><td>{item.sku}</td><td>{item.description}</td><td>{formatPrice(item.unitPriceUsd)}</td></tr>)}</tbody>
      </table>
      {items.length > 100 && <p>Showing the first 100 items. Full data is available in the structured outcome.</p>}
    </div>}
    <details><summary className="text-xs cursor-pointer">Structured outcome and evidence</summary>
      <pre className="text-[11px] overflow-auto max-h-80 whitespace-pre-wrap">{preview.slice(0, 50000)}</pre>
      {preview.length > 50000 && <p className="text-xs">Preview shortened to 50,000 characters.</p>}
    </details>
  </div>;
}

/** Route supported presales requests through the existing canonical engine. */
export default function PresalesRequestPanel({ product, isTaskRunning, onEvaluateBoq }) {
  const [query, setQuery] = useState('');
  const [primary, setPrimary] = useState(null);
  const [secondary, setSecondary] = useState(null);
  const [localOnly, setLocalOnly] = useState(true);
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const revision = useRef(0);
  useEffect(() => { revision.current++; setPlan(null); setError(null); }, [query, product?.id, primary, secondary, localOnly]);
  useEffect(() => {
    setResult(null);
    const controller = new AbortController();
    const receive = event => { if (event.product === product?.id) setResult(event.data); };
    const listener = event => receive(event.detail);
    window.addEventListener('dashboard-routed-result', listener);
    requestJson('/api/run-snapshot', { signal: controller.signal }).then(data => {
      if (data.latestQueryResult) receive(data.latestQueryResult);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => { controller.abort(); window.removeEventListener('dashboard-routed-result', listener); };
  }, [product?.id]);

  const classify = async () => {
    const version = revision.current;
    setBusy(true); setError(null); setResult(null);
    try {
      const input = await prepareRequest(query, product, primary, secondary, localOnly);
      const classification = await postJson('/api/query/classify', input);
      if (version === revision.current) setPlan({ input, classification, version });
    } catch (err) { if (version === revision.current) setError(err.message); }
    finally { setBusy(false); }
  };
  const execute = async () => {
    if (!plan || plan.version !== revision.current) return;
    const version = revision.current;
    setBusy(true); setError(null);
    try {
      if (plan.classification.intent === 'BOQ_EVALUATION') {
        const payload = primary ? { filepath: plan.input.context.filePath } : { rawText: query };
        await onEvaluateBoq(payload);
      } else {
        const envelope = await postJson('/api/query/route', plan.input, { timeoutMs: 15 * 60 * 1000 });
        if (version === revision.current) setResult(envelope);
      }
    } catch (err) { if (version === revision.current) setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="glass-card p-5 mb-5 space-y-3">
    <h2 className="font-bold text-base">Presales request</h2>
    <p className="text-xs text-slate-600">Describe a sizing, comparison, reconciliation or catalog request. Review the chosen workflow before running it for {product?.chassis || 'the selected product'}.</p>
    <label className="block text-sm">Requirements or question
      <textarea className="block w-full border rounded-lg p-2 mt-1 text-sm" rows={3} value={query} onChange={event => setQuery(event.target.value)} />
    </label>
    <div className="flex flex-wrap gap-4 text-xs">
      <label>Customer tender / input file (optional)<input type="file" className="block mt-1" onChange={event => setPrimary(event.target.files?.[0] || null)} /></label>
      <label>Vendor quote / second baseline (optional)<input type="file" className="block mt-1" onChange={event => setSecondary(event.target.files?.[0] || null)} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={localOnly} onChange={event => setLocalOnly(event.target.checked)} />Use local catalog only</label>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn-secondary text-xs" disabled={busy || isTaskRunning || !product || !query.trim()} onClick={classify}>{busy ? 'Working…' : 'Identify workflow'}</button>
      {plan && <><span className="text-xs">{plan.classification.intent}: {plan.classification.rationale}</span>
        <button className="btn-primary text-xs" disabled={busy || isTaskRunning || plan.classification.intent === 'AMBIGUOUS_QUERY'} onClick={execute}>Run workflow</button></>}
    </div>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
    <RoutedOutcome envelope={result} />
  </section>;
}
