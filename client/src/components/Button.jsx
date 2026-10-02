import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

const variants = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-hover focus:ring-2 focus:ring-focus shadow-sm',
  secondary: 'bg-surface text-text border border-border hover:bg-surface-muted hover:border-border-strong focus:ring-2 focus:ring-focus shadow-sm',
  success: 'bg-success text-text-inverse hover:brightness-105 active:brightness-95 focus:ring-2 focus:ring-success shadow-sm',
  danger: 'border border-danger text-danger hover:bg-danger-soft focus:ring-2 focus:ring-danger',
  dangerSolid: 'bg-danger text-text-inverse hover:brightness-105 focus:ring-2 focus:ring-danger shadow-sm',
  ghost: 'text-text-muted hover:text-text hover:bg-neutral-soft focus:ring-2 focus:ring-focus',
};

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-sm',
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
        'inline-flex items-center justify-center transition-all duration-150 outline-none select-none active:scale-[0.98]',
        'focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className={cn('flex-shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : size === 'xl' ? 'w-6 h-6' : 'w-4 h-4')} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
