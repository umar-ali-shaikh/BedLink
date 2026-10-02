import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

const ToastContext = createContext({ showToast: () => {} });

const ICONS = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info };
const TONES = {
  success: 'border-l-success text-success',
  error: 'border-l-danger text-danger',
  warning: 'border-l-warning text-warning',
  info: 'border-l-primary text-primary',
};

/** Bottom-right on desktop, top on mobile; 5 s (errors 8 s) — DESIGN.md §5 Toast. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const showToast = useCallback(
    ({ title, message, type = 'info', duration, action }) => {
      const id = ++seq.current;
      setToasts((prev) => [...prev.slice(-3), { id, title, message, type, action }]);
      setTimeout(() => dismiss(id), duration ?? (type === 'error' ? 8000 : 5000));
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div
        className="fixed z-[1000] inset-x-0 top-2 px-3 flex flex-col gap-2 items-center pointer-events-none md:inset-x-auto md:top-auto md:bottom-5 md:right-5 md:items-end md:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info;
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto w-full max-w-sm flex items-start gap-3 p-3.5 rounded-md bg-surface border border-border border-l-4 shadow-raised animate-fade-in',
                TONES[t.type]
              )}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-small font-semibold text-text">{t.title}</p>}
                {t.message && <p className="text-small text-text-muted mt-0.5">{t.message}</p>}
              </div>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                  className="text-small font-semibold text-primary hover:underline px-1"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-text-subtle hover:text-text p-0.5 rounded"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
