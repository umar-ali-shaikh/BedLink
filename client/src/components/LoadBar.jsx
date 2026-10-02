import React from 'react';
import { cn } from '../utils/cn';

/** "55% ▬▬▬──" load meter; colour by band (≥95 critical, ≥80 high). */
export function LoadBar({ value = 0, className }) {
  const tone = value >= 95 ? 'bg-danger' : value >= 80 ? 'bg-warning' : value >= 60 ? 'bg-primary' : 'bg-success';
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="tabular-nums text-small text-text w-9">{value}%</span>
      <span className="w-16 h-1.5 rounded-full bg-primary-soft overflow-hidden" aria-hidden>
        <span className={cn('block h-full rounded-full', tone)} style={{ width: `${Math.min(100, value)}%` }} />
      </span>
    </span>
  );
}
