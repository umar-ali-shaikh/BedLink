import React from 'react';
import { cn } from '../utils/cn';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-border/60', className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-4 shadow-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}
