import React from 'react';
import {
  CircleCheck,
  User,
  Lock,
  Sparkles,
  CircleSlash,
  Clock,
  CircleX,
  TimerOff,
  Ban,
  Search,
  CircleCheckBig,
  CircleAlert,
  Siren,
  TriangleAlert,
  Info,
} from 'lucide-react';
import { cn } from '../utils/cn';

const statusConfig = {
  // Bed statuses
  AVAILABLE: { label: 'Available', color: 'text-success bg-success-soft', icon: CircleCheck },
  OCCUPIED: { label: 'Occupied', color: 'text-neutral-state bg-neutral-soft', icon: User },
  RESERVED: { label: 'Reserved', color: 'text-primary bg-primary-soft', icon: Lock },
  CLEANING: { label: 'Cleaning', color: 'text-neutral-state bg-neutral-soft', icon: Sparkles },
  UNAVAILABLE: { label: 'Unavailable', color: 'text-danger bg-danger-soft', icon: CircleSlash },

  // Offer statuses
  PENDING: { label: 'Waiting for response', color: 'text-primary bg-primary-soft', icon: Clock },
  ACCEPTED: { label: 'Accepted', color: 'text-success bg-success-soft', icon: CircleCheck },
  REJECTED: { label: 'Rejected', color: 'text-danger bg-danger-soft', icon: CircleX },
  TIMEOUT: { label: 'No response', color: 'text-neutral-state bg-neutral-soft', icon: TimerOff },

  // Emergency statuses
  SEARCHING: { label: 'Finding hospital', color: 'text-primary bg-primary-soft', icon: Search },
  AWAITING_HOSPITAL: { label: 'Awaiting hospital', color: 'text-primary bg-primary-soft', icon: Clock },
  COMPLETED: { label: 'Patient arrived', color: 'text-success bg-success-soft', icon: CircleCheckBig },
  NO_MATCH: { label: 'No hospital available', color: 'text-danger bg-danger-soft', icon: CircleAlert },
  CANCELLED: { label: 'Cancelled', color: 'text-neutral-state bg-neutral-soft', icon: Ban },

  // Urgency
  CRITICAL: { label: 'Critical', color: 'text-danger bg-danger-soft', icon: Siren },
  HIGH: { label: 'High', color: 'text-warning bg-warning-soft', icon: TriangleAlert },
  MODERATE: { label: 'Moderate', color: 'text-neutral-state bg-neutral-soft', icon: Info },
};

export function StatusIndicator({ status, className, showIcon = true, size = 'sm' }) {
  const config = statusConfig[status] || {
    label: status,
    color: 'text-text-muted bg-neutral-soft',
    icon: Info,
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full px-2.5 py-0.5 border border-current/10',
        size === 'sm' ? 'text-xs' : 'text-sm px-3 py-1',
        config.color,
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      <span>{config.label}</span>
    </span>
  );
}
