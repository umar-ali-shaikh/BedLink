import React from 'react';
import { cn } from '../utils/cn';

export function Card({ children, className, padded = true, ...props }) {
  return (
    <div className={cn('bg-surface border border-border rounded-lg shadow-card', padded && 'p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-text">{title}</h3>
        {subtitle && <p className="text-small text-text-subtle mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
