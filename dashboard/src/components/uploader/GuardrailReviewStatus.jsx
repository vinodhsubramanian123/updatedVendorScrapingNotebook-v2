import React from 'react';

const LABELS = {
  ADVISORY_RETURNED: 'Model review returned',
  UNAVAILABLE: 'Model review unavailable or incomplete',
  NOT_RUN: 'Model review was not run'
};

export default function GuardrailReviewStatus({ status = 'NOT_RUN', review, guardrailMeta = null }) {
  const recovered = review?.recoveryEvents?.length || 0;
  const promptVersion = guardrailMeta?.promptVersion || review?.promptVersion || 'v4';
  const negationGuarded = guardrailMeta?.negationGuardApplied ?? true;
  return (
    <section aria-label="Independent model review" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-800">{LABELS[status] || 'Model review status unknown'}</p>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="badge badge-indigo">Prompt {promptVersion}</span>
          {negationGuarded && <span className="badge badge-blue">Negation Guard</span>}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        {status === 'ADVISORY_RETURNED'
          ? 'This is an advisory review. NotebookLM source validation and vendor acceptance have separate results.'
          : 'Use the recorded local, NotebookLM and vendor evidence; this result does not include a completed independent model review.'}
      </p>
      {review?.model && <p className="mt-1 text-xs text-slate-500">Model: {review.model}{recovered > 0 ? ` · ${recovered} recovery attempts` : ''}</p>}
    </section>
  );
}
