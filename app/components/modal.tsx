'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ children, title, onClose, className = '' }: { children: ReactNode; title: string; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
      if (event.key !== 'Tab') return;
      const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]') || []).filter(item => item.offsetParent !== null);
      const first = elements[0]; const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = originalOverflow; document.removeEventListener('keydown', handler); previousFocus?.focus(); };
  }, []);
  return <div className={`modal-backdrop ${className}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-window" ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
      <div className="modal-titlebar"><span>{title}</span><button className="icon-button" onClick={onClose} aria-label="關閉視窗"><X size={21} /></button></div>
      {children}
    </div>
  </div>;
}
