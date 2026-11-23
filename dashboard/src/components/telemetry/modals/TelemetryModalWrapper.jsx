import { createPortal } from 'react-dom';
import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable modal wrapper with Esc key detection, animated backdrop, and header.
 */
export default function TelemetryModalWrapper({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  headerBg = 'bg-slate-50',
  headerBorder = 'border-slate-100',
  maxWidth = 'max-w-2xl',
  footerContent,
  insight,
  children
}) {
  const titleId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm animate-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`bg-white w-full ${maxWidth} rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-modal-content`}>
        <div className={`p-4 border-b ${headerBorder} flex items-center justify-between ${headerBg}`}>
          <div className="pr-4">
            <h2 id={titleId} className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {insight && (
            <section className="mb-4 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <h3 className="font-semibold text-slate-900">Root cause and recommended action</h3>
              <p>{insight.why}</p>
              <p><strong>Next action</strong> · {insight.action}</p>
            </section>
          )}
          {children}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
          <div>{footerContent}</div>
          <button onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
