import React from 'react';
import { Activity, BedDouble, Flame, HeartPulse, Wind } from 'lucide-react';
import { SUMMARY_RESOURCES } from '../../constants/bed';
import { cn } from '../../utils/cn';

const ICONS = { ICU: BedDouble, VENTILATOR: Wind, OXYGEN: Activity, CARDIAC: HeartPulse, BURNS: Flame };

/** Big number + label + icon; zero shows neutral "None available" (DESIGN.md §5). */
export function BedCounters({ available = {}, columns = 'grid-cols-2' }) {
  return (
    <div className={cn('grid gap-2.5', columns)}>
      {SUMMARY_RESOURCES.map(({ key, label }) => {
        const n = available[key] ?? 0;
        const Icon = ICONS[key];
        return (
          <div key={key} className={cn('rounded-md border p-3.5', n > 0 ? 'bg-surface border-border' : 'bg-surface-muted border-border')}>
            <div className="flex items-center justify-between">
              <span className={cn('text-number-lg tabular-nums', n > 0 ? 'text-text' : 'text-text-subtle')}>{n}</span>
              <Icon className={cn('w-5 h-5', n > 0 ? 'text-success' : 'text-text-subtle')} aria-hidden />
            </div>
            <p className="text-small font-semibold text-text mt-1">{label}</p>
            <p className={cn('text-[12px]', n > 0 ? 'text-success' : 'text-text-subtle')}>{n > 0 ? 'available' : 'None available'}</p>
          </div>
        );
      })}
    </div>
  );
}
