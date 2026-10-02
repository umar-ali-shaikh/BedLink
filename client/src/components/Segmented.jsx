import React from 'react';
import { cn } from '../utils/cn';

/**
 * Segmented control / tab chips. `options`: [{ value, label, count? }].
 * `tone="filled"` gives the solid active segment used in the Stitch bed filter.
 */
export function Segmented({ options, value, onChange, label, className, size = 'md', disabled }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex flex-wrap gap-1.5', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border font-semibold transition-colors disabled:opacity-50',
              size === 'lg' ? 'h-12 px-4 text-[15px]' : 'h-9 px-3 text-small',
              active ? 'bg-primary border-primary text-text-inverse' : 'bg-surface border-border text-text-muted hover:text-text hover:border-border-strong'
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span className={cn('tabular-nums text-[11px] px-1.5 rounded', active ? 'bg-text-inverse/20' : 'bg-neutral-soft text-text-subtle')}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
