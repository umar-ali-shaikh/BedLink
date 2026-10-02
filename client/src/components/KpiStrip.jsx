import React from 'react';
import { Skeleton } from './Skeleton';
import { cn } from '../utils/cn';

const TONES = { success: 'text-success', danger: 'text-danger', warning: 'text-warning', primary: 'text-primary' };

/** One card divided into KPI cells: uppercase caption + big tabular number (Stitch overview). */
export function KpiStrip({ items, isLoading, className }) {
  return (
    <div className={cn('bg-surface border border-border rounded-lg shadow-card overflow-hidden', className)}>
      <dl className={cn('grid grid-cols-2 sm:grid-cols-4 divide-border [&>div]:border-border', items.length > 4 && 'xl:grid-cols-8')}>
        {items.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              'px-4 py-4 border-b sm:border-r',
              i % 2 === 0 && 'border-r',
              (i + 1) % 4 === 0 && 'sm:border-r-0',
              items.length > 4 ? 'xl:border-b-0' : i >= items.length - 4 && 'sm:border-b-0',
              items.length > 4 && (i + 1) % 4 === 0 && 'xl:border-r',
              i === items.length - 1 && 'xl:border-r-0'
            )}
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle min-h-[16px]">{item.label}</dt>
            <dd className={cn('mt-2 text-[26px] leading-8 font-bold tabular-nums', TONES[item.tone] ?? 'text-text')}>
              {isLoading ? <Skeleton className="h-7 w-14" /> : (item.value ?? '—')}
              {!isLoading && item.unit && item.value != null && <span className="text-[18px] font-semibold ml-1">{item.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
