import React from 'react';
import { Clock } from 'lucide-react';
import { useNow } from '../hooks/useNow';
import { cn } from '../utils/cn';

export function CountdownTimer({ expiresAt, size = 'display', className, showIcon = false }) {
  const now = useNow(500);

  if (!expiresAt) return null;

  const target = new Date(expiresAt).getTime();
  const diffSec = Math.floor((target - now) / 1000);

  if (diffSec <= 0) {
    return (
      <div className={cn('flex items-center gap-2 text-neutral-state font-medium', className)}>
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-state animate-ping" />
        <span className="text-sm">Waiting for server…</span>
      </div>
    );
  }

  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Styling thresholds:
  // > 60s: primary
  // 30 - 60s: warning
  // < 30s: danger + pulse
  let colorClass = 'text-primary';
  let pulseClass = '';

  if (diffSec <= 30) {
    colorClass = 'text-danger';
    pulseClass = 'animate-pulse-gentle';
  } else if (diffSec <= 60) {
    colorClass = 'text-warning';
  }

  const sizeClasses = {
    display: 'text-4xl md:text-5xl font-bold tracking-tight',
    lg: 'text-2xl md:text-3xl font-bold',
    md: 'text-lg font-semibold',
    sm: 'text-sm font-semibold',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 tabular-nums select-none',
        colorClass,
        pulseClass,
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {showIcon && <Clock className="w-5 h-5 flex-shrink-0 text-current" />}
      <span className={cn(sizeClasses[size])}>{formatted}</span>
    </div>
  );
}
