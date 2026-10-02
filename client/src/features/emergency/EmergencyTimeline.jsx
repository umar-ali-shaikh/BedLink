import React, { useEffect, useRef } from 'react';
import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  CircleX,
  Cpu,
  FilePlus2,
  Lock,
  Send,
  TimerOff,
  TriangleAlert,
  Unlock,
} from 'lucide-react';
import { actorLabel, describeTimeline } from './timelineText';
import { formatClock } from '../../utils/formatRelative';
import { cn } from '../../utils/cn';

const ICONS = {
  REQUEST_CREATED: FilePlus2,
  MATCHING_COMPLETED: Cpu,
  HOSPITAL_CONTACTED: Send,
  HOSPITAL_ACCEPTED: CircleCheck,
  HOSPITAL_REJECTED: CircleX,
  HOSPITAL_TIMEOUT: TimerOff,
  ACCEPT_FAILED_NO_BED: TriangleAlert,
  BED_RESERVED: Lock,
  NO_HOSPITALS_REMAINING: CircleAlert,
  REQUEST_CANCELLED: Ban,
  RESERVATION_EXPIRED: TimerOff,
  RESERVATION_RELEASED: Unlock,
  PATIENT_ARRIVED: CircleCheckBig,
};

const TONE = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-neutral-soft text-neutral-state',
};

/** Vertical audit log, newest at the bottom, auto-scrolls (DESIGN.md §5). */
export function EmergencyTimeline({ entries = [], hospitalNames = {}, className }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [entries.length]);

  return (
    <ol className={cn('relative', className)} aria-label="Emergency timeline">
      {entries.map((entry, i) => {
        const hospitalName = hospitalNames[entry.hospitalId];
        const { text, tone } = describeTimeline(entry, hospitalName);
        const Icon = ICONS[entry.event] ?? Cpu;
        return (
          <li key={entry.id ?? i} className="relative flex gap-3 pb-4 last:pb-0 animate-fade-in">
            {i < entries.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />}
            <span className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', TONE[tone])}>
              <Icon className="w-4 h-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-small text-text">{text}</p>
              <p className="text-[12px] text-text-subtle mt-0.5">
                <time className="tabular-nums" dateTime={entry.timestamp}>
                  {formatClock(entry.timestamp, true)}
                </time>{' '}
                · {actorLabel(entry, hospitalName)}
              </p>
            </div>
          </li>
        );
      })}
      <li ref={endRef} aria-hidden className="list-none" />
    </ol>
  );
}
