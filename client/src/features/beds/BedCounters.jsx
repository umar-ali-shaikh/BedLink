import React from 'react';
import { BedDouble, Wind, Activity, HeartPulse, Flame } from 'lucide-react';
import { cn } from '../../utils/cn';

export function BedCounters({ counts = {}, className }) {
  const items = [
    { key: 'icu', label: 'ICU Beds', icon: BedDouble, count: counts.icu ?? 0, color: 'text-primary' },
    { key: 'ventilator', label: 'Ventilators', icon: Wind, count: counts.ventilator ?? 0, color: 'text-success' },
    { key: 'oxygen', label: 'Oxygen', icon: Activity, count: counts.oxygen ?? 0, color: 'text-primary' },
    { key: 'cardiac', label: 'Cardiac', icon: HeartPulse, count: counts.cardiac ?? 0, color: 'text-danger' },
    { key: 'burns', label: 'Burns Unit', icon: Flame, count: counts.burns ?? 0, color: 'text-warning' },
  ];

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isZero = item.count === 0;

        return (
          <div
            key={item.key}
            className={cn(
              'p-4 rounded-xl border transition-all duration-150',
              isZero
                ? 'bg-surface-muted/60 border-border text-neutral-state'
                : 'bg-surface border-border shadow-card hover:border-border-strong'
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                {item.label}
              </span>
              <Icon className={cn('w-4 h-4', isZero ? 'text-neutral-state' : item.color)} />
            </div>

            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-bold tabular-nums', isZero ? 'text-neutral-state' : 'text-text')}>
                {item.count}
              </span>
              <span className="text-xs font-medium text-text-muted">
                {isZero ? 'None available' : 'available'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
