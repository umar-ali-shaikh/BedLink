import React from 'react';
import { cn } from '../utils/cn';

const variants = {
  primary: 'bg-primary-soft text-primary border border-primary/20',
  success: 'bg-success-soft text-success border border-success/20',
  warning: 'bg-warning-soft text-warning border border-warning/20',
  danger: 'bg-danger-soft text-danger border border-danger/20',
  neutral: 'bg-neutral-soft text-neutral-state border border-neutral-state/20',
};

const sizes = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon: Icon,
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full tracking-wide select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
