import React, { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/** "Why not this hospital?" — collapsed by default (DESIGN.md §5). */
export function ExcludedList({ exclusions = [], defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!exclusions.length) return null;

  return (
    <section className="bg-surface border border-border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 h-12 text-small font-semibold text-text-muted hover:text-text"
      >
        <span>
          {exclusions.length} hospital{exclusions.length === 1 ? '' : 's'} excluded <span className="font-normal text-text-subtle">— why not?</span>
        </span>
        <ChevronRight className={cn('w-4 h-4 transition-transform', open && 'rotate-90')} aria-hidden />
      </button>
      {open && (
        <ul className="border-t border-border divide-y divide-border">
          {exclusions.map((ex) => (
            <li key={ex.hospitalId} className="px-4 py-3">
              <p className="text-small font-semibold text-text-muted">{ex.hospitalName}</p>
              <ul className="mt-1 space-y-0.5">
                {(ex.messages?.length ? ex.messages : ex.reasons).map((m) => (
                  <li key={m} className="flex items-start gap-1.5 text-small text-text-subtle">
                    <X className="w-3.5 h-3.5 text-danger mt-0.5 shrink-0" aria-hidden />
                    {m}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
