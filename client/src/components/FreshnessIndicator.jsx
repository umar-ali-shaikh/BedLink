import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNow } from '../hooks/useNow';
import { formatRelativeShort, formatRelativeTime, freshnessOf } from '../utils/formatRelative';
import { cn } from '../utils/cn';

/**
 * "● Updated 32 seconds ago", ticking every second. FRESH green · RECENT slate ·
 * STALE amber with warning icon (DESIGN.md §5). Tier is computed from the timestamp so
 * it keeps ageing between server updates.
 */
export function FreshnessIndicator({ timestamp, compact = false, className }) {
  const now = useNow(1000);
  const tier = freshnessOf(timestamp, now);
  const text = compact ? formatRelativeShort(timestamp, now) : formatRelativeTime(timestamp, now);

  if (!timestamp) {
    return <span className={cn('text-small text-text-subtle', className)}>No updates yet</span>;
  }

  if (tier === 'STALE') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-small font-medium text-warning', className)}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {compact ? text : `Data may be outdated — updated ${text}`}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-small', tier === 'FRESH' ? 'text-success' : 'text-text-muted', className)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', tier === 'FRESH' ? 'bg-success' : 'bg-neutral-state')} aria-hidden />
      Updated {text}
    </span>
  );
}
