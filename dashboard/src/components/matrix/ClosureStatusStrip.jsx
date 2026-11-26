import React from 'react';
import { ShieldCheck, AlertTriangle, Lock, FileCode2 } from 'lucide-react';

function _resolveClosureBadge(closureVerified) {
  if (closureVerified === true) return { cls: 'badge-emerald', label: 'CLOSURE VERIFIED', Icon: ShieldCheck };
  if (closureVerified === false) return { cls: 'badge-rose', label: 'CLOSURE BLOCKED', Icon: AlertTriangle };
  return null;
}

function _extractClosureData(source, evalResults) {
  const cg = source.conflictGraph || {};
  return {
    closureVerified: source.closureVerified ?? cg.closureVerified ?? null,
    planDigest: source.closurePlanDigest || source.planDigest || cg.planDigest || null,
    irDiagnostics: source.ruleIrDiagnostics || cg.ruleIrDiagnostics || [],
    portalStatus: source.portalValidationStatus || evalResults?.portalValidationStatus || 'PENDING'
  };
}

function RuleIrDetails({ diagnostics }) {
  if (!Array.isArray(diagnostics) || diagnostics.length === 0) return null;
  return (
    <details className="text-[11px] text-slate-600">
      <summary className="cursor-pointer font-semibold text-slate-700 select-none">
        5-Level Rule-IR Diagnostics ({diagnostics.length})
      </summary>
      <ul className="mt-1 space-y-0.5 pl-4 list-disc">
        {diagnostics.slice(0, 10).map((diag, idx) => (
          <li key={idx} className="font-mono text-[10px]">
            {typeof diag === 'string' ? diag : (diag.message || diag.reason || JSON.stringify(diag))}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ClosureStatusStrip({ evalResults, tier = null, compact = false }) {
  const source = tier || evalResults;
  if (!source) return null;

  const { closureVerified, planDigest, irDiagnostics, portalStatus } = _extractClosureData(source, evalResults);
  const badge = _resolveClosureBadge(closureVerified);
  if (!badge && !planDigest && irDiagnostics.length === 0) return null;

  const isPending = portalStatus !== 'PASSED' && portalStatus !== 'VERIFIED';
  return (
    <div data-testid="closure-status-strip" className={`surface-panel rounded-lg ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} text-xs space-y-1.5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {badge && (
            <span className={`badge ${badge.cls} inline-flex items-center gap-1 font-bold`}>
              <badge.Icon className="w-3 h-3" /> {badge.label}
            </span>
          )}
          {isPending && (
            <span className="badge badge-amber inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> PORTAL VALIDATION PENDING
            </span>
          )}
        </div>
        {planDigest && (
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1" title={planDigest}>
            <FileCode2 className="w-3 h-3" /> Digest: {String(planDigest).slice(0, 12)}
          </span>
        )}
      </div>
      {!compact && <RuleIrDetails diagnostics={irDiagnostics} />}
    </div>
  );
}
