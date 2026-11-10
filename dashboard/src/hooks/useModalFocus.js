import { useEffect, useRef } from 'react';

/** Contain keyboard focus and restore it when a modal closes. */
export function useModalFocus(isOpen, onClose) {
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const root = panel.current;
    root?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); close.current(); return; }
      if (event.key !== 'Tab' || !root) return;
      const controls = [...root.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); root.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) { event.preventDefault(); first.focus(); }
    };
    root?.addEventListener('keydown', handleKey);
    return () => { root?.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);
  return panel;
}
