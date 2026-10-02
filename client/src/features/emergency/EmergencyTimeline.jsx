import React, { useEffect, useRef } from 'react';
import {
  Clock,
  Send,
  CheckCircle,
  XCircle,
  TimerOff,
  Lock,
  Ban,
  Activity,
  UserCheck,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const eventIcons = {
  CREATED: Activity,
  HOSPITAL_CONTACTED: Send,
  ACCEPTED: CheckCircle,
  REJECTED: XCircle,
  TIMEOUT: TimerOff,
  FALLBACK_TRIGGERED: Send,
  RESERVED: Lock,
  ARRIVED: UserCheck,
  CANCELLED: Ban,
};

const eventColors = {
  CREATED: 'text-primary bg-primary-soft',
  HOSPITAL_CONTACTED: 'text-primary bg-primary-soft',
  ACCEPTED: 'text-success bg-success-soft',
  REJECTED: 'text-danger bg-danger-soft',
  TIMEOUT: 'text-warning bg-warning-soft',
  FALLBACK_TRIGGERED: 'text-warning bg-warning-soft',
  RESERVED: 'text-success bg-success-soft',
  ARRIVED: 'text-success bg-success-soft',
  CANCELLED: 'text-neutral-state bg-neutral-soft',
};

export function EmergencyTimeline({ events = [], className }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className={cn('bg-surface border border-border rounded-xl p-5 shadow-card flex flex-col', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span>Real-time Coordination Timeline</span>
        </h3>
        <span className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">
          Auto-audited
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto max-h-[460px] pr-2 space-y-4 scroll-smooth"
      >
        {events && events.length > 0 ? (
          events.map((ev, idx) => {
            const Icon = eventIcons[ev.eventType] || Activity;
            const colorClass = eventColors[ev.eventType] || 'text-primary bg-primary-soft';
            const timeStr = ev.timestamp || ev.createdAt
              ? new Date(ev.timestamp || ev.createdAt).toLocaleTimeString([], { hour12: false })
              : '--:--:--';

            return (
              <div
                key={ev._id || idx}
                className="flex items-start gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 relative pl-1"
              >
                {/* Icon marker */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-current/20 shadow-xs',
                    colorClass
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 bg-surface-muted/60 border border-border/60 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-text">{ev.title || ev.eventType}</span>
                    <span className="font-mono text-[11px] text-text-subtle tabular-nums">
                      {timeStr}
                    </span>
                  </div>
                  <p className="text-text-muted leading-relaxed">{ev.description || ev.message}</p>
                  {ev.actor && (
                    <div className="mt-1.5 text-[10px] font-medium text-text-subtle flex items-center gap-1">
                      <span>Actor:</span>
                      <span className="text-primary font-semibold">{ev.actor}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-text-subtle">
            Timeline will populate as coordination events occur.
          </div>
        )}
      </div>
    </div>
  );
}
