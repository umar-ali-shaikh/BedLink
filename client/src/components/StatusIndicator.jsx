import React from 'react';
import {
  Ban,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  CircleSlash,
  CircleX,
  Clock,
  Info,
  Lock,
  Search,
  Siren,
  Sparkles,
  TimerOff,
  TriangleAlert,
  User,
} from 'lucide-react';
import { cn } from '../utils/cn';

/** DESIGN.md §7 status mapping, per domain (the same value can mean different things). */
const MAP = {
  bed: {
    AVAILABLE: ['Available', 'success', CircleCheck],
    OCCUPIED: ['Occupied', 'neutral', User],
    RESERVED: ['Reserved', 'primary', Lock],
    CLEANING: ['Cleaning', 'warning', Sparkles],
    UNAVAILABLE: ['Unavailable', 'danger', CircleSlash],
  },
  offer: {
    PENDING: ['Waiting for response', 'primary', Clock],
    ACCEPTED: ['Accepted', 'success', CircleCheck],
    REJECTED: ['Rejected', 'danger', CircleX],
    TIMEOUT: ['No response', 'neutral', TimerOff],
    CANCELLED: ['Withdrawn', 'neutral', Ban],
  },
  emergency: {
    SEARCHING: ['Finding hospital', 'primary', Search],
    AWAITING_HOSPITAL: ['Awaiting hospital', 'primary', Clock],
    RESERVED: ['Bed reserved', 'success', Lock],
    COMPLETED: ['Patient arrived', 'success', CircleCheckBig],
    NO_MATCH: ['No hospital available', 'danger', CircleAlert],
    CANCELLED: ['Cancelled', 'neutral', Ban],
  },
  urgency: {
    CRITICAL: ['Critical', 'danger', Siren],
    HIGH: ['High', 'warning', TriangleAlert],
    MODERATE: ['Moderate', 'neutral', Info],
  },
  reservation: {
    ACTIVE: ['Held', 'primary', Lock],
    FULFILLED: ['Arrived', 'success', CircleCheckBig],
    EXPIRED: ['Expired', 'neutral', TimerOff],
    RELEASED: ['Released', 'neutral', Ban],
  },
  hospital: {
    ONLINE: ['Online', 'success', Circle],
    STALE: ['Stale sync', 'warning', TriangleAlert],
    DIVERTED: ['Diverted', 'danger', CircleSlash],
    OFFLINE: ['Inactive', 'neutral', Ban],
  },
};

export const TONE = {
  primary: 'text-primary bg-primary-soft border-primary/20',
  success: 'text-success bg-success-soft border-success/20',
  warning: 'text-warning bg-warning-soft border-warning/25',
  danger: 'text-danger bg-danger-soft border-danger/20',
  neutral: 'text-neutral-state bg-neutral-soft border-neutral-state/20',
};

export function statusMeta(kind, status) {
  const [label, tone, icon] = MAP[kind]?.[status] ?? [status ?? '—', 'neutral', Info];
  return { label, tone, icon };
}

/**
 * Status pill: icon + text + colour, never colour alone (DESIGN.md §2.5).
 * `look="caps"` renders the compact uppercase pill used in tables and bed cards.
 */
export function StatusIndicator({ kind = 'emergency', status, look = 'normal', className, label: labelOverride }) {
  const { label, tone, icon: Icon } = statusMeta(kind, status);
  const caps = look === 'caps';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap',
        caps ? 'text-[11px] leading-4 px-2 py-0.5 uppercase tracking-wide' : 'text-caption px-2.5 py-1',
        TONE[tone],
        className
      )}
    >
      {caps ? <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden /> : <Icon className="w-3.5 h-3.5" aria-hidden />}
      {labelOverride ?? label}
    </span>
  );
}
