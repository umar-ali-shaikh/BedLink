import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNow } from '../hooks/useNow';
import { formatRelativeTime } from '../utils/formatRelative';
import { cn } from '../utils/cn';

export function FreshnessIndicator({ timestamp, className }) {
  const now = useNow(1000);

  if (!timestamp) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-text-subtle', className)}>
        <span className="w-2 h-2 rounded-full bg-border-strong inline-block" />
        <span>No update data</span>
      </span>
    );
  }

  const timeMs = new Date(timestamp).getTime();
  const diffSec = Math.max(0, Math.floor((now - timeMs) / 1000));
  const relativeText = formatRelativeTime(timestamp, now);

  // Freshness thresholds from PRD/ARCHITECTURE
  // FRESH <= 120s, RECENT <= 600s, STALE > 600s
  const isFresh = diffSec <= 120;
  const isRecent = diffSec > 120 && diffSec <= 600;
  const isStale = diffSec > 600;

  if (isStale) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning-soft px-2 py-0.5 rounded-full border border-warning/20',
          className
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-warning" />
        <span>Data may be outdated — {relativeText}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium select-none',
        isFresh ? 'text-success' : 'text-text-muted',
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full inline-block flex-shrink-0',
          isFresh ? 'bg-success animate-pulse' : 'bg-neutral-state'
        )}
      />
      <span>Updated {relativeText}</span>
    </span>
  );
}
