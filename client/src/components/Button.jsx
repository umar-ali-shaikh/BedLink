import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

const variants = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-hover focus-visible:ring-focus shadow-sm',
  secondary: 'bg-surface text-text border border-border hover:bg-surface-muted hover:border-border-strong focus-visible:ring-focus shadow-sm',
  success: 'bg-success text-text-inverse hover:brightness-105 active:brightness-95 focus-visible:ring-success shadow-sm',
  danger: 'border border-danger text-danger hover:bg-danger-soft focus-visible:ring-danger',
  dangerSolid: 'bg-danger text-text-inverse hover:brightness-105 focus-visible:ring-danger shadow-sm',
  ghost: 'text-text-muted hover:text-text hover:bg-neutral-soft focus-visible:ring-focus',
};

const sizes = {
  sm: 'h-8 px-3 text-small gap-1.5 rounded-sm font-medium',
  md: 'h-10 px-4 text-sm gap-2 rounded-md font-medium',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg font-medium',
  xl: 'h-14 px-8 text-lg gap-3 rounded-lg font-semibold min-w-[160px]',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center transition-colors duration-150 select-none whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={cn('animate-spin text-current', size === 'xl' ? 'w-6 h-6' : 'w-4 h-4')} aria-hidden />
      ) : Icon ? (
        <Icon className={cn('flex-shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : size === 'xl' ? 'w-6 h-6' : 'w-4 h-4')} />
      ) : null}
      {children != null && <span>{children}</span>}
    </button>
  );
}
