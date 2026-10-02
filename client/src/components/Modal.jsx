import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * Dialog: centred on desktop, bottom sheet on mobile. `variant="drawer"` slides in from
 * the right on desktop (admin create/edit panels).
 */
export function Modal({ isOpen, onClose, title, description, children, footer, className, maxWidth = 'md:max-w-lg', variant = 'dialog' }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    const previous = document.activeElement;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const drawer = variant === 'drawer';

  return (
    <div className={cn('fixed inset-0 z-[900] flex items-end md:items-center', drawer ? 'md:justify-end' : 'md:justify-center md:p-4')}>
      <div className="absolute inset-0 bg-text/40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative w-full bg-surface shadow-raised flex flex-col max-h-[92vh] outline-none animate-fade-in',
          'rounded-t-lg md:rounded-lg',
          drawer && 'md:h-full md:max-h-none md:rounded-none md:max-w-md',
          !drawer && maxWidth,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-border">
          <div>
            <h2 id={titleId} className="text-h3 text-text">
              {title}
            </h2>
            {description && <p className="text-small text-text-muted mt-0.5">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -m-1 rounded-md text-text-subtle hover:text-text hover:bg-neutral-soft" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-border flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
