import React, { useEffect, useRef, useState } from 'react';
import { useNow } from '../hooks/useNow';
import { formatDuration } from '../utils/formatRelative';
import { cn } from '../utils/cn';

const SIZES = {
  display: 'text-display',
  lg: 'text-number-lg',
  md: 'text-number-md',
  sm: 'text-small font-semibold',
};

/**
 * Visual countdown to `expiresAt` (server clock via `offsetMs`). Never decides anything:
 * at 0 it shows "Waiting for server…" until the server's timeout event arrives.
 * Colour: > 60 s primary · 30–60 s warning · < 30 s danger + pulse (DESIGN.md §5).
 */
export function CountdownTimer({ expiresAt, totalSeconds, offsetMs = 0, size = 'display', showBar = false, className, tone }) {
  const now = useNow(250) + offsetMs;
  const remaining = expiresAt ? (new Date(expiresAt).getTime() - now) / 1000 : 0;
  const [announce, setAnnounce] = useState('');
  const announced = useRef(new Set());

  useEffect(() => {
    for (const mark of [60, 30, 10]) {
      if (remaining <= mark && remaining > mark - 1 && !announced.current.has(mark)) {
        announced.current.add(mark);
        setAnnounce(`${mark} seconds left`);
      }
    }
  }, [remaining]);

  if (!expiresAt) return null;
  const expired = remaining <= 0;
  const color = tone ?? (remaining > 60 ? 'text-primary' : remaining > 30 ? 'text-warning' : 'text-danger');
  const barColor = remaining > 60 ? 'bg-primary' : remaining > 30 ? 'bg-warning' : 'bg-danger';
  const pct = totalSeconds ? Math.max(0, Math.min(100, (remaining / totalSeconds) * 100)) : null;

  return (
    <div className={cn('inline-flex flex-col', className)}>
      {expired ? (
        <span className="inline-flex items-center gap-2 text-small font-medium text-text-muted" role="status">
          <span className="w-2 h-2 rounded-full bg-neutral-state animate-pulse-gentle" />
          Waiting for server…
        </span>
      ) : (
        <span
          className={cn('tabular-nums font-bold tracking-tight', SIZES[size], color, remaining <= 30 && 'animate-pulse-gentle')}
          aria-label={`${Math.ceil(remaining)} seconds remaining`}
        >
          {formatDuration(remaining)}
        </span>
      )}
      {showBar && pct != null && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-soft overflow-hidden" aria-hidden>
          <div className={cn('h-full rounded-full transition-[width] duration-300 ease-linear', barColor)} style={{ width: `${expired ? 0 : pct}%` }} />
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
