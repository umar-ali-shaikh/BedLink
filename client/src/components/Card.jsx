import React from 'react';
import { cn } from '../utils/cn';

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg shadow-card p-5 transition-shadow duration-150',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 pb-4 border-b border-border mb-4', className)}>
      <div>
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
