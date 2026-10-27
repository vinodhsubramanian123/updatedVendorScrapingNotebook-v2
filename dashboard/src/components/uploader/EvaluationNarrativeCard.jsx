import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Copy, CheckCircle2 } from 'lucide-react';

export default function EvaluationNarrativeCard({ narrative, _chassis }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  if (!narrative || typeof narrative !== 'string') return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(narrative);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Split narrative by section headers (### Step X)
  const sections = narrative.split(/(?=###\s+Step\s+\d+)/g).map(s => s.trim()).filter(Boolean);

  return (
    <div className="rounded-xl border border-blue-200/90 bg-white/95 shadow-xs overflow-hidden transition-all duration-200">
      <div 
        className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-b border-blue-100 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                5-Step Architectural Reasoning & Anti-Hallucination Audit (INV-126)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                Grounded Narrative
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Deterministic 5-step numbered reasoning trace across 7 aspects, conflicts, and customer action gates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
            title="Copy narrative to clipboard"
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3 text-xs bg-slate-50/40 divide-y divide-slate-100">
          {sections.map((sec, idx) => {
            const firstLine = sec.split('\n')[0].replace(/^###\s+/, '');
            const bodyLines = sec.split('\n').slice(1).filter(l => l.trim().length > 0);

            return (
              <div key={idx} className={idx > 0 ? 'pt-3' : ''}>
                <h4 className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  {firstLine}
                </h4>
                <div className="pl-7 space-y-1 font-sans text-slate-700 text-[11px] leading-relaxed">
                  {bodyLines.map((line, lIdx) => {
                    const isBullet = line.trim().startsWith('-');
                    const clean = line.replace(/^-\s*/, '').replace(/\*\*/g, '');

                    return (
                      <div key={lIdx} className={isBullet ? 'flex items-start gap-1.5' : 'text-slate-600'}>
                        {isBullet && <span className="text-slate-400 font-bold">•</span>}
                        <span>{clean}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
