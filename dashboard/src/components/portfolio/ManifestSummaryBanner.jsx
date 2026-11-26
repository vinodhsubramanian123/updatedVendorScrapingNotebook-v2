import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { requestJson } from '../../services/api.js';

export default function ManifestSummaryBanner({ chassisDir, chassisName }) {
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    const target = String(chassisDir || chassisName || '').toLowerCase().replace(/[_\s]+/g, '');
    if (!target) { setManifest(null); return; }
    const controller = new AbortController();
    requestJson('/api/product-manifests', { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        const found = (data?.manifests || []).find(m => {
          const pNorm = String(m.productId || '').toLowerCase().replace(/[_\s]+/g, '');
          return pNorm === target || target.includes(pNorm) || pNorm.includes(target);
        });
        setManifest(found || null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [chassisDir, chassisName]);

  if (!manifest) return null;

  return (
    <div data-testid="manifest-summary-banner" className="surface-panel rounded-xl p-3 mb-4 text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-bold text-slate-900">Capability Manifest: {manifest.displayName}</span>
        <span className="badge badge-blue">{manifest.domain}</span>
        <span className="badge badge-slate">{manifest.family}</span>
        {manifest.formFactor && <span className="font-mono text-[11px] text-slate-500">{manifest.formFactor}</span>}
      </div>
      <details className="text-[11px] text-slate-600">
        <summary className="cursor-pointer font-semibold text-blue-600 select-none">Inspect JSON Schema</summary>
        <pre className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 max-h-56 overflow-auto font-mono text-[10px] w-full">
          {JSON.stringify(manifest.manifest, null, 2)}
        </pre>
      </details>
    </div>
  );
}
