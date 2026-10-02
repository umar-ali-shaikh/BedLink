import React from 'react';
import { BedDouble } from 'lucide-react';
import { cn } from '../utils/cn';

/** Wordmark: Inter 700 + Lucide BedDouble in a primary tile (DESIGN.md §1). */
export function Logo({ subtitle, size = 'md', className }) {
  const big = size === 'lg';
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className={cn('rounded-md bg-primary text-text-inverse flex items-center justify-center shrink-0', big ? 'w-10 h-10' : 'w-8 h-8')}>
        <BedDouble className={big ? 'w-6 h-6' : 'w-[18px] h-[18px]'} aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn('font-bold text-text tracking-tight', big ? 'text-h2' : 'text-[15px]')}>BedLink</span>
        {subtitle && <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">{subtitle}</span>}
      </span>
    </span>
  );
}
