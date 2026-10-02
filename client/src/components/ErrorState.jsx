import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

export function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load information from the server.',
  onRetry,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-danger-soft/30 border border-danger/20 rounded-lg',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-danger-soft flex items-center justify-center text-danger mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-danger">{title}</h4>
      <p className="text-small text-text-muted mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={RefreshCw}
          className="mt-4"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
