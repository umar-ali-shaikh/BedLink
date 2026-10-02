import React from 'react';
import { cn } from '../utils/cn';

export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5', className)}>
      <div className="flex items-baseline gap-2 flex-wrap min-w-0">
        <h1 className="text-h1 text-text">{title}</h1>
        {subtitle && <span className="text-small text-text-subtle">{subtitle}</span>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
